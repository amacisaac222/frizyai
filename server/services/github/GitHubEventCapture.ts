// GitHub Event Capture Service for Frizy.ai
// Captures and processes GitHub events to build development context

import { Octokit } from '@octokit/rest';
import { EventEmitter } from 'events';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  webhookSecret?: string;
}

export interface CodeChangeEvent {
  id: string;
  timestamp: string;
  type: 'commit' | 'push' | 'pull_request' | 'branch_create' | 'branch_delete';
  repository: string;
  branch: string;
  author: {
    login: string;
    email?: string;
  };
  changes: {
    files: FileChange[];
    summary: string;
    stats: {
      additions: number;
      deletions: number;
      filesChanged: number;
    };
  };
  metadata: {
    sha: string;
    message: string;
    parentSha?: string;
    prNumber?: number;
  };
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  previousPath?: string; // For renamed files
}

export interface IssueEvent {
  id: string;
  timestamp: string;
  type: 'issue_created' | 'issue_closed' | 'issue_comment' | 'issue_labeled';
  number: number;
  title: string;
  body: string;
  author: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  linkedPRs?: number[];
  claudeContext?: string; // Reference to Claude conversation
}

export interface PREvent {
  id: string;
  timestamp: string;
  type: 'pr_opened' | 'pr_merged' | 'pr_closed' | 'pr_review' | 'pr_comment';
  number: number;
  title: string;
  description: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  reviewers: string[];
  approvals: number;
  requestedChanges: number;
  commits: string[];
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface WorkflowEvent {
  id: string;
  timestamp: string;
  type: 'workflow_run' | 'check_run' | 'deployment';
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  duration?: number;
  triggeredBy: string;
  logs?: string;
  artifacts?: string[];
}

export class GitHubEventCapture extends EventEmitter {
  private octokit: Octokit;
  private config: GitHubConfig;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedSha: string | null = null;
  private eventQueue: any[] = [];

  constructor(config: GitHubConfig) {
    super();
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  // Start capturing events
  async startCapture(pollingIntervalMs = 30000) {
    console.log('Starting GitHub event capture...');
    
    // Initial fetch
    await this.fetchRecentEvents();
    
    // Set up polling
    this.pollingInterval = setInterval(async () => {
      await this.fetchRecentEvents();
    }, pollingIntervalMs);

    // Set up webhook listener if configured
    if (this.config.webhookSecret) {
      this.setupWebhookListener();
    }
  }

  // Stop capturing events
  stopCapture() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('Stopped GitHub event capture');
  }

  // Fetch recent repository events
  private async fetchRecentEvents() {
    try {
      // Fetch recent commits
      const commits = await this.fetchRecentCommits();
      
      // Fetch open PRs
      const prs = await this.fetchPullRequests();
      
      // Fetch recent issues
      const issues = await this.fetchRecentIssues();
      
      // Fetch workflow runs
      const workflows = await this.fetchWorkflowRuns();
      
      // Process and emit events
      this.processEvents([...commits, ...prs, ...issues, ...workflows]);
    } catch (error) {
      console.error('Error fetching GitHub events:', error);
      this.emit('error', error);
    }
  }

  private async fetchRecentCommits(): Promise<CodeChangeEvent[]> {
    const { data: commits } = await this.octokit.repos.listCommits({
      owner: this.config.owner,
      repo: this.config.repo,
      per_page: 10
    });

    const events: CodeChangeEvent[] = [];
    
    for (const commit of commits) {
      // Skip if already processed
      if (this.lastProcessedSha === commit.sha) break;
      
      // Get detailed commit info
      const { data: detailedCommit } = await this.octokit.repos.getCommit({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: commit.sha
      });

      const event: CodeChangeEvent = {
        id: `commit-${commit.sha}`,
        timestamp: commit.commit.author?.date || new Date().toISOString(),
        type: 'commit',
        repository: `${this.config.owner}/${this.config.repo}`,
        branch: 'main', // Would need to determine actual branch
        author: {
          login: commit.author?.login || 'unknown',
          email: commit.commit.author?.email
        },
        changes: {
          files: detailedCommit.files?.map(file => ({
            path: file.filename,
            status: file.status as any,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch,
            previousPath: file.previous_filename
          })) || [],
          summary: commit.commit.message,
          stats: {
            additions: detailedCommit.stats?.additions || 0,
            deletions: detailedCommit.stats?.deletions || 0,
            filesChanged: detailedCommit.files?.length || 0
          }
        },
        metadata: {
          sha: commit.sha,
          message: commit.commit.message,
          parentSha: commit.parents[0]?.sha
        }
      };
      
      events.push(event);
    }

    // Update last processed SHA
    if (commits.length > 0) {
      this.lastProcessedSha = commits[0].sha;
    }

    return events;
  }

  private async fetchPullRequests(): Promise<PREvent[]> {
    const { data: prs } = await this.octokit.pulls.list({
      owner: this.config.owner,
      repo: this.config.repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 10
    });

    return prs.map(pr => ({
      id: `pr-${pr.number}`,
      timestamp: pr.updated_at || pr.created_at,
      type: pr.merged_at ? 'pr_merged' : pr.state === 'closed' ? 'pr_closed' : 'pr_opened',
      number: pr.number,
      title: pr.title,
      description: pr.body || '',
      author: pr.user?.login || 'unknown',
      state: pr.merged_at ? 'merged' : pr.state,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      reviewers: [], // Would need additional API call
      approvals: 0, // Would need additional API call
      requestedChanges: 0, // Would need additional API call
      commits: [], // Would need additional API call
      filesChanged: pr.changed_files || 0,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0
    } as PREvent));
  }

  private async fetchRecentIssues(): Promise<IssueEvent[]> {
    const { data: issues } = await this.octokit.issues.listForRepo({
      owner: this.config.owner,
      repo: this.config.repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 10
    });

    return issues
      .filter(issue => !issue.pull_request) // Exclude PRs
      .map(issue => ({
        id: `issue-${issue.number}`,
        timestamp: issue.updated_at || issue.created_at,
        type: issue.state === 'closed' ? 'issue_closed' : 'issue_created',
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        author: issue.user?.login || 'unknown',
        state: issue.state as 'open' | 'closed',
        labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        assignees: issue.assignees?.map(a => a.login) || []
      } as IssueEvent));
  }

  private async fetchWorkflowRuns(): Promise<WorkflowEvent[]> {
    try {
      const { data: runs } = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: 10
      });

      return runs.workflow_runs.map(run => ({
        id: `workflow-${run.id}`,
        timestamp: run.updated_at || run.created_at,
        type: 'workflow_run',
        name: run.name || 'Unknown Workflow',
        status: run.status as any,
        conclusion: run.conclusion as any,
        duration: run.run_started_at 
          ? new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()
          : undefined,
        triggeredBy: run.actor?.login || 'unknown'
      } as WorkflowEvent));
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      return [];
    }
  }

  private processEvents(events: any[]) {
    // Sort by timestamp
    events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Emit events
    for (const event of events) {
      this.emit('event', event);
      
      // Emit typed events
      if (event.type?.startsWith('commit')) {
        this.emit('code:change', event);
      } else if (event.type?.startsWith('pr_')) {
        this.emit('pr:event', event);
      } else if (event.type?.startsWith('issue_')) {
        this.emit('issue:event', event);
      } else if (event.type?.startsWith('workflow')) {
        this.emit('workflow:event', event);
      }
    }

    // Store in queue for batch processing
    this.eventQueue.push(...events);
    if (this.eventQueue.length > 100) {
      this.eventQueue = this.eventQueue.slice(-100); // Keep last 100
    }
  }

  private setupWebhookListener() {
    // This would set up an Express server to receive GitHub webhooks
    // For now, this is a placeholder
    console.log('Webhook listener setup would go here');
  }

  // Get correlation between GitHub events and Claude conversations
  async correlateWithClaude(conversationId: string): Promise<any[]> {
    // Find GitHub events that happened around the same time as Claude conversation
    const correlatedEvents = this.eventQueue.filter(event => {
      // Logic to correlate events with conversation
      // Could match by:
      // - Timestamp proximity
      // - File paths mentioned in conversation
      // - Issue/PR numbers referenced
      return true; // Placeholder
    });

    return correlatedEvents;
  }

  // Generate context summary from recent events
  generateContextSummary(): string {
    const recentCommits = this.eventQueue
      .filter(e => e.type === 'commit')
      .slice(0, 5);
    
    const activePRs = this.eventQueue
      .filter(e => e.type?.startsWith('pr_') && e.state === 'open');
    
    const openIssues = this.eventQueue
      .filter(e => e.type?.startsWith('issue_') && e.state === 'open');

    let summary = '## Recent GitHub Activity\n\n';
    
    if (recentCommits.length > 0) {
      summary += '### Recent Commits\n';
      recentCommits.forEach(c => {
        summary += `- ${c.metadata.message} (${c.metadata.sha.slice(0, 7)})\n`;
      });
      summary += '\n';
    }
    
    if (activePRs.length > 0) {
      summary += '### Active Pull Requests\n';
      activePRs.forEach(pr => {
        summary += `- #${pr.number}: ${pr.title} (${pr.additions}+ / ${pr.deletions}-)\n`;
      });
      summary += '\n';
    }
    
    if (openIssues.length > 0) {
      summary += '### Open Issues\n';
      openIssues.forEach(issue => {
        summary += `- #${issue.number}: ${issue.title}\n`;
      });
    }

    return summary;
  }
}

// Export singleton instance
export const githubCapture = (config: GitHubConfig) => new GitHubEventCapture(config);