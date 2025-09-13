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
  Sparkles,
  Brain,
  Layers
} from 'lucide-react'
import { InteractiveVerticalBoard } from '@/components/boards/InteractiveVerticalBoard'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { InteractiveTour } from '@/components/onboarding/InteractiveTour'
import { KeyboardShortcuts, useKeyboardShortcuts } from '@/components/accessibility/KeyboardShortcuts'
import { useAccessibility } from '@/contexts/AccessibilityContext'
import { ContextDashboard } from '@/components/context/ContextDashboard'
import { ContextHeader } from '@/components/context/ContextHeader'
import { AdaptiveLayout } from '@/components/context/AdaptiveLayout'
import { DeveloperWorkspace } from '@/components/productivity/DeveloperWorkspace'
import { EnhancedWorkspace } from '@/components/productivity/EnhancedWorkspace'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { LightningBolt } from '@/components/ui/LightningLogo'
import { projectService, type ProjectWithStats } from '@/lib/services/projectService'
import { useContainerStore } from '@/stores/containerStore'
import { initializeSampleData } from '@/data/sampleContainers'
import { sampleContainers } from '@/data/sampleNestedData'
import { NestedContainer } from '@/components/containers/NestedContainer'
import { WaterfallStoryView } from '@/components/context/WaterfallStoryView'
import { useAuth } from '@/contexts/AuthContext'
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
  const { dbUser } = useAuth()
  const { announceToScreenReader, toggleHighContrast, highContrastMode } = useAccessibility()
  const { showShortcuts, closeShortcuts } = useKeyboardShortcuts()
  
  const [selectedProject, setSelectedProject] = useState<string | null>(
    searchParams.get('project') || null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [viewMode, setViewMode] = useState<'nested' | 'workspace' | 'trace' | 'context' | 'board'>('nested')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  
  // Container store for Context Header
  const { containers, getFilteredContainers } = useContainerStore()
  const [contextHeaderVisible, setContextHeaderVisible] = useState(true)

  // Load projects on mount and check for first-time user
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
        
        // Show welcome modal for new users (no projects yet)
        if (projectsWithColors.length === 0 && dbUser) {
          const hasSeenWelcome = localStorage.getItem(`hasSeenWelcome_${dbUser.id}`)
          if (!hasSeenWelcome) {
            setShowWelcomeModal(true)
          }
        }
      }
      
      setProjectsLoading(false)
    }

    // Always load projects in development mode, regardless of auth state
    loadProjects()
    
    // Initialize sample container data if needed
    initializeSampleData()
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
    const project = projects.find(p => p.id === projectId)
    setSelectedProject(projectId)
    setSearchParams({ project: projectId })
    setShowProjectSelector(false)
    
    if (project) {
      announceToScreenReader(`Selected project: ${project.name}`)
    }
  }, [setSearchParams, projects, announceToScreenReader])

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

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcomeModal(false)
    if (dbUser) {
      localStorage.setItem(`hasSeenWelcome_${dbUser.id}`, 'true')
    }
  }, [dbUser])

  const handleStartTour = useCallback(() => {
    setShowWelcomeModal(false)
    setShowTour(true)
    if (dbUser) {
      localStorage.setItem(`hasSeenWelcome_${dbUser.id}`, 'true')
    }
  }, [dbUser])

  const handleTourComplete = useCallback(() => {
    setShowTour(false)
  }, [])  

  const handleCreateFirstProject = useCallback(() => {
    setShowWelcomeModal(false)
    setShowCreateModal(true)
    if (dbUser) {
      localStorage.setItem(`hasSeenWelcome_${dbUser.id}`, 'true')
    }
  }, [dbUser])

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Skip Links */}
      <div className="skip-links">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#project-selector" className="skip-link">
          Skip to project selector
        </a>
      </div>
      
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm" role="banner">
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
              <div className="relative" data-tour="project-selector" id="project-selector">
                <Button
                  variant="outline"
                  onClick={() => setShowProjectSelector(!showProjectSelector)}
                  className="flex items-center gap-2 min-w-[200px] justify-between"
                  aria-label="Select project"
                  aria-expanded={showProjectSelector}
                  aria-haspopup="listbox"
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
              <div className="hidden lg:flex items-center gap-6 text-sm" data-tour="stats-bar">
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
                <Button 
                  variant={contextHeaderVisible ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setContextHeaderVisible(!contextHeaderVisible)}
                  aria-label={`${contextHeaderVisible ? 'Hide' : 'Show'} Context Header`}
                  title="Toggle Context Header - Never lose your place"
                  className={contextHeaderVisible ? "bg-purple-600 text-white hover:bg-purple-700" : ""}
                >
                  <Brain className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleHighContrast}
                  aria-label={`${highContrastMode ? 'Disable' : 'Enable'} high contrast mode`}
                  title={`${highContrastMode ? 'Disable' : 'Enable'} high contrast mode`}
                >
                  <Target className={cn("w-4 h-4", highContrastMode && "text-black")} />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Notifications">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="User profile">
                  <User className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Context Header - Prominent placement */}
      {contextHeaderVisible && selectedProject && (
        <div className="px-6 pt-4" data-tour="context-header">
          <ContextHeader
            projectId={selectedProject}
            containers={containers}
            onContextCopy={(context) => {
              console.log('Context copied:', context)
              announceToScreenReader('Context copied to clipboard')
            }}
            onWorkResume={(containerId) => {
              console.log('Resuming work on:', containerId)
              announceToScreenReader(`Resumed work on container ${containerId}`)
            }}
          />
        </div>
      )}
      
      {/* Main Content */}
      <main 
        className="flex-1" 
        data-tour="main-content" 
        id="main-content"
        role="main"
        aria-label="Project dashboard content"
      >
        {selectedProject ? (
          <div className="min-h-full flex flex-col">
            {/* View Mode Toggle Bar */}
            <div className="p-4 border-b border-border bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                    <button
                      onClick={() => setViewMode('nested')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-all",
                        viewMode === 'nested' 
                          ? "bg-purple-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        <span>Nested</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setViewMode('workspace')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-all",
                        viewMode === 'workspace' 
                          ? "bg-purple-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      Workspace
                    </button>
                    <button
                      onClick={() => setViewMode('trace')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-all",
                        viewMode === 'trace' 
                          ? "bg-purple-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      Trace View
                    </button>
                    <button
                      onClick={() => setViewMode('context')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-all",
                        viewMode === 'context' 
                          ? "bg-purple-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      Context Graph
                    </button>
                    <button
                      onClick={() => setViewMode('board')}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-all",
                        viewMode === 'board' 
                          ? "bg-purple-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      Board View
                    </button>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    {currentProject?.name || 'Current Project'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Action buttons can go here */}
                </div>
              </div>
            </div>

            {/* Dynamic Content Based on View Mode */}
            <div className="flex-1 overflow-auto">
              {viewMode === 'nested' ? (
                <div className="p-6 space-y-4">
                  {sampleContainers.map(container => (
                    <NestedContainer key={container.id} container={container} />
                  ))}
                </div>
              ) : viewMode === 'workspace' ? (
                <EnhancedWorkspace />
              ) : viewMode === 'trace' ? (
                <WaterfallStoryView />
              ) : viewMode === 'context' ? (
                <ContextDashboard />
              ) : (
                <InteractiveVerticalBoard 
                  projectId={selectedProject}
                  blocks={[]} // Will be loaded by the component
                  onBlockCreate={() => {}}
                  onBlockUpdate={() => {}}
                  onBlockDelete={() => {}}
                  onBlockMove={() => {}}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md space-y-8">
              <div>
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Your Project's Memory
                </h2>
                <p className="text-muted-foreground mb-8">
                  Frizy captures context automatically - decisions, conversations, and code changes - 
                  so Claude always knows what you're working on and why.
                </p>
                <Button
                  onClick={handleCreateProject}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Create Your First Context Graph
                </Button>
              </div>
              
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <div className="border-t border-border bg-white/80 backdrop-blur-sm px-6 py-2" data-tour="status-bar">
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

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeComplete}
        onStartTour={handleStartTour}
        onCreateFirstProject={handleCreateFirstProject}
      />

      {/* Interactive Tour */}
      <InteractiveTour
        isActive={showTour}
        onComplete={handleTourComplete}
        onTriggerAIImport={() => {
          // This would trigger the AI import modal
          // For now, we'll just show a message
          console.log('AI Import triggered from tour')
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={closeShortcuts}
      />
    </div>
  )
}