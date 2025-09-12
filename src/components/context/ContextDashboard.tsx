import { useState, useEffect } from 'react'
import { Brain, GitBranch, MessageSquare, Clock, ArrowRight, Sparkles, Network, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, Button, Badge } from '@/components/ui'
import { cn } from '@/utils'

interface ContextNode {
  id: string
  type: 'block' | 'decision' | 'context' | 'event'
  title: string
  content?: string
  timestamp: string
  connections: number
  metadata?: {
    author?: string
    source?: string
    url?: string
  }
}

interface ContextEdge {
  from: string
  to: string
  type: 'depends_on' | 'derived_from' | 'blocks' | 'related_to'
  weight?: number
}

export function ContextDashboard() {
  const [activeContext, setActiveContext] = useState<ContextNode | null>(null)
  const [relatedNodes, setRelatedNodes] = useState<ContextNode[]>([])
  const [viewMode, setViewMode] = useState<'context' | 'graph' | 'timeline'>('context')
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data for demonstration
  useEffect(() => {
    const mockActiveContext: ContextNode = {
      id: 'ctx-1',
      type: 'block',
      title: 'Implement MCP server for Claude integration',
      content: 'Building the Model Context Protocol server to enable bi-directional communication with Claude',
      timestamp: '2 hours ago',
      connections: 8,
      metadata: {
        author: 'Demo User',
        source: 'manual'
      }
    }

    const mockRelatedNodes: ContextNode[] = [
      {
        id: 'ctx-2',
        type: 'decision',
        title: 'Use TypeScript for type safety',
        content: 'Decided to use TypeScript to ensure type safety across MCP protocol',
        timestamp: '3 hours ago',
        connections: 3,
        metadata: {
          source: 'claude',
          author: 'Claude AI'
        }
      },
      {
        id: 'ctx-3',
        type: 'context',
        title: 'MCP Protocol Documentation',
        content: 'Reference to Anthropic MCP docs for implementation details',
        timestamp: '1 day ago',
        connections: 5,
        metadata: {
          source: 'web',
          url: 'https://mcp.anthropic.com'
        }
      },
      {
        id: 'ctx-4',
        type: 'event',
        title: 'PR #234: Add MCP server skeleton',
        content: 'Initial MCP server setup with basic request/response handling',
        timestamp: '5 hours ago',
        connections: 4,
        metadata: {
          source: 'github',
          url: 'https://github.com/user/repo/pull/234'
        }
      }
    ]

    setActiveContext(mockActiveContext)
    setRelatedNodes(mockRelatedNodes)
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
      case 'block': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'decision': return 'text-green-600 bg-green-50 border-green-200'
      case 'context': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'event': return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with view toggles */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            Context Graph
          </h1>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {relatedNodes.length + 1} nodes connected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'context' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('context')}
              className={cn(
                "rounded-md px-3 py-1 text-sm",
                viewMode === 'context' && "bg-white shadow-sm"
              )}
            >
              Context
            </Button>
            <Button
              variant={viewMode === 'graph' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('graph')}
              className={cn(
                "rounded-md px-3 py-1 text-sm",
                viewMode === 'graph' && "bg-white shadow-sm"
              )}
            >
              Graph
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={cn(
                "rounded-md px-3 py-1 text-sm",
                viewMode === 'timeline' && "bg-white shadow-sm"
              )}
            >
              Timeline
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search context..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-6 overflow-auto">
        {viewMode === 'context' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Context */}
            <div className="lg:col-span-2">
              <Card className="border-2 border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      Active Context
                    </h2>
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Inject to Claude
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeContext && (
                    <div className="space-y-4">
                      <div className={cn(
                        "p-4 rounded-lg border-2",
                        getNodeColor(activeContext.type)
                      )}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = getNodeIcon(activeContext.type)
                              return <Icon className="w-5 h-5" />
                            })()}
                            <span className="font-medium capitalize">{activeContext.type}</span>
                          </div>
                          <span className="text-xs text-gray-500">{activeContext.timestamp}</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{activeContext.title}</h3>
                        <p className="text-sm text-gray-600">{activeContext.content}</p>
                        
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <Badge variant="secondary">
                            <Network className="w-3 h-3 mr-1" />
                            {activeContext.connections} connections
                          </Badge>
                          {activeContext.metadata?.author && (
                            <span className="text-xs text-gray-500">
                              by {activeContext.metadata.author}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Related Context Chain */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-600">Context Chain</h4>
                        {relatedNodes.slice(0, 3).map((node, index) => (
                          <div key={node.id} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {(() => {
                                const Icon = getNodeIcon(node.type)
                                return <Icon className="w-4 h-4 text-gray-600" />
                              })()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{node.title}</p>
                              <p className="text-xs text-gray-500">{node.type} • {node.timestamp}</p>
                            </div>
                            {index < 2 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Related Nodes Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Related Nodes</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedNodes.map((node) => (
                    <button
                      key={node.id}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all hover:shadow-md",
                        "hover:scale-[1.02]",
                        getNodeColor(node.type)
                      )}
                      onClick={() => setActiveContext(node)}
                    >
                      <div className="flex items-start gap-2">
                        {(() => {
                          const Icon = getNodeIcon(node.type)
                          return <Icon className="w-4 h-4 mt-0.5" />
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{node.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{node.timestamp}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Context Note
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Record Decision
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <GitBranch className="w-4 h-4 mr-2" />
                    Link to PR/Commit
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {viewMode === 'graph' && (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <Network className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-semibold mb-2">Interactive Graph View</h3>
              <p className="text-gray-600 mb-4">
                Visual graph explorer coming soon with D3.js/vis.js integration
              </p>
              <p className="text-sm text-gray-500">
                Will show nodes, edges, and semantic clusters
              </p>
            </Card>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h3 className="text-xl font-semibold mb-2">Context Timeline</h3>
              <p className="text-gray-600 mb-4">
                Chronological view of all context events coming soon
              </p>
              <p className="text-sm text-gray-500">
                Track decisions, commits, and conversations over time
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}