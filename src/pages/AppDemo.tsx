import { useState, useCallback, useMemo } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { DraggableProjectBoard } from '@/components/DraggableProjectBoard'
import { 
  Project, 
  MCPConnectionStatus, 
  BlockLane, 
  ProjectMood,
  ContextItem,
  SessionData,
  AISuggestion,
  Block
} from '@/lib/types'
import { sampleBlocks } from '@/data/sampleBlocks'

// Sample data
const sampleProjects: Project[] = [
  {
    id: '1',
    userId: 'user1',
    name: 'Frizy.AI MVP',
    description: 'Building the initial version of the project management tool',
    mcpConnection: MCPConnectionStatus.CONNECTED,
    mcpPort: 3000,
    mcpLastConnected: new Date(),
    totalSessions: 12,
    lastActiveSession: new Date(),
    mood: ProjectMood.FOCUSED,
    moodHistory: [],
    blocksCount: {
      [BlockLane.VISION]: 3,
      [BlockLane.GOALS]: 5,
      [BlockLane.CURRENT]: 2,
      [BlockLane.NEXT]: 4,
      [BlockLane.CONTEXT]: 8
    },
    completionRate: 65,
    createdAt: new Date(),
    updatedAt: new Date(),
    isArchived: false,
    isPublic: false
  },
  {
    id: '2',
    userId: 'user1',
    name: 'E-commerce Platform',
    description: 'Full-stack e-commerce solution with React and Node.js',
    mcpConnection: MCPConnectionStatus.DISCONNECTED,
    totalSessions: 8,
    mood: ProjectMood.EXPLORING,
    moodHistory: [],
    blocksCount: {
      [BlockLane.VISION]: 2,
      [BlockLane.GOALS]: 3,
      [BlockLane.CURRENT]: 1,
      [BlockLane.NEXT]: 2,
      [BlockLane.CONTEXT]: 5
    },
    completionRate: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
    isArchived: false,
    isPublic: false
  }
]

const sampleContextItems: ContextItem[] = [
  {
    id: '1',
    projectId: '1',
    sessionId: 'session1',
    type: 'decision',
    content: 'Decided to use React with TypeScript for better type safety',
    summary: 'Using React + TypeScript for type safety',
    relatedBlockIds: ['block1'],
    tags: ['tech-stack', 'typescript'],
    importance: 8,
    isBookmarked: true,
    createdAt: new Date(),
    extractedBy: 'ai'
  },
  {
    id: '2',
    projectId: '1',
    sessionId: 'session2',
    type: 'insight',
    content: 'The block-based approach will help users organize work better',
    summary: 'Block-based organization insight',
    relatedBlockIds: ['block2'],
    tags: ['ux', 'organization'],
    importance: 7,
    isBookmarked: false,
    createdAt: new Date(),
    extractedBy: 'manual'
  }
]

const sampleSessions: SessionData[] = [
  {
    id: 'session1',
    projectId: '1',
    title: 'Design System Implementation',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    endedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    duration: 60,
    mcpPort: 3000,
    workingDirectory: '/Users/user/frizyai',
    claudeVersion: 'Sonnet 4',
    filesModified: ['src/components/ui/Button.tsx', 'tailwind.config.js'],
    commandsRun: ['npm install', 'npm run dev'],
    blocksWorkedOn: ['block1', 'block2'],
    initialContext: 'Working on design system components',
    finalSummary: 'Completed button and card components',
    keyDecisions: ['Used Tailwind for styling', 'Implemented proper TypeScript types'],
    blocksCompleted: 2,
    newBlocksCreated: 1,
    productivity: 8
  }
]

const sampleAISuggestions: AISuggestion[] = [
  {
    id: 'suggestion1',
    blockId: 'block1',
    type: 'content_enhancement',
    title: 'Add acceptance criteria',
    description: 'This block could benefit from clear acceptance criteria to define completion',
    confidence: 0.85,
    suggestedContent: 'Acceptance Criteria:\n- Component renders correctly\n- All variants work\n- TypeScript types are proper',
    createdAt: new Date(),
    isApplied: false
  },
  {
    id: 'suggestion2',
    blockId: 'block2',
    type: 'task_breakdown',
    title: 'Break down into subtasks',
    description: 'This complex task could be broken down into smaller, manageable pieces',
    confidence: 0.92,
    createdAt: new Date(),
    isApplied: false
  }
]

export function AppDemo() {
  const [currentProject, setCurrentProject] = useState<Project>(sampleProjects[0])
  const [currentView, setCurrentView] = useState('overview')
  const [blocks, setBlocks] = useState<Block[]>(sampleBlocks)

  // Memoized blocks count for sidebar
  const blocksCount = useMemo(() => {
    return blocks.reduce((acc, block) => {
      acc[block.lane] = (acc[block.lane] || 0) + 1
      return acc
    }, {} as Record<BlockLane, number>)
  }, [blocks])

  // Update current project blocks count when blocks change
  const updatedCurrentProject = useMemo(() => ({
    ...currentProject,
    blocksCount,
    completionRate: Math.round(
      (blocks.filter(b => b.status === 'completed').length / blocks.length) * 100
    )
  }), [currentProject, blocksCount, blocks])

  const handleProjectChange = (project: Project) => {
    setCurrentProject(project)
  }

  const handleCreateProject = () => {
    console.log('Create new project')
  }

  const handleOpenInClaudeCode = () => {
    console.log('Opening in Claude Code...')
  }

  const handleMCPStatusClick = () => {
    console.log('MCP status clicked')
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view)
  }

  const handleBlocksChange = useCallback((updatedBlocks: Block[]) => {
    setBlocks(updatedBlocks)
  }, [])

  const handleCreateBlock = useCallback((lane?: BlockLane) => {
    console.log('Create new block in lane:', lane)
    // TODO: Open modal to create new block
  }, [])

  const handleShowFilters = () => {
    console.log('Show filters')
  }

  const handleAddContext = () => {
    console.log('Add context item')
  }

  const handleApplySuggestion = (suggestion: AISuggestion) => {
    console.log('Apply suggestion:', suggestion.title)
  }

  const handleBlockClick = (block: Block) => {
    console.log('Block clicked:', block.title)
  }

  const handleBlockEdit = (block: Block) => {
    console.log('Edit block:', block.title)
  }

  const handleLaneSettings = (lane: BlockLane) => {
    console.log('Lane settings:', lane)
  }

  return (
    <AppLayout
      currentProject={updatedCurrentProject}
      projects={sampleProjects}
      blocksCount={blocksCount}
      mcpStatus={currentProject.mcpConnection}
      mcpPort={currentProject.mcpPort}
      mcpLastConnected={currentProject.mcpLastConnected}
      contextItems={sampleContextItems}
      recentSessions={sampleSessions}
      aiSuggestions={sampleAISuggestions}
      userName="John Doe"
      currentView={currentView}
      onProjectChange={handleProjectChange}
      onCreateProject={handleCreateProject}
      onOpenInClaudeCode={handleOpenInClaudeCode}
      onMCPStatusClick={handleMCPStatusClick}
      onViewChange={handleViewChange}
      onCreateBlock={handleCreateBlock}
      onShowFilters={handleShowFilters}
      onAddContext={handleAddContext}
      onApplySuggestion={handleApplySuggestion}
    >
      {/* Main draggable swim lane board */}
      <DraggableProjectBoard
        blocks={blocks}
        onBlocksChange={handleBlocksChange}
        onBlockClick={handleBlockClick}
        onBlockEdit={handleBlockEdit}
        onAddBlock={handleCreateBlock}
        onLaneSettings={handleLaneSettings}
      />
    </AppLayout>
  )
}