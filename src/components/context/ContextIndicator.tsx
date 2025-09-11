import { Eye, EyeOff, Star, BarChart3 } from 'lucide-react'
import { Tooltip, Badge } from '@/components/ui'
import { useContextManager } from '@/hooks/useContextManager'
import { cn } from '@/utils'

interface ContextIndicatorProps {
  blockId: string
  projectId: string
  className?: string
  showScore?: boolean
  showControls?: boolean
}

export function ContextIndicator({ 
  blockId, 
  projectId, 
  className,
  showScore = false,
  showControls = false
}: ContextIndicatorProps) {
  const {
    isBlockIncluded,
    getBlockScore,
    userImportantBlocks,
    markBlockImportant,
    manualOverrides,
    setBlockOverride
  } = useContextManager({ projectId })
  
  const included = isBlockIncluded(blockId)
  const scoreBreakdown = getBlockScore(blockId)
  const isImportant = userImportantBlocks.has(blockId)
  const override = manualOverrides[blockId]
  
  if (!scoreBreakdown) return null
  
  const score = scoreBreakdown.total
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600'
    if (score >= 0.4) return 'text-yellow-600'
    return 'text-gray-600'
  }
  
  const getScoreBg = (score: number) => {
    if (score >= 0.7) return 'bg-green-100'
    if (score >= 0.4) return 'bg-yellow-100'
    return 'bg-gray-100'
  }
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Context Inclusion Indicator */}
      <Tooltip 
        content={
          <div className="space-y-1">
            <div className="font-medium">
              {included ? 'Included in Claude context' : 'Not included in context'}
            </div>
            <div className="text-xs space-y-1">
              <div>Score: {score.toFixed(2)}</div>
              <div>Recency: {scoreBreakdown.recency.toFixed(2)}</div>
              <div>Sessions: {scoreBreakdown.sessions.toFixed(2)}</div>
              <div>Priority: {scoreBreakdown.priority.toFixed(2)}</div>
              {override && (
                <div className="text-blue-400">
                  Manual override: {override}
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          included ? "bg-green-500" : "bg-gray-300",
          override === 'include' && "ring-2 ring-blue-300",
          override === 'exclude' && "ring-2 ring-red-300"
        )} />
      </Tooltip>
      
      {/* Score Badge */}
      {showScore && (
        <Badge 
          size="sm" 
          variant="secondary"
          className={cn(
            "text-xs px-1 py-0",
            getScoreBg(score),
            getScoreColor(score)
          )}
        >
          {score.toFixed(1)}
        </Badge>
      )}
      
      {/* Important Star */}
      {isImportant && (
        <Tooltip content="User marked as important">
          <Star className="w-3 h-3 text-yellow-500 fill-current" />
        </Tooltip>
      )}
      
      {/* Manual Controls */}
      {showControls && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Force include in context">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setBlockOverride(blockId, override === 'include' ? null : 'include')
              }}
              className={cn(
                "p-0.5 rounded hover:bg-blue-100 transition-colors",
                override === 'include' ? "text-blue-600 bg-blue-50" : "text-gray-400"
              )}
            >
              <Eye className="w-3 h-3" />
            </button>
          </Tooltip>
          
          <Tooltip content="Exclude from context">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setBlockOverride(blockId, override === 'exclude' ? null : 'exclude')
              }}
              className={cn(
                "p-0.5 rounded hover:bg-red-100 transition-colors",
                override === 'exclude' ? "text-red-600 bg-red-50" : "text-gray-400"
              )}
            >
              <EyeOff className="w-3 h-3" />
            </button>
          </Tooltip>
          
          <Tooltip content="Mark as important">
            <button
              onClick={(e) => {
                e.stopPropagation()
                markBlockImportant(blockId, !isImportant)
              }}
              className={cn(
                "p-0.5 rounded hover:bg-yellow-100 transition-colors",
                isImportant ? "text-yellow-600" : "text-gray-400"
              )}
            >
              <Star className={cn("w-3 h-3", isImportant && "fill-current")} />
            </button>
          </Tooltip>
          
          <Tooltip content="View detailed scores">
            <button
              className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-400"
            >
              <BarChart3 className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

// Compact version for use in block cards
interface CompactContextIndicatorProps {
  blockId: string
  projectId: string
  className?: string
}

export function CompactContextIndicator({ 
  blockId, 
  projectId, 
  className 
}: CompactContextIndicatorProps) {
  return (
    <ContextIndicator
      blockId={blockId}
      projectId={projectId}
      className={className}
      showScore={false}
      showControls={false}
    />
  )
}

// Full version with all controls for management interfaces
interface FullContextIndicatorProps {
  blockId: string
  projectId: string
  className?: string
}

export function FullContextIndicator({ 
  blockId, 
  projectId, 
  className 
}: FullContextIndicatorProps) {
  return (
    <ContextIndicator
      blockId={blockId}
      projectId={projectId}
      className={className}
      showScore={true}
      showControls={true}
    />
  )
}