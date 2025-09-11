import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  sessionTracker,
  type ActiveSession,
  type SessionSummary,
  type CapturedInsight,
  type InsightType,
  type ActivityType,
  createContextItemFromInsight,
  createSessionRecord
} from '@/lib/session-tracker'

interface UseSessionTrackerOptions {
  projectId: string
  autoStart?: boolean
  trackBlockChanges?: boolean
}

interface SessionState {
  isActive: boolean
  session: ActiveSession | null
  stats: {
    duration: number
    activitiesCount: number
    insightsCount: number
    blocksInFocus: number
  }
  lastSummary: SessionSummary | null
}

export function useSessionTracker({ 
  projectId, 
  autoStart = false,
  trackBlockChanges = true 
}: UseSessionTrackerOptions) {
  const { user } = useAuth()
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    session: null,
    stats: {
      duration: 0,
      activitiesCount: 0,
      insightsCount: 0,
      blocksInFocus: 0
    },
    lastSummary: null
  })
  
  const [recentInsights, setRecentInsights] = useState<CapturedInsight[]>([])
  const statsUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  
  // Update session state when tracker changes
  const updateSessionState = useCallback(() => {
    const currentSession = sessionTracker.getCurrentSession()
    const stats = sessionTracker.getSessionStats()
    
    setSessionState(prev => ({
      ...prev,
      isActive: stats.isActive,
      session: currentSession,
      stats
    }))
  }, [])
  
  // Start session
  const startSession = useCallback(async (contextSnapshot?: {
    totalBlocks: number
    blocksByLane: Record<string, number>
    priorities: Record<string, number>
  }) => {
    if (!user) {
      throw new Error('User must be authenticated to start session')
    }
    
    // Default context snapshot
    const defaultSnapshot = {
      totalBlocks: 0,
      blocksByLane: {},
      priorities: {}
    }
    
    const sessionId = sessionTracker.startSession(
      projectId, 
      contextSnapshot || defaultSnapshot
    )
    
    updateSessionState()
    return sessionId
  }, [projectId, user, updateSessionState])
  
  // End session
  const endSession = useCallback(async (): Promise<SessionSummary | null> => {
    if (!user) return null
    
    const summary = await sessionTracker.endSession()
    updateSessionState()
    
    if (summary) {
      setSessionState(prev => ({
        ...prev,
        lastSummary: summary
      }))
      
      // TODO: Save session to database
      // const sessionRecord = createSessionRecord(session, summary, user.id)
      // await saveSession(sessionRecord)
    }
    
    return summary
  }, [user, updateSessionState])
  
  // Track activity
  const trackActivity = useCallback((
    type: ActivityType,
    options: {
      blockId?: string
      description: string
      metadata?: any
    }
  ) => {
    sessionTracker.trackActivity(type, options)
    updateSessionState()
  }, [updateSessionState])
  
  // Capture insight
  const captureInsight = useCallback(async (insight: {
    type: InsightType
    title: string
    content: string
    relatedBlockIds?: string[]
    tags?: string[]
    importance?: 'low' | 'medium' | 'high'
  }): Promise<CapturedInsight> => {
    if (!user) {
      throw new Error('User must be authenticated to capture insights')
    }
    
    const capturedInsight = sessionTracker.captureInsight({
      type: insight.type,
      title: insight.title,
      content: insight.content,
      relatedBlockIds: insight.relatedBlockIds || [],
      tags: insight.tags || [],
      importance: insight.importance || 'medium'
    })
    
    // Add to recent insights
    setRecentInsights(prev => [capturedInsight, ...prev.slice(0, 9)]) // Keep last 10
    
    // TODO: Save as context item
    // const contextItem = createContextItemFromInsight(capturedInsight, projectId, user.id)
    // await saveContextItem(contextItem)
    
    updateSessionState()
    return capturedInsight
  }, [user, projectId, updateSessionState])
  
  // Quick insight capture helpers
  const captureDecision = useCallback((title: string, content: string, blockIds?: string[]) => {
    return captureInsight({
      type: 'decision',
      title,
      content,
      relatedBlockIds: blockIds,
      importance: 'high',
      tags: ['decision']
    })
  }, [captureInsight])
  
  const captureProblemSolution = useCallback((title: string, content: string, blockIds?: string[]) => {
    return captureInsight({
      type: 'problem_solution',
      title,
      content,
      relatedBlockIds: blockIds,
      importance: 'high',
      tags: ['problem', 'solution']
    })
  }, [captureInsight])
  
  const captureIdea = useCallback((title: string, content: string, blockIds?: string[]) => {
    return captureInsight({
      type: 'idea',
      title,
      content,
      relatedBlockIds: blockIds,
      importance: 'medium',
      tags: ['idea']
    })
  }, [captureInsight])
  
  const captureNextStep = useCallback((title: string, content: string, blockIds?: string[]) => {
    return captureInsight({
      type: 'next_step',
      title,
      content,
      relatedBlockIds: blockIds,
      importance: 'medium',
      tags: ['next-step', 'action']
    })
  }, [captureInsight])
  
  const captureBlocker = useCallback((title: string, content: string, blockIds?: string[]) => {
    return captureInsight({
      type: 'blocker',
      title,
      content,
      relatedBlockIds: blockIds,
      importance: 'high',
      tags: ['blocker', 'issue']
    })
  }, [captureInsight])
  
  // Block change tracking
  const trackBlockCreated = useCallback((blockId: string, title: string) => {
    trackActivity('block_created', {
      blockId,
      description: `Created block: ${title}`,
      metadata: { action: 'create' }
    })
  }, [trackActivity])
  
  const trackBlockUpdated = useCallback((blockId: string, title: string, changes?: any) => {
    trackActivity('block_updated', {
      blockId,
      description: `Updated block: ${title}`,
      metadata: { action: 'update', changes }
    })
  }, [trackActivity])
  
  const trackBlockMoved = useCallback((blockId: string, title: string, fromLane: string, toLane: string) => {
    trackActivity('block_moved', {
      blockId,
      description: `Moved "${title}" from ${fromLane} to ${toLane}`,
      metadata: { action: 'move', fromLane, toLane }
    })
  }, [trackActivity])
  
  const trackBlockCompleted = useCallback((blockId: string, title: string) => {
    trackActivity('block_completed', {
      blockId,
      description: `Completed block: ${title}`,
      metadata: { action: 'complete' }
    })
  }, [trackActivity])
  
  // Auto-start session
  useEffect(() => {
    if (autoStart && user && !sessionState.isActive) {
      startSession()
    }
  }, [autoStart, user, sessionState.isActive, startSession])
  
  // Stats update interval
  useEffect(() => {
    if (sessionState.isActive) {
      statsUpdateInterval.current = setInterval(() => {
        const stats = sessionTracker.getSessionStats()
        setSessionState(prev => ({
          ...prev,
          stats
        }))
      }, 60000) // Update every minute
      
      return () => {
        if (statsUpdateInterval.current) {
          clearInterval(statsUpdateInterval.current)
        }
      }
    }
  }, [sessionState.isActive])
  
  // Initialize from existing session
  useEffect(() => {
    updateSessionState()
  }, [updateSessionState])
  
  // Session management functions
  const toggleSession = useCallback(async () => {
    if (sessionState.isActive) {
      return await endSession()
    } else {
      return await startSession()
    }
  }, [sessionState.isActive, endSession, startSession])
  
  const pauseSession = useCallback(() => {
    if (sessionState.isActive) {
      trackActivity('insight_captured', {
        description: 'Session paused',
        metadata: { action: 'pause' }
      })
    }
  }, [sessionState.isActive, trackActivity])
  
  const resumeSession = useCallback(() => {
    if (sessionState.isActive) {
      trackActivity('insight_captured', {
        description: 'Session resumed',
        metadata: { action: 'resume' }
      })
    }
  }, [sessionState.isActive, trackActivity])
  
  // Get insights by type
  const getInsightsByType = useCallback((type: InsightType) => {
    return sessionState.session?.insights.filter(i => i.type === type) || []
  }, [sessionState.session])
  
  // Get session activity summary
  const getActivitySummary = useCallback(() => {
    if (!sessionState.session) return null
    
    const activities = sessionState.session.activities
    const blockActivities = activities.filter(a => a.blockId)
    const uniqueBlocks = new Set(blockActivities.map(a => a.blockId))
    
    return {
      totalActivities: activities.length,
      blockActivities: blockActivities.length,
      uniqueBlocksWorked: uniqueBlocks.size,
      recentActivities: activities.slice(-5),
      activityTypes: activities.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1
        return acc
      }, {} as Record<ActivityType, number>)
    }
  }, [sessionState.session])
  
  return {
    // Session state
    isActive: sessionState.isActive,
    session: sessionState.session,
    stats: sessionState.stats,
    lastSummary: sessionState.lastSummary,
    recentInsights,
    
    // Session management
    startSession,
    endSession,
    toggleSession,
    pauseSession,
    resumeSession,
    
    // Activity tracking
    trackActivity,
    trackBlockCreated,
    trackBlockUpdated,
    trackBlockMoved,
    trackBlockCompleted,
    
    // Insight capture
    captureInsight,
    captureDecision,
    captureProblemSolution,
    captureIdea,
    captureNextStep,
    captureBlocker,
    
    // Data access
    getInsightsByType,
    getActivitySummary,
    
    // Utilities
    hasSession: sessionState.isActive,
    canCapture: sessionState.isActive && !!user,
    sessionDuration: sessionState.stats.duration
  }
}