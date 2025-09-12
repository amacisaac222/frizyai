import { Database } from './database.js';
import { Event, EventType } from './types.js';

export class EventConsumer {
  private db: Database;
  private isRunning = false;
  private consumerId: string;
  private pollIntervalMs: number;

  constructor(database: Database, consumerId = 'default', pollIntervalMs = 1000) {
    this.db = database;
    this.consumerId = consumerId;
    this.pollIntervalMs = pollIntervalMs;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Event consumer is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting event consumer: ${this.consumerId}`);

    // Initialize consumer offset if not exists
    await this.initializeOffset();

    // Start the polling loop
    this.pollLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`🛑 Stopping event consumer: ${this.consumerId}`);
  }

  private async initializeOffset(): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO projection_offsets (id, last_event_id, last_seen_at)
        VALUES ($1, NULL, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [this.consumerId]);
    } catch (error) {
      console.error('Failed to initialize consumer offset:', error);
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processNewEvents();
        await this.sleep(this.pollIntervalMs);
      } catch (error) {
        console.error('Error in event processing loop:', error);
        await this.sleep(this.pollIntervalMs * 2); // Back off on error
      }
    }
  }

  private async processNewEvents(): Promise<void> {
    // Get the last processed event ID
    const offsetResult = await this.db.query(`
      SELECT last_event_id, last_seen_at
      FROM projection_offsets
      WHERE id = $1
    `, [this.consumerId]);

    const lastEventId = offsetResult.rows[0]?.last_event_id;
    const lastSeenAt = offsetResult.rows[0]?.last_seen_at;

    // Fetch new events
    const query = lastEventId
      ? `SELECT * FROM events WHERE created_at > $2 ORDER BY created_at ASC LIMIT 50`
      : `SELECT * FROM events WHERE created_at > $2 ORDER BY created_at ASC LIMIT 50`;

    const eventsResult = await this.db.query(query, [
      lastEventId,
      lastSeenAt || new Date(0).toISOString()
    ]);

    const events = eventsResult.rows as Event[];

    if (events.length === 0) {
      return; // No new events
    }

    console.log(`📦 Processing ${events.length} new events...`);

    // Process events in order
    for (const event of events) {
      try {
        await this.processEvent(event);
        await this.updateOffset(event.id, event.created_at);
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        // For MVP, we'll skip failed events. In production, you might want
        // to implement retry logic or dead letter queues
      }
    }

    console.log(`✅ Processed ${events.length} events successfully`);
  }

  private async processEvent(event: Event): Promise<void> {
    const { type, payload, project_id, actor_id } = event;

    switch (type) {
      case 'block.created':
        await this.handleBlockCreated(event);
        break;
        
      case 'block.moved':
        await this.handleBlockMoved(event);
        break;
        
      case 'block.progress_updated':
        await this.handleBlockProgressUpdated(event);
        break;
        
      case 'block.updated':
        await this.handleBlockUpdated(event);
        break;
        
      case 'block.deleted':
        await this.handleBlockDeleted(event);
        break;
        
      case 'context.captured':
        await this.handleContextCaptured(event);
        break;
        
      case 'context.linked':
        await this.handleContextLinked(event);
        break;
        
      case 'session.started':
        await this.handleSessionStarted(event);
        break;
        
      case 'session.ended':
        await this.handleSessionEnded(event);
        break;
        
      case 'github.pr.opened':
      case 'github.pr.closed':
      case 'github.pr.merged':
      case 'github.pr.commented':
      case 'github.issue.opened':
      case 'github.issue.closed':
      case 'github.issue.reopened':
      case 'github.release.published':
      case 'github.commit.pushed':
        await this.handleGitHubEvent(event);
        break;
        
      case 'project.created':
        await this.handleProjectCreated(event);
        break;
        
      case 'project.updated':
        await this.handleProjectUpdated(event);
        break;
        
      default:
        console.warn(`Unknown event type: ${type}`);
    }
  }

  private async handleBlockCreated(event: Event): Promise<void> {
    const { id, title, content, lane, priority, effort, status = 'not_started' } = event.payload;

    await this.db.query(`
      INSERT INTO blocks (
        id, project_id, title, content, lane, status, priority, progress, effort, 
        last_worked_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      ON CONFLICT (id) DO NOTHING
    `, [
      id,
      event.project_id,
      title,
      content || null,
      lane || 'current',
      status,
      priority || 'medium',
      0, // Initial progress
      effort || null,
      null, // last_worked_at
      event.created_at
    ]);

    console.log(`📝 Created block: ${title} (${id})`);
  }

  private async handleBlockMoved(event: Event): Promise<void> {
    const { id, lane } = event.payload;

    await this.db.query(`
      UPDATE blocks 
      SET lane = $2, updated_at = $3, last_worked_at = $3
      WHERE id = $1
    `, [id, lane, event.created_at]);

    console.log(`🚀 Moved block ${id} to ${lane} lane`);
  }

  private async handleBlockProgressUpdated(event: Event): Promise<void> {
    const { id, progress } = event.payload;

    // Update progress and set status based on progress
    let status = 'in_progress';
    if (progress === 0) status = 'not_started';
    else if (progress === 100) status = 'completed';

    await this.db.query(`
      UPDATE blocks 
      SET progress = $2, status = $3, updated_at = $4, last_worked_at = $4
      WHERE id = $1
    `, [id, progress, status, event.created_at]);

    console.log(`📊 Updated block ${id} progress to ${progress}%`);
  }

  private async handleBlockUpdated(event: Event): Promise<void> {
    const { id, title, content, priority, status, effort } = event.payload;

    // Build dynamic update query
    const updates = [];
    const values = [id];
    let valueIndex = 2;

    if (title !== undefined) {
      updates.push(`title = $${valueIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${valueIndex++}`);
      values.push(content);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${valueIndex++}`);
      values.push(priority);
    }
    if (status !== undefined) {
      updates.push(`status = $${valueIndex++}`);
      values.push(status);
    }
    if (effort !== undefined) {
      updates.push(`effort = $${valueIndex++}`);
      values.push(effort);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${valueIndex++}`);
      updates.push(`last_worked_at = $${valueIndex++}`);
      values.push(event.created_at, event.created_at);

      await this.db.query(`
        UPDATE blocks 
        SET ${updates.join(', ')}
        WHERE id = $1
      `, values);

      console.log(`✏️  Updated block ${id}`);
    }
  }

  private async handleBlockDeleted(event: Event): Promise<void> {
    const { id } = event.payload;

    await this.db.query(`
      DELETE FROM blocks WHERE id = $1
    `, [id]);

    console.log(`🗑️ Deleted block ${id}`);
  }

  private async handleContextCaptured(event: Event): Promise<void> {
    const { id, type, title, content, source = 'mcp' } = event.payload;

    await this.db.query(`
      INSERT INTO context_items (
        id, project_id, type, title, content, source, author_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      id,
      event.project_id,
      type,
      title || null,
      content,
      source,
      event.actor_id || null,
      event.created_at
    ]);

    console.log(`💡 Captured context: ${type} - ${title || 'Untitled'}`);
  }

  private async handleContextLinked(event: Event): Promise<void> {
    const { context_id, block_id } = event.payload;

    await this.db.query(`
      INSERT INTO context_links (context_id, block_id, created_at)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [context_id, block_id, event.created_at]);

    console.log(`🔗 Linked context ${context_id} to block ${block_id}`);
  }

  private async handleSessionStarted(event: Event): Promise<void> {
    const { session_id, session_type, block_id } = event.payload;

    await this.db.query(`
      INSERT INTO claude_sessions (
        id, block_id, project_id, user_id, session_type, context_data, 
        messages_count, tokens_used, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7, $7)
      ON CONFLICT (id) DO NOTHING
    `, [
      session_id,
      block_id || null,
      event.project_id,
      event.actor_id,
      session_type || 'coding',
      {},
      event.created_at
    ]);

    console.log(`🚀 Started Claude session: ${session_id}`);
  }

  private async handleSessionEnded(event: Event): Promise<void> {
    const { session_id, messages_count, tokens_used, outcomes } = event.payload;

    await this.db.query(`
      UPDATE claude_sessions 
      SET messages_count = $2, tokens_used = $3, outcomes = $4, updated_at = $5
      WHERE id = $1
    `, [
      session_id,
      messages_count || 0,
      tokens_used || 0,
      outcomes || [],
      event.created_at
    ]);

    console.log(`✅ Ended Claude session: ${session_id}`);
  }

  private async handleGitHubEvent(event: Event): Promise<void> {
    const { provider_type, provider_id, url, title, status, author } = event.payload;

    await this.db.query(`
      INSERT INTO github_entities (
        project_id, provider_type, provider_id, url, title, status, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [
      event.project_id,
      provider_type,
      provider_id,
      url,
      title,
      status,
      { author },
      event.created_at
    ]);

    console.log(`🐙 GitHub ${provider_type}: ${title}`);
  }

  private async handleProjectCreated(event: Event): Promise<void> {
    const { id, name, description, owner_id, metadata = {} } = event.payload;

    await this.db.query(`
      INSERT INTO projects (id, name, description, created_by, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      ON CONFLICT (id) DO NOTHING
    `, [id, name, description, owner_id, metadata, event.created_at]);

    console.log(`📁 Created project: ${name}`);
  }

  private async handleProjectUpdated(event: Event): Promise<void> {
    const { id, name, description, metadata } = event.payload;

    const updates = [];
    const values = [id];
    let valueIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${valueIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${valueIndex++}`);
      values.push(description);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${valueIndex++}`);
      values.push(metadata);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = $${valueIndex++}`);
      values.push(event.created_at);

      await this.db.query(`
        UPDATE projects 
        SET ${updates.join(', ')}
        WHERE id = $1
      `, values);

      console.log(`📝 Updated project ${id}`);
    }
  }

  private async updateOffset(eventId: string, createdAt: string): Promise<void> {
    await this.db.query(`
      UPDATE projection_offsets 
      SET last_event_id = $2, last_seen_at = $3
      WHERE id = $1
    `, [this.consumerId, eventId, createdAt]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Add query method to Database class
declare module './database.js' {
  interface Database {
    query(text: string, params?: any[]): Promise<any>;
  }
}