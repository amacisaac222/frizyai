import { useState, useCallback } from 'react'
import { 
  Brain, 
  MessageSquare, 
  GitBranch, 
  Sparkles,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Plus,
  Send,
  Paperclip,
  Settings,
  Maximize2,
  Menu,
  X,
  BarChart3,
  List
} from 'lucide-react'
import { Button, Badge, Card, CardContent } from '@/components/ui'
import { cn } from '@/utils'

interface ContextNode {
  id: string
  type: 'block' | 'decision' | 'context' | 'event'
  title: string
  content?: string
  timestamp: string
  connections: string[]
  status?: 'active' | 'completed' | 'pending'
}

interface TraceStep {
  id: string
  nodeId: string
  type: 'start' | 'decision' | 'action' | 'context' | 'end'
  title: string
  timestamp: string
  duration?: number
  metadata?: any
}

type PanelState = 'hidden' | 'mini' | 'expanded'
interface ActivePanels {
  blocks: boolean
  trace: boolean
  claude: boolean
}

export function AdaptiveLayout() {
  const [selectedNode, setSelectedNode] = useState<string>('ctx-1')
  const [expandedSections, setExpandedSections] = useState<string[]>(['blocks', 'decisions'])
  const [claudeMessage, setClaudeMessage] = useState('')
  const [activePanels, setActivePanels] = useState<ActivePanels>({ blocks: false, trace: false, claude: false })
  const [leftPanelState, setLeftPanelState] = useState<PanelState>('mini')
  const [traceViewMode, setTraceViewMode] = useState<'timeline' | 'waterfall'>('timeline')
  
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    {
      role: 'assistant',
      content: 'I can see your active context: "Implement MCP server for Claude integration". How can I help with this work?'
    }
  ])

  // Mock data
  const contextNodes: ContextNode[] = [
    {
      id: 'ctx-1',
      type: 'block',
      title: 'Implement MCP server for Claude integration',
      content: 'Building the Model Context Protocol server to enable bi-directional communication with Claude',
      timestamp: '2 hours ago',
      connections: ['ctx-2', 'ctx-3', 'ctx-4'],
      status: 'active'
    },
    {
      id: 'ctx-2',
      type: 'decision',
      title: 'Use TypeScript for type safety',
      content: 'Decided to use TypeScript to ensure type safety across MCP protocol',
      timestamp: '3 hours ago',
      connections: ['ctx-1'],
      status: 'completed'
    },
    {
      id: 'ctx-3',
      type: 'context',
      title: 'MCP Protocol Documentation',
      content: 'Reference documentation for implementing the protocol',
      timestamp: '1 day ago',
      connections: ['ctx-1', 'ctx-4'],
      status: 'completed'
    },
    {
      id: 'ctx-4',
      type: 'event',
      title: 'PR #234: Add MCP server skeleton',
      content: 'Initial MCP server setup with basic request/response handling',
      timestamp: '5 hours ago',
      connections: ['ctx-1'],
      status: 'completed'
    }
  ]

  const traceSteps: TraceStep[] = [
    { id: 'step-1', nodeId: 'ctx-3', type: 'start', title: 'Started with MCP docs research', timestamp: '1 day ago' },
    { id: 'step-2', nodeId: 'ctx-2', type: 'decision', title: 'Decided on TypeScript approach', timestamp: '3 hours ago', duration: 1200 },
    { id: 'step-3', nodeId: 'ctx-1', type: 'action', title: 'Begin MCP server implementation', timestamp: '2 hours ago', duration: 3600 },
    { id: 'step-4', nodeId: 'ctx-4', type: 'context', title: 'Created PR with initial code', timestamp: '5 hours ago', duration: 800 },
    { id: 'step-5', nodeId: 'ctx-1', type: 'end', title: 'Current: Implementing core features', timestamp: 'now' }
  ]

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelState(prev => 
      prev === 'mini' ? 'expanded' : 'mini'
    )
  }, [])

  const togglePanel = useCallback((panel: keyof ActivePanels) => {
    setActivePanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }, [])

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }, [])

  const getNodeIcon = (type: ContextNode['type']) => {
    switch (type) {
      case 'block': return Brain
      case 'decision': return Sparkles
      case 'context': return MessageSquare
      case 'event': return GitBranch
    }
  }

  const getNodeColor = (type: ContextNode['type']) => {
    switch (type) {
      case 'block': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'decision': return 'bg-green-100 text-green-700 border-green-200'
      case 'context': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'event': return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTraceStepColor = (type: TraceStep['type']) => {
    switch (type) {
      case 'start': return 'bg-green-500'
      case 'decision': return 'bg-yellow-500'
      case 'action': return 'bg-blue-500'
      case 'context': return 'bg-orange-500'
      case 'end': return 'bg-purple-500'
    }
  }

  const nodesByType = contextNodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = []
    acc[node.type].push(node)
    return acc
  }, {} as Record<string, ContextNode[]>)

  const sendMessage = () => {
    if (!claudeMessage.trim()) return
    
    setChatHistory(prev => [...prev, { role: 'user', content: claudeMessage }])
    
    // Mock Claude response
    setTimeout(() => {
      const responses = [
        "I can help you with the MCP server implementation. Based on the context, you're working with TypeScript. Would you like me to help with the request/response handlers?",
        "Looking at your PR #234, I see you've started the basic structure. What specific part of the MCP protocol are you implementing next?",
        "The MCP documentation shows we need to handle these message types: initialize, notifications, and requests. Which one should we focus on?"
      ]
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: responses[Math.floor(Math.random() * responses.length)]
      }])
    }, 1000)
    
    setClaudeMessage('')
  }

  // Calculate active panel count for width distribution
  const activePanelCount = Object.values(activePanels).filter(Boolean).length
  const hasActivePanels = activePanelCount > 0

  // Calculate waterfall chart data
  const waterfallData = traceSteps.map((step, index) => {
    const startTime = index * 30 + Math.random() * 20 // Mock start time in minutes
    const duration = step.duration ? step.duration / 60 : Math.random() * 45 + 5 // Convert to minutes
    return {
      ...step,
      startTime,
      duration,
      endTime: startTime + duration
    }
  })

  const totalDuration = Math.max(...waterfallData.map(d => d.endTime))

  return (
    <div className="h-full flex bg-gray-50">
      {/* MINI LEFT PANEL */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        leftPanelState === 'mini' ? 'w-16' : 'w-80'
      )}>
        {/* Mini Panel Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {leftPanelState === 'expanded' && (
              <h2 className="font-semibold text-lg">Context</h2>
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

        {/* Mini Panel Content */}
        {leftPanelState === 'mini' ? (
          <div className="flex-1 py-4 space-y-4">
            <button
              onClick={() => togglePanel('blocks')}
              className={cn(
                "w-full p-3 flex justify-center rounded-lg mx-2 transition-colors",
                activePanels.blocks ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
              )}
              title="Blocks"
            >
              <Brain className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => togglePanel('trace')}
              className={cn(
                "w-full p-3 flex justify-center rounded-lg mx-2 transition-colors",
                activePanels.trace ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
              )}
              title="Trace View"
            >
              <GitBranch className="w-5 h-5" />
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
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search context..."
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Expanded Navigation */}
            {Object.entries(nodesByType).map(([type, nodes]) => {
              const isExpanded = expandedSections.includes(type)
              const Icon = getNodeIcon(type as ContextNode['type'])
              
              return (
                <div key={type} className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection(type)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium capitalize">{type}s</span>
                      <Badge variant="secondary" className="text-xs">
                        {nodes.length}
                      </Badge>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="pb-2">
                      {nodes.map(node => (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNode(node.id)}
                          className={cn(
                            "w-full p-2 mx-3 mb-1 text-left rounded-md transition-all text-sm",
                            "hover:bg-gray-100",
                            selectedNode === node.id ? "bg-purple-50 border border-purple-200" : ""
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn("w-2 h-2 rounded-full", 
                              node.status === 'active' ? 'bg-green-500' : 
                              node.status === 'completed' ? 'bg-gray-400' : 'bg-yellow-500'
                            )} />
                            <span className="font-medium truncate">{node.title}</span>
                          </div>
                          <p className="text-xs text-gray-500">{node.timestamp}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex">
        {/* Default View - When no panels are active */}
        {!hasActivePanels && (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center p-8">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Welcome to Frizy</h3>
              <p className="text-gray-500 mb-6">Select panels from the left to get started</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => togglePanel('blocks')} variant="outline">
                  <Brain className="w-4 h-4 mr-2" />
                  View Blocks
                </Button>
                <Button onClick={() => togglePanel('trace')} variant="outline">
                  <GitBranch className="w-4 h-4 mr-2" />
                  View Trace
                </Button>
                <Button onClick={() => togglePanel('claude')} variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat with Claude
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Panel Layout */}
        {hasActivePanels && (
          <>
            {/* Blocks Panel */}
            {activePanels.blocks && (
              <div className={cn("bg-white border-r border-gray-200 flex flex-col", 
                activePanelCount === 1 ? "flex-1" : 
                activePanelCount === 2 ? "w-1/2" : "w-1/3"
              )}>
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Context Blocks</h2>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        New Block
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => togglePanel('blocks')}
                        className="p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {contextNodes.map(node => (
                    <Card key={node.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", getNodeColor(node.type))}>
                            {(() => {
                              const Icon = getNodeIcon(node.type)
                              return <Icon className="w-4 h-4" />
                            })()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{node.title}</h4>
                            {node.content && (
                              <p className="text-sm text-gray-600 mb-2">{node.content}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{node.timestamp}</span>
                              <Badge variant="secondary" className="capitalize">
                                {node.status}
                              </Badge>
                              <span>{node.connections.length} connections</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Trace Panel */}
            {activePanels.trace && (
              <div className={cn("bg-white border-r border-gray-200 flex flex-col", 
                activePanelCount === 1 ? "flex-1" : 
                activePanelCount === 2 ? "w-1/2" : "w-1/3"
              )}>
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Context Flow Trace</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 rounded-md p-1">
                        <button
                          onClick={() => setTraceViewMode('timeline')}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1",
                            traceViewMode === 'timeline' 
                              ? "bg-white shadow-sm" 
                              : "hover:bg-gray-50"
                          )}
                        >
                          <List className="w-3 h-3" />
                          Timeline
                        </button>
                        <button
                          onClick={() => setTraceViewMode('waterfall')}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded transition-all flex items-center gap-1",
                            traceViewMode === 'waterfall' 
                              ? "bg-white shadow-sm" 
                              : "hover:bg-gray-50"
                          )}
                        >
                          <BarChart3 className="w-3 h-3" />
                          Waterfall
                        </button>
                      </div>
                      <Button size="sm" variant="outline">
                        <Filter className="w-4 h-4 mr-1" />
                        Filter
                      </Button>
                      <Button size="sm" variant="outline">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => togglePanel('trace')}
                        className="p-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>5 steps</span>
                    <span>•</span>
                    <span>{Math.round(totalDuration)} minutes total</span>
                    <span>•</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      Active Trace
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {traceViewMode === 'timeline' ? (
                    <>
                      {/* Timeline View */}
                      <div className="space-y-4">
                      {traceSteps.map((step, index) => {
                        const node = contextNodes.find(n => n.id === step.nodeId)
                        const isLast = index === traceSteps.length - 1
                        
                        return (
                          <div key={step.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 border-white",
                                getTraceStepColor(step.type)
                              )} />
                              {!isLast && <div className="w-0.5 h-12 bg-gray-200 mt-2" />}
                            </div>
                            
                            <div className="flex-1 pb-8">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{step.title}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {step.type}
                                </Badge>
                                {step.duration && (
                                  <span className="text-xs text-gray-500">
                                    {Math.floor(step.duration / 60)}m {step.duration % 60}s
                                  </span>
                                )}
                              </div>
                              
                              {node && (
                                <div className={cn(
                                  "p-3 rounded-lg border text-sm mt-2",
                                  getNodeColor(node.type)
                                )}>
                                  <p className="font-medium">{node.title}</p>
                                  {node.content && (
                                    <p className="text-xs mt-1 opacity-75">{node.content}</p>
                                  )}
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-500 mt-2">{step.timestamp}</p>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Waterfall View */}
                      <div className="space-y-6">
                      {/* Time scale */}
                      <div className="relative h-8 border-b border-gray-200">
                        <div className="absolute inset-0 flex items-end">
                          {[0, 25, 50, 75, 100, 125, 150].map(time => (
                            <div
                              key={time}
                              className="absolute flex flex-col items-center"
                              style={{ left: `${(time / totalDuration) * 100}%` }}
                            >
                              <div className="w-px h-2 bg-gray-300" />
                              <span className="text-xs text-gray-500 mt-1">{time}m</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Waterfall bars */}
                      <div className="space-y-3">
                        {waterfallData.map((item, index) => {
                          const node = contextNodes.find(n => n.id === item.nodeId)
                          const leftPercent = (item.startTime / totalDuration) * 100
                          const widthPercent = (item.duration / totalDuration) * 100
                          
                          return (
                            <div key={item.id} className="flex items-center gap-4 group">
                              {/* Task label */}
                              <div className="w-48 flex-shrink-0 text-right pr-4">
                                <div className="text-sm font-medium truncate">{item.title}</div>
                                <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {item.type}
                                  </Badge>
                                  <span>{Math.round(item.duration)}m</span>
                                </div>
                              </div>
                              
                              {/* Waterfall bar container */}
                              <div className="flex-1 relative h-8 bg-gray-50 rounded border">
                                {/* Duration bar */}
                                <div
                                  className={cn(
                                    "absolute h-full rounded transition-all group-hover:opacity-80",
                                    getTraceStepColor(item.type)
                                  )}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`
                                  }}
                                />
                                
                                {/* Hover tooltip */}
                                <div className="absolute inset-0 flex items-center justify-start pl-2">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                      Start: {Math.round(item.startTime)}m | Duration: {Math.round(item.duration)}m
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-4 text-xs">
                          {['start', 'decision', 'action', 'context', 'end'].map(type => (
                            <div key={type} className="flex items-center gap-2">
                              <div className={cn("w-3 h-3 rounded", getTraceStepColor(type as TraceStep['type']))} />
                              <span className="capitalize">{type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      </div>
                    </>
                  )}
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
                    Context injected: {selectedNode ? contextNodes.find(n => n.id === selectedNode)?.title : 'None'}
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
                        placeholder="Ask Claude about your context..."
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
                    Context is automatically injected from your selected work
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