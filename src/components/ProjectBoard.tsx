import { useState, useMemo } from 'react'
import { SwimLane } from './SwimLane'
import { BlockCard } from './BlockCard'
import { Block, BlockLane } from '@/lib/types'
import { BLOCK_LANE_CONFIG } from '@/lib/constants'

interface ProjectBoardProps {
  blocks: Block[]
  onBlockClick: (block: Block) => void
  onBlockEdit: (block: Block) => void
  onAddBlock: (lane: BlockLane) => void
  onLaneSettings: (lane: BlockLane) => void
  className?: string
}

export function ProjectBoard({
  blocks,
  onBlockClick,
  onBlockEdit,
  onAddBlock,
  onLaneSettings,
  className
}: ProjectBoardProps) {
  const [draggedBlock, setDraggedBlock] = useState<Block | null>(null)

  // Group blocks by lane
  const blocksByLane = useMemo(() => {
    return blocks.reduce((acc, block) => {
      if (!acc[block.lane]) {
        acc[block.lane] = []
      }
      acc[block.lane].push(block)
      return acc
    }, {} as Record<BlockLane, Block[]>)
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

  const handleDragStart = (block: Block) => {
    setDraggedBlock(block)
  }

  const handleDragEnd = () => {
    setDraggedBlock(null)
  }

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
                Organize your work across five swim lanes
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Recently worked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-200 border border-orange-300" />
                <span>Claude sessions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Swim Lanes */}
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
                      onAddBlock={onAddBlock}
                      onLaneSettings={onLaneSettings}
                      className="flex-1"
                    >
                      {laneBlocks.map((block) => (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => handleDragStart(block)}
                          onDragEnd={handleDragEnd}
                          className="select-none"
                        >
                          <BlockCard
                            block={block}
                            onClick={onBlockClick}
                            onEdit={onBlockEdit}
                            isDragging={draggedBlock?.id === block.id}
                          />
                        </div>
                      ))}
                    </SwimLane>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}