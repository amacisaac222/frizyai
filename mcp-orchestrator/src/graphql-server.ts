import { ApolloServer, BaseContext } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import gql from 'graphql-tag';
import { Database } from './database.js';
import { ContextService } from './context-service.js';

// GraphQL type definitions
const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type Query {
    project(id: ID!): Project
    projectGraph(id: ID!): ProjectGraph
    exploreRelations(
      projectId: ID!
      startingBlockId: ID
      maxDepth: Int = 3
      relationTypes: [String!]
    ): RelationExploration
    findConnectedBlocks(
      projectId: ID!
      blockIds: [ID!]!
      maxDegrees: Int = 2
    ): BlockConnection
    contextSearch(
      projectId: ID!
      query: String!
      maxResults: Int = 10
      includeBlocks: Boolean = true
      includeContext: Boolean = true
    ): ContextSearchResult
  }

  type Project {
    id: ID!
    name: String!
    description: String
    owner_id: String
    metadata: JSON
    created_at: DateTime!
    updated_at: DateTime!
    blocks: [Block!]!
    contextItems: [ContextItem!]!
    githubEntities: [GitHubEntity!]!
    stats: ProjectStats!
  }

  type ProjectGraph {
    project_id: ID!
    blocks: [Block!]!
    context_items: [ContextItem!]!
    relations: [BlockRelation!]!
    generated_at: DateTime!
  }

  type Block {
    id: ID!
    project_id: ID!
    title: String!
    content: String
    lane: BlockLane!
    status: BlockStatus!
    priority: BlockPriority!
    progress: Int!
    effort: Int
    last_worked_at: DateTime
    created_at: DateTime!
    updated_at: DateTime!
    
    # Graph traversal fields
    relatedBlocks(maxDepth: Int = 1): [BlockConnection!]!
    contextItems: [ContextItem!]!
    githubEntities: [GitHubEntity!]!
    dependencies: [Block!]!
    dependents: [Block!]!
  }

  type ContextItem {
    id: ID!
    project_id: ID!
    type: String!
    title: String
    content: String!
    source: String!
    author_id: String
    created_at: DateTime!
    
    # Graph traversal fields
    linkedBlocks: [Block!]!
    relatedItems(similarity: Float = 0.7): [ContextItem!]!
  }

  type GitHubEntity {
    id: ID!
    project_id: ID!
    provider_type: String!
    provider_id: String!
    url: String
    title: String
    status: String
    metadata: JSON
    created_at: DateTime!
    
    # Graph traversal fields
    relatedBlocks: [Block!]!
    relatedEntities: [GitHubEntity!]!
  }

  type BlockRelation {
    id: ID!
    from_block_id: ID!
    to_block_id: ID!
    relation_type: String!
    created_at: DateTime!
    from_block: Block!
    to_block: Block!
  }

  type BlockConnection {
    path: [Block!]!
    distance: Int!
    relationTypes: [String!]!
  }

  type RelationExploration {
    starting_block: Block!
    connected_blocks: [BlockConnection!]!
    total_connections: Int!
    max_depth_reached: Int!
  }

  type ContextSearchResult {
    query: String!
    results: [ContextSearchItem!]!
    total_results: Int!
    processing_time: Float!
  }

  type ContextSearchItem {
    id: ID!
    type: String!
    title: String
    content: String!
    relevance_score: Float!
    source: String!
    created_at: DateTime!
    highlight: String
  }

  type ProjectStats {
    total_blocks: Int!
    blocks_by_status: JSON!
    blocks_by_lane: JSON!
    blocks_by_priority: JSON!
    total_context_items: Int!
    context_by_type: JSON!
    total_github_entities: Int!
    github_by_type: JSON!
    completion_percentage: Float!
    activity_last_7_days: Int!
  }

  enum BlockLane {
    vision
    goals
    current
    next
    context
  }

  enum BlockStatus {
    not_started
    in_progress
    completed
    blocked
    cancelled
  }

  enum BlockPriority {
    low
    medium
    high
    urgent
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    async project(parent: any, { id }: { id: string }, { db }: { db: Database }) {
      const project = await db.getProject(id);
      if (!project) {
        throw new Error(`Project ${id} not found`);
      }
      return project;
    },

    async projectGraph(parent: any, { id }: { id: string }, { db }: { db: Database }) {
      return await db.getProjectGraph(id);
    },

    async exploreRelations(
      parent: any,
      { projectId, startingBlockId, maxDepth = 3, relationTypes }: {
        projectId: string;
        startingBlockId?: string;
        maxDepth?: number;
        relationTypes?: string[];
      },
      { db }: { db: Database }
    ) {
      return await exploreBlockRelations(db, projectId, startingBlockId, maxDepth, relationTypes);
    },

    async findConnectedBlocks(
      parent: any,
      { projectId, blockIds, maxDegrees = 2 }: {
        projectId: string;
        blockIds: string[];
        maxDegrees?: number;
      },
      { db }: { db: Database }
    ) {
      return await findBlockConnections(db, projectId, blockIds, maxDegrees);
    },

    async contextSearch(
      parent: any,
      { projectId, query, maxResults = 10, includeBlocks = true, includeContext = true }: {
        projectId: string;
        query: string;
        maxResults?: number;
        includeBlocks?: boolean;
        includeContext?: boolean;
      },
      { db, contextService }: { db: Database; contextService: ContextService }
    ) {
      const startTime = Date.now();
      
      const preview = await contextService.generateContextPreview(projectId, {
        maxTokens: maxResults * 200,
        includeBlocks,
        includeContext,
        userQuery: query
      });

      const processingTime = (Date.now() - startTime) / 1000;

      return {
        query,
        results: preview.preview.slice(0, maxResults).map(item => ({
          ...item,
          relevance_score: item.score,
          highlight: generateHighlight(item.content, query)
        })),
        total_results: preview.total_items,
        processing_time: processingTime
      };
    }
  },

  Project: {
    async blocks(project: any, args: any, { db }: { db: Database }) {
      return await db.getBlocksByProject(project.id);
    },

    async contextItems(project: any, args: any, { db }: { db: Database }) {
      return await db.getContextItemsByProject(project.id);
    },

    async githubEntities(project: any, args: any, { db }: { db: Database }) {
      return await db.getGitHubEntitiesByProject(project.id);
    },

    async stats(project: any, args: any, { db }: { db: Database }) {
      return await generateProjectStats(db, project.id);
    }
  },

  Block: {
    async relatedBlocks(block: any, { maxDepth = 1 }: { maxDepth?: number }, { db }: { db: Database }) {
      return await findRelatedBlocks(db, block.id, maxDepth);
    },

    async contextItems(block: any, args: any, { db }: { db: Database }) {
      // Find context items linked to this block
      const result = await db.query(`
        SELECT ci.* FROM context_items ci
        INNER JOIN context_links cl ON cl.context_id = ci.id
        WHERE cl.block_id = $1
        ORDER BY ci.created_at DESC
      `, [block.id]);
      return result.rows;
    },

    async dependencies(block: any, args: any, { db }: { db: Database }) {
      const result = await db.query(`
        SELECT b.* FROM blocks b
        INNER JOIN block_relations br ON br.from_block_id = b.id
        WHERE br.to_block_id = $1 AND br.relation_type = 'depends_on'
      `, [block.id]);
      return result.rows;
    },

    async dependents(block: any, args: any, { db }: { db: Database }) {
      const result = await db.query(`
        SELECT b.* FROM blocks b
        INNER JOIN block_relations br ON br.to_block_id = b.id
        WHERE br.from_block_id = $1 AND br.relation_type = 'depends_on'
      `, [block.id]);
      return result.rows;
    }
  },

  ContextItem: {
    async linkedBlocks(contextItem: any, args: any, { db }: { db: Database }) {
      const result = await db.query(`
        SELECT b.* FROM blocks b
        INNER JOIN context_links cl ON cl.block_id = b.id
        WHERE cl.context_id = $1
      `, [contextItem.id]);
      return result.rows;
    },

    async relatedItems(contextItem: any, { similarity = 0.7 }: { similarity?: number }, { db }: { db: Database }) {
      // Use semantic search if available, otherwise fallback to keyword matching
      try {
        const result = await db.query(`
          SELECT *, (embedding <#> $2::vector) AS distance
          FROM context_items
          WHERE project_id = $1 AND id != $3 AND embedding IS NOT NULL
          ORDER BY embedding <#> $2::vector
          LIMIT 10
        `, [contextItem.project_id, JSON.stringify(contextItem.embedding || []), contextItem.id]);
        
        return result.rows.filter((item: any) => (1 - item.distance) >= similarity);
      } catch (error) {
        // Fallback to keyword matching
        const result = await db.query(`
          SELECT * FROM context_items
          WHERE project_id = $1 AND id != $2
          AND (content ILIKE '%' || $3 || '%' OR title ILIKE '%' || $3 || '%')
          ORDER BY created_at DESC
          LIMIT 5
        `, [contextItem.project_id, contextItem.id, contextItem.title?.slice(0, 50) || '']);
        return result.rows;
      }
    }
  }
};

// Helper functions for complex graph operations
async function exploreBlockRelations(
  db: Database,
  projectId: string,
  startingBlockId?: string,
  maxDepth: number = 3,
  relationTypes?: string[]
): Promise<any> {
  // If no starting block specified, use the most recently worked block
  let startBlock;
  if (startingBlockId) {
    startBlock = await db.getBlock(startingBlockId);
  } else {
    const result = await db.query(`
      SELECT * FROM blocks
      WHERE project_id = $1 AND last_worked_at IS NOT NULL
      ORDER BY last_worked_at DESC
      LIMIT 1
    `, [projectId]);
    startBlock = result.rows[0];
  }

  if (!startBlock) {
    throw new Error('No starting block found');
  }

  const connections = await findBlockConnections(db, projectId, [startBlock.id], maxDepth);
  
  return {
    starting_block: startBlock,
    connected_blocks: connections,
    total_connections: connections.length,
    max_depth_reached: Math.max(...connections.map(c => c.distance))
  };
}

async function findBlockConnections(
  db: Database,
  projectId: string,
  startingBlockIds: string[],
  maxDegrees: number
): Promise<any[]> {
  const connections: any[] = [];
  const visited = new Set<string>();
  const queue: { blockId: string; path: string[]; distance: number }[] = [];

  // Initialize queue with starting blocks
  for (const blockId of startingBlockIds) {
    queue.push({ blockId, path: [blockId], distance: 0 });
    visited.add(blockId);
  }

  while (queue.length > 0 && maxDegrees > 0) {
    const { blockId, path, distance } = queue.shift()!;

    if (distance >= maxDegrees) continue;

    // Find directly connected blocks
    const result = await db.query(`
      SELECT br.*, b_from.title as from_title, b_to.title as to_title
      FROM block_relations br
      INNER JOIN blocks b_from ON br.from_block_id = b_from.id
      INNER JOIN blocks b_to ON br.to_block_id = b_to.id
      WHERE (br.from_block_id = $1 OR br.to_block_id = $1)
      AND (b_from.project_id = $2 OR b_to.project_id = $2)
    `, [blockId, projectId]);

    for (const relation of result.rows) {
      const nextBlockId = relation.from_block_id === blockId 
        ? relation.to_block_id 
        : relation.from_block_id;

      if (!visited.has(nextBlockId)) {
        visited.add(nextBlockId);
        const newPath = [...path, nextBlockId];
        
        connections.push({
          path: await getBlocksForPath(db, newPath),
          distance: distance + 1,
          relationTypes: [relation.relation_type]
        });

        queue.push({
          blockId: nextBlockId,
          path: newPath,
          distance: distance + 1
        });
      }
    }
  }

  return connections;
}

async function getBlocksForPath(db: Database, blockIds: string[]): Promise<any[]> {
  if (blockIds.length === 0) return [];
  
  const placeholders = blockIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await db.query(`
    SELECT * FROM blocks WHERE id IN (${placeholders})
  `, blockIds);
  
  // Maintain order
  const blockMap = new Map(result.rows.map((block: any) => [block.id, block]));
  return blockIds.map(id => blockMap.get(id)).filter(Boolean);
}

async function findRelatedBlocks(db: Database, blockId: string, maxDepth: number): Promise<any[]> {
  const result = await db.query(`
    SELECT br.*, b.*
    FROM block_relations br
    INNER JOIN blocks b ON (
      CASE 
        WHEN br.from_block_id = $1 THEN br.to_block_id = b.id
        ELSE br.from_block_id = b.id
      END
    )
    WHERE br.from_block_id = $1 OR br.to_block_id = $1
    LIMIT 20
  `, [blockId]);

  return result.rows.map((row: any) => ({
    path: [row],
    distance: 1,
    relationTypes: [row.relation_type]
  }));
}

async function generateProjectStats(db: Database, projectId: string): Promise<any> {
  const [blocksResult, contextResult, githubResult] = await Promise.all([
    db.query('SELECT status, lane, priority FROM blocks WHERE project_id = $1', [projectId]),
    db.query('SELECT type FROM context_items WHERE project_id = $1', [projectId]),
    db.query('SELECT provider_type FROM github_entities WHERE project_id = $1', [projectId])
  ]);

  const blocks = blocksResult.rows;
  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter((b: any) => b.status === 'completed').length;

  const blocksByStatus = blocks.reduce((acc: any, block: any) => {
    acc[block.status] = (acc[block.status] || 0) + 1;
    return acc;
  }, {});

  const blocksByLane = blocks.reduce((acc: any, block: any) => {
    acc[block.lane] = (acc[block.lane] || 0) + 1;
    return acc;
  }, {});

  const blocksByPriority = blocks.reduce((acc: any, block: any) => {
    acc[block.priority] = (acc[block.priority] || 0) + 1;
    return acc;
  }, {});

  const contextByType = contextResult.rows.reduce((acc: any, item: any) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  const githubByType = githubResult.rows.reduce((acc: any, entity: any) => {
    acc[entity.provider_type] = (acc[entity.provider_type] || 0) + 1;
    return acc;
  }, {});

  // Calculate activity in last 7 days
  const activityResult = await db.query(`
    SELECT COUNT(*) as count FROM events 
    WHERE project_id = $1 AND created_at > NOW() - INTERVAL '7 days'
  `, [projectId]);

  return {
    total_blocks: totalBlocks,
    blocks_by_status: blocksByStatus,
    blocks_by_lane: blocksByLane,
    blocks_by_priority: blocksByPriority,
    total_context_items: contextResult.rows.length,
    context_by_type: contextByType,
    total_github_entities: githubResult.rows.length,
    github_by_type: githubByType,
    completion_percentage: totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0,
    activity_last_7_days: parseInt(activityResult.rows[0].count)
  };
}

function generateHighlight(content: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  let highlighted = content;
  
  for (const word of words) {
    if (word.length > 2) {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
  }
  
  return highlighted.slice(0, 200) + (highlighted.length > 200 ? '...' : '');
}

interface GraphQLContext extends BaseContext {
  db: Database;
  contextService: ContextService;
  user?: string;
}

export class GraphQLServer {
  private server: ApolloServer<GraphQLContext>;
  private db: Database;
  private contextService: ContextService;

  constructor(db: Database, contextService: ContextService) {
    this.db = db;
    this.contextService = contextService;
    
    this.server = new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers,
    });
  }

  async startStandalone(port: number = 4001): Promise<void> {
    const { url } = await startStandaloneServer(this.server, {
      listen: { port },
      context: async ({ req }: { req: any }) => ({
        db: this.db,
        contextService: this.contextService,
        user: req.headers.authorization // Add auth context as needed
      })
    });

    console.log(`🚀 GraphQL server ready at ${url}`);
  }

  // For integration with Express (simplified approach)
  async start(app: any, httpServer: any): Promise<void> {
    // For now, we'll use a simple GraphQL endpoint without full Express integration
    // In production, you'd want to use expressMiddleware properly
    console.log('🚀 GraphQL server configured (use standalone mode for full functionality)');
  }
}