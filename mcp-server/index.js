// Frizy MCP Server - Production Implementation
import dotenv from 'dotenv';
dotenv.config();

import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import { createServer } from 'http';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import FileSystemWatcher from './file-watcher.js';
import GitIntegration from './git-integration.js';
import SupabaseSync from './supabase-sync.js';
import AnalyticsDashboard from './analytics-dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  PORT: process.env.MCP_PORT || 3333,
  DB_PATH: process.env.MCP_DB || path.join(__dirname, 'frizy-mcp.db'),
  MAX_CONTEXT_TOKENS: 200000,
  CONTEXT_WARNING_THRESHOLD: 0.8,
  EVENT_BATCH_SIZE: 100,
  EVENT_BATCH_TIMEOUT: 100, // ms
};

// Database Setup
class MCPDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  initialize() {
    // Core tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT,
        summary TEXT,
        started_at INTEGER DEFAULT (unixepoch()),
        ended_at INTEGER,
        status TEXT DEFAULT 'active',
        context_usage INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT,
        type TEXT,
        summary TEXT,
        started_at INTEGER DEFAULT (unixepoch()),
        ended_at INTEGER,
        status TEXT DEFAULT 'in_progress',
        metrics TEXT DEFAULT '{}',
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        block_id TEXT,
        name TEXT,
        type TEXT,
        summary TEXT,
        duration INTEGER,
        started_at INTEGER DEFAULT (unixepoch()),
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (block_id) REFERENCES blocks(id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        trace_id TEXT,
        session_id TEXT,
        timestamp INTEGER DEFAULT (unixepoch()),
        type TEXT,
        tool TEXT,
        data TEXT,
        impact TEXT,
        tokens_used INTEGER DEFAULT 0,
        FOREIGN KEY (trace_id) REFERENCES traces(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_blocks_session ON blocks(session_id);
      CREATE INDEX IF NOT EXISTS idx_traces_block ON traces(block_id);

      -- Analytics view
      CREATE VIEW IF NOT EXISTS session_analytics AS
      SELECT
        s.id,
        s.title,
        s.status,
        s.context_usage,
        COUNT(DISTINCT b.id) as block_count,
        COUNT(DISTINCT e.id) as event_count,
        (s.ended_at - s.started_at) / 60 as duration_minutes
      FROM sessions s
      LEFT JOIN blocks b ON b.session_id = s.id
      LEFT JOIN events e ON e.session_id = s.id
      GROUP BY s.id;
    `);

    // Prepared statements for performance
    this.statements = {
      createSession: this.db.prepare(`
        INSERT INTO sessions (id, project_id, title, summary, metadata)
        VALUES (?, ?, ?, ?, ?)
      `),

      updateSession: this.db.prepare(`
        UPDATE sessions
        SET context_usage = ?, status = ?, ended_at = ?
        WHERE id = ?
      `),

      createEvent: this.db.prepare(`
        INSERT INTO events (id, trace_id, session_id, type, tool, data, impact, tokens_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),

      getSession: this.db.prepare(`
        SELECT * FROM sessions WHERE id = ?
      `),

      getActiveSession: this.db.prepare(`
        SELECT * FROM sessions
        WHERE status = 'active'
        ORDER BY started_at DESC
        LIMIT 1
      `),

      getSessionAnalytics: this.db.prepare(`
        SELECT * FROM session_analytics WHERE id = ?
      `)
    };
  }

  // Session Management
  createSession(data) {
    const id = `session_${nanoid()}`;
    this.statements.createSession.run(
      id,
      data.projectId || null,
      data.title || 'New Session',
      data.summary || '',
      JSON.stringify(data.metadata || {})
    );
    return this.getSession(id);
  }

  getSession(id) {
    const session = this.statements.getSession.get(id);
    if (session) {
      session.metadata = JSON.parse(session.metadata);
    }
    return session;
  }

  getActiveSession() {
    const session = this.statements.getActiveSession.get();
    if (session) {
      session.metadata = JSON.parse(session.metadata);
    }
    return session;
  }

  updateSessionContext(sessionId, contextUsage) {
    const status = contextUsage >= CONFIG.MAX_CONTEXT_TOKENS ? 'context_exceeded' : 'active';
    this.statements.updateSession.run(contextUsage, status, null, sessionId);
  }

  // Event Management
  createEvent(data) {
    const id = `event_${nanoid()}`;
    this.statements.createEvent.run(
      id,
      data.traceId || null,
      data.sessionId,
      data.type,
      data.tool || null,
      JSON.stringify(data.data || {}),
      data.impact || 'low',
      data.tokensUsed || 0
    );
    return id;
  }

  // Analytics
  getSessionAnalytics(sessionId) {
    return this.statements.getSessionAnalytics.get(sessionId);
  }

  close() {
    this.db.close();
  }
}

// WebSocket Server
class MCPWebSocketServer extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.clients = new Map();
    this.eventBatch = [];
    this.batchTimer = null;
    this.port = null;

    // Create HTTP server for health checks
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          clients: this.clients.size,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      const clientId = nanoid();
      const client = {
        id: clientId,
        ws,
        sessionId: null,
        subscriptions: new Set(['all'])
      };

      this.clients.set(clientId, client);
      console.log(`Client connected: ${clientId}`);

      // Send initial data
      this.sendToClient(client, {
        type: 'connected',
        clientId,
        activeSession: this.db.getActiveSession()
      });

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(client, message);
        } catch (error) {
          console.error('Invalid message:', error);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`Client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });
    });
  }

  handleMessage(client, message) {
    switch (message.type) {
      case 'create_session':
        this.handleCreateSession(client, message.data);
        break;

      case 'log_event':
        this.handleLogEvent(client, message.data);
        break;

      case 'update_context':
        this.handleUpdateContext(client, message.data);
        break;

      case 'subscribe':
        this.handleSubscribe(client, message.channel);
        break;

      case 'get_analytics':
        this.handleGetAnalytics(client, message.sessionId);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  handleCreateSession(client, data) {
    const session = this.db.createSession(data);
    client.sessionId = session.id;

    this.broadcast({
      type: 'session_created',
      session
    });

    // Emit event for analytics
    this.emit('session:created', session);
  }

  handleLogEvent(client, data) {
    // Add to batch
    this.eventBatch.push({
      ...data,
      sessionId: client.sessionId || data.sessionId,
      timestamp: Date.now()
    });

    // Process batch if size exceeded or start timer
    if (this.eventBatch.length >= CONFIG.EVENT_BATCH_SIZE) {
      this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), CONFIG.EVENT_BATCH_TIMEOUT);
    }
  }

  processBatch() {
    if (this.eventBatch.length === 0) return;

    const events = [...this.eventBatch];
    this.eventBatch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Store events
    const eventIds = events.map(event => this.db.createEvent(event));

    // Emit events for analytics
    events.forEach((event, i) => {
      this.emit('event:logged', { ...event, id: eventIds[i] });
    });

    // Calculate context usage
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);
    if (events[0]?.sessionId) {
      const session = this.db.getSession(events[0].sessionId);
      if (session) {
        const newUsage = (session.context_usage || 0) + totalTokens;
        this.db.updateSessionContext(session.id, newUsage);

        // Emit context update for analytics
        this.emit('context:updated', {
          sessionId: session.id,
          usage: newUsage,
          percentage: (newUsage / CONFIG.MAX_CONTEXT_TOKENS) * 100
        });

        // Warn if approaching limit
        if (newUsage > CONFIG.MAX_CONTEXT_TOKENS * CONFIG.CONTEXT_WARNING_THRESHOLD) {
          this.broadcast({
            type: 'context_warning',
            sessionId: session.id,
            usage: newUsage,
            limit: CONFIG.MAX_CONTEXT_TOKENS,
            percentage: (newUsage / CONFIG.MAX_CONTEXT_TOKENS) * 100
          });
        }
      }
    }

    // Broadcast events
    this.broadcast({
      type: 'events_logged',
      events: events.map((e, i) => ({ ...e, id: eventIds[i] })),
      count: events.length
    });
  }

  handleUpdateContext(client, data) {
    this.db.updateSessionContext(data.sessionId, data.contextUsage);

    this.broadcast({
      type: 'context_updated',
      sessionId: data.sessionId,
      usage: data.contextUsage
    });
  }

  handleSubscribe(client, channel) {
    client.subscriptions.add(channel);
    this.sendToClient(client, {
      type: 'subscribed',
      channel
    });
  }

  handleGetAnalytics(client, sessionId) {
    const analytics = this.db.getSessionAnalytics(sessionId);
    this.sendToClient(client, {
      type: 'analytics',
      sessionId,
      data: analytics
    });
  }

  sendToClient(client, message) {
    if (client.ws.readyState === 1) { // OPEN
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, channel = 'all') {
    const data = JSON.stringify(message);

    this.clients.forEach(client => {
      if (client.subscriptions.has(channel) || client.subscriptions.has('all')) {
        if (client.ws.readyState === 1) {
          client.ws.send(data);
        }
      }
    });
  }

  start(port) {
    this.port = port;
    this.httpServer.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║          Frizy MCP Server v1.0                ║
╠════════════════════════════════════════════════╣
║  WebSocket: ws://localhost:${port}              ║
║  Health:    http://localhost:${port}/health     ║
║  Database:  ${CONFIG.DB_PATH.split('/').pop()}
║                                                ║
║  Ready for connections!                       ║
╚════════════════════════════════════════════════╝
      `);
    });
  }
}

// Context Manager
class ContextManager {
  constructor(db) {
    this.db = db;
  }

  calculateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async optimizeContext(sessionId) {
    const session = this.db.getSession(sessionId);
    if (!session) return null;

    const usage = session.context_usage || 0;
    const percentage = (usage / CONFIG.MAX_CONTEXT_TOKENS) * 100;

    if (percentage > 90) {
      return {
        action: 'critical',
        message: 'Context limit nearly reached. Consider starting a new session.',
        suggestions: [
          'Start new session with summary',
          'Archive current session',
          'Export important context'
        ]
      };
    } else if (percentage > 80) {
      return {
        action: 'warning',
        message: 'Approaching context limit.',
        suggestions: [
          'Summarize completed blocks',
          'Remove redundant context'
        ]
      };
    }

    return {
      action: 'ok',
      usage,
      remaining: CONFIG.MAX_CONTEXT_TOKENS - usage,
      percentage
    };
  }
}

// Initialize and start server
const db = new MCPDatabase(CONFIG.DB_PATH);
const server = new MCPWebSocketServer(db);
const contextManager = new ContextManager(db);

// Initialize optional modules
let fileWatcher = null;
let gitIntegration = null;
let supabaseSync = null;
let analyticsDashboard = null;

// Start server
server.start(CONFIG.PORT);

// Initialize File System Watcher
try {
  fileWatcher = new FileSystemWatcher(server, {
    projectRoot: path.resolve(__dirname, '..') // Monitor the parent frizyai directory
  });
  fileWatcher.start();
  server.fileWatcher = fileWatcher;
} catch (error) {
  console.warn('File watcher initialization failed:', error.message);
}

// Initialize Git Integration
try {
  gitIntegration = new GitIntegration(server, {
    projectRoot: path.resolve(__dirname, '..') // Monitor the parent frizyai directory
  });
  gitIntegration.start().then(started => {
    if (started) {
      server.gitIntegration = gitIntegration;
    }
  });
} catch (error) {
  console.warn('Git integration initialization failed:', error.message);
}

// Initialize Supabase Sync
if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  try {
    supabaseSync = new SupabaseSync(server);
    supabaseSync.initialize().then(connected => {
      if (connected) {
        server.supabaseSync = supabaseSync;
      }
    });
  } catch (error) {
    console.warn('Supabase sync initialization failed:', error.message);
  }
}

// Initialize Analytics Dashboard
try {
  analyticsDashboard = new AnalyticsDashboard(server);
  analyticsDashboard.start();
  server.analyticsDashboard = analyticsDashboard;

  // Add analytics API endpoint
  const originalCreateServer = server.httpServer.on.bind(server.httpServer);
  server.httpServer.on = function(event, handler) {
    if (event === 'request') {
      return originalCreateServer(event, (req, res) => {
        if (req.url === '/analytics') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(analyticsDashboard.getDashboardData()));
        } else {
          handler(req, res);
        }
      });
    }
    return originalCreateServer(event, handler);
  };
} catch (error) {
  console.warn('Analytics dashboard initialization failed:', error.message);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down MCP server...');

  // Stop all modules
  if (fileWatcher) fileWatcher.stop();
  if (gitIntegration) gitIntegration.stop();
  if (supabaseSync) supabaseSync.stop();
  if (analyticsDashboard) analyticsDashboard.stop();

  server.wss.close();
  db.close();
  process.exit(0);
});

// Export for testing
export { MCPDatabase, MCPWebSocketServer, ContextManager, AnalyticsDashboard };