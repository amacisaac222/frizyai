import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Columns
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader, Textarea, Modal } from '@/components/ui'
import { BlockLane, BlockStatus, type Block } from '@/lib/database.types'
import { cn } from '@/utils'

interface VerticalFlowBoardProps {
  blocks: Block[]
  onBlockCreate?: (block: Partial<Block>) => void
  onBlockUpdate?: (blockId: string, updates: Partial<Block>) => void
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

export function VerticalFlowBoard({ 
  blocks, 
  onBlockCreate, 
  onBlockUpdate, 
  onBlockMove, 
  projectId,
  className 
}: VerticalFlowBoardProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('two-column')
  const [expandedLanes, setExpandedLanes] = useState<Set<BlockLane>>(
    new Set([BlockLane.current, BlockLane.next])
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLane, setSelectedLane] = useState<BlockLane>(BlockLane.current)

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
    <div className={cn('w-full space-y-6', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Flow</h1>
          <p className="text-muted-foreground">
            Organize your work from vision to execution
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
              <LaneSection
                key={laneId}
                config={laneConfigs.find(c => c.id === laneId)!}
                blocks={blocksByLane[laneId] || []}
                isExpanded={expandedLanes.has(laneId)}
                onToggleExpanded={() => toggleLaneExpansion(laneId)}
                onCreateBlock={() => handleCreateBlock(laneId)}
                onBlockUpdate={onBlockUpdate}
                layoutMode={layoutMode}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Create Block Modal */}
      <CreateBlockModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        lane={selectedLane}
        onCreateBlock={onBlockCreate}
      />
    </div>
  )
}

// Lane Section Component
interface LaneSectionProps {
  config: LaneConfig
  blocks: Block[]
  isExpanded: boolean
  onToggleExpanded: () => void
  onCreateBlock: () => void
  onBlockUpdate?: (blockId: string, updates: Partial<Block>) => void
  layoutMode: LayoutMode
}

function LaneSection({
  config,
  blocks,
  isExpanded,
  onToggleExpanded,
  onCreateBlock,
  onBlockUpdate,
  layoutMode
}: LaneSectionProps) {
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
    <Card className={cn(
      'overflow-hidden transition-all duration-200',
      colorClasses[color as keyof typeof colorClasses]
    )}>
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
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      onUpdate={onBlockUpdate}
                      compact={layoutMode === 'grid'}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Block Card Component
interface BlockCardProps {
  block: Block
  onUpdate?: (blockId: string, updates: Partial<Block>) => void
  compact?: boolean
}

function BlockCard({ block, onUpdate, compact = false }: BlockCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50/30'
      case 'high': return 'border-l-orange-500 bg-orange-50/30'
      case 'medium': return 'border-l-blue-500 bg-blue-50/30'
      default: return 'border-l-gray-300 bg-gray-50/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-lg border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow',
        getPriorityColor(block.priority)
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            'font-medium leading-snug',
            compact ? 'text-sm' : 'text-base'
          )}>
            {block.title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge 
              variant="secondary" 
              size="sm"
              className={getStatusColor(block.status)}
            >
              {block.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {block.content && !compact && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {block.content}
          </p>
        )}

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
      </div>
    </motion.div>
  )
}

// Create Block Modal
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