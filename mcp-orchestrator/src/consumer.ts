#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';
import { EventConsumer } from './event-consumer.js';

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

  // Get consumer configuration from environment
  const consumerId = process.env.CONSUMER_ID || 'default';
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || '1000');

  // Initialize and start event consumer
  const consumer = new EventConsumer(db, consumerId, pollInterval);

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log('\n🛑 Shutting down event consumer...');
    await consumer.stop();
    await db.close();
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Start the consumer
  console.log(`🔄 Starting Frizy Event Consumer (${consumerId})`);
  await consumer.start();
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

// Start the consumer
main().catch((error) => {
  console.error('❌ Failed to start event consumer:', error);
  process.exit(1);
});