import { useState } from 'react'
import { 
  Clock, CheckCircle, Target, Lightbulb, AlertTriangle, 
  ArrowRight, TrendingUp, Brain, Download, Share,
  ChevronDown, ChevronUp, Copy, Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, Button, Badge, Tooltip } from '@/components/ui'
import type { SessionSummary as ISessionSummary, CapturedInsight } from '@/lib/session-tracker'
import { cn } from '@/utils'

interface SessionSummaryProps {
  summary: ISessionSummary
  className?: string
  onExport?: (format: 'json' | 'markdown' | 'txt') => void
  onShare?: () => void
}

export function SessionSummary({ 
  summary, 
  className,
  onExport,
  onShare 
}: SessionSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'insights' | 'details'>('overview')
  
  const getProductivityColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100'
    if (score >= 6) return 'text-yellow-600 bg-yellow-100'
    if (score >= 4) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'decision': return <Target className="w-4 h-4 text-blue-600" />
      case 'problem_solution': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'idea': return <Lightbulb className="w-4 h-4 text-yellow-600" />
      case 'next_step': return <ArrowRight className="w-4 h-4 text-purple-600" />
      case 'blocker': return <AlertTriangle className="w-4 h-4 text-red-600" />
      default: return <Brain className="w-4 h-4 text-gray-600" />
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
  
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }
  
  const generateMarkdownSummary = () => {
    const sections = []
    
    sections.push(`# Claude Session Summary`)
    sections.push(`**Duration:** ${formatDuration(summary.duration)}`)
    sections.push(`**Productivity Score:** ${summary.productivityScore}/10`)
    sections.push(`**Blocks Worked:** ${summary.blocksWorked}`)
    sections.push('')
    
    if (summary.keyAccomplishments.length > 0) {
      sections.push(`## Key Accomplishments`)
      summary.keyAccomplishments.forEach(acc => sections.push(`- ${acc}`))
      sections.push('')
    }
    
    if (summary.decisions.length > 0) {
      sections.push(`## Decisions Made`)
      summary.decisions.forEach(decision => {
        sections.push(`### ${decision.title}`)
        sections.push(decision.content)
        sections.push('')
      })
    }
    
    if (summary.problems.length > 0) {
      sections.push(`## Problems Solved`)
      summary.problems.forEach(problem => {
        sections.push(`### ${problem.title}`)
        sections.push(problem.content)
        sections.push('')
      })
    }
    
    if (summary.ideas.length > 0) {
      sections.push(`## Ideas Generated`)
      summary.ideas.forEach(idea => {
        sections.push(`### ${idea.title}`)
        sections.push(idea.content)
        sections.push('')
      })
    }
    
    if (summary.nextSteps.length > 0) {
      sections.push(`## Next Steps`)
      summary.nextSteps.forEach(step => sections.push(`- ${step}`))
      sections.push('')
    }
    
    if (summary.blockers.length > 0) {
      sections.push(`## Blockers`)
      summary.blockers.forEach(blocker => sections.push(`- ${blocker}`))
      sections.push('')
    }
    
    return sections.join('\n')
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Session Summary</h3>
            <Badge 
              className={cn("text-xs", getProductivityColor(summary.productivityScore))}
            >
              {summary.productivityScore}/10
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip content="Copy summary">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyToClipboard(generateMarkdownSummary())}
                className="h-7 w-7 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </Tooltip>
            
            {onExport && (
              <Tooltip content="Export summary">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExport('markdown')}
                  className="h-7 w-7 p-0"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </Tooltip>
            )}
            
            {onShare && (
              <Tooltip content="Share summary">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShare}
                  className="h-7 w-7 p-0"
                >
                  <Share className="w-3 h-3" />
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
        
        {/* Quick Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="text-center">
            <div className="font-medium text-lg">{formatDuration(summary.duration)}</div>
            <div className="text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              duration
            </div>
          </div>
          
          <div className="text-center">
            <div className="font-medium text-lg">{summary.blocksWorked}</div>
            <div className="text-muted-foreground flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />
              blocks
            </div>
          </div>
          
          <div className="text-center">
            <div className="font-medium text-lg">{summary.insights.length}</div>
            <div className="text-muted-foreground flex items-center justify-center gap-1">
              <Lightbulb className="w-3 h-3" />
              insights
            </div>
          </div>
          
          <div className="text-center">
            <div className="font-medium text-lg">{summary.keyAccomplishments.length}</div>
            <div className="text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" />
              achievements
            </div>
          </div>
        </div>
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
              {/* Tab Navigation */}
              <div className="flex gap-2">
                <Button
                  variant={selectedTab === 'overview' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab('overview')}
                  className="h-7"
                >
                  Overview
                </Button>
                <Button
                  variant={selectedTab === 'insights' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab('insights')}
                  className="h-7"
                >
                  Insights ({summary.insights.length})
                </Button>
                <Button
                  variant={selectedTab === 'details' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab('details')}
                  className="h-7"
                >
                  Details
                </Button>
              </div>
              
              {/* Tab Content */}
              <div className="min-h-48">
                {selectedTab === 'overview' && (
                  <OverviewTab summary={summary} />
                )}
                
                {selectedTab === 'insights' && (
                  <InsightsTab summary={summary} />
                )}
                
                {selectedTab === 'details' && (
                  <DetailsTab summary={summary} />
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Overview Tab
function OverviewTab({ summary }: { summary: ISessionSummary }) {
  return (
    <div className="space-y-4">
      {/* Key Accomplishments */}
      {summary.keyAccomplishments.length > 0 && (
        <div className="bg-green-50/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Key Accomplishments</span>
          </div>
          <ul className="space-y-1 text-sm">
            {summary.keyAccomplishments.map((accomplishment, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>{accomplishment}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="text-sm font-medium mb-1">Work Done</div>
          <div className="space-y-1 text-xs">
            <div>Created: {summary.blocksCreated} blocks</div>
            <div>Modified: {summary.blocksModified} blocks</div>
            <div>Completed: {summary.blocksCompleted} blocks</div>
          </div>
        </div>
        
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="text-sm font-medium mb-1">Insights</div>
          <div className="space-y-1 text-xs">
            <div>Decisions: {summary.decisions.length}</div>
            <div>Solutions: {summary.problems.length}</div>
            <div>Ideas: {summary.ideas.length}</div>
          </div>
        </div>
      </div>
      
      {/* Next Steps */}
      {summary.nextSteps.length > 0 && (
        <div className="bg-blue-50/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Next Steps</span>
          </div>
          <ul className="space-y-1 text-sm">
            {summary.nextSteps.slice(0, 3).map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">→</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Blockers */}
      {summary.blockers.length > 0 && (
        <div className="bg-red-50/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium">Blockers Encountered</span>
          </div>
          <ul className="space-y-1 text-sm">
            {summary.blockers.map((blocker, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-600 mt-1">⚠</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Insights Tab
function InsightsTab({ summary }: { summary: ISessionSummary }) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'decision': return <Target className="w-4 h-4 text-blue-600" />
      case 'problem_solution': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'idea': return <Lightbulb className="w-4 h-4 text-yellow-600" />
      case 'next_step': return <ArrowRight className="w-4 h-4 text-purple-600" />
      case 'blocker': return <AlertTriangle className="w-4 h-4 text-red-600" />
      default: return <Brain className="w-4 h-4 text-gray-600" />
    }
  }
  
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  if (summary.insights.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No insights captured in this session</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {summary.insights.map((insight) => (
        <div key={insight.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getInsightIcon(insight.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium leading-tight">{insight.title}</h4>
                <Badge 
                  variant="outline" 
                  size="sm"
                  className={cn("text-xs", getImportanceColor(insight.importance))}
                >
                  {insight.importance}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">{insight.content}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" size="sm" className="text-xs capitalize">
                    {insight.type.replace('_', ' ')}
                  </Badge>
                  {insight.tags.length > 0 && (
                    <>
                      {insight.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" size="sm" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {insight.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{insight.tags.length - 2}
                        </span>
                      )}
                    </>
                  )}
                </div>
                
                <span className="text-xs text-muted-foreground">
                  {new Date(insight.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              {insight.relatedBlockIds.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Related to {insight.relatedBlockIds.length} block{insight.relatedBlockIds.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Details Tab
function DetailsTab({ summary }: { summary: ISessionSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session Metrics */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Session Metrics</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{Math.floor(summary.duration / 60)}h {summary.duration % 60}m</span>
            </div>
            <div className="flex justify-between">
              <span>Productivity Score:</span>
              <span>{summary.productivityScore}/10</span>
            </div>
            <div className="flex justify-between">
              <span>Blocks Worked:</span>
              <span>{summary.blocksWorked}</span>
            </div>
            <div className="flex justify-between">
              <span>Focus Areas:</span>
              <span>{summary.focusAreas.length}</span>
            </div>
          </div>
        </div>
        
        {/* Activity Breakdown */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Activity Breakdown</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Blocks Created:</span>
              <span>{summary.blocksCreated}</span>
            </div>
            <div className="flex justify-between">
              <span>Blocks Modified:</span>
              <span>{summary.blocksModified}</span>
            </div>
            <div className="flex justify-between">
              <span>Blocks Completed:</span>
              <span>{summary.blocksCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Insights:</span>
              <span>{summary.insights.length}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Focus Areas */}
      {summary.focusAreas.length > 0 && (
        <div className="bg-muted/30 p-3 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Focus Areas</h4>
          <div className="flex flex-wrap gap-1">
            {summary.focusAreas.map((area, index) => (
              <Badge key={index} variant="secondary" size="sm" className="text-xs">
                Block {area}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Session ID for debugging */}
      <div className="text-xs text-muted-foreground">
        Session ID: {summary.sessionId}
      </div>
    </div>
  )
}