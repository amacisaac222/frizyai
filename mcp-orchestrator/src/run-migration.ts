#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function runMigration() {
  console.log('🔄 Running schema adaptation migration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '002_adapt_existing_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying migration: 002_adapt_existing_schema.sql');
    
    // Execute the migration
    await db.query(migrationSql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify migration results
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Current tables:');
    tablesResult.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.close();
  }
}

runMigration().catch((error) => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});