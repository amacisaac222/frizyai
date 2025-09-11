import { supabase } from './supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Block, Project, User } from './database.types'

// Types for real-time events
export interface PresenceData {
  user_id: string
  user_name: string
  user_email: string
  avatar_url?: string
  last_seen: string
  active_project?: string
  active_block?: string
  cursor_position?: {
    x: number
    y: number
    blockId?: string
  }
}

export interface BlockChangeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  block: Block
  old_block?: Block
  user_id: string
  timestamp: string
  operation_id: string
}

export interface ConflictEvent {
  type: 'conflict'
  block_id: string
  conflicting_changes: BlockChangeEvent[]
  resolved_block: Block
}

export type RealtimeEvent = BlockChangeEvent | ConflictEvent

// Real-time subscription manager
export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private presenceData: Map<string, PresenceData> = new Map()
  private currentUser: User | null = null
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected'
  private listeners: Map<string, Set<(event: any) => void>> = new Map()

  constructor() {
    this.setupConnectionMonitoring()
  }

  // Connection monitoring
  private setupConnectionMonitoring() {
    // Note: Modern Supabase client handles connection management automatically
    // We'll use a simple status tracking approach instead
    this.connectionStatus = 'connected'
    this.emitEvent('connection', { status: 'connected' })
    
    // Optional: Add periodic connection checks if needed
    setInterval(() => {
      // Basic connection health check could go here
      if (this.connectionStatus !== 'connected') {
        this.connectionStatus = 'connected'
        this.emitEvent('connection', { status: 'connected' })
      }
    }, 30000) // Check every 30 seconds
  }

  // Set current user for presence
  setCurrentUser(user: User) {
    this.currentUser = user
  }

  // Subscribe to project real-time updates
  async subscribeToProject(
    projectId: string,
    userId: string,
    callbacks: {
      onBlockChange?: (event: BlockChangeEvent) => void
      onPresenceChange?: (presence: Map<string, PresenceData>) => void
      onConflict?: (event: ConflictEvent) => void
    }
  ): Promise<() => void> {
    const channelName = `project:${projectId}`
    
    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      await this.unsubscribeFromProject(projectId)
    }

    this.connectionStatus = 'connecting'
    this.emitEvent('connection', { status: 'connecting' })

    const channel = supabase
      .channel(channelName, {
        config: {
          presence: {
            key: userId
          }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocks',
          filter: `project_id=eq.${projectId}`
        },
        (payload: RealtimePostgresChangesPayload<Block>) => {
          const event = this.createBlockChangeEvent(payload, userId)
          if (event && callbacks.onBlockChange) {
            callbacks.onBlockChange(event)
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        this.updatePresenceData(state)
        if (callbacks.onPresenceChange) {
          callbacks.onPresenceChange(this.presenceData)
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
        this.updatePresenceFromChanges(newPresences)
        if (callbacks.onPresenceChange) {
          callbacks.onPresenceChange(this.presenceData)
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        this.removePresenceFromChanges(leftPresences)
        if (callbacks.onPresenceChange) {
          callbacks.onPresenceChange(this.presenceData)
        }
      })

    const response = await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.connectionStatus = 'connected'
        this.emitEvent('connection', { status: 'connected' })
        
        // Send initial presence
        const presenceData: PresenceData = {
          user_id: userId,
          user_name: this.currentUser?.full_name || 'Anonymous',
          user_email: this.currentUser?.email || '',
          avatar_url: this.currentUser?.avatar_url,
          last_seen: new Date().toISOString(),
          active_project: projectId
        }

        await channel.track(presenceData)
      } else if (status === 'CHANNEL_ERROR') {
        this.connectionStatus = 'error'
        this.emitEvent('connection', { status: 'error' })
      }
    })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromProject(projectId)
  }

  // Unsubscribe from project updates
  async unsubscribeFromProject(projectId: string) {
    const channelName = `project:${projectId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.unsubscribe()
      this.channels.delete(channelName)
    }
  }

  // Update presence (cursor position, active block, etc.)
  async updatePresence(projectId: string, updates: Partial<PresenceData>) {
    const channelName = `project:${projectId}`
    const channel = this.channels.get(channelName)
    
    if (channel && this.currentUser) {
      const currentPresence = this.presenceData.get(this.currentUser.id) || {
        user_id: this.currentUser.id,
        user_name: this.currentUser.full_name || 'Anonymous',
        user_email: this.currentUser.email || '',
        avatar_url: this.currentUser.avatar_url,
        last_seen: new Date().toISOString(),
        active_project: projectId
      }

      const updatedPresence = {
        ...currentPresence,
        ...updates,
        last_seen: new Date().toISOString()
      }

      await channel.track(updatedPresence)
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.connectionStatus
  }

  // Get current presence data
  getPresenceData() {
    return new Map(this.presenceData)
  }

  // Event listener management
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(callback)
      }
    }
  }

  private emitEvent(event: string, data: any) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  // Helper methods
  private createBlockChangeEvent(
    payload: RealtimePostgresChangesPayload<Block>,
    currentUserId: string
  ): BlockChangeEvent | null {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Don't emit events for changes made by current user (optimistic updates)
    if (newRecord?.created_by === currentUserId || oldRecord?.created_by === currentUserId) {
      return null
    }

    const operationId = `${eventType}_${Date.now()}_${Math.random()}`

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          return {
            type: 'INSERT',
            block: newRecord,
            user_id: newRecord.created_by,
            timestamp: new Date().toISOString(),
            operation_id: operationId
          }
        }
        break
      case 'UPDATE':
        if (newRecord) {
          return {
            type: 'UPDATE',
            block: newRecord,
            old_block: oldRecord || undefined,
            user_id: newRecord.created_by,
            timestamp: new Date().toISOString(),
            operation_id: operationId
          }
        }
        break
      case 'DELETE':
        if (oldRecord) {
          return {
            type: 'DELETE',
            block: oldRecord,
            user_id: oldRecord.created_by,
            timestamp: new Date().toISOString(),
            operation_id: operationId
          }
        }
        break
    }

    return null
  }

  private updatePresenceData(state: any) {
    this.presenceData.clear()
    Object.entries(state).forEach(([userId, presences]: [string, any]) => {
      if (presences && presences.length > 0) {
        this.presenceData.set(userId, presences[0])
      }
    })
  }

  private updatePresenceFromChanges(newPresences: any[]) {
    newPresences.forEach(presence => {
      if (presence.user_id) {
        this.presenceData.set(presence.user_id, presence)
      }
    })
  }

  private removePresenceFromChanges(leftPresences: any[]) {
    leftPresences.forEach(presence => {
      if (presence.user_id) {
        this.presenceData.delete(presence.user_id)
      }
    })
  }

  // Cleanup all subscriptions
  async cleanup() {
    for (const [channelName, channel] of this.channels) {
      await channel.unsubscribe()
    }
    this.channels.clear()
    this.presenceData.clear()
    this.listeners.clear()
  }
}

// Conflict resolution utilities
export class ConflictResolver {
  // Resolve conflicts between optimistic updates and server changes
  static resolveBlockConflict(
    optimisticBlock: Block,
    serverBlock: Block,
    lastKnownBlock: Block
  ): { resolved: Block; hasConflict: boolean } {
    const hasConflict = this.hasConflictingChanges(optimisticBlock, serverBlock, lastKnownBlock)

    if (!hasConflict) {
      return { resolved: serverBlock, hasConflict: false }
    }

    // Merge strategy: server wins for content, optimistic wins for local state
    const resolved: Block = {
      ...serverBlock, // Server data takes precedence
      // Keep local UI state that doesn't conflict
      progress: this.resolveNumericConflict(
        optimisticBlock.progress,
        serverBlock.progress,
        lastKnownBlock.progress
      )
    }

    return { resolved, hasConflict: true }
  }

  private static hasConflictingChanges(
    optimistic: Block,
    server: Block,
    lastKnown: Block
  ): boolean {
    // Check if both optimistic and server have changes from last known state
    const optimisticChanged = this.blockHasChanges(optimistic, lastKnown)
    const serverChanged = this.blockHasChanges(server, lastKnown)

    return optimisticChanged && serverChanged
  }

  private static blockHasChanges(block1: Block, block2: Block): boolean {
    return (
      block1.title !== block2.title ||
      block1.content !== block2.content ||
      block1.status !== block2.status ||
      block1.progress !== block2.progress ||
      block1.lane !== block2.lane ||
      block1.priority !== block2.priority
    )
  }

  private static resolveNumericConflict(
    optimistic: number,
    server: number,
    lastKnown: number
  ): number {
    // If server value is newer (higher), use it
    if (server > optimistic) {
      return server
    }
    
    // Otherwise, keep optimistic value
    return optimistic
  }
}

// Global realtime manager instance
export const realtimeManager = new RealtimeManager()