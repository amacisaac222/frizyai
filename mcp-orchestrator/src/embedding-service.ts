import OpenAI from 'openai';
import { Database } from './database.js';

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private db: Database;
  private embeddingCache = new Map<string, number[]>();

  constructor(database: Database) {
    this.db = database;
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured - OPENAI_API_KEY required');
    }

    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dimensions
        input: text.slice(0, 8192), // Truncate to model limit
        encoding_format: 'float'
      });

      const embedding = response.data[0].embedding;
      
      // Cache the embedding (with size limit)
      this.cacheEmbedding(cacheKey, embedding);
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async processAllPendingEmbeddings(projectId?: string): Promise<{
    processed: number;
    errors: number;
    skipped: number;
  }> {
    if (!this.openai) {
      console.log('⚠️  OpenAI not configured, skipping embedding generation');
      return { processed: 0, errors: 0, skipped: 1 };
    }

    let processed = 0;
    let errors = 0;
    let skipped = 0;

    try {
      // Get all items that need embeddings
      const whereClause = projectId ? 'WHERE project_id = $1' : '';
      const params = projectId ? [projectId] : [];
      
      const result = await this.db.query(`
        SELECT item_type, id, project_id, text_content 
        FROM items_needing_embeddings 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 100
      `, params);

      console.log(`🔄 Processing ${result.rows.length} items for embedding generation`);

      for (const item of result.rows) {
        try {
          // Generate embedding
          const embedding = await this.generateEmbedding(item.text_content);
          
          // Store embedding in database
          if (item.item_type === 'context_item') {
            await this.updateContextItemEmbedding(item.id, embedding);
          } else if (item.item_type === 'block') {
            await this.updateBlockEmbedding(item.id, embedding);
          }
          
          processed++;
          console.log(`✅ Generated embedding for ${item.item_type}: ${item.id}`);
          
          // Rate limiting to avoid API limits (3 requests per second for OpenAI)
          await this.sleep(350);
          
        } catch (error) {
          errors++;
          console.error(`❌ Failed to process ${item.item_type} ${item.id}:`, error);
          
          // Continue processing other items
        }
      }

      console.log(`🎉 Embedding processing complete: ${processed} processed, ${errors} errors, ${skipped} skipped`);
      return { processed, errors, skipped };

    } catch (error) {
      console.error('Failed to process pending embeddings:', error);
      return { processed, errors: errors + 1, skipped };
    }
  }

  async searchSemantic(
    projectId: string, 
    query: string, 
    options: {
      limit?: number;
      threshold?: number;
      includeBlocks?: boolean;
      includeContext?: boolean;
    } = {}
  ): Promise<any[]> {
    const {
      limit = 10,
      threshold = 0.7,
      includeBlocks = true,
      includeContext = true
    } = options;

    if (!this.openai) {
      console.warn('OpenAI not configured, falling back to keyword search');
      return await this.keywordSearch(projectId, query, limit);
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Use the database function for semantic search
      const result = await this.db.query(`
        SELECT * FROM semantic_search($1, $2, $3, $4)
      `, [projectId, JSON.stringify(queryEmbedding), limit, threshold]);

      // Filter results based on options
      let filteredResults = result.rows;
      if (!includeBlocks) {
        filteredResults = filteredResults.filter((item: any) => item.item_type !== 'block');
      }
      if (!includeContext) {
        filteredResults = filteredResults.filter((item: any) => item.item_type !== 'context_item');
      }

      return filteredResults;

    } catch (error) {
      console.error('Semantic search failed, falling back to keyword search:', error);
      return await this.keywordSearch(projectId, query, limit);
    }
  }

  private async keywordSearch(projectId: string, query: string, limit: number): Promise<any[]> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return [];
    }

    const queryPattern = searchTerms.map(term => `%${term}%`).join('|');
    
    const result = await this.db.query(`
      SELECT 
        'context_item' as item_type,
        id,
        title,
        content,
        0.5 as similarity,
        created_at
      FROM context_items
      WHERE project_id = $1 
        AND (content ILIKE ANY(string_to_array($2, '|')) OR title ILIKE ANY(string_to_array($2, '|')))
      
      UNION ALL
      
      SELECT 
        'block' as item_type,
        id,
        title,
        content,
        0.5 as similarity,
        created_at
      FROM blocks
      WHERE project_id = $1 
        AND (content ILIKE ANY(string_to_array($2, '|')) OR title ILIKE ANY(string_to_array($2, '|')))
      
      ORDER BY created_at DESC
      LIMIT $3
    `, [projectId, queryPattern, limit]);

    return result.rows;
  }

  private async updateContextItemEmbedding(itemId: string, embedding: number[]): Promise<void> {
    await this.db.query(`
      UPDATE context_items 
      SET embedding = $1::vector
      WHERE id = $2
    `, [JSON.stringify(embedding), itemId]);
  }

  private async updateBlockEmbedding(blockId: string, embedding: number[]): Promise<void> {
    await this.db.query(`
      UPDATE blocks 
      SET embedding = $1::vector
      WHERE id = $2
    `, [JSON.stringify(embedding), blockId]);
  }

  private cacheEmbedding(key: string, embedding: number[]): void {
    // Limit cache size to prevent memory issues
    if (this.embeddingCache.size >= 200) {
      // Remove oldest entries (simple FIFO)
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }
    
    this.embeddingCache.set(key, embedding);
  }

  private hashText(text: string): string {
    let hash = 0;
    if (text.length === 0) return hash.toString();
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check for embedding service
  async healthCheck(): Promise<{
    openai_configured: boolean;
    pgvector_available: boolean;
    pending_embeddings: number;
  }> {
    try {
      // Check if OpenAI is configured
      const openaiConfigured = !!this.openai;

      // Check if pgvector is available
      let pgvectorAvailable = false;
      try {
        await this.db.query('SELECT 1 FROM pg_extension WHERE extname = $1', ['vector']);
        pgvectorAvailable = true;
      } catch (error) {
        console.warn('pgvector extension not found:', error);
      }

      // Count pending embeddings
      let pendingCount = 0;
      try {
        const result = await this.db.query('SELECT COUNT(*) as count FROM items_needing_embeddings');
        pendingCount = parseInt(result.rows[0]?.count || '0');
      } catch (error) {
        console.warn('Could not count pending embeddings:', error);
      }

      return {
        openai_configured: openaiConfigured,
        pgvector_available: pgvectorAvailable,
        pending_embeddings: pendingCount
      };

    } catch (error) {
      console.error('Embedding service health check failed:', error);
      return {
        openai_configured: false,
        pgvector_available: false,
        pending_embeddings: 0
      };
    }
  }
}