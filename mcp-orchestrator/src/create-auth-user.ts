#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function createAuthUser() {
  console.log('🔐 Creating test user in auth.users...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Create test user in auth.users
    const authUserResult = await db.query(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000'::uuid,
        'mcp-test@frizy.ai',
        crypt('test123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated'
      )
      RETURNING id, email
    `);

    console.log('✅ Created auth.users record:');
    console.log(`  ID: ${authUserResult.rows[0].id}`);
    console.log(`  Email: ${authUserResult.rows[0].email}`);
    
    // Check if this triggered creation in public.users
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for triggers
    
    const publicUsersResult = await db.query('SELECT * FROM users');
    console.log(`\n📊 public.users records: ${publicUsersResult.rows.length}`);
    
    if (publicUsersResult.rows.length > 0) {
      console.log('✅ public.users populated by trigger:');
      publicUsersResult.rows.forEach((user: any) => {
        console.log(`  ID: ${user.id}, Email: ${user.email}, Name: ${user.full_name || 'null'}`);
      });
    } else {
      console.log('⚠️ public.users not populated, creating manually...');
      
      // Create in public.users manually
      const publicUserResult = await db.query(`
        INSERT INTO users (id, email, full_name, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, email, full_name
      `, [authUserResult.rows[0].id, authUserResult.rows[0].email, 'MCP Test User']);

      console.log('✅ Created public.users record:');
      console.log(`  ID: ${publicUserResult.rows[0].id}`);
      console.log(`  Email: ${publicUserResult.rows[0].email}`);
      console.log(`  Name: ${publicUserResult.rows[0].full_name}`);
    }

  } catch (error) {
    console.error('❌ Auth user creation failed:', error);
  } finally {
    await db.close();
  }
}

createAuthUser().catch((error) => {
  console.error('❌ Auth user creation script failed:', error);
  process.exit(1);
});