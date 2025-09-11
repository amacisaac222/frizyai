import { useState } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MessageSquare, 
  Lightbulb,
  BookOpen,
  Star,
  Plus
} from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from './ui'
import { ContextItem, SessionData, AISuggestion } from '@/lib/types'

interface RightSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  currentBlockId?: string
  contextItems: ContextItem[]
  recentSessions: SessionData[]
  aiSuggestions: AISuggestion[]
  onAddContext: () => void
  onApplySuggestion: (suggestion: AISuggestion) => void
}

export function RightSidebar({
  isCollapsed,
  onToggleCollapse,
  currentBlockId,
  contextItems,
  recentSessions,
  aiSuggestions,
  onAddContext,
  onApplySuggestion
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'context' | 'sessions' | 'suggestions'>('context')

  const tabs = [
    { id: 'context' as const, label: 'Context', icon: BookOpen, count: contextItems.length },
    { id: 'sessions' as const, label: 'Sessions', icon: Clock, count: recentSessions.length },
    { id: 'suggestions' as const, label: 'AI', icon: Lightbulb, count: aiSuggestions.length }
  ]

  const getContextTypeIcon = (type: ContextItem['type']) => {
    switch (type) {
      case 'decision': return MessageSquare
      case 'insight': return Lightbulb
      case 'roadblock': return Star
      case 'solution': return MessageSquare
      case 'reference': return BookOpen
      default: return BookOpen
    }
  }

  const getContextTypeColor = (type: ContextItem['type']) => {
    switch (type) {
      case 'decision': return 'bg-blue-100 text-blue-800'
      case 'insight': return 'bg-green-100 text-green-800'
      case 'roadblock': return 'bg-red-100 text-red-800'
      case 'solution': return 'bg-purple-100 text-purple-800'
      case 'reference': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <aside className={`border-l border-border bg-card/30 transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border">
        {!isCollapsed && (
          <h3 className="font-medium">Context Panel</h3>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors ${
                      isActive
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count > 0 && (
                      <Badge size="sm" variant="secondary">
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'context' && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Context Items</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddContext}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {contextItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No context items yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contextItems.map((item) => {
                      const Icon = getContextTypeIcon(item.type)
                      return (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-start gap-2">
                            <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  size="sm"
                                  className={getContextTypeColor(item.type)}
                                >
                                  {item.type}
                                </Badge>
                                {item.isBookmarked && (
                                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {item.summary}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="p-3 space-y-3">
                <span className="text-sm font-medium">Recent Sessions</span>
                
                {recentSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No sessions yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map((session) => (
                      <Card key={session.id} className="p-3">
                        <div className="space-y-2">
                          <div className="font-medium text-sm truncate">
                            {session.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.duration} min • {session.blocksCompleted} blocks completed
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(session.startedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="p-3 space-y-3">
                <span className="text-sm font-medium">AI Suggestions</span>
                
                {aiSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No suggestions yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="font-medium text-sm">
                              {suggestion.title}
                            </div>
                            <Badge
                              size="sm"
                              variant={suggestion.confidence > 0.8 ? 'default' : 'secondary'}
                            >
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.description}
                          </p>
                          {!suggestion.isApplied && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onApplySuggestion(suggestion)}
                              className="w-full mt-2"
                            >
                              Apply Suggestion
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}