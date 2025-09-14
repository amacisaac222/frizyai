// Analytics Dashboard Integration for MCP Server
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

export class AnalyticsDashboard extends EventEmitter {
  constructor(mcpServer, options = {}) {
    super();
    this.mcpServer = mcpServer;
    this.options = {
      updateInterval: options.updateInterval || 5000, // 5 seconds
      metricsWindow: options.metricsWindow || 3600000, // 1 hour
      enableRealtime: options.enableRealtime !== false
    };

    this.metrics = {
      sessions: new Map(),
      events: [],
      performance: [],
      errors: [],
      contextUsage: []
    };

    this.updateTimer = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('Starting Analytics Dashboard integration...');

    // Initial metrics collection
    this.collectMetrics();

    // Start periodic updates
    this.updateTimer = setInterval(() => {
      this.collectMetrics();
    }, this.options.updateInterval);

    // Set up event listeners
    this.setupEventListeners();

    console.log('Analytics Dashboard started successfully');
  }

  setupEventListeners() {
    // Listen for database events
    if (this.mcpServer.db) {
      // Session events
      this.mcpServer.on('session:created', (session) => {
        this.handleSessionCreated(session);
      });

      this.mcpServer.on('session:updated', (session) => {
        this.handleSessionUpdated(session);
      });

      // Event tracking
      this.mcpServer.on('event:logged', (event) => {
        this.handleEventLogged(event);
      });

      // Context updates
      this.mcpServer.on('context:updated', (data) => {
        this.handleContextUpdate(data);
      });
    }

    // Listen for file system events
    // Note: File watcher doesn't extend EventEmitter directly
    // We'll handle file changes through the broadcast mechanism

    // Listen for Git events
    // Note: Git integration doesn't extend EventEmitter directly
    // We'll handle git events through the broadcast mechanism
  }

  collectMetrics() {
    try {
      const now = Date.now();
      const windowStart = now - this.options.metricsWindow;

      // Get database metrics
      if (this.mcpServer.db) {
        const metrics = this.getSessionMetrics(windowStart);
        const eventMetrics = this.getEventMetrics(windowStart);
        const performanceMetrics = this.getPerformanceMetrics();

        // Update metrics store
        this.metrics.sessions = new Map(metrics.sessions.map(s => [s.id, s]));
        this.metrics.events = eventMetrics.events;
        this.metrics.performance = performanceMetrics;

        // Calculate aggregates
        const aggregates = this.calculateAggregates();

        // Emit update event
        this.emit('metrics:updated', {
          timestamp: now,
          sessions: metrics,
          events: eventMetrics,
          performance: performanceMetrics,
          aggregates
        });

        // Broadcast to dashboard clients
        this.broadcastMetrics({
          type: 'analytics_update',
          timestamp: now,
          data: {
            sessions: metrics,
            events: eventMetrics,
            performance: performanceMetrics,
            aggregates
          }
        });
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.metrics.errors.push({
        timestamp: Date.now(),
        error: error.message,
        type: 'metrics_collection'
      });
    }
  }

  getSessionMetrics(since) {
    const sessions = this.mcpServer.db.db
      .prepare(`
        SELECT 
          s.*,
          COUNT(DISTINCT b.id) as block_count,
          COUNT(DISTINCT e.id) as event_count,
          SUM(e.tokens_used) as total_tokens,
          MAX(e.timestamp) as last_activity
        FROM sessions s
        LEFT JOIN blocks b ON b.session_id = s.id
        LEFT JOIN events e ON e.session_id = s.id
        WHERE s.started_at > ?
        GROUP BY s.id
        ORDER BY s.started_at DESC
      `)
      .all(Math.floor(since / 1000));

    return {
      sessions,
      active: sessions.filter(s => s.status === 'active').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      totalTokens: sessions.reduce((sum, s) => sum + (s.total_tokens || 0), 0)
    };
  }

  getEventMetrics(since) {
    const events = this.mcpServer.db.db
      .prepare(`
        SELECT 
          type,
          tool,
          COUNT(*) as count,
          SUM(tokens_used) as tokens,
          AVG(tokens_used) as avg_tokens
        FROM events
        WHERE timestamp > ?
        GROUP BY type, tool
        ORDER BY count DESC
      `)
      .all(Math.floor(since / 1000));

    const timeline = this.mcpServer.db.db
      .prepare(`
        SELECT 
          strftime('%Y-%m-%d %H:%M', timestamp, 'unixepoch') as time_bucket,
          COUNT(*) as count,
          SUM(tokens_used) as tokens
        FROM events
        WHERE timestamp > ?
        GROUP BY time_bucket
        ORDER BY time_bucket
      `)
      .all(Math.floor(since / 1000));

    return {
      events,
      timeline,
      total: events.reduce((sum, e) => sum + e.count, 0),
      uniqueTools: [...new Set(events.map(e => e.tool).filter(Boolean))].length
    };
  }

  getPerformanceMetrics() {
    const db = this.mcpServer.db.db;

    // Get database size
    const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();

    // Get table statistics
    const tables = ['sessions', 'blocks', 'traces', 'events'];
    const tableStats = {};

    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      tableStats[table] = count.count;
    });

    // Memory usage
    const memUsage = process.memoryUsage();

    return {
      database: {
        size: dbSize.size,
        tables: tableStats
      },
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      },
      uptime: process.uptime(),
      connections: this.mcpServer.clients ? this.mcpServer.clients.size : 0
    };
  }

  calculateAggregates() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    // Events per hour
    const eventsPerHour = this.mcpServer.db.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM events
        WHERE timestamp > ?
      `)
      .get(Math.floor(hourAgo / 1000));

    // Events per day
    const eventsPerDay = this.mcpServer.db.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM events
        WHERE timestamp > ?
      `)
      .get(Math.floor(dayAgo / 1000));

    // Average session duration
    const avgDuration = this.mcpServer.db.db
      .prepare(`
        SELECT AVG(ended_at - started_at) as avg_duration
        FROM sessions
        WHERE ended_at IS NOT NULL
      `)
      .get();

    // Most used tools
    const topTools = this.mcpServer.db.db
      .prepare(`
        SELECT tool, COUNT(*) as count
        FROM events
        WHERE tool IS NOT NULL
        GROUP BY tool
        ORDER BY count DESC
        LIMIT 5
      `)
      .all();

    return {
      eventsPerHour: eventsPerHour.count,
      eventsPerDay: eventsPerDay.count,
      avgSessionDuration: avgDuration.avg_duration || 0,
      topTools,
      contextWarnings: this.metrics.contextUsage.filter(c => c.percentage > 80).length
    };
  }

  handleSessionCreated(session) {
    this.metrics.sessions.set(session.id, {
      ...session,
      events: [],
      blocks: [],
      startTime: Date.now()
    });

    this.broadcastMetrics({
      type: 'session_created',
      session,
      timestamp: Date.now()
    });
  }

  handleSessionUpdated(session) {
    const existing = this.metrics.sessions.get(session.id);
    if (existing) {
      this.metrics.sessions.set(session.id, {
        ...existing,
        ...session
      });
    }

    this.broadcastMetrics({
      type: 'session_updated',
      session,
      timestamp: Date.now()
    });
  }

  handleEventLogged(event) {
    this.metrics.events.push({
      ...event,
      timestamp: Date.now()
    });

    // Keep only recent events
    const cutoff = Date.now() - this.options.metricsWindow;
    this.metrics.events = this.metrics.events.filter(e => e.timestamp > cutoff);

    // Update session metrics
    if (event.sessionId && this.metrics.sessions.has(event.sessionId)) {
      const session = this.metrics.sessions.get(event.sessionId);
      session.events.push(event);
      session.lastActivity = Date.now();
    }
  }

  handleContextUpdate(data) {
    this.metrics.contextUsage.push({
      sessionId: data.sessionId,
      usage: data.usage,
      percentage: (data.usage / 200000) * 100,
      timestamp: Date.now()
    });

    // Alert if approaching limit
    if (data.percentage > 90) {
      this.broadcastMetrics({
        type: 'context_critical',
        sessionId: data.sessionId,
        usage: data.usage,
        percentage: data.percentage,
        timestamp: Date.now()
      });
    }
  }

  handleFileChanges(changes) {
    const summary = {
      files: changes.length,
      languages: [...new Set(changes.map(c => c.language).filter(Boolean))],
      timestamp: Date.now()
    };

    this.broadcastMetrics({
      type: 'file_activity',
      summary,
      changes: changes.slice(0, 10) // Top 10 changes
    });
  }

  handleGitCommit(commit) {
    this.broadcastMetrics({
      type: 'git_commit',
      commit: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        files: commit.files.length
      },
      timestamp: Date.now()
    });
  }

  handleBranchChange(data) {
    this.broadcastMetrics({
      type: 'git_branch_change',
      oldBranch: data.oldBranch,
      newBranch: data.newBranch,
      timestamp: Date.now()
    });
  }

  broadcastMetrics(message) {
    if (this.mcpServer.broadcast) {
      this.mcpServer.broadcast(message);
    }

    // Also emit as event for local listeners
    this.emit('broadcast', message);
  }

  getDashboardData() {
    return {
      metrics: this.metrics,
      aggregates: this.calculateAggregates(),
      performance: this.getPerformanceMetrics(),
      timestamp: Date.now()
    };
  }

  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.isRunning = false;
    console.log('Analytics Dashboard stopped');
  }
}

export default AnalyticsDashboard;