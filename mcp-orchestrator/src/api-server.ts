import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.js';
import { ContextService } from './context-service.js';
import { ApiResponse } from './types.js';

export class APIServer {
  private app: express.Application;
  private db: Database;
  private contextService: ContextService;

  constructor(database: Database, contextService: ContextService) {
    this.db = database;
    this.contextService = contextService;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5182'],
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Basic request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      const dbHealthy = await this.db.healthCheck();
      res.json({
        status: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: dbHealthy ? 'connected' : 'disconnected'
      });
    });

    // Event ingestion endpoint
    this.app.post('/api/events', async (req, res) => {
      try {
        const { project_id, type, actor_id, payload } = req.body;
        
        if (!project_id || !type) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: project_id, type'
          } as ApiResponse);
        }

        const event = await this.db.createEvent({
          project_id,
          type,
          actor_id,
          payload: payload || {}
        });

        res.status(201).json({
          success: true,
          event_id: event.id,
          data: event
        } as ApiResponse);

      } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        } as ApiResponse);
      }
    });

    // Get project graph
    this.app.get('/api/projects/:projectId/graph', async (req, res) => {
      try {
        const { projectId } = req.params;
        const graph = await this.db.getProjectGraph(projectId);
        
        res.json({
          success: true,
          data: graph
        } as ApiResponse);

      } catch (error) {
        console.error('Error fetching project graph:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch project graph'
        } as ApiResponse);
      }
    });

    // Get context preview
    this.app.get('/api/projects/:projectId/context-preview', async (req, res) => {
      try {
        const { projectId } = req.params;
        const { 
          max_tokens = '4000', 
          user_query,
          include_blocks = 'true',
          include_context = 'true',
          include_github = 'true'
        } = req.query;

        const contextPreview = await this.contextService.generateContextPreview(projectId, {
          maxTokens: parseInt(max_tokens as string),
          userQuery: user_query as string,
          includeBlocks: include_blocks === 'true',
          includeContext: include_context === 'true',
          includeGitHub: include_github === 'true'
        });

        res.json({
          success: true,
          data: contextPreview
        } as ApiResponse);

      } catch (error) {
        console.error('Error generating context preview:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate context preview'
        } as ApiResponse);
      }
    });

    // MCP connection management
    this.app.post('/api/mcp/connections', async (req, res) => {
      try {
        const { project_id, user_id } = req.body;
        
        if (!project_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing project_id'
          } as ApiResponse);
        }

        // Generate connection info for Claude Code
        const connectionInfo = {
          project_id,
          connection_string: this.generateMCPConnectionString(project_id),
          api_key: this.generateAPIKey(),
          created_at: new Date().toISOString()
        };

        // Store connection info (in a real implementation, you'd save this)
        // For now, just return it
        res.json({
          success: true,
          data: connectionInfo
        } as ApiResponse);

      } catch (error) {
        console.error('Error creating MCP connection:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create MCP connection'
        } as ApiResponse);
      }
    });

    // GitHub webhook handler
    this.app.post('/api/webhooks/github', async (req, res) => {
      try {
        const payload = req.body;
        const event = req.headers['x-github-event'] as string;
        
        if (!event) {
          return res.status(400).json({
            success: false,
            error: 'Missing GitHub event header'
          } as ApiResponse);
        }

        // Process GitHub webhook
        await this.processGitHubWebhook(event, payload);
        
        res.json({
          success: true,
          message: 'Webhook processed successfully'
        } as ApiResponse);

      } catch (error) {
        console.error('Error processing GitHub webhook:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process webhook'
        } as ApiResponse);
      }
    });

    // Get project events
    this.app.get('/api/projects/:projectId/events', async (req, res) => {
      try {
        const { projectId } = req.params;
        const { limit = '100' } = req.query;
        
        const events = await this.db.getEventsByProject(projectId, parseInt(limit as string));
        
        res.json({
          success: true,
          data: events
        } as ApiResponse);

      } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch events'
        } as ApiResponse);
      }
    });

    // Get project blocks
    this.app.get('/api/projects/:projectId/blocks', async (req, res) => {
      try {
        const { projectId } = req.params;
        const blocks = await this.db.getBlocksByProject(projectId);
        
        res.json({
          success: true,
          data: blocks
        } as ApiResponse);

      } catch (error) {
        console.error('Error fetching blocks:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch blocks'
        } as ApiResponse);
      }
    });

    // Error handling middleware
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`
      } as ApiResponse);
    });
  }

  private generateMCPConnectionString(projectId: string): string {
    // In a real implementation, this would be a proper MCP connection string
    // For now, return a placeholder that includes the server endpoint
    const serverUrl = process.env.MCP_SERVER_URL || 'stdio://frizy-mcp-server';
    return `${serverUrl}?project_id=${projectId}`;
  }

  private generateAPIKey(): string {
    // In a real implementation, use a proper API key generation system
    return `frizy_${uuidv4().replace(/-/g, '')}`;
  }

  private async processGitHubWebhook(event: string, payload: any) {
    // Extract project_id from webhook payload (you'd configure this in GitHub webhook)
    const projectId = payload.repository?.name || 'default-project';
    
    let eventType = '';
    let eventPayload = {};

    switch (event) {
      case 'pull_request':
        if (payload.action === 'opened') {
          eventType = 'github.pr.opened';
          eventPayload = {
            provider_type: 'pr',
            provider_id: payload.pull_request.number.toString(),
            url: payload.pull_request.html_url,
            title: payload.pull_request.title,
            status: 'open',
            author: payload.pull_request.user.login
          };
        } else if (payload.action === 'closed' && payload.pull_request.merged) {
          eventType = 'github.pr.merged';
          eventPayload = {
            provider_type: 'pr',
            provider_id: payload.pull_request.number.toString(),
            url: payload.pull_request.html_url,
            title: payload.pull_request.title,
            status: 'merged',
            author: payload.pull_request.user.login
          };
        }
        break;
        
      case 'push':
        eventType = 'github.commit.pushed';
        eventPayload = {
          provider_type: 'commit',
          provider_id: payload.after,
          url: payload.compare,
          title: payload.head_commit?.message || 'Commit pushed',
          status: 'pushed',
          author: payload.head_commit?.author?.name,
          commits: payload.commits.length
        };
        break;
    }

    if (eventType) {
      await this.db.createEvent({
        project_id: projectId, // You'd map this properly from the webhook
        type: eventType as any,
        payload: eventPayload
      });
    }
  }

  start(port: number = 4000): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 Frizy API Server listening on port ${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`🔗 MCP integration ready`);
        resolve();
      });
    });
  }
}