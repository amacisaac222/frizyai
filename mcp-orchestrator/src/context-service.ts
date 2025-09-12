import OpenAI from 'openai';
import { Database } from './database.js';
import { EmbeddingService } from './embedding-service.js';
import { ContextPreview, ContextPreviewItem } from './types.js';

export class ContextService {
  private db: Database;
  private openai: OpenAI | null = null;
  private embeddingService: EmbeddingService;
  private embeddingsCache = new Map<string, number[]>();

  constructor(database: Database) {
    this.db = database;
    this.embeddingService = new EmbeddingService(database);
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async generateContextPreview(projectId: string, options: {
    maxTokens?: number;
    includeBlocks?: boolean;
    includeContext?: boolean;
    includeGitHub?: boolean;
    userQuery?: string;
  } = {}): Promise<ContextPreview> {
    const {
      maxTokens = 4000,
      includeBlocks = true,
      includeContext = true,
      includeGitHub = true,
      userQuery
    } = options;

    // Get project data
    const [project, graph, githubEntities] = await Promise.all([
      this.db.getProject(projectId),
      this.db.getProjectGraph(projectId),
      includeGitHub ? this.db.getGitHubEntitiesByProject(projectId) : []
    ]);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Score and rank all context items
    const scoredItems: ContextPreviewItem[] = [];

    // If we have a user query, use semantic search when available
    let semanticBoosts = new Map<string, number>();
    if (userQuery) {
      try {
        const semanticResults = await this.embeddingService.searchSemantic(projectId, userQuery, {
          limit: 50,
          threshold: 0.6,
          includeBlocks: true,
          includeContext: true
        });
        
        // Create semantic relevance boost map
        semanticResults.forEach((result: any, index: number) => {
          const boost = Math.max(0, result.similarity - 0.5); // Use similarity score as boost
          semanticBoosts.set(result.id, boost);
        });
      } catch (error) {
        console.warn('Semantic search failed, using standard scoring:', error);
      }
    }

    // Add blocks as context items
    if (includeBlocks) {
      graph.blocks.forEach(block => {
        const baseScore = this.scoreBlock(block);
        const semanticBoost = semanticBoosts.get(block.id) || 0;
        const textualBoost = userQuery ? this.calculateTextualRelevance(userQuery, block.title + ' ' + (block.content || '')) : 0;
        
        const score = Math.min(1.0, baseScore + semanticBoost + textualBoost);
        
        scoredItems.push({
          id: block.id,
          type: `block_${block.lane}`,
          title: block.title,
          content: this.formatBlockContent(block),
          score,
          source: 'block',
          links: [`/blocks/${block.id}`],
          created_at: block.created_at
        });
      });
    }

    // Add context items
    if (includeContext) {
      graph.context_items.forEach(item => {
        const baseScore = this.scoreContextItem(item);
        const semanticBoost = semanticBoosts.get(item.id) || 0;
        const textualBoost = userQuery ? this.calculateTextualRelevance(userQuery, (item.title || '') + ' ' + item.content) : 0;
        
        const score = Math.min(1.0, baseScore + semanticBoost + textualBoost);
        
        scoredItems.push({
          id: item.id,
          type: item.type,
          title: item.title || '',
          content: item.content,
          score,
          source: item.source,
          links: [`/context/${item.id}`],
          created_at: item.created_at
        });
      });
    }

    // Add GitHub entities
    if (includeGitHub) {
      githubEntities.forEach(entity => {
        const score = this.scoreGitHubEntity(entity);
        scoredItems.push({
          id: entity.id,
          type: `github_${entity.provider_type}`,
          title: entity.title || '',
          content: `${entity.provider_type}: ${entity.title}`,
          score,
          source: 'github',
          links: [entity.url || ''],
          created_at: entity.created_at
        });
      });
    }

    // Sort by score descending
    scoredItems.sort((a, b) => b.score - a.score);

    // Compress to fit token budget
    const compressedItems = await this.compressItems(scoredItems, maxTokens, userQuery);

    // Generate project summary
    const summary = await this.generateProjectSummary(project, graph, compressedItems);

    return {
      project_id: projectId,
      preview: compressedItems,
      summary,
      total_items: scoredItems.length,
      generated_at: new Date().toISOString()
    };
  }

  private scoreBlock(block: any): number {
    let score = 0.5; // Base score

    // Prioritize active blocks
    if (block.status === 'in_progress') score += 0.3;
    if (block.status === 'blocked') score += 0.2;

    // Prioritize by priority
    switch (block.priority) {
      case 'urgent': score += 0.2; break;
      case 'high': score += 0.15; break;
      case 'medium': score += 0.1; break;
      case 'low': score += 0.05; break;
    }

    // Prioritize recently worked items
    if (block.last_worked_at) {
      const daysSince = (Date.now() - new Date(block.last_worked_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 1) score += 0.2;
      else if (daysSince < 7) score += 0.1;
    }

    // Current lane items are most relevant
    switch (block.lane) {
      case 'current': score += 0.2; break;
      case 'next': score += 0.15; break;
      case 'goals': score += 0.1; break;
      case 'vision': score += 0.05; break;
      case 'context': score += 0.05; break;
    }

    return Math.min(score, 1.0);
  }

  private scoreContextItem(item: any): number {
    let score = 0.4; // Base score

    // Prioritize by type
    switch (item.type) {
      case 'decision': score += 0.25; break;
      case 'blocker': score += 0.2; break;
      case 'insight': score += 0.15; break;
      case 'solution': score += 0.15; break;
      case 'reference': score += 0.1; break;
      case 'note': score += 0.05; break;
    }

    // Prioritize recent items
    const daysSince = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) score += 0.15;
    else if (daysSince < 7) score += 0.1;
    else if (daysSince < 30) score += 0.05;

    return Math.min(score, 1.0);
  }

  private scoreGitHubEntity(entity: any): number {
    let score = 0.3; // Base score

    // Prioritize by type
    switch (entity.provider_type) {
      case 'pr': score += 0.2; break;
      case 'issue': score += 0.15; break;
      case 'commit': score += 0.1; break;
    }

    // Prioritize open/active items
    if (entity.status === 'open' || entity.status === 'active') score += 0.1;

    // Prioritize recent items
    const daysSince = (Date.now() - new Date(entity.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) score += 0.1;
    else if (daysSince < 7) score += 0.05;

    return Math.min(score, 1.0);
  }

  private formatBlockContent(block: any): string {
    const parts = [
      `Status: ${block.status}`,
      `Lane: ${block.lane}`,
      `Priority: ${block.priority}`,
    ];

    if (block.progress > 0) {
      parts.push(`Progress: ${block.progress}%`);
    }

    if (block.content) {
      parts.push(`Content: ${block.content}`);
    }

    return parts.join(' | ');
  }

  private async compressItems(items: ContextPreviewItem[], maxTokens: number, userQuery?: string): Promise<ContextPreviewItem[]> {
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    let currentTokens = 0;
    const selectedItems: ContextPreviewItem[] = [];
    const itemsToCompress: ContextPreviewItem[] = [];

    // First pass: include high-scoring items that fit
    for (const item of items) {
      const itemTokens = estimateTokens(item.content);
      
      if (currentTokens + itemTokens <= maxTokens * 0.8) { // Reserve 20% for summaries
        selectedItems.push(item);
        currentTokens += itemTokens;
      } else if (item.score > 0.7) { // High-value items get compressed
        itemsToCompress.push(item);
      }
    }

    // Compress remaining high-value items if we have AI available
    if (this.openai && itemsToCompress.length > 0) {
      const remainingTokens = maxTokens - currentTokens;
      const compressed = await this.compressWithAI(itemsToCompress, remainingTokens, userQuery);
      selectedItems.push(...compressed);
    }

    return selectedItems;
  }

  private async compressWithAI(items: ContextPreviewItem[], maxTokens: number, userQuery?: string): Promise<ContextPreviewItem[]> {
    if (!this.openai) return [];

    try {
      const itemTexts = items.map(item => `${item.type}: ${item.title} - ${item.content}`).join('\n\n');
      
      const prompt = `
Summarize the following project context items concisely while preserving key information.
${userQuery ? `Focus on information relevant to: ${userQuery}` : ''}

Target: ${Math.floor(maxTokens * 0.8)} tokens maximum

Context items:
${itemTexts}

Provide a bulleted summary that captures the essential information:
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(maxTokens, 1000),
        temperature: 0.3
      });

      const summary = response.choices[0]?.message?.content || '';

      // Return as a single compressed item
      return [{
        id: 'compressed-items',
        type: 'summary',
        title: `Summary of ${items.length} items`,
        content: summary,
        score: 0.9,
        source: 'ai_compressed',
        links: items.flatMap(item => item.links),
        created_at: new Date().toISOString()
      }];

    } catch (error) {
      console.error('AI compression failed:', error);
      // Fallback: return top items by score, truncated
      return items.slice(0, 3).map(item => ({
        ...item,
        content: item.content.slice(0, 100) + '...'
      }));
    }
  }

  private async generateProjectSummary(project: any, graph: any, items: ContextPreviewItem[]): Promise<string> {
    const activeBlocks = graph.blocks.filter((b: any) => b.status === 'in_progress').length;
    const totalBlocks = graph.blocks.length;
    const completedBlocks = graph.blocks.filter((b: any) => b.status === 'completed').length;
    
    const summary = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      `Blocks: ${totalBlocks} total (${activeBlocks} active, ${completedBlocks} completed)`,
      `Context items: ${graph.context_items.length}`,
      `High-priority items included: ${items.length}`
    ].filter(Boolean).join(' | ');

    return summary;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured');
    }

    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.embeddingsCache.has(cacheKey)) {
      return this.embeddingsCache.get(cacheKey)!;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8192), // Truncate to model limit
        encoding_format: 'float'
      });

      const embedding = response.data[0].embedding;
      
      // Cache the embedding
      this.embeddingsCache.set(cacheKey, embedding);
      
      // Limit cache size to prevent memory issues
      if (this.embeddingsCache.size > 100) {
        const firstKey = this.embeddingsCache.keys().next().value;
        if (firstKey) {
          this.embeddingsCache.delete(firstKey);
        }
      }

      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  private calculateTextualRelevance(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let relevanceScore = 0;
    let matchCount = 0;
    
    for (const term of queryTerms) {
      if (term.length < 3) continue; // Skip very short terms
      
      const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length;
      if (occurrences > 0) {
        matchCount++;
        relevanceScore += Math.min(occurrences * 0.1, 0.3); // Cap per-term contribution
      }
    }
    
    // Boost if multiple query terms match
    if (matchCount > 1) {
      relevanceScore *= (1 + (matchCount - 1) * 0.2);
    }
    
    return Math.min(relevanceScore, 0.5); // Cap total textual boost
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

  // Background embedding processing for context items
  async processContextEmbeddings(projectId: string): Promise<void> {
    if (!this.openai) {
      console.log('OpenAI not configured, skipping embedding generation');
      return;
    }

    try {
      const contextItems = await this.db.getContextItemsByProject(projectId, 100);
      
      for (const item of contextItems) {
        try {
          const text = `${item.title || ''} ${item.content}`.trim();
          const embedding = await this.generateEmbedding(text);
          
          // Update context item with embedding in database
          await this.db.query(`
            UPDATE context_items 
            SET embedding = $1::vector
            WHERE id = $2
          `, [JSON.stringify(embedding), item.id]);
          
          console.log(`Generated embedding for context item: ${item.id}`);
          
          // Rate limiting to avoid API limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Failed to process embedding for ${item.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process context embeddings:', error);
    }
  }
}