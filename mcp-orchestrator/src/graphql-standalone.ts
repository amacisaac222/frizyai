#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';
import { ContextService } from './context-service.js';
import { GraphQLServer } from './graphql-server.js';

// Load environment variables
dotenv.config();

async function main() {
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

  // Initialize and start GraphQL server
  const graphqlServer = new GraphQLServer(db, contextService);

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log('\n🛑 Shutting down GraphQL server...');
    await db.close();
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Start the GraphQL server
  const port = parseInt(process.env.GRAPHQL_PORT || '4001');
  console.log(`🚀 Starting Frizy GraphQL Server on port ${port}`);
  await graphqlServer.startStandalone(port);
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

// Start the GraphQL server
main().catch((error) => {
  console.error('❌ Failed to start GraphQL server:', error);
  process.exit(1);
});