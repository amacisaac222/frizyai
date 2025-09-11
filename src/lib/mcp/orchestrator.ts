// Enhanced MCP Orchestrator for Claude Code Integration
// Connects event-sourced Frizy with Claude Code via MCP

import { eventStore } from '../events/event-store'
import { eventSourcedBlockService, eventSourcedSessionService, insightService } from '../events/event-sourced-services'
import { sessionTracker } from '../session-tracker'
import { contextManager } from '../context-manager'
import type { 
  MCPRequest, 
  MCPResponse, 
  MCPTool, 
  MCPProjectContext,
  FrizyMCPMethod 
} from '../mcp-integration'
import type { Block, Project, Session } from '../database.types'

// Enhanced MCP orchestrator with real event sourcing
export class MCPOrchestrator {
  private isConnected = false
  private activeSession: string | null = null
  private messageHandlers: Map<string, Function> = new Map()
  private eventSubscriptions: (() => void)[] = []

  constructor() {
    this.setupMessageHandlers()
    this.subscribeToEvents()
  }

  // Setup enhanced message handlers
  private setupMessageHandlers(): void {
    this.messageHandlers.set('frizy/session/start', this.handleSessionStart.bind(this))
    this.messageHandlers.set('frizy/session/end', this.handleSessionEnd.bind(this))
    this.messageHandlers.set('frizy/insight/capture', this.handleInsightCapture.bind(this))
    this.messageHandlers.set('frizy/context/get', this.handleContextGet.bind(this))
    this.messageHandlers.set('frizy/context/compress', this.handleContextCompress.bind(this))
    this.messageHandlers.set('frizy/block/create', this.handleBlockCreate.bind(this))
    this.messageHandlers.set('frizy/block/update', this.handleBlockUpdate.bind(this))
    this.messageHandlers.set('frizy/block/move', this.handleBlockMove.bind(this))
    this.messageHandlers.set('frizy/suggestions/get', this.handleSuggestionsGet.bind(this))
    this.messageHandlers.set('frizy/analytics/get', this.handleAnalyticsGet.bind(this))
    this.messageHandlers.set('frizy/history/replay', this.handleHistoryReplay.bind(this))
  }

  // Subscribe to events for real-time MCP notifications
  private subscribeToEvents(): void {
    const unsubscribe = eventStore.subscribeToEvents((event) => {
      this.broadcastEventToClaudeCodes(event)
    })
    this.eventSubscriptions.push(unsubscribe)
  }

  // Start a new session with Claude Code integration
  async handleSessionStart(params: { 
    projectId: string
    claudeCodeSessionId?: string
    autoInjectContext?: boolean
  }): Promise<{ sessionId: string; context: MCPProjectContext }> {
    try {
      // Create new session
      const sessionResult = await eventSourcedSessionService.createSession({
        project_id: params.projectId,
        session_id: params.claudeCodeSessionId || `claude-${Date.now()}`,
        title: 'Claude Code Session',
        context_at_start: {},
        mcp_status: 'connected'
      })

      if (sessionResult.error || !sessionResult.data) {
        throw new Error(sessionResult.error || 'Failed to create session')
      }

      this.activeSession = sessionResult.data.id

      // Start session tracking
      await sessionTracker.startSession(
        sessionResult.data.id,
        params.projectId,
        params.claudeCodeSessionId
      )

      // Get current project context
      const context = await this.getProjectContext(params.projectId, true)

      // Auto-inject context if requested
      if (params.autoInjectContext) {
        await this.injectContextToClaudeCode(context)
      }

      return {
        sessionId: sessionResult.data.id,
        context
      }
    } catch (error: any) {
      throw new Error(`Failed to start session: ${error.message}`)
    }
  }

  // End session and generate insights
  async handleSessionEnd(params: { 
    generateSummary?: boolean
    captureInsights?: boolean
  } = {}): Promise<{
    sessionId: string
    summary?: any
    insights?: any[]
    nextSteps?: string[]
  }> {
    try {
      if (!this.activeSession) {
        throw new Error('No active session to end')
      }

      const sessionId = this.activeSession
      
      // End session tracking
      const sessionSummary = await sessionTracker.endSession(
        sessionId,
        params.generateSummary
      )

      // End session in database
      const endResult = await eventSourcedSessionService.endSession(sessionId, {
        context_at_end: sessionSummary?.context || {},
        duration_minutes: sessionSummary?.duration,
        insights: sessionSummary?.insights?.map(i => i.title) || [],
        achievements: sessionSummary?.achievements || [],
        next_steps: sessionSummary?.nextSteps || []
      })

      this.activeSession = null

      return {
        sessionId,
        summary: sessionSummary,
        insights: sessionSummary?.insights || [],
        nextSteps: sessionSummary?.nextSteps || []
      }
    } catch (error: any) {
      throw new Error(`Failed to end session: ${error.message}`)
    }
  }

  // Capture insight from Claude Code
  async handleInsightCapture(params: {
    type: 'decision' | 'problem_solution' | 'idea' | 'learning' | 'blocker' | 'next_step'
    title: string
    content: string
    importance: 'low' | 'medium' | 'high'
    relatedBlockIds?: string[]
    tags?: string[]
    projectId: string
  }): Promise<{ insightId: string }> {
    try {
      if (!this.activeSession) {
        throw new Error('No active session for insight capture')
      }

      const result = await insightService.captureInsight(
        this.activeSession,
        params.projectId,
        {
          type: params.type,
          title: params.title,
          content: params.content,
          importance: params.importance,
          relatedBlockIds: params.relatedBlockIds,
          tags: params.tags
        }
      )

      if (result.error) {
        throw new Error(result.error)
      }

      // Track insight in session tracker
      await sessionTracker.captureInsight(this.activeSession, {
        type: params.type,
        title: params.title,
        content: params.content,
        importance: params.importance,
        relatedBlockIds: params.relatedBlockIds || [],
        tags: params.tags || []
      })

      return result.data!
    } catch (error: any) {
      throw new Error(`Failed to capture insight: ${error.message}`)
    }
  }

  // Get enriched project context
  async handleContextGet(params: {
    projectId: string
    includeHistory?: boolean
    includeInsights?: boolean
    includeAnalytics?: boolean
    compressionLevel?: 'none' | 'light' | 'aggressive'
  }): Promise<MCPProjectContext> {
    try {
      return await this.getProjectContext(
        params.projectId,
        params.includeHistory,
        params.includeInsights,
        params.includeAnalytics,
        params.compressionLevel
      )
    } catch (error: any) {
      throw new Error(`Failed to get context: ${error.message}`)
    }
  }

  // Compress context for Claude Code
  async handleContextCompress(params: {
    projectId: string
    strategy: 'preserve_insights' | 'preserve_recent' | 'preserve_important'
    targetSize?: number
    preserveBlocks?: string[]
  }): Promise<{
    originalSize: number
    compressedSize: number
    compressionRatio: number
    preservedItems: string[]
  }> {
    try {
      const result = await contextManager.compressContext(
        params.projectId,
        {
          strategy: params.strategy,
          targetSize: params.targetSize,
          preserveBlocks: params.preserveBlocks
        }
      )

      // Record compression event
      if (this.activeSession) {
        await eventStore.appendEvent(
          `compression-${Date.now()}`,
          'compression',
          'ContextCompressed',
          {
            sessionId: this.activeSession,
            projectId: params.projectId,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            strategy: params.strategy,
            preservedInsights: result.preservedItems
          }
        )
      }

      return result
    } catch (error: any) {
      throw new Error(`Failed to compress context: ${error.message}`)
    }
  }

  // Create block via MCP
  async handleBlockCreate(params: {
    projectId: string
    title: string
    content?: string
    lane: string
    priority?: string
    tags?: string[]
    autoInject?: boolean
  }): Promise<{ blockId: string; block: Block }> {
    try {
      const result = await eventSourcedBlockService.createBlock({
        project_id: params.projectId,
        title: params.title,
        content: params.content || '',
        lane: params.lane as any,
        priority: (params.priority as any) || 'medium',
        tags: params.tags || []
      })

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to create block')
      }

      // Track in session if active
      if (this.activeSession) {
        await sessionTracker.trackActivity(this.activeSession, {
          type: 'block_created',
          blockId: result.data.id,
          timestamp: new Date().toISOString(),
          metadata: { title: params.title, lane: params.lane }
        })
      }

      // Auto-inject to Claude context if requested
      if (params.autoInject) {
        await this.injectBlockToClaudeCode(result.data)
      }

      return {
        blockId: result.data.id,
        block: result.data
      }
    } catch (error: any) {
      throw new Error(`Failed to create block: ${error.message}`)
    }
  }

  // Update block via MCP
  async handleBlockUpdate(params: {
    blockId: string
    updates: any
    trackProgress?: boolean
  }): Promise<{ block: Block }> {
    try {
      const result = await eventSourcedBlockService.updateBlock(params.blockId, params.updates)

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to update block')
      }

      // Track in session if active
      if (this.activeSession && params.trackProgress) {
        await sessionTracker.trackActivity(this.activeSession, {
          type: 'block_updated',
          blockId: params.blockId,
          timestamp: new Date().toISOString(),
          metadata: { changes: params.updates }
        })
      }

      return { block: result.data }
    } catch (error: any) {
      throw new Error(`Failed to update block: ${error.message}`)
    }
  }

  // Move block via MCP
  async handleBlockMove(params: {
    blockId: string
    toLane: string
    reason?: string
  }): Promise<{ block: Block }> {
    try {
      const result = await eventSourcedBlockService.moveBlock(params.blockId, params.toLane)

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to move block')
      }

      // Track in session if active
      if (this.activeSession) {
        await sessionTracker.trackActivity(this.activeSession, {
          type: 'block_moved',
          blockId: params.blockId,
          timestamp: new Date().toISOString(),
          metadata: { toLane: params.toLane, reason: params.reason }
        })
      }

      return { block: result.data }
    } catch (error: any) {
      throw new Error(`Failed to move block: ${error.message}`)
    }
  }

  // Get AI suggestions
  async handleSuggestionsGet(params: {
    projectId: string
    type: 'stale' | 'ready_to_move' | 'stuck' | 'completion_opportunity' | 'all'
    includeReasons?: boolean
  }): Promise<any[]> {
    try {
      // This would integrate with an AI suggestion system
      // For now, return placeholder suggestions based on events
      const events = await eventStore.getProjectEvents(params.projectId)
      
      // Analyze events to generate suggestions
      const suggestions = []
      
      // Example: Find stale blocks (no recent activity)
      if (params.type === 'stale' || params.type === 'all') {
        const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const staleBlocks = events.filter(e => 
          e.type === 'BlockCreated' && 
          new Date(e.timestamp) < staleThreshold &&
          !events.some(ue => 
            ue.type === 'BlockUpdated' && 
            ue.aggregateId === e.aggregateId &&
            new Date(ue.timestamp) > staleThreshold
          )
        )
        
        suggestions.push(...staleBlocks.map(block => ({
          type: 'stale_block',
          blockId: block.aggregateId,
          title: block.data.title,
          reason: 'No activity in the last 7 days',
          suggestion: 'Consider updating status or breaking into smaller tasks',
          confidence: 0.8
        })))
      }

      return suggestions
    } catch (error: any) {
      throw new Error(`Failed to get suggestions: ${error.message}`)
    }
  }

  // Get project analytics
  async handleAnalyticsGet(params: {
    projectId: string
    timeframe: 'day' | 'week' | 'month'
    includeEvents?: boolean
  }): Promise<any> {
    try {
      // Get events for analytics
      const events = await eventStore.getProjectEvents(params.projectId)
      
      // Calculate analytics
      const analytics = {
        totalEvents: events.length,
        eventsByType: this.groupEventsByType(events),
        eventsByDay: this.groupEventsByDay(events, params.timeframe),
        productivity: this.calculateProductivityMetrics(events),
        insights: this.calculateInsightMetrics(events),
        blockFlow: this.calculateBlockFlowMetrics(events)
      }

      if (params.includeEvents) {
        analytics.events = events.slice(0, 100) // Latest 100 events
      }

      return analytics
    } catch (error: any) {
      throw new Error(`Failed to get analytics: ${error.message}`)
    }
  }

  // Replay project history
  async handleHistoryReplay(params: {
    projectId: string
    fromTimestamp?: string
    toTimestamp?: string
    eventTypes?: string[]
  }): Promise<any[]> {
    try {
      let events = await eventStore.getProjectEvents(params.projectId)
      
      // Filter by timestamp
      if (params.fromTimestamp) {
        events = events.filter(e => e.timestamp >= params.fromTimestamp!)
      }
      if (params.toTimestamp) {
        events = events.filter(e => e.timestamp <= params.toTimestamp!)
      }
      
      // Filter by event types
      if (params.eventTypes?.length) {
        events = events.filter(e => params.eventTypes!.includes(e.type))
      }

      // Format for replay
      return events.map(event => ({
        timestamp: event.timestamp,
        type: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        description: this.getEventDescription(event),
        data: event.data
      }))
    } catch (error: any) {
      throw new Error(`Failed to replay history: ${error.message}`)
    }
  }

  // Helper methods
  private async getProjectContext(
    projectId: string,
    includeHistory: boolean = false,
    includeInsights: boolean = true,
    includeAnalytics: boolean = false,
    compressionLevel: 'none' | 'light' | 'aggressive' = 'none'
  ): Promise<MCPProjectContext> {
    // Implementation would gather all project context
    // This is a simplified version
    return {
      projectId,
      projectName: 'Project',
      blocks: { total: 0, byLane: {}, byStatus: {}, byPriority: {} },
      recentActivity: [],
      insights: [],
      contextItems: []
    }
  }

  private async injectContextToClaudeCode(context: MCPProjectContext): Promise<void> {
    // This would send context to Claude Code via MCP
    console.log('Injecting context to Claude Code:', context)
  }

  private async injectBlockToClaudeCode(block: Block): Promise<void> {
    // This would send block info to Claude Code
    console.log('Injecting block to Claude Code:', block)
  }

  private async broadcastEventToClaudeCodes(event: any): Promise<void> {
    // This would broadcast events to all connected Claude Code instances
    console.log('Broadcasting event to Claude Code instances:', event)
  }

  private groupEventsByType(events: any[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {})
  }

  private groupEventsByDay(events: any[], timeframe: string): Record<string, number> {
    return events.reduce((acc, event) => {
      const day = event.timestamp.split('T')[0]
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})
  }

  private calculateProductivityMetrics(events: any[]): any {
    const blocksCreated = events.filter(e => e.type === 'BlockCreated').length
    const blocksCompleted = events.filter(e => e.type === 'BlockCompleted').length
    const sessionsCount = events.filter(e => e.type === 'SessionStarted').length
    
    return {
      blocksCreated,
      blocksCompleted,
      completionRate: blocksCreated > 0 ? blocksCompleted / blocksCreated : 0,
      sessionsCount,
      avgBlocksPerSession: sessionsCount > 0 ? blocksCreated / sessionsCount : 0
    }
  }

  private calculateInsightMetrics(events: any[]): any {
    const insights = events.filter(e => e.type === 'InsightCaptured')
    return {
      total: insights.length,
      byType: this.groupEventsByType(insights),
      byImportance: insights.reduce((acc, insight) => {
        const importance = insight.data.importance
        acc[importance] = (acc[importance] || 0) + 1
        return acc
      }, {})
    }
  }

  private calculateBlockFlowMetrics(events: any[]): any {
    const moves = events.filter(e => e.type === 'BlockMoved')
    return {
      totalMoves: moves.length,
      laneTransitions: moves.reduce((acc, move) => {
        const transition = `${move.data.fromLane} → ${move.data.toLane}`
        acc[transition] = (acc[transition] || 0) + 1
        return acc
      }, {}),
      avgMovesPerBlock: moves.length // This would need more complex calculation
    }
  }

  private getEventDescription(event: any): string {
    switch (event.type) {
      case 'BlockCreated': return `Created: ${event.data.title}`
      case 'BlockMoved': return `Moved from ${event.data.fromLane} to ${event.data.toLane}`
      case 'InsightCaptured': return `Insight: ${event.data.title}`
      default: return event.type
    }
  }

  // Cleanup
  disconnect(): void {
    this.isConnected = false
    this.activeSession = null
    this.eventSubscriptions.forEach(unsubscribe => unsubscribe())
    this.eventSubscriptions = []
  }
}

// Singleton orchestrator instance
export const mcpOrchestrator = new MCPOrchestrator()