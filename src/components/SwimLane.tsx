import { ReactNode } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Button, Badge } from './ui'
import { BlockLane } from '@/lib/types'
import { cn } from '@/utils'

interface SwimLaneProps {
  lane: BlockLane
  title: string
  description: string
  count: number
  maxCount?: number | null
  color: string
  icon: string
  children?: ReactNode
  onAddBlock: (lane: BlockLane) => void
  onLaneSettings: (lane: BlockLane) => void
  className?: string
}

export function SwimLane({
  lane,
  title,
  description,
  count,
  maxCount,
  color,
  icon,
  children,
  onAddBlock,
  onLaneSettings,
  className
}: SwimLaneProps) {
  const isOverLimit = maxCount !== null && count > maxCount

  return (
    <div className={cn(
      'flex flex-col h-full bg-card rounded-lg border border-border shadow-sm',
      className
    )}>
      {/* Lane Header */}
      <div className="p-4 border-b border-border bg-card/50 rounded-t-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label={title}>
              {icon}
            </span>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              size="sm"
              className={cn(
                'font-mono text-xs',
                isOverLimit 
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                    color === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
              )}
            >
              {count}
              {maxCount !== null && (
                <span className="text-muted-foreground">/{maxCount}</span>
              )}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLaneSettings(lane)}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Add Block Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock(lane)}
          className="w-full justify-start gap-2 h-8 text-muted-foreground hover:text-foreground border-dashed border border-border hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs">Add block</span>
        </Button>

        {/* Warning for over limit */}
        {isOverLimit && (
          <div className="mt-2 text-xs text-destructive bg-destructive/5 px-2 py-1 rounded">
            ⚠️ Over recommended limit ({maxCount})
          </div>
        )}
      </div>

      {/* Lane Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-2 space-y-3">
          {children}
        </div>
      </div>

      {/* Empty State */}
      {count === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
              color === 'purple' ? 'bg-purple-100' :
              color === 'blue' ? 'bg-blue-100' :
              color === 'green' ? 'bg-green-100' :
              color === 'orange' ? 'bg-orange-100' :
              'bg-gray-100'
            )}>
              <span className="text-xl opacity-50" role="img" aria-label={title}>
                {icon}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              No blocks in {title.toLowerCase()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddBlock(lane)}
              className="text-xs"
            >
              Create your first block
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}