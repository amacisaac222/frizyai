// Enhanced Real-time Collaboration Engine
// Provides real-time updates, presence, and collaborative features

import { eventStore } from '../events/event-store'
import { supabase } from '../supabase'
import { relationshipEngine } from '../graph/relationship-engine'
import type { RealtimePayload } from '../database.types'

// Presence information
export interface UserPresence {
  userId: string
  userName: string
  userEmail: string
  projectId: string
  status: 'online' | 'away' | 'busy' | 'offline'
  currentBlock?: string
  currentView: string
  lastActivity: string
  cursor?: {
    x: number
    y: number
    blockId?: string
  }
  metadata: {
    device: string
    browser: string
    sessionId: string
  }
}

// Real-time event types
export type RealtimeEventType = 
  | 'user_joined'
  | 'user_left'
  | 'presence_updated'
  | 'block_editing'
  | 'block_updated'
  | 'cursor_moved'
  | 'selection_changed'
  | 'collaboration_started'
  | 'collaboration_ended'

// Real-time event
export interface RealtimeEvent {
  id: string
  type: RealtimeEventType
  projectId: string
  userId: string
  timestamp: string
  data: any
}

// Collaboration session
export interface CollaborationSession {
  id: string
  projectId: string
  participants: string[]
  startedAt: string
  endedAt?: string
  status: 'active' | 'paused' | 'ended'
  metadata: {
    purpose: string
    focus: string[]
    achievements: string[]
  }
}

// Real-time engine
export class RealtimeEngine {
  private presence: Map<string, UserPresence> = new Map()
  private subscriptions: Map<string, () => void> = new Map()
  private collaborationSessions: Map<string, CollaborationSession> = new Map()
  private eventHandlers: Map<RealtimeEventType, Function[]> = new Map()

  constructor() {
    this.setupEventHandlers()
  }

  // Initialize real-time engine for a project
  async initializeProject(projectId: string): Promise<void> {
    try {
      // Subscribe to project events
      await this.subscribeToProjectEvents(projectId)
      
      // Subscribe to presence updates
      await this.subscribeToPresence(projectId)
      
      // Subscribe to collaboration events
      await this.subscribeToCollaboration(projectId)

      console.log(`Real-time engine initialized for project ${projectId}`)
    } catch (error: any) {
      throw new Error(`Failed to initialize real-time engine: ${error.message}`)
    }
  }

  // Subscribe to project events
  private async subscribeToProjectEvents(projectId: string): Promise<void> {
    const unsubscribe = eventStore.subscribeToEvents(
      (event) => this.handleProjectEvent(event),
      { projectId }
    )
    
    this.subscriptions.set(`project-events-${projectId}`, unsubscribe)
  }

  // Subscribe to presence updates
  private async subscribeToPresence(projectId: string): Promise<void> {
    const channel = supabase
      .channel(`presence-${projectId}`)
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync(projectId)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePresenceJoin(projectId, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePresenceLeave(projectId, leftPresences)
      })
      .subscribe()

    this.subscriptions.set(`presence-${projectId}`, () => supabase.removeChannel(channel))
  }

  // Subscribe to collaboration events
  private async subscribeToCollaboration(projectId: string): Promise<void> {
    const channel = supabase
      .channel(`collaboration-${projectId}`)
      .on('broadcast', { event: 'realtime-event' }, (payload) => {
        this.handleRealtimeEvent(payload.payload as RealtimeEvent)
      })
      .subscribe()

    this.subscriptions.set(`collaboration-${projectId}`, () => supabase.removeChannel(channel))
  }

  // Join project as user
  async joinProject(
    projectId: string,
    userInfo: {
      userId: string
      userName: string
      userEmail: string
      device: string
      browser: string
      sessionId: string
    }
  ): Promise<void> {
    try {
      const presence: UserPresence = {
        userId: userInfo.userId,
        userName: userInfo.userName,
        userEmail: userInfo.userEmail,
        projectId,
        status: 'online',
        currentView: 'board',
        lastActivity: new Date().toISOString(),
        metadata: {
          device: userInfo.device,
          browser: userInfo.browser,
          sessionId: userInfo.sessionId
        }
      }

      // Update local presence
      this.presence.set(userInfo.userId, presence)

      // Broadcast presence to Supabase
      const channel = supabase.channel(`presence-${projectId}`)
      await channel.track(presence)

      // Emit join event
      await this.emitRealtimeEvent({
        type: 'user_joined',
        projectId,
        userId: userInfo.userId,
        data: { userInfo }
      })

      console.log(`User ${userInfo.userName} joined project ${projectId}`)
    } catch (error: any) {
      throw new Error(`Failed to join project: ${error.message}`)
    }
  }

  // Leave project
  async leaveProject(projectId: string, userId: string): Promise<void> {
    try {
      // Remove from local presence
      this.presence.delete(userId)

      // Untrack from Supabase
      const channel = supabase.channel(`presence-${projectId}`)
      await channel.untrack()

      // Emit leave event
      await this.emitRealtimeEvent({
        type: 'user_left',
        projectId,
        userId,
        data: {}
      })

      console.log(`User ${userId} left project ${projectId}`)
    } catch (error: any) {
      throw new Error(`Failed to leave project: ${error.message}`)
    }
  }

  // Update user presence
  async updatePresence(
    projectId: string,
    userId: string,
    updates: Partial<UserPresence>
  ): Promise<void> {
    try {
      const currentPresence = this.presence.get(userId)
      if (!currentPresence) return

      const updatedPresence = {
        ...currentPresence,
        ...updates,
        lastActivity: new Date().toISOString()
      }

      this.presence.set(userId, updatedPresence)

      // Broadcast to Supabase
      const channel = supabase.channel(`presence-${projectId}`)
      await channel.track(updatedPresence)

      // Emit presence update event
      await this.emitRealtimeEvent({
        type: 'presence_updated',
        projectId,
        userId,
        data: { presence: updatedPresence }
      })
    } catch (error: any) {
      console.error('Failed to update presence:', error)
    }
  }

  // Start collaborative editing on a block
  async startBlockCollaboration(
    projectId: string,
    blockId: string,
    userId: string
  ): Promise<void> {
    try {
      // Update presence to show editing
      await this.updatePresence(projectId, userId, {
        currentBlock: blockId,
        status: 'busy'
      })

      // Emit collaboration event
      await this.emitRealtimeEvent({
        type: 'block_editing',
        projectId,
        userId,
        data: { blockId, action: 'start' }
      })

      // Check if this creates a collaboration opportunity
      await this.detectCollaborationOpportunity(projectId, blockId, userId)
    } catch (error: any) {
      console.error('Failed to start block collaboration:', error)
    }
  }

  // End collaborative editing
  async endBlockCollaboration(
    projectId: string,
    blockId: string,
    userId: string
  ): Promise<void> {
    try {
      // Update presence
      await this.updatePresence(projectId, userId, {
        currentBlock: undefined,
        status: 'online'
      })

      // Emit collaboration event
      await this.emitRealtimeEvent({
        type: 'block_editing',
        projectId,
        userId,
        data: { blockId, action: 'end' }
      })
    } catch (error: any) {
      console.error('Failed to end block collaboration:', error)
    }
  }

  // Start formal collaboration session
  async startCollaborationSession(
    projectId: string,
    initiatorId: string,
    purpose: string,
    focus: string[]
  ): Promise<CollaborationSession> {
    try {
      const sessionId = `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const session: CollaborationSession = {
        id: sessionId,
        projectId,
        participants: [initiatorId],
        startedAt: new Date().toISOString(),
        status: 'active',
        metadata: {
          purpose,
          focus,
          achievements: []
        }
      }

      this.collaborationSessions.set(sessionId, session)

      // Record collaboration start event
      await eventStore.appendEvent(
        sessionId,
        'collaboration',
        'SessionStarted',
        {
          projectId,
          initiatorId,
          purpose,
          focus
        }
      )

      // Emit collaboration event
      await this.emitRealtimeEvent({
        type: 'collaboration_started',
        projectId,
        userId: initiatorId,
        data: { session }
      })

      return session
    } catch (error: any) {
      throw new Error(`Failed to start collaboration session: ${error.message}`)
    }
  }

  // Detect collaboration opportunities
  private async detectCollaborationOpportunity(
    projectId: string,
    blockId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if other users are working on related blocks
      const relatedUsers = this.findUsersWorkingOnRelatedBlocks(projectId, blockId, userId)

      if (relatedUsers.length > 0) {
        // Suggest collaboration
        await this.emitRealtimeEvent({
          type: 'collaboration_started',
          projectId,
          userId,
          data: {
            type: 'suggestion',
            blockId,
            relatedUsers,
            reason: 'working_on_related_blocks'
          }
        })
      }

      // Check for dependency conflicts
      await this.checkDependencyConflicts(projectId, blockId, userId)
    } catch (error: any) {
      console.error('Failed to detect collaboration opportunity:', error)
    }
  }

  // Find users working on related blocks
  private findUsersWorkingOnRelatedBlocks(
    projectId: string,
    blockId: string,
    excludeUserId: string
  ): UserPresence[] {
    const relatedUsers: UserPresence[] = []

    for (const [userId, presence] of this.presence) {
      if (userId === excludeUserId || presence.projectId !== projectId) continue
      if (!presence.currentBlock) continue

      // Check if working on the same block
      if (presence.currentBlock === blockId) {
        relatedUsers.push(presence)
        continue
      }

      // TODO: Check if working on related blocks using relationship engine
      // This would require fetching block relationships
    }

    return relatedUsers
  }

  // Check for dependency conflicts
  private async checkDependencyConflicts(
    projectId: string,
    blockId: string,
    userId: string
  ): Promise<void> {
    // TODO: Implement dependency conflict detection
    // This would check if the user is working on a block that depends on
    // or is blocked by a block another user is working on
  }

  // Emit real-time event
  private async emitRealtimeEvent(
    event: Omit<RealtimeEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const realtimeEvent: RealtimeEvent = {
        id: `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...event
      }

      // Broadcast to all subscribers
      const channel = supabase.channel(`collaboration-${event.projectId}`)
      await channel.send({
        type: 'broadcast',
        event: 'realtime-event',
        payload: realtimeEvent
      })

      // Handle locally
      this.handleRealtimeEvent(realtimeEvent)
    } catch (error: any) {
      console.error('Failed to emit real-time event:', error)
    }
  }

  // Handle real-time events
  private handleRealtimeEvent(event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event.type) || []
    handlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        console.error('Real-time event handler error:', error)
      }
    })
  }

  // Handle project events
  private handleProjectEvent(event: any): void {
    // Convert project events to real-time events for UI updates
    this.emitRealtimeEvent({
      type: 'block_updated',
      projectId: event.data.projectId || 'unknown',
      userId: event.userId || 'system',
      data: {
        eventType: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        data: event.data
      }
    })
  }

  // Handle presence events
  private handlePresenceSync(projectId: string): void {
    // Sync presence state
    console.log(`Presence synced for project ${projectId}`)
  }

  private handlePresenceJoin(projectId: string, newPresences: any[]): void {
    newPresences.forEach(presence => {
      this.presence.set(presence.userId, presence)
      console.log(`User ${presence.userName} joined`)
    })
  }

  private handlePresenceLeave(projectId: string, leftPresences: any[]): void {
    leftPresences.forEach(presence => {
      this.presence.delete(presence.userId)
      console.log(`User ${presence.userName} left`)
    })
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    // Default handlers can be added here
  }

  // Subscribe to real-time events
  onRealtimeEvent(
    eventType: RealtimeEventType,
    handler: (event: RealtimeEvent) => void
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    
    this.eventHandlers.get(eventType)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  // Get current presence for project
  getProjectPresence(projectId: string): UserPresence[] {
    return Array.from(this.presence.values())
      .filter(presence => presence.projectId === projectId)
  }

  // Get active collaboration sessions
  getActiveCollaborationSessions(projectId: string): CollaborationSession[] {
    return Array.from(this.collaborationSessions.values())
      .filter(session => session.projectId === projectId && session.status === 'active')
  }

  // Get collaboration statistics
  async getCollaborationStats(projectId: string): Promise<{
    totalUsers: number
    activeUsers: number
    averageSessionDuration: number
    collaborationEvents: number
    topCollaborators: Array<{ userId: string; userName: string; events: number }>
  }> {
    try {
      const presence = this.getProjectPresence(projectId)
      const totalUsers = presence.length
      const activeUsers = presence.filter(p => p.status === 'online' || p.status === 'busy').length

      // Get collaboration events from event store
      const events = await eventStore.getProjectEvents(projectId)
      const collaborationEvents = events.filter(e => 
        e.type.includes('Session') || 
        e.type.includes('Collaboration')
      ).length

      // Calculate top collaborators
      const userEventCounts = events.reduce((acc, event) => {
        if (event.userId) {
          acc[event.userId] = (acc[event.userId] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const topCollaborators = Object.entries(userEventCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([userId, events]) => {
          const userPresence = presence.find(p => p.userId === userId)
          return {
            userId,
            userName: userPresence?.userName || 'Unknown',
            events
          }
        })

      return {
        totalUsers,
        activeUsers,
        averageSessionDuration: 0, // TODO: Calculate from session events
        collaborationEvents,
        topCollaborators
      }
    } catch (error: any) {
      throw new Error(`Failed to get collaboration stats: ${error.message}`)
    }
  }

  // Cleanup
  disconnect(projectId?: string): void {
    if (projectId) {
      // Disconnect from specific project
      const projectSubscriptions = Array.from(this.subscriptions.entries())
        .filter(([key]) => key.includes(projectId))
      
      projectSubscriptions.forEach(([key, unsubscribe]) => {
        unsubscribe()
        this.subscriptions.delete(key)
      })
      
      // Remove presence for this project
      for (const [userId, presence] of this.presence) {
        if (presence.projectId === projectId) {
          this.presence.delete(userId)
        }
      }
    } else {
      // Disconnect from all
      this.subscriptions.forEach(unsubscribe => unsubscribe())
      this.subscriptions.clear()
      this.presence.clear()
      this.collaborationSessions.clear()
    }
  }
}

// Export singleton instance
export const realtimeEngine = new RealtimeEngine()