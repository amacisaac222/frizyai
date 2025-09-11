import { 
  Block, 
  Project, 
  BlockLane, 
  BlockStatus, 
  Priority, 
  EnergyLevel, 
  Complexity,
  ProjectMood,
  MCPConnectionStatus,
  SessionData,
  ContextItem,
  AISuggestion
} from './types'

import {
  BLOCK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  ENERGY_LEVEL_CONFIG,
  COMPLEXITY_CONFIG,
  DEFAULT_VALUES
} from './constants'

// Type guards
export const isValidBlockLane = (lane: string): lane is BlockLane => {
  return Object.values(BlockLane).includes(lane as BlockLane)
}

export const isValidBlockStatus = (status: string): status is BlockStatus => {
  return Object.values(BlockStatus).includes(status as BlockStatus)
}

export const isValidPriority = (priority: string): priority is Priority => {
  return Object.values(Priority).includes(priority as Priority)
}

export const isValidEnergyLevel = (energy: string): energy is EnergyLevel => {
  return Object.values(EnergyLevel).includes(energy as EnergyLevel)
}

export const isValidComplexity = (complexity: string): complexity is Complexity => {
  return Object.values(Complexity).includes(complexity as Complexity)
}

export const isValidProjectMood = (mood: string): mood is ProjectMood => {
  return Object.values(ProjectMood).includes(mood as ProjectMood)
}

// Block utilities
export const createDefaultBlock = (projectId: string, lane: BlockLane): Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> => ({
  projectId,
  title: '',
  content: '',
  lane,
  status: BlockStatus.NOT_STARTED,
  progress: DEFAULT_VALUES.BLOCK.progress,
  effort: DEFAULT_VALUES.BLOCK.effort,
  priority: DEFAULT_VALUES.BLOCK.priority,
  claudeSessions: DEFAULT_VALUES.BLOCK.claudeSessions,
  lastWorked: null,
  relatedSessionIds: [],
  energyLevel: DEFAULT_VALUES.BLOCK.energyLevel,
  complexity: DEFAULT_VALUES.BLOCK.complexity,
  inspiration: DEFAULT_VALUES.BLOCK.inspiration,
  tags: [],
  dependencies: [],
  blockedBy: [],
  aiSuggestions: []
})

export const createDefaultProject = (userId: string): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId,
  name: '',
  description: '',
  mcpConnection: DEFAULT_VALUES.PROJECT.mcpConnection,
  totalSessions: DEFAULT_VALUES.PROJECT.totalSessions,
  mood: DEFAULT_VALUES.PROJECT.mood,
  moodHistory: [],
  blocksCount: {
    [BlockLane.VISION]: 0,
    [BlockLane.GOALS]: 0,
    [BlockLane.CURRENT]: 0,
    [BlockLane.NEXT]: 0,
    [BlockLane.CONTEXT]: 0
  },
  completionRate: DEFAULT_VALUES.PROJECT.completionRate,
  isArchived: DEFAULT_VALUES.PROJECT.isArchived,
  isPublic: DEFAULT_VALUES.PROJECT.isPublic
})

// Status transition utilities
export const canTransitionBlockStatus = (from: BlockStatus, to: BlockStatus): boolean => {
  return BLOCK_STATUS_CONFIG[from].canTransitionTo.includes(to)
}

export const getNextValidStatuses = (currentStatus: BlockStatus): BlockStatus[] => {
  return BLOCK_STATUS_CONFIG[currentStatus].canTransitionTo
}

// Priority utilities
export const getPriorityValue = (priority: Priority): number => {
  return PRIORITY_CONFIG[priority].value
}

export const comparePriority = (a: Priority, b: Priority): number => {
  return getPriorityValue(b) - getPriorityValue(a) // Higher priority first
}

export const sortBlocksByPriority = (blocks: Block[]): Block[] => {
  return [...blocks].sort((a, b) => comparePriority(a.priority, b.priority))
}

// Energy and complexity matching
export const isEnergyComplexityMatch = (energy: EnergyLevel, complexity: Complexity): boolean => {
  return ENERGY_LEVEL_CONFIG[energy].suggestedComplexity.includes(complexity)
}

export const getRecommendedComplexityForEnergy = (energy: EnergyLevel): Complexity[] => {
  return ENERGY_LEVEL_CONFIG[energy].suggestedComplexity
}

export const getEstimatedEffortForComplexity = (complexity: Complexity): number | null => {
  return COMPLEXITY_CONFIG[complexity].estimatedHours
}

// Block filtering and sorting
export const filterBlocksByStatus = (blocks: Block[], statuses: BlockStatus[]): Block[] => {
  return blocks.filter(block => statuses.includes(block.status))
}

export const filterBlocksByLane = (blocks: Block[], lanes: BlockLane[]): Block[] => {
  return blocks.filter(block => lanes.includes(block.lane))
}

export const filterBlocksByPriority = (blocks: Block[], priorities: Priority[]): Block[] => {
  return blocks.filter(block => priorities.includes(block.priority))
}

export const filterBlocksByEnergyLevel = (blocks: Block[], energyLevels: EnergyLevel[]): Block[] => {
  return blocks.filter(block => energyLevels.includes(block.energyLevel))
}

export const sortBlocksByLastWorked = (blocks: Block[]): Block[] => {
  return [...blocks].sort((a, b) => {
    if (!a.lastWorked && !b.lastWorked) return 0
    if (!a.lastWorked) return 1
    if (!b.lastWorked) return -1
    return new Date(b.lastWorked).getTime() - new Date(a.lastWorked).getTime()
  })
}

export const sortBlocksByProgress = (blocks: Block[]): Block[] => {
  return [...blocks].sort((a, b) => b.progress - a.progress)
}

// Project utilities
export const calculateProjectCompletionRate = (blocks: Block[]): number => {
  if (blocks.length === 0) return 0
  
  const completedBlocks = blocks.filter(block => block.status === BlockStatus.COMPLETED)
  return Math.round((completedBlocks.length / blocks.length) * 100)
}

export const calculateProjectBlocksCount = (blocks: Block[]) => {
  return blocks.reduce((acc, block) => {
    acc[block.lane] = (acc[block.lane] || 0) + 1
    return acc
  }, {} as Record<BlockLane, number>)
}

export const getProjectProgress = (project: Project, blocks: Block[]) => {
  const totalEffort = blocks.reduce((sum, block) => sum + block.effort, 0)
  const completedEffort = blocks
    .filter(block => block.status === BlockStatus.COMPLETED)
    .reduce((sum, block) => sum + block.effort, 0)
    
  return totalEffort > 0 ? Math.round((completedEffort / totalEffort) * 100) : 0
}

// Search utilities
export const searchBlocks = (blocks: Block[], searchTerm: string): Block[] => {
  const term = searchTerm.toLowerCase().trim()
  if (!term) return blocks
  
  return blocks.filter(block => 
    block.title.toLowerCase().includes(term) ||
    block.content.toLowerCase().includes(term) ||
    block.tags.some(tag => tag.toLowerCase().includes(term))
  )
}

export const searchProjects = (projects: Project[], searchTerm: string): Project[] => {
  const term = searchTerm.toLowerCase().trim()
  if (!term) return projects
  
  return projects.filter(project =>
    project.name.toLowerCase().includes(term) ||
    project.description.toLowerCase().includes(term)
  )
}

// Validation utilities
export const validateBlock = (block: Partial<Block>): string[] => {
  const errors: string[] = []
  
  if (!block.title?.trim()) {
    errors.push('Title is required')
  } else if (block.title.length > 100) {
    errors.push('Title must be 100 characters or less')
  }
  
  if (block.content && block.content.length > 5000) {
    errors.push('Content must be 5000 characters or less')
  }
  
  if (block.effort !== undefined && (block.effort < 0 || block.effort > 1000)) {
    errors.push('Effort must be between 0 and 1000 hours')
  }
  
  if (block.progress !== undefined && (block.progress < 0 || block.progress > 100)) {
    errors.push('Progress must be between 0 and 100')
  }
  
  if (block.inspiration !== undefined && (block.inspiration < 1 || block.inspiration > 10)) {
    errors.push('Inspiration must be between 1 and 10')
  }
  
  if (block.tags && block.tags.length > 10) {
    errors.push('Maximum 10 tags allowed')
  }
  
  return errors
}

export const validateProject = (project: Partial<Project>): string[] => {
  const errors: string[] = []
  
  if (!project.name?.trim()) {
    errors.push('Name is required')
  } else if (project.name.length > 50) {
    errors.push('Name must be 50 characters or less')
  }
  
  if (project.description && project.description.length > 1000) {
    errors.push('Description must be 1000 characters or less')
  }
  
  if (project.mcpPort !== undefined && (project.mcpPort < 1000 || project.mcpPort > 65535)) {
    errors.push('MCP port must be between 1000 and 65535')
  }
  
  return errors
}

// Date utilities
export const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  
  if (diffInMinutes < 1) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hours ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} days ago`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`
  
  const diffInMonths = Math.floor(diffInDays / 30)
  return `${diffInMonths} months ago`
}

// ID generation
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Color utilities for UI
export const getBlockLaneColor = (lane: BlockLane): string => {
  const colors = {
    [BlockLane.VISION]: 'purple',
    [BlockLane.GOALS]: 'blue', 
    [BlockLane.CURRENT]: 'green',
    [BlockLane.NEXT]: 'orange',
    [BlockLane.CONTEXT]: 'gray'
  }
  return colors[lane]
}

export const getBlockStatusColor = (status: BlockStatus): string => {
  return BLOCK_STATUS_CONFIG[status].color
}

export const getPriorityColor = (priority: Priority): string => {
  return PRIORITY_CONFIG[priority].color
}