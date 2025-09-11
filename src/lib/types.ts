// Core enums and constants
export enum BlockLane {
  VISION = 'vision',
  GOALS = 'goals', 
  CURRENT = 'current',
  NEXT = 'next',
  CONTEXT = 'context'
}

export enum BlockStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum EnergyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PEAK = 'peak'
}

export enum Complexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate', 
  COMPLEX = 'complex',
  UNKNOWN = 'unknown'
}

export enum ProjectMood {
  EXCITED = 'excited',
  FOCUSED = 'focused',
  STRUGGLING = 'struggling',
  BURNOUT = 'burnout',
  EXPLORING = 'exploring'
}

export enum MCPConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Core Block interface - individual work items
export interface Block {
  id: string
  projectId: string
  
  // Basic properties
  title: string
  content: string
  lane: BlockLane
  
  // Status and progress
  status: BlockStatus
  progress: number // 0-100
  effort: number // estimated hours
  priority: Priority
  
  // Claude integration
  claudeSessions: number
  lastWorked: Date | null
  relatedSessionIds: string[]
  
  // Vibe coder properties
  energyLevel: EnergyLevel
  complexity: Complexity
  inspiration: number // 1-10 scale
  mood?: string // free-form mood description
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
  tags: string[]
  
  // Optional relationships
  dependencies: string[] // other block IDs
  blockedBy: string[] // other block IDs that block this one
  subtasks?: Block[] // nested blocks
  
  // AI suggestions
  aiSuggestions?: AISuggestion[]
}

// Project interface - containers for blocks
export interface Project {
  id: string
  userId: string
  
  // Basic info
  name: string
  description: string
  
  // Claude Code integration
  mcpPort?: number
  mcpConnection: MCPConnectionStatus
  mcpLastConnected?: Date
  
  // Session tracking
  totalSessions: number
  lastActiveSession?: Date
  activeSessionId?: string
  
  // Vibe tracking
  mood: ProjectMood
  moodHistory: MoodEntry[]
  
  // Analytics
  blocksCount: {
    [key in BlockLane]: number
  }
  completionRate: number // 0-100
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
  isPublic: boolean
  
  // Collaboration (future)
  collaborators?: string[]
  inviteCode?: string
}

// AI suggestion for import/enhancement
export interface AISuggestion {
  id: string
  blockId: string
  type: 'content_enhancement' | 'task_breakdown' | 'priority_adjustment' | 'context_import'
  
  title: string
  description: string
  confidence: number // 0-1
  
  // Suggested changes
  suggestedContent?: string
  suggestedPriority?: Priority
  suggestedTags?: string[]
  suggestedSubtasks?: Partial<Block>[]
  
  createdAt: Date
  isApplied: boolean
  appliedAt?: Date
}

// Context captured from Claude sessions
export interface ContextItem {
  id: string
  projectId: string
  sessionId: string
  
  type: 'decision' | 'insight' | 'roadblock' | 'solution' | 'reference'
  content: string
  summary: string
  
  // Relationships
  relatedBlockIds: string[]
  tags: string[]
  
  // Importance
  importance: number // 1-10
  isBookmarked: boolean
  
  createdAt: Date
  extractedBy: 'manual' | 'ai' // how it was captured
}

// Claude Code session tracking
export interface SessionData {
  id: string
  projectId: string
  
  // Session info
  title: string
  startedAt: Date
  endedAt?: Date
  duration?: number // minutes
  
  // Claude Code specific
  mcpPort?: number
  workingDirectory: string
  claudeVersion: string
  
  // Activity summary
  filesModified: string[]
  commandsRun: string[]
  blocksWorkedOn: string[]
  
  // Context
  initialContext: string
  finalSummary: string
  keyDecisions: string[]
  
  // Outcome
  blocksCompleted: number
  newBlocksCreated: number
  
  // Metadata
  mood?: ProjectMood
  energyLevel?: EnergyLevel
  productivity: number // 1-10 self-assessment
}

// Mood tracking for vibe coders
export interface MoodEntry {
  timestamp: Date
  mood: ProjectMood
  notes?: string
  triggers?: string[] // what caused the mood
}

// User preferences
export interface UserPreferences {
  userId: string
  
  // Display preferences
  defaultLaneView: BlockLane[]
  showMoodTracking: boolean
  showEnergyLevels: boolean
  
  // AI preferences
  enableAISuggestions: boolean
  autoImportContext: boolean
  
  // Notification preferences
  sessionReminders: boolean
  progressNotifications: boolean
  
  // Vibe coder settings
  vibeCoderMode: boolean
  moodPrompts: boolean
  energyBasedFiltering: boolean
  
  updatedAt: Date
}

// API response types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Search and filtering
export interface BlockFilter {
  lanes?: BlockLane[]
  statuses?: BlockStatus[]
  priorities?: Priority[]
  energyLevels?: EnergyLevel[]
  complexities?: Complexity[]
  tags?: string[]
  searchTerm?: string
  hasClaudeSessions?: boolean
  lastWorkedSince?: Date
}

export interface ProjectFilter {
  moods?: ProjectMood[]
  mcpStatus?: MCPConnectionStatus[]
  isArchived?: boolean
  searchTerm?: string
  lastActiveSince?: Date
}

// Form types for UI
export interface CreateBlockForm {
  title: string
  content: string
  lane: BlockLane
  priority: Priority
  effort: number
  tags: string[]
  energyLevel?: EnergyLevel
  complexity?: Complexity
  inspiration?: number
}

export interface CreateProjectForm {
  name: string
  description: string
  mood: ProjectMood
  mcpPort?: number
}

export interface UpdateBlockForm extends Partial<CreateBlockForm> {
  id: string
  status?: BlockStatus
  progress?: number
}

// Analytics and reporting
export interface ProjectAnalytics {
  projectId: string
  timeRange: {
    start: Date
    end: Date
  }
  
  // Block metrics
  totalBlocks: number
  completedBlocks: number
  blocksPerLane: Record<BlockLane, number>
  averageEffort: number
  
  // Session metrics
  totalSessions: number
  totalDuration: number
  averageSessionDuration: number
  mostProductiveTime: string
  
  // Mood trends
  moodTrend: MoodEntry[]
  mostCommonMood: ProjectMood
  
  // Progress over time
  progressHistory: {
    date: Date
    completionRate: number
    blocksCompleted: number
  }[]
}

// Export utility types
export type BlockUpdate = Partial<Block> & { id: string }
export type ProjectUpdate = Partial<Project> & { id: string }

// Type guards
export const isBlock = (obj: any): obj is Block => {
  return obj && typeof obj.id === 'string' && obj.lane in BlockLane
}

export const isProject = (obj: any): obj is Project => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string'
}

// Constants
export const BLOCK_LANES = Object.values(BlockLane)
export const BLOCK_STATUSES = Object.values(BlockStatus)
export const PRIORITIES = Object.values(Priority)
export const ENERGY_LEVELS = Object.values(EnergyLevel)
export const COMPLEXITIES = Object.values(Complexity)
export const PROJECT_MOODS = Object.values(ProjectMood)