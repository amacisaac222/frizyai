import { useState, useEffect, useCallback, useRef } from 'react'
import { blockService } from '@/lib/database'
import { realtimeManager, ConflictResolver, type BlockChangeEvent, type PresenceData } from '@/lib/realtime'
import { useAuth } from '@/contexts/AuthContext'
import type { Block, BlockInsert, BlockUpdate, BlockFilters } from '@/lib/database.types'

interface CollaborativeBlocksState {
  blocks: Block[]
  loading: boolean
  error: string | null
  presenceData: Map<string, PresenceData>
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  conflicts: Map<string, { block: Block; message: string }>
}

interface OptimisticOperation {
  id: string
  type: 'create' | 'update' | 'delete' | 'move'
  timestamp: number
  originalBlock?: Block
  optimisticBlock: Block
}

export function useCollaborativeBlocks(projectId: string, filters?: BlockFilters) {
  const { user, dbUser } = useAuth()
  const [state, setState] = useState<CollaborativeBlocksState>({
    blocks: [],
    loading: true,
    error: null,
    presenceData: new Map(),
    connectionStatus: 'disconnected',
    conflicts: new Map()
  })

  const optimisticOperations = useRef<Map<string, OptimisticOperation>>(new Map())
  const lastKnownBlocks = useRef<Map<string, Block>>(new Map())
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Load initial blocks
  const loadBlocks = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    const result = await blockService.getBlocks(projectId, filters)
    if (result.error) {
      setState(prev => ({ ...prev, error: result.error, loading: false }))
    } else {
      const blocks = result.data || []
      // Update last known state
      lastKnownBlocks.current = new Map(blocks.map(block => [block.id, { ...block }]))
      setState(prev => ({ ...prev, blocks, loading: false }))
    }
  }, [projectId, filters])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !dbUser) return

    loadBlocks()

    // Set current user for presence
    realtimeManager.setCurrentUser(dbUser)

    // Subscribe to project updates
    const setupSubscription = async () => {
      const unsubscribe = await realtimeManager.subscribeToProject(
        projectId,
        user.id,
        {
          onBlockChange: handleRemoteBlockChange,
          onPresenceChange: handlePresenceChange,
          onConflict: handleConflict
        }
      )
      unsubscribeRef.current = unsubscribe
    }

    setupSubscription()

    // Monitor connection status
    const unsubscribeConnection = realtimeManager.on('connection', (event) => {
      setState(prev => ({ ...prev, connectionStatus: event.status }))
    })

    return () => {
      unsubscribeConnection()
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [projectId, user, dbUser])

  // Handle remote block changes
  const handleRemoteBlockChange = useCallback((event: BlockChangeEvent) => {
    setState(prev => {
      const newBlocks = [...prev.blocks]
      const conflicts = new Map(prev.conflicts)

      switch (event.type) {
        case 'INSERT':
          // Check if we have an optimistic operation for this block
          const existingIndex = newBlocks.findIndex(b => b.id === event.block.id)
          if (existingIndex >= 0) {
            // Replace optimistic block with server version
            newBlocks[existingIndex] = event.block
          } else {
            // Add new block
            newBlocks.unshift(event.block)
          }
          lastKnownBlocks.current.set(event.block.id, { ...event.block })
          break

        case 'UPDATE':
          const updateIndex = newBlocks.findIndex(b => b.id === event.block.id)
          if (updateIndex >= 0) {
            const currentBlock = newBlocks[updateIndex]
            const lastKnown = lastKnownBlocks.current.get(event.block.id)
            
            // Check for conflicts with optimistic updates
            if (lastKnown) {
              const { resolved, hasConflict } = ConflictResolver.resolveBlockConflict(
                currentBlock,
                event.block,
                lastKnown
              )

              if (hasConflict) {
                conflicts.set(event.block.id, {
                  block: resolved,
                  message: `Conflicting changes with ${event.block.created_by}`
                })
              } else {
                conflicts.delete(event.block.id)
              }

              newBlocks[updateIndex] = resolved
            } else {
              newBlocks[updateIndex] = event.block
            }
            
            lastKnownBlocks.current.set(event.block.id, { ...event.block })
          }
          break

        case 'DELETE':
          const deleteIndex = newBlocks.findIndex(b => b.id === event.block.id)
          if (deleteIndex >= 0) {
            newBlocks.splice(deleteIndex, 1)
            lastKnownBlocks.current.delete(event.block.id)
            conflicts.delete(event.block.id)
          }
          break
      }

      return { ...prev, blocks: newBlocks, conflicts }
    })
  }, [])

  // Handle presence changes
  const handlePresenceChange = useCallback((presence: Map<string, PresenceData>) => {
    setState(prev => ({ ...prev, presenceData: new Map(presence) }))
  }, [])

  // Handle conflicts
  const handleConflict = useCallback((event: any) => {
    console.log('Conflict detected:', event)
    // Additional conflict handling logic can be added here
  }, [])

  // Create block with optimistic updates
  const createBlock = useCallback(async (block: BlockInsert) => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimisticBlock: Block = {
      id: tempId,
      project_id: projectId,
      created_by: user.id,
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

    // Store optimistic operation
    const operationId = `create-${tempId}`
    optimisticOperations.current.set(operationId, {
      id: operationId,
      type: 'create',
      timestamp: Date.now(),
      optimisticBlock
    })

    // Optimistic update
    setState(prev => ({
      ...prev,
      blocks: [optimisticBlock, ...prev.blocks]
    }))

    // Update presence to show user is creating
    await realtimeManager.updatePresence(projectId, {
      active_block: tempId
    })

    try {
      const result = await blockService.createBlock(block)
      
      if (result.error) {
        // Rollback optimistic update
        setState(prev => ({
          ...prev,
          blocks: prev.blocks.filter(b => b.id !== tempId),
          error: result.error
        }))
        optimisticOperations.current.delete(operationId)
        return result
      } else {
        // Replace optimistic block with real block
        setState(prev => ({
          ...prev,
          blocks: prev.blocks.map(b => b.id === tempId ? result.data! : b),
          error: null
        }))
        lastKnownBlocks.current.set(result.data!.id, { ...result.data! })
        optimisticOperations.current.delete(operationId)

        // Clear active block from presence
        await realtimeManager.updatePresence(projectId, {
          active_block: undefined
        })

        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        blocks: prev.blocks.filter(b => b.id !== tempId),
        error: err instanceof Error ? err.message : 'Failed to create block'
      }))
      optimisticOperations.current.delete(operationId)
      return { data: null, error: 'Failed to create block' }
    }
  }, [projectId, user])

  // Update block with optimistic updates and conflict detection
  const updateBlock = useCallback(async (id: string, updates: BlockUpdate) => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const currentBlock = state.blocks.find(b => b.id === id)
    if (!currentBlock) return { data: null, error: 'Block not found' }

    const optimisticBlock = { 
      ...currentBlock, 
      ...updates, 
      updated_at: new Date().toISOString() 
    }

    // Store optimistic operation
    const operationId = `update-${id}-${Date.now()}`
    optimisticOperations.current.set(operationId, {
      id: operationId,
      type: 'update',
      timestamp: Date.now(),
      originalBlock: currentBlock,
      optimisticBlock
    })

    // Optimistic update
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? optimisticBlock : b)
    }))

    // Update presence to show user is editing
    await realtimeManager.updatePresence(projectId, {
      active_block: id
    })

    try {
      const result = await blockService.updateBlock(id, updates)
      
      if (result.error) {
        // Rollback optimistic update
        setState(prev => ({
          ...prev,
          blocks: prev.blocks.map(b => b.id === id ? currentBlock : b),
          error: result.error
        }))
        optimisticOperations.current.delete(operationId)
        return result
      } else {
        // Update with server response
        setState(prev => ({
          ...prev,
          blocks: prev.blocks.map(b => b.id === id ? result.data! : b),
          error: null
        }))
        lastKnownBlocks.current.set(id, { ...result.data! })
        optimisticOperations.current.delete(operationId)

        // Clear active block from presence after a delay
        setTimeout(async () => {
          await realtimeManager.updatePresence(projectId, {
            active_block: undefined
          })
        }, 1000)

        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        blocks: prev.blocks.map(b => b.id === id ? currentBlock : b),
        error: err instanceof Error ? err.message : 'Failed to update block'
      }))
      optimisticOperations.current.delete(operationId)
      return { data: null, error: 'Failed to update block' }
    }
  }, [state.blocks, projectId, user])

  // Move block with optimistic updates
  const moveBlock = useCallback(async (id: string, newLane: string) => {
    return updateBlock(id, { lane: newLane as any })
  }, [updateBlock])

  // Delete block with optimistic updates
  const deleteBlock = useCallback(async (id: string) => {
    if (!user) return { data: null, error: 'Not authenticated' }

    const currentBlock = state.blocks.find(b => b.id === id)
    if (!currentBlock) return { data: null, error: 'Block not found' }

    // Store optimistic operation
    const operationId = `delete-${id}-${Date.now()}`
    optimisticOperations.current.set(operationId, {
      id: operationId,
      type: 'delete',
      timestamp: Date.now(),
      originalBlock: currentBlock,
      optimisticBlock: currentBlock
    })

    // Optimistic update
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== id)
    }))

    try {
      const result = await blockService.deleteBlock(id)
      
      if (result.error) {
        // Rollback optimistic update
        setState(prev => ({
          ...prev,
          blocks: [...prev.blocks, currentBlock].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          ),
          error: result.error
        }))
        optimisticOperations.current.delete(operationId)
        return result
      } else {
        lastKnownBlocks.current.delete(id)
        optimisticOperations.current.delete(operationId)
        return result
      }
    } catch (err) {
      // Rollback optimistic update
      setState(prev => ({
        ...prev,
        blocks: [...prev.blocks, currentBlock].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
        error: err instanceof Error ? err.message : 'Failed to delete block'
      }))
      optimisticOperations.current.delete(operationId)
      return { data: null, error: 'Failed to delete block' }
    }
  }, [state.blocks, user])

  // Resolve conflict
  const resolveConflict = useCallback((blockId: string) => {
    setState(prev => {
      const conflicts = new Map(prev.conflicts)
      conflicts.delete(blockId)
      return { ...prev, conflicts }
    })
  }, [])

  // Update cursor position for presence
  const updateCursorPosition = useCallback(async (position: { x: number; y: number; blockId?: string }) => {
    await realtimeManager.updatePresence(projectId, {
      cursor_position: position
    })
  }, [projectId])

  return {
    blocks: state.blocks,
    loading: state.loading,
    error: state.error,
    presenceData: state.presenceData,
    connectionStatus: state.connectionStatus,
    conflicts: state.conflicts,
    createBlock,
    updateBlock,
    moveBlock,
    deleteBlock,
    resolveConflict,
    updateCursorPosition,
    refetch: loadBlocks
  }
}