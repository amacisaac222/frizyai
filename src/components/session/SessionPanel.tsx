import { useState } from 'react'
import { 
  Play, Pause, Square, Clock, Brain, Lightbulb, 
  CheckCircle, AlertTriangle, ArrowRight, Target,
  ChevronDown, ChevronUp, RefreshCw, Save, Plus,
  MessageSquare, TrendingUp, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, Button, Badge, Textarea, Modal, Tooltip } from '@/components/ui'
import { useSessionTracker } from '@/hooks/useSessionTracker'
import type { InsightType, CapturedInsight } from '@/lib/session-tracker'
import { cn } from '@/utils'

interface SessionPanelProps {
  projectId: string
  className?: string
  onSessionEnd?: (summary: any) => void
}

export function SessionPanel({ 
  projectId, 
  className,
  onSessionEnd 
}: SessionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showInsightModal, setShowInsightModal] = useState(false)
  const [insightType, setInsightType] = useState<InsightType>('idea')
  
  const {
    isActive,
    session,
    stats,
    recentInsights,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    captureInsight,
    captureDecision,
    captureProblemSolution,
    captureIdea,
    captureNextStep,
    captureBlocker,
    getActivitySummary,
    canCapture
  } = useSessionTracker({ projectId, autoStart: false })
  
  const activitySummary = getActivitySummary()
  
  const handleStartSession = async () => {
    await startSession()
  }
  
  const handleEndSession = async () => {
    const summary = await endSession()
    if (summary && onSessionEnd) {
      onSessionEnd(summary)
    }
  }
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }
  
  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'decision': return <Target className="w-3 h-3 text-blue-600" />
      case 'problem_solution': return <CheckCircle className="w-3 h-3 text-green-600" />
      case 'idea': return <Lightbulb className="w-3 h-3 text-yellow-600" />
      case 'next_step': return <ArrowRight className="w-3 h-3 text-purple-600" />
      case 'blocker': return <AlertTriangle className="w-3 h-3 text-red-600" />
      default: return <MessageSquare className="w-3 h-3 text-gray-600" />
    }
  }
  
  const quickCaptureButtons = [
    {
      type: 'decision' as InsightType,
      label: 'Decision',
      icon: Target,
      color: 'blue',
      action: captureDecision
    },
    {
      type: 'problem_solution' as InsightType,
      label: 'Solution',
      icon: CheckCircle,
      color: 'green',
      action: captureProblemSolution
    },
    {
      type: 'idea' as InsightType,
      label: 'Idea',
      icon: Lightbulb,
      color: 'yellow',
      action: captureIdea
    },
    {
      type: 'blocker' as InsightType,
      label: 'Blocker',
      icon: AlertTriangle,
      color: 'red',
      action: captureBlocker
    }
  ]
  
  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Claude Session</h3>
              {isActive && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Active</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isActive ? (
                <>
                  <Tooltip content="End session">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEndSession}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    >
                      <Square className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Pause tracking">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={pauseSession}
                      className="h-7 w-7 p-0"
                    >
                      <Pause className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                </>
              ) : (
                <Tooltip content="Start session">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartSession}
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </Tooltip>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {/* Quick Stats */}
          {isActive && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <div className="font-medium">{formatDuration(stats.duration)}</div>
                <div className="text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  duration
                </div>
              </div>
              
              <div className="text-center">
                <div className="font-medium">{stats.activitiesCount}</div>
                <div className="text-muted-foreground flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  activities
                </div>
              </div>
              
              <div className="text-center">
                <div className="font-medium">{stats.insightsCount}</div>
                <div className="text-muted-foreground flex items-center justify-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  insights
                </div>
              </div>
              
              <div className="text-center">
                <div className="font-medium">{stats.blocksInFocus}</div>
                <div className="text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" />
                  blocks
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0 space-y-4">
                {!isActive ? (
                  // Start Session Prompt
                  <div className="text-center py-6">
                    <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <h4 className="font-medium mb-2">Start Claude Session Tracking</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Track your work, capture insights, and generate automatic summaries
                    </p>
                    <Button onClick={handleStartSession} className="gap-2">
                      <Play className="w-4 h-4" />
                      Start Session
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Quick Capture Buttons */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Quick Capture</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {quickCaptureButtons.map((button) => (
                          <Button
                            key={button.type}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setInsightType(button.type)
                              setShowInsightModal(true)
                            }}
                            className={cn(
                              "h-8 gap-1 text-xs",
                              button.color === 'blue' && "hover:bg-blue-50 hover:text-blue-700",
                              button.color === 'green' && "hover:bg-green-50 hover:text-green-700",
                              button.color === 'yellow' && "hover:bg-yellow-50 hover:text-yellow-700",
                              button.color === 'red' && "hover:bg-red-50 hover:text-red-700"
                            )}
                          >
                            <button.icon className="w-3 h-3" />
                            {button.label}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInsightModal(true)}
                        className="w-full mt-2 h-7 gap-1 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        Custom Insight
                      </Button>
                    </div>
                    
                    {/* Recent Insights */}
                    {recentInsights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recent Insights</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {recentInsights.slice(0, 5).map((insight) => (
                            <div
                              key={insight.id}
                              className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs"
                            >
                              {getInsightIcon(insight.type)}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{insight.title}</div>
                                <div className="text-muted-foreground truncate">{insight.content}</div>
                              </div>
                              <Badge variant="outline" size="sm" className="text-xs">
                                {insight.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Activity Summary */}
                    {activitySummary && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Activity Summary</h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-muted/30 rounded">
                            <div className="font-medium">{activitySummary.totalActivities}</div>
                            <div className="text-muted-foreground">Total</div>
                          </div>
                          <div className="text-center p-2 bg-muted/30 rounded">
                            <div className="font-medium">{activitySummary.uniqueBlocksWorked}</div>
                            <div className="text-muted-foreground">Blocks</div>
                          </div>
                          <div className="text-center p-2 bg-muted/30 rounded">
                            <div className="font-medium">{activitySummary.blockActivities}</div>
                            <div className="text-muted-foreground">Block Actions</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      
      {/* Insight Capture Modal */}
      <InsightCaptureModal
        isOpen={showInsightModal}
        onClose={() => setShowInsightModal(false)}
        insightType={insightType}
        onCapture={captureInsight}
        canCapture={canCapture}
      />
    </>
  )
}

// Insight Capture Modal
interface InsightCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  insightType: InsightType
  onCapture: (insight: any) => Promise<CapturedInsight>
  canCapture: boolean
}

function InsightCaptureModal({
  isOpen,
  onClose,
  insightType,
  onCapture,
  canCapture
}: InsightCaptureModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !canCapture) return
    
    setIsSubmitting(true)
    try {
      await onCapture({
        type: insightType,
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        importance
      })
      
      // Reset form
      setTitle('')
      setContent('')
      setTags('')
      setImportance('medium')
      onClose()
    } catch (error) {
      console.error('Failed to capture insight:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const insightTypeLabels = {
    decision: 'Decision Made',
    problem_solution: 'Problem Solved',
    idea: 'New Idea',
    learning: 'Learning',
    blocker: 'Blocker Encountered',
    next_step: 'Next Step',
    reference: 'Reference Material'
  }
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Capture ${insightTypeLabels[insightType]}`}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the insight..."
            className="w-full px-3 py-2 border rounded-md text-sm"
            autoFocus
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Details</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Detailed explanation, context, or notes..."
            className="min-h-24"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Importance</label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>
        
        {!canCapture && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            No active session. Start a session to capture insights.
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || !canCapture || isSubmitting}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Capture Insight'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Compact session indicator for header/sidebar
interface SessionIndicatorProps {
  projectId: string
  className?: string
}

export function SessionIndicator({ projectId, className }: SessionIndicatorProps) {
  const { isActive, stats } = useSessionTracker({ projectId, autoStart: false })
  
  if (!isActive) return null
  
  return (
    <div className={cn("flex items-center gap-2 px-2 py-1 bg-green-50 rounded text-xs", className)}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-green-700 font-medium">
        Session: {Math.floor(stats.duration / 60)}:{(stats.duration % 60).toString().padStart(2, '0')}
      </span>
      <Badge variant="secondary" size="sm">
        {stats.insightsCount} insights
      </Badge>
    </div>
  )
}