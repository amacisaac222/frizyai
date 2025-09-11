import type { Block, BlockLane, Priority, EnergyLevel, Complexity } from './database.types'

// Content analysis patterns for auto-categorization
const VISION_PATTERNS = [
  /\b(vision|goal|dream|aspir|mission|purpose|future|long[- ]?term|strategy|roadmap)\b/i,
  /\b(where we|what we want|imagine|envision|ideal|ultimate)\b/i,
  /\b(in \d+ years?|by \d{4}|eventually|someday|big picture)\b/i
]

const TASK_PATTERNS = [
  /\b(do|make|create|build|implement|fix|update|add|remove|test|deploy)\b/i,
  /\b(task|action|item|todo|complete|finish|done)\b/i,
  /\b(need to|should|must|have to|will)\b/i
]

const RESEARCH_PATTERNS = [
  /\b(research|investigate|study|analyze|explore|learn|understand)\b/i,
  /\b(question|why|how|what|documentation|article|reference)\b/i,
  /\b(find out|look into|check|verify|compare)\b/i
]

const URGENT_PATTERNS = [
  /\b(urgent|asap|immediately|emergency|critical|now|today)\b/i,
  /\b(deadline|due|overdue|blocking|stuck|broken)\b/i,
  /\b(priority|important|high|urgent)\b/i
]

const HIGH_PRIORITY_PATTERNS = [
  /\b(important|priority|key|essential|critical|vital)\b/i,
  /\b(this week|soon|next|upcoming)\b/i,
  /\b(milestone|release|launch|delivery)\b/i
]

const COMPLEX_PATTERNS = [
  /\b(complex|complicated|difficult|challenging|research|design|architecture)\b/i,
  /\b(multiple|several|various|many|integration|system|framework)\b/i,
  /\b(unknown|uncertain|investigate|explore|analyze)\b/i
]

const SIMPLE_PATTERNS = [
  /\b(simple|easy|quick|small|minor|trivial|straightforward)\b/i,
  /\b(just|only|simply|basic|update|fix|change)\b/i,
  /\b(\d+\s?min|minutes?|hour|quick)\b/i
]

// Auto-categorization result
export interface CategorySuggestion {
  lane: BlockLane
  priority: Priority
  complexity: Complexity
  energyLevel: EnergyLevel
  confidence: number
  reasoning: string[]
}

// Smart suggestion types
export interface SmartSuggestion {
  id: string
  type: 'stale' | 'ready_to_move' | 'similar' | 'stuck' | 'energy_mismatch' | 'priority_suggestion' | 'completion_opportunity'
  blockId: string
  title: string
  description: string
  confidence: number
  actionType: 'move' | 'update' | 'review' | 'prioritize' | 'complete'
  suggestedChanges?: Partial<Block>
  relatedBlocks?: string[]
  reasoning: string
  createdAt: string
}

// Progress insights
export interface ProgressInsights {
  velocity: {
    blocksPerWeek: number
    completionRate: number
    averageTimeToComplete: number // days
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  energyPatterns: {
    mostProductiveTime: string
    preferredEnergyLevel: EnergyLevel
    energyDistribution: Record<EnergyLevel, number>
    mismatchBlocks: string[] // blocks with wrong energy level
  }
  stuckBlocks: {
    blockIds: string[]
    averageDaysStuck: number
    commonPatterns: string[]
  }
  completionPatterns: {
    averageEffortAccuracy: number // how close estimates are to reality
    complexitySuccessRate: Record<Complexity, number>
    priorityDistribution: Record<Priority, number>
  }
}

/**
 * Auto-categorize a block based on its content
 */
export function categorizeBlock(title: string, content: string): CategorySuggestion {
  const fullText = `${title} ${content}`.toLowerCase()
  const reasoning: string[] = []
  let confidence = 0.5
  
  // Determine lane
  let lane: BlockLane = 'current' // default
  
  if (VISION_PATTERNS.some(pattern => pattern.test(fullText))) {
    lane = 'vision'
    reasoning.push('Contains vision/strategy language')
    confidence += 0.2
  } else if (RESEARCH_PATTERNS.some(pattern => pattern.test(fullText))) {
    lane = 'context'
    reasoning.push('Contains research/reference language')
    confidence += 0.15
  } else if (TASK_PATTERNS.some(pattern => pattern.test(fullText))) {
    lane = 'current'
    reasoning.push('Contains actionable task language')
    confidence += 0.15
  }
  
  // Determine priority
  let priority: Priority = 'medium' // default
  
  if (URGENT_PATTERNS.some(pattern => pattern.test(fullText))) {
    priority = 'urgent'
    reasoning.push('Contains urgent language')
    confidence += 0.2
  } else if (HIGH_PRIORITY_PATTERNS.some(pattern => pattern.test(fullText))) {
    priority = 'high'
    reasoning.push('Contains high priority indicators')
    confidence += 0.15
  }
  
  // Determine complexity
  let complexity: Complexity = 'moderate' // default
  
  if (COMPLEX_PATTERNS.some(pattern => pattern.test(fullText))) {
    complexity = 'complex'
    reasoning.push('Contains complexity indicators')
    confidence += 0.1
  } else if (SIMPLE_PATTERNS.some(pattern => pattern.test(fullText))) {
    complexity = 'simple'
    reasoning.push('Contains simplicity indicators')
    confidence += 0.1
  }
  
  // Determine energy level based on complexity and content
  let energyLevel: EnergyLevel = 'medium' // default
  
  if (complexity === 'complex' || lane === 'vision') {
    energyLevel = 'high'
    reasoning.push('Complex work requires high energy')
  } else if (complexity === 'simple') {
    energyLevel = 'low'
    reasoning.push('Simple task suitable for low energy')
  }
  
  // Adjust based on content type
  if (/\b(creative|design|brainstorm|innovative)\b/i.test(fullText)) {
    energyLevel = 'peak'
    reasoning.push('Creative work requires peak energy')
    confidence += 0.1
  }
  
  return {
    lane,
    priority,
    complexity,
    energyLevel,
    confidence: Math.min(1, confidence),
    reasoning
  }
}

/**
 * Generate smart suggestions for project optimization
 */
export function generateSmartSuggestions(
  blocks: Block[],
  userPreferences?: {
    preferredEnergyLevel?: EnergyLevel
    workingHours?: string
    preferredComplexity?: Complexity
  }
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  const now = new Date()
  
  // 1. Stale blocks - haven't been worked on in a while
  blocks.forEach(block => {
    if (block.status === 'in_progress' && block.last_worked) {
      const daysSinceWorked = (now.getTime() - new Date(block.last_worked).getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceWorked > 7) {
        suggestions.push({
          id: `stale-${block.id}`,
          type: 'stale',
          blockId: block.id,
          title: `"${block.title}" hasn't been touched in ${Math.floor(daysSinceWorked)} days`,
          description: 'This in-progress block might need attention or could be moved to Next Sprint',
          confidence: Math.min(0.9, daysSinceWorked / 14),
          actionType: 'review',
          suggestedChanges: { status: 'not_started', lane: 'next' },
          reasoning: `Block has been in progress for ${Math.floor(daysSinceWorked)} days without activity`,
          createdAt: now.toISOString()
        })
      }
    }
  })
  
  // 2. Ready to move - completed goals that could go to current sprint
  blocks.forEach(block => {
    if (block.lane === 'goals' && block.status === 'completed') {
      const relatedCurrent = blocks.filter(b => 
        b.lane === 'current' && 
        b.tags.some(tag => block.tags.includes(tag))
      )
      
      if (relatedCurrent.length === 0) {
        suggestions.push({
          id: `ready-${block.id}`,
          type: 'ready_to_move',
          blockId: block.id,
          title: `Goal "${block.title}" is ready for action`,
          description: 'This completed goal could be broken down into current sprint tasks',
          confidence: 0.7,
          actionType: 'move',
          suggestedChanges: { lane: 'current', status: 'not_started' },
          reasoning: 'Completed goal with no related current sprint items',
          createdAt: now.toISOString()
        })
      }
    }
  })
  
  // 3. Similar blocks - find patterns in completed work
  const completedBlocks = blocks.filter(b => b.status === 'completed')
  
  blocks.forEach(block => {
    if (block.status === 'not_started') {
      const similar = completedBlocks.find(completed => {
        const titleSimilarity = calculateSimilarity(block.title, completed.title)
        const tagOverlap = block.tags.filter(tag => completed.tags.includes(tag)).length
        return titleSimilarity > 0.3 || tagOverlap >= 2
      })
      
      if (similar) {
        suggestions.push({
          id: `similar-${block.id}`,
          type: 'similar',
          blockId: block.id,
          title: `"${block.title}" is similar to completed work`,
          description: `Similar to "${similar.title}" which took ${similar.effort} hours`,
          confidence: 0.6,
          actionType: 'update',
          suggestedChanges: { 
            effort: similar.effort,
            complexity: similar.complexity,
            energy_level: similar.energy_level
          },
          relatedBlocks: [similar.id],
          reasoning: 'Similar to previously completed block',
          createdAt: now.toISOString()
        })
      }
    }
  })
  
  // 4. Stuck blocks - blocked status for too long
  blocks.forEach(block => {
    if (block.status === 'blocked') {
      const daysSinceBlocked = block.last_worked 
        ? (now.getTime() - new Date(block.last_worked).getTime()) / (1000 * 60 * 60 * 24)
        : 30 // assume blocked for a while if no last_worked
      
      if (daysSinceBlocked > 3) {
        suggestions.push({
          id: `stuck-${block.id}`,
          type: 'stuck',
          blockId: block.id,
          title: `"${block.title}" has been blocked for ${Math.floor(daysSinceBlocked)} days`,
          description: 'Consider breaking this down, finding alternatives, or deprioritizing',
          confidence: Math.min(0.9, daysSinceBlocked / 7),
          actionType: 'review',
          reasoning: `Block has been blocked for ${Math.floor(daysSinceBlocked)} days`,
          createdAt: now.toISOString()
        })
      }
    }
  })
  
  // 5. Energy level mismatches
  if (userPreferences?.preferredEnergyLevel) {
    const currentSprintBlocks = blocks.filter(b => b.lane === 'current' && b.status !== 'completed')
    const mismatchedBlocks = currentSprintBlocks.filter(b => 
      b.energy_level !== userPreferences.preferredEnergyLevel &&
      Math.abs(getEnergyValue(b.energy_level) - getEnergyValue(userPreferences.preferredEnergyLevel)) > 1
    )
    
    mismatchedBlocks.forEach(block => {
      suggestions.push({
        id: `energy-${block.id}`,
        type: 'energy_mismatch',
        blockId: block.id,
        title: `"${block.title}" energy level doesn't match your preference`,
        description: `This ${block.energy_level} energy task might not fit your ${userPreferences.preferredEnergyLevel} energy preference`,
        confidence: 0.5,
        actionType: 'move',
        suggestedChanges: { lane: 'next' },
        reasoning: 'Energy level mismatch with user preferences',
        createdAt: now.toISOString()
      })
    })
  }
  
  // 6. Completion opportunities - high progress blocks
  blocks.forEach(block => {
    if (block.progress >= 80 && block.status === 'in_progress') {
      suggestions.push({
        id: `complete-${block.id}`,
        type: 'completion_opportunity',
        blockId: block.id,
        title: `"${block.title}" is ${block.progress}% complete`,
        description: 'This block is almost done and could be completed soon',
        confidence: 0.8,
        actionType: 'complete',
        suggestedChanges: { status: 'completed', progress: 100 },
        reasoning: `Block is ${block.progress}% complete`,
        createdAt: now.toISOString()
      })
    }
  })
  
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculate progress insights from block history
 */
export function calculateProgressInsights(
  blocks: Block[],
  timeRange: 'week' | 'month' | 'quarter' = 'month'
): ProgressInsights {
  const now = new Date()
  const timeRangeMs = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000
  }
  
  const rangeStart = new Date(now.getTime() - timeRangeMs[timeRange])
  const recentBlocks = blocks.filter(b => new Date(b.created_at) >= rangeStart)
  const completedBlocks = recentBlocks.filter(b => b.status === 'completed')
  
  // Velocity calculation
  const weeksInRange = timeRangeMs[timeRange] / (7 * 24 * 60 * 60 * 1000)
  const blocksPerWeek = completedBlocks.length / weeksInRange
  const completionRate = recentBlocks.length > 0 ? completedBlocks.length / recentBlocks.length : 0
  
  // Average time to complete (simplified - would need better tracking in real app)
  const averageTimeToComplete = completedBlocks.reduce((sum, block) => {
    const created = new Date(block.created_at)
    const completed = new Date(block.updated_at) // approximation
    return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  }, 0) / Math.max(1, completedBlocks.length)
  
  // Energy patterns
  const energyDistribution = blocks.reduce((acc, block) => {
    acc[block.energy_level] = (acc[block.energy_level] || 0) + 1
    return acc
  }, {} as Record<EnergyLevel, number>)
  
  const mostProductiveEnergy = Object.entries(energyDistribution)
    .sort(([,a], [,b]) => b - a)[0]?.[0] as EnergyLevel || 'medium'
  
  // Stuck blocks analysis
  const stuckBlocks = blocks.filter(b => 
    b.status === 'blocked' || 
    (b.status === 'in_progress' && b.last_worked && 
     (now.getTime() - new Date(b.last_worked).getTime()) > 14 * 24 * 60 * 60 * 1000)
  )
  
  const averageDaysStuck = stuckBlocks.reduce((sum, block) => {
    const lastActivity = block.last_worked ? new Date(block.last_worked) : new Date(block.created_at)
    return sum + (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  }, 0) / Math.max(1, stuckBlocks.length)
  
  // Completion patterns
  const complexitySuccessRate = blocks.reduce((acc, block) => {
    if (block.status === 'completed') {
      acc[block.complexity] = (acc[block.complexity] || 0) + 1
    }
    return acc
  }, {} as Record<Complexity, number>)
  
  const priorityDistribution = blocks.reduce((acc, block) => {
    acc[block.priority] = (acc[block.priority] || 0) + 1
    return acc
  }, {} as Record<Priority, number>)
  
  return {
    velocity: {
      blocksPerWeek,
      completionRate,
      averageTimeToComplete,
      trend: 'stable' // Would need historical data for real trend analysis
    },
    energyPatterns: {
      mostProductiveTime: 'morning', // Would need time tracking for real data
      preferredEnergyLevel: mostProductiveEnergy,
      energyDistribution,
      mismatchBlocks: [] // Would need more sophisticated analysis
    },
    stuckBlocks: {
      blockIds: stuckBlocks.map(b => b.id),
      averageDaysStuck,
      commonPatterns: ['blocking dependencies', 'unclear requirements'] // simplified
    },
    completionPatterns: {
      averageEffortAccuracy: 0.75, // Would need effort tracking
      complexitySuccessRate,
      priorityDistribution
    }
  }
}

// Helper functions
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/)
  const words2 = str2.toLowerCase().split(/\s+/)
  const common = words1.filter(word => words2.includes(word)).length
  return common / Math.max(words1.length, words2.length)
}

function getEnergyValue(energy: EnergyLevel): number {
  const values = { low: 1, medium: 2, high: 3, peak: 4 }
  return values[energy] || 2
}

/**
 * Apply smart suggestion to a block
 */
export function applySuggestion(block: Block, suggestion: SmartSuggestion): Partial<Block> {
  const updates: Partial<Block> = { ...suggestion.suggestedChanges }
  
  // Add some smart defaults based on suggestion type
  switch (suggestion.type) {
    case 'stale':
      updates.status = 'not_started'
      updates.lane = 'next'
      break
    case 'completion_opportunity':
      updates.status = 'completed'
      updates.progress = 100
      break
    case 'energy_mismatch':
      updates.lane = 'next'
      break
  }
  
  return updates
}

/**
 * Batch process blocks for intelligent categorization
 */
export async function processBlocksBatch(
  blocks: Array<{ title: string; content: string; id?: string }>
): Promise<Array<{ id?: string; suggestions: CategorySuggestion }>> {
  return blocks.map(block => ({
    id: block.id,
    suggestions: categorizeBlock(block.title, block.content)
  }))
}