import { EventEmitter } from 'events';
import { UnifiedBlock } from '../../types/container';
import { MCPEventProcessor } from '../mcp/MCPEventProcessor';
import { GitHubWebhookHandler } from '../github/GitHubWebhookHandler';
import { TieredStorageManager } from '../storage/TieredStorageManager';

interface ContextPattern {
  id: string;
  type: 'workflow' | 'error_pattern' | 'success_pattern' | 'optimization';
  description: string;
  events: string[];
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  suggestions?: string[];
}

interface ProjectContext {
  id: string;
  name: string;
  pillars: UnifiedBlock[];
  goals: UnifiedBlock[];
  events: UnifiedBlock[];
  patterns: ContextPattern[];
  metrics: {
    totalEvents: number;
    completedGoals: number;
    activeGoals: number;
    blockedItems: number;
    successRate: number;
    avgEventTime: number;
  };
  insights: string[];
  recommendations: string[];
}

export class ContextAggregationService extends EventEmitter {
  private contexts = new Map<string, ProjectContext>();
  private patternDetector: PatternDetector;
  private insightGenerator: InsightGenerator;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(
    private mcpProcessor: MCPEventProcessor,
    private githubHandler: GitHubWebhookHandler,
    private storageManager: TieredStorageManager
  ) {
    super();
    
    this.patternDetector = new PatternDetector();
    this.insightGenerator = new InsightGenerator();
    
    this.initialize();
  }

  private initialize() {
    // Listen to MCP events
    this.mcpProcessor.on('blockCreated', (block: UnifiedBlock) => {
      this.handleNewBlock(block);
    });
    
    this.mcpProcessor.on('goalCreated', (goal: UnifiedBlock) => {
      this.handleGoalCreated(goal);
    });
    
    // Listen to GitHub events
    this.githubHandler.on('githubEvent', (event: any) => {
      this.handleGitHubEvent(event);
    });
    
    // Start periodic aggregation
    this.updateInterval = setInterval(() => {
      this.performAggregation();
    }, 5000); // Every 5 seconds
  }

  private handleNewBlock(block: UnifiedBlock) {
    const projectId = block.references?.sessionId || 'default';
    
    if (!this.contexts.has(projectId)) {
      this.contexts.set(projectId, this.createProjectContext(projectId));
    }
    
    const context = this.contexts.get(projectId)!;
    
    // Add event to context
    if (block.level === 'event') {
      context.events.push(block);
      context.metrics.totalEvents++;
      
      // Store in tiered storage
      this.storageManager.store({
        id: block.id,
        timestamp: block.timestamp || new Date().toISOString(),
        data: block,
        ttl: 3600 // 1 hour in hot tier
      });
    }
    
    // Update metrics based on status
    if (block.status === 'blocked') {
      context.metrics.blockedItems++;
    }
    
    // Detect patterns
    this.detectPatterns(context, block);
  }

  private handleGoalCreated(goal: UnifiedBlock) {
    const projectId = goal.references?.sessionId || 'default';
    const context = this.contexts.get(projectId);
    
    if (!context) return;
    
    // Add goal to context
    context.goals.push(goal);
    
    if (goal.status === 'completed') {
      context.metrics.completedGoals++;
    } else if (goal.status === 'active') {
      context.metrics.activeGoals++;
    }
    
    // Check if goal belongs to a pillar
    this.assignGoalToPillar(context, goal);
  }

  private handleGitHubEvent(event: any) {
    // Convert GitHub event to UnifiedBlock
    const block: UnifiedBlock = {
      id: `github-${event.id}`,
      level: 'event',
      type: 'github',
      title: `GitHub: ${event.type}`,
      summary: event.summary,
      status: event.impact === 'high' ? 'active' : 'completed',
      timestamp: event.timestamp,
      context: {
        goal: event.repository,
        reason: event.action,
        impact: event.impact
      },
      metrics: {},
      relationships: {
        parent: event.repository
      },
      references: {
        eventIds: [event.id]
      }
    };
    
    this.handleNewBlock(block);
  }

  private createProjectContext(projectId: string): ProjectContext {
    return {
      id: projectId,
      name: `Project ${projectId}`,
      pillars: this.initializePillars(),
      goals: [],
      events: [],
      patterns: [],
      metrics: {
        totalEvents: 0,
        completedGoals: 0,
        activeGoals: 0,
        blockedItems: 0,
        successRate: 0,
        avgEventTime: 0
      },
      insights: [],
      recommendations: []
    };
  }

  private initializePillars(): UnifiedBlock[] {
    return [
      {
        id: 'pillar-development',
        level: 'pillar',
        type: 'category',
        title: 'Development',
        summary: 'Core development activities and code changes',
        status: 'active',
        context: {
          goal: 'Implement features and fix bugs',
          reason: 'Primary development workflow',
          impact: 'high'
        },
        metrics: { completed: 0, total: 0 },
        relationships: { children: [] }
      },
      {
        id: 'pillar-testing',
        level: 'pillar',
        type: 'category',
        title: 'Testing & Quality',
        summary: 'Testing, validation, and quality assurance',
        status: 'active',
        context: {
          goal: 'Ensure code quality and reliability',
          reason: 'Quality assurance',
          impact: 'high'
        },
        metrics: { completed: 0, total: 0 },
        relationships: { children: [] }
      },
      {
        id: 'pillar-deployment',
        level: 'pillar',
        type: 'category',
        title: 'Deployment & Operations',
        summary: 'Deployment, monitoring, and operations',
        status: 'planned',
        context: {
          goal: 'Deploy and maintain applications',
          reason: 'Operational excellence',
          impact: 'high'
        },
        metrics: { completed: 0, total: 0 },
        relationships: { children: [] }
      }
    ];
  }

  private assignGoalToPillar(context: ProjectContext, goal: UnifiedBlock) {
    // Simple heuristic to assign goals to pillars
    let targetPillar: UnifiedBlock | undefined;
    
    const goalTitle = goal.title.toLowerCase();
    const goalSummary = goal.summary.toLowerCase();
    
    if (goalTitle.includes('test') || goalSummary.includes('test')) {
      targetPillar = context.pillars.find(p => p.title === 'Testing & Quality');
    } else if (goalTitle.includes('deploy') || goalSummary.includes('deploy')) {
      targetPillar = context.pillars.find(p => p.title === 'Deployment & Operations');
    } else {
      targetPillar = context.pillars.find(p => p.title === 'Development');
    }
    
    if (targetPillar) {
      targetPillar.relationships!.children!.push(goal.id);
      goal.relationships = { ...goal.relationships, parent: targetPillar.id };
      
      // Update pillar metrics
      targetPillar.metrics!.total!++;
      if (goal.status === 'completed') {
        targetPillar.metrics!.completed!++;
      }
    }
  }

  private detectPatterns(context: ProjectContext, block: UnifiedBlock) {
    const patterns = this.patternDetector.detect(context.events);
    
    for (const pattern of patterns) {
      // Check if pattern already exists
      const existing = context.patterns.find(p => 
        p.type === pattern.type && p.description === pattern.description
      );
      
      if (existing) {
        existing.frequency++;
        existing.events.push(block.id);
      } else {
        context.patterns.push(pattern);
      }
    }
  }

  private performAggregation() {
    for (const [projectId, context] of this.contexts) {
      // Update metrics
      this.updateMetrics(context);
      
      // Generate insights
      const insights = this.insightGenerator.generate(context);
      context.insights = insights;
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(context);
      context.recommendations = recommendations;
      
      // Emit updated context
      this.emit('contextUpdated', context);
    }
  }

  private updateMetrics(context: ProjectContext) {
    const metrics = context.metrics;
    
    // Calculate success rate
    const totalCompleted = context.events.filter(e => e.status === 'completed').length;
    metrics.successRate = metrics.totalEvents > 0 
      ? (totalCompleted / metrics.totalEvents) * 100 
      : 0;
    
    // Calculate average event time
    if (context.events.length > 1) {
      const times = context.events
        .filter(e => e.timestamp)
        .map(e => new Date(e.timestamp!).getTime())
        .sort((a, b) => a - b);
      
      if (times.length > 1) {
        const totalTime = times[times.length - 1] - times[0];
        metrics.avgEventTime = totalTime / (times.length - 1);
      }
    }
    
    // Update pillar statuses
    for (const pillar of context.pillars) {
      const total = pillar.metrics?.total || 0;
      const completed = pillar.metrics?.completed || 0;
      
      if (total === 0) {
        pillar.status = 'planned';
      } else if (completed === total) {
        pillar.status = 'completed';
      } else if (completed > 0) {
        pillar.status = 'active';
      } else {
        pillar.status = 'blocked';
      }
    }
  }

  private generateRecommendations(context: ProjectContext): string[] {
    const recommendations: string[] = [];
    
    // Check for high error rate
    const errorRate = context.events.filter(e => e.type === 'error').length / context.metrics.totalEvents;
    if (errorRate > 0.2) {
      recommendations.push('High error rate detected. Consider reviewing error handling and debugging.');
    }
    
    // Check for blocked items
    if (context.metrics.blockedItems > 3) {
      recommendations.push(`${context.metrics.blockedItems} blocked items. Focus on unblocking these tasks.`);
    }
    
    // Check for patterns
    const highImpactPatterns = context.patterns.filter(p => p.impact === 'high');
    if (highImpactPatterns.length > 0) {
      recommendations.push(`${highImpactPatterns.length} high-impact patterns detected. Review for optimization opportunities.`);
    }
    
    // Check success rate
    if (context.metrics.successRate < 70) {
      recommendations.push('Success rate below 70%. Consider improving error handling and validation.');
    }
    
    return recommendations;
  }

  // Public API
  async getProjectContext(projectId: string): Promise<ProjectContext | undefined> {
    return this.contexts.get(projectId);
  }

  async getAllContexts(): Promise<ProjectContext[]> {
    return Array.from(this.contexts.values());
  }

  async getHistoricalData(
    projectId: string,
    startTime: Date,
    endTime: Date
  ): Promise<UnifiedBlock[]> {
    const events = await this.storageManager.queryByTimeRange(
      startTime,
      endTime,
      1000
    );
    
    return events.map(e => e.data as UnifiedBlock);
  }

  getStorageMetrics() {
    return this.storageManager.getMetrics();
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Pattern Detection Helper
class PatternDetector {
  detect(events: UnifiedBlock[]): ContextPattern[] {
    const patterns: ContextPattern[] = [];
    
    // Detect repeated tool usage
    const toolSequences = this.findToolSequences(events);
    for (const [sequence, count] of toolSequences) {
      if (count >= 3) {
        patterns.push({
          id: `pattern-${Date.now()}`,
          type: 'workflow',
          description: `Repeated sequence: ${sequence}`,
          events: [],
          frequency: count,
          impact: 'medium',
          suggestions: ['Consider automating this workflow']
        });
      }
    }
    
    // Detect error patterns
    const errorGroups = this.groupErrors(events);
    for (const [errorType, errors] of errorGroups) {
      if (errors.length >= 2) {
        patterns.push({
          id: `error-pattern-${Date.now()}`,
          type: 'error_pattern',
          description: `Recurring ${errorType} errors`,
          events: errors.map(e => e.id),
          frequency: errors.length,
          impact: 'high',
          suggestions: ['Investigate root cause', 'Add error handling']
        });
      }
    }
    
    return patterns;
  }

  private findToolSequences(events: UnifiedBlock[]): Map<string, number> {
    const sequences = new Map<string, number>();
    const toolEvents = events.filter(e => e.type === 'tool');
    
    for (let i = 0; i < toolEvents.length - 2; i++) {
      const sequence = `${toolEvents[i].title} -> ${toolEvents[i + 1].title} -> ${toolEvents[i + 2].title}`;
      sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
    }
    
    return sequences;
  }

  private groupErrors(events: UnifiedBlock[]): Map<string, UnifiedBlock[]> {
    const errorGroups = new Map<string, UnifiedBlock[]>();
    const errors = events.filter(e => e.type === 'error' || e.status === 'blocked');
    
    for (const error of errors) {
      const key = error.summary.split(' ')[0]; // Simple grouping by first word
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(error);
    }
    
    return errorGroups;
  }
}

// Insight Generation Helper
class InsightGenerator {
  generate(context: ProjectContext): string[] {
    const insights: string[] = [];
    
    // Productivity insights
    if (context.metrics.avgEventTime > 0) {
      const avgMinutes = Math.round(context.metrics.avgEventTime / 60000);
      insights.push(`Average time between events: ${avgMinutes} minutes`);
    }
    
    // Pattern insights
    const workflowPatterns = context.patterns.filter(p => p.type === 'workflow');
    if (workflowPatterns.length > 0) {
      insights.push(`${workflowPatterns.length} workflow patterns identified for potential automation`);
    }
    
    // Progress insights
    if (context.metrics.completedGoals > 0) {
      const completionRate = (context.metrics.completedGoals / (context.metrics.completedGoals + context.metrics.activeGoals)) * 100;
      insights.push(`Goal completion rate: ${completionRate.toFixed(1)}%`);
    }
    
    // Pillar insights
    const activePillars = context.pillars.filter(p => p.status === 'active');
    if (activePillars.length > 0) {
      insights.push(`Active focus areas: ${activePillars.map(p => p.title).join(', ')}`);
    }
    
    return insights;
  }
}