import { 
  Home, 
  Target, 
  CheckCircle, 
  Clock, 
  BookOpen,
  Settings,
  BarChart3,
  Plus,
  Filter
} from 'lucide-react'
import { Button, Badge, MoodBadge } from './ui'
import { Project, BlockLane } from '@/lib/types'

interface LeftSidebarProps {
  currentProject?: Project
  blocksCount?: Record<BlockLane, number>
  onViewChange: (view: string) => void
  currentView: string
  onCreateBlock: () => void
  onShowFilters: () => void
}

export function LeftSidebar({
  currentProject,
  blocksCount,
  onViewChange,
  currentView,
  onCreateBlock,
  onShowFilters
}: LeftSidebarProps) {
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      count: null
    },
    {
      id: 'vision',
      label: 'Vision',
      icon: Target,
      count: blocksCount?.vision || 0,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: CheckCircle,
      count: blocksCount?.goals || 0,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'current',
      label: 'Current Work',
      icon: Clock,
      count: blocksCount?.current || 0,
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'next',
      label: 'Next Up',
      icon: Clock,
      count: blocksCount?.next || 0,
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'context',
      label: 'Context',
      icon: BookOpen,
      count: blocksCount?.context || 0,
      color: 'bg-gray-100 text-gray-800'
    }
  ]

  const toolItems = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings
    }
  ]

  return (
    <aside className="w-60 border-r border-border bg-card/50 flex flex-col h-full hidden lg:flex">
      {/* Project Info */}
      {currentProject && (
        <div className="p-4 border-b border-border">
          <div className="space-y-2">
            <h2 className="font-semibold truncate" title={currentProject.name}>
              {currentProject.name}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {currentProject.description || 'No description'}
            </p>
            {currentProject.mood && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mood:</span>
                <MoodBadge mood={currentProject.mood} size="sm" />
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentProject.totalSessions} sessions</span>
              <span>{currentProject.completionRate || 0}% complete</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onCreateBlock}
            className="flex-1 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Block
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowFilters}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== null && item.count > 0 && (
                    <Badge
                      size="sm"
                      className={item.color || 'bg-muted text-muted-foreground'}
                    >
                      {item.count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tools Section */}
        <div className="mt-6 p-2 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground px-3 py-2">
            Tools
          </div>
          <div className="space-y-1">
            {toolItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </aside>
  )
}