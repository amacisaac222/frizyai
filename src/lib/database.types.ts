export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database enums matching the schema
export type BlockLaneType = 'vision' | 'goals' | 'current' | 'next' | 'context'
export type BlockStatusType = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'archived'

// Enum-like objects for runtime usage
export const BlockLane = {
  vision: 'vision' as const,
  goals: 'goals' as const,
  current: 'current' as const,
  next: 'next' as const,
  context: 'context' as const
} as const

export const BlockStatus = {
  not_started: 'not_started' as const,
  in_progress: 'in_progress' as const,
  blocked: 'blocked' as const,
  completed: 'completed' as const,
  archived: 'archived' as const
} as const

export type BlockLane = typeof BlockLane[keyof typeof BlockLane]
export type BlockStatus = typeof BlockStatus[keyof typeof BlockStatus]
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type EnergyLevel = 'low' | 'medium' | 'high' | 'peak'
export type Complexity = 'simple' | 'moderate' | 'complex' | 'unknown'
export type ProjectMood = 'excited' | 'focused' | 'stressed' | 'overwhelmed' | 'motivated' | 'tired'
export type MCPConnectionStatus = 'connected' | 'disconnected' | 'error' | 'unknown'

// Database table interfaces
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          timezone: string
          default_energy_level: EnergyLevel
          preferred_complexity: Complexity
          total_projects: number
          total_blocks: number
          total_claude_sessions: number
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          timezone?: string
          default_energy_level?: EnergyLevel
          preferred_complexity?: Complexity
          total_projects?: number
          total_blocks?: number
          total_claude_sessions?: number
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          timezone?: string
          default_energy_level?: EnergyLevel
          preferred_complexity?: Complexity
          total_projects?: number
          total_blocks?: number
          total_claude_sessions?: number
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          mood: ProjectMood | null
          is_active: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
          last_accessed: string | null
          total_blocks: number
          completed_blocks: number
          total_claude_sessions: number
          settings: Json
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          mood?: ProjectMood | null
          is_active?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
          last_accessed?: string | null
          total_blocks?: number
          completed_blocks?: number
          total_claude_sessions?: number
          settings?: Json
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          mood?: ProjectMood | null
          is_active?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
          last_accessed?: string | null
          total_blocks?: number
          completed_blocks?: number
          total_claude_sessions?: number
          settings?: Json
        }
      }
      blocks: {
        Row: {
          id: string
          project_id: string
          created_by: string
          title: string
          content: string
          lane: BlockLane
          status: BlockStatus
          progress: number
          priority: Priority
          effort: number
          claude_sessions: number
          last_worked: string | null
          related_session_ids: string[]
          energy_level: EnergyLevel
          complexity: Complexity
          inspiration: number
          mood: string | null
          created_at: string
          updated_at: string
          tags: string[]
          dependencies: string[]
          blocked_by: string[]
          subtasks: Json
          ai_suggestions: Json
        }
        Insert: {
          id?: string
          project_id: string
          created_by: string
          title: string
          content?: string
          lane: BlockLane
          status?: BlockStatus
          progress?: number
          priority?: Priority
          effort?: number
          claude_sessions?: number
          last_worked?: string | null
          related_session_ids?: string[]
          energy_level?: EnergyLevel
          complexity?: Complexity
          inspiration?: number
          mood?: string | null
          created_at?: string
          updated_at?: string
          tags?: string[]
          dependencies?: string[]
          blocked_by?: string[]
          subtasks?: Json
          ai_suggestions?: Json
        }
        Update: {
          id?: string
          project_id?: string
          created_by?: string
          title?: string
          content?: string
          lane?: BlockLane
          status?: BlockStatus
          progress?: number
          priority?: Priority
          effort?: number
          claude_sessions?: number
          last_worked?: string | null
          related_session_ids?: string[]
          energy_level?: EnergyLevel
          complexity?: Complexity
          inspiration?: number
          mood?: string | null
          created_at?: string
          updated_at?: string
          tags?: string[]
          dependencies?: string[]
          blocked_by?: string[]
          subtasks?: Json
          ai_suggestions?: Json
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          project_id: string
          session_id: string
          title: string | null
          context_at_start: Json
          context_at_end: Json
          related_block_ids: string[]
          blocks_created: string[]
          blocks_modified: string[]
          messages_count: number
          tokens_used: number
          duration_minutes: number | null
          started_at: string
          ended_at: string | null
          created_at: string
          insights: string[]
          achievements: string[]
          next_steps: string[]
          mcp_status: MCPConnectionStatus
          mcp_data: Json
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          session_id: string
          title?: string | null
          context_at_start?: Json
          context_at_end?: Json
          related_block_ids?: string[]
          blocks_created?: string[]
          blocks_modified?: string[]
          messages_count?: number
          tokens_used?: number
          duration_minutes?: number | null
          started_at?: string
          ended_at?: string | null
          created_at?: string
          insights?: string[]
          achievements?: string[]
          next_steps?: string[]
          mcp_status?: MCPConnectionStatus
          mcp_data?: Json
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          session_id?: string
          title?: string | null
          context_at_start?: Json
          context_at_end?: Json
          related_block_ids?: string[]
          blocks_created?: string[]
          blocks_modified?: string[]
          messages_count?: number
          tokens_used?: number
          duration_minutes?: number | null
          started_at?: string
          ended_at?: string | null
          created_at?: string
          insights?: string[]
          achievements?: string[]
          next_steps?: string[]
          mcp_status?: MCPConnectionStatus
          mcp_data?: Json
        }
      }
      context_items: {
        Row: {
          id: string
          user_id: string
          project_id: string
          title: string
          content: string
          type: string
          tags: string[]
          category: string | null
          related_block_ids: string[]
          related_session_ids: string[]
          source: string | null
          confidence_score: number
          created_at: string
          updated_at: string
          accessed_at: string
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          title: string
          content: string
          type?: string
          tags?: string[]
          category?: string | null
          related_block_ids?: string[]
          related_session_ids?: string[]
          source?: string | null
          confidence_score?: number
          created_at?: string
          updated_at?: string
          accessed_at?: string
          search_vector?: unknown | null
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          title?: string
          content?: string
          type?: string
          tags?: string[]
          category?: string | null
          related_block_ids?: string[]
          related_session_ids?: string[]
          source?: string | null
          confidence_score?: number
          created_at?: string
          updated_at?: string
          accessed_at?: string
          search_vector?: unknown | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_project: {
        Args: {
          project_uuid: string
        }
        Returns: boolean
      }
      get_user_projects_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_blocks_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      block_lane: BlockLane
      block_status: BlockStatus
      priority: Priority
      energy_level: EnergyLevel
      complexity: Complexity
      project_mood: ProjectMood
      mcp_connection_status: MCPConnectionStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types for common operations
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Block = Database['public']['Tables']['blocks']['Row']
export type BlockInsert = Database['public']['Tables']['blocks']['Insert']
export type BlockUpdate = Database['public']['Tables']['blocks']['Update']

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

export type ContextItem = Database['public']['Tables']['context_items']['Row']
export type ContextItemInsert = Database['public']['Tables']['context_items']['Insert']
export type ContextItemUpdate = Database['public']['Tables']['context_items']['Update']

// Extended types with relationships
export type ProjectWithStats = Project & {
  total_blocks: number
  completed_blocks: number
  completion_percentage: number
}

export type BlockWithRelations = Block & {
  project: Pick<Project, 'id' | 'name'>
  created_by_user: Pick<User, 'id' | 'full_name' | 'email'>
  dependent_blocks?: Block[]
  blocking_blocks?: Block[]
}

export type SessionWithRelations = Session & {
  project: Pick<Project, 'id' | 'name'>
  user: Pick<User, 'id' | 'full_name' | 'email'>
  related_blocks?: Block[]
}

// Form and API types
export interface CreateProjectForm {
  name: string
  description?: string
  mood?: ProjectMood
}

export interface CreateBlockForm {
  title: string
  content?: string
  lane: BlockLane
  priority?: Priority
  energy_level?: EnergyLevel
  complexity?: Complexity
  effort?: number
  inspiration?: number
  tags?: string[]
}

export interface UpdateBlockForm extends Partial<CreateBlockForm> {
  status?: BlockStatus
  progress?: number
}

export interface CreateContextItemForm {
  title: string
  content: string
  type?: string
  category?: string
  tags?: string[]
  related_block_ids?: string[]
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

// Real-time subscription types
export interface RealtimePayload<T = any> {
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
  schema: string
  table: string
}

// Search and filter types
export interface BlockFilters {
  lanes?: BlockLane[]
  statuses?: BlockStatus[]
  priorities?: Priority[]
  energy_levels?: EnergyLevel[]
  complexities?: Complexity[]
  tags?: string[]
  search?: string
  created_after?: string
  created_before?: string
  last_worked_after?: string
  last_worked_before?: string
}

export interface ProjectFilters {
  is_active?: boolean
  is_archived?: boolean
  moods?: ProjectMood[]
  search?: string
  created_after?: string
  created_before?: string
}

export interface ContextItemFilters {
  types?: string[]
  categories?: string[]
  tags?: string[]
  search?: string
  confidence_min?: number
  confidence_max?: number
  created_after?: string
  created_before?: string
}