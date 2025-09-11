import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd'
// Removed SwimLane import - using inline lane structure instead
import { BlockCardDB } from '../BlockCardDB'
import { BlockModal } from '../BlockModal'
import { PresenceIndicator } from './PresenceIndicator'
import { LiveCursor, CollaborativeIndicator, ConflictIndicator } from './LiveCursor'
import { AIImportButton, AIImportPrompt } from '@/components/ai'
import { ContextPreview, CompactContextIndicator } from '@/components/context'
import { SmartSuggestions, ProgressInsights } from '@/components/intelligence'
import { useCollaborativeBlocks } from '@/hooks/useCollaborativeBlocks'
import { useAuth } from '@/contexts/AuthContext'
import { BlockLane, BlockStatus } from '@/lib/database.types'
import type { Block } from '@/lib/database.types'
import { BLOCK_LANE_CONFIG } from '@/lib/constants'

interface CollaborativeProjectBoardProps {
  projectId: string
  project?: { id: string; name: string; description?: string }
  onBlockClick?: (block: Block) => void
  onBlockEdit?: (block: Block) => void
  onAddBlock?: (lane: BlockLane) => void
  onLaneSettings?: (lane: BlockLane) => void
  className?: string
}

export function CollaborativeProjectBoard({
  projectId,
  project,
  onBlockClick,
  onBlockEdit,
  onAddBlock,
  onLaneSettings,
  className
}: CollaborativeProjectBoardProps) {
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    block?: Block
    initialLane?: BlockLane
  }>({
    isOpen: false,
    mode: 'create'
  })

  const boardRef = useRef<HTMLDivElement>(null)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })

  // Use collaborative blocks hook
  const { 
    blocks, 
    loading, 
    error, 
    presenceData,
    connectionStatus,
    conflicts,
    createBlock, 
    updateBlock, 
    moveBlock, 
    deleteBlock,
    resolveConflict,
    updateCursorPosition
  } = useCollaborativeBlocks(projectId)

  // Track mouse movement for cursor sharing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setCursorPosition({ x, y })
        
        // Throttle cursor updates
        updateCursorPosition({ x: e.clientX, y: e.clientY })
      }
    }

    const throttledMouseMove = throttle(handleMouseMove, 100)
    
    if (boardRef.current) {
      boardRef.current.addEventListener('mousemove', throttledMouseMove)
      return () => {
        boardRef.current?.removeEventListener('mousemove', throttledMouseMove)
      }
    }
  }, [updateCursorPosition])

  // Group blocks by lane
  const blocksByLane = useMemo(() => {
    const grouped = blocks.reduce((acc, block) => {
      if (!acc[block.lane]) {
        acc[block.lane] = []
      }
      acc[block.lane].push(block)
      return acc
    }, {} as Record<BlockLane, Block[]>)

    // Ensure all lanes exist
    Object.values(BlockLane).forEach(lane => {
      if (!grouped[lane]) {
        grouped[lane] = []
      }
    })

    return grouped
  }, [blocks])

  // Sort blocks within each lane
  const sortedBlocksByLane = useMemo(() => {
    const sorted: Record<BlockLane, Block[]> = {} as Record<BlockLane, Block[]>
    
    Object.values(BlockLane).forEach(lane => {
      const laneBlocks = blocksByLane[lane] || []
      sorted[lane] = [...laneBlocks].sort((a, b) => {
        // First sort by priority
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority] || 0
        const bPriority = priorityOrder[b.priority] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        // Then by last worked
        if (a.last_worked && b.last_worked) {
          return new Date(b.last_worked).getTime() - new Date(a.last_worked).getTime()
        }
        if (a.last_worked) return -1
        if (b.last_worked) return 1
        
        // Finally by created date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    })
    
    return sorted
  }, [blocksByLane])

  // Get other users' presence data
  const otherUsersPresence = useMemo(() => {
    if (!user) return []
    return Array.from(presenceData.values()).filter(p => p.user_id !== user.id)
  }, [presenceData, user])

  // Get users with cursor positions
  const usersWithCursors = useMemo(() => {
    return otherUsersPresence.filter(user => 
      user.cursor_position && 
      user.cursor_position.x !== undefined && 
      user.cursor_position.y !== undefined
    )
  }, [otherUsersPresence])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false)

    if (!result.destination) {
      return
    }

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const destinationLane = destination.droppableId as BlockLane
    const blockToMove = blocks.find(block => block.id === draggableId)
    
    if (!blockToMove) return
    if (blockToMove.status === BlockStatus.blocked) return

    await moveBlock(draggableId, destinationLane)
  }, [blocks, moveBlock])

  // Modal handlers
  const handleCreateBlock = useCallback((lane: BlockLane) => {
    setModalState({
      isOpen: true,
      mode: 'create',
      initialLane: lane
    })
    onAddBlock?.(lane)
  }, [onAddBlock])

  const handleEditBlock = useCallback((block: Block) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      block
    })
    onBlockEdit?.(block)
  }, [onBlockEdit])

  const handleClickBlock = useCallback((block: Block) => {
    onBlockClick?.(block)
    handleEditBlock(block)
  }, [onBlockClick, handleEditBlock])

  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: 'create'
    })
  }, [])

  const handleSaveBlock = useCallback(async (block: Block) => {
    if (modalState.mode === 'create') {
      const blockData = {
        project_id: projectId,
        title: block.title,
        content: block.content,
        lane: block.lane,
        priority: block.priority,
        energy_level: block.energy_level,
        complexity: block.complexity,
        effort: block.effort,
        inspiration: block.inspiration,
        tags: block.tags,
        status: block.status
      }
      
      const result = await createBlock(blockData)
      if (!result.error) {
        handleCloseModal()
      }
    } else {
      const updates = {
        title: block.title,
        content: block.content,
        lane: block.lane,
        priority: block.priority,
        energy_level: block.energy_level,
        complexity: block.complexity,
        effort: block.effort,
        inspiration: block.inspiration,
        tags: block.tags,
        status: block.status,
        progress: block.progress
      }
      
      const result = await updateBlock(block.id, updates)
      if (!result.error) {
        handleCloseModal()
      }
    }
  }, [modalState.mode, projectId, createBlock, updateBlock])

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    const result = await deleteBlock(blockId)
    if (!result.error) {
      handleCloseModal()
    }
  }, [deleteBlock])

  // AI Import handler
  const handleAIImportBlocks = useCallback(async (blocks: any[]) => {
    const promises = blocks.map(block => 
      createBlock({
        project_id: projectId,
        title: block.title,
        content: block.content,
        lane: block.lane,
        priority: block.priority,
        energy_level: block.energy_level,
        complexity: block.complexity,
        effort: block.effort,
        inspiration: block.inspiration,
        tags: block.tags,
        status: 'not_started' as const
      })
    )
    
    const results = await Promise.all(promises)
    const errors = results.filter(result => result.error)
    
    if (errors.length > 0) {
      throw new Error(`Failed to create ${errors.length} blocks`)
    }
  }, [createBlock, projectId])

  // Generate project context for AI
  const projectContext = useMemo(() => {
    const totalBlocks = blocks.length
    const blocksByPriority = blocks.reduce((acc, block) => {
      acc[block.priority] = (acc[block.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const activeBlocks = blocks.filter(b => b.status === 'in_progress').length
    const completedBlocks = blocks.filter(b => b.status === 'completed').length
    
    return `Project has ${totalBlocks} total blocks (${activeBlocks} active, ${completedBlocks} completed). Priority distribution: ${Object.entries(blocksByPriority).map(([p, c]) => `${p}: ${c}`).join(', ')}.`
  }, [blocks])

  const lanes = [
    {
      lane: BlockLane.vision,
      title: 'Vision',
      description: 'Long-term goals and aspirations',
      color: 'purple',
      icon: '🎯'
    },
    {
      lane: BlockLane.goals,
      title: 'Goals',
      description: 'Concrete objectives to achieve',
      color: 'blue',
      icon: '📋'
    },
    {
      lane: BlockLane.current,
      title: 'Current Sprint',
      description: 'Active work in progress',
      color: 'green',
      icon: '⚡'
    },
    {
      lane: BlockLane.next,
      title: 'Next Sprint',
      description: 'Upcoming tasks and priorities',
      color: 'orange',
      icon: '📅'
    },
    {
      lane: BlockLane.context,
      title: 'Context',
      description: 'Important information and references',
      color: 'gray',
      icon: '📚'
    }
  ]

  // Show loading state
  if (loading) {
    return (
      <div className={`h-full ${className || ''}`}>
        <div className="p-6 border-b border-border bg-card/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Collaborative Project Board</h1>
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading collaborative workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className={`h-full ${className || ''}`}>
        <div className="p-6 border-b border-border bg-card/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Collaborative Project Board</h1>
                <p className="text-muted-foreground text-sm text-red-600">Error loading board</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load collaborative workspace</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state for completely new projects
  if (blocks.length === 0) {
    return (
      <div className={`h-full ${className || ''}`}>
        <div className="p-6 border-b border-border bg-card/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Collaborative Project Board</h1>
                <p className="text-muted-foreground text-sm">
                  Real-time collaboration • Live presence • Conflict resolution
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* AI Import Button */}
                <AIImportButton
                  onImportBlocks={handleAIImportBlocks}
                  projectId={projectId}
                  projectContext={projectContext}
                  variant="primary"
                />
                
                {/* Presence Indicator */}
                <PresenceIndicator
                  presenceData={presenceData}
                  currentUserId={user?.id || ''}
                  connectionStatus={connectionStatus}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="space-y-6 w-full max-w-4xl">
              <AIImportPrompt
                onImportBlocks={handleAIImportBlocks}
                projectId={projectId}
                projectContext={projectContext}
                title="Start Your Project with AI"
                description="Paste any messy text, notes, or ideas and let AI organize them into structured blocks across your board"
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ContextPreview
                  projectId={projectId}
                  project={project}
                  className="max-w-none"
                />
                <SmartSuggestions
                  projectId={projectId}
                  className="max-w-none"
                  maxSuggestions={3}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full relative ${className || ''}`} ref={boardRef}>
      {/* Global Conflicts */}
      {conflicts.size > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          {Array.from(conflicts.entries()).map(([blockId, conflict]) => (
            <ConflictIndicator
              key={blockId}
              hasConflict={true}
              conflictMessage={conflict.message}
              onResolve={() => resolveConflict(blockId)}
              className="mb-2"
            />
          ))}
        </div>
      )}

      {/* Live Cursors */}
      {usersWithCursors.map(user => (
        <LiveCursor
          key={user.user_id}
          user={user}
          position={user.cursor_position!}
        />
      ))}

      {/* Board Header */}
      <div className="p-6 border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Collaborative Project Board</h1>
              <p className="text-muted-foreground text-sm">
                Real-time collaboration • Live presence • Conflict resolution
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* AI Import Button */}
              <AIImportButton
                onImportBlocks={handleAIImportBlocks}
                projectId={projectId}
                projectContext={projectContext}
                variant="secondary"
              />
              
              {/* Presence Indicator */}
              <PresenceIndicator
                presenceData={presenceData}
                currentUserId={user?.id || ''}
                connectionStatus={connectionStatus}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Intelligence Panel */}
          <div className="border-b border-border bg-card/20 px-6 py-3">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ContextPreview
                  projectId={projectId}
                  project={project}
                  className="max-w-none"
                />
                <SmartSuggestions
                  projectId={projectId}
                  className="max-w-none"
                  maxSuggestions={5}
                />
                <ProgressInsights
                  projectId={projectId}
                  className="max-w-none"
                />
              </div>
            </div>
          </div>
          
          {/* Main Board Area */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="max-w-7xl mx-auto h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6 h-full">
                {lanes.map(({ lane, title, description, color, icon }) => {
                  const laneBlocks = sortedBlocksByLane[lane] || []
                  const laneConfig = BLOCK_LANE_CONFIG[lane]
                  const count = laneBlocks.length

                  return (
                    <div key={lane} className="flex flex-col min-h-0 group">
                      <div className="flex-1 border border-border rounded-lg bg-card/50">
                        {/* Lane Header */}
                        <div className="p-4 border-b border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{icon}</span>
                              <h3 className="font-semibold text-foreground">{title}</h3>
                              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                {count}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCreateBlock(lane)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        
                        {/* Lane Content */}
                        <div className="p-4">
                        <Droppable droppableId={lane} type="BLOCK">
                          {(provided: DroppableProvided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-3 min-h-[100px] transition-all duration-200 ${
                                snapshot.isDraggingOver
                                  ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed rounded-lg p-2'
                                  : ''
                              }`}
                            >
                              {laneBlocks.map((block, index) => {
                                const isLocked = block.status === BlockStatus.blocked
                                const isAutoInjected = block.id === 'goals-1' || block.id === 'current-1'
                                const hasConflict = conflicts.has(block.id)
                                
                                return (
                                  <div key={block.id} className="relative">
                                    <Draggable
                                      draggableId={block.id}
                                      index={index}
                                      isDragDisabled={isLocked}
                                    >
                                      {(provided: DraggableProvided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`select-none ${
                                            isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                                          } ${hasConflict ? 'ring-2 ring-yellow-300' : ''}`}
                                          style={{
                                            ...provided.draggableProps.style,
                                            transform: snapshot.isDragging
                                              ? `${provided.draggableProps.style?.transform} rotate(5deg)`
                                              : provided.draggableProps.style?.transform
                                          }}
                                        >
                                          <div className="relative">
                                            <BlockCardDB
                                              block={block}
                                              onClick={handleClickBlock}
                                              onEdit={handleEditBlock}
                                              isDragging={snapshot.isDragging}
                                              isAutoInjected={isAutoInjected}
                                            />
                                            
                                            {/* Context Indicator */}
                                            <div className="absolute top-2 left-2">
                                              <CompactContextIndicator
                                                blockId={block.id}
                                                projectId={projectId}
                                              />
                                            </div>
                                            
                                            {/* Collaborative Indicators */}
                                            <CollaborativeIndicator
                                              users={otherUsersPresence}
                                              blockId={block.id}
                                              currentUserId={user?.id || ''}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  </div>
                                )
                              })}
                              {provided.placeholder}
                              
                              {/* Empty state when no blocks */}
                              {laneBlocks.length === 0 && !snapshot.isDraggingOver && (
                                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                                  Drop blocks here or create new ones
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>
      
      {/* Global drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-black/5 pointer-events-none z-50" />
      )}

      {/* Block Modal */}
      <BlockModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        mode={modalState.mode}
        block={modalState.block}
        initialLane={modalState.initialLane}
        onSave={handleSaveBlock}
        onDelete={modalState.mode === 'edit' ? handleDeleteBlock : undefined}
      />
    </div>
  )
}

// Utility function for throttling
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  let lastExecTime = 0
  return (...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}