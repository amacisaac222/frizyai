#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function checkAuthTables() {
  console.log('🔍 Checking for Supabase auth tables...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Check all schemas
    const schemasResult = await db.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    
    console.log('📊 Available schemas:');
    schemasResult.rows.forEach((row: any) => {
      console.log(`  - ${row.schema_name}`);
    });

    // Check for user tables in all schemas
    const userTablesResult = await db.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename LIKE '%user%' 
      ORDER BY schemaname, tablename
    `);
    
    console.log('\n👤 User-related tables:');
    userTablesResult.rows.forEach((row: any) => {
      console.log(`  - ${row.schemaname}.${row.tablename}`);
    });

    // Check if auth.users exists
    try {
      const authUsersResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM auth.users
      `);
      console.log(`\n✅ auth.users table found with ${authUsersResult.rows[0].count} users`);
      
      // Get a sample auth user if any exist
      const sampleAuthUser = await db.query('SELECT id, email FROM auth.users LIMIT 1');
      if (sampleAuthUser.rows.length > 0) {
        console.log(`   Sample user: ${sampleAuthUser.rows[0].id} (${sampleAuthUser.rows[0].email})`);
      }
    } catch (error) {
      console.log('\n❌ No auth.users table found');
    }

  } catch (error) {
    console.error('❌ Auth tables check failed:', error);
  } finally {
    await db.close();
  }
}

checkAuthTables().catch((error) => {
  console.error('❌ Auth tables check script failed:', error);
  process.exit(1);
});