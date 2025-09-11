// Re-export all types from the main types file
export * from '../lib/types'

// Legacy interfaces for backward compatibility
export interface LegacyProject {
  id: string
  name: string
  description: string
  lastUpdated: string
  status: 'active' | 'completed' | 'on-hold'
  createdAt: string
  updatedAt: string
}

export interface LegacyTask {
  id: string
  projectId: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

export interface LegacyClaudeSession {
  id: string
  projectId: string
  title: string
  summary: string
  context: string
  createdAt: string
}