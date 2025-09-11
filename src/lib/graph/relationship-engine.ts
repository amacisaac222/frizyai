// Graph Relationship Engine
// Creates and manages relationships between blocks, context items, sessions, and insights

import { eventStore } from '../events/event-store'
import { blockService, contextItemService } from '../database'
import { insightService } from '../events/event-sourced-services'
import type { Block, ContextItem } from '../database.types'

// Relationship types
export type RelationshipType = 
  | 'depends_on'           // Block A depends on Block B
  | 'blocks'               // Block A blocks Block B
  | 'relates_to'           // General relationship
  | 'inspired_by'          // Block created from insight/context
  | 'implements'           // Block implements an idea/decision
  | 'references'           // Context item references block
  | 'contains'             // Session contains blocks/insights
  | 'derives_from'         // Insight derives from block work
  | 'collaborates_with'    // User collaboration relationship
  | 'temporal_sequence'    // Time-based relationship
  | 'semantic_similarity'  // AI-detected similarity

// Relationship strength levels
export type RelationshipStrength = 'weak' | 'medium' | 'strong' | 'critical'

// Graph node types
export type NodeType = 'block' | 'context_item' | 'insight' | 'session' | 'user' | 'project'

// Graph relationship
export interface GraphRelationship {
  id: string
  sourceId: string
  sourceType: NodeType
  targetId: string
  targetType: NodeType
  relationshipType: RelationshipType
  strength: RelationshipStrength
  confidence: number // 0-1, how confident we are in this relationship
  createdAt: string
  lastUpdated: string
  metadata: {
    createdBy: 'user' | 'system' | 'ai'
    reason?: string
    evidence?: string[]
    context?: any
  }
}

// Graph node (unified view of all entities)
export interface GraphNode {
  id: string
  type: NodeType
  title: string
  content?: string
  metadata: any
  lastActivity: string
  importance: number
  relationships: {
    incoming: GraphRelationship[]
    outgoing: GraphRelationship[]
  }
}

// Graph query options
export interface GraphQueryOptions {
  includeTypes?: NodeType[]
  excludeTypes?: NodeType[]
  relationshipTypes?: RelationshipType[]
  minStrength?: RelationshipStrength
  maxDepth?: number
  includeMetadata?: boolean
}

// Relationship engine
export class RelationshipEngine {
  private relationshipCache: Map<string, GraphRelationship[]> = new Map()
  private nodeCache: Map<string, GraphNode> = new Map()

  // Create a new relationship
  async createRelationship(
    sourceId: string,
    sourceType: NodeType,
    targetId: string,
    targetType: NodeType,
    relationshipType: RelationshipType,
    strength: RelationshipStrength = 'medium',
    metadata: {
      createdBy: 'user' | 'system' | 'ai'
      reason?: string
      evidence?: string[]
      context?: any
    } = { createdBy: 'system' }
  ): Promise<GraphRelationship> {
    try {
      const relationshipId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const relationship: GraphRelationship = {
        id: relationshipId,
        sourceId,
        sourceType,
        targetId,
        targetType,
        relationshipType,
        strength,
        confidence: this.calculateRelationshipConfidence(relationshipType, metadata),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        metadata
      }

      // Record relationship creation event
      await eventStore.appendEvent(
        relationshipId,
        'relationship',
        'RelationshipCreated',
        {
          sourceId,
          sourceType,
          targetId,
          targetType,
          relationshipType,
          strength,
          metadata
        }
      )

      // Update cache
      this.invalidateCache(sourceId, targetId)

      return relationship
    } catch (error: any) {
      throw new Error(`Failed to create relationship: ${error.message}`)
    }
  }

  // Auto-detect relationships using various strategies
  async detectRelationships(
    projectId: string,
    strategies: ('temporal' | 'semantic' | 'explicit' | 'collaborative')[] = ['temporal', 'semantic', 'explicit']
  ): Promise<GraphRelationship[]> {
    try {
      const detectedRelationships: GraphRelationship[] = []

      for (const strategy of strategies) {
        const relationships = await this.runDetectionStrategy(projectId, strategy)
        detectedRelationships.push(...relationships)
      }

      // Remove duplicates and low-confidence relationships
      const filteredRelationships = this.filterAndDeduplicateRelationships(detectedRelationships)

      return filteredRelationships
    } catch (error: any) {
      throw new Error(`Failed to detect relationships: ${error.message}`)
    }
  }

  // Run specific detection strategy
  private async runDetectionStrategy(
    projectId: string,
    strategy: 'temporal' | 'semantic' | 'explicit' | 'collaborative'
  ): Promise<GraphRelationship[]> {
    switch (strategy) {
      case 'temporal':
        return this.detectTemporalRelationships(projectId)
      case 'semantic':
        return this.detectSemanticRelationships(projectId)
      case 'explicit':
        return this.detectExplicitRelationships(projectId)
      case 'collaborative':
        return this.detectCollaborativeRelationships(projectId)
      default:
        return []
    }
  }

  // Detect temporal relationships (time-based sequences)
  private async detectTemporalRelationships(projectId: string): Promise<GraphRelationship[]> {
    const relationships: GraphRelationship[] = []

    try {
      // Get chronological events for the project
      const events = await eventStore.getProjectEvents(projectId)
      const sortedEvents = events.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      // Look for patterns in event sequences
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentEvent = sortedEvents[i]
        const nextEvent = sortedEvents[i + 1]

        // Block creation followed by updates suggests work sequence
        if (currentEvent.type === 'BlockCreated' && nextEvent.type === 'BlockUpdated') {
          const timeDiff = new Date(nextEvent.timestamp).getTime() - new Date(currentEvent.timestamp).getTime()
          const hoursApart = timeDiff / (1000 * 60 * 60)

          if (hoursApart < 24) { // Within 24 hours
            relationships.push(await this.createRelationship(
              currentEvent.aggregateId,
              'block',
              nextEvent.aggregateId,
              'block',
              'temporal_sequence',
              'medium',
              {
                createdBy: 'system',
                reason: 'temporal_sequence',
                evidence: [`Events occurred ${hoursApart.toFixed(1)} hours apart`],
                context: { timeDiff: hoursApart }
              }
            ))
          }
        }

        // Session events create relationships
        if (currentEvent.type === 'SessionStarted' && nextEvent.type === 'BlockCreated') {
          relationships.push(await this.createRelationship(
            currentEvent.aggregateId,
            'session',
            nextEvent.aggregateId,
            'block',
            'contains',
            'strong',
            {
              createdBy: 'system',
              reason: 'block_created_in_session',
              evidence: ['Block created during session']
            }
          ))
        }
      }

      return relationships
    } catch (error) {
      console.error('Failed to detect temporal relationships:', error)
      return []
    }
  }

  // Detect semantic relationships (content similarity)
  private async detectSemanticRelationships(projectId: string): Promise<GraphRelationship[]> {
    const relationships: GraphRelationship[] = []

    try {
      // Get all blocks and context items
      const blocksResult = await blockService.getBlocks(projectId)
      const blocks = blocksResult.data || []

      const contextResult = await contextItemService.getProjectContextItems(projectId)
      const contextItems = contextResult.data || []

      // Compare blocks for semantic similarity
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const blockA = blocks[i]
          const blockB = blocks[j]

          const similarity = this.calculateTextSimilarity(
            `${blockA.title} ${blockA.content}`,
            `${blockB.title} ${blockB.content}`
          )

          if (similarity > 0.7) { // High similarity
            relationships.push(await this.createRelationship(
              blockA.id,
              'block',
              blockB.id,
              'block',
              'semantic_similarity',
              'medium',
              {
                createdBy: 'ai',
                reason: 'high_semantic_similarity',
                evidence: [`Text similarity: ${(similarity * 100).toFixed(1)}%`],
                context: { similarity }
              }
            ))
          }
        }
      }

      // Compare blocks with context items
      for (const block of blocks) {
        for (const contextItem of contextItems) {
          const similarity = this.calculateTextSimilarity(
            `${block.title} ${block.content}`,
            `${contextItem.title} ${contextItem.content}`
          )

          if (similarity > 0.6) {
            relationships.push(await this.createRelationship(
              contextItem.id,
              'context_item',
              block.id,
              'block',
              'references',
              'medium',
              {
                createdBy: 'ai',
                reason: 'semantic_reference',
                evidence: [`Content similarity: ${(similarity * 100).toFixed(1)}%`],
                context: { similarity }
              }
            ))
          }
        }
      }

      return relationships
    } catch (error) {
      console.error('Failed to detect semantic relationships:', error)
      return []
    }
  }

  // Detect explicit relationships (user-defined dependencies, etc.)
  private async detectExplicitRelationships(projectId: string): Promise<GraphRelationship[]> {
    const relationships: GraphRelationship[] = []

    try {
      const blocksResult = await blockService.getBlocks(projectId)
      const blocks = blocksResult.data || []

      for (const block of blocks) {
        // Dependencies
        for (const dependencyId of block.dependencies) {
          relationships.push(await this.createRelationship(
            block.id,
            'block',
            dependencyId,
            'block',
            'depends_on',
            'strong',
            {
              createdBy: 'user',
              reason: 'explicit_dependency',
              evidence: ['User-defined dependency']
            }
          ))
        }

        // Blocked by
        for (const blockerId of block.blocked_by) {
          relationships.push(await this.createRelationship(
            blockerId,
            'block',
            block.id,
            'block',
            'blocks',
            'critical',
            {
              createdBy: 'user',
              reason: 'explicit_blocker',
              evidence: ['User-defined blocker']
            }
          ))
        }
      }

      return relationships
    } catch (error) {
      console.error('Failed to detect explicit relationships:', error)
      return []
    }
  }

  // Detect collaborative relationships (shared work patterns)
  private async detectCollaborativeRelationships(projectId: string): Promise<GraphRelationship[]> {
    const relationships: GraphRelationship[] = []

    try {
      // Get events to see collaboration patterns
      const events = await eventStore.getProjectEvents(projectId)
      
      // Group events by user
      const eventsByUser = events.reduce((acc, event) => {
        if (event.userId) {
          if (!acc[event.userId]) acc[event.userId] = []
          acc[event.userId].push(event)
        }
        return acc
      }, {} as Record<string, any[]>)

      // Look for users working on same blocks
      const userIds = Object.keys(eventsByUser)
      for (let i = 0; i < userIds.length; i++) {
        for (let j = i + 1; j < userIds.length; j++) {
          const userAEvents = eventsByUser[userIds[i]]
          const userBEvents = eventsByUser[userIds[j]]

          // Find common blocks they worked on
          const userABlocks = new Set(
            userAEvents
              .filter(e => e.aggregateType === 'block')
              .map(e => e.aggregateId)
          )
          const userBBlocks = new Set(
            userBEvents
              .filter(e => e.aggregateType === 'block')
              .map(e => e.aggregateId)
          )

          const commonBlocks = [...userABlocks].filter(blockId => userBBlocks.has(blockId))

          if (commonBlocks.length > 0) {
            relationships.push(await this.createRelationship(
              userIds[i],
              'user',
              userIds[j],
              'user',
              'collaborates_with',
              'medium',
              {
                createdBy: 'system',
                reason: 'shared_blocks',
                evidence: [`Collaborated on ${commonBlocks.length} blocks`],
                context: { commonBlocks }
              }
            ))
          }
        }
      }

      return relationships
    } catch (error) {
      console.error('Failed to detect collaborative relationships:', error)
      return []
    }
  }

  // Get graph centered on a specific node
  async getNodeGraph(
    nodeId: string,
    nodeType: NodeType,
    options: GraphQueryOptions = {}
  ): Promise<{
    centerNode: GraphNode
    connectedNodes: GraphNode[]
    relationships: GraphRelationship[]
  }> {
    try {
      const relationships = await this.getRelationshipsForNode(nodeId, nodeType, options)
      const nodeIds = new Set([nodeId])
      
      relationships.forEach(rel => {
        nodeIds.add(rel.sourceId)
        nodeIds.add(rel.targetId)
      })

      const nodes = await this.getNodes([...nodeIds])
      const centerNode = nodes.find(n => n.id === nodeId)!
      const connectedNodes = nodes.filter(n => n.id !== nodeId)

      return {
        centerNode,
        connectedNodes,
        relationships
      }
    } catch (error: any) {
      throw new Error(`Failed to get node graph: ${error.message}`)
    }
  }

  // Calculate relationship confidence
  private calculateRelationshipConfidence(
    relationshipType: RelationshipType,
    metadata: any
  ): number {
    let confidence = 0.5 // Base confidence

    // Confidence based on relationship type
    const typeConfidence: Record<RelationshipType, number> = {
      depends_on: 0.9,        // User-explicit
      blocks: 0.9,            // User-explicit  
      relates_to: 0.6,        // General
      inspired_by: 0.7,       // Derivation
      implements: 0.8,        // Implementation
      references: 0.7,        // Content-based
      contains: 0.9,          // Structural
      derives_from: 0.8,      // Derivation
      collaborates_with: 0.6, // Pattern-based
      temporal_sequence: 0.5, // Time-based
      semantic_similarity: 0.4 // AI-detected
    }

    confidence = typeConfidence[relationshipType] || 0.5

    // Adjust based on creation method
    if (metadata.createdBy === 'user') {
      confidence += 0.2
    } else if (metadata.createdBy === 'ai') {
      confidence -= 0.1
    }

    // Evidence strength
    const evidenceCount = metadata.evidence?.length || 0
    confidence += Math.min(0.2, evidenceCount * 0.05)

    return Math.min(1.0, Math.max(0.1, confidence))
  }

  // Simple text similarity calculation (would use better NLP in production)
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size // Jaccard similarity
  }

  // Filter and deduplicate relationships
  private filterAndDeduplicateRelationships(
    relationships: GraphRelationship[]
  ): GraphRelationship[] {
    const seen = new Set<string>()
    const filtered: GraphRelationship[] = []

    for (const rel of relationships) {
      // Create a key for deduplication
      const key = `${rel.sourceId}-${rel.targetId}-${rel.relationshipType}`
      const reverseKey = `${rel.targetId}-${rel.sourceId}-${rel.relationshipType}`

      if (!seen.has(key) && !seen.has(reverseKey)) {
        // Only keep high-confidence relationships
        if (rel.confidence > 0.3) {
          seen.add(key)
          filtered.push(rel)
        }
      }
    }

    return filtered
  }

  // Get relationships for a specific node
  private async getRelationshipsForNode(
    nodeId: string,
    nodeType: NodeType,
    options: GraphQueryOptions
  ): Promise<GraphRelationship[]> {
    // This would query from the relationships table in production
    // For now, return empty array as placeholder
    return []
  }

  // Get nodes by IDs
  private async getNodes(nodeIds: string[]): Promise<GraphNode[]> {
    // This would fetch nodes from various tables based on their types
    // For now, return empty array as placeholder
    return []
  }

  // Invalidate caches
  private invalidateCache(...nodeIds: string[]): void {
    nodeIds.forEach(id => {
      this.relationshipCache.delete(id)
      this.nodeCache.delete(id)
    })
  }

  // Get relationship statistics for a project
  async getRelationshipStats(projectId: string): Promise<{
    totalRelationships: number
    relationshipsByType: Record<RelationshipType, number>
    relationshipsByStrength: Record<RelationshipStrength, number>
    averageConfidence: number
    mostConnectedNodes: Array<{ nodeId: string; nodeType: NodeType; connectionCount: number }>
  }> {
    try {
      // Get relationship events for the project
      const events = await eventStore.getEventsByType('RelationshipCreated')
      const projectRelationships = events.filter(e => 
        e.data.sourceId === projectId || 
        e.data.targetId === projectId ||
        // This would need better filtering based on project membership
        true
      )

      const stats = {
        totalRelationships: projectRelationships.length,
        relationshipsByType: {} as Record<RelationshipType, number>,
        relationshipsByStrength: {} as Record<RelationshipStrength, number>,
        averageConfidence: 0,
        mostConnectedNodes: [] as Array<{ nodeId: string; nodeType: NodeType; connectionCount: number }>
      }

      // Calculate statistics
      let totalConfidence = 0
      projectRelationships.forEach(event => {
        const rel = event.data
        stats.relationshipsByType[rel.relationshipType] = 
          (stats.relationshipsByType[rel.relationshipType] || 0) + 1
        stats.relationshipsByStrength[rel.strength] = 
          (stats.relationshipsByStrength[rel.strength] || 0) + 1
        totalConfidence += this.calculateRelationshipConfidence(rel.relationshipType, rel.metadata)
      })

      stats.averageConfidence = projectRelationships.length > 0 
        ? totalConfidence / projectRelationships.length 
        : 0

      return stats
    } catch (error: any) {
      throw new Error(`Failed to get relationship stats: ${error.message}`)
    }
  }
}

// Export singleton instance
export const relationshipEngine = new RelationshipEngine()