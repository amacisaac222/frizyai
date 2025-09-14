// Mock MCP Server for Testing Frizy Dashboard
// This simulates what a real MCP server might do

const http = require('http');
const url = require('url');

const PORT = process.env.MCP_PORT || 3333;

// Mock session data
let sessions = [];
let currentSessionId = null;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Routes
  if (pathname === '/health' && req.method === 'GET') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      serverName: 'Mock MCP Server',
      version: '0.1.0',
      timestamp: new Date().toISOString()
    }));
  }
  else if (pathname === '/api/mcp/connect' && req.method === 'POST') {
    // Connection endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: true,
      sessionId: generateSessionId(),
      message: 'Connected to Mock MCP Server'
    }));
  }
  else if (pathname === '/api/sessions' && req.method === 'GET') {
    // Get all sessions
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessions));
  }
  else if (pathname === '/api/sessions/current' && req.method === 'GET') {
    // Get current session
    const currentSession = sessions.find(s => s.id === currentSessionId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(currentSession || null));
  }
  else if (pathname === '/api/sessions' && req.method === 'POST') {
    // Create new session
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const sessionData = JSON.parse(body);
      const newSession = createSession(sessionData);
      sessions.push(newSession);
      currentSessionId = newSession.id;

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newSession));
    });
  }
  else if (pathname === '/api/events' && req.method === 'POST') {
    // Log an event
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const event = JSON.parse(body);
      logEvent(event);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, event }));
    });
  }
  else if (pathname === '/api/git/status' && req.method === 'GET') {
    // Mock git status
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: true,
      repository: 'frizyai',
      branch: 'main',
      username: 'mock-user',
      modifiedFiles: 5,
      ahead: 0,
      behind: 0
    }));
  }
  else {
    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Helper functions
function generateSessionId() {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function createSession(data) {
  return {
    id: generateSessionId(),
    title: data.title || 'New Session',
    summary: data.summary || 'A new Claude session',
    startTime: new Date().toISOString(),
    status: 'active',
    metadata: {
      totalEvents: 0,
      totalBlocks: 0,
      contextUsage: Math.floor(Math.random() * 60),
      duration: 0
    },
    blocks: []
  };
}

function logEvent(event) {
  console.log(`[EVENT] ${event.type}: ${event.message || 'No message'}`);

  // Update current session if exists
  if (currentSessionId) {
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      session.metadata.totalEvents++;

      // Simulate context usage increase
      session.metadata.contextUsage = Math.min(100, session.metadata.contextUsage + Math.random() * 2);
    }
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║        Mock MCP Server for Frizy AI           ║
╠════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}     ║
║  Health check:      http://localhost:${PORT}/health ║
║                                                ║
║  This is a mock server for testing.           ║
║  Real MCP integration coming soon!            ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});