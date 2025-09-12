#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function runMigrations() {
  console.log('🚀 Running Frizy MCP Database Migrations...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  // Test connection
  const healthy = await db.healthCheck();
  if (!healthy) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }
  console.log('✅ Database connection successful\n');

  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
      if (!file.endsWith('.sql')) continue;

      console.log(`📄 Running migration: ${file}`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Execute the entire SQL file as one transaction
      try {
        await db.query(sqlContent);
      } catch (error: any) {
        // Log the error but continue if it's just "already exists"
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.warn(`⚠️  Warning: ${error.message}`);
        } else {
          throw error;
        }
      }
      
      console.log(`✅ Migration ${file} completed`);
    }

    console.log('\n🎉 All migrations completed successfully!');
    
    // Test by creating a sample project
    console.log('\n🧪 Testing schema with sample data...');
    const testResult = await db.query(`
      INSERT INTO projects (name, description, owner_id) 
      VALUES ($1, $2, $3) 
      RETURNING id, name
    `, ['Test Project', 'Migration test project', '00000000-0000-0000-0000-000000000000']);
    
    console.log(`✅ Created test project: ${testResult.rows[0].name} (${testResult.rows[0].id})`);
    
    // Clean up test data
    await db.query('DELETE FROM projects WHERE owner_id = $1', ['00000000-0000-0000-0000-000000000000']);
    console.log('✅ Cleaned up test data');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigrations().catch((error) => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});