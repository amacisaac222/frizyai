import type { Block, Session, SessionInsert, ContextItemInsert } from './database.types'

// Session activity types
export type ActivityType = 
  | 'block_created'
  | 'block_updated' 
  | 'block_moved'
  | 'block_completed'
  | 'insight_captured'
  | 'decision_made'
  | 'problem_solved'
  | 'idea_generated'
  | 'context_added'

// Activity tracking
export interface SessionActivity {
  id: string
  timestamp: string
  type: ActivityType
  blockId?: string
  description: string
  metadata?: {
    oldValue?: any
    newValue?: any
    details?: string
    confidence?: number
  }
}

// Insight types for manual capture
export type InsightType = 
  | 'decision'
  | 'problem_solution'
  | 'idea'
  | 'learning'
  | 'blocker'
  | 'next_step'
  | 'reference'

export interface CapturedInsight {
  id: string
  type: InsightType
  title: string
  content: string
  relatedBlockIds: string[]
  tags: string[]
  importance: 'low' | 'medium' | 'high'
  timestamp: string
  sessionId: string
}

// Session summary data
export interface SessionSummary {
  sessionId: string
  duration: number // minutes
  blocksWorked: number
  blocksCreated: number
  blocksCompleted: number
  blocksModified: number
  keyAccomplishments: string[]
  decisions: CapturedInsight[]
  problems: CapturedInsight[]
  ideas: CapturedInsight[]
  nextSteps: string[]
  blockers: string[]
  productivityScore: number // 0-10
  focusAreas: string[]
  insights: CapturedInsight[]
}

// Active session state
export interface ActiveSession {
  id: string
  projectId: string
  startTime: string
  lastActivity: string
  activities: SessionActivity[]
  insights: CapturedInsight[]
  blocksInFocus: Set<string>
  contextSnapshot: {
    totalBlocks: number
    blocksByLane: Record<string, number>
    priorities: Record<string, number>
  }
}

// Session tracker class
export class SessionTracker {
  private activeSession: ActiveSession | null = null
  private activityQueue: SessionActivity[] = []
  private autoSaveInterval: NodeJS.Timeout | null = null
  private onSessionUpdate?: (session: ActiveSession) => void
  private onInsightCapture?: (insight: CapturedInsight) => void

  constructor(callbacks?: {
    onSessionUpdate?: (session: ActiveSession) => void
    onInsightCapture?: (insight: CapturedInsight) => void
  }) {
    this.onSessionUpdate = callbacks?.onSessionUpdate
    this.onInsightCapture = callbacks?.onInsightCapture
    
    // Load active session from localStorage if exists
    this.loadActiveSession()
  }

  // Start a new session
  startSession(projectId: string, contextSnapshot: ActiveSession['contextSnapshot']): string {
    if (this.activeSession) {
      this.endSession() // End current session first
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    this.activeSession = {
      id: sessionId,
      projectId,
      startTime: now,
      lastActivity: now,
      activities: [],
      insights: [],
      blocksInFocus: new Set(),
      contextSnapshot
    }

    // Start auto-save
    this.startAutoSave()
    
    // Track session start
    this.trackActivity('insight_captured', {
      description: 'Claude session started',
      metadata: { details: 'Session tracking initiated' }
    })

    this.saveActiveSession()
    this.notifySessionUpdate()

    return sessionId
  }

  // End the current session
  async endSession(): Promise<SessionSummary | null> {
    if (!this.activeSession) return null

    const session = this.activeSession
    const endTime = new Date()
    const startTime = new Date(session.startTime)
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    // Generate session summary
    const summary = this.generateSessionSummary(session, duration)

    // Track session end
    this.trackActivity('insight_captured', {
      description: 'Claude session ended',
      metadata: { 
        details: `Session lasted ${duration} minutes`,
        duration,
        blocksWorked: session.blocksInFocus.size
      }
    })

    // Stop auto-save
    this.stopAutoSave()

    // Clear active session
    this.activeSession = null
    this.clearActiveSession()

    return summary
  }

  // Track activity during session
  trackActivity(type: ActivityType, options: {
    blockId?: string
    description: string
    metadata?: SessionActivity['metadata']
  }): void {
    if (!this.activeSession) return

    const activity: SessionActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      blockId: options.blockId,
      description: options.description,
      metadata: options.metadata
    }

    this.activeSession.activities.push(activity)
    this.activeSession.lastActivity = activity.timestamp

    // Add block to focus if provided
    if (options.blockId) {
      this.activeSession.blocksInFocus.add(options.blockId)
    }

    this.activityQueue.push(activity)
    this.notifySessionUpdate()
  }

  // Capture manual insight
  captureInsight(insight: Omit<CapturedInsight, 'id' | 'timestamp' | 'sessionId'>): CapturedInsight {
    if (!this.activeSession) {
      throw new Error('No active session to capture insight')
    }

    const capturedInsight: CapturedInsight = {
      ...insight,
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.activeSession.id
    }

    this.activeSession.insights.push(capturedInsight)

    // Track as activity
    this.trackActivity('insight_captured', {
      description: `${insight.type}: ${insight.title}`,
      metadata: {
        details: insight.content,
        confidence: insight.importance === 'high' ? 0.9 : insight.importance === 'medium' ? 0.7 : 0.5
      }
    })

    this.onInsightCapture?.(capturedInsight)
    this.notifySessionUpdate()

    return capturedInsight
  }

  // Get current session
  getCurrentSession(): ActiveSession | null {
    return this.activeSession
  }

  // Get session statistics
  getSessionStats(): {
    isActive: boolean
    duration: number
    activitiesCount: number
    insightsCount: number
    blocksInFocus: number
  } {
    if (!this.activeSession) {
      return {
        isActive: false,
        duration: 0,
        activitiesCount: 0,
        insightsCount: 0,
        blocksInFocus: 0
      }
    }

    const duration = Math.round(
      (Date.now() - new Date(this.activeSession.startTime).getTime()) / (1000 * 60)
    )

    return {
      isActive: true,
      duration,
      activitiesCount: this.activeSession.activities.length,
      insightsCount: this.activeSession.insights.length,
      blocksInFocus: this.activeSession.blocksInFocus.size
    }
  }

  // Generate session summary
  private generateSessionSummary(session: ActiveSession, duration: number): SessionSummary {
    const activities = session.activities
    const insights = session.insights

    // Categorize insights
    const decisions = insights.filter(i => i.type === 'decision')
    const problems = insights.filter(i => i.type === 'problem_solution')
    const ideas = insights.filter(i => i.type === 'idea')
    const nextSteps = insights.filter(i => i.type === 'next_step').map(i => i.content)
    const blockers = insights.filter(i => i.type === 'blocker').map(i => i.content)

    // Count activities
    const blocksCreated = activities.filter(a => a.type === 'block_created').length
    const blocksCompleted = activities.filter(a => a.type === 'block_completed').length
    const blocksModified = activities.filter(a => a.type === 'block_updated').length

    // Generate key accomplishments
    const keyAccomplishments: string[] = []
    if (blocksCreated > 0) keyAccomplishments.push(`Created ${blocksCreated} new blocks`)
    if (blocksCompleted > 0) keyAccomplishments.push(`Completed ${blocksCompleted} blocks`)
    if (blocksModified > 0) keyAccomplishments.push(`Updated ${blocksModified} blocks`)
    if (decisions.length > 0) keyAccomplishments.push(`Made ${decisions.length} key decisions`)
    if (problems.length > 0) keyAccomplishments.push(`Solved ${problems.length} problems`)

    // Calculate productivity score (0-10)
    let productivityScore = 5 // baseline
    productivityScore += Math.min(2, blocksCompleted * 0.5) // +0.5 per completion, max +2
    productivityScore += Math.min(1, blocksCreated * 0.3) // +0.3 per creation, max +1
    productivityScore += Math.min(2, insights.length * 0.2) // +0.2 per insight, max +2
    productivityScore = Math.min(10, Math.max(0, productivityScore))

    // Extract focus areas from activities
    const focusAreas = Array.from(session.blocksInFocus).slice(0, 5)

    return {
      sessionId: session.id,
      duration,
      blocksWorked: session.blocksInFocus.size,
      blocksCreated,
      blocksCompleted,
      blocksModified,
      keyAccomplishments,
      decisions,
      problems,
      ideas,
      nextSteps,
      blockers,
      productivityScore,
      focusAreas,
      insights
    }
  }

  // Auto-save functionality
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.saveActiveSession()
    }, 30000) // Save every 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  // Local storage management
  private saveActiveSession(): void {
    if (this.activeSession) {
      localStorage.setItem('frizy-active-session', JSON.stringify({
        ...this.activeSession,
        blocksInFocus: Array.from(this.activeSession.blocksInFocus)
      }))
    }
  }

  private loadActiveSession(): void {
    try {
      const stored = localStorage.getItem('frizy-active-session')
      if (stored) {
        const data = JSON.parse(stored)
        this.activeSession = {
          ...data,
          blocksInFocus: new Set(data.blocksInFocus || [])
        }
        
        // Resume auto-save if session exists
        if (this.activeSession) {
          this.startAutoSave()
        }
      }
    } catch (error) {
      console.warn('Failed to load active session:', error)
      this.clearActiveSession()
    }
  }

  private clearActiveSession(): void {
    localStorage.removeItem('frizy-active-session')
  }

  private notifySessionUpdate(): void {
    if (this.activeSession && this.onSessionUpdate) {
      this.onSessionUpdate(this.activeSession)
    }
  }
}

// Helper functions for insight creation
export function createContextItemFromInsight(
  insight: CapturedInsight,
  projectId: string,
  userId: string
): ContextItemInsert {
  return {
    user_id: userId,
    project_id: projectId,
    title: insight.title,
    content: insight.content,
    type: insight.type,
    tags: insight.tags,
    category: insight.type === 'decision' ? 'decision' : 
             insight.type === 'problem_solution' ? 'solution' :
             insight.type === 'idea' ? 'idea' : 'general',
    related_block_ids: insight.relatedBlockIds,
    related_session_ids: [insight.sessionId],
    source: 'claude_session',
    confidence_score: insight.importance === 'high' ? 0.9 : 
                     insight.importance === 'medium' ? 0.7 : 0.5
  }
}

export function createSessionRecord(
  session: ActiveSession,
  summary: SessionSummary,
  userId: string
): SessionInsert {
  return {
    user_id: userId,
    project_id: session.projectId,
    session_id: session.id,
    title: generateSessionTitle(summary),
    context_at_start: session.contextSnapshot,
    context_at_end: {
      totalBlocks: session.contextSnapshot.totalBlocks,
      activitiesCount: session.activities.length,
      insightsCount: session.insights.length
    },
    related_block_ids: Array.from(session.blocksInFocus),
    blocks_created: session.activities
      .filter(a => a.type === 'block_created')
      .map(a => a.blockId!)
      .filter(Boolean),
    blocks_modified: session.activities
      .filter(a => a.type === 'block_updated')
      .map(a => a.blockId!)
      .filter(Boolean),
    messages_count: session.activities.length,
    tokens_used: 0, // Would be tracked by MCP server
    duration_minutes: summary.duration,
    started_at: session.startTime,
    ended_at: new Date().toISOString(),
    insights: summary.keyAccomplishments,
    achievements: summary.decisions.map(d => d.title),
    next_steps: summary.nextSteps,
    mcp_status: 'unknown',
    mcp_data: {
      activities: session.activities,
      insights: session.insights
    }
  }
}

function generateSessionTitle(summary: SessionSummary): string {
  if (summary.keyAccomplishments.length > 0) {
    return summary.keyAccomplishments[0]
  }
  
  if (summary.blocksWorked > 0) {
    return `Worked on ${summary.blocksWorked} blocks`
  }
  
  return `Claude session (${summary.duration}min)`
}

// Singleton instance
export const sessionTracker = new SessionTracker()