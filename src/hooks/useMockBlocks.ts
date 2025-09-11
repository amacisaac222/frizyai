import { useState, useCallback } from 'react'
import type { Block, BlockInsert, BlockUpdate, BlockLane, BlockStatus } from '@/lib/database.types'

// Mock data for demonstration
const createMockBlocks = (projectId: string): Block[] => [
  {
    id: 'block-1',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Setup project foundation',
    content: 'Initialize the project with basic structure, dependencies, and configuration files.',
    lane: 'current' as BlockLane,
    status: 'in_progress' as BlockStatus,
    progress: 75,
    priority: 'high',
    effort: 8,
    claude_sessions: 3,
    last_worked: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    related_session_ids: ['session-1', 'session-2'],
    energy_level: 'high',
    complexity: 'moderate',
    inspiration: 8,
    mood: 'focused',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ['setup', 'foundation', 'infrastructure'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'block-2',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Build MVP features',
    content: 'Implement core functionality for the minimum viable product including user authentication and basic CRUD operations.',
    lane: 'goals' as BlockLane,
    status: 'not_started' as BlockStatus,
    progress: 0,
    priority: 'urgent',
    effort: 20,
    claude_sessions: 0,
    last_worked: null,
    related_session_ids: [],
    energy_level: 'medium',
    complexity: 'complex',
    inspiration: 6,
    mood: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['mvp', 'features', 'authentication'],
    dependencies: ['block-1'],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'block-3',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'User interface design',
    content: 'Create wireframes and design mockups for the user interface. Focus on usability and modern design principles.',
    lane: 'current' as BlockLane,
    status: 'in_progress' as BlockStatus,
    progress: 40,
    priority: 'medium',
    effort: 12,
    claude_sessions: 2,
    last_worked: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    related_session_ids: ['session-3'],
    energy_level: 'peak',
    complexity: 'moderate',
    inspiration: 9,
    mood: 'excited',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    tags: ['ui', 'design', 'wireframes'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: ['Consider using a design system', 'Add accessibility features']
  },
  {
    id: 'block-4',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Research competitor analysis',
    content: 'Analyze competing products to understand market positioning and identify unique value propositions.',
    lane: 'context' as BlockLane,
    status: 'completed' as BlockStatus,
    progress: 100,
    priority: 'low',
    effort: 6,
    claude_sessions: 1,
    last_worked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    related_session_ids: ['session-4'],
    energy_level: 'medium',
    complexity: 'simple',
    inspiration: 7,
    mood: 'motivated',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['research', 'competitors', 'analysis'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'block-5',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Performance optimization',
    content: 'Optimize application performance including bundle size, loading times, and runtime efficiency.',
    lane: 'next' as BlockLane,
    status: 'not_started' as BlockStatus,
    progress: 0,
    priority: 'medium',
    effort: 15,
    claude_sessions: 0,
    last_worked: null,
    related_session_ids: [],
    energy_level: 'low',
    complexity: 'complex',
    inspiration: 5,
    mood: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['performance', 'optimization', 'technical-debt'],
    dependencies: ['block-1', 'block-2'],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'block-6',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Scale to 1M users',
    content: 'Long-term vision to scale the platform to support 1 million active users with enterprise features.',
    lane: 'vision' as BlockLane,
    status: 'not_started' as BlockStatus,
    progress: 0,
    priority: 'low',
    effort: 50,
    claude_sessions: 0,
    last_worked: null,
    related_session_ids: [],
    energy_level: 'medium',
    complexity: 'complex',
    inspiration: 10,
    mood: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['vision', 'scaling', 'enterprise'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'block-7',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Testing framework setup',
    content: 'Implement comprehensive testing including unit tests, integration tests, and end-to-end testing.',
    lane: 'current' as BlockLane,
    status: 'blocked' as BlockStatus,
    progress: 25,
    priority: 'high',
    effort: 10,
    claude_sessions: 1,
    last_worked: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    related_session_ids: ['session-5'],
    energy_level: 'low',
    complexity: 'moderate',
    inspiration: 4,
    mood: 'stressed',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    tags: ['testing', 'quality', 'automation'],
    dependencies: ['block-1'],
    blocked_by: ['block-8'],
    subtasks: [],
    ai_suggestions: ['Consider using Jest and Cypress', 'Set up CI/CD pipeline']
  },
  {
    id: 'block-8',
    project_id: projectId,
    created_by: 'demo-user',
    title: 'Resolve environment issues',
    content: 'Fix development environment configuration problems that are blocking testing setup.',
    lane: 'current' as BlockLane,
    status: 'in_progress' as BlockStatus,
    progress: 60,
    priority: 'urgent',
    effort: 4,
    claude_sessions: 2,
    last_worked: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    related_session_ids: ['session-6'],
    energy_level: 'medium',
    complexity: 'simple',
    inspiration: 6,
    mood: 'focused',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tags: ['environment', 'configuration', 'blocker'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  }
]

// Mock hook that simulates the real useBlocks hook
export function useMockBlocks(projectId: string) {
  const [blocks, setBlocks] = useState<Block[]>(() => createMockBlocks(projectId))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBlock = useCallback(async (blockData: BlockInsert) => {
    setLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      project_id: projectId,
      created_by: 'demo-user',
      title: blockData.title,
      content: blockData.content || '',
      lane: blockData.lane,
      status: blockData.status || 'not_started',
      progress: blockData.progress || 0,
      priority: blockData.priority || 'medium',
      effort: blockData.effort || 1,
      claude_sessions: 0,
      last_worked: null,
      related_session_ids: [],
      energy_level: blockData.energy_level || 'medium',
      complexity: blockData.complexity || 'moderate',
      inspiration: blockData.inspiration || 5,
      mood: blockData.mood || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: blockData.tags || [],
      dependencies: blockData.dependencies || [],
      blocked_by: blockData.blocked_by || [],
      subtasks: blockData.subtasks || [],
      ai_suggestions: blockData.ai_suggestions || []
    }

    setBlocks(prev => [newBlock, ...prev])
    setLoading(false)
    
    return { data: newBlock, error: null }
  }, [projectId])

  const updateBlock = useCallback(async (id: string, updates: BlockUpdate) => {
    setLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setBlocks(prev => prev.map(block => 
      block.id === id 
        ? { ...block, ...updates, updated_at: new Date().toISOString() }
        : block
    ))
    
    setLoading(false)
    
    const updatedBlock = blocks.find(b => b.id === id)
    return { data: updatedBlock || null, error: null }
  }, [blocks])

  const moveBlock = useCallback(async (id: string, newLane: string) => {
    return updateBlock(id, { lane: newLane as BlockLane })
  }, [updateBlock])

  const deleteBlock = useCallback(async (id: string) => {
    setLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setBlocks(prev => prev.filter(block => block.id !== id))
    setLoading(false)
    
    return { data: null, error: null }
  }, [])

  const refetch = useCallback(async () => {
    setLoading(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    setBlocks(createMockBlocks(projectId))
    setLoading(false)
  }, [projectId])

  return {
    blocks,
    loading,
    error,
    createBlock,
    updateBlock,
    moveBlock,
    deleteBlock,
    refetch
  }
}