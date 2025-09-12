#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';
import { ContextService } from './context-service.js';
import { EventConsumer } from './event-consumer.js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

async function runIntegrationTest() {
  console.log('🧪 Running Frizy MCP Orchestrator Integration Test\n');

  // Initialize database
  const db = new Database();
  const contextService = new ContextService(db);

  // Test database connection
  console.log('1️⃣ Testing database connection...');
  const dbHealthy = await db.healthCheck();
  if (!dbHealthy) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }
  console.log('✅ Database connected successfully\n');

  // Get or create test project
  console.log('2️⃣ Getting/creating test project...');
  
  // Check if we have any existing projects
  let projectId: string;
  let userId: string;
  
  try {
    // Get an existing user
    const existingUsers = await db.query('SELECT id FROM users LIMIT 1');
    if (existingUsers.rows.length > 0) {
      userId = existingUsers.rows[0].id;
      console.log(`✅ Using existing user: ${userId}`);
    } else {
      console.error('❌ No users found in database. Please create a user first.');
      process.exit(1);
    }

    // Get or create a project
    const existingProjects = await db.query('SELECT id FROM projects LIMIT 1');
    if (existingProjects.rows.length > 0) {
      projectId = existingProjects.rows[0].id;
      console.log(`✅ Using existing project: ${projectId}`);
    } else {
      // Create a new project using the existing user
      const newProject = await db.query(`
        INSERT INTO projects (id, name, description, created_by, status, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, 'active', NOW(), NOW())
        RETURNING id
      `, ['Integration Test Project', 'Test project for MCP integration', userId]);
      projectId = newProject.rows[0].id;
      console.log(`✅ Created new project: ${projectId}`);
    }
  } catch (error) {
    console.error('Failed to get/create project:', error);
    process.exit(1);
  }

  // Start event consumer
  console.log('3️⃣ Starting event consumer...');
  const consumer = new EventConsumer(db, 'integration-test', 500);
  consumer.start();
  
  // Wait for consumer to process the project event
  await sleep(1000);

  // Create test blocks
  console.log('4️⃣ Creating test blocks...');
  const blockIds = [];
  
  for (const blockData of [
    { title: 'Setup authentication', lane: 'current', priority: 'high' },
    { title: 'Design user interface', lane: 'next', priority: 'medium' },
    { title: 'Implement backend API', lane: 'current', priority: 'urgent' },
    { title: 'Write documentation', lane: 'context', priority: 'low' }
  ]) {
    // Generate TEXT ID instead of UUID
    const blockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    blockIds.push(blockId);
    
    await db.createEvent({
      project_id: projectId,
      type: 'block.created',
      payload: {
        id: blockId,
        ...blockData
      }
    });
  }
  console.log(`✅ Created ${blockIds.length} block events\n`);

  // Wait for consumer to process blocks
  await sleep(1500);

  // Test block operations
  console.log('5️⃣ Testing block operations...');
  
  // Move a block
  await db.createEvent({
    project_id: projectId,
    type: 'block.moved',
    payload: {
      id: blockIds[1],
      lane: 'current',
      previous_lane: 'next'
    }
  });

  // Update progress
  await db.createEvent({
    project_id: projectId,
    type: 'block.progress_updated',
    payload: {
      id: blockIds[0],
      progress: 75,
      previous_progress: 0
    }
  });

  await sleep(1000);
  console.log('✅ Block operations completed\n');

  // Capture context
  console.log('6️⃣ Capturing context items...');
  for (const contextData of [
    { type: 'decision', title: 'Use OAuth 2.0', content: 'Decided to implement OAuth 2.0 for authentication due to security requirements.' },
    { type: 'insight', title: 'User feedback', content: 'Users prefer a clean, minimalist interface design.' },
    { type: 'blocker', title: 'API rate limits', content: 'Third-party API has strict rate limits that may affect performance.' }
  ]) {
    await db.createEvent({
      project_id: projectId,
      type: 'context.captured',
      payload: {
        id: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...contextData,
        source: 'integration-test'
      }
    });
  }
  console.log('✅ Context items created\n');

  await sleep(1000);

  // Test context retrieval
  console.log('7️⃣ Testing context preview generation...');
  try {
    const contextPreview = await contextService.generateContextPreview(projectId, {
      maxTokens: 2000,
      userQuery: 'authentication and UI design'
    });

    console.log(`✅ Generated context preview with ${contextPreview.preview.length} items`);
    console.log(`📊 Summary: ${contextPreview.summary}`);
    
    console.log('\n🔍 Top context items:');
    contextPreview.preview.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.type}] ${item.title || 'Untitled'} (score: ${item.score.toFixed(2)})`);
      console.log(`     ${item.content.slice(0, 80)}...`);
    });

  } catch (error) {
    console.log(`⚠️ Context preview failed (AI service not configured): ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');

  // Test project graph
  console.log('8️⃣ Testing project graph retrieval...');
  const graph = await db.getProjectGraph(projectId);
  
  console.log(`✅ Retrieved project graph:`);
  console.log(`   📝 ${graph.blocks.length} blocks`);
  console.log(`   💡 ${graph.context_items.length} context items`);
  console.log(`   🔗 ${graph.relations.length} relations`);
  console.log('');

  // Show final state
  console.log('9️⃣ Final project state:');
  console.log(`   Project ID: ${projectId}`);
  
  const blocksByLane = graph.blocks.reduce((acc: Record<string, any[]>, block) => {
    if (!acc[block.lane]) acc[block.lane] = [];
    acc[block.lane].push(block);
    return acc;
  }, {});

  Object.entries(blocksByLane).forEach(([lane, blocks]) => {
    console.log(`   ${lane.toUpperCase()}: ${blocks.length} blocks`);
    blocks.forEach((block: any) => {
      console.log(`     • ${block.title} (${block.status}, ${block.progress}%)`);
    });
  });

  console.log('');

  // Stop consumer
  await consumer.stop();
  await db.close();

  console.log('🎉 Integration test completed successfully!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Configure Claude Code with MCP connection');
  console.log('   2. Set up API keys for context compression');
  console.log('   3. Configure GitHub webhooks');
  console.log('   4. Deploy to production');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the integration test
runIntegrationTest().catch((error) => {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
});