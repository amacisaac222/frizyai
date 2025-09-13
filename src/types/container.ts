// Unified Container Model - Everything uses the same structure
export type ContainerType = 'goal' | 'block' | 'decision' | 'context' | 'event' | 'trace'

export type ContainerStatus = 
  | 'active' 
  | 'completed' 
  | 'in-progress' 
  | 'blocked' 
  | 'planned' 
  | 'archived'

export type ConnectionType = 
  | 'blocks' 
  | 'decision' 
  | 'context' 
  | 'dependency' 
  | 'trace' 
  | 'parent' 
  | 'child'

export interface Connection {
  targetId: string
  type: ConnectionType
  strength: number // 0-1, how important this connection is
  reason?: string // Why they're connected
  createdAt: Date
}

export interface ContainerMetadata {
  // Project-specific
  businessValue?: string
  successCriteria?: string[]
  estimatedEffort?: number
  
  // Block/Work-specific  
  assignee?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  
  // Decision-specific
  alternatives?: string[]
  rationale?: string
  impact?: string
  
  // Context-specific
  source?: 'user' | 'claude' | 'system' | 'external'
  contextType?: 'documentation' | 'conversation' | 'code' | 'research'
  
  // Event-specific
  eventType?: 'commit' | 'deploy' | 'meeting' | 'milestone' | 'issue'
  participants?: string[]
  
  // Trace-specific
  duration?: number
  traceType?: 'start' | 'action' | 'decision' | 'context' | 'end'
  
  // Common metadata
  tags?: string[]
  color?: string
  icon?: string
}

export interface Container {
  id: string
  type: ContainerType
  title: string
  description?: string
  status: ContainerStatus
  progress: number // 0-100
  connections: Connection[]
  metadata: ContainerMetadata
  importance: number // 0-1, for context selection and prioritization
  createdAt: Date
  updatedAt: Date
  createdBy: string // user id or 'claude' or 'system'
}

// View-specific types
export type ViewMode = 'board' | 'trace' | 'graph' | 'list'

export interface ViewConfig {
  mode: ViewMode
  filters: {
    types?: ContainerType[]
    statuses?: ContainerStatus[]
    tags?: string[]
    dateRange?: { start: Date; end: Date }
  }
  groupBy?: 'type' | 'status' | 'priority' | 'assignee' | 'none'
  sortBy?: 'created' | 'updated' | 'importance' | 'progress' | 'title'
  sortOrder?: 'asc' | 'desc'
}

// Graph-specific types for visualization
export interface GraphNode {
  id: string
  container: Container
  x: number
  y: number
  fixed?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  connection: Connection
  animated?: boolean
}

// Context selection for MCP integration
export interface ContextSelection {
  containers: Container[]
  totalImportance: number
  selectionReason: string
  maxDepth: number
}