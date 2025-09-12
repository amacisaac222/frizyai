#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function checkSchema() {
  console.log('🔍 Checking existing database schema...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Check what tables exist
    const tablesResult = await db.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Existing tables:');
    tablesResult.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });

    // Check for specific tables we need
    const requiredTables = ['projects', 'events', 'blocks', 'context_items'];
    console.log('\n🎯 Required tables status:');
    
    for (const tableName of requiredTables) {
      const exists = tablesResult.rows.some((row: any) => row.table_name === tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
      
      if (exists) {
        // Check column types
        const columnsResult = await db.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`    Columns:`);
        columnsResult.rows.forEach((col: any) => {
          console.log(`      ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await db.close();
  }
}

checkSchema().catch((error) => {
  console.error('❌ Schema check script failed:', error);
  process.exit(1);
});