import { useState, useMemo, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd'
import { SwimLane } from './SwimLane'
import { BlockCard } from './BlockCard'
import { BlockModal } from './BlockModal'
import { Block, BlockLane, BlockStatus } from '@/lib/types'
import { BLOCK_LANE_CONFIG } from '@/lib/constants'

interface DraggableProjectBoardProps {
  blocks: Block[]
  onBlocksChange: (blocks: Block[]) => void
  onBlockClick?: (block: Block) => void
  onBlockEdit?: (block: Block) => void
  onAddBlock?: (lane: BlockLane) => void
  onLaneSettings?: (lane: BlockLane) => void
  className?: string
}

export function DraggableProjectBoard({
  blocks,
  onBlocksChange,
  onBlockClick,
  onBlockEdit,
  onAddBlock,
  onLaneSettings,
  className
}: DraggableProjectBoardProps) {
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

  // Sort blocks within each lane by priority and last worked
  const sortedBlocksByLane = useMemo(() => {
    const sorted: Record<BlockLane, Block[]> = {} as Record<BlockLane, Block[]>
    
    Object.values(BlockLane).forEach(lane => {
      const laneBlocks = blocksByLane[lane] || []
      sorted[lane] = [...laneBlocks].sort((a, b) => {
        // First sort by priority (higher priority first)
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority] || 0
        const bPriority = priorityOrder[b.priority] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        // Then by last worked (more recent first)
        if (a.lastWorked && b.lastWorked) {
          return new Date(b.lastWorked).getTime() - new Date(a.lastWorked).getTime()
        }
        if (a.lastWorked) return -1
        if (b.lastWorked) return 1
        
        // Finally by created date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    })
    
    return sorted
  }, [blocksByLane])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback((result: DropResult) => {
    setIsDragging(false)

    if (!result.destination) {
      return // Dropped outside a valid drop zone
    }

    const { source, destination, draggableId } = result

    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const sourceLane = source.droppableId as BlockLane
    const destinationLane = destination.droppableId as BlockLane

    // Find the block being moved
    const blockToMove = blocks.find(block => block.id === draggableId)
    if (!blockToMove) return

    // Check if the block is locked (blocked status blocks can't be moved)
    if (blockToMove.status === BlockStatus.BLOCKED) {
      return
    }

    // Create updated blocks array
    const updatedBlocks = blocks.map(block => {
      if (block.id === draggableId) {
        return {
          ...block,
          lane: destinationLane,
          updatedAt: new Date()
        }
      }
      return block
    })

    onBlocksChange(updatedBlocks)
  }, [blocks, onBlocksChange])

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
    // For now, clicking opens edit modal - later this could be a detail view
    handleEditBlock(block)
  }, [onBlockClick, handleEditBlock])

  const handleCloseModal = useCallback(() => {
    setModalState({
      isOpen: false,
      mode: 'create'
    })
  }, [])

  const handleSaveBlock = useCallback((block: Block) => {
    if (modalState.mode === 'create') {
      // Add new block
      onBlocksChange([...blocks, { ...block, projectId: 'current-project' }])
    } else {
      // Update existing block
      const updatedBlocks = blocks.map(b => b.id === block.id ? block : b)
      onBlocksChange(updatedBlocks)
    }
  }, [blocks, onBlocksChange, modalState.mode])

  const handleDeleteBlock = useCallback((blockId: string) => {
    const updatedBlocks = blocks.filter(b => b.id !== blockId)
    onBlocksChange(updatedBlocks)
  }, [blocks, onBlocksChange])

  const lanes = [
    {
      lane: BlockLane.VISION,
      title: 'Vision',
      description: 'Long-term goals and aspirations',
      color: 'purple',
      icon: '🎯'
    },
    {
      lane: BlockLane.GOALS,
      title: 'Goals',
      description: 'Concrete objectives to achieve',
      color: 'blue',
      icon: '📋'
    },
    {
      lane: BlockLane.CURRENT,
      title: 'Current Sprint',
      description: 'Active work in progress',
      color: 'green',
      icon: '⚡'
    },
    {
      lane: BlockLane.NEXT,
      title: 'Next Sprint',
      description: 'Upcoming tasks and priorities',
      color: 'orange',
      icon: '📅'
    },
    {
      lane: BlockLane.CONTEXT,
      title: 'Context',
      description: 'Important information and references',
      color: 'gray',
      icon: '📚'
    }
  ]

  return (
    <div className={`h-full ${className || ''}`}>
      {/* Board Header */}
      <div className="p-6 border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Project Board</h1>
              <p className="text-muted-foreground text-sm">
                Organize your work across five swim lanes • Drag blocks to move them
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Auto-injected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Recent sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Blocked</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            <div className="max-w-7xl mx-auto h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6 h-full">
                {lanes.map(({ lane, title, description, color, icon }) => {
                  const laneBlocks = sortedBlocksByLane[lane] || []
                  const laneConfig = BLOCK_LANE_CONFIG[lane]
                  const count = laneBlocks.length

                  return (
                    <div key={lane} className="flex flex-col min-h-0 group">
                      <SwimLane
                        lane={lane}
                        title={title}
                        description={description}
                        count={count}
                        maxCount={laneConfig.maxBlocks}
                        color={color}
                        icon={icon}
                        onAddBlock={handleCreateBlock}
                        onLaneSettings={onLaneSettings}
                        className="flex-1"
                      >
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
                                const isLocked = block.status === BlockStatus.BLOCKED
                                const isAutoInjected = block.id === 'goals-1' || block.id === 'current-1'
                                
                                return (
                                  <Draggable
                                    key={block.id}
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
                                        }`}
                                        style={{
                                          ...provided.draggableProps.style,
                                          transform: snapshot.isDragging
                                            ? `${provided.draggableProps.style?.transform} rotate(5deg)`
                                            : provided.draggableProps.style?.transform
                                        }}
                                      >
                                        <BlockCard
                                          block={block}
                                          onClick={handleClickBlock}
                                          onEdit={handleEditBlock}
                                          isDragging={snapshot.isDragging}
                                          isAutoInjected={isAutoInjected}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
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
                      </SwimLane>
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