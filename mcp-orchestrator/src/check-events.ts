#!/usr/bin/env node

import dotenv from 'dotenv';
import { Database } from './database.js';

dotenv.config();

async function checkEvents() {
  console.log('📦 Checking created events and projections...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const db = new Database(process.env.DATABASE_URL);

  try {
    // Check events
    const eventsResult = await db.query(`
      SELECT id, stream_id, event_type, created_at 
      FROM events 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`📊 Recent events (${eventsResult.rows.length}):`);
    eventsResult.rows.forEach((event: any) => {
      console.log(`  ${event.created_at.toISOString().slice(0, 19)} | ${event.event_type} | ${event.stream_id}`);
    });

    // Check blocks
    const blocksResult = await db.query(`
      SELECT id, title, lane, status, created_at 
      FROM blocks 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`\n📝 Recent blocks (${blocksResult.rows.length}):`);
    blocksResult.rows.forEach((block: any) => {
      console.log(`  ${block.title} | ${block.lane} | ${block.status || 'null'}`);
    });

    // Check context items
    const contextResult = await db.query(`
      SELECT id, title, type, created_at 
      FROM context_items 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`\n💡 Recent context items (${contextResult.rows.length}):`);
    contextResult.rows.forEach((item: any) => {
      console.log(`  [${item.type}] ${item.title || 'Untitled'}`);
    });

    // Check projection offsets
    const offsetsResult = await db.query(`
      SELECT id, last_event_id, last_seen_at 
      FROM projection_offsets
    `);
    
    console.log(`\n⏱️ Projection offsets (${offsetsResult.rows.length}):`);
    offsetsResult.rows.forEach((offset: any) => {
      console.log(`  ${offset.id}: ${offset.last_event_id || 'null'} (${offset.last_seen_at?.toISOString().slice(0, 19) || 'null'})`);
    });

  } catch (error) {
    console.error('❌ Events check failed:', error);
  } finally {
    await db.close();
  }
}

checkEvents().catch((error) => {
  console.error('❌ Events check script failed:', error);
  process.exit(1);
});