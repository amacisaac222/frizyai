import { useState, useEffect, useCallback, useMemo } from 'react'
import { useBlocks } from './useDatabase'
import { 
  generateProjectContext, 
  generateContextString,
  exportContext,
  type ProjectContext, 
  type ContextScoringConfig, 
  type ContextDecision,
  DEFAULT_CONTEXT_CONFIG 
} from '@/lib/context-manager'
import type { Block, Project } from '@/lib/database.types'

interface UseContextManagerOptions {
  projectId: string
  project?: Project
  autoRefresh?: boolean
  refreshInterval?: number
}

interface ContextManagerState {
  context: ProjectContext | null
  loading: boolean
  error: string | null
  lastGenerated: string | null
}

export function useContextManager({ 
  projectId, 
  project,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: UseContextManagerOptions) {
  const [state, setState] = useState<ContextManagerState>({
    context: null,
    loading: false,
    error: null,
    lastGenerated: null
  })
  
  const [config, setConfig] = useState<ContextScoringConfig>(DEFAULT_CONTEXT_CONFIG)
  const [userImportantBlocks, setUserImportantBlocks] = useState<Set<string>>(new Set())
  const [manualOverrides, setManualOverrides] = useState<Record<string, 'include' | 'exclude'>>({})
  const [decisions, setDecisions] = useState<ContextDecision[]>([])
  
  const { blocks, loading: blocksLoading, error: blocksError } = useBlocks(projectId)
  
  // Generate context
  const generateContext = useCallback(async () => {
    if (!blocks.length || blocksLoading) return
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const context = generateProjectContext(
        blocks,
        config,
        userImportantBlocks,
        manualOverrides
      )
      
      setState(prev => ({
        ...prev,
        context,
        loading: false,
        lastGenerated: new Date().toISOString()
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate context'
      }))
    }
  }, [blocks, blocksLoading, config, userImportantBlocks, manualOverrides])
  
  // Auto-refresh context
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(generateContext, refreshInterval)
    return () => clearInterval(interval)
  }, [generateContext, autoRefresh, refreshInterval])
  
  // Initial generation and when dependencies change
  useEffect(() => {
    generateContext()
  }, [generateContext])
  
  // Mark block as important
  const markBlockImportant = useCallback((blockId: string, important: boolean = true) => {
    setUserImportantBlocks(prev => {
      const newSet = new Set(prev)
      if (important) {
        newSet.add(blockId)
      } else {
        newSet.delete(blockId)
      }
      return newSet
    })
  }, [])
  
  // Set manual override for block inclusion
  const setBlockOverride = useCallback((blockId: string, override: 'include' | 'exclude' | null) => {
    setManualOverrides(prev => {
      const newOverrides = { ...prev }
      if (override === null) {
        delete newOverrides[blockId]
      } else {
        newOverrides[blockId] = override
      }
      return newOverrides
    })
  }, [])
  
  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<ContextScoringConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])
  
  // Get context string for Claude
  const getContextString = useCallback(() => {
    if (!state.context) return null
    return generateContextString(state.context, project)
  }, [state.context, project])
  
  // Export context in various formats
  const exportContextData = useCallback((format: 'json' | 'markdown' | 'txt' = 'json') => {
    if (!state.context) return null
    return exportContext(state.context, format)
  }, [state.context])
  
  // Save context decision for learning
  const saveDecision = useCallback((decision: Omit<ContextDecision, 'id' | 'projectId' | 'generatedAt'>) => {
    if (!state.context) return
    
    const newDecision: ContextDecision = {
      id: `decision-${Date.now()}`,
      projectId,
      generatedAt: state.context.generatedAt,
      includedBlockIds: state.context.items
        .filter((item, index) => index < state.context!.summary.includedBlocks)
        .map(item => item.block.id),
      excludedBlockIds: state.context.items
        .filter((item, index) => index >= state.context!.summary.includedBlocks)
        .map(item => item.block.id),
      manualOverrides,
      config: state.context.config,
      ...decision
    }
    
    setDecisions(prev => [...prev, newDecision])
    
    // Store in localStorage for persistence
    const stored = localStorage.getItem('frizy-context-decisions')
    const existing = stored ? JSON.parse(stored) : []
    localStorage.setItem('frizy-context-decisions', JSON.stringify([...existing, newDecision]))
  }, [state.context, projectId, manualOverrides])
  
  // Load decisions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('frizy-context-decisions')
      if (stored) {
        const allDecisions = JSON.parse(stored)
        const projectDecisions = allDecisions.filter((d: ContextDecision) => d.projectId === projectId)
        setDecisions(projectDecisions)
      }
    } catch (error) {
      console.warn('Failed to load context decisions from localStorage:', error)
    }
  }, [projectId])
  
  // Context statistics
  const stats = useMemo(() => {
    if (!state.context) return null
    
    const { summary } = state.context
    const includedItems = state.context.items.slice(0, summary.includedBlocks)
    
    return {
      ...summary,
      topScores: includedItems.slice(0, 5).map(item => ({
        blockId: item.block.id,
        title: item.block.title,
        score: item.score,
        reasons: item.includeReason
      })),
      compressionBreakdown: {
        full: includedItems.filter(item => item.compressionLevel === 'full').length,
        summary: includedItems.filter(item => item.compressionLevel === 'summary').length,
        minimal: includedItems.filter(item => item.compressionLevel === 'minimal').length
      },
      manualOverrideCount: Object.keys(manualOverrides).length,
      importantBlockCount: userImportantBlocks.size
    }
  }, [state.context, manualOverrides, userImportantBlocks])
  
  return {
    // State
    context: state.context,
    loading: state.loading || blocksLoading,
    error: state.error || blocksError,
    lastGenerated: state.lastGenerated,
    stats,
    
    // Configuration
    config,
    updateConfig,
    
    // User preferences
    userImportantBlocks,
    markBlockImportant,
    manualOverrides,
    setBlockOverride,
    
    // Actions
    generateContext,
    getContextString,
    exportContextData,
    
    // Decision tracking
    decisions,
    saveDecision,
    
    // Utility
    refresh: generateContext,
    isBlockIncluded: (blockId: string) => {
      if (!state.context) return false
      const item = state.context.items.find(item => item.block.id === blockId)
      if (!item) return false
      const index = state.context.items.indexOf(item)
      return index < state.context.summary.includedBlocks && item.manualOverride !== 'exclude'
    },
    getBlockScore: (blockId: string) => {
      if (!state.context) return null
      const item = state.context.items.find(item => item.block.id === blockId)
      return item?.scoreBreakdown || null
    }
  }
}