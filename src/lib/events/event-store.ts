// Event Store Implementation for Frizy
// Provides event sourcing capabilities on top of existing Supabase infrastructure

import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../supabase'

// Base event interface
export interface BaseEvent {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  version: number
  timestamp: string
  data: any
  metadata?: any
  userId?: string
}

// Domain event types
export type FrizyEventType = 
  | 'ProjectCreated'
  | 'ProjectUpdated'
  | 'ProjectArchived'
  | 'BlockCreated'
  | 'BlockUpdated'
  | 'BlockMoved'
  | 'BlockCompleted'
  | 'BlockArchived'
  | 'SessionStarted'
  | 'SessionEnded'
  | 'SessionActivityTracked'
  | 'InsightCaptured'
  | 'ContextItemCreated'
  | 'ContextItemUpdated'
  | 'MCPConnectionEstablished'
  | 'MCPConnectionLost'
  | 'ContextCompressed'
  | 'RelationshipCreated'
  | 'RelationshipUpdated'

// Event definitions
export interface ProjectCreatedEvent extends BaseEvent {
  type: 'ProjectCreated'
  data: {
    name: string
    description?: string
    mood?: string
    settings: any
  }
}

export interface BlockCreatedEvent extends BaseEvent {
  type: 'BlockCreated'
  data: {
    projectId: string
    title: string
    content: string
    lane: string
    priority: string
    energyLevel: string
    complexity: string
    tags: string[]
  }
}

export interface BlockMovedEvent extends BaseEvent {
  type: 'BlockMoved'
  data: {
    projectId: string
    fromLane: string
    toLane: string
    reason?: string
  }
}

export interface SessionStartedEvent extends BaseEvent {
  type: 'SessionStarted'
  data: {
    projectId: string
    sessionId: string
    contextAtStart: any
    mcpStatus: string
  }
}

export interface InsightCapturedEvent extends BaseEvent {
  type: 'InsightCaptured'
  data: {
    sessionId: string
    projectId: string
    type: string
    title: string
    content: string
    importance: string
    relatedBlockIds: string[]
    tags: string[]
  }
}

export interface ContextCompressedEvent extends BaseEvent {
  type: 'ContextCompressed'
  data: {
    sessionId: string
    projectId: string
    originalSize: number
    compressedSize: number
    compressionRatio: number
    strategy: string
    preservedInsights: string[]
  }
}

export interface RelationshipCreatedEvent extends BaseEvent {
  type: 'RelationshipCreated'
  data: {
    sourceId: string
    sourceType: string
    targetId: string
    targetType: string
    relationshipType: string
    strength: number
    metadata?: any
  }
}

// Union type for all events
export type DomainEvent = 
  | ProjectCreatedEvent
  | BlockCreatedEvent
  | BlockMovedEvent
  | SessionStartedEvent
  | InsightCapturedEvent
  | ContextCompressedEvent
  | RelationshipCreatedEvent

// Event store implementation
export class EventStore {
  constructor() {
    this.ensureEventsTable()
  }

  // Ensure events table exists (will be handled by Supabase migrations)
  private async ensureEventsTable() {
    // This will be created via Supabase migration
    // CREATE TABLE events (
    //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    //   type VARCHAR NOT NULL,
    //   aggregate_id UUID NOT NULL,
    //   aggregate_type VARCHAR NOT NULL,
    //   version INTEGER NOT NULL,
    //   timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    //   data JSONB NOT NULL,
    //   metadata JSONB,
    //   user_id UUID REFERENCES auth.users(id),
    //   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    // );
  }

  // Append event to stream
  async appendEvent(
    aggregateId: string,
    aggregateType: string,
    eventType: FrizyEventType,
    data: any,
    metadata?: any,
    expectedVersion?: number
  ): Promise<BaseEvent> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get current version for optimistic concurrency
      const { data: lastEvent } = await supabase
        .from('events')
        .select('version')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      const currentVersion = lastEvent?.version || 0
      
      // Check expected version for optimistic concurrency
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new Error(`Concurrency conflict: expected version ${expectedVersion}, current version ${currentVersion}`)
      }

      const event: BaseEvent = {
        id: uuidv4(),
        type: eventType,
        aggregateId,
        aggregateType,
        version: currentVersion + 1,
        timestamp: new Date().toISOString(),
        data,
        metadata,
        userId: user?.id
      }

      const { data: savedEvent, error } = await supabase
        .from('events')
        .insert({
          id: event.id,
          type: event.type,
          aggregate_id: event.aggregateId,
          aggregate_type: event.aggregateType,
          version: event.version,
          timestamp: event.timestamp,
          data: event.data,
          metadata: event.metadata,
          user_id: event.userId
        })
        .select()
        .single()

      if (error) throw error

      // Publish event for real-time subscribers
      await this.publishEvent(event)

      return event
    } catch (error) {
      console.error('Failed to append event:', error)
      throw error
    }
  }

  // Get events for aggregate
  async getEventsForAggregate(
    aggregateId: string,
    fromVersion?: number
  ): Promise<BaseEvent[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: true })

      if (fromVersion !== undefined) {
        query = query.gte('version', fromVersion)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapFromDatabase)
    } catch (error) {
      console.error('Failed to get events for aggregate:', error)
      throw error
    }
  }

  // Get events by type
  async getEventsByType(
    eventType: FrizyEventType,
    limit?: number,
    offset?: number
  ): Promise<BaseEvent[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('type', eventType)
        .order('timestamp', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapFromDatabase)
    } catch (error) {
      console.error('Failed to get events by type:', error)
      throw error
    }
  }

  // Get events for project (including all related aggregates)
  async getProjectEvents(
    projectId: string,
    fromTimestamp?: string,
    limit?: number
  ): Promise<BaseEvent[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .or(`aggregate_id.eq.${projectId},data->>projectId.eq.${projectId}`)
        .order('timestamp', { ascending: true })

      if (fromTimestamp) {
        query = query.gte('timestamp', fromTimestamp)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapFromDatabase)
    } catch (error) {
      console.error('Failed to get project events:', error)
      throw error
    }
  }

  // Get recent events across all projects for a user
  async getRecentEvents(
    userId: string,
    limit: number = 50
  ): Promise<BaseEvent[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(this.mapFromDatabase)
    } catch (error) {
      console.error('Failed to get recent events:', error)
      throw error
    }
  }

  // Subscribe to events for real-time updates
  subscribeToEvents(
    callback: (event: BaseEvent) => void,
    filters?: {
      aggregateId?: string
      aggregateType?: string
      eventType?: FrizyEventType
      projectId?: string
    }
  ): () => void {
    const channel = supabase
      .channel('events-subscription')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          const event = this.mapFromDatabase(payload.new)
          
          // Apply filters
          if (filters?.aggregateId && event.aggregateId !== filters.aggregateId) return
          if (filters?.aggregateType && event.aggregateType !== filters.aggregateType) return
          if (filters?.eventType && event.type !== filters.eventType) return
          if (filters?.projectId) {
            const eventProjectId = event.aggregateId === filters.projectId || 
                                 event.data?.projectId === filters.projectId
            if (!eventProjectId) return
          }

          callback(event)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  // Publish event to real-time subscribers
  private async publishEvent(event: BaseEvent): Promise<void> {
    // Events are automatically published via Supabase real-time
    // This method is for future extensions like webhooks, external systems, etc.
  }

  // Map database row to event object
  private mapFromDatabase(row: any): BaseEvent {
    return {
      id: row.id,
      type: row.type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      version: row.version,
      timestamp: row.timestamp,
      data: row.data,
      metadata: row.metadata,
      userId: row.user_id
    }
  }

  // Event replay for debugging/analysis
  async replayEvents(
    aggregateId: string,
    toVersion?: number
  ): Promise<any[]> {
    const events = await this.getEventsForAggregate(aggregateId)
    
    const filteredEvents = toVersion 
      ? events.filter(e => e.version <= toVersion)
      : events

    // This would typically rebuild aggregate state
    // For now, just return the events for analysis
    return filteredEvents
  }

  // Create snapshot of current aggregate state
  async createSnapshot(
    aggregateId: string,
    aggregateType: string,
    state: any,
    version: number
  ): Promise<void> {
    try {
      await supabase
        .from('snapshots')
        .upsert({
          aggregate_id: aggregateId,
          aggregate_type: aggregateType,
          version,
          state,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to create snapshot:', error)
      throw error
    }
  }

  // Get latest snapshot for aggregate
  async getSnapshot(aggregateId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"

      return data || null
    } catch (error) {
      console.error('Failed to get snapshot:', error)
      throw error
    }
  }
}

// Event store helpers
export function createEvent<T extends DomainEvent>(
  type: T['type'],
  aggregateId: string,
  aggregateType: string,
  data: T['data'],
  metadata?: any
): Omit<T, 'id' | 'version' | 'timestamp'> {
  return {
    type,
    aggregateId,
    aggregateType,
    data,
    metadata
  } as Omit<T, 'id' | 'version' | 'timestamp'>
}

// Singleton event store instance
export const eventStore = new EventStore()