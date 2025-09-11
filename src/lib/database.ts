import { supabase } from './supabase'
import type {
  Database,
  User,
  Project,
  ProjectInsert,
  ProjectUpdate,
  Block,
  BlockInsert,
  BlockUpdate,
  Session,
  SessionInsert,
  SessionUpdate,
  ContextItem,
  ContextItemInsert,
  ContextItemUpdate,
  BlockFilters,
  ProjectFilters,
  ContextItemFilters,
  ApiResponse,
  PaginatedResponse
} from './database.types'

// Error handling helper
const handleError = <T>(error: any): ApiResponse<T> => ({
  data: null,
  error: error.message || 'An unexpected error occurred'
})

const handleSuccess = <T>(data: T, message?: string): ApiResponse<T> => ({
  data,
  error: null,
  message
})

// Users service
export const userService = {
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return handleSuccess(data)
    } catch (error) {
      return handleError(error)
    }
  },

  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Profile updated successfully')
    } catch (error) {
      return handleError(error)
    }
  }
}

// Projects service
export const projectService = {
  // Alias for cleaner API - uses current user
  async getProjects(userId?: string, filters?: ProjectFilters): Promise<ApiResponse<Project[]>> {
    if (userId) {
      return this.getProjectsByUserId(userId, filters)
    }
    return this.getUserProjects(filters)
  },

  async getProjectsByUserId(userId: string, filters?: ProjectFilters): Promise<ApiResponse<Project[]>> {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived)
      }
      if (filters?.moods?.length) {
        query = query.in('mood', filters.moods)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return handleSuccess(data || [])
    } catch (error) {
      return handleError(error)
    }
  },

  async getUserProjects(filters?: ProjectFilters): Promise<ApiResponse<Project[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived)
      }
      if (filters?.moods?.length) {
        query = query.in('mood', filters.moods)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return handleSuccess(data || [])
    } catch (error) {
      return handleError(error)
    }
  },

  async getProject(id: string): Promise<ApiResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return handleSuccess(data)
    } catch (error) {
      return handleError(error)
    }
  },

  async createProject(project: ProjectInsert): Promise<ApiResponse<Project>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('projects')
        .insert({ ...project, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Project created successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async updateProject(id: string, updates: ProjectUpdate): Promise<ApiResponse<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Project updated successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async deleteProject(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
      return handleSuccess(null, 'Project deleted successfully')
    } catch (error) {
      return handleError(error)
    }
  }
}

// Blocks service
export const blockService = {
  // Alias for backward compatibility and cleaner API
  async getBlocks(projectId: string, filters?: BlockFilters): Promise<ApiResponse<Block[]>> {
    return this.getProjectBlocks(projectId, filters)
  },

  async getProjectBlocks(projectId: string, filters?: BlockFilters): Promise<ApiResponse<Block[]>> {
    try {
      let query = supabase
        .from('blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters?.lanes?.length) {
        query = query.in('lane', filters.lanes)
      }
      if (filters?.statuses?.length) {
        query = query.in('status', filters.statuses)
      }
      if (filters?.priorities?.length) {
        query = query.in('priority', filters.priorities)
      }
      if (filters?.energy_levels?.length) {
        query = query.in('energy_level', filters.energy_levels)
      }
      if (filters?.complexities?.length) {
        query = query.in('complexity', filters.complexities)
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }
      if (filters?.tags?.length) {
        query = query.overlaps('tags', filters.tags)
      }

      const { data, error } = await query

      if (error) throw error
      return handleSuccess(data || [])
    } catch (error) {
      return handleError(error)
    }
  },

  async getBlock(id: string): Promise<ApiResponse<Block>> {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return handleSuccess(data)
    } catch (error) {
      return handleError(error)
    }
  },

  async createBlock(block: BlockInsert): Promise<ApiResponse<Block>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('blocks')
        .insert({ ...block, created_by: user.id })
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Block created successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async moveBlock(id: string, newLane: string): Promise<ApiResponse<Block>> {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .update({ 
          lane: newLane as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Block moved successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async updateBlock(id: string, updates: BlockUpdate): Promise<ApiResponse<Block>> {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Block updated successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async deleteBlock(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', id)

      if (error) throw error
      return handleSuccess(null, 'Block deleted successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async updateBlockProgress(id: string, progress: number): Promise<ApiResponse<Block>> {
    try {
      const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
      
      const { data, error } = await supabase
        .from('blocks')
        .update({ 
          progress, 
          status,
          updated_at: new Date().toISOString(),
          ...(progress > 0 && { last_worked: new Date().toISOString() })
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Block progress updated')
    } catch (error) {
      return handleError(error)
    }
  }
}

// Sessions service
export const sessionService = {
  async getProjectSessions(projectId: string): Promise<ApiResponse<Session[]>> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })

      if (error) throw error
      return handleSuccess(data || [])
    } catch (error) {
      return handleError(error)
    }
  },

  async createSession(session: SessionInsert): Promise<ApiResponse<Session>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('sessions')
        .insert({ ...session, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Session created successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async updateSession(id: string, updates: SessionUpdate): Promise<ApiResponse<Session>> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Session updated successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async endSession(id: string, endData: { 
    context_at_end?: any
    duration_minutes?: number
    insights?: string[]
    achievements?: string[]
    next_steps?: string[]
  }): Promise<ApiResponse<Session>> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          ...endData,
          ended_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Session ended successfully')
    } catch (error) {
      return handleError(error)
    }
  }
}

// Context items service
export const contextItemService = {
  async getProjectContextItems(projectId: string, filters?: ContextItemFilters): Promise<ApiResponse<ContextItem[]>> {
    try {
      let query = supabase
        .from('context_items')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      // Apply filters
      if (filters?.types?.length) {
        query = query.in('type', filters.types)
      }
      if (filters?.categories?.length) {
        query = query.in('category', filters.categories)
      }
      if (filters?.tags?.length) {
        query = query.overlaps('tags', filters.tags)
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }
      if (filters?.confidence_min !== undefined) {
        query = query.gte('confidence_score', filters.confidence_min)
      }
      if (filters?.confidence_max !== undefined) {
        query = query.lte('confidence_score', filters.confidence_max)
      }

      const { data, error } = await query

      if (error) throw error
      return handleSuccess(data || [])
    } catch (error) {
      return handleError(error)
    }
  },

  async createContextItem(item: ContextItemInsert): Promise<ApiResponse<ContextItem>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('context_items')
        .insert({ ...item, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Context item created successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async updateContextItem(id: string, updates: ContextItemUpdate): Promise<ApiResponse<ContextItem>> {
    try {
      const { data, error } = await supabase
        .from('context_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return handleSuccess(data, 'Context item updated successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async deleteContextItem(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('context_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      return handleSuccess(null, 'Context item deleted successfully')
    } catch (error) {
      return handleError(error)
    }
  },

  async searchContextItems(projectId: string, searchTerm: string): Promise<ApiResponse<ContextItem[]>> {
    try {
      const { data, error } = await supabase
        .from('context_items')
        .select('*')
        .eq('project_id', projectId)
        .textSearch('search_vector', searchTerm)
        .order('confidence_score', { ascending: false })

      if (error) throw error
      return handleSuccess(data || [])
    } catch (error) {
      return handleError(error)
    }
  }
}

// Real-time subscriptions
export const subscriptions = {
  subscribeToProject(projectId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks', filter: `project_id=eq.${projectId}` },
        callback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `project_id=eq.${projectId}` },
        callback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'context_items', filter: `project_id=eq.${projectId}` },
        callback
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },

  subscribeToUserProjects(userId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`user-projects-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
        callback
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }
}