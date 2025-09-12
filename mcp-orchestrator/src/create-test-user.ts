#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function createTestUser() {
  console.log('👤 Creating test user for MCP integration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Create a test user
    const result = await db.query(`
      INSERT INTO users (id, email, full_name, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
      RETURNING id, email, full_name
    `, ['mcp-test@frizy.ai', 'MCP Test User']);

    console.log('✅ Created test user:');
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  Email: ${result.rows[0].email}`);
    console.log(`  Name: ${result.rows[0].full_name}`);
    
    // Verify user exists
    const verifyResult = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Total users in database: ${verifyResult.rows[0].count}`);

  } catch (error: any) {
    if (error.code === '23505') {
      console.log('⚠️ Test user already exists, checking existing users...');
      
      const existingResult = await db.query('SELECT id, email, full_name FROM users LIMIT 1');
      if (existingResult.rows.length > 0) {
        console.log('✅ Using existing user:');
        console.log(`  ID: ${existingResult.rows[0].id}`);
        console.log(`  Email: ${existingResult.rows[0].email}`);
        console.log(`  Name: ${existingResult.rows[0].full_name}`);
      }
    } else {
      console.error('❌ Failed to create test user:', error);
      throw error;
    }
  } finally {
    await db.close();
  }
}

createTestUser().catch((error) => {
  console.error('❌ Test user creation failed:', error);
  process.exit(1);
});