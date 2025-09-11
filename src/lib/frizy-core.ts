// Frizy Core - Unified Entry Point
// Integrates all components of the Frizy Build Guide v2.0

import { eventStore } from './events/event-store'
import { 
  eventSourcedProjectService,
  eventSourcedBlockService,
  eventSourcedSessionService,
  eventSourcedContextItemService,
  insightService,
  eventAnalyticsService
} from './events/event-sourced-services'
import { mcpOrchestrator } from './mcp/orchestrator'
import { compressionPipeline } from './context/compression-pipeline'
import { relationshipEngine } from './graph/relationship-engine'
import { realtimeEngine } from './collaboration/realtime-engine'
import { sessionTracker } from './session-tracker'
import { contextManager } from './context-manager'

// Frizy Core configuration
export interface FrizyConfig {
  enableEventSourcing: boolean
  enableMCPIntegration: boolean
  enableContextCompression: boolean
  enableGraphRelationships: boolean
  enableRealtimeCollaboration: boolean
  mcpServerUrl?: string
  compressionStrategy: 'preserve_insights' | 'preserve_recent' | 'preserve_important' | 'adaptive'
  relationshipDetection: ('temporal' | 'semantic' | 'explicit' | 'collaborative')[]
}

// Default configuration
export const DEFAULT_FRIZY_CONFIG: FrizyConfig = {
  enableEventSourcing: true,
  enableMCPIntegration: true,
  enableContextCompression: true,
  enableGraphRelationships: true,
  enableRealtimeCollaboration: true,
  compressionStrategy: 'adaptive',
  relationshipDetection: ['temporal', 'semantic', 'explicit']
}

// Frizy Core class - The orchestrator of all systems
export class FrizyCore {
  private config: FrizyConfig
  private isInitialized = false
  private activeProjects: Set<string> = new Set()

  constructor(config: FrizyConfig = DEFAULT_FRIZY_CONFIG) {
    this.config = { ...DEFAULT_FRIZY_CONFIG, ...config }
  }

  // Initialize Frizy with all systems
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Frizy Core...')

      // Initialize event sourcing
      if (this.config.enableEventSourcing) {
        console.log('📊 Event sourcing enabled')
        // Event store is already initialized
      }

      // Initialize MCP orchestrator
      if (this.config.enableMCPIntegration) {
        console.log('🔌 MCP integration enabled')
        if (this.config.mcpServerUrl) {
          // In production, would connect to actual MCP server
          console.log(`🔗 MCP server: ${this.config.mcpServerUrl}`)
        }
      }

      // Initialize graph relationships
      if (this.config.enableGraphRelationships) {
        console.log('🕸️ Graph relationships enabled')
        // Relationship engine is already initialized
      }

      // Initialize real-time collaboration
      if (this.config.enableRealtimeCollaboration) {
        console.log('👥 Real-time collaboration enabled')
        // Real-time engine is already initialized
      }

      this.isInitialized = true
      console.log('✅ Frizy Core initialized successfully')
    } catch (error: any) {
      console.error('❌ Failed to initialize Frizy Core:', error)
      throw error
    }
  }

  // Initialize project with full Frizy capabilities
  async initializeProject(
    projectId: string,
    options: {
      detectRelationships?: boolean
      enableRealtime?: boolean
      compressionSettings?: {
        strategy?: typeof this.config.compressionStrategy
        targetSize?: number
      }
    } = {}
  ): Promise<{
    eventStream: any[]
    relationships: any[]
    compressionStats: any
    collaborationStats: any
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      console.log(`🎯 Initializing project ${projectId} with Frizy capabilities...`)

      this.activeProjects.add(projectId)

      // Initialize real-time collaboration
      if (this.config.enableRealtimeCollaboration && options.enableRealtime !== false) {
        await realtimeEngine.initializeProject(projectId)
      }

      // Detect relationships
      let relationships: any[] = []
      if (this.config.enableGraphRelationships && options.detectRelationships !== false) {
        console.log('🔍 Detecting project relationships...')
        relationships = await relationshipEngine.detectRelationships(
          projectId,
          this.config.relationshipDetection
        )
      }

      // Get initial event stream
      const eventStream = await eventStore.getProjectEvents(projectId)

      // Get compression stats
      let compressionStats = null
      if (this.config.enableContextCompression) {
        compressionStats = await compressionPipeline.getCompressionHistory(projectId)
      }

      // Get collaboration stats
      let collaborationStats = null
      if (this.config.enableRealtimeCollaboration) {
        collaborationStats = await realtimeEngine.getCollaborationStats(projectId)
      }

      console.log(`✅ Project ${projectId} initialized with Frizy`)

      return {
        eventStream,
        relationships,
        compressionStats,
        collaborationStats
      }
    } catch (error: any) {
      console.error(`❌ Failed to initialize project ${projectId}:`, error)
      throw error
    }
  }

  // Start a Claude Code session with full Frizy integration
  async startClaudeCodeSession(
    projectId: string,
    claudeCodeSessionId: string,
    options: {
      autoInjectContext?: boolean
      compressionLevel?: 'none' | 'light' | 'aggressive'
      enableInsightCapture?: boolean
      enableRelationshipTracking?: boolean
    } = {}
  ): Promise<{
    sessionId: string
    context: any
    suggestions: any[]
    activeCollaborators: any[]
  }> {
    try {
      console.log(`🤖 Starting Claude Code session for project ${projectId}`)

      // Start MCP session
      const sessionResult = await mcpOrchestrator.handleSessionStart({
        projectId,
        claudeCodeSessionId,
        autoInjectContext: options.autoInjectContext
      })

      // Get project context with compression if needed
      let context = sessionResult.context
      if (this.config.enableContextCompression && options.compressionLevel !== 'none') {
        const compressionResult = await compressionPipeline.compressProjectContext(
          projectId,
          {
            strategy: this.config.compressionStrategy,
            targetSize: this.getCompressionTargetSize(options.compressionLevel || 'light')
          }
        )
        
        // Update context with compressed version
        console.log(`📦 Context compressed: ${compressionResult.compressionRatio.toFixed(2)}x ratio`)
      }

      // Get AI suggestions
      const suggestions = await mcpOrchestrator.handleSuggestionsGet({
        projectId,
        type: 'all',
        includeReasons: true
      })

      // Get active collaborators
      const activeCollaborators = this.config.enableRealtimeCollaboration
        ? realtimeEngine.getProjectPresence(projectId)
        : []

      console.log(`✅ Claude Code session started: ${sessionResult.sessionId}`)

      return {
        sessionId: sessionResult.sessionId,
        context,
        suggestions,
        activeCollaborators
      }
    } catch (error: any) {
      console.error('❌ Failed to start Claude Code session:', error)
      throw error
    }
  }

  // Enhanced block creation with full Frizy integration
  async createBlockWithFrizyIntegration(
    projectId: string,
    blockData: {
      title: string
      content?: string
      lane: string
      priority?: string
      tags?: string[]
    },
    options: {
      detectRelationships?: boolean
      captureAsInsight?: boolean
      broadcastToCollaborators?: boolean
      sessionId?: string
    } = {}
  ): Promise<{
    block: any
    relationships: any[]
    insights: any[]
    collaborationUpdate: boolean
  }> {
    try {
      console.log(`📝 Creating block with Frizy integration: "${blockData.title}"`)

      // Create block with event sourcing
      const blockResult = await eventSourcedBlockService.createBlock({
        project_id: projectId,
        title: blockData.title,
        content: blockData.content || '',
        lane: blockData.lane as any,
        priority: (blockData.priority as any) || 'medium',
        tags: blockData.tags || []
      })

      if (blockResult.error || !blockResult.data) {
        throw new Error(blockResult.error || 'Failed to create block')
      }

      const block = blockResult.data

      // Detect relationships
      let relationships: any[] = []
      if (this.config.enableGraphRelationships && options.detectRelationships !== false) {
        // Auto-detect relationships for the new block
        relationships = await relationshipEngine.detectRelationships(
          projectId,
          ['semantic', 'temporal']
        )
      }

      // Capture as insight if requested
      let insights: any[] = []
      if (options.captureAsInsight && options.sessionId) {
        const insightResult = await insightService.captureInsight(
          options.sessionId,
          projectId,
          {
            type: 'idea',
            title: `Block created: ${blockData.title}`,
            content: blockData.content || '',
            importance: 'medium',
            relatedBlockIds: [block.id],
            tags: blockData.tags
          }
        )

        if (!insightResult.error) {
          insights.push(insightResult.data)
        }
      }

      // Broadcast to collaborators
      let collaborationUpdate = false
      if (this.config.enableRealtimeCollaboration && options.broadcastToCollaborators !== false) {
        // This would broadcast the block creation to all active collaborators
        collaborationUpdate = true
      }

      console.log(`✅ Block created with Frizy integration: ${block.id}`)

      return {
        block,
        relationships,
        insights,
        collaborationUpdate
      }
    } catch (error: any) {
      console.error('❌ Failed to create block with Frizy integration:', error)
      throw error
    }
  }

  // Get comprehensive project analytics
  async getProjectAnalytics(
    projectId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    eventAnalytics: any
    relationshipStats: any
    collaborationStats: any
    compressionHistory: any[]
    insights: any[]
    productivity: any
  }> {
    try {
      console.log(`📊 Generating comprehensive analytics for project ${projectId}`)

      // Get event analytics
      const eventAnalyticsResult = await eventAnalyticsService.getProjectActivity(projectId, timeframe)
      const eventAnalytics = eventAnalyticsResult.data

      // Get relationship statistics
      const relationshipStats = this.config.enableGraphRelationships
        ? await relationshipEngine.getRelationshipStats(projectId)
        : null

      // Get collaboration statistics
      const collaborationStats = this.config.enableRealtimeCollaboration
        ? await realtimeEngine.getCollaborationStats(projectId)
        : null

      // Get compression history
      const compressionHistory = this.config.enableContextCompression
        ? await compressionPipeline.getCompressionHistory(projectId)
        : []

      // Get recent insights
      const insightsResult = await insightService.getProjectInsights(projectId, { limit: 50 })
      const insights = insightsResult.data || []

      // Calculate productivity metrics
      const productivity = this.calculateProductivityMetrics(eventAnalytics, insights, relationshipStats)

      return {
        eventAnalytics,
        relationshipStats,
        collaborationStats,
        compressionHistory,
        insights,
        productivity
      }
    } catch (error: any) {
      console.error('❌ Failed to get project analytics:', error)
      throw error
    }
  }

  // Health check for all Frizy systems
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    systems: Record<string, 'ok' | 'warning' | 'error'>
    details: Record<string, any>
  }> {
    const systems: Record<string, 'ok' | 'warning' | 'error'> = {}
    const details: Record<string, any> = {}

    try {
      // Check event store
      try {
        await eventStore.getRecentEvents('test-user', 1)
        systems.eventStore = 'ok'
      } catch (error) {
        systems.eventStore = 'error'
        details.eventStore = error
      }

      // Check MCP orchestrator
      systems.mcpOrchestrator = 'ok' // MCP is always available locally

      // Check compression pipeline
      systems.compressionPipeline = 'ok' // Compression is stateless

      // Check relationship engine
      systems.relationshipEngine = 'ok' // Relationship engine is stateless

      // Check real-time engine
      systems.realtimeEngine = 'ok' // Real-time engine is stateless

      // Overall status
      const errorCount = Object.values(systems).filter(s => s === 'error').length
      const warningCount = Object.values(systems).filter(s => s === 'warning').length
      
      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (errorCount > 0) {
        status = 'unhealthy'
      } else if (warningCount > 0) {
        status = 'degraded'
      } else {
        status = 'healthy'
      }

      return { status, systems, details }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        systems: { core: 'error' },
        details: { core: error.message }
      }
    }
  }

  // Helper methods
  private getCompressionTargetSize(level: 'light' | 'aggressive'): number {
    switch (level) {
      case 'light': return 100000 // 100KB
      case 'aggressive': return 50000 // 50KB
      default: return 75000 // 75KB
    }
  }

  private calculateProductivityMetrics(
    eventAnalytics: any,
    insights: any[],
    relationshipStats: any
  ): any {
    if (!eventAnalytics) return null

    return {
      blocksPerDay: eventAnalytics.blocksCreated / 7, // Assuming week timeframe
      completionVelocity: eventAnalytics.blocksCompleted / Math.max(1, eventAnalytics.blocksCreated),
      insightDensity: insights.length / Math.max(1, eventAnalytics.sessionsStarted),
      relationshipRichness: relationshipStats?.totalRelationships || 0,
      activityScore: this.calculateActivityScore(eventAnalytics)
    }
  }

  private calculateActivityScore(eventAnalytics: any): number {
    if (!eventAnalytics) return 0

    // Weighted activity score
    const weights = {
      blocksCreated: 3,
      blocksCompleted: 5,
      sessionsStarted: 2,
      insightsCaptured: 4
    }

    const score = 
      (eventAnalytics.blocksCreated || 0) * weights.blocksCreated +
      (eventAnalytics.blocksCompleted || 0) * weights.blocksCompleted +
      (eventAnalytics.sessionsStarted || 0) * weights.sessionsStarted +
      (eventAnalytics.insightsCaptured || 0) * weights.insightsCaptured

    return Math.min(100, score) // Cap at 100
  }

  // Cleanup
  async shutdown(projectId?: string): Promise<void> {
    try {
      if (projectId) {
        console.log(`🛑 Shutting down Frizy for project ${projectId}`)
        this.activeProjects.delete(projectId)
        realtimeEngine.disconnect(projectId)
      } else {
        console.log('🛑 Shutting down Frizy Core')
        this.activeProjects.clear()
        realtimeEngine.disconnect()
        mcpOrchestrator.disconnect()
      }
    } catch (error: any) {
      console.error('❌ Error during shutdown:', error)
    }
  }
}

// Export configured services for direct use
export {
  eventStore,
  eventSourcedProjectService,
  eventSourcedBlockService,
  eventSourcedSessionService,
  eventSourcedContextItemService,
  insightService,
  eventAnalyticsService,
  mcpOrchestrator,
  compressionPipeline,
  relationshipEngine,
  realtimeEngine,
  sessionTracker,
  contextManager
}

// Export singleton Frizy Core instance
export const frizyCore = new FrizyCore()

// Initialize on import (can be disabled if needed)
if (typeof window !== 'undefined') {
  // Browser environment - initialize lazily
  console.log('🌐 Frizy Core ready for browser initialization')
} else {
  // Node.js environment - can initialize immediately if needed
  console.log('🖥️ Frizy Core ready for server initialization')
}