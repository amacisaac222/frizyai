import type { Block, Project } from './database.types'

// Context scoring weights and configuration
export interface ContextScoringConfig {
  weights: {
    recency: number        // How recently the block was updated/worked on
    sessions: number       // Number of Claude sessions on this block
    priority: number       // Block priority (urgent, high, medium, low)
    status: number         // Block status weight
    importance: number     // User-marked importance
    dependencies: number   // How many other blocks depend on this
  }
  recencyDecayDays: number // Days after which recency starts to decay
  maxContextBlocks: number // Maximum blocks to include in context
  compressionThreshold: number // Score below which blocks get compressed
}

export const DEFAULT_CONTEXT_CONFIG: ContextScoringConfig = {
  weights: {
    recency: 0.25,
    sessions: 0.20,
    priority: 0.20,
    status: 0.15,
    importance: 0.15,
    dependencies: 0.05
  },
  recencyDecayDays: 7,
  maxContextBlocks: 15,
  compressionThreshold: 0.3
}

// Context item with scoring metadata
export interface ContextItem {
  block: Block
  score: number
  scoreBreakdown: {
    recency: number
    sessions: number
    priority: number
    status: number
    importance: number
    dependencies: number
    total: number
  }
  includeReason: string[]
  compressionLevel: 'full' | 'summary' | 'minimal'
  manualOverride?: 'include' | 'exclude'
  isUserMarkedImportant?: boolean
}

// Context generation result
export interface ProjectContext {
  items: ContextItem[]
  summary: {
    totalBlocks: number
    includedBlocks: number
    compressedBlocks: number
    excludedBlocks: number
    avgScore: number
    contextSize: number // estimated character count
  }
  generatedAt: string
  config: ContextScoringConfig
}

// Decision history for learning
export interface ContextDecision {
  id: string
  projectId: string
  generatedAt: string
  includedBlockIds: string[]
  excludedBlockIds: string[]
  manualOverrides: Record<string, 'include' | 'exclude'>
  config: ContextScoringConfig
  userFeedback?: {
    wasHelpful: boolean
    missingBlocks?: string[]
    unnecessaryBlocks?: string[]
    notes?: string
  }
}

/**
 * Core context scoring algorithm
 */
export function calculateContextScore(
  block: Block,
  config: ContextScoringConfig,
  projectBlocks: Block[],
  userImportantBlocks: Set<string> = new Set()
): ContextItem['scoreBreakdown'] {
  const now = new Date()
  
  // 1. Recency Score (0-1)
  const lastActivity = block.last_worked ? new Date(block.last_worked) : new Date(block.updated_at)
  const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 1 - (daysSinceActivity / config.recencyDecayDays))
  
  // 2. Sessions Score (0-1)
  const maxSessions = Math.max(1, Math.max(...projectBlocks.map(b => b.claude_sessions)))
  const sessionsScore = Math.min(1, block.claude_sessions / maxSessions)
  
  // 3. Priority Score (0-1)
  const priorityValues = { urgent: 1, high: 0.8, medium: 0.5, low: 0.2 }
  const priorityScore = priorityValues[block.priority] || 0.2
  
  // 4. Status Score (0-1)
  const statusValues = {
    in_progress: 1.0,
    blocked: 0.9,      // High because blocked items need attention
    not_started: 0.6,
    completed: 0.3,
    archived: 0.1
  }
  const statusScore = statusValues[block.status] || 0.5
  
  // 5. Importance Score (0-1)
  const importanceScore = userImportantBlocks.has(block.id) ? 1.0 : 0.0
  
  // 6. Dependencies Score (0-1)
  const dependentBlocks = projectBlocks.filter(b => 
    b.dependencies.includes(block.id) || b.blocked_by.includes(block.id)
  )
  const maxDependencies = Math.max(1, Math.max(...projectBlocks.map(b => 
    projectBlocks.filter(pb => pb.dependencies.includes(b.id) || pb.blocked_by.includes(b.id)).length
  )))
  const dependenciesScore = Math.min(1, dependentBlocks.length / maxDependencies)
  
  // Calculate weighted total
  const total = 
    recencyScore * config.weights.recency +
    sessionsScore * config.weights.sessions +
    priorityScore * config.weights.priority +
    statusScore * config.weights.status +
    importanceScore * config.weights.importance +
    dependenciesScore * config.weights.dependencies
  
  return {
    recency: recencyScore,
    sessions: sessionsScore,
    priority: priorityScore,
    status: statusScore,
    importance: importanceScore,
    dependencies: dependenciesScore,
    total: Math.min(1, total) // Cap at 1.0
  }
}

/**
 * Generate context for a project
 */
export function generateProjectContext(
  blocks: Block[],
  config: ContextScoringConfig = DEFAULT_CONTEXT_CONFIG,
  userImportantBlocks: Set<string> = new Set(),
  manualOverrides: Record<string, 'include' | 'exclude'> = {}
): ProjectContext {
  const now = new Date().toISOString()
  
  // Calculate scores for all blocks
  const scoredItems: ContextItem[] = blocks.map(block => {
    const scoreBreakdown = calculateContextScore(block, config, blocks, userImportantBlocks)
    const reasons: string[] = []
    
    // Determine inclusion reasons
    if (scoreBreakdown.recency > 0.7) reasons.push('Recently active')
    if (scoreBreakdown.sessions > 0.5) reasons.push('Frequent Claude sessions')
    if (scoreBreakdown.priority > 0.7) reasons.push('High priority')
    if (scoreBreakdown.status === 1.0) reasons.push('Currently in progress')
    if (scoreBreakdown.status === 0.9) reasons.push('Blocked - needs attention')
    if (scoreBreakdown.importance === 1.0) reasons.push('User marked important')
    if (scoreBreakdown.dependencies > 0.5) reasons.push('Many dependencies')
    
    // Determine compression level
    let compressionLevel: ContextItem['compressionLevel'] = 'full'
    if (scoreBreakdown.total < config.compressionThreshold) {
      compressionLevel = scoreBreakdown.total < config.compressionThreshold / 2 ? 'minimal' : 'summary'
    }
    
    return {
      block,
      score: scoreBreakdown.total,
      scoreBreakdown,
      includeReason: reasons,
      compressionLevel,
      manualOverride: manualOverrides[block.id],
      isUserMarkedImportant: userImportantBlocks.has(block.id)
    }
  })
  
  // Sort by score (highest first)
  scoredItems.sort((a, b) => b.score - a.score)
  
  // Apply manual overrides and limits
  const includedItems: ContextItem[] = []
  const excludedItems: ContextItem[] = []
  
  for (const item of scoredItems) {
    if (item.manualOverride === 'exclude') {
      excludedItems.push(item)
      continue
    }
    
    if (item.manualOverride === 'include' || 
        (includedItems.length < config.maxContextBlocks && item.score > 0)) {
      includedItems.push(item)
    } else {
      excludedItems.push(item)
    }
  }
  
  const allItems = [...includedItems, ...excludedItems]
  const compressedCount = includedItems.filter(item => item.compressionLevel !== 'full').length
  const avgScore = includedItems.reduce((sum, item) => sum + item.score, 0) / includedItems.length || 0
  
  // Estimate context size
  const contextSize = includedItems.reduce((size, item) => {
    const baseSize = item.block.title.length + item.block.content.length
    switch (item.compressionLevel) {
      case 'minimal': return size + Math.min(100, baseSize * 0.1)
      case 'summary': return size + Math.min(300, baseSize * 0.3)
      default: return size + baseSize
    }
  }, 0)
  
  return {
    items: allItems,
    summary: {
      totalBlocks: blocks.length,
      includedBlocks: includedItems.length,
      compressedBlocks: compressedCount,
      excludedBlocks: excludedItems.length,
      avgScore,
      contextSize
    },
    generatedAt: now,
    config
  }
}

/**
 * Compress block content based on compression level
 */
export function compressBlockContent(block: Block, level: ContextItem['compressionLevel']): string {
  const title = block.title
  const content = block.content
  const tags = block.tags.join(', ')
  const status = block.status
  const priority = block.priority
  
  switch (level) {
    case 'minimal':
      return `${title} [${status}, ${priority}]${tags ? ` #${tags}` : ''}`
    
    case 'summary':
      const summary = content.length > 150 ? content.substring(0, 150) + '...' : content
      return `${title} [${status}, ${priority}]
${summary}${tags ? `\nTags: ${tags}` : ''}`
    
    case 'full':
    default:
      return `${title} [${status}, ${priority}]
${content}${tags ? `\nTags: ${tags}` : ''}
Last worked: ${block.last_worked || 'Never'}
Claude sessions: ${block.claude_sessions}
Progress: ${block.progress}%`
  }
}

/**
 * Generate final context string for Claude
 */
export function generateContextString(context: ProjectContext, project?: Project): string {
  const included = context.items.filter(item => 
    item.manualOverride !== 'exclude' && 
    context.items.indexOf(item) < context.summary.includedBlocks
  )
  
  let contextString = ''
  
  // Project header
  if (project) {
    contextString += `# Project: ${project.name}\n`
    if (project.description) {
      contextString += `${project.description}\n`
    }
    contextString += `\nProject Status: ${context.summary.includedBlocks}/${context.summary.totalBlocks} blocks included\n\n`
  }
  
  // Group by lane
  const lanes = ['vision', 'goals', 'current', 'next', 'context'] as const
  
  for (const lane of lanes) {
    const laneItems = included.filter(item => item.block.lane === lane)
    if (laneItems.length === 0) continue
    
    contextString += `## ${lane.charAt(0).toUpperCase() + lane.slice(1)} Lane\n\n`
    
    for (const item of laneItems) {
      const compressed = compressBlockContent(item.block, item.compressionLevel)
      contextString += `### ${compressed}\n`
      
      if (item.compressionLevel !== 'full' && item.includeReason.length > 0) {
        contextString += `*Included because: ${item.includeReason.join(', ')}*\n`
      }
      contextString += '\n'
    }
  }
  
  // Footer with context metadata
  contextString += `---\n`
  contextString += `Context generated: ${new Date(context.generatedAt).toLocaleString()}\n`
  contextString += `Compression: ${context.summary.compressedBlocks} blocks compressed\n`
  contextString += `Estimated size: ${Math.round(context.summary.contextSize / 1000)}k characters\n`
  
  return contextString
}

/**
 * Export context for external tools
 */
export function exportContext(context: ProjectContext, format: 'json' | 'markdown' | 'txt' = 'json') {
  switch (format) {
    case 'markdown':
      return generateContextString(context)
    
    case 'txt':
      return generateContextString(context).replace(/#{1,3}\s/g, '').replace(/\*([^*]+)\*/g, '$1')
    
    case 'json':
    default:
      return JSON.stringify({
        context,
        exportedAt: new Date().toISOString(),
        format
      }, null, 2)
  }
}