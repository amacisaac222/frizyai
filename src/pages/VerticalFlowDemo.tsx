import { useState } from 'react'
import { VerticalFlowBoard } from '@/components/boards/VerticalFlowBoard'
import { InteractiveVerticalBoard } from '@/components/boards/InteractiveVerticalBoard'
import { BlockLane, BlockStatus, type Block } from '@/lib/database.types'
import { Button, Badge } from '@/components/ui'
import { ArrowLeft, Sparkles, Users, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

// Sample data for demonstration
const sampleBlocks: Block[] = [
  // Vision
  {
    id: 'vision-1',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build the future of AI-assisted project management',
    content: 'Create a platform that seamlessly integrates with Claude to automatically capture insights, track progress, and maintain context across all work sessions.',
    lane: BlockLane.vision,
    status: BlockStatus.in_progress,
    progress: 30,
    priority: 'high',
    effort: 8,
    claude_sessions: 0,
    last_worked: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['ai', 'productivity', 'vision'],
    metadata: {}
  },

  // Goals
  {
    id: 'goal-1',
    project_id: 'demo',
    created_by: 'user',
    title: 'Launch MVP with core features',
    content: 'Deliver a working product with project boards, Claude integration, and session tracking capabilities.',
    lane: BlockLane.goals,
    status: BlockStatus.in_progress,
    progress: 65,
    priority: 'high',
    effort: 10,
    claude_sessions: 5,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['mvp', 'launch', 'milestone'],
    metadata: {}
  },
  {
    id: 'goal-2',
    project_id: 'demo',
    created_by: 'user',
    title: 'Achieve seamless MCP integration',
    content: 'Enable Claude Code to automatically connect and interact with Frizy projects through the Model Context Protocol.',
    lane: BlockLane.goals,
    status: BlockStatus.not_started,
    progress: 0,
    priority: 'medium',
    effort: 6,
    claude_sessions: 0,
    last_worked: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['mcp', 'integration', 'claude'],
    metadata: {}
  },

  // Current Sprint
  {
    id: 'current-1',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build vertical flow board interface',
    content: 'Create a spacious, conversation-like interface that flows naturally and avoids cramped kanban columns.',
    lane: BlockLane.current,
    status: BlockStatus.in_progress,
    progress: 85,
    priority: 'high',
    effort: 5,
    claude_sessions: 3,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['ui', 'design', 'current-sprint'],
    metadata: {}
  },
  {
    id: 'current-2',
    project_id: 'demo',
    created_by: 'user',
    title: 'Implement session tracking system',
    content: 'Complete the Claude session tracking with automatic insight capture and summary generation.',
    lane: BlockLane.current,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'high',
    effort: 7,
    claude_sessions: 8,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['tracking', 'claude', 'sessions'],
    metadata: {}
  },
  {
    id: 'current-3',
    project_id: 'demo',
    created_by: 'user',
    title: 'Fix Supabase integration issues',
    content: 'Resolve realtime connection errors and ensure proper environment configuration for development.',
    lane: BlockLane.current,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'urgent',
    effort: 3,
    claude_sessions: 2,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['bug-fix', 'supabase', 'realtime'],
    metadata: {}
  },

  // Next Sprint
  {
    id: 'next-1',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build MCP server for Claude Code',
    content: 'Complete the foundational MCP server with all Frizy tools (progress, status, context, insights).',
    lane: BlockLane.next,
    status: BlockStatus.not_started,
    progress: 0,
    priority: 'high',
    effort: 8,
    claude_sessions: 0,
    last_worked: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['mcp', 'server', 'integration'],
    metadata: {}
  },
  {
    id: 'next-2',
    project_id: 'demo',
    created_by: 'user',
    title: 'Add collaborative features',
    content: 'Implement real-time collaboration with presence indicators and conflict resolution.',
    lane: BlockLane.next,
    status: BlockStatus.not_started,
    progress: 0,
    priority: 'medium',
    effort: 6,
    claude_sessions: 0,
    last_worked: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['collaboration', 'realtime', 'teamwork'],
    metadata: {}
  },

  // Context
  {
    id: 'context-1',
    project_id: 'demo',
    created_by: 'user',
    title: 'Design Philosophy: Conversation-like Flow',
    content: 'The interface should feel like reading a conversation with Claude - spacious, natural flow, clear sections, and plenty of breathing room. Avoid cramped columns.',
    lane: BlockLane.context,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'medium',
    effort: 2,
    claude_sessions: 1,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['design', 'philosophy', 'ux'],
    metadata: {}
  },
  {
    id: 'context-2',
    project_id: 'demo',
    created_by: 'user',
    title: 'Technical Decision: Three Layout Modes',
    content: 'Support single column (mobile), two-column (desktop), and grid (overview) layouts to accommodate different screen sizes and working styles.',
    lane: BlockLane.context,
    status: BlockStatus.in_progress,
    progress: 90,
    priority: 'low',
    effort: 3,
    claude_sessions: 1,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['technical', 'decision', 'responsive'],
    metadata: {}
  }
]

export function VerticalFlowDemo() {
  const [blocks, setBlocks] = useState<Block[]>(sampleBlocks)
  const [boardMode, setBoardMode] = useState<'basic' | 'interactive'>('interactive')

  const handleBlockCreate = (newBlock: Partial<Block>) => {
    const block: Block = {
      id: `block-${Date.now()}`,
      project_id: 'demo',
      created_by: 'user',
      title: newBlock.title || 'Untitled',
      content: newBlock.content || '',
      lane: newBlock.lane || BlockLane.current,
      status: newBlock.status || BlockStatus.not_started,
      progress: newBlock.progress || 0,
      priority: newBlock.priority || 'medium',
      effort: 3,
      claude_sessions: 0,
      last_worked: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
      metadata: {}
    }
    setBlocks(prev => [...prev, block])
  }

  const handleBlockUpdate = (blockId: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId 
        ? { ...block, ...updates, updated_at: new Date().toISOString() }
        : block
    ))
  }

  const handleBlockMove = (blockId: string, toLane: BlockLane) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId
        ? { ...block, lane: toLane, updated_at: new Date().toISOString() }
        : block
    ))
  }

  const handleBlockDelete = (blockId: string) => {
    setBlocks(prev => prev.filter(block => block.id !== blockId))
  }

  const stats = {
    total: blocks.length,
    completed: blocks.filter(b => b.status === BlockStatus.completed).length,
    inProgress: blocks.filter(b => b.status === BlockStatus.in_progress).length,
    avgProgress: Math.round(blocks.reduce((sum, b) => sum + b.progress, 0) / blocks.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Vertical Flow Board Demo
                </h1>
                <p className="text-sm text-muted-foreground">
                  Experience the conversation-like project management interface
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={boardMode === 'basic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBoardMode('basic')}
                >
                  Basic View
                </Button>
                <Button
                  variant={boardMode === 'interactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBoardMode('interactive')}
                >
                  Interactive
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-3 h-3" />
                  {stats.total} blocks
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {stats.avgProgress}% avg progress
                </Badge>
                <Badge 
                  variant={stats.completed > 0 ? "default" : "secondary"}
                  className="gap-1"
                >
                  ✓ {stats.completed} completed
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="mb-8 p-6 bg-white rounded-xl border border-blue-100 shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">
            ✨ Interactive Demo
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="mb-2">
                <strong>Switch board modes:</strong> Try "Basic View" vs "Interactive" to see the difference in functionality.
              </p>
              <p className="mb-2">
                <strong>Interactive features:</strong> In Interactive mode, drag blocks between lanes, click to edit titles/content, and use action menus.
              </p>
              <p>
                <strong>Layout modes:</strong> Switch between Single, Two Column, and Grid views for different working styles.
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>Inline editing:</strong> Click on any block title or content to edit it directly. Save with checkmark or cancel with X.
              </p>
              <p className="mb-2">
                <strong>Drag and drop:</strong> Drag blocks by their handle (grip icon) to move them between different lanes.
              </p>
              <p>
                <strong>Block actions:</strong> Hover over blocks to see edit and delete options in the action menu.
              </p>
            </div>
          </div>
        </div>

        {/* Board */}
        {boardMode === 'basic' ? (
          <VerticalFlowBoard
            blocks={blocks}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            onBlockMove={handleBlockMove}
            projectId="demo"
          />
        ) : (
          <InteractiveVerticalBoard
            blocks={blocks}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            onBlockDelete={handleBlockDelete}
            onBlockMove={handleBlockMove}
            projectId="demo"
          />
        )}

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold mb-3">Key Features Demonstrated:</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Spacious Design</h4>
              <p>Each lane takes substantial width, blocks have breathing room, and content flows naturally like a conversation.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Flexible Layouts</h4>
              <p>Three responsive layout modes adapt to different screen sizes and working preferences.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Intuitive Organization</h4>
              <p>Five clear lanes guide work from vision through execution, with context always accessible.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}