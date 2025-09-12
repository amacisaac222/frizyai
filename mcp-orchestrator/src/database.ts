import pg from 'pg';
import { Event, Block, ContextItem, ContextPreview } from './types.js';

const { Pool } = pg;

export class Database {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Event operations
  async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const query = `
      INSERT INTO events (project_id, type, actor_id, payload)
      VALUES ($1, $2, $3, $4)
      RETURNING id, project_id, type, actor_id, payload, created_at
    `;
    
    const result = await this.pool.query(query, [
      event.project_id,
      event.type,
      event.actor_id || null,
      event.payload
    ]);
    
    return result.rows[0] as Event;
  }

  async getEventsByProject(projectId: string, limit = 100): Promise<Event[]> {
    const query = `
      SELECT id, project_id, type, actor_id, payload, created_at
      FROM events
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [projectId, limit]);
    return result.rows as Event[];
  }

  // Block operations (read from projections)
  async getBlocksByProject(projectId: string): Promise<Block[]> {
    const query = `
      SELECT id, project_id, title, content, lane, status, priority, progress, effort, last_worked_at, created_at, updated_at
      FROM blocks
      WHERE project_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows as Block[];
  }

  async getBlock(blockId: string): Promise<Block | null> {
    const query = `
      SELECT id, project_id, title, content, lane, status, priority, progress, effort, last_worked_at, created_at, updated_at
      FROM blocks
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [blockId]);
    return result.rows[0] as Block || null;
  }

  // Context operations
  async getContextItemsByProject(projectId: string, limit = 50): Promise<ContextItem[]> {
    const query = `
      SELECT id, project_id, type, title, content, source, author_id, created_at
      FROM context_items
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [projectId, limit]);
    return result.rows as ContextItem[];
  }

  // Project graph operations
  async getProjectGraph(projectId: string) {
    const [blocks, contextItems, relations] = await Promise.all([
      this.getBlocksByProject(projectId),
      this.getContextItemsByProject(projectId),
      this.getBlockRelations(projectId)
    ]);

    return {
      project_id: projectId,
      blocks,
      context_items: contextItems,
      relations,
      generated_at: new Date().toISOString()
    };
  }

  private async getBlockRelations(projectId: string) {
    const query = `
      SELECT id, from_block_id, to_block_id, relation_type, created_at
      FROM block_relations
      WHERE project_id = $1
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }

  // Semantic search (pgvector integration)
  async searchContextByEmbedding(projectId: string, queryEmbedding: number[], limit = 10) {
    const query = `
      SELECT id, project_id, type, title, content, source, author_id, created_at,
             (embedding <#> $2::vector) AS distance
      FROM context_items
      WHERE project_id = $1 AND embedding IS NOT NULL
      ORDER BY embedding <#> $2::vector
      LIMIT $3
    `;
    
    try {
      const result = await this.pool.query(query, [projectId, JSON.stringify(queryEmbedding), limit]);
      return result.rows;
    } catch (error) {
      console.warn('Semantic search failed, falling back to basic search:', error);
      return this.getContextItemsByProject(projectId, limit);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // Project operations
  async getProject(projectId: string) {
    const query = `
      SELECT id, name, description, owner_id, metadata, created_at, updated_at
      FROM projects
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows[0] || null;
  }

  async getProjectsByUser(userId: string) {
    const query = `
      SELECT id, name, description, owner_id, metadata, created_at, updated_at
      FROM projects
      WHERE owner_id = $1
      ORDER BY updated_at DESC
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  // GitHub entities
  async getGitHubEntitiesByProject(projectId: string) {
    const query = `
      SELECT id, project_id, provider_type, provider_id, url, title, status, metadata, created_at
      FROM github_entities
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }
}