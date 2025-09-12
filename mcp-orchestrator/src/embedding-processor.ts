#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';
import { EmbeddingService } from './embedding-service.js';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required for embedding generation');
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

  // Initialize embedding service
  const embeddingService = new EmbeddingService(db);

  // Check embedding service health
  const health = await embeddingService.healthCheck();
  console.log('🏥 Embedding Service Health Check:');
  console.log(`   OpenAI Configured: ${health.openai_configured}`);
  console.log(`   pgvector Available: ${health.pgvector_available}`);
  console.log(`   Pending Embeddings: ${health.pending_embeddings}`);

  if (!health.pgvector_available) {
    console.error('❌ pgvector extension not available. Please run the migration first.');
    process.exit(1);
  }

  // Get configuration
  const batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || '50');
  const intervalMs = parseInt(process.env.EMBEDDING_INTERVAL_MS || '30000'); // 30 seconds
  const projectId = process.env.PROJECT_ID; // Optional: process specific project

  let isRunning = true;
  let processCount = 0;

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log('\n🛑 Shutting down embedding processor...');
    isRunning = false;
    await db.close();
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log(`🔄 Starting Frizy Embedding Processor`);
  console.log(`   Batch Size: ${batchSize}`);
  console.log(`   Interval: ${intervalMs}ms`);
  console.log(`   Project Filter: ${projectId || 'All projects'}`);

  // Main processing loop
  while (isRunning) {
    try {
      console.log(`\n🔍 Processing batch ${++processCount}...`);
      
      const result = await embeddingService.processAllPendingEmbeddings(projectId);
      
      if (result.processed === 0 && result.errors === 0) {
        console.log('✅ No pending embeddings found');
      } else {
        console.log(`📊 Batch ${processCount} complete:`);
        console.log(`   Processed: ${result.processed}`);
        console.log(`   Errors: ${result.errors}`);
        console.log(`   Skipped: ${result.skipped}`);
      }

      // Wait before next batch
      if (isRunning) {
        console.log(`⏳ Waiting ${intervalMs / 1000}s before next batch...`);
        await sleep(intervalMs);
      }

    } catch (error) {
      console.error('❌ Error in processing loop:', error);
      
      // Back off on error
      await sleep(intervalMs * 2);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// Start the embedding processor
main().catch((error) => {
  console.error('❌ Failed to start embedding processor:', error);
  process.exit(1);
});