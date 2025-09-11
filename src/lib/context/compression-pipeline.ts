// Context Compression Pipeline for Claude Sessions
// Intelligently compresses project context while preserving important information

import { eventStore } from '../events/event-store'
import { blockService, contextItemService } from '../database'
import { insightService } from '../events/event-sourced-services'
import type { Block, ContextItem } from '../database.types'

// Compression strategies
export type CompressionStrategy = 
  | 'preserve_insights'      // Keep insights and decisions, compress rest
  | 'preserve_recent'        // Keep recent activity, compress old
  | 'preserve_important'     // Keep high-priority and active items
  | 'preserve_relationships' // Keep items with strong relationships
  | 'adaptive'              // Use ML to determine what to keep

// Compression result
export interface CompressionResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  preservedItems: string[]
  removedItems: string[]
  strategy: CompressionStrategy
  metadata: {
    timestamp: string
    reason: string
    preservationCriteria: string[]
  }
}

// Context item with scoring
interface ScoredContextItem {
  id: string
  type: 'block' | 'context_item' | 'insight' | 'session'
  data: any
  score: number
  reasons: string[]
  relationships: string[]
  lastAccessed: string
  importance: number
}

// Context compression pipeline
export class ContextCompressionPipeline {
  private readonly DEFAULT_TARGET_SIZE = 50000 // characters
  private readonly MIN_PRESERVATION_RATIO = 0.3 // Always preserve at least 30%

  async compressProjectContext(
    projectId: string,
    options: {
      strategy?: CompressionStrategy
      targetSize?: number
      preserveBlocks?: string[]
      preserveInsights?: string[]
      preserveAfterDate?: string
    } = {}
  ): Promise<CompressionResult> {
    try {
      const strategy = options.strategy || 'adaptive'
      const targetSize = options.targetSize || this.DEFAULT_TARGET_SIZE

      // 1. Gather all context items
      const allItems = await this.gatherContextItems(projectId)
      
      // 2. Calculate original size
      const originalSize = this.calculateContextSize(allItems)

      // 3. Score items based on strategy
      const scoredItems = await this.scoreContextItems(
        allItems,
        strategy,
        {
          projectId,
          preserveBlocks: options.preserveBlocks,
          preserveInsights: options.preserveInsights,
          preserveAfterDate: options.preserveAfterDate
        }
      )

      // 4. Select items to preserve
      const preservedItems = this.selectItemsToPreserve(
        scoredItems,
        targetSize,
        strategy
      )

      // 5. Create compressed context
      const compressedSize = this.calculateContextSize(preservedItems)
      const compressionRatio = compressedSize / originalSize

      // 6. Record compression event
      await this.recordCompressionEvent(projectId, {
        originalSize,
        compressedSize,
        compressionRatio,
        strategy,
        preservedItems: preservedItems.map(item => item.id),
        removedItems: allItems
          .filter(item => !preservedItems.find(p => p.id === item.id))
          .map(item => item.id)
      })

      return {
        originalSize,
        compressedSize,
        compressionRatio,
        preservedItems: preservedItems.map(item => item.id),
        removedItems: allItems
          .filter(item => !preservedItems.find(p => p.id === item.id))
          .map(item => item.id),
        strategy,
        metadata: {
          timestamp: new Date().toISOString(),
          reason: `Compressed using ${strategy} strategy`,
          preservationCriteria: this.getPreservationCriteria(strategy)
        }
      }
    } catch (error: any) {
      throw new Error(`Context compression failed: ${error.message}`)
    }
  }

  // Gather all context items for a project
  private async gatherContextItems(projectId: string): Promise<ScoredContextItem[]> {
    try {
      // Get blocks
      const blocksResult = await blockService.getBlocks(projectId)
      const blocks = blocksResult.data || []

      // Get context items
      const contextResult = await contextItemService.getProjectContextItems(projectId)
      const contextItems = contextResult.data || []

      // Get insights
      const insightsResult = await insightService.getProjectInsights(projectId)
      const insights = insightsResult.data || []

      // Get events for additional context
      const events = await eventStore.getProjectEvents(projectId)

      // Convert to scored context items
      const allItems: ScoredContextItem[] = []

      // Add blocks
      blocks.forEach(block => {
        allItems.push({
          id: block.id,
          type: 'block',
          data: block,
          score: 0, // Will be calculated later
          reasons: [],
          relationships: [...block.dependencies, ...block.blocked_by],
          lastAccessed: block.last_worked || block.updated_at,
          importance: this.calculateBlockImportance(block)
        })
      })

      // Add context items
      contextItems.forEach(item => {
        allItems.push({
          id: item.id,
          type: 'context_item',
          data: item,
          score: 0,
          reasons: [],
          relationships: item.related_block_ids,
          lastAccessed: item.accessed_at || item.updated_at,
          importance: item.confidence_score
        })
      })

      // Add insights
      insights.forEach(insight => {
        allItems.push({
          id: insight.id,
          type: 'insight',
          data: insight,
          score: 0,
          reasons: [],
          relationships: insight.relatedBlockIds || [],
          lastAccessed: insight.capturedAt,
          importance: this.calculateInsightImportance(insight)
        })
      })

      return allItems
    } catch (error) {
      console.error('Failed to gather context items:', error)
      return []
    }
  }

  // Score context items based on strategy
  private async scoreContextItems(
    items: ScoredContextItem[],
    strategy: CompressionStrategy,
    options: {
      projectId: string
      preserveBlocks?: string[]
      preserveInsights?: string[]
      preserveAfterDate?: string
    }
  ): Promise<ScoredContextItem[]> {
    const now = new Date()
    const preserveAfterDate = options.preserveAfterDate 
      ? new Date(options.preserveAfterDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

    return items.map(item => {
      let score = 0
      const reasons: string[] = []

      // Base importance score
      score += item.importance * 10
      if (item.importance > 0.7) reasons.push('high-importance')

      // Strategy-specific scoring
      switch (strategy) {
        case 'preserve_insights':
          if (item.type === 'insight') {
            score += 50
            reasons.push('insight-item')
          }
          if (item.data.type === 'decision') {
            score += 30
            reasons.push('decision-type')
          }
          break

        case 'preserve_recent':
          const lastAccessed = new Date(item.lastAccessed)
          const daysSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceAccess < 7) {
            score += 40
            reasons.push('accessed-recently')
          } else if (daysSinceAccess < 30) {
            score += 20
            reasons.push('accessed-this-month')
          }
          break

        case 'preserve_important':
          if (item.type === 'block') {
            const block = item.data as Block
            if (block.priority === 'urgent') {
              score += 40
              reasons.push('urgent-priority')
            } else if (block.priority === 'high') {
              score += 25
              reasons.push('high-priority')
            }
            if (block.status === 'in_progress') {
              score += 30
              reasons.push('in-progress')
            }
          }
          break

        case 'preserve_relationships':
          const relationshipCount = item.relationships.length
          score += relationshipCount * 5
          if (relationshipCount > 3) reasons.push('highly-connected')
          if (relationshipCount > 0) reasons.push('has-relationships')
          break

        case 'adaptive':
          // Combine multiple factors
          score += this.calculateAdaptiveScore(item, items)
          reasons.push('adaptive-scoring')
          break
      }

      // Force preservation for specific items
      if (options.preserveBlocks?.includes(item.id)) {
        score += 100
        reasons.push('force-preserved')
      }
      if (options.preserveInsights?.includes(item.id)) {
        score += 100
        reasons.push('force-preserved')
      }

      // Recent items bonus
      if (new Date(item.lastAccessed) > preserveAfterDate) {
        score += 15
        reasons.push('recent-activity')
      }

      return {
        ...item,
        score,
        reasons
      }
    })
  }

  // Calculate adaptive score using multiple factors
  private calculateAdaptiveScore(item: ScoredContextItem, allItems: ScoredContextItem[]): number {
    let score = 0

    // Recency factor (0-20 points)
    const now = new Date()
    const lastAccessed = new Date(item.lastAccessed)
    const daysSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 20 - daysSinceAccess / 7)
    score += recencyScore

    // Relationship centrality (0-15 points)
    const centralityScore = Math.min(15, item.relationships.length * 3)
    score += centralityScore

    // Type-specific factors
    if (item.type === 'insight') {
      score += 15 // Insights are valuable
      if (item.data.importance === 'high') score += 10
    } else if (item.type === 'block') {
      const block = item.data as Block
      if (block.status === 'in_progress') score += 10
      if (block.priority === 'urgent') score += 8
      if (block.claude_sessions > 0) score += 5
    }

    // Content richness (longer content = more valuable)
    const contentLength = JSON.stringify(item.data).length
    const contentScore = Math.min(10, contentLength / 1000)
    score += contentScore

    return score
  }

  // Select items to preserve based on scores and target size
  private selectItemsToPreserve(
    scoredItems: ScoredContextItem[],
    targetSize: number,
    strategy: CompressionStrategy
  ): ScoredContextItem[] {
    // Sort by score (highest first)
    const sorted = [...scoredItems].sort((a, b) => b.score - a.score)

    // Always preserve minimum ratio
    const minPreserveCount = Math.max(
      Math.floor(scoredItems.length * this.MIN_PRESERVATION_RATIO),
      10 // At least 10 items
    )

    let preservedItems: ScoredContextItem[] = []
    let currentSize = 0

    // Add items until we hit target size or minimum count
    for (const item of sorted) {
      const itemSize = this.calculateItemSize(item)
      
      if (currentSize + itemSize <= targetSize || preservedItems.length < minPreserveCount) {
        preservedItems.push(item)
        currentSize += itemSize
      } else {
        break
      }
    }

    // Ensure we preserve at least the minimum
    if (preservedItems.length < minPreserveCount) {
      preservedItems = sorted.slice(0, minPreserveCount)
    }

    return preservedItems
  }

  // Calculate size of context items
  private calculateContextSize(items: ScoredContextItem[]): number {
    return items.reduce((total, item) => total + this.calculateItemSize(item), 0)
  }

  // Calculate size of individual item
  private calculateItemSize(item: ScoredContextItem): number {
    return JSON.stringify(item.data).length
  }

  // Calculate block importance
  private calculateBlockImportance(block: Block): number {
    let importance = 0.5 // Base importance

    // Priority factor
    const priorityScores = { urgent: 1.0, high: 0.8, medium: 0.6, low: 0.4 }
    importance *= priorityScores[block.priority] || 0.5

    // Status factor
    if (block.status === 'in_progress') importance += 0.3
    if (block.status === 'completed') importance += 0.2
    if (block.status === 'blocked') importance += 0.1

    // Activity factor
    if (block.claude_sessions > 0) importance += 0.2
    if (block.last_worked) {
      const daysSinceWorked = (Date.now() - new Date(block.last_worked).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceWorked < 7) importance += 0.2
    }

    // Relationship factor
    const relationshipCount = block.dependencies.length + block.blocked_by.length
    importance += Math.min(0.3, relationshipCount * 0.1)

    return Math.min(1.0, importance)
  }

  // Calculate insight importance
  private calculateInsightImportance(insight: any): number {
    let importance = 0.7 // Base importance for insights

    // Importance level
    const importanceScores = { high: 1.0, medium: 0.7, low: 0.4 }
    importance *= importanceScores[insight.importance] || 0.5

    // Type factor
    const typeScores = { 
      decision: 1.0, 
      problem_solution: 0.9, 
      learning: 0.8, 
      idea: 0.7, 
      blocker: 0.8, 
      next_step: 0.6 
    }
    importance *= typeScores[insight.type] || 0.5

    // Relationship factor
    const relationshipCount = insight.relatedBlockIds?.length || 0
    importance += Math.min(0.2, relationshipCount * 0.05)

    return Math.min(1.0, importance)
  }

  // Record compression event
  private async recordCompressionEvent(
    projectId: string,
    compressionData: {
      originalSize: number
      compressedSize: number
      compressionRatio: number
      strategy: CompressionStrategy
      preservedItems: string[]
      removedItems: string[]
    }
  ): Promise<void> {
    try {
      await eventStore.appendEvent(
        `compression-${Date.now()}`,
        'compression',
        'ContextCompressed',
        {
          sessionId: null, // Will be set if in session
          projectId,
          ...compressionData
        }
      )
    } catch (error) {
      console.error('Failed to record compression event:', error)
    }
  }

  // Get preservation criteria for strategy
  private getPreservationCriteria(strategy: CompressionStrategy): string[] {
    const criteria: Record<CompressionStrategy, string[]> = {
      preserve_insights: ['insights', 'decisions', 'high-importance'],
      preserve_recent: ['recent-activity', 'last-7-days', 'current-work'],
      preserve_important: ['urgent-blocks', 'in-progress', 'high-priority'],
      preserve_relationships: ['connected-items', 'dependencies', 'relationships'],
      adaptive: ['multi-factor', 'recency', 'importance', 'relationships', 'activity']
    }

    return criteria[strategy] || ['unknown']
  }

  // Get compression statistics for a project
  async getCompressionHistory(projectId: string): Promise<any[]> {
    try {
      const events = await eventStore.getEventsByType('ContextCompressed')
      return events
        .filter(event => event.data.projectId === projectId)
        .map(event => ({
          timestamp: event.timestamp,
          strategy: event.data.strategy,
          originalSize: event.data.originalSize,
          compressedSize: event.data.compressedSize,
          compressionRatio: event.data.compressionRatio,
          preservedItems: event.data.preservedItems.length,
          removedItems: event.data.removedItems.length
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      console.error('Failed to get compression history:', error)
      return []
    }
  }
}

// Export singleton instance
export const compressionPipeline = new ContextCompressionPipeline()