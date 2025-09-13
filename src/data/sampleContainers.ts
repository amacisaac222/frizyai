import { Container } from '@/types/container'

export const sampleContainers: Container[] = [
  {
    id: 'goal-1',
    type: 'goal',
    title: 'AI-Native Productivity Platform',
    description: 'Build a comprehensive productivity platform that leverages AI for context-aware task management and workflow automation',
    status: 'active',
    progress: 65,
    connections: [
      { targetId: 'block-1', type: 'blocks', strength: 0.9, createdAt: new Date('2024-01-15T10:00:00Z') },
      { targetId: 'block-2', type: 'blocks', strength: 0.8, createdAt: new Date('2024-01-15T10:00:00Z') },
      { targetId: 'dec-1', type: 'decision', strength: 0.7, createdAt: new Date('2024-01-10T14:00:00Z') }
    ],
    metadata: {
      businessValue: 'Increase user productivity by 40% through intelligent task automation and context-aware suggestions',
      successCriteria: [
        'Platform handles 95% of common productivity workflows',
        'User satisfaction score above 4.5/5',
        'AI response time under 2 seconds'
      ],
      priority: 'high',
      assignee: 'Sarah Chen',
      estimatedEffort: 120,
      dueDate: new Date('2024-03-31'),
      tags: ['AI', 'Platform', 'Q1 2024', 'Strategic']
    },
    importance: 1.0,
    createdAt: new Date('2024-01-10T09:00:00Z'),
    updatedAt: new Date('2024-01-20T15:30:00Z'),
    createdBy: 'user'
  },
  {
    id: 'block-1',
    type: 'block',
    title: 'Claude AI Integration',
    description: 'Integrate Claude AI assistant for natural language task management and context understanding',
    status: 'in-progress',
    progress: 45,
    connections: [
      { targetId: 'goal-1', type: 'parent', strength: 0.9, createdAt: new Date('2024-01-15T10:00:00Z') },
      { targetId: 'ctx-1', type: 'context', strength: 0.8, createdAt: new Date('2024-01-16T11:00:00Z') },
      { targetId: 'event-1', type: 'trace', strength: 0.6, createdAt: new Date('2024-01-18T14:30:00Z') }
    ],
    metadata: {
      businessValue: 'Enable natural language interaction with productivity tools',
      successCriteria: [
        'Claude responds to queries within 2 seconds',
        'Context retention across sessions',
        'Integration with existing workflows'
      ],
      priority: 'high',
      assignee: 'Alex Rodriguez',
      estimatedEffort: 40,
      dueDate: new Date('2024-02-15'),
      tags: ['AI', 'Integration', 'Claude', 'Core']
    },
    importance: 0.9,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-20T09:15:00Z'),
    createdBy: 'user'
  },
  {
    id: 'block-2',
    type: 'block',
    title: 'Context Memory System',
    description: 'Build persistent memory system for maintaining user context and preferences across sessions',
    status: 'planned',
    progress: 15,
    connections: [
      { targetId: 'proj-1', type: 'parent', strength: 0.8, createdAt: new Date('2024-01-15T10:00:00Z') },
      { targetId: 'ctx-2', type: 'context', strength: 0.7, createdAt: new Date('2024-01-17T13:00:00Z') }
    ],
    metadata: {
      businessValue: 'Personalized experience increases user engagement by 60%',
      successCriteria: [
        'Context persists across browser sessions',
        'Memory system scales to 10k+ users',
        'Privacy compliance verified'
      ],
      priority: 'medium',
      assignee: 'Maria Garcia',
      estimatedEffort: 35,
      dueDate: new Date('2024-02-28'),
      tags: ['Backend', 'Memory', 'Database', 'Privacy']
    },
    importance: 0.7,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    updatedAt: new Date('2024-01-19T16:45:00Z'),
    createdBy: 'user'
  },
  {
    id: 'dec-1',
    type: 'decision',
    title: 'Use TypeScript for Type Safety',
    description: 'Decision to use TypeScript throughout the project to ensure type safety and better developer experience',
    status: 'completed',
    progress: 100,
    connections: [
      { targetId: 'proj-1', type: 'parent', strength: 0.7, createdAt: new Date('2024-01-10T14:00:00Z') },
      { targetId: 'block-1', type: 'dependency', strength: 0.6, createdAt: new Date('2024-01-15T10:00:00Z') }
    ],
    metadata: {
      alternatives: [
        'Use plain JavaScript for faster development',
        'Use Flow for type checking',
        'Use JSDoc for basic type annotations'
      ],
      rationale: 'TypeScript provides better IDE support, catch errors at compile time, and improves code maintainability for a project of this scale',
      impact: 'Slightly slower initial development but significantly better long-term maintainability',
      tags: ['Architecture', 'TypeScript', 'Development']
    },
    importance: 0.6,
    createdAt: new Date('2024-01-10T14:00:00Z'),
    updatedAt: new Date('2024-01-10T16:30:00Z'),
    createdBy: 'user'
  },
  {
    id: 'ctx-1',
    type: 'context',
    title: 'Claude API Documentation',
    description: 'Comprehensive documentation and examples for Claude API integration patterns',
    status: 'active',
    progress: 80,
    connections: [
      { targetId: 'block-1', type: 'context', strength: 0.8, createdAt: new Date('2024-01-16T11:00:00Z') }
    ],
    metadata: {
      source: 'external',
      contextType: 'documentation',
      tags: ['API', 'Documentation', 'Claude', 'Reference']
    },
    importance: 0.5,
    createdAt: new Date('2024-01-16T11:00:00Z'),
    updatedAt: new Date('2024-01-19T10:20:00Z'),
    createdBy: 'system'
  },
  {
    id: 'ctx-2',
    type: 'context',
    title: 'User Research on Context Preferences',
    description: 'Research findings on how users prefer context to be maintained and presented in productivity tools',
    status: 'completed',
    progress: 100,
    connections: [
      { targetId: 'block-2', type: 'context', strength: 0.7, createdAt: new Date('2024-01-17T13:00:00Z') }
    ],
    metadata: {
      source: 'user',
      contextType: 'research',
      tags: ['UX Research', 'Context', 'User Preferences', 'Memory']
    },
    importance: 0.4,
    createdAt: new Date('2024-01-12T14:00:00Z'),
    updatedAt: new Date('2024-01-17T17:30:00Z'),
    createdBy: 'user'
  },
  {
    id: 'event-1',
    type: 'event',
    title: 'Claude API Integration Spike Complete',
    description: 'Successfully completed technical spike for Claude API integration, confirming feasibility of real-time context injection',
    status: 'completed',
    progress: 100,
    connections: [
      { targetId: 'block-1', type: 'trace', strength: 0.6, createdAt: new Date('2024-01-18T14:30:00Z') }
    ],
    metadata: {
      eventType: 'milestone',
      participants: ['Alex Rodriguez', 'Sarah Chen'],
      tags: ['Spike', 'API', 'Milestone', 'Technical']
    },
    importance: 0.3,
    createdAt: new Date('2024-01-18T14:30:00Z'),
    updatedAt: new Date('2024-01-18T14:30:00Z'),
    createdBy: 'user'
  },
  {
    id: 'trace-1',
    type: 'trace',
    title: 'User Journey: First Claude Interaction',
    description: 'Complete trace of user flow from initial login through first successful AI interaction',
    status: 'in-progress',
    progress: 25,
    connections: [
      { targetId: 'block-1', type: 'trace', strength: 0.5, createdAt: new Date('2024-01-19T09:00:00Z') }
    ],
    metadata: {
      traceType: 'start',
      duration: 180000, // 3 minutes
      tags: ['User Journey', 'Onboarding', 'Analytics', 'UX']
    },
    importance: 0.4,
    createdAt: new Date('2024-01-19T09:00:00Z'),
    updatedAt: new Date('2024-01-20T11:30:00Z'),
    createdBy: 'system'
  }
]

// Function to initialize sample data in the store
export function initializeSampleData() {
  if (typeof window !== 'undefined') {
    // Only run in browser
    import('@/stores/containerStore').then(({ useContainerStore }) => {
      const store = useContainerStore.getState()
      
      // Only initialize if store is empty
      if (store.containers.length === 0) {
        store.importContainers(sampleContainers)
        console.log('Initialized with sample container data')
      }
    })
  }
}