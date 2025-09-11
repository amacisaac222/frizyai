import { useState, ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { 
  Project, 
  MCPConnectionStatus, 
  BlockLane, 
  ContextItem, 
  SessionData, 
  AISuggestion 
} from '@/lib/types'

interface AppLayoutProps {
  // Content
  children: ReactNode
  
  // Project data
  currentProject?: Project
  projects: Project[]
  blocksCount?: Record<BlockLane, number>
  
  // MCP status
  mcpStatus: MCPConnectionStatus
  mcpPort?: number
  mcpLastConnected?: Date
  
  // Context panel data
  contextItems: ContextItem[]
  recentSessions: SessionData[]
  aiSuggestions: AISuggestion[]
  
  // User info
  userName?: string
  userAvatar?: string
  
  // View state
  currentView: string
  
  // Event handlers
  onProjectChange: (project: Project) => void
  onCreateProject: () => void
  onOpenInClaudeCode: () => void
  onMCPStatusClick: () => void
  onViewChange: (view: string) => void
  onCreateBlock: () => void
  onShowFilters: () => void
  onAddContext: () => void
  onApplySuggestion: (suggestion: AISuggestion) => void
}

export function AppLayout({
  children,
  currentProject,
  projects,
  blocksCount,
  mcpStatus,
  mcpPort,
  mcpLastConnected,
  contextItems,
  recentSessions,
  aiSuggestions,
  userName,
  userAvatar,
  currentView,
  onProjectChange,
  onCreateProject,
  onOpenInClaudeCode,
  onMCPStatusClick,
  onViewChange,
  onCreateBlock,
  onShowFilters,
  onAddContext,
  onApplySuggestion
}: AppLayoutProps) {
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false)

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <AppHeader
        currentProject={currentProject}
        projects={projects}
        mcpStatus={mcpStatus}
        mcpPort={mcpPort}
        mcpLastConnected={mcpLastConnected}
        onProjectChange={onProjectChange}
        onCreateProject={onCreateProject}
        onOpenInClaudeCode={onOpenInClaudeCode}
        onMCPStatusClick={onMCPStatusClick}
        userName={userName}
        userAvatar={userAvatar}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          currentProject={currentProject}
          blocksCount={blocksCount}
          onViewChange={onViewChange}
          currentView={currentView}
          onCreateBlock={onCreateBlock}
          onShowFilters={onShowFilters}
        />

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

        {/* Right Sidebar */}
        <RightSidebar
          isCollapsed={isRightSidebarCollapsed}
          onToggleCollapse={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          contextItems={contextItems}
          recentSessions={recentSessions}
          aiSuggestions={aiSuggestions}
          onAddContext={onAddContext}
          onApplySuggestion={onApplySuggestion}
        />
      </div>
    </div>
  )
}