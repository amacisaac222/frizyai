// Event-sourced service layer
// Wraps existing database operations with event sourcing

import { eventStore, createEvent } from './event-store'
import { blockService, projectService, sessionService, contextItemService } from '../database'
import type { 
  Project, 
  ProjectInsert, 
  ProjectUpdate,
  Block, 
  BlockInsert, 
  BlockUpdate,
  Session,
  SessionInsert,
  SessionUpdate,
  ContextItem,
  ContextItemInsert,
  ContextItemUpdate,
  ApiResponse 
} from '../database.types'

// Event-sourced project service
export const eventSourcedProjectService = {
  async createProject(project: ProjectInsert): Promise<ApiResponse<Project>> {
    try {
      // Create project using existing service
      const result = await projectService.createProject(project)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        result.data.id,
        'project',
        'ProjectCreated',
        {
          name: result.data.name,
          description: result.data.description,
          mood: result.data.mood,
          settings: result.data.settings
        },
        {
          createdAt: result.data.created_at,
          userId: result.data.user_id
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  async updateProject(id: string, updates: ProjectUpdate): Promise<ApiResponse<Project>> {
    try {
      // Get current state for comparison
      const currentResult = await projectService.getProject(id)
      if (currentResult.error || !currentResult.data) {
        return currentResult
      }

      // Update project using existing service
      const result = await projectService.updateProject(id, updates)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        id,
        'project',
        'ProjectUpdated',
        {
          changes: updates,
          previousState: {
            name: currentResult.data.name,
            description: currentResult.data.description,
            mood: currentResult.data.mood,
            is_active: currentResult.data.is_active
          },
          newState: {
            name: result.data.name,
            description: result.data.description,
            mood: result.data.mood,
            is_active: result.data.is_active
          }
        },
        {
          updatedAt: result.data.updated_at
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  // Delegate other methods to existing service
  ...projectService
}

// Event-sourced block service
export const eventSourcedBlockService = {
  async createBlock(block: BlockInsert): Promise<ApiResponse<Block>> {
    try {
      // Create block using existing service
      const result = await blockService.createBlock(block)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        result.data.id,
        'block',
        'BlockCreated',
        {
          projectId: result.data.project_id,
          title: result.data.title,
          content: result.data.content,
          lane: result.data.lane,
          priority: result.data.priority,
          energyLevel: result.data.energy_level,
          complexity: result.data.complexity,
          tags: result.data.tags
        },
        {
          createdAt: result.data.created_at,
          createdBy: result.data.created_by
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  async moveBlock(id: string, newLane: string): Promise<ApiResponse<Block>> {
    try {
      // Get current block state
      const currentResult = await blockService.getBlock(id)
      if (currentResult.error || !currentResult.data) {
        return currentResult
      }

      const currentBlock = currentResult.data

      // Move block using existing service
      const result = await blockService.moveBlock(id, newLane)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        id,
        'block',
        'BlockMoved',
        {
          projectId: currentBlock.project_id,
          fromLane: currentBlock.lane,
          toLane: newLane,
          reason: 'user_action'
        },
        {
          movedAt: result.data.updated_at,
          previousStatus: currentBlock.status,
          newStatus: result.data.status
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  async updateBlock(id: string, updates: BlockUpdate): Promise<ApiResponse<Block>> {
    try {
      // Get current state
      const currentResult = await blockService.getBlock(id)
      if (currentResult.error || !currentResult.data) {
        return currentResult
      }

      const currentBlock = currentResult.data

      // Update block using existing service
      const result = await blockService.updateBlock(id, updates)
      if (result.error || !result.data) {
        return result
      }

      // Determine event type based on changes
      let eventType: 'BlockUpdated' | 'BlockCompleted' = 'BlockUpdated'
      if (updates.status === 'completed' && currentBlock.status !== 'completed') {
        eventType = 'BlockCompleted'
      }

      // Append event
      await eventStore.appendEvent(
        id,
        'block',
        eventType,
        {
          projectId: currentBlock.project_id,
          changes: updates,
          previousState: {
            title: currentBlock.title,
            content: currentBlock.content,
            status: currentBlock.status,
            progress: currentBlock.progress,
            priority: currentBlock.priority
          },
          newState: {
            title: result.data.title,
            content: result.data.content,
            status: result.data.status,
            progress: result.data.progress,
            priority: result.data.priority
          }
        },
        {
          updatedAt: result.data.updated_at,
          lastWorked: result.data.last_worked
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  // Delegate other methods to existing service
  ...blockService
}

// Event-sourced session service
export const eventSourcedSessionService = {
  async createSession(session: SessionInsert): Promise<ApiResponse<Session>> {
    try {
      // Create session using existing service
      const result = await sessionService.createSession(session)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        result.data.id,
        'session',
        'SessionStarted',
        {
          projectId: result.data.project_id,
          sessionId: result.data.session_id,
          contextAtStart: result.data.context_at_start,
          mcpStatus: result.data.mcp_status
        },
        {
          startedAt: result.data.started_at,
          userId: result.data.user_id
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  async endSession(
    id: string, 
    endData: {
      context_at_end?: any
      duration_minutes?: number
      insights?: string[]
      achievements?: string[]
      next_steps?: string[]
    }
  ): Promise<ApiResponse<Session>> {
    try {
      // End session using existing service
      const result = await sessionService.endSession(id, endData)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        id,
        'session',
        'SessionEnded',
        {
          projectId: result.data.project_id,
          sessionId: result.data.session_id,
          contextAtEnd: result.data.context_at_end,
          duration: result.data.duration_minutes,
          insights: result.data.insights,
          achievements: result.data.achievements,
          nextSteps: result.data.next_steps,
          blocksCreated: result.data.blocks_created,
          blocksModified: result.data.blocks_modified,
          messagesCount: result.data.messages_count,
          tokensUsed: result.data.tokens_used
        },
        {
          endedAt: result.data.ended_at,
          mcpStatus: result.data.mcp_status
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  // Delegate other methods to existing service
  ...sessionService
}

// Event-sourced context item service
export const eventSourcedContextItemService = {
  async createContextItem(item: ContextItemInsert): Promise<ApiResponse<ContextItem>> {
    try {
      // Create context item using existing service
      const result = await contextItemService.createContextItem(item)
      if (result.error || !result.data) {
        return result
      }

      // Append event
      await eventStore.appendEvent(
        result.data.id,
        'context_item',
        'ContextItemCreated',
        {
          projectId: result.data.project_id,
          title: result.data.title,
          content: result.data.content,
          type: result.data.type,
          category: result.data.category,
          tags: result.data.tags,
          relatedBlockIds: result.data.related_block_ids,
          source: result.data.source,
          confidenceScore: result.data.confidence_score
        },
        {
          createdAt: result.data.created_at,
          userId: result.data.user_id
        }
      )

      return result
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  // Delegate other methods to existing service
  ...contextItemService
}

// Insight capture service (new event-sourced capability)
export const insightService = {
  async captureInsight(
    sessionId: string,
    projectId: string,
    insight: {
      type: 'decision' | 'problem_solution' | 'idea' | 'learning' | 'blocker' | 'next_step'
      title: string
      content: string
      importance: 'low' | 'medium' | 'high'
      relatedBlockIds?: string[]
      tags?: string[]
    }
  ): Promise<ApiResponse<{ insightId: string }>> {
    try {
      const insightId = `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Append event
      await eventStore.appendEvent(
        insightId,
        'insight',
        'InsightCaptured',
        {
          sessionId,
          projectId,
          type: insight.type,
          title: insight.title,
          content: insight.content,
          importance: insight.importance,
          relatedBlockIds: insight.relatedBlockIds || [],
          tags: insight.tags || []
        },
        {
          capturedAt: new Date().toISOString()
        }
      )

      return {
        data: { insightId },
        error: null,
        message: 'Insight captured successfully'
      }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  async getProjectInsights(
    projectId: string,
    filters?: {
      type?: string
      importance?: string
      sessionId?: string
      limit?: number
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      // Get insights from events
      const events = await eventStore.getEventsByType('InsightCaptured', filters?.limit)
      
      const insights = events
        .filter(event => event.data.projectId === projectId)
        .filter(event => !filters?.type || event.data.type === filters.type)
        .filter(event => !filters?.importance || event.data.importance === filters.importance)
        .filter(event => !filters?.sessionId || event.data.sessionId === filters.sessionId)
        .map(event => ({
          id: event.aggregateId,
          ...event.data,
          capturedAt: event.timestamp,
          metadata: event.metadata
        }))

      return {
        data: insights,
        error: null
      }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }
}

// Event analytics service
export const eventAnalyticsService = {
  async getProjectActivity(
    projectId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<ApiResponse<any>> {
    try {
      const now = new Date()
      const timeframeDays = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30
      const fromDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000)

      const events = await eventStore.getProjectEvents(projectId, fromDate.toISOString())
      
      // Analyze events
      const activity = {
        totalEvents: events.length,
        eventsByType: {} as Record<string, number>,
        eventsByDay: {} as Record<string, number>,
        blocksCreated: 0,
        blocksCompleted: 0,
        sessionsStarted: 0,
        insightsCaptured: 0,
        timeline: events.map(event => ({
          timestamp: event.timestamp,
          type: event.type,
          description: this.getEventDescription(event)
        }))
      }

      events.forEach(event => {
        // Count by type
        activity.eventsByType[event.type] = (activity.eventsByType[event.type] || 0) + 1
        
        // Count by day
        const day = event.timestamp.split('T')[0]
        activity.eventsByDay[day] = (activity.eventsByDay[day] || 0) + 1
        
        // Count specific events
        if (event.type === 'BlockCreated') activity.blocksCreated++
        if (event.type === 'BlockCompleted') activity.blocksCompleted++
        if (event.type === 'SessionStarted') activity.sessionsStarted++
        if (event.type === 'InsightCaptured') activity.insightsCaptured++
      })

      return {
        data: activity,
        error: null
      }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  },

  private getEventDescription(event: any): string {
    switch (event.type) {
      case 'ProjectCreated':
        return `Created project "${event.data.name}"`
      case 'BlockCreated':
        return `Created block "${event.data.title}" in ${event.data.lane} lane`
      case 'BlockMoved':
        return `Moved block from ${event.data.fromLane} to ${event.data.toLane}`
      case 'BlockCompleted':
        return `Completed block "${event.data.newState?.title}"`
      case 'SessionStarted':
        return `Started Claude session`
      case 'SessionEnded':
        return `Ended session (${event.data.duration}min, ${event.data.messagesCount} messages)`
      case 'InsightCaptured':
        return `Captured ${event.data.type}: "${event.data.title}"`
      default:
        return `${event.type} event`
    }
  }
}

// Subscribe to project events for real-time updates
export function subscribeToProjectEvents(
  projectId: string,
  callback: (event: any) => void
): () => void {
  return eventStore.subscribeToEvents(callback, { projectId })
}