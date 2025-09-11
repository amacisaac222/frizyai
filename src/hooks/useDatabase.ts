import { useState, useEffect, useCallback, useRef } from 'react'
import { blockService, projectService, subscriptions } from '@/lib/database'
import type { Block, Project, BlockInsert, ProjectInsert, BlockUpdate, ProjectUpdate, BlockFilters, ProjectFilters } from '@/lib/database.types'

// Custom hook for managing loading states and errors
export function useAsyncOperation<T>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (operation: () => Promise<{ data: T | null; error: string | null }>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await operation()
      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result.data)
        setError(null)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setData(null)
      return { data: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}

// Hook for managing blocks with optimistic updates
export function useBlocks(projectId: string, filters?: BlockFilters) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const optimisticUpdatesRef = useRef<Map<string, Block>>(new Map())

  // Load blocks
  const loadBlocks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const result = await blockService.getBlocks(projectId, filters)
    if (result.error) {
      setError(result.error)
    } else {
      setBlocks(result.data || [])
    }
    setLoading(false)
  }, [projectId, filters])

  // Create block with optimistic update
  const createBlock = useCallback(async (block: BlockInsert) => {
    const tempId = `temp-${Date.now()}`
    const optimisticBlock: Block = {
      id: tempId,
      project_id: projectId,
      created_by: 'current-user', // Will be set by server
      title: block.title,
      content: block.content || '',
      lane: block.lane,
      status: block.status || 'not_started',
      progress: block.progress || 0,
      priority: block.priority || 'medium',
      effort: block.effort || 1,
      claude_sessions: 0,
      last_worked: null,
      related_session_ids: [],
      energy_level: block.energy_level || 'medium',
      complexity: block.complexity || 'moderate',
      inspiration: block.inspiration || 5,
      mood: block.mood || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: block.tags || [],
      dependencies: block.dependencies || [],
      blocked_by: block.blocked_by || [],
      subtasks: block.subtasks || [],
      ai_suggestions: block.ai_suggestions || []
    }

    // Optimistic update
    setBlocks(prev => [optimisticBlock, ...prev])
    optimisticUpdatesRef.current.set(tempId, optimisticBlock)

    try {
      const result = await blockService.createBlock(block)
      if (result.error) {
        // Rollback optimistic update
        setBlocks(prev => prev.filter(b => b.id !== tempId))
        optimisticUpdatesRef.current.delete(tempId)
        setError(result.error)
        return result
      } else {
        // Replace optimistic block with real block
        setBlocks(prev => prev.map(b => b.id === tempId ? result.data! : b))
        optimisticUpdatesRef.current.delete(tempId)
        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setBlocks(prev => prev.filter(b => b.id !== tempId))
      optimisticUpdatesRef.current.delete(tempId)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create block'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [projectId])

  // Update block with optimistic update
  const updateBlock = useCallback(async (id: string, updates: BlockUpdate) => {
    const previousBlock = blocks.find(b => b.id === id)
    if (!previousBlock) return { data: null, error: 'Block not found' }

    const optimisticBlock = { ...previousBlock, ...updates, updated_at: new Date().toISOString() }
    
    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === id ? optimisticBlock : b))
    
    try {
      const result = await blockService.updateBlock(id, updates)
      if (result.error) {
        // Rollback optimistic update
        setBlocks(prev => prev.map(b => b.id === id ? previousBlock : b))
        setError(result.error)
        return result
      } else {
        // Update with server response
        setBlocks(prev => prev.map(b => b.id === id ? result.data! : b))
        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setBlocks(prev => prev.map(b => b.id === id ? previousBlock : b))
      const errorMessage = err instanceof Error ? err.message : 'Failed to update block'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [blocks])

  // Move block with optimistic update
  const moveBlock = useCallback(async (id: string, newLane: string) => {
    const previousBlock = blocks.find(b => b.id === id)
    if (!previousBlock) return { data: null, error: 'Block not found' }

    const optimisticBlock = { ...previousBlock, lane: newLane as any, updated_at: new Date().toISOString() }
    
    // Optimistic update
    setBlocks(prev => prev.map(b => b.id === id ? optimisticBlock : b))
    
    try {
      const result = await blockService.moveBlock(id, newLane)
      if (result.error) {
        // Rollback optimistic update
        setBlocks(prev => prev.map(b => b.id === id ? previousBlock : b))
        setError(result.error)
        return result
      } else {
        // Update with server response
        setBlocks(prev => prev.map(b => b.id === id ? result.data! : b))
        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setBlocks(prev => prev.map(b => b.id === id ? previousBlock : b))
      const errorMessage = err instanceof Error ? err.message : 'Failed to move block'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [blocks])

  // Delete block with optimistic update
  const deleteBlock = useCallback(async (id: string) => {
    const previousBlock = blocks.find(b => b.id === id)
    if (!previousBlock) return { data: null, error: 'Block not found' }

    // Optimistic update
    setBlocks(prev => prev.filter(b => b.id !== id))
    
    try {
      const result = await blockService.deleteBlock(id)
      if (result.error) {
        // Rollback optimistic update
        setBlocks(prev => [...prev, previousBlock].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ))
        setError(result.error)
        return result
      }
      return result
    } catch (err) {
      // Rollback optimistic update
      setBlocks(prev => [...prev, previousBlock].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ))
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete block'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [blocks])

  // Set up real-time subscriptions
  useEffect(() => {
    loadBlocks()

    const unsubscribe = subscriptions.subscribeToProject(projectId, (payload) => {
      if (payload.table === 'blocks') {
        switch (payload.eventType) {
          case 'INSERT':
            if (payload.new && !optimisticUpdatesRef.current.has(payload.new.id)) {
              setBlocks(prev => [payload.new, ...prev])
            }
            break
          case 'UPDATE':
            if (payload.new) {
              setBlocks(prev => prev.map(b => b.id === payload.new.id ? payload.new : b))
            }
            break
          case 'DELETE':
            if (payload.old) {
              setBlocks(prev => prev.filter(b => b.id !== payload.old.id))
            }
            break
        }
      }
    })

    return unsubscribe
  }, [projectId, loadBlocks])

  return {
    blocks,
    loading,
    error,
    createBlock,
    updateBlock,
    moveBlock,
    deleteBlock,
    refetch: loadBlocks
  }
}

// Hook for managing projects
export function useProjects(userId?: string, filters?: ProjectFilters) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load projects
  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const result = await projectService.getProjects(userId, filters)
    if (result.error) {
      setError(result.error)
    } else {
      setProjects(result.data || [])
    }
    setLoading(false)
  }, [userId, filters])

  // Create project with optimistic update
  const createProject = useCallback(async (project: ProjectInsert) => {
    const tempId = `temp-${Date.now()}`
    const optimisticProject: Project = {
      id: tempId,
      user_id: userId || 'current-user',
      name: project.name,
      description: project.description || null,
      mood: project.mood || null,
      is_active: project.is_active ?? true,
      is_archived: project.is_archived ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      total_blocks: 0,
      completed_blocks: 0,
      total_claude_sessions: 0,
      settings: project.settings || {}
    }

    // Optimistic update
    setProjects(prev => [optimisticProject, ...prev])

    try {
      const result = await projectService.createProject(project)
      if (result.error) {
        // Rollback optimistic update
        setProjects(prev => prev.filter(p => p.id !== tempId))
        setError(result.error)
        return result
      } else {
        // Replace optimistic project with real project
        setProjects(prev => prev.map(p => p.id === tempId ? result.data! : p))
        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setProjects(prev => prev.filter(p => p.id !== tempId))
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [userId])

  // Update project with optimistic update
  const updateProject = useCallback(async (id: string, updates: ProjectUpdate) => {
    const previousProject = projects.find(p => p.id === id)
    if (!previousProject) return { data: null, error: 'Project not found' }

    const optimisticProject = { ...previousProject, ...updates, updated_at: new Date().toISOString() }
    
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? optimisticProject : p))
    
    try {
      const result = await projectService.updateProject(id, updates)
      if (result.error) {
        // Rollback optimistic update
        setProjects(prev => prev.map(p => p.id === id ? previousProject : p))
        setError(result.error)
        return result
      } else {
        // Update with server response
        setProjects(prev => prev.map(p => p.id === id ? result.data! : p))
        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setProjects(prev => prev.map(p => p.id === id ? previousProject : p))
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [projects])

  // Delete project with optimistic update
  const deleteProject = useCallback(async (id: string) => {
    const previousProject = projects.find(p => p.id === id)
    if (!previousProject) return { data: null, error: 'Project not found' }

    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== id))
    
    try {
      const result = await projectService.deleteProject(id)
      if (result.error) {
        // Rollback optimistic update
        setProjects(prev => [...prev, previousProject].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ))
        setError(result.error)
        return result
      }
      return result
    } catch (err) {
      // Rollback optimistic update
      setProjects(prev => [...prev, previousProject].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ))
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project'
      setError(errorMessage)
      return { data: null, error: errorMessage }
    }
  }, [projects])

  // Set up real-time subscriptions
  useEffect(() => {
    loadProjects()

    if (userId) {
      const unsubscribe = subscriptions.subscribeToUserProjects(userId, (payload) => {
        if (payload.table === 'projects') {
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new) {
                setProjects(prev => [payload.new, ...prev])
              }
              break
            case 'UPDATE':
              if (payload.new) {
                setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
              }
              break
            case 'DELETE':
              if (payload.old) {
                setProjects(prev => prev.filter(p => p.id !== payload.old.id))
              }
              break
          }
        }
      })

      return unsubscribe
    }
  }, [userId, loadProjects])

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: loadProjects
  }
}