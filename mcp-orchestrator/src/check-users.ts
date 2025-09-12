#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function checkUsers() {
  console.log('👤 Checking users table structure...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Check users table structure
    const columnsResult = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Users table structure:');
    columnsResult.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
    });

    // Check existing users
    const usersResult = await db.query('SELECT * FROM users LIMIT 3');
    
    console.log(`\n👥 Existing users (${usersResult.rows.length}):`);
    if (usersResult.rows.length > 0) {
      usersResult.rows.forEach((user: any) => {
        console.log(`  ID: ${user.id}`);
        console.log(`  Data: ${JSON.stringify(user, null, 2)}`);
      });
    } else {
      console.log('  No existing users found');
    }

  } catch (error) {
    console.error('❌ Users check failed:', error);
  } finally {
    await db.close();
  }
}

checkUsers().catch((error) => {
  console.error('❌ Users check script failed:', error);
  process.exit(1);
});