import { useState, useEffect } from 'react'
import { Brain, Sparkles, Target, CheckCircle, X, Lightbulb } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button, Badge, Tooltip } from '@/components/ui'
import { useIntelligence } from '@/hooks/useIntelligence'
import type { CategorySuggestion } from '@/lib/intelligence'
import type { BlockLane, Priority, EnergyLevel, Complexity } from '@/lib/database.types'
import { cn } from '@/utils'

interface AutoCategorizationProps {
  title: string
  content: string
  onSuggestionsApply?: (suggestions: CategorySuggestion) => void
  onSuggestionsReject?: () => void
  className?: string
  showRecommendations?: boolean
}

export function AutoCategorization({ 
  title, 
  content, 
  onSuggestionsApply,
  onSuggestionsReject,
  className,
  showRecommendations = true
}: AutoCategorizationProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion | null>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  const { categorizeNewBlock, getRecommendationsForBlock } = useIntelligence({ 
    projectId: 'current' // This would be passed from parent
  })
  
  // Generate suggestions when title or content changes
  useEffect(() => {
    if (!title.trim() && !content.trim()) {
      setSuggestions(null)
      setRecommendations(null)
      setIsVisible(false)
      return
    }
    
    const categorization = categorizeNewBlock(title, content)
    setSuggestions(categorization)
    
    if (showRecommendations) {
      const recs = getRecommendationsForBlock(title, content)
      setRecommendations(recs)
    }
    
    // Show suggestions if confidence is high enough
    setIsVisible(categorization.confidence >= 0.4)
  }, [title, content, categorizeNewBlock, getRecommendationsForBlock, showRecommendations])
  
  const handleApply = () => {
    if (suggestions && onSuggestionsApply) {
      onSuggestionsApply(suggestions)
      setIsVisible(false)
    }
  }
  
  const handleReject = () => {
    if (onSuggestionsReject) {
      onSuggestionsReject()
    }
    setIsVisible(false)
  }
  
  const getLaneColor = (lane: BlockLane) => {
    switch (lane) {
      case 'vision': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'goals': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'current': return 'bg-green-100 text-green-800 border-green-200'
      case 'next': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'context': return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getComplexityColor = (complexity: Complexity) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800 border-green-200'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'complex': return 'bg-red-100 text-red-800 border-red-200'
      case 'unknown': return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getEnergyColor = (energy: EnergyLevel) => {
    switch (energy) {
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'peak': return 'bg-red-100 text-red-800 border-red-200'
    }
  }
  
  if (!isVisible || !suggestions) {
    return null
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium">AI Suggestions</h4>
                  <Badge 
                    variant="secondary" 
                    size="sm"
                    className={cn(
                      "text-xs",
                      suggestions.confidence >= 0.8 ? "bg-green-100 text-green-700" :
                      suggestions.confidence >= 0.6 ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    )}
                  >
                    {Math.round(suggestions.confidence * 100)}% confident
                  </Badge>
                </div>
                
                {/* Suggested Categories */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Tooltip content="Suggested swim lane">
                    <Badge className={cn("text-xs", getLaneColor(suggestions.lane))}>
                      Lane: {suggestions.lane}
                    </Badge>
                  </Tooltip>
                  
                  <Tooltip content="Suggested priority">
                    <Badge className={cn("text-xs", getPriorityColor(suggestions.priority))}>
                      Priority: {suggestions.priority}
                    </Badge>
                  </Tooltip>
                  
                  <Tooltip content="Suggested complexity">
                    <Badge className={cn("text-xs", getComplexityColor(suggestions.complexity))}>
                      Complexity: {suggestions.complexity}
                    </Badge>
                  </Tooltip>
                  
                  <Tooltip content="Suggested energy level">
                    <Badge className={cn("text-xs", getEnergyColor(suggestions.energyLevel))}>
                      Energy: {suggestions.energyLevel}
                    </Badge>
                  </Tooltip>
                </div>
                
                {/* Reasoning */}
                {suggestions.reasoning.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Based on:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.reasoning.map((reason, index) => (
                        <Badge key={index} variant="outline" size="sm" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Similar Blocks & Recommendations */}
                {recommendations && recommendations.similarBlocks.length > 0 && (
                  <div className="mb-3 p-2 bg-muted/30 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-purple-600" />
                      <span className="font-medium">Similar to:</span>
                    </div>
                    <div className="space-y-1">
                      {recommendations.similarBlocks.slice(0, 2).map((block: any, index: number) => (
                        <div key={index} className="text-muted-foreground">
                          • "{block.title}" ({block.effort}h, {block.complexity})
                        </div>
                      ))}
                    </div>
                    {recommendations.estimatedEffort && (
                      <div className="mt-1 text-blue-600 font-medium">
                        Estimated effort: ~{recommendations.estimatedEffort}h
                      </div>
                    )}
                  </div>
                )}
                
                {/* Suggested Tags */}
                {recommendations && recommendations.suggestedTags.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs font-medium">Suggested tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {recommendations.suggestedTags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" size="sm" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Tooltip content="Apply AI suggestions">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleApply}
                      className="h-7 gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Apply
                    </Button>
                  </Tooltip>
                  
                  <Tooltip content="Dismiss suggestions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReject}
                      className="h-7 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                      Dismiss
                    </Button>
                  </Tooltip>
                  
                  <div className="text-xs text-muted-foreground ml-auto">
                    AI categorization
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Compact version for inline use
interface CompactAutoCategorizationProps {
  title: string
  content: string
  onSuggestionSelect?: (suggestion: CategorySuggestion) => void
  className?: string
}

export function CompactAutoCategorization({ 
  title, 
  content, 
  onSuggestionSelect,
  className 
}: CompactAutoCategorizationProps) {
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null)
  const { categorizeNewBlock } = useIntelligence({ projectId: 'current' })
  
  useEffect(() => {
    if (title.trim() || content.trim()) {
      const result = categorizeNewBlock(title, content)
      setSuggestion(result.confidence >= 0.5 ? result : null)
    } else {
      setSuggestion(null)
    }
  }, [title, content, categorizeNewBlock])
  
  if (!suggestion) return null
  
  return (
    <div className={cn("flex items-center gap-2 p-2 bg-blue-50 rounded text-xs", className)}>
      <Brain className="w-3 h-3 text-blue-600 flex-shrink-0" />
      <span className="text-blue-700">
        AI suggests: {suggestion.lane} lane, {suggestion.priority} priority
      </span>
      {onSuggestionSelect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSuggestionSelect(suggestion)}
          className="h-5 px-2 text-blue-600 hover:text-blue-700"
        >
          Apply
        </Button>
      )}
    </div>
  )
}

// Smart recommendations panel for existing blocks
interface SmartRecommendationsProps {
  blockId: string
  projectId: string
  className?: string
}

export function SmartRecommendations({ 
  blockId, 
  projectId, 
  className 
}: SmartRecommendationsProps) {
  // This would show recommendations for improving existing blocks
  // Like moving to different lanes, adjusting priority, etc.
  
  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <Lightbulb className="w-3 h-3" />
        <span>Smart recommendations available</span>
      </div>
    </div>
  )
}