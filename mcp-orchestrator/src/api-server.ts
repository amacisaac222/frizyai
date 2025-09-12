import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.js';
import { ContextService } from './context-service.js';
import { GraphQLServer } from './graphql-server.js';
import { ApiResponse } from './types.js';

export class APIServer {
  private app: express.Application;
  private httpServer: http.Server;
  private db: Database;
  private contextService: ContextService;
  private graphqlServer: GraphQLServer;

  constructor(database: Database, contextService: ContextService) {
    this.db = database;
    this.contextService = contextService;
    this.graphqlServer = new GraphQLServer(database, contextService);
    this.app = express();
    this.httpServer = http.createServer(this.app);
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

    // GitHub webhook handler with signature verification
    this.app.post('/api/webhooks/github', async (req, res) => {
      try {
        const payload = req.body;
        const event = req.headers['x-github-event'] as string;
        const signature = req.headers['x-hub-signature-256'] as string;
        const delivery = req.headers['x-github-delivery'] as string;
        
        if (!event) {
          return res.status(400).json({
            success: false,
            error: 'Missing GitHub event header'
          } as ApiResponse);
        }

        // Verify webhook signature if secret is configured
        if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
          const isValid = this.verifyGitHubSignature(
            JSON.stringify(payload),
            signature,
            process.env.GITHUB_WEBHOOK_SECRET
          );
          
          if (!isValid) {
            console.warn(`Invalid GitHub webhook signature for delivery: ${delivery}`);
            return res.status(401).json({
              success: false,
              error: 'Invalid webhook signature'
            } as ApiResponse);
          }
        }

        // Process GitHub webhook
        const result = await this.processGitHubWebhook(event, payload);
        
        if (result.processed) {
          console.log(`✅ Processed GitHub ${event} event: ${result.message}`);
        } else {
          console.log(`ℹ️  Ignored GitHub ${event} event: ${result.message}`);
        }
        
        res.json({
          success: true,
          message: result.message,
          processed: result.processed
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

  private verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const actualSignature = signature.slice(7); // Remove 'sha256=' prefix
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    );
  }

  private async processGitHubWebhook(event: string, payload: any): Promise<{processed: boolean, message: string}> {
    // Extract project_id from webhook payload or configuration
    let projectId = payload.repository?.name || 'default-project';
    
    // In production, you'd have a mapping from repository to project ID
    if (process.env.REPO_PROJECT_MAPPING) {
      try {
        const mapping = JSON.parse(process.env.REPO_PROJECT_MAPPING);
        projectId = mapping[payload.repository?.full_name] || projectId;
      } catch (error) {
        console.warn('Invalid REPO_PROJECT_MAPPING configuration:', error);
      }
    }
    
    let eventType = '';
    let eventPayload = {};
    let message = '';

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
            author: payload.pull_request.user.login,
            branch: payload.pull_request.head.ref,
            base_branch: payload.pull_request.base.ref,
            draft: payload.pull_request.draft
          };
          message = `PR #${payload.pull_request.number} opened: ${payload.pull_request.title}`;
        } else if (payload.action === 'closed' && payload.pull_request.merged) {
          eventType = 'github.pr.merged';
          eventPayload = {
            provider_type: 'pr',
            provider_id: payload.pull_request.number.toString(),
            url: payload.pull_request.html_url,
            title: payload.pull_request.title,
            status: 'merged',
            author: payload.pull_request.user.login,
            merged_by: payload.pull_request.merged_by?.login,
            branch: payload.pull_request.head.ref,
            base_branch: payload.pull_request.base.ref
          };
          message = `PR #${payload.pull_request.number} merged: ${payload.pull_request.title}`;
        } else if (payload.action === 'closed' && !payload.pull_request.merged) {
          eventType = 'github.pr.closed';
          eventPayload = {
            provider_type: 'pr',
            provider_id: payload.pull_request.number.toString(),
            url: payload.pull_request.html_url,
            title: payload.pull_request.title,
            status: 'closed',
            author: payload.pull_request.user.login,
            branch: payload.pull_request.head.ref
          };
          message = `PR #${payload.pull_request.number} closed: ${payload.pull_request.title}`;
        } else {
          return { processed: false, message: `Ignored PR action: ${payload.action}` };
        }
        break;
        
      case 'push':
        // Skip branch deletions and empty pushes
        if (payload.deleted || !payload.commits || payload.commits.length === 0) {
          return { processed: false, message: 'Skipped empty or deletion push' };
        }
        
        eventType = 'github.commit.pushed';
        eventPayload = {
          provider_type: 'commit',
          provider_id: payload.after,
          url: payload.compare,
          title: payload.head_commit?.message?.split('\n')[0] || 'Commit pushed',
          status: 'pushed',
          author: payload.head_commit?.author?.name,
          commits: payload.commits.length,
          branch: payload.ref.replace('refs/heads/', ''),
          repository: payload.repository.full_name
        };
        message = `${payload.commits.length} commit(s) pushed to ${payload.ref.replace('refs/heads/', '')}`;
        break;

      case 'issues':
        if (['opened', 'closed', 'reopened'].includes(payload.action)) {
          eventType = `github.issue.${payload.action}`;
          eventPayload = {
            provider_type: 'issue',
            provider_id: payload.issue.number.toString(),
            url: payload.issue.html_url,
            title: payload.issue.title,
            status: payload.issue.state,
            author: payload.issue.user.login,
            labels: payload.issue.labels.map((l: any) => l.name),
            assignees: payload.issue.assignees.map((a: any) => a.login)
          };
          message = `Issue #${payload.issue.number} ${payload.action}: ${payload.issue.title}`;
        } else {
          return { processed: false, message: `Ignored issue action: ${payload.action}` };
        }
        break;

      case 'release':
        if (payload.action === 'published') {
          eventType = 'github.release.published';
          eventPayload = {
            provider_type: 'release',
            provider_id: payload.release.id.toString(),
            url: payload.release.html_url,
            title: payload.release.name || payload.release.tag_name,
            status: 'published',
            author: payload.release.author.login,
            tag: payload.release.tag_name,
            prerelease: payload.release.prerelease,
            draft: payload.release.draft
          };
          message = `Release ${payload.release.tag_name} published`;
        } else {
          return { processed: false, message: `Ignored release action: ${payload.action}` };
        }
        break;

      case 'issue_comment':
        if (payload.action === 'created' && payload.issue.pull_request) {
          // PR comment
          eventType = 'github.pr.commented';
          eventPayload = {
            provider_type: 'pr_comment',
            provider_id: payload.comment.id.toString(),
            url: payload.comment.html_url,
            title: `Comment on PR #${payload.issue.number}`,
            status: 'created',
            author: payload.comment.user.login,
            pr_number: payload.issue.number,
            body: payload.comment.body.slice(0, 500) // Truncate long comments
          };
          message = `Comment added to PR #${payload.issue.number}`;
        } else {
          return { processed: false, message: `Ignored comment action: ${payload.action}` };
        }
        break;

      default:
        return { processed: false, message: `Unsupported event type: ${event}` };
    }

    if (eventType) {
      await this.db.createEvent({
        project_id: projectId,
        type: eventType as any,
        payload: eventPayload
      });
      
      return { processed: true, message };
    }

    return { processed: false, message: 'No event created' };
  }

  async start(port: number = 4000): Promise<void> {
    // Start GraphQL server
    await this.graphqlServer.start(this.app, this.httpServer);
    
    return new Promise((resolve) => {
      this.httpServer.listen(port, () => {
        console.log(`🚀 Frizy API Server listening on port ${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`🔗 MCP integration ready`);
        console.log(`📈 GraphQL playground: http://localhost:${port}/graphql`);
        resolve();
      });
    });
  }
}