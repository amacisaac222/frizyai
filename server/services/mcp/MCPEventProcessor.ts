import { EventEmitter } from 'events';
import { UnifiedBlock } from '../../types/container';

interface MCPEventInput {
  id: string;
  timestamp: string;
  type: 'tool_use' | 'conversation' | 'decision' | 'error' | 'context_update';
  data: {
    tool?: string;
    input?: any;
    output?: any;
    message?: string;
    error?: string;
    context?: any;
  };
  metadata?: {
    sessionId?: string;
    userId?: string;
    projectId?: string;
  };
}

interface AggregatedContext {
  sessionId: string;
  pillarId?: string;
  goalId?: string;
  events: string[];
  summary: string;
  patterns: string[];
  keyDecisions: string[];
  blockers: string[];
}

export class MCPEventProcessor extends EventEmitter {
  private eventQueue: MCPEventInput[] = [];
  private contextMap = new Map<string, AggregatedContext>();
  private blockCache = new Map<string, UnifiedBlock>();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startProcessing();
  }

  private startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Process every second
  }

  async processEvent(event: MCPEventInput): Promise<UnifiedBlock> {
    // Add to queue for batch processing
    this.eventQueue.push(event);
    
    // Create immediate block representation
    const block = this.createEventBlock(event);
    
    // Store in cache
    this.blockCache.set(block.id, block);
    
    // Update context aggregation
    this.updateContext(event, block);
    
    // Emit for real-time updates
    this.emit('blockCreated', block);
    
    return block;
  }

  private createEventBlock(event: MCPEventInput): UnifiedBlock {
    const { type, data, metadata } = event;
    
    let title = '';
    let summary = '';
    let status: UnifiedBlock['status'] = 'active';
    let blockType = type;
    
    switch (type) {
      case 'tool_use':
        title = `Tool: ${data.tool || 'Unknown'}`;
        summary = this.summarizeTool(data);
        status = data.error ? 'blocked' : 'completed';
        blockType = 'tool';
        break;
        
      case 'conversation':
        title = 'Conversation Update';
        summary = this.truncateMessage(data.message || '', 100);
        status = 'completed';
        blockType = 'message';
        break;
        
      case 'decision':
        title = 'Decision Point';
        summary = data.message || 'Strategic decision made';
        status = 'completed';
        blockType = 'decision';
        break;
        
      case 'error':
        title = 'Error Encountered';
        summary = data.error || 'Unknown error';
        status = 'blocked';
        blockType = 'error';
        break;
        
      case 'context_update':
        title = 'Context Update';
        summary = this.summarizeContext(data.context);
        status = 'active';
        blockType = 'context';
        break;
    }
    
    return {
      id: event.id,
      level: 'event',
      type: blockType,
      title,
      summary,
      status,
      timestamp: event.timestamp,
      context: {
        reason: this.extractReason(data),
        impact: this.extractImpact(data),
        goal: metadata?.projectId || 'General'
      },
      metrics: this.extractMetrics(data),
      relationships: {
        parent: metadata?.sessionId,
        children: []
      },
      references: {
        sessionId: metadata?.sessionId,
        eventIds: [event.id]
      }
    };
  }

  private summarizeTool(data: any): string {
    if (data.tool === 'Read') {
      return `Reading ${data.input?.file_path || 'file'}`;
    } else if (data.tool === 'Write') {
      return `Writing to ${data.input?.file_path || 'file'}`;
    } else if (data.tool === 'Edit') {
      return `Editing ${data.input?.file_path || 'file'}`;
    } else if (data.tool === 'Bash') {
      return `Running: ${data.input?.command || 'command'}`;
    } else if (data.tool === 'WebSearch') {
      return `Searching: ${data.input?.query || 'query'}`;
    }
    return `Using ${data.tool || 'tool'}`;
  }

  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }

  private summarizeContext(context: any): string {
    if (!context) return 'Context updated';
    
    const keys = Object.keys(context);
    if (keys.length === 0) return 'Empty context';
    
    return `Updated ${keys.length} context items: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
  }

  private extractReason(data: any): string {
    if (data.error) return 'Error occurred during operation';
    if (data.tool === 'Read') return 'Understanding codebase structure';
    if (data.tool === 'Write' || data.tool === 'Edit') return 'Implementing requested changes';
    if (data.tool === 'Bash') return 'Executing system commands';
    if (data.message?.includes('?')) return 'Responding to user query';
    return 'Processing user request';
  }

  private extractImpact(data: any): string {
    if (data.error) return 'high';
    if (data.tool === 'Write' || data.tool === 'Edit') return 'high';
    if (data.tool === 'Read') return 'low';
    if (data.tool === 'Bash' && data.input?.command?.includes('rm')) return 'high';
    return 'medium';
  }

  private extractMetrics(data: any): UnifiedBlock['metrics'] {
    const metrics: UnifiedBlock['metrics'] = {};
    
    if (data.output) {
      const outputStr = JSON.stringify(data.output);
      if (outputStr.includes('success')) {
        metrics.completed = 1;
        metrics.total = 1;
      } else if (outputStr.includes('error')) {
        metrics.completed = 0;
        metrics.total = 1;
      }
    }
    
    // Extract line counts for file operations
    if (data.tool === 'Read' || data.tool === 'Write') {
      const lines = data.output?.split?.('\n')?.length;
      if (lines) {
        metrics.lines = lines;
      }
    }
    
    return metrics;
  }

  private updateContext(event: MCPEventInput, block: UnifiedBlock) {
    const sessionId = event.metadata?.sessionId || 'default';
    
    if (!this.contextMap.has(sessionId)) {
      this.contextMap.set(sessionId, {
        sessionId,
        events: [],
        summary: '',
        patterns: [],
        keyDecisions: [],
        blockers: []
      });
    }
    
    const context = this.contextMap.get(sessionId)!;
    context.events.push(event.id);
    
    // Update patterns and insights
    if (event.type === 'decision') {
      context.keyDecisions.push(block.summary);
    }
    
    if (event.type === 'error' || block.status === 'blocked') {
      context.blockers.push(block.summary);
    }
    
    // Detect patterns
    this.detectPatterns(context, event);
    
    // Generate summary
    context.summary = this.generateContextSummary(context);
    
    // Emit context update
    this.emit('contextUpdated', context);
  }

  private detectPatterns(context: AggregatedContext, event: MCPEventInput) {
    // Simple pattern detection
    const recentEvents = context.events.slice(-10);
    
    // Check for repeated tools
    const toolCounts = new Map<string, number>();
    for (const eventId of recentEvents) {
      const block = this.blockCache.get(eventId);
      if (block?.type === 'tool') {
        const tool = block.title.replace('Tool: ', '');
        toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
      }
    }
    
    // Identify patterns
    for (const [tool, count] of toolCounts) {
      if (count >= 3) {
        const pattern = `Frequent use of ${tool} (${count} times)`;
        if (!context.patterns.includes(pattern)) {
          context.patterns.push(pattern);
        }
      }
    }
    
    // Check for error patterns
    const errorCount = recentEvents.filter(id => {
      const block = this.blockCache.get(id);
      return block?.type === 'error';
    }).length;
    
    if (errorCount >= 2) {
      context.patterns.push(`Multiple errors detected (${errorCount})`);
    }
  }

  private generateContextSummary(context: AggregatedContext): string {
    const parts = [];
    
    parts.push(`Session with ${context.events.length} events`);
    
    if (context.keyDecisions.length > 0) {
      parts.push(`${context.keyDecisions.length} key decisions`);
    }
    
    if (context.blockers.length > 0) {
      parts.push(`${context.blockers.length} blockers`);
    }
    
    if (context.patterns.length > 0) {
      parts.push(`Patterns: ${context.patterns[0]}`);
    }
    
    return parts.join(', ');
  }

  private async processQueue() {
    if (this.eventQueue.length === 0) return;
    
    const batch = this.eventQueue.splice(0, 10); // Process up to 10 events
    
    // Group by session for efficient processing
    const sessionGroups = new Map<string, MCPEventInput[]>();
    for (const event of batch) {
      const sessionId = event.metadata?.sessionId || 'default';
      if (!sessionGroups.has(sessionId)) {
        sessionGroups.set(sessionId, []);
      }
      sessionGroups.get(sessionId)!.push(event);
    }
    
    // Process each session group
    for (const [sessionId, events] of sessionGroups) {
      await this.aggregateSession(sessionId, events);
    }
  }

  private async aggregateSession(sessionId: string, events: MCPEventInput[]) {
    // Create goal-level aggregation
    const goals = this.identifyGoals(events);
    
    for (const goal of goals) {
      const goalBlock: UnifiedBlock = {
        id: `goal-${sessionId}-${Date.now()}`,
        level: 'goal',
        type: 'milestone',
        title: goal.title,
        summary: goal.summary,
        status: goal.status,
        context: {
          goal: goal.title,
          reason: 'Aggregated from event patterns',
          impact: 'medium'
        },
        metrics: {
          completed: goal.completedEvents,
          total: goal.totalEvents
        },
        relationships: {
          parent: sessionId,
          children: goal.eventIds
        },
        references: {
          sessionId,
          eventIds: goal.eventIds
        }
      };
      
      this.emit('goalCreated', goalBlock);
    }
  }

  private identifyGoals(events: MCPEventInput[]): Array<{
    title: string;
    summary: string;
    status: UnifiedBlock['status'];
    eventIds: string[];
    completedEvents: number;
    totalEvents: number;
  }> {
    const goals = [];
    
    // Group events by patterns
    const toolGroups = new Map<string, MCPEventInput[]>();
    
    for (const event of events) {
      if (event.type === 'tool_use' && event.data.tool) {
        const tool = event.data.tool;
        if (!toolGroups.has(tool)) {
          toolGroups.set(tool, []);
        }
        toolGroups.get(tool)!.push(event);
      }
    }
    
    // Create goals from tool groups
    for (const [tool, toolEvents] of toolGroups) {
      if (toolEvents.length >= 2) {
        const completed = toolEvents.filter(e => !e.data.error).length;
        goals.push({
          title: `${tool} Operations`,
          summary: `Performed ${toolEvents.length} ${tool} operations`,
          status: completed === toolEvents.length ? 'completed' : 'active',
          eventIds: toolEvents.map(e => e.id),
          completedEvents: completed,
          totalEvents: toolEvents.length
        });
      }
    }
    
    return goals;
  }

  // Public API
  async getContext(sessionId: string): Promise<AggregatedContext | undefined> {
    return this.contextMap.get(sessionId);
  }

  async getBlock(blockId: string): Promise<UnifiedBlock | undefined> {
    return this.blockCache.get(blockId);
  }

  async getSessionBlocks(sessionId: string): Promise<UnifiedBlock[]> {
    const blocks: UnifiedBlock[] = [];
    
    for (const [id, block] of this.blockCache) {
      if (block.references?.sessionId === sessionId) {
        blocks.push(block);
      }
    }
    
    return blocks.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
  }

  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}