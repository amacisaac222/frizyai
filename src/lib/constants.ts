import { BlockLane, BlockStatus, Priority, EnergyLevel, Complexity, ProjectMood, MCPConnectionStatus } from './types'

// Block lane configuration
export const BLOCK_LANE_CONFIG = {
  [BlockLane.VISION]: {
    label: 'Vision',
    description: 'Long-term goals and aspirations',
    color: 'purple',
    icon: '🎯',
    maxBlocks: null
  },
  [BlockLane.GOALS]: {
    label: 'Goals', 
    description: 'Concrete objectives to achieve',
    color: 'blue',
    icon: '📋',
    maxBlocks: 10
  },
  [BlockLane.CURRENT]: {
    label: 'Current',
    description: 'Active work in progress',
    color: 'green',
    icon: '⚡',
    maxBlocks: 5
  },
  [BlockLane.NEXT]: {
    label: 'Next',
    description: 'Upcoming tasks and priorities',
    color: 'orange',
    icon: '📅',
    maxBlocks: 8
  },
  [BlockLane.CONTEXT]: {
    label: 'Context',
    description: 'Important information and references',
    color: 'gray',
    icon: '📚',
    maxBlocks: null
  }
} as const

// Block status configuration
export const BLOCK_STATUS_CONFIG = {
  [BlockStatus.NOT_STARTED]: {
    label: 'Not Started',
    color: 'gray',
    icon: '⚪',
    canTransitionTo: [BlockStatus.IN_PROGRESS, BlockStatus.ON_HOLD]
  },
  [BlockStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'blue',
    icon: '🔵', 
    canTransitionTo: [BlockStatus.COMPLETED, BlockStatus.BLOCKED, BlockStatus.ON_HOLD]
  },
  [BlockStatus.BLOCKED]: {
    label: 'Blocked',
    color: 'red',
    icon: '🔴',
    canTransitionTo: [BlockStatus.IN_PROGRESS, BlockStatus.ON_HOLD]
  },
  [BlockStatus.COMPLETED]: {
    label: 'Completed',
    color: 'green',
    icon: '✅',
    canTransitionTo: [BlockStatus.IN_PROGRESS] // can reopen
  },
  [BlockStatus.ON_HOLD]: {
    label: 'On Hold',
    color: 'yellow',
    icon: '⏸️',
    canTransitionTo: [BlockStatus.IN_PROGRESS, BlockStatus.NOT_STARTED]
  }
} as const

// Priority configuration
export const PRIORITY_CONFIG = {
  [Priority.LOW]: {
    label: 'Low',
    color: 'green',
    icon: '🟢',
    value: 1
  },
  [Priority.MEDIUM]: {
    label: 'Medium',
    color: 'yellow',
    icon: '🟡',
    value: 2
  },
  [Priority.HIGH]: {
    label: 'High',
    color: 'orange',
    icon: '🟠',
    value: 3
  },
  [Priority.URGENT]: {
    label: 'Urgent',
    color: 'red',
    icon: '🔴',
    value: 4
  }
} as const

// Energy level configuration
export const ENERGY_LEVEL_CONFIG = {
  [EnergyLevel.LOW]: {
    label: 'Low Energy',
    description: 'Best for simple, routine tasks',
    color: 'red',
    icon: '🪫',
    suggestedComplexity: [Complexity.SIMPLE]
  },
  [EnergyLevel.MEDIUM]: {
    label: 'Medium Energy',
    description: 'Good for moderate complexity work',
    color: 'yellow',
    icon: '🔋',
    suggestedComplexity: [Complexity.SIMPLE, Complexity.MODERATE]
  },
  [EnergyLevel.HIGH]: {
    label: 'High Energy',
    description: 'Great for challenging tasks',
    color: 'green',
    icon: '🔋',
    suggestedComplexity: [Complexity.MODERATE, Complexity.COMPLEX]
  },
  [EnergyLevel.PEAK]: {
    label: 'Peak Energy',
    description: 'Perfect for complex, creative work',
    color: 'purple',
    icon: '⚡',
    suggestedComplexity: [Complexity.COMPLEX, Complexity.UNKNOWN]
  }
} as const

// Complexity configuration
export const COMPLEXITY_CONFIG = {
  [Complexity.SIMPLE]: {
    label: 'Simple',
    description: 'Clear, straightforward tasks',
    color: 'green',
    icon: '🟢',
    estimatedHours: 1
  },
  [Complexity.MODERATE]: {
    label: 'Moderate',
    description: 'Some complexity, may need research',
    color: 'yellow',
    icon: '🟡',
    estimatedHours: 4
  },
  [Complexity.COMPLEX]: {
    label: 'Complex',
    description: 'Multi-step, requires deep thinking',
    color: 'orange',
    icon: '🟠',
    estimatedHours: 8
  },
  [Complexity.UNKNOWN]: {
    label: 'Unknown',
    description: 'Requires investigation first',
    color: 'purple',
    icon: '❓',
    estimatedHours: null
  }
} as const

// Project mood configuration
export const PROJECT_MOOD_CONFIG = {
  [ProjectMood.EXCITED]: {
    label: 'Excited',
    description: 'High motivation, ready to tackle challenges',
    color: 'green',
    icon: '🚀',
    energyMultiplier: 1.2
  },
  [ProjectMood.FOCUSED]: {
    label: 'Focused',
    description: 'In the zone, making steady progress',
    color: 'blue',
    icon: '🎯',
    energyMultiplier: 1.0
  },
  [ProjectMood.STRUGGLING]: {
    label: 'Struggling',
    description: 'Facing challenges, need support',
    color: 'orange',
    icon: '😤',
    energyMultiplier: 0.8
  },
  [ProjectMood.BURNOUT]: {
    label: 'Burnout',
    description: 'Need rest and recovery',
    color: 'red',
    icon: '😴',
    energyMultiplier: 0.5
  },
  [ProjectMood.EXPLORING]: {
    label: 'Exploring',
    description: 'Research mode, gathering information',
    color: 'purple',
    icon: '🔍',
    energyMultiplier: 0.9
  }
} as const

// MCP connection status
export const MCP_CONNECTION_CONFIG = {
  [MCPConnectionStatus.DISCONNECTED]: {
    label: 'Disconnected',
    color: 'gray',
    icon: '⚫'
  },
  [MCPConnectionStatus.CONNECTING]: {
    label: 'Connecting',
    color: 'yellow', 
    icon: '🟡'
  },
  [MCPConnectionStatus.CONNECTED]: {
    label: 'Connected',
    color: 'green',
    icon: '🟢'
  },
  [MCPConnectionStatus.ERROR]: {
    label: 'Error',
    color: 'red',
    icon: '🔴'
  }
} as const

// Default values
export const DEFAULT_VALUES = {
  BLOCK: {
    progress: 0,
    effort: 1,
    priority: Priority.MEDIUM,
    energyLevel: EnergyLevel.MEDIUM,
    complexity: Complexity.MODERATE,
    inspiration: 5,
    claudeSessions: 0,
    tags: []
  },
  PROJECT: {
    mood: ProjectMood.FOCUSED,
    mcpConnection: MCPConnectionStatus.DISCONNECTED,
    totalSessions: 0,
    completionRate: 0,
    isArchived: false,
    isPublic: false
  }
} as const

// Limits and constraints
export const LIMITS = {
  BLOCK: {
    TITLE_MAX_LENGTH: 100,
    CONTENT_MAX_LENGTH: 5000,
    TAGS_MAX_COUNT: 10,
    TAG_MAX_LENGTH: 30
  },
  PROJECT: {
    NAME_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 1000,
    MAX_COLLABORATORS: 10
  },
  SESSION: {
    MAX_DURATION_HOURS: 12,
    MAX_FILES_MODIFIED: 100
  }
} as const

// Validation patterns
export const PATTERNS = {
  PROJECT_NAME: /^[a-zA-Z0-9\s\-_\.]{1,50}$/,
  TAG: /^[a-zA-Z0-9\-_]{1,30}$/,
  MCP_PORT: /^[0-9]{4,5}$/
} as const

// Time intervals
export const TIME_INTERVALS = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  AUTOSAVE_INTERVAL: 5 * 1000, // 5 seconds
  MCP_PING_INTERVAL: 10 * 1000, // 10 seconds
  ANALYTICS_UPDATE_INTERVAL: 60 * 1000 // 1 minute
} as const

// UI preferences
export const UI_CONFIG = {
  ANIMATIONS: {
    DURATION: 300,
    EASING: 'ease-in-out'
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  },
  SEARCH: {
    MIN_SEARCH_LENGTH: 2,
    DEBOUNCE_DELAY: 300
  }
} as const

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  NEW_BLOCK: 'n',
  NEW_PROJECT: 'p', 
  SEARCH: '/',
  TOGGLE_SIDEBAR: 's',
  FOCUS_MODE: 'f',
  SAVE: 'cmd+s'
} as const