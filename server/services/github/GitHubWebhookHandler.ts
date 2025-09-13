import { EventEmitter } from 'events';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

interface GitHubWebhookEvent {
  id: string;
  name: string;
  payload: any;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender?: {
    login: string;
    id: number;
  };
}

interface ProcessedGitHubEvent {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  repository: string;
  actor: string;
  summary: string;
  data: any;
  impact: 'low' | 'medium' | 'high';
  category: 'code' | 'review' | 'issue' | 'deployment' | 'other';
}

export class GitHubWebhookHandler extends EventEmitter {
  private octokit: Octokit;
  private webhookSecret: string;
  private eventQueue: ProcessedGitHubEvent[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private githubToken: string,
    webhookSecret?: string
  ) {
    super();
    this.webhookSecret = webhookSecret || process.env.GITHUB_WEBHOOK_SECRET || '';
    this.octokit = new Octokit({ auth: githubToken });
    this.startProcessing();
  }

  private startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 3000); // Process every 3 seconds
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('No webhook secret configured, skipping verification');
      return true;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    // Constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  async handleWebhook(
    eventName: string,
    payload: any,
    deliveryId: string
  ): Promise<ProcessedGitHubEvent> {
    const event: GitHubWebhookEvent = {
      id: deliveryId,
      name: eventName,
      payload
    };

    const processed = this.processGitHubEvent(event);
    
    // Add to queue for batch processing
    this.eventQueue.push(processed);
    
    // Emit for real-time processing
    this.emit('githubEvent', processed);
    
    // Trigger MCP integration if applicable
    if (this.shouldTriggerMCP(processed)) {
      this.emit('mcpTrigger', {
        source: 'github',
        event: processed
      });
    }

    return processed;
  }

  private processGitHubEvent(event: GitHubWebhookEvent): ProcessedGitHubEvent {
    const { name, payload } = event;
    const timestamp = new Date().toISOString();
    
    let type = name;
    let action = payload.action || 'unknown';
    let summary = '';
    let impact: ProcessedGitHubEvent['impact'] = 'low';
    let category: ProcessedGitHubEvent['category'] = 'other';
    
    // Process based on event type
    switch (name) {
      case 'push':
        type = 'push';
        action = 'code_pushed';
        summary = `${payload.pusher?.name || 'Unknown'} pushed ${payload.commits?.length || 0} commits to ${payload.ref}`;
        impact = 'high';
        category = 'code';
        break;
        
      case 'pull_request':
        type = 'pull_request';
        action = payload.action;
        summary = `PR #${payload.pull_request?.number}: ${payload.action} by ${payload.sender?.login}`;
        impact = payload.action === 'opened' || payload.action === 'merged' ? 'high' : 'medium';
        category = 'review';
        break;
        
      case 'pull_request_review':
        type = 'pr_review';
        action = payload.action;
        summary = `Review on PR #${payload.pull_request?.number}: ${payload.review?.state} by ${payload.review?.user?.login}`;
        impact = 'medium';
        category = 'review';
        break;
        
      case 'issues':
        type = 'issue';
        action = payload.action;
        summary = `Issue #${payload.issue?.number}: ${payload.action} by ${payload.sender?.login}`;
        impact = payload.action === 'opened' ? 'medium' : 'low';
        category = 'issue';
        break;
        
      case 'issue_comment':
        type = 'comment';
        action = 'commented';
        summary = `Comment on #${payload.issue?.number} by ${payload.comment?.user?.login}`;
        impact = 'low';
        category = 'issue';
        break;
        
      case 'create':
        type = 'create';
        action = `${payload.ref_type}_created`;
        summary = `Created ${payload.ref_type} ${payload.ref} by ${payload.sender?.login}`;
        impact = payload.ref_type === 'branch' ? 'medium' : 'low';
        category = 'code';
        break;
        
      case 'delete':
        type = 'delete';
        action = `${payload.ref_type}_deleted`;
        summary = `Deleted ${payload.ref_type} ${payload.ref} by ${payload.sender?.login}`;
        impact = 'medium';
        category = 'code';
        break;
        
      case 'deployment':
        type = 'deployment';
        action = 'deployed';
        summary = `Deployment to ${payload.deployment?.environment} by ${payload.sender?.login}`;
        impact = 'high';
        category = 'deployment';
        break;
        
      case 'deployment_status':
        type = 'deployment_status';
        action = payload.deployment_status?.state;
        summary = `Deployment ${payload.deployment_status?.state} in ${payload.deployment?.environment}`;
        impact = payload.deployment_status?.state === 'failure' ? 'high' : 'medium';
        category = 'deployment';
        break;
        
      case 'workflow_run':
        type = 'workflow';
        action = payload.action;
        summary = `Workflow ${payload.workflow_run?.name}: ${payload.workflow_run?.conclusion}`;
        impact = payload.workflow_run?.conclusion === 'failure' ? 'high' : 'low';
        category = 'deployment';
        break;
    }
    
    return {
      id: event.id,
      timestamp,
      type,
      action,
      repository: payload.repository?.full_name || 'unknown',
      actor: payload.sender?.login || 'unknown',
      summary,
      data: this.extractRelevantData(name, payload),
      impact,
      category
    };
  }

  private extractRelevantData(eventName: string, payload: any): any {
    // Extract only relevant data to minimize storage
    const data: any = {};
    
    switch (eventName) {
      case 'push':
        data.ref = payload.ref;
        data.commits = payload.commits?.map((c: any) => ({
          id: c.id.substring(0, 7),
          message: c.message.split('\n')[0],
          author: c.author?.username
        }));
        data.compare = payload.compare;
        break;
        
      case 'pull_request':
        data.number = payload.pull_request?.number;
        data.title = payload.pull_request?.title;
        data.state = payload.pull_request?.state;
        data.merged = payload.pull_request?.merged;
        data.additions = payload.pull_request?.additions;
        data.deletions = payload.pull_request?.deletions;
        data.changed_files = payload.pull_request?.changed_files;
        break;
        
      case 'issues':
        data.number = payload.issue?.number;
        data.title = payload.issue?.title;
        data.state = payload.issue?.state;
        data.labels = payload.issue?.labels?.map((l: any) => l.name);
        break;
        
      case 'workflow_run':
        data.name = payload.workflow_run?.name;
        data.conclusion = payload.workflow_run?.conclusion;
        data.status = payload.workflow_run?.status;
        data.run_number = payload.workflow_run?.run_number;
        break;
    }
    
    return data;
  }

  private shouldTriggerMCP(event: ProcessedGitHubEvent): boolean {
    // Determine if this event should trigger MCP processing
    return (
      event.impact === 'high' ||
      event.type === 'push' ||
      event.type === 'pull_request' ||
      (event.type === 'workflow' && event.data.conclusion === 'failure')
    );
  }

  private async processQueue() {
    if (this.eventQueue.length === 0) return;
    
    const batch = this.eventQueue.splice(0, 5);
    
    // Group by repository for efficient processing
    const repoGroups = new Map<string, ProcessedGitHubEvent[]>();
    for (const event of batch) {
      if (!repoGroups.has(event.repository)) {
        repoGroups.set(event.repository, []);
      }
      repoGroups.get(event.repository)!.push(event);
    }
    
    // Process each repository group
    for (const [repo, events] of repoGroups) {
      await this.aggregateRepositoryEvents(repo, events);
    }
  }

  private async aggregateRepositoryEvents(
    repository: string,
    events: ProcessedGitHubEvent[]
  ) {
    // Aggregate events by category
    const categories = new Map<string, ProcessedGitHubEvent[]>();
    
    for (const event of events) {
      if (!categories.has(event.category)) {
        categories.set(event.category, []);
      }
      categories.get(event.category)!.push(event);
    }
    
    // Create aggregated summaries
    const aggregated = {
      repository,
      timestamp: new Date().toISOString(),
      categories: {} as Record<string, any>,
      totalEvents: events.length,
      highImpactEvents: events.filter(e => e.impact === 'high').length
    };
    
    for (const [category, catEvents] of categories) {
      aggregated.categories[category] = {
        count: catEvents.length,
        events: catEvents.map(e => ({
          id: e.id,
          type: e.type,
          summary: e.summary,
          impact: e.impact
        }))
      };
    }
    
    this.emit('repositoryAggregate', aggregated);
  }

  // Repository polling methods
  async pollRepository(owner: string, repo: string, since?: Date) {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    
    try {
      // Fetch recent commits
      const commits = await this.octokit.repos.listCommits({
        owner,
        repo,
        since: sinceDate.toISOString(),
        per_page: 100
      });
      
      for (const commit of commits.data) {
        const event: ProcessedGitHubEvent = {
          id: commit.sha,
          timestamp: commit.commit.author?.date || new Date().toISOString(),
          type: 'commit',
          action: 'committed',
          repository: `${owner}/${repo}`,
          actor: commit.author?.login || commit.commit.author?.name || 'unknown',
          summary: commit.commit.message.split('\n')[0],
          data: {
            sha: commit.sha.substring(0, 7),
            message: commit.commit.message,
            stats: commit.stats,
            files: commit.files?.length
          },
          impact: 'medium',
          category: 'code'
        };
        
        this.emit('githubEvent', event);
      }
      
      // Fetch recent pull requests
      const pulls = await this.octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 50
      });
      
      for (const pr of pulls.data) {
        if (new Date(pr.updated_at) > sinceDate) {
          const event: ProcessedGitHubEvent = {
            id: `pr-${pr.id}`,
            timestamp: pr.updated_at,
            type: 'pull_request',
            action: pr.state,
            repository: `${owner}/${repo}`,
            actor: pr.user?.login || 'unknown',
            summary: `PR #${pr.number}: ${pr.title}`,
            data: {
              number: pr.number,
              title: pr.title,
              state: pr.state,
              merged: pr.merged_at ? true : false
            },
            impact: pr.state === 'open' ? 'medium' : 'low',
            category: 'review'
          };
          
          this.emit('githubEvent', event);
        }
      }
      
      console.log(`Polled ${owner}/${repo}: ${commits.data.length} commits, ${pulls.data.length} PRs`);
    } catch (error) {
      console.error(`Error polling repository ${owner}/${repo}:`, error);
    }
  }

  // Analytics methods
  async getEventStats(repository?: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCategory: Record<string, number>;
    highImpactEvents: number;
    recentActivity: ProcessedGitHubEvent[];
  }> {
    // This would typically query from a database
    // For now, return mock stats
    return {
      totalEvents: this.eventQueue.length,
      eventsByType: {},
      eventsByCategory: {},
      highImpactEvents: this.eventQueue.filter(e => e.impact === 'high').length,
      recentActivity: this.eventQueue.slice(-10)
    };
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}