#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';
import { ContextService } from './context-service.js';
import { FrizyMCPServer } from './mcp-server.js';
import { APIServer } from './api-server.js';

// Load environment variables
dotenv.config();

async function main() {
  const mode = process.argv[2] || process.env.MODE || 'api';
  
  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Initialize database
  const db = new Database(process.env.DATABASE_URL);
  
  // Test database connection
  const dbHealthy = await db.healthCheck();
  if (!dbHealthy) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }
  
  console.log('✅ Database connection established');

  // Initialize context service
  const contextService = new ContextService(db);

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  if (mode === 'mcp') {
    // Run as MCP server (for Claude Code integration)
    console.log('🔧 Starting Frizy MCP Server...');
    const mcpServer = new FrizyMCPServer(db, contextService);
    await mcpServer.start();
    
  } else if (mode === 'api') {
    // Run as API server (for web UI and webhooks)
    console.log('🌐 Starting Frizy API Server...');
    const apiServer = new APIServer(db, contextService);
    const port = parseInt(process.env.PORT || '4000');
    await apiServer.start(port);
    
  } else if (mode === 'both') {
    // Run both servers (for development)
    console.log('🚀 Starting both MCP and API servers...');
    
    const apiServer = new APIServer(db, contextService);
    const port = parseInt(process.env.PORT || '4000');
    
    // Start API server
    apiServer.start(port);
    
    // Note: MCP server runs on stdio, so we can't run both simultaneously
    // This mode is mainly for development where you'd run them separately
    console.log('⚠️  MCP server requires stdio mode - run separately with "npm run mcp"');
    
  } else {
    console.error('❌ Invalid mode. Use: api, mcp, or both');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});