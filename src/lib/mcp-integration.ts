// MCP (Model Context Protocol) Integration Layer
// This prepares the system for Phase 5 MCP server integration

import type { 
  SessionSummary, 
  CapturedInsight, 
  SessionActivity,
  ActiveSession 
} from './session-tracker'
import type { Block, Project, ContextItem } from './database.types'

// MCP Message Types (based on MCP specification)
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface MCPNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

// Frizy-specific MCP methods
export type FrizyMCPMethod = 
  | 'frizy/session/start'
  | 'frizy/session/end' 
  | 'frizy/session/activity'
  | 'frizy/insight/capture'
  | 'frizy/context/get'
  | 'frizy/context/update'
  | 'frizy/block/create'
  | 'frizy/block/update'
  | 'frizy/block/move'
  | 'frizy/suggestions/get'
  | 'frizy/summary/generate'

// Project context for MCP
export interface MCPProjectContext {
  projectId: string
  projectName: string
  blocks: {
    total: number
    byLane: Record<string, number>
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
  recentActivity: SessionActivity[]
  activeSession?: {
    id: string
    duration: number
    blocksInFocus: string[]
  }
  insights: CapturedInsight[]
  contextItems: Partial<ContextItem>[]
}

// MCP Tool definitions for Claude
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

// Frizy tools available to Claude via MCP
export const FRIZY_MCP_TOOLS: MCPTool[] = [
  {
    name: 'frizy_start_session',
    description: 'Start a new Claude session for tracking work and insights',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID of the project to track' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'frizy_capture_insight',
    description: 'Capture an insight, decision, or learning from the current session',
    inputSchema: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['decision', 'problem_solution', 'idea', 'learning', 'blocker', 'next_step'],
          description: 'Type of insight being captured'
        },
        title: { type: 'string', description: 'Brief title for the insight' },
        content: { type: 'string', description: 'Detailed content or explanation' },
        relatedBlockIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'IDs of blocks related to this insight'
        },
        importance: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Importance level of this insight'
        }
      },
      required: ['type', 'title', 'content']
    }
  },
  {
    name: 'frizy_get_context',
    description: 'Get the current project context including blocks, insights, and activity',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID of the project' },
        includeHistory: { 
          type: 'boolean', 
          description: 'Whether to include historical sessions and insights',
          default: false
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'frizy_create_block',
    description: 'Create a new block in the project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID of the project' },
        title: { type: 'string', description: 'Title of the block' },
        content: { type: 'string', description: 'Content/description of the block' },
        lane: {
          type: 'string',
          enum: ['vision', 'goals', 'current', 'next', 'context'],
          description: 'Which swim lane to place the block in'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level of the block'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to categorize the block'
        }
      },
      required: ['projectId', 'title', 'lane']
    }
  },
  {
    name: 'frizy_update_block',
    description: 'Update an existing block',
    inputSchema: {
      type: 'object',
      properties: {
        blockId: { type: 'string', description: 'ID of the block to update' },
        updates: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'blocked', 'completed', 'archived']
            },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent']
            }
          },
          description: 'Fields to update on the block'
        }
      },
      required: ['blockId', 'updates']
    }
  },
  {
    name: 'frizy_get_suggestions',
    description: 'Get AI-powered suggestions for project organization and next steps',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID of the project' },
        type: {
          type: 'string',
          enum: ['all', 'stale', 'ready_to_move', 'stuck', 'completion_opportunity'],
          description: 'Type of suggestions to get',
          default: 'all'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'frizy_end_session',
    description: 'End the current session and generate a summary',
    inputSchema: {
      type: 'object',
      properties: {
        generateSummary: {
          type: 'boolean',
          description: 'Whether to generate a session summary',
          default: true
        }
      }
    }
  }
]

// MCP Message handlers interface
export interface MCPHandlers {
  [key: string]: (params: any) => Promise<any>
}

// MCP Integration class for future server connection
export class MCPIntegration {
  private isConnected = false
  private serverUrl?: string
  private handlers: MCPHandlers = {}
  private messageId = 0

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl
    this.setupHandlers()
  }

  // Setup message handlers for Frizy-specific methods
  private setupHandlers(): void {
    this.handlers = {
      'frizy/session/start': this.handleSessionStart.bind(this),
      'frizy/session/end': this.handleSessionEnd.bind(this),
      'frizy/session/activity': this.handleSessionActivity.bind(this),
      'frizy/insight/capture': this.handleInsightCapture.bind(this),
      'frizy/context/get': this.handleContextGet.bind(this),
      'frizy/context/update': this.handleContextUpdate.bind(this),
      'frizy/block/create': this.handleBlockCreate.bind(this),
      'frizy/block/update': this.handleBlockUpdate.bind(this),
      'frizy/block/move': this.handleBlockMove.bind(this),
      'frizy/suggestions/get': this.handleSuggestionsGet.bind(this),
      'frizy/summary/generate': this.handleSummaryGenerate.bind(this)
    }
  }

  // Connect to MCP server (Phase 5)
  async connect(): Promise<boolean> {
    if (!this.serverUrl) {
      console.warn('No MCP server URL configured')
      return false
    }

    try {
      // TODO: Implement actual WebSocket/HTTP connection to MCP server
      console.log(`Connecting to MCP server at ${this.serverUrl}`)
      this.isConnected = true
      return true
    } catch (error) {
      console.error('Failed to connect to MCP server:', error)
      return false
    }
  }

  // Send MCP request
  async sendRequest(method: FrizyMCPMethod, params?: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to MCP server')
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      method,
      params
    }

    // TODO: Implement actual message sending to MCP server
    console.log('Sending MCP request:', request)
    
    // For now, handle locally
    const handler = this.handlers[method]
    if (handler) {
      return await handler(params)
    }

    throw new Error(`No handler for method: ${method}`)
  }

  // Send MCP notification
  sendNotification(method: FrizyMCPMethod, params?: any): void {
    if (!this.isConnected) return

    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params
    }

    // TODO: Implement actual notification sending
    console.log('Sending MCP notification:', notification)
  }

  // Message handlers (these will interface with actual Frizy functions)
  private async handleSessionStart(params: { projectId: string }): Promise<{ sessionId: string }> {
    // TODO: Interface with sessionTracker.startSession()
    console.log('MCP: Starting session for project', params.projectId)
    return { sessionId: `session-${Date.now()}` }
  }

  private async handleSessionEnd(params: { generateSummary?: boolean }): Promise<SessionSummary | null> {
    // TODO: Interface with sessionTracker.endSession()
    console.log('MCP: Ending session')
    return null
  }

  private async handleSessionActivity(params: SessionActivity): Promise<void> {
    // TODO: Interface with sessionTracker.trackActivity()
    console.log('MCP: Tracking activity', params)
  }

  private async handleInsightCapture(params: Omit<CapturedInsight, 'id' | 'timestamp' | 'sessionId'>): Promise<CapturedInsight> {
    // TODO: Interface with sessionTracker.captureInsight()
    console.log('MCP: Capturing insight', params)
    return {
      ...params,
      id: `insight-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sessionId: 'current-session',
      relatedBlockIds: params.relatedBlockIds || [],
      tags: params.tags || []
    }
  }

  private async handleContextGet(params: { projectId: string; includeHistory?: boolean }): Promise<MCPProjectContext> {
    // TODO: Interface with context management system
    console.log('MCP: Getting context for project', params.projectId)
    return {
      projectId: params.projectId,
      projectName: 'Project',
      blocks: {
        total: 0,
        byLane: {},
        byStatus: {},
        byPriority: {}
      },
      recentActivity: [],
      insights: [],
      contextItems: []
    }
  }

  private async handleContextUpdate(params: { projectId: string; context: any }): Promise<void> {
    // TODO: Interface with context management system
    console.log('MCP: Updating context', params)
  }

  private async handleBlockCreate(params: any): Promise<{ blockId: string }> {
    // TODO: Interface with block creation system
    console.log('MCP: Creating block', params)
    return { blockId: `block-${Date.now()}` }
  }

  private async handleBlockUpdate(params: { blockId: string; updates: any }): Promise<void> {
    // TODO: Interface with block update system
    console.log('MCP: Updating block', params.blockId, params.updates)
  }

  private async handleBlockMove(params: { blockId: string; toLane: string }): Promise<void> {
    // TODO: Interface with block movement system
    console.log('MCP: Moving block', params.blockId, 'to', params.toLane)
  }

  private async handleSuggestionsGet(params: { projectId: string; type?: string }): Promise<any[]> {
    // TODO: Interface with suggestions system
    console.log('MCP: Getting suggestions', params)
    return []
  }

  private async handleSummaryGenerate(params: any): Promise<SessionSummary> {
    // TODO: Interface with summary generation
    console.log('MCP: Generating summary', params)
    return {} as SessionSummary
  }

  // Utility methods for MCP tool registration
  getToolDefinitions(): MCPTool[] {
    return FRIZY_MCP_TOOLS
  }

  // Check connection status
  isConnectedToServer(): boolean {
    return this.isConnected
  }

  // Disconnect from server
  disconnect(): void {
    this.isConnected = false
    console.log('Disconnected from MCP server')
  }
}

// Export utilities for MCP integration
export function createMCPProjectContext(
  project: Project,
  blocks: Block[],
  session?: ActiveSession,
  insights?: CapturedInsight[]
): MCPProjectContext {
  const blocksByLane = blocks.reduce((acc, block) => {
    acc[block.lane] = (acc[block.lane] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const blocksByStatus = blocks.reduce((acc, block) => {
    acc[block.status] = (acc[block.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const blocksByPriority = blocks.reduce((acc, block) => {
    acc[block.priority] = (acc[block.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    projectId: project.id,
    projectName: project.name,
    blocks: {
      total: blocks.length,
      byLane: blocksByLane,
      byStatus: blocksByStatus,
      byPriority: blocksByPriority
    },
    recentActivity: session?.activities || [],
    activeSession: session ? {
      id: session.id,
      duration: Math.round((Date.now() - new Date(session.startTime).getTime()) / (1000 * 60)),
      blocksInFocus: Array.from(session.blocksInFocus)
    } : undefined,
    insights: insights || [],
    contextItems: []
  }
}

// Export MCP method names for use in components
export const MCP_METHODS = {
  SESSION_START: 'frizy/session/start' as const,
  SESSION_END: 'frizy/session/end' as const,
  SESSION_ACTIVITY: 'frizy/session/activity' as const,
  INSIGHT_CAPTURE: 'frizy/insight/capture' as const,
  CONTEXT_GET: 'frizy/context/get' as const,
  CONTEXT_UPDATE: 'frizy/context/update' as const,
  BLOCK_CREATE: 'frizy/block/create' as const,
  BLOCK_UPDATE: 'frizy/block/update' as const,
  BLOCK_MOVE: 'frizy/block/move' as const,
  SUGGESTIONS_GET: 'frizy/suggestions/get' as const,
  SUMMARY_GENERATE: 'frizy/summary/generate' as const
} as const

// Singleton MCP integration instance
export const mcpIntegration = new MCPIntegration()