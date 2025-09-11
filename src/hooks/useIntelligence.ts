import { useState, useEffect, useCallback, useMemo } from 'react'
import { useBlocks } from './useDatabase'
import { 
  categorizeBlock, 
  generateSmartSuggestions, 
  calculateProgressInsights,
  applySuggestion,
  type CategorySuggestion, 
  type SmartSuggestion, 
  type ProgressInsights 
} from '@/lib/intelligence'
import type { Block, EnergyLevel, Complexity } from '@/lib/database.types'

interface UseIntelligenceOptions {
  projectId: string
  autoRefresh?: boolean
  refreshInterval?: number
  userPreferences?: {
    preferredEnergyLevel?: EnergyLevel
    workingHours?: string
    preferredComplexity?: Complexity
  }
}

interface IntelligenceState {
  suggestions: SmartSuggestion[]
  insights: ProgressInsights | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

export function useIntelligence({ 
  projectId, 
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  userPreferences
}: UseIntelligenceOptions) {
  const [state, setState] = useState<IntelligenceState>({
    suggestions: [],
    insights: null,
    loading: false,
    error: null,
    lastUpdated: null
  })
  
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  
  const { blocks, loading: blocksLoading, updateBlock } = useBlocks(projectId)
  
  // Generate insights and suggestions
  const generateInsights = useCallback(async () => {
    if (!blocks.length || blocksLoading) return
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Generate smart suggestions
      const suggestions = generateSmartSuggestions(blocks, userPreferences)
        .filter(suggestion => !dismissedSuggestions.has(suggestion.id))
      
      // Calculate progress insights
      const insights = calculateProgressInsights(blocks)
      
      setState(prev => ({
        ...prev,
        suggestions,
        insights,
        loading: false,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate insights'
      }))
    }
  }, [blocks, blocksLoading, userPreferences, dismissedSuggestions])
  
  // Auto-refresh insights
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(generateInsights, refreshInterval)
    return () => clearInterval(interval)
  }, [generateInsights, autoRefresh, refreshInterval])
  
  // Initial generation and when dependencies change
  useEffect(() => {
    generateInsights()
  }, [generateInsights])
  
  // Auto-categorize block content
  const categorizeNewBlock = useCallback((title: string, content: string): CategorySuggestion => {
    return categorizeBlock(title, content)
  }, [])
  
  // Apply a suggestion
  const applySuggestionToBlock = useCallback(async (suggestionId: string) => {
    const suggestion = state.suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return false
    
    try {
      const block = blocks.find(b => b.id === suggestion.blockId)
      if (!block) return false
      
      const updates = applySuggestion(block, suggestion)
      await updateBlock(block.id, updates)
      
      setAppliedSuggestions(prev => new Set([...prev, suggestionId]))
      return true
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
      return false
    }
  }, [state.suggestions, blocks, updateBlock])
  
  // Dismiss a suggestion
  const dismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
    
    // Store in localStorage for persistence
    const stored = localStorage.getItem(`frizy-dismissed-suggestions-${projectId}`)
    const existing = stored ? JSON.parse(stored) : []
    localStorage.setItem(
      `frizy-dismissed-suggestions-${projectId}`, 
      JSON.stringify([...existing, suggestionId])
    )
  }, [projectId])
  
  // Load dismissed suggestions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`frizy-dismissed-suggestions-${projectId}`)
      if (stored) {
        const dismissed = JSON.parse(stored)
        setDismissedSuggestions(new Set(dismissed))
      }
    } catch (error) {
      console.warn('Failed to load dismissed suggestions:', error)
    }
  }, [projectId])
  
  // Group suggestions by type
  const suggestionsByType = useMemo(() => {
    return state.suggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = []
      }
      acc[suggestion.type].push(suggestion)
      return acc
    }, {} as Record<string, SmartSuggestion[]>)
  }, [state.suggestions])
  
  // Get high priority suggestions
  const prioritySuggestions = useMemo(() => {
    return state.suggestions.filter(s => s.confidence >= 0.7).slice(0, 5)
  }, [state.suggestions])
  
  // Calculate suggestion statistics
  const suggestionStats = useMemo(() => {
    const total = state.suggestions.length
    const byType = Object.keys(suggestionsByType).reduce((acc, type) => {
      acc[type] = suggestionsByType[type].length
      return acc
    }, {} as Record<string, number>)
    
    const highConfidence = state.suggestions.filter(s => s.confidence >= 0.7).length
    const applied = appliedSuggestions.size
    const dismissed = dismissedSuggestions.size
    
    return {
      total,
      byType,
      highConfidence,
      applied,
      dismissed,
      pending: total - applied - dismissed
    }
  }, [state.suggestions, suggestionsByType, appliedSuggestions, dismissedSuggestions])
  
  // Get blocks that need attention
  const blocksNeedingAttention = useMemo(() => {
    if (!state.insights) return []
    
    return blocks.filter(block => {
      // Stuck blocks
      if (state.insights!.stuckBlocks.blockIds.includes(block.id)) return true
      
      // Stale in-progress blocks
      if (block.status === 'in_progress' && block.last_worked) {
        const daysSinceWorked = (Date.now() - new Date(block.last_worked).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceWorked > 7) return true
      }
      
      // High progress blocks that could be completed
      if (block.progress >= 80 && block.status === 'in_progress') return true
      
      return false
    })
  }, [blocks, state.insights])
  
  // Smart recommendations for new blocks
  const getRecommendationsForBlock = useCallback((title: string, content: string) => {
    const categorization = categorizeNewBlock(title, content)
    
    // Find similar completed blocks
    const completedBlocks = blocks.filter(b => b.status === 'completed')
    const similar = completedBlocks.filter(completed => {
      const titleWords = title.toLowerCase().split(/\s+/)
      const completedWords = completed.title.toLowerCase().split(/\s+/)
      const commonWords = titleWords.filter(word => completedWords.includes(word))
      const tagOverlap = completed.tags.filter(tag => 
        title.toLowerCase().includes(tag.toLowerCase()) || 
        content.toLowerCase().includes(tag.toLowerCase())
      )
      
      return commonWords.length >= 2 || tagOverlap.length >= 1
    })
    
    return {
      categorization,
      similarBlocks: similar.slice(0, 3),
      suggestedTags: similar.flatMap(b => b.tags).filter((tag, index, arr) => arr.indexOf(tag) === index).slice(0, 5),
      estimatedEffort: similar.length > 0 ? Math.round(similar.reduce((sum, b) => sum + b.effort, 0) / similar.length) : undefined
    }
  }, [categorizeNewBlock, blocks])
  
  return {
    // State
    suggestions: state.suggestions,
    insights: state.insights,
    loading: state.loading || blocksLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Grouped data
    suggestionsByType,
    prioritySuggestions,
    suggestionStats,
    blocksNeedingAttention,
    
    // Actions
    generateInsights,
    categorizeNewBlock,
    getRecommendationsForBlock,
    applySuggestionToBlock,
    dismissSuggestion,
    
    // Utilities
    getSuggestion: (id: string) => state.suggestions.find(s => s.id === id),
    hasSuggestions: state.suggestions.length > 0,
    isLoading: state.loading || blocksLoading,
    needsAttention: blocksNeedingAttention.length > 0
  }
}