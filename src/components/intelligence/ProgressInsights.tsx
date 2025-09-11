import { useState } from 'react'
import { 
  TrendingUp, TrendingDown, BarChart3, Clock, Zap, 
  AlertTriangle, CheckCircle, Target, Battery, 
  ChevronDown, ChevronUp, RefreshCw, Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, Button, Badge, Tooltip } from '@/components/ui'
import { useIntelligence } from '@/hooks/useIntelligence'
import type { ProgressInsights as IProgressInsights } from '@/lib/intelligence'
import { cn } from '@/utils'

interface ProgressInsightsProps {
  projectId: string
  className?: string
  timeRange?: 'week' | 'month' | 'quarter'
}

export function ProgressInsights({ 
  projectId, 
  className,
  timeRange = 'month'
}: ProgressInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'velocity' | 'energy' | 'patterns'>('velocity')
  
  const {
    insights,
    blocksNeedingAttention,
    loading,
    error,
    lastUpdated,
    generateInsights
  } = useIntelligence({ projectId })
  
  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!insights && !loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground text-sm">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No insights available yet</p>
            <p className="text-xs">Complete some blocks to see progress insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'decreasing': return <TrendingDown className="w-3 h-3 text-red-600" />
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }
  
  const getEnergyIcon = (energy: string) => {
    switch (energy) {
      case 'low': return <Battery className="w-3 h-3 text-blue-600" />
      case 'medium': return <Zap className="w-3 h-3 text-yellow-600" />
      case 'high': return <Zap className="w-3 h-3 text-orange-600" />
      case 'peak': return <Zap className="w-3 h-3 text-red-600" />
      default: return <Zap className="w-3 h-3 text-gray-600" />
    }
  }
  
  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals)
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Progress Insights</h3>
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip content="Refresh insights">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateInsights}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              </Button>
            </Tooltip>
            
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
        
        {/* Quick Summary */}
        {insights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="text-center">
              <div className="font-medium text-lg">
                {formatNumber(insights.velocity.blocksPerWeek)}
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <Target className="w-3 h-3" />
                blocks/week
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-lg">
                {Math.round(insights.velocity.completionRate * 100)}%
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                completion
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-lg">
                {insights.stuckBlocks.blockIds.length}
              </div>
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                stuck blocks
              </div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-lg flex items-center justify-center gap-1">
                {getEnergyIcon(insights.energyPatterns.preferredEnergyLevel)}
                {insights.energyPatterns.preferredEnergyLevel}
              </div>
              <div className="text-muted-foreground">
                energy preference
              </div>
            </div>
          </div>
        )}
        
        {lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && insights && (
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
                  variant={selectedTab === 'velocity' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab('velocity')}
                  className="h-7 gap-1"
                >
                  <TrendingUp className="w-3 h-3" />
                  Velocity
                </Button>
                <Button
                  variant={selectedTab === 'energy' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab('energy')}
                  className="h-7 gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Energy
                </Button>
                <Button
                  variant={selectedTab === 'patterns' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab('patterns')}
                  className="h-7 gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  Patterns
                </Button>
              </div>
              
              {/* Tab Content */}
              <div className="min-h-48">
                {selectedTab === 'velocity' && (
                  <VelocityTab insights={insights} />
                )}
                
                {selectedTab === 'energy' && (
                  <EnergyTab insights={insights} />
                )}
                
                {selectedTab === 'patterns' && (
                  <PatternsTab insights={insights} blocksNeedingAttention={blocksNeedingAttention} />
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Velocity Tab Component
function VelocityTab({ insights }: { insights: IProgressInsights }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Weekly Velocity</span>
            {/* getTrendIcon would be called here if it was in scope */}
          </div>
          <div className="text-2xl font-bold">{insights.velocity.blocksPerWeek.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">blocks completed per week</div>
        </div>
        
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Rate</span>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold">{Math.round(insights.velocity.completionRate * 100)}%</div>
          <div className="text-xs text-muted-foreground">of started blocks completed</div>
        </div>
      </div>
      
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">Average Time to Complete</span>
        </div>
        <div className="text-xl font-bold">{insights.velocity.averageTimeToComplete.toFixed(1)} days</div>
        <div className="text-xs text-muted-foreground">from start to completion</div>
      </div>
    </div>
  )
}

// Energy Tab Component
function EnergyTab({ insights }: { insights: IProgressInsights }) {
  const totalBlocks = Object.values(insights.energyPatterns.energyDistribution).reduce((sum, count) => sum + count, 0)
  
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Energy Level Distribution</span>
        </div>
        
        <div className="space-y-2">
          {Object.entries(insights.energyPatterns.energyDistribution).map(([energy, count]) => {
            const percentage = totalBlocks > 0 ? (count / totalBlocks) * 100 : 0
            return (
              <div key={energy} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded",
                    energy === 'low' && "bg-blue-500",
                    energy === 'medium' && "bg-yellow-500", 
                    energy === 'high' && "bg-orange-500",
                    energy === 'peak' && "bg-red-500"
                  )} />
                  <span className="text-sm capitalize">{energy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full",
                        energy === 'low' && "bg-blue-500",
                        energy === 'medium' && "bg-yellow-500", 
                        energy === 'high' && "bg-orange-500",
                        energy === 'peak' && "bg-red-500"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Battery className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium">Most Productive Energy Level</span>
        </div>
        <div className="text-xl font-bold capitalize">{insights.energyPatterns.preferredEnergyLevel}</div>
        <div className="text-xs text-muted-foreground">based on completion patterns</div>
      </div>
    </div>
  )
}

// Patterns Tab Component
function PatternsTab({ 
  insights, 
  blocksNeedingAttention 
}: { 
  insights: IProgressInsights
  blocksNeedingAttention: any[]
}) {
  return (
    <div className="space-y-4">
      {/* Stuck Blocks */}
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium">Stuck Blocks Analysis</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-lg font-bold">{insights.stuckBlocks.blockIds.length}</div>
            <div className="text-xs text-muted-foreground">currently stuck</div>
          </div>
          <div>
            <div className="text-lg font-bold">{insights.stuckBlocks.averageDaysStuck.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">avg days stuck</div>
          </div>
        </div>
        
        {insights.stuckBlocks.commonPatterns.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Common patterns:</div>
            <div className="flex flex-wrap gap-1">
              {insights.stuckBlocks.commonPatterns.map((pattern, index) => (
                <Badge key={index} variant="outline" size="sm" className="text-xs">
                  {pattern}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Priority Distribution */}
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">Priority Distribution</span>
        </div>
        
        <div className="space-y-2">
          {Object.entries(insights.completionPatterns.priorityDistribution).map(([priority, count]) => {
            const total = Object.values(insights.completionPatterns.priorityDistribution).reduce((sum, c) => sum + c, 0)
            const percentage = total > 0 ? (count / total) * 100 : 0
            
            return (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "text-xs",
                      priority === 'urgent' && "bg-red-50 text-red-700 border-red-200",
                      priority === 'high' && "bg-orange-50 text-orange-700 border-orange-200",
                      priority === 'medium' && "bg-blue-50 text-blue-700 border-blue-200",
                      priority === 'low' && "bg-gray-50 text-gray-700 border-gray-200"
                    )}
                  >
                    {priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{count}</span>
                  <span className="text-xs text-muted-foreground">
                    ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Completion Success Rates */}
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium">Complexity Success Rate</span>
        </div>
        
        <div className="space-y-2">
          {Object.entries(insights.completionPatterns.complexitySuccessRate).map(([complexity, count]) => (
            <div key={complexity} className="flex items-center justify-between">
              <span className="text-sm capitalize">{complexity}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-muted rounded-full h-2">
                  <div 
                    className="h-2 bg-green-500 rounded-full"
                    style={{ width: `${Math.min(100, (count / 10) * 100)}%` }} // Simplified calculation
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}