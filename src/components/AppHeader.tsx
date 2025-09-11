import { Brain, ExternalLink, User } from 'lucide-react'
import { Button } from './ui'
import { ProjectSwitcher } from './ProjectSwitcher'
import { MCPStatus } from './MCPStatus'
import { Project, MCPConnectionStatus } from '@/lib/types'

interface AppHeaderProps {
  currentProject?: Project
  projects: Project[]
  mcpStatus: MCPConnectionStatus
  mcpPort?: number
  mcpLastConnected?: Date
  onProjectChange: (project: Project) => void
  onCreateProject: () => void
  onOpenInClaudeCode: () => void
  onMCPStatusClick: () => void
  userName?: string
  userAvatar?: string
}

export function AppHeader({
  currentProject,
  projects,
  mcpStatus,
  mcpPort,
  mcpLastConnected,
  onProjectChange,
  onCreateProject,
  onOpenInClaudeCode,
  onMCPStatusClick,
  userName = 'User',
  userAvatar
}: AppHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        {/* Left section - Logo and Project Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold">Frizy.AI</span>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          <ProjectSwitcher
            currentProject={currentProject}
            projects={projects}
            onProjectChange={onProjectChange}
            onCreateProject={onCreateProject}
          />
        </div>

        {/* Right section - Status, Actions, and User */}
        <div className="flex items-center gap-3">
          {/* MCP Status */}
          <MCPStatus
            status={mcpStatus}
            port={mcpPort}
            lastConnected={mcpLastConnected}
            onClick={onMCPStatusClick}
          />
          
          {/* Open in Claude Code Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenInClaudeCode}
            disabled={mcpStatus !== MCPConnectionStatus.CONNECTED}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open in Claude Code</span>
            <span className="sm:hidden">Claude Code</span>
          </Button>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="text-sm font-medium hidden md:inline">
              {userName}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}