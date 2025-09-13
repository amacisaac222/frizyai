import { useState, useEffect, useCallback } from 'react'
import { 
  Brain, 
  Copy, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Play,
  Pause,
  RefreshCw,
  Lightbulb,
  Target,
  Activity
} from 'lucide-react'
import { Button, Card, CardContent, Badge } from '@/components/ui'
import { Container } from '@/types/container'
import { cn } from '@/utils'

interface ContextHeaderProps {
  projectId?: string
  containers?: Container[]
  onContextCopy?: (context: string) => void
  onWorkResume?: (containerId: string) => void
  className?: string
}

interface ContextSummary {
  lastCompleted: {
    container: Container
    completedAt: Date
    keyInsights: string[]
    impact: string
  } | null
  currentlyWorking: {
    container: Container
    progress: number
    nextSteps: string[]
    blockers: string[]
    sessionTime: number // minutes
  } | null
  contextRelevance: number // 0-1 score
  recommendations: string[]
}

export function ContextHeader({ 
  projectId, 
  containers = [], 
  onContextCopy, 
  onWorkResume,
  className 
}: ContextHeaderProps) {
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null)
  const [isGeneratingContext, setIsGeneratingContext] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)

  // Generate context summary from containers
  const generateContextSummary = useCallback(() => {
    if (containers.length === 0) return null

    // Find last completed work
    const completedContainers = containers
      .filter(c => c.status === 'completed')
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
        return dateB.getTime() - dateA.getTime()
      })
    
    const lastCompleted = completedContainers[0]

    // Find currently active work
    const activeContainers = containers
      .filter(c => c.status === 'in-progress' || c.status === 'active')
      .sort((a, b) => b.importance - a.importance)
    
    const currentlyWorking = activeContainers[0]

    // Calculate context relevance (recency + importance + connections)
    const relevanceScore = containers.reduce((acc, container) => {
      const updatedDate = container.updatedAt instanceof Date ? container.updatedAt : new Date(container.updatedAt)
      const recencyScore = 1 - (Date.now() - updatedDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      const connectionScore = container.connections.length / 10
      return acc + (container.importance * 0.5 + Math.max(0, recencyScore) * 0.3 + connectionScore * 0.2)
    }, 0) / containers.length

    const summary: ContextSummary = {
      lastCompleted: lastCompleted ? {
        container: lastCompleted,
        completedAt: lastCompleted.updatedAt instanceof Date ? lastCompleted.updatedAt : new Date(lastCompleted.updatedAt),
        keyInsights: [
          'Successfully integrated Claude API with real-time response handling',
          'Established TypeScript patterns for type-safe AI interactions',
          'Validated context injection approach through spike testing'
        ],
        impact: lastCompleted.metadata.businessValue || 'Significant progress toward project goals'
      } : null,
      currentlyWorking: currentlyWorking ? {
        container: currentlyWorking,
        progress: currentlyWorking.progress,
        nextSteps: [
          'Implement context compression algorithm for large datasets',
          'Add error handling for Claude API rate limits',
          'Create user-friendly context injection UI'
        ],
        blockers: currentlyWorking.metadata.priority === 'blocked' ? ['API rate limits', 'Dependency on external service'] : [],
        sessionTime: sessionTime
      } : null,
      contextRelevance: Math.min(1, relevanceScore),
      recommendations: [
        'Focus on high-impact work items to maintain momentum',
        'Consider breaking down complex tasks for better progress tracking',
        'Review context connections to identify optimization opportunities'
      ]
    }

    return summary
  }, [containers, sessionTime])

  // Update context summary when containers change
  useEffect(() => {
    const summary = generateContextSummary()
    setContextSummary(summary)
  }, [generateContextSummary])

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1)
      }, 60000) // Update every minute
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sessionActive])

  const formatContextForClaude = useCallback(() => {
    if (!contextSummary) return ''

    const { lastCompleted, currentlyWorking } = contextSummary

    let context = `# 🎯 Frizy Project Context\n\n`
    
    // Last Completed Work
    if (lastCompleted) {
      context += `## ✅ Last Completed Work\n\n`
      context += `**${lastCompleted.container.title}**\n`
      context += `${lastCompleted.container.description}\n\n`
      context += `**Key Insights:**\n`
      lastCompleted.keyInsights.forEach(insight => {
        context += `- ${insight}\n`
      })
      context += `\n**Impact:** ${lastCompleted.impact}\n\n`
    }

    // Currently Working
    if (currentlyWorking) {
      context += `## 🚧 Currently Working On\n\n`
      context += `**${currentlyWorking.container.title}**\n`
      context += `${currentlyWorking.container.description}\n\n`
      context += `**Progress:** ${currentlyWorking.progress}% complete\n\n`
      
      if (currentlyWorking.nextSteps.length > 0) {
        context += `**Next Steps:**\n`
        currentlyWorking.nextSteps.forEach(step => {
          context += `- ${step}\n`
        })
        context += `\n`
      }

      if (currentlyWorking.blockers.length > 0) {
        context += `**Current Blockers:**\n`
        currentlyWorking.blockers.forEach(blocker => {
          context += `- ${blocker}\n`
        })
        context += `\n`
      }

      if (currentlyWorking.sessionTime > 0) {
        context += `**Session Time:** ${Math.floor(currentlyWorking.sessionTime / 60)}h ${currentlyWorking.sessionTime % 60}m\n\n`
      }
    }

    // Context Metadata
    context += `## 📊 Context Metadata\n\n`
    context += `**Project ID:** ${projectId || 'default'}\n`
    context += `**Context Relevance:** ${Math.round(contextSummary.contextRelevance * 100)}%\n`
    context += `**Total Containers:** ${containers.length}\n`
    context += `**Generated:** ${new Date().toLocaleString()}\n\n`

    // AI Guidance
    context += `## 🤖 For Claude:\n`
    context += `This context represents the current state of work on the Frizy.ai project. `
    context += `Focus on helping with the "Currently Working" section while being aware of recent completions. `
    context += `The context relevance score indicates how fresh and connected this information is.\n\n`

    return context
  }, [contextSummary, projectId, containers.length])

  const handleCopyContext = useCallback(async () => {
    setIsGeneratingContext(true)
    
    try {
      const contextText = formatContextForClaude()
      await navigator.clipboard.writeText(contextText)
      
      setCopySuccess(true)
      onContextCopy?.(contextText)
      
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy context:', error)
    } finally {
      setIsGeneratingContext(false)
    }
  }, [formatContextForClaude, onContextCopy])

  const handleResumeWork = useCallback(() => {
    if (contextSummary?.currentlyWorking) {
      setSessionActive(true)
      onWorkResume?.(contextSummary.currentlyWorking.container.id)
    }
  }, [contextSummary, onWorkResume])

  const formatTime = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }, [])

  if (!contextSummary) {
    return (
      <div className={cn("bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Brain className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No context data available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("border-2 border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50 shadow-lg", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Context Header
              </h2>
              <p className="text-sm text-gray-600">Never lose your place again</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant="secondary" 
              className={cn(
                "px-3 py-1",
                contextSummary.contextRelevance > 0.7 ? "bg-green-100 text-green-700" :
                contextSummary.contextRelevance > 0.4 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}
            >
              <Activity className="w-3 h-3 mr-1" />
              {Math.round(contextSummary.contextRelevance * 100)}% relevant
            </Badge>
            <Button
              onClick={handleCopyContext}
              disabled={isGeneratingContext}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
            >
              {isGeneratingContext ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : copySuccess ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copySuccess ? 'Copied!' : 'Copy Context'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Last Completed Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Last Completed</h3>
              {contextSummary.lastCompleted && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  {new Date(contextSummary.lastCompleted.completedAt).toLocaleDateString()}
                </Badge>
              )}
            </div>
            
            {contextSummary.lastCompleted ? (
              <div className="bg-white/60 rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-gray-900 mb-2">
                  {contextSummary.lastCompleted.container.title}
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Key Insights:</p>
                    <ul className="space-y-1">
                      {contextSummary.lastCompleted.keyInsights.slice(0, 2).map((insight, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-1">
                          <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-green-100">
                    <p className="text-xs text-gray-500">
                      <strong>Impact:</strong> {contextSummary.lastCompleted.impact.substring(0, 80)}...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-lg p-4 border border-gray-200 text-center">
                <p className="text-sm text-gray-500">No recently completed work</p>
              </div>
            )}
          </div>

          {/* Currently Working Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Currently Working</h3>
                {sessionActive && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs animate-pulse">
                    <Play className="w-3 h-3 mr-1" />
                    Active {formatTime(sessionTime)}
                  </Badge>
                )}
              </div>
              
              {contextSummary.currentlyWorking && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResumeWork}
                  className={cn(
                    "text-xs",
                    sessionActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                >
                  {sessionActive ? (
                    <>
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Resume
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {contextSummary.currentlyWorking ? (
              <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    {contextSummary.currentlyWorking.container.title}
                  </h4>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    {contextSummary.currentlyWorking.progress}%
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${contextSummary.currentlyWorking.progress}%` }}
                    />
                  </div>
                  
                  {/* Next Steps */}
                  {contextSummary.currentlyWorking.nextSteps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Next Steps:</p>
                      <ul className="space-y-1">
                        {contextSummary.currentlyWorking.nextSteps.slice(0, 2).map((step, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-1">
                            <Target className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Blockers */}
                  {contextSummary.currentlyWorking.blockers.length > 0 && (
                    <div className="pt-2 border-t border-yellow-100 bg-yellow-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                      <p className="text-sm font-medium text-yellow-700 mb-1">⚠️ Blockers:</p>
                      <ul className="space-y-1">
                        {contextSummary.currentlyWorking.blockers.map((blocker, idx) => (
                          <li key={idx} className="text-sm text-yellow-600">• {blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/60 rounded-lg p-4 border border-gray-200 text-center">
                <p className="text-sm text-gray-500 mb-2">No active work</p>
                <Button size="sm" variant="outline" className="text-xs">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Start Working
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Smart Recommendations */}
        {contextSummary.recommendations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-medium text-gray-900">Smart Recommendations</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {contextSummary.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-purple-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}