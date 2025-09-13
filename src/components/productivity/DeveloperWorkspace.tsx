import { useState, useCallback } from 'react'
import { 
  Brain, 
  MessageSquare, 
  GitBranch, 
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Code,
  GitCommit,
  Plus,
  Send,
  Paperclip,
  Settings,
  Menu,
  X,
  ArrowRight,
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { cn } from '@/utils'

interface ProjectGoal {
  id: string
  title: string
  status: 'completed' | 'in-progress' | 'blocked' | 'planned'
  progress: number
  dueDate?: string
}

interface RecentWork {
  id: string
  type: 'commit' | 'claude-session' | 'pr' | 'issue'
  title: string
  summary: string
  timestamp: string
  files?: string[]
  impact: 'high' | 'medium' | 'low'
}

interface NextAction {
  id: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  estimatedTime: string
  blockedBy?: string[]
  source: 'claude-suggestion' | 'github-issue' | 'code-analysis'
}

interface ActivePanels {
  overview: boolean
  progress: boolean
  claude: boolean
}

export function DeveloperWorkspace() {
  const [activePanels, setActivePanels] = useState<ActivePanels>({ overview: false, progress: false, claude: false })
  const [leftPanelState, setLeftPanelState] = useState<'mini' | 'expanded'>('mini')
  const [claudeMessage, setClaudeMessage] = useState('')
  
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    {
      role: 'assistant',
      content: 'I can see you last worked on the MCP server implementation. The authentication module is 85% complete. Should we finish the JWT validation or move to the WebSocket handlers?'
    }
  ])

  // Mock project data - in real app, this would come from GitHub + Claude Code APIs
  const projectGoals: ProjectGoal[] = [
    {
      id: 'goal-1',
      title: 'Complete MCP Server MVP',
      status: 'in-progress',
      progress: 75,
      dueDate: '2024-01-15'
    },
    {
      id: 'goal-2', 
      title: 'Add Authentication System',
      status: 'in-progress',
      progress: 85
    },
    {
      id: 'goal-3',
      title: 'Build API Documentation',
      status: 'planned',
      progress: 0,
      dueDate: '2024-01-20'
    },
    {
      id: 'goal-4',
      title: 'Deploy to Production',
      status: 'blocked',
      progress: 20
    }
  ]

  const recentWork: RecentWork[] = [
    {
      id: 'work-1',
      type: 'claude-session',
      title: 'Implemented JWT middleware with Claude',
      summary: 'Added token validation, refresh logic, and error handling. Discussed security best practices.',
      timestamp: '2 hours ago',
      files: ['src/middleware/auth.ts', 'src/utils/jwt.ts'],
      impact: 'high'
    },
    {
      id: 'work-2',
      type: 'commit',
      title: 'feat: Add WebSocket connection handling',
      summary: 'Implemented connection pooling and message routing for MCP protocol',
      timestamp: '5 hours ago',
      files: ['src/websocket/handler.ts', 'src/types/mcp.ts'],
      impact: 'high'
    },
    {
      id: 'work-3',
      type: 'pr',
      title: 'PR #34: Database migration system',
      summary: 'Added Prisma migrations and seed data for development environment',
      timestamp: '1 day ago',
      files: ['prisma/migrations/', 'prisma/seed.ts'],
      impact: 'medium'
    },
    {
      id: 'work-4',
      type: 'claude-session',
      title: 'Debugged rate limiting issues',
      summary: 'Fixed Redis connection pooling and optimized rate limit calculations',
      timestamp: '2 days ago',
      files: ['src/middleware/rateLimit.ts'],
      impact: 'medium'
    }
  ]

  const nextActions: NextAction[] = [
    {
      id: 'next-1',
      title: 'Complete JWT token refresh endpoint',
      description: 'Add /auth/refresh route with proper token rotation and security headers',
      priority: 'urgent',
      estimatedTime: '1-2 hours',
      source: 'claude-suggestion'
    },
    {
      id: 'next-2',
      title: 'Fix WebSocket memory leak',
      description: 'Connection cleanup on client disconnect is not working properly',
      priority: 'high',
      estimatedTime: '2-3 hours',
      source: 'code-analysis'
    },
    {
      id: 'next-3',
      title: 'Add input validation schemas',
      description: 'Create Zod schemas for all API endpoints to prevent invalid data',
      priority: 'high',
      estimatedTime: '3-4 hours',
      source: 'github-issue'
    },
    {
      id: 'next-4',
      title: 'Write integration tests',
      description: 'Test auth flow end-to-end with real JWT tokens',
      priority: 'medium',
      estimatedTime: '4-5 hours',
      source: 'claude-suggestion',
      blockedBy: ['Complete JWT token refresh endpoint']
    }
  ]

  const togglePanel = useCallback((panel: keyof ActivePanels) => {
    setActivePanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }, [])

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelState(prev => prev === 'mini' ? 'expanded' : 'mini')
  }, [])

  const sendMessage = () => {
    if (!claudeMessage.trim()) return
    
    setChatHistory(prev => [...prev, { role: 'user', content: claudeMessage }])
    
    // Mock Claude response with project context
    setTimeout(() => {
      const responses = [
        "I can help you finish the JWT refresh endpoint. Based on your current auth middleware, we need to add token rotation. Should I show you the implementation?",
        "Looking at your recent commits, the WebSocket handler looks good but we should add connection timeout handling. Want me to review the code?",
        "I see you're 75% done with the MCP server MVP. The main blockers seem to be the authentication system. Let's prioritize the JWT refresh endpoint first."
      ]
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: responses[Math.floor(Math.random() * responses.length)]
      }])
    }, 1000)
    
    setClaudeMessage('')
  }

  const activePanelCount = Object.values(activePanels).filter(Boolean).length
  const hasActivePanels = activePanelCount > 0

  const getWorkIcon = (type: RecentWork['type']) => {
    switch (type) {
      case 'commit': return GitCommit
      case 'claude-session': return Brain
      case 'pr': return GitBranch
      case 'issue': return AlertCircle
    }
  }

  const getWorkColor = (impact: RecentWork['impact']) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-700 border-green-200'
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPriorityColor = (priority: NextAction['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-gray-400'
    }
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* MINI LEFT PANEL */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        leftPanelState === 'mini' ? 'w-16' : 'w-80'
      )}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {leftPanelState === 'expanded' && (
              <h2 className="font-semibold text-lg">Workspace</h2>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={toggleLeftPanel}
              className="p-2"
            >
              {leftPanelState === 'mini' ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {leftPanelState === 'mini' ? (
          <div className="flex-1 py-4 space-y-4">
            <button
              onClick={() => togglePanel('overview')}
              className={cn(
                "w-full p-3 flex justify-center rounded-lg mx-2 transition-colors",
                activePanels.overview ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
              )}
              title="Project Overview"
            >
              <Target className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => togglePanel('progress')}
              className={cn(
                "w-full p-3 flex justify-center rounded-lg mx-2 transition-colors",
                activePanels.progress ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
              )}
              title="Recent Work"
            >
              <TrendingUp className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => togglePanel('claude')}
              className={cn(
                "w-full p-3 flex justify-center rounded-lg mx-2 transition-colors",
                activePanels.claude ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
              )}
              title="Claude AI"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="font-medium text-sm">Quick Actions</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Continue Last Work
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <Code className="w-4 h-4 mr-2" />
                    Review Code
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <h3 className="font-medium text-sm">Project Health</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Overall Progress</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex">
        {!hasActivePanels && (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center p-8 max-w-md">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Your Development Workspace</h3>
              <p className="text-gray-500 mb-6">Track project progress, continue recent work, and get AI assistance</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => togglePanel('overview')} variant="outline">
                  <Target className="w-4 h-4 mr-2" />
                  Project Overview
                </Button>
                <Button onClick={() => togglePanel('progress')} variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Recent Work
                </Button>
                <Button onClick={() => togglePanel('claude')} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask Claude
                </Button>
              </div>
            </div>
          </div>
        )}

        {hasActivePanels && (
          <>
            {/* Project Overview Panel */}
            {activePanels.overview && (
              <div className={cn("bg-white border-r border-gray-200 flex flex-col", 
                activePanelCount === 1 ? "flex-1" : 
                activePanelCount === 2 ? "w-1/2" : "w-1/3"
              )}>
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Project Goals</h2>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Goal
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => togglePanel('overview')}
                        className="p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {projectGoals.map(goal => (
                    <Card key={goal.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{goal.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <Badge variant="secondary" className={cn(
                                goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                goal.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                goal.status === 'blocked' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              )}>
                                {goal.status.replace('-', ' ')}
                              </Badge>
                              {goal.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {goal.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">{goal.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn("h-2 rounded-full transition-all",
                                goal.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'
                              )}
                              style={{ width: `${goal.progress}%` }} 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Next Actions Section */}
                  <div className="mt-8">
                    <h3 className="font-semibold text-lg mb-4">What's Next</h3>
                    <div className="space-y-3">
                      {nextActions.slice(0, 3).map(action => (
                        <Card key={action.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", getPriorityColor(action.priority))} />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm mb-1">{action.title}</h4>
                                <p className="text-xs text-gray-600 mb-2">{action.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {action.estimatedTime}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {action.source.replace('-', ' ')}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Work Panel */}
            {activePanels.progress && (
              <div className={cn("bg-white border-r border-gray-200 flex flex-col", 
                activePanelCount === 1 ? "flex-1" : 
                activePanelCount === 2 ? "w-1/2" : "w-1/3"
              )}>
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Recent Work</h2>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => togglePanel('progress')}
                        className="p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    {recentWork.map(work => {
                      const Icon = getWorkIcon(work.type)
                      
                      return (
                        <Card key={work.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-lg", getWorkColor(work.impact))}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium mb-1">{work.title}</h4>
                                <p className="text-sm text-gray-600 mb-2">{work.summary}</p>
                                {work.files && (
                                  <div className="mb-2">
                                    <div className="flex flex-wrap gap-1">
                                      {work.files.slice(0, 2).map(file => (
                                        <Badge key={file} variant="outline" className="text-xs">
                                          {file}
                                        </Badge>
                                      ))}
                                      {work.files.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{work.files.length - 2} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{work.timestamp}</span>
                                  <Badge variant="outline" className={cn("text-xs capitalize", 
                                    work.impact === 'high' ? 'border-green-200 text-green-700' :
                                    work.impact === 'medium' ? 'border-blue-200 text-blue-700' :
                                    'border-gray-200 text-gray-700'
                                  )}>
                                    {work.impact} impact
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Claude Panel */}
            {activePanels.claude && (
              <div className={cn("bg-white flex flex-col", 
                activePanelCount === 1 ? "flex-1" : 
                activePanelCount === 2 ? "w-1/2" : "w-1/3"
              )}>
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Claude AI
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => togglePanel('claude')}
                        className="p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Project context: MCP Server MVP (75% complete)
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] p-3 rounded-lg text-sm",
                          message.role === 'user'
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={claudeMessage}
                        onChange={(e) => setClaudeMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask about your project..."
                        className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 h-auto"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button 
                      onClick={sendMessage}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4"
                      disabled={!claudeMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Context: Recent commits, goals, and code analysis
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}