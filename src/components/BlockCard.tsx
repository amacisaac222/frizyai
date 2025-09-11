import { Clock, MessageSquare, Zap, AlertTriangle } from 'lucide-react'
import { Card, CardContent, StatusBadge, PriorityBadge, EnergyBadge, ComplexityBadge, Badge } from './ui'
import { Block, BlockStatus } from '@/lib/types'
import { cn } from '@/utils'

interface BlockCardProps {
  block: Block
  onClick?: (block: Block) => void
  onEdit?: (block: Block) => void
  isDragging?: boolean
  isSelected?: boolean
  isAutoInjected?: boolean // Auto-injected to Claude context
}

export function BlockCard({ 
  block, 
  onClick, 
  onEdit, 
  isDragging, 
  isSelected,
  isAutoInjected = false 
}: BlockCardProps) {
  const hasClaudeSessions = block.claudeSessions > 0
  const isRecentlyWorked = block.lastWorked && 
    (new Date().getTime() - new Date(block.lastWorked).getTime()) < 24 * 60 * 60 * 1000
  const isBlocked = block.status === BlockStatus.BLOCKED || block.blockedBy.length > 0
  const hasRecentSessions = block.claudeSessions > 0 && isRecentlyWorked

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 relative',
        // Base hover effects
        'hover:shadow-md hover:ring-1 hover:ring-primary/20 hover:border-primary/20 hover:-translate-y-0.5',
        // Selection state
        isSelected && 'ring-2 ring-primary border-primary shadow-md',
        // Dragging state
        isDragging && 'opacity-50 rotate-2 shadow-lg scale-105',
        // Claude sessions background
        hasClaudeSessions && 'bg-orange-50/30',
        // Blocked state
        isBlocked && 'ring-1 ring-red-200 bg-red-50/20',
        // Auto-injected state
        isAutoInjected && 'ring-1 ring-blue-200 bg-blue-50/20'
      )}
      onClick={() => onClick?.(block)}
    >
      <CardContent className="p-4">
        {/* Visual Status Indicators */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isAutoInjected && (
            <div 
              className="w-2 h-2 rounded-full bg-blue-500" 
              title="Auto-injected to Claude context"
            />
          )}
          {hasRecentSessions && (
            <div 
              className="w-2 h-2 rounded-full bg-green-500" 
              title="Recent Claude sessions"
            />
          )}
          {isBlocked && (
            <div 
              className="w-2 h-2 rounded-full bg-red-500" 
              title="Blocked or stuck"
            />
          )}
        </div>

        {/* Header with Title and Priority */}
        <div className="flex items-start justify-between mb-3 pr-8">
          <h4 className="font-medium text-sm leading-tight flex-1 line-clamp-2">
            {block.title}
          </h4>
          <PriorityBadge priority={block.priority} size="sm" />
        </div>

        {/* Content Preview */}
        {block.content && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
            {block.content}
          </p>
        )}

        {/* Progress Bar */}
        {block.progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{block.progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${block.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status and Complexity */}
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={block.status} size="sm" />
          <ComplexityBadge complexity={block.complexity} size="sm" />
        </div>

        {/* Tags */}
        {block.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {block.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                size="sm"
                variant="secondary"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
            {block.tags.length > 3 && (
              <Badge size="sm" variant="secondary" className="text-xs">
                +{block.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadata Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            {/* Effort estimation */}
            {block.effort > 0 && (
              <div className="flex items-center gap-1" title={`Estimated effort: ${block.effort} hours`}>
                <Clock className="w-3 h-3" />
                <span>{block.effort}h</span>
              </div>
            )}
            
            {/* Claude session count */}
            {hasClaudeSessions && (
              <div className="flex items-center gap-1 text-orange-600" title={`${block.claudeSessions} Claude sessions`}>
                <Zap className="w-3 h-3" />
                <span>{block.claudeSessions}</span>
              </div>
            )}
            
            {/* Last worked timestamp */}
            {block.lastWorked && (
              <div className="flex items-center gap-1" title={`Last worked: ${new Date(block.lastWorked).toLocaleString()}`}>
                {isRecentlyWorked && <div className="w-2 h-2 rounded-full bg-green-500" />}
                <span>
                  {isRecentlyWorked 
                    ? 'Recent' 
                    : new Date(block.lastWorked).toLocaleDateString()
                  }
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Energy level indicator for vibe coders */}
            <EnergyBadge energy={block.energyLevel} size="sm" />
            
            {/* Inspiration meter for vibe coders */}
            {block.inspiration && block.inspiration !== 5 && (
              <div className="flex items-center gap-1" title={`Inspiration level: ${block.inspiration}/10`}>
                <span>✨</span>
                <span>{block.inspiration}/10</span>
              </div>
            )}
          </div>
        </div>

        {/* Dependencies indicator */}
        {(block.dependencies.length > 0 || block.blockedBy.length > 0) && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs">
              {block.blockedBy.length > 0 && (
                <Badge size="sm" variant="destructive" className="text-xs">
                  🚫 Blocked by {block.blockedBy.length}
                </Badge>
              )}
              {block.dependencies.length > 0 && (
                <Badge size="sm" variant="outline" className="text-xs">
                  ⚡ Depends on {block.dependencies.length}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* AI Suggestions indicator */}
        {block.aiSuggestions && block.aiSuggestions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <MessageSquare className="w-3 h-3" />
              <span>{block.aiSuggestions.length} AI suggestion{block.aiSuggestions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}