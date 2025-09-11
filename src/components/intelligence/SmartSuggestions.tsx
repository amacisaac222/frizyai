import { useState } from 'react'
import { 
  Lightbulb, X, Check, Clock, TrendingUp, AlertTriangle, 
  Zap, Target, ArrowRight, ChevronDown, ChevronUp, 
  RefreshCw, Brain, BarChart3, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, Button, Badge, Tooltip } from '@/components/ui'
import { useIntelligence } from '@/hooks/useIntelligence'
import type { SmartSuggestion } from '@/lib/intelligence'
import { cn } from '@/utils'

interface SmartSuggestionsProps {
  projectId: string
  className?: string
  maxSuggestions?: number
}

export function SmartSuggestions({ 
  projectId, 
  className,
  maxSuggestions = 10 
}: SmartSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  
  const {
    suggestions,
    suggestionsByType,
    prioritySuggestions,
    suggestionStats,
    loading,
    error,
    lastUpdated,
    applySuggestionToBlock,
    dismissSuggestion,
    generateInsights
  } = useIntelligence({ projectId })
  
  const displaySuggestions = selectedType 
    ? suggestionsByType[selectedType] || []
    : suggestions.slice(0, maxSuggestions)
  
  const getSuggestionIcon = (type: SmartSuggestion['type']) => {
    switch (type) {
      case 'stale': return <Clock className="w-4 h-4 text-orange-600" />
      case 'ready_to_move': return <ArrowRight className="w-4 h-4 text-blue-600" />
      case 'similar': return <Target className="w-4 h-4 text-purple-600" />
      case 'stuck': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'energy_mismatch': return <Zap className="w-4 h-4 text-yellow-600" />
      case 'completion_opportunity': return <Check className="w-4 h-4 text-green-600" />
      default: return <Lightbulb className="w-4 h-4 text-gray-600" />
    }
  }
  
  const getSuggestionTypeLabel = (type: string) => {
    const labels = {
      stale: 'Stale Work',
      ready_to_move: 'Ready to Move',
      similar: 'Similar Patterns',
      stuck: 'Stuck Items',
      energy_mismatch: 'Energy Mismatch',
      completion_opportunity: 'Almost Done',
      priority_suggestion: 'Priority Adjustment'
    }
    return labels[type as keyof typeof labels] || type
  }
  
  const getActionLabel = (actionType: SmartSuggestion['actionType']) => {
    const labels = {
      move: 'Move',
      update: 'Update',
      review: 'Review',
      prioritize: 'Prioritize',
      complete: 'Complete'
    }
    return labels[actionType] || actionType
  }
  
  const handleApplySuggestion = async (suggestion: SmartSuggestion) => {
    const success = await applySuggestionToBlock(suggestion.id)
    if (success) {
      // Suggestion will be removed from the list automatically
    }
  }
  
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
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Smart Suggestions</h3>
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
            {suggestionStats.total > 0 && (
              <Badge variant="secondary" size="sm">
                {suggestionStats.pending}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip content="Refresh suggestions">
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
        
        {/* Quick Stats */}
        {suggestionStats.total > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
            <span>{suggestionStats.highConfidence} high confidence</span>
            <span>{suggestionStats.applied} applied</span>
            <span>{suggestionStats.dismissed} dismissed</span>
            {lastUpdated && (
              <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
            )}
          </div>
        )}
      </CardHeader>
      
      <AnimatePresence>
        {(isExpanded || prioritySuggestions.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Type Filter */}
              {isExpanded && Object.keys(suggestionsByType).length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedType === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(null)}
                    className="h-7"
                  >
                    All ({suggestionStats.total})
                  </Button>
                  {Object.entries(suggestionStats.byType).map(([type, count]) => (
                    <Button
                      key={type}
                      variant={selectedType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(type)}
                      className="h-7 gap-1"
                    >
                      {getSuggestionIcon(type as SmartSuggestion['type'])}
                      {getSuggestionTypeLabel(type)} ({count})
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Suggestions List */}
              {displaySuggestions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No suggestions available</p>
                  <p className="text-xs">Your project is well organized!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {displaySuggestions.map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getSuggestionIcon(suggestion.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-medium leading-tight">
                              {suggestion.title}
                            </h4>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge 
                                variant="outline" 
                                size="sm"
                                className={cn(
                                  "text-xs",
                                  suggestion.confidence >= 0.8 ? "bg-green-50 text-green-700 border-green-200" :
                                  suggestion.confidence >= 0.6 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                  "bg-gray-50 text-gray-700 border-gray-200"
                                )}
                              >
                                {Math.round(suggestion.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2">
                            {suggestion.description}
                          </p>
                          
                          {suggestion.reasoning && (
                            <p className="text-xs text-muted-foreground italic mb-2">
                              {suggestion.reasoning}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" size="sm" className="text-xs">
                                {getSuggestionTypeLabel(suggestion.type)}
                              </Badge>
                              {suggestion.relatedBlocks && suggestion.relatedBlocks.length > 0 && (
                                <Tooltip content="Has related blocks">
                                  <Badge variant="outline" size="sm" className="text-xs">
                                    +{suggestion.relatedBlocks.length}
                                  </Badge>
                                </Tooltip>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Tooltip content={`Apply suggestion: ${getActionLabel(suggestion.actionType)}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApplySuggestion(suggestion)}
                                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              </Tooltip>
                              
                              <Tooltip content="Dismiss suggestion">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => dismissSuggestion(suggestion.id)}
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Show more button */}
              {!isExpanded && suggestions.length > prioritySuggestions.length && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    className="h-7"
                  >
                    Show {suggestions.length - prioritySuggestions.length} more suggestions
                  </Button>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Compact version for sidebar or small spaces
interface CompactSmartSuggestionsProps {
  projectId: string
  className?: string
}

export function CompactSmartSuggestions({ 
  projectId, 
  className 
}: CompactSmartSuggestionsProps) {
  const { prioritySuggestions, suggestionStats, needsAttention } = useIntelligence({ projectId })
  
  if (!needsAttention && prioritySuggestions.length === 0) {
    return null
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {prioritySuggestions.slice(0, 3).map((suggestion) => (
        <div
          key={suggestion.id}
          className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs"
        >
          {/* Suggestion icon and content would go here */}
          <Lightbulb className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="truncate">{suggestion.title}</span>
          <Badge variant="secondary" size="sm">
            {Math.round(suggestion.confidence * 100)}%
          </Badge>
        </div>
      ))}
    </div>
  )
}