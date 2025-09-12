#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function checkConstraints() {
  console.log('🔍 Checking database constraints...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Check foreign key constraints
    const constraintsResult = await db.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('users', 'projects', 'blocks', 'events')
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    console.log('🔗 Foreign key constraints:');
    constraintsResult.rows.forEach((constraint: any) => {
      console.log(`  ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      console.log(`    Constraint: ${constraint.constraint_name}`);
    });

    // Check if there are any existing records we need to be aware of
    const tablesData = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM projects'), 
      db.query('SELECT COUNT(*) as count FROM blocks'),
      db.query('SELECT COUNT(*) as count FROM events')
    ]);

    console.log('\n📊 Current record counts:');
    console.log(`  Users: ${tablesData[0].rows[0].count}`);
    console.log(`  Projects: ${tablesData[1].rows[0].count}`);
    console.log(`  Blocks: ${tablesData[2].rows[0].count}`);
    console.log(`  Events: ${tablesData[3].rows[0].count}`);

  } catch (error) {
    console.error('❌ Constraints check failed:', error);
  } finally {
    await db.close();
  }
}

checkConstraints().catch((error) => {
  console.error('❌ Constraints check script failed:', error);
  process.exit(1);
});