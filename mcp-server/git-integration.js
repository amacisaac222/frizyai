// Git Integration Module for MCP Server
import simpleGit from 'simple-git';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';

export class GitIntegration {
  constructor(mcpServer, options = {}) {
    this.mcpServer = mcpServer;
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      pollInterval: options.pollInterval || 30000, // 30 seconds
      trackBranches: options.trackBranches !== false,
      trackCommits: options.trackCommits !== false,
      trackStatus: options.trackStatus !== false
    };

    this.git = simpleGit(this.options.projectRoot);
    this.lastCommitHash = null;
    this.currentBranch = null;
    this.pollTimer = null;
  }

  async start() {
    console.log(`Starting Git integration for: ${this.options.projectRoot}`);

    // Check if it's a git repository
    const isRepo = await this.isGitRepository();
    if (!isRepo) {
      console.warn('Not a git repository. Git integration disabled.');
      return false;
    }

    // Get initial state
    await this.updateGitState();

    // Start polling for changes
    if (this.options.pollInterval > 0) {
      this.startPolling();
    }

    // Set up git hooks if possible
    await this.setupGitHooks();

    console.log('Git integration started successfully');
    return true;
  }

  async isGitRepository() {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateGitState() {
    try {
      // Get current branch
      const branch = await this.git.branch();
      const newBranch = branch.current;

      // Check for branch change
      if (this.currentBranch && this.currentBranch !== newBranch) {
        await this.handleBranchChange(this.currentBranch, newBranch);
      }
      this.currentBranch = newBranch;

      // Get latest commit
      const log = await this.git.log(['-1']);
      const latestCommit = log.latest;

      // Check for new commits
      if (this.lastCommitHash && this.lastCommitHash !== latestCommit.hash) {
        await this.handleNewCommits(this.lastCommitHash, latestCommit.hash);
      }
      this.lastCommitHash = latestCommit.hash;

      // Get status
      if (this.options.trackStatus) {
        const status = await this.git.status();
        await this.handleStatusUpdate(status);
      }

    } catch (error) {
      console.error('Error updating git state:', error);
    }
  }

  async handleBranchChange(oldBranch, newBranch) {
    console.log(`Branch changed: ${oldBranch} -> ${newBranch}`);

    const event = {
      type: 'git_branch_change',
      tool: 'git',
      data: {
        oldBranch,
        newBranch,
        timestamp: Date.now()
      },
      impact: 'medium'
    };

    // Broadcast to clients
    this.mcpServer.broadcast({
      type: 'git_event',
      subtype: 'branch_change',
      oldBranch,
      newBranch,
      timestamp: Date.now()
    });

    // Store in database
    this.storeGitEvent(event);
  }

  async handleNewCommits(oldHash, newHash) {
    console.log(`New commits detected: ${oldHash.substring(0, 7)} -> ${newHash.substring(0, 7)}`);

    try {
      // Get commits between old and new hash
      const commits = await this.git.log([`${oldHash}..${newHash}`]);

      // Process each commit
      for (const commit of commits.all) {
        await this.processCommit(commit);
      }

      // Get diff statistics
      const diffSummary = await this.git.diffSummary([oldHash, newHash]);

      const event = {
        type: 'git_commits',
        tool: 'git',
        data: {
          commits: commits.all.map(c => ({
            hash: c.hash,
            message: c.message,
            author: c.author_name,
            date: c.date,
            files: []
          })),
          diffSummary: {
            changed: diffSummary.changed,
            insertions: diffSummary.insertions,
            deletions: diffSummary.deletions,
            files: diffSummary.files
          }
        },
        impact: commits.all.length > 5 ? 'high' : 'medium',
        tokensUsed: this.estimateCommitTokens(commits.all)
      };

      // Broadcast to clients
      this.mcpServer.broadcast({
        type: 'git_event',
        subtype: 'new_commits',
        count: commits.all.length,
        commits: event.data.commits,
        diffSummary: event.data.diffSummary,
        timestamp: Date.now()
      });

      // Store in database
      this.storeGitEvent(event);

    } catch (error) {
      console.error('Error processing new commits:', error);
    }
  }

  async processCommit(commit) {
    try {
      // Get files changed in this commit
      const diff = await this.git.diff([`${commit.hash}^`, commit.hash, '--name-status']);
      const files = this.parseDiffNameStatus(diff);

      // Analyze commit message for patterns
      const analysis = this.analyzeCommitMessage(commit.message);

      return {
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: commit.date,
        files,
        analysis
      };
    } catch (error) {
      console.error(`Error processing commit ${commit.hash}:`, error);
      return null;
    }
  }

  parseDiffNameStatus(diff) {
    const files = [];
    const lines = diff.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const [status, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');

      if (filePath) {
        files.push({
          path: filePath,
          status: this.getFileStatus(status)
        });
      }
    }

    return files;
  }

  getFileStatus(status) {
    const statusMap = {
      'A': 'added',
      'M': 'modified',
      'D': 'deleted',
      'R': 'renamed',
      'C': 'copied',
      'U': 'updated'
    };
    return statusMap[status] || 'unknown';
  }

  analyzeCommitMessage(message) {
    const analysis = {
      type: 'other',
      scope: null,
      breaking: false,
      fixes: [],
      references: []
    };

    // Detect conventional commit types
    const conventionalMatch = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\((.+)\))?:/);
    if (conventionalMatch) {
      analysis.type = conventionalMatch[1];
      analysis.scope = conventionalMatch[3] || null;
    }

    // Check for breaking changes
    if (message.includes('BREAKING CHANGE') || message.includes('!:')) {
      analysis.breaking = true;
    }

    // Find issue references
    const issueMatches = message.match(/#\d+/g);
    if (issueMatches) {
      analysis.references = issueMatches;
    }

    // Find fix references
    const fixMatches = message.match(/fix(es|ed)?:?\s*#?\d+/gi);
    if (fixMatches) {
      analysis.fixes = fixMatches.map(m => m.match(/\d+/)[0]);
    }

    return analysis;
  }

  async handleStatusUpdate(status) {
    const summary = {
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified.length,
      added: status.created.length,
      deleted: status.deleted.length,
      renamed: status.renamed.length,
      conflicted: status.conflicted.length,
      staged: status.staged.length,
      notAdded: status.not_added.length
    };

    // Only broadcast if there are changes
    if (summary.modified > 0 || summary.added > 0 || summary.deleted > 0 ||
        summary.staged > 0 || summary.conflicted > 0) {

      this.mcpServer.broadcast({
        type: 'git_event',
        subtype: 'status_update',
        status: summary,
        files: {
          modified: status.modified,
          added: status.created,
          deleted: status.deleted,
          staged: status.staged,
          conflicted: status.conflicted
        },
        timestamp: Date.now()
      });
    }
  }

  async setupGitHooks() {
    try {
      const gitDir = path.join(this.options.projectRoot, '.git');
      const hooksDir = path.join(gitDir, 'hooks');

      // Create post-commit hook
      const postCommitHook = `#!/bin/sh
# Frizy MCP Git Hook - Post Commit
curl -X POST http://localhost:${this.mcpServer.port || 3333}/api/git/hook \\
  -H "Content-Type: application/json" \\
  -d '{"type": "post-commit", "hash": "'$(git rev-parse HEAD)'"}'
`;

      const postCommitPath = path.join(hooksDir, 'post-commit');
      await fs.writeFile(postCommitPath, postCommitHook);
      await fs.chmod(postCommitPath, '755');

      console.log('Git hooks installed successfully');
    } catch (error) {
      console.warn('Could not install git hooks:', error.message);
    }
  }

  startPolling() {
    this.pollTimer = setInterval(async () => {
      await this.updateGitState();
    }, this.options.pollInterval);

    console.log(`Git polling started (interval: ${this.options.pollInterval}ms)`);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('Git polling stopped');
    }
  }

  estimateCommitTokens(commits) {
    let tokens = 0;
    commits.forEach(commit => {
      tokens += Math.ceil(commit.message.length / 4);
      tokens += 20; // Metadata tokens
    });
    return tokens;
  }

  storeGitEvent(event) {
    if (this.mcpServer.db) {
      const activeSession = this.mcpServer.db.getActiveSession();
      if (activeSession) {
        this.mcpServer.db.createEvent({
          sessionId: activeSession.id,
          type: event.type,
          tool: event.tool,
          data: event.data,
          impact: event.impact || 'low',
          tokensUsed: event.tokensUsed || 0
        });
      }
    }
  }

  async getGitInfo() {
    try {
      const status = await this.git.status();
      const branch = await this.git.branch();
      const remotes = await this.git.getRemotes(true);
      const log = await this.git.log(['-10']); // Last 10 commits

      return {
        repository: path.basename(this.options.projectRoot),
        branch: branch.current,
        branches: branch.all,
        status: {
          ahead: status.ahead,
          behind: status.behind,
          modified: status.modified.length,
          staged: status.staged.length,
          conflicted: status.conflicted.length
        },
        remotes: remotes.map(r => ({
          name: r.name,
          url: r.refs.fetch || r.refs.push
        })),
        recentCommits: log.all.map(c => ({
          hash: c.hash.substring(0, 7),
          message: c.message,
          author: c.author_name,
          date: c.date
        }))
      };
    } catch (error) {
      console.error('Error getting git info:', error);
      return null;
    }
  }

  stop() {
    this.stopPolling();
    console.log('Git integration stopped');
  }
}

export default GitIntegration;