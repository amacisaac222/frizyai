import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Folder, 
  Settings, 
  Search, 
  Filter,
  ChevronDown,
  Bell,
  User,
  Zap,
  Clock,
  Target,
  Activity,
  BarChart3,
  Calendar,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { InteractiveVerticalBoard } from '@/components/boards/InteractiveVerticalBoard'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { LightningBolt } from '@/components/ui/LightningLogo'
import { projectService, type ProjectWithStats } from '@/lib/services/projectService'
import { cn } from '@/utils'

type Project = ProjectWithStats & {
  color: 'pink' | 'cyan' | 'purple' | 'yellow' | 'green'
}

interface DashboardStats {
  totalProjects: number
  activeBlocks: number
  completedToday: number
  claudeSessions: number
  currentStreak: number
  inspiration: number
}

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selectedProject, setSelectedProject] = useState<string | null>(
    searchParams.get('project') || null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'board' | 'overview'>('board')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true)
      const result = await projectService.getProjects()
      
      if (result.data) {
        // Add color property to each project
        const projectsWithColors: Project[] = result.data.map((project, index) => ({
          ...project,
          color: (['pink', 'cyan', 'purple', 'yellow', 'green'] as const)[index % 5]
        }))
        setProjects(projectsWithColors)
      }
      
      setProjectsLoading(false)
    }

    loadProjects()
  }, [])

  // Dashboard stats
  const stats: DashboardStats = {
    totalProjects: projects.length,
    activeBlocks: projects.reduce((sum, p) => sum + p.activeBlocks, 0),
    completedToday: 5, // Mock data
    claudeSessions: projects.reduce((sum, p) => sum + p.claudeSessions, 0),
    currentStreak: 12, // Days
    inspiration: 8
  }

  const currentProject = projects.find(p => p.id === selectedProject)

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProject(projectId)
    setSearchParams({ project: projectId })
    setShowProjectSelector(false)
  }, [setSearchParams])

  const handleCreateProject = useCallback(() => {
    setShowCreateModal(true)
  }, [])

  const handleProjectCreated = useCallback((projectId: string) => {
    // Refresh projects and select the new one
    const loadProjects = async () => {
      const result = await projectService.getProjects()
      if (result.data) {
        const projectsWithColors: Project[] = result.data.map((project, index) => ({
          ...project,
          color: (['pink', 'cyan', 'purple', 'yellow', 'green'] as const)[index % 5]
        }))
        setProjects(projectsWithColors)
        handleProjectSelect(projectId)
      }
    }
    loadProjects()
  }, [handleProjectSelect])

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      case 'completed': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      case 'on-hold': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
    }
  }

  const getProjectGradient = (color: Project['color']) => {
    switch (color) {
      case 'pink': return 'bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500'
      case 'cyan': return 'bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500'
      case 'purple': return 'bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500'
      case 'yellow': return 'bg-gradient-to-br from-yellow-500 via-cyan-500 to-pink-500'
      case 'green': return 'bg-gradient-to-br from-green-500 via-cyan-500 to-blue-500'
    }
  }

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      handleProjectSelect(projects[0].id)
    }
  }, [selectedProject, projects, handleProjectSelect])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Project Selector */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <LightningBolt className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 bg-clip-text text-transparent">
                  Frizy Dashboard
                </h1>
              </div>

              {/* Project Selector */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowProjectSelector(!showProjectSelector)}
                  className="flex items-center gap-2 min-w-[200px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", currentProject && getProjectGradient(currentProject.color))} />
                    <span className="truncate">
                      {currentProject?.name || 'Select Project'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {showProjectSelector && (
                  <div className="absolute top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-border z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="p-2">
                      {projects
                        .filter(project => 
                          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.description.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project.id)}
                            className={cn(
                              "w-full p-3 text-left rounded-md hover:bg-gray-50 transition-colors",
                              selectedProject === project.id && "bg-blue-50 ring-1 ring-blue-200"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("w-4 h-4 rounded-full mt-0.5 flex-shrink-0", getProjectGradient(project.color))} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{project.name}</h4>
                                  <Badge size="sm" className={getStatusColor(project.status)}>
                                    {project.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {project.description}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>{project.blocksCount} blocks</span>
                                  <span>{project.claudeSessions} sessions</span>
                                  <span>Updated {new Date(project.lastUpdated).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}

                      <div className="border-t border-border mt-2 pt-2">
                        <button
                          onClick={handleCreateProject}
                          className="w-full p-3 text-left rounded-md hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 flex items-center justify-center">
                            <Plus className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="font-medium text-gray-600">Create New Project</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Stats and Actions */}
            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{stats.activeBlocks}</span>
                  <span className="text-muted-foreground">active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">{stats.claudeSessions}</span>
                  <span className="text-muted-foreground">sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{stats.inspiration}/10</span>
                  <span className="text-muted-foreground">inspiration</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {selectedProject ? (
          <InteractiveVerticalBoard 
            projectId={selectedProject}
            blocks={[]} // Will be loaded by the component
            onBlockCreate={() => {}}
            onBlockUpdate={() => {}}
            onBlockDelete={() => {}}
            onBlockMove={() => {}}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                <Folder className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 bg-clip-text text-transparent">
                Welcome to Frizy
              </h2>
              <p className="text-muted-foreground mb-8">
                Select a project to start managing your work with AI-powered swim lanes, 
                or create a new project to get started.
              </p>
              <Button
                onClick={handleCreateProject}
                className="bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 text-white hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t border-border bg-white/80 backdrop-blur-sm px-6 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-6">
            {currentProject && (
              <>
                <span>Project: {currentProject.name}</span>
                <span>{currentProject.blocksCount} blocks total</span>
                <span>{currentProject.activeBlocks} in progress</span>
                {currentProject.lastWorked && (
                  <span>Last worked: {new Date(currentProject.lastWorked).toLocaleString()}</span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>{stats.currentStreak} day streak</span>
            <span>✨ Inspiration: {stats.inspiration}/10</span>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}