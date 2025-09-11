import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Target, 
  Flag, 
  Zap, 
  Clock, 
  BookOpen,
  Plus,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Layout,
  Columns,
  Edit3,
  Trash2,
  ArrowRight,
  GripVertical,
  Save,
  X,
  Check
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader, Textarea, Modal, Tooltip } from '@/components/ui'
import { BlockLane, BlockStatus, type Block } from '@/lib/database.types'
import { cn } from '@/utils'

interface InteractiveVerticalBoardProps {
  blocks: Block[]
  onBlockCreate?: (block: Partial<Block>) => void
  onBlockUpdate?: (blockId: string, updates: Partial<Block>) => void
  onBlockDelete?: (blockId: string) => void
  onBlockMove?: (blockId: string, toLane: BlockLane) => void
  projectId: string
  className?: string
}

interface LaneConfig {
  id: BlockLane
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  emptyMessage: string
}

const laneConfigs: LaneConfig[] = [
  {
    id: BlockLane.vision,
    title: 'Vision',
    description: 'The big picture and long-term goals',
    icon: Target,
    color: 'pink',
    emptyMessage: 'Define your project\'s vision and purpose'
  },
  {
    id: BlockLane.context,
    title: 'Context',
    description: 'Background info, decisions, and references',
    icon: BookOpen,
    color: 'purple',
    emptyMessage: 'Capture important context and decisions'
  },
  {
    id: BlockLane.goals,
    title: 'Goals',
    description: 'Key objectives and milestones',
    icon: Flag,
    color: 'yellow',
    emptyMessage: 'Set clear, measurable goals'
  },
  {
    id: BlockLane.current,
    title: 'Current Sprint',
    description: 'What you\'re working on right now',
    icon: Zap,
    color: 'cyan',
    emptyMessage: 'Add tasks for your current sprint'
  },
  {
    id: BlockLane.next,
    title: 'Next Sprint',
    description: 'Upcoming work and priorities',
    icon: Clock,
    color: 'green',
    emptyMessage: 'Plan your next sprint items'
  }
]

type LayoutMode = 'single' | 'two-column' | 'grid'

export function InteractiveVerticalBoard({ 
  blocks, 
  onBlockCreate, 
  onBlockUpdate, 
  onBlockDelete,
  onBlockMove, 
  projectId,
  className 
}: InteractiveVerticalBoardProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('two-column')
  const [expandedLanes, setExpandedLanes] = useState<Set<BlockLane>>(
    new Set([BlockLane.current, BlockLane.next])
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLane, setSelectedLane] = useState<BlockLane>(BlockLane.current)
  const [draggedBlock, setDraggedBlock] = useState<Block | null>(null)
  const [editingBlock, setEditingBlock] = useState<string | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group blocks by lane
  const blocksByLane = blocks.reduce((acc, block) => {
    if (!acc[block.lane]) acc[block.lane] = []
    acc[block.lane].push(block)
    return acc
  }, {} as Record<BlockLane, Block[]>)

  const toggleLaneExpansion = useCallback((laneId: BlockLane) => {
    setExpandedLanes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(laneId)) {
        newSet.delete(laneId)
      } else {
        newSet.add(laneId)
      }
      return newSet
    })
  }, [])

  const handleCreateBlock = (laneId: BlockLane) => {
    setSelectedLane(laneId)
    setShowCreateModal(true)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const block = blocks.find(b => b.id === event.active.id)
    if (block) {
      setDraggedBlock(block)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setDraggedBlock(null)
      return
    }

    const activeBlock = blocks.find(b => b.id === active.id)
    if (!activeBlock) {
      setDraggedBlock(null)
      return
    }

    // Check if dropped on a different lane
    const overLaneId = over.id as BlockLane
    if (laneConfigs.some(lane => lane.id === overLaneId) && activeBlock.lane !== overLaneId) {
      onBlockMove?.(activeBlock.id, overLaneId)
    }

    setDraggedBlock(null)
  }

  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'single':
        return 'flex flex-col space-y-8'
      case 'two-column':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-8'
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
      default:
        return 'flex flex-col space-y-8'
    }
  }

  const getLaneOrder = () => {
    if (layoutMode === 'two-column') {
      return [
        [BlockLane.vision, BlockLane.context],
        [BlockLane.goals, BlockLane.current],
        [BlockLane.next] // Full width
      ]
    }
    return laneConfigs.map(config => [config.id])
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <div className={cn('w-full space-y-6', className)}>
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Interactive Project Board</h1>
            <p className="text-muted-foreground">
              Drag, drop, and edit your way to productivity
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={layoutMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayoutMode('single')}
              className="gap-1"
            >
              <Layout className="w-4 h-4" />
              Single
            </Button>
            <Button
              variant={layoutMode === 'two-column' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayoutMode('two-column')}
              className="gap-1"
            >
              <Columns className="w-4 h-4" />
              Two Column
            </Button>
            <Button
              variant={layoutMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayoutMode('grid')}
              className="gap-1"
            >
              <MoreVertical className="w-4 h-4" />
              Grid
            </Button>
          </div>
        </div>

        {/* Board Content */}
        <div className={getLayoutClasses()}>
          {getLaneOrder().map((laneGroup, groupIndex) => (
            <div key={groupIndex} className={cn(
              layoutMode === 'two-column' && laneGroup.length === 1 ? 'lg:col-span-2' : '',
              layoutMode === 'two-column' ? 'flex flex-col space-y-8' : 'contents'
            )}>
              {laneGroup.map(laneId => (
                <DroppableLaneSection
                  key={laneId}
                  config={laneConfigs.find(c => c.id === laneId)!}
                  blocks={blocksByLane[laneId] || []}
                  isExpanded={expandedLanes.has(laneId)}
                  onToggleExpanded={() => toggleLaneExpansion(laneId)}
                  onCreateBlock={() => handleCreateBlock(laneId)}
                  onBlockUpdate={onBlockUpdate}
                  onBlockDelete={onBlockDelete}
                  layoutMode={layoutMode}
                  editingBlock={editingBlock}
                  setEditingBlock={setEditingBlock}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedBlock && (
            <div className="opacity-90">
              <BlockCard
                block={draggedBlock}
                isDragging={true}
                compact={layoutMode === 'grid'}
              />
            </div>
          )}
        </DragOverlay>

        {/* Create Block Modal */}
        <CreateBlockModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          lane={selectedLane}
          onCreateBlock={onBlockCreate}
        />
      </div>
    </DndContext>
  )
}

// Droppable Lane Section Component
interface DroppableLaneSectionProps {
  config: LaneConfig
  blocks: Block[]
  isExpanded: boolean
  onToggleExpanded: () => void
  onCreateBlock: () => void
  onBlockUpdate?: (blockId: string, updates: Partial<Block>) => void
  onBlockDelete?: (blockId: string) => void
  layoutMode: LayoutMode
  editingBlock: string | null
  setEditingBlock: (id: string | null) => void
}

function DroppableLaneSection({
  config,
  blocks,
  isExpanded,
  onToggleExpanded,
  onCreateBlock,
  onBlockUpdate,
  onBlockDelete,
  layoutMode,
  editingBlock,
  setEditingBlock
}: DroppableLaneSectionProps) {
  const { setNodeRef, isOver } = useSortable({
    id: config.id,
    data: {
      type: 'lane',
      lane: config.id,
    },
  })

  const { title, description, icon: Icon, color, emptyMessage } = config

  const colorClasses = {
    pink: 'border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100/50 text-pink-900',
    yellow: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 text-yellow-900',
    cyan: 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100/50 text-cyan-900',
    green: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 text-green-900',
    purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-900',
    gray: 'border-gray-200 bg-gray-50/50 text-gray-900',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-900',
    orange: 'border-orange-200 bg-orange-50/50 text-orange-900'
  }

  const iconColorClasses = {
    pink: 'text-pink-600',
    yellow: 'text-yellow-600',
    cyan: 'text-cyan-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600'
  }

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        'overflow-hidden transition-all duration-200',
        colorClasses[color as keyof typeof colorClasses],
        isOver && 'ring-2 ring-blue-400 ring-opacity-50'
      )}
    >
      <CardHeader 
        className="cursor-pointer hover:bg-black/5 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg bg-white/80',
              iconColorClasses[color as keyof typeof iconColorClasses]
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm opacity-75">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/60">
              {blocks.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onCreateBlock()
              }}
              className="opacity-60 hover:opacity-100"
            >
              <Plus className="w-4 h-4" />
            </Button>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 opacity-60" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-60" />
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              {blocks.length === 0 ? (
                <div className="text-center py-12 opacity-60">
                  <Icon className={cn(
                    'w-12 h-12 mx-auto mb-3 opacity-40',
                    iconColorClasses[color as keyof typeof iconColorClasses]
                  )} />
                  <p className="text-sm">{emptyMessage}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCreateBlock}
                    className="mt-3 opacity-70 hover:opacity-100"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add first block
                  </Button>
                </div>
              ) : (
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {blocks.map((block) => (
                      <SortableBlockCard
                        key={block.id}
                        block={block}
                        onUpdate={onBlockUpdate}
                        onDelete={onBlockDelete}
                        compact={layoutMode === 'grid'}
                        isEditing={editingBlock === block.id}
                        setEditingBlock={setEditingBlock}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Sortable Block Card Component
interface SortableBlockCardProps {
  block: Block
  onUpdate?: (blockId: string, updates: Partial<Block>) => void
  onDelete?: (blockId: string) => void
  compact?: boolean
  isEditing: boolean
  setEditingBlock: (id: string | null) => void
}

function SortableBlockCard({ 
  block, 
  onUpdate, 
  onDelete, 
  compact = false, 
  isEditing, 
  setEditingBlock 
}: SortableBlockCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BlockCard
        block={block}
        onUpdate={onUpdate}
        onDelete={onDelete}
        compact={compact}
        isDragging={isDragging}
        dragHandleProps={listeners}
        isEditing={isEditing}
        setEditingBlock={setEditingBlock}
      />
    </div>
  )
}

// Enhanced Block Card Component
interface BlockCardProps {
  block: Block
  onUpdate?: (blockId: string, updates: Partial<Block>) => void
  onDelete?: (blockId: string) => void
  compact?: boolean
  isDragging?: boolean
  dragHandleProps?: any
  isEditing?: boolean
  setEditingBlock?: (id: string | null) => void
}

function BlockCard({ 
  block, 
  onUpdate, 
  onDelete, 
  compact = false, 
  isDragging = false, 
  dragHandleProps,
  isEditing = false,
  setEditingBlock
}: BlockCardProps) {
  const [editTitle, setEditTitle] = useState(block.title)
  const [editContent, setEditContent] = useState(block.content)
  const [showActions, setShowActions] = useState(false)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-pink-500 bg-gradient-to-r from-pink-50/30 to-pink-100/20'
      case 'high': return 'border-l-yellow-500 bg-gradient-to-r from-yellow-50/30 to-yellow-100/20'
      case 'medium': return 'border-l-cyan-500 bg-gradient-to-r from-cyan-50/30 to-cyan-100/20'
      default: return 'border-l-gray-300 bg-gray-50/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-100 to-cyan-100 text-green-800'
      case 'in_progress': return 'bg-gradient-to-r from-yellow-100 to-pink-100 text-yellow-800'
      case 'blocked': return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSaveEdit = () => {
    if (editTitle.trim() !== block.title || editContent !== block.content) {
      onUpdate?.(block.id, {
        title: editTitle.trim(),
        content: editContent
      })
    }
    setEditingBlock?.(null)
  }

  const handleCancelEdit = () => {
    setEditTitle(block.title)
    setEditContent(block.content)
    setEditingBlock?.(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all group relative',
        getPriorityColor(block.priority),
        isDragging && 'shadow-lg rotate-2 scale-105',
        isEditing && 'ring-2 ring-blue-400'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag Handle */}
      {dragHandleProps && !isEditing && (
        <div
          {...dragHandleProps}
          className={cn(
            'absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity',
            showActions && 'opacity-60'
          )}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Actions Menu */}
      {showActions && !isEditing && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Edit block">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-100"
              onClick={() => setEditingBlock?.(block.id)}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete block">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-100"
              onClick={() => onDelete?.(block.id)}
            >
              <Trash2 className="w-3 h-3 text-red-600" />
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Save/Cancel Actions for Editing */}
      {isEditing && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-green-100"
            onClick={handleSaveEdit}
          >
            <Check className="w-3 h-3 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={handleCancelEdit}
          >
            <X className="w-3 h-3 text-red-600" />
          </Button>
        </div>
      )}

      <div className={cn('p-4', dragHandleProps && 'pl-8')}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={cn(
                  'font-medium leading-snug bg-transparent border-none outline-none resize-none w-full',
                  compact ? 'text-sm' : 'text-base'
                )}
                autoFocus
              />
            ) : (
              <h4 
                className={cn(
                  'font-medium leading-snug cursor-pointer hover:text-blue-600 transition-colors',
                  compact ? 'text-sm' : 'text-base'
                )}
                onClick={() => setEditingBlock?.(block.id)}
              >
                {block.title}
              </h4>
            )}
            
            {!isEditing && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge 
                  variant="secondary" 
                  size="sm"
                  className={getStatusColor(block.status)}
                >
                  {block.status.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </div>

          {block.content && !compact && (
            <div>
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm text-muted-foreground leading-relaxed min-h-16 resize-none"
                  placeholder="Add description..."
                />
              ) : (
                <p 
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer hover:text-gray-800 transition-colors"
                  onClick={() => setEditingBlock?.(block.id)}
                >
                  {block.content}
                </p>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{block.priority} priority</span>
              {block.progress > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${block.progress}%` }}
                    />
                  </div>
                  <span>{block.progress}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Create Block Modal (reusing from previous component)
interface CreateBlockModalProps {
  isOpen: boolean
  onClose: () => void
  lane: BlockLane
  onCreateBlock?: (block: Partial<Block>) => void
}

function CreateBlockModal({ isOpen, onClose, lane, onCreateBlock }: CreateBlockModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')

  const handleSubmit = () => {
    if (!title.trim()) return

    onCreateBlock?.({
      title: title.trim(),
      content: content.trim(),
      lane,
      priority,
      status: BlockStatus.not_started,
      progress: 0
    })

    setTitle('')
    setContent('')
    setPriority('medium')
    onClose()
  }

  const laneConfig = laneConfigs.find(c => c.id === lane)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Block to ${laneConfig?.title}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter block title..."
            className="w-full px-3 py-2 border rounded-md"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add details, context, or notes..."
            className="min-h-20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Create Block
          </Button>
        </div>
      </div>
    </Modal>
  )
}