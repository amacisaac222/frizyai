import { useState, useCallback, useEffect } from 'react'
import { 
  Plus,
  Search,
  Filter,
  LayoutGrid,
  Target,
  CheckCircle,
  Clock,
  Brain,
  Sparkles,
  ArrowRight,
  Activity,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { cn } from '@/utils'
import { Container, ContainerType } from '@/types/container'
import { useContainerStore } from '@/stores/containerStore'
import { ContainerCard } from '@/components/containers/ContainerCard'
import { initializeSampleData } from '@/data/sampleContainers'

export function EnhancedWorkspace() {
  const [activeView, setActiveView] = useState<'overview' | 'containers' | 'progress'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  
  const {
    containers,
    getFilteredContainers,
    createContainer,
    setSearchQuery: setStoreSearchQuery
  } = useContainerStore()
  
  // Initialize sample data on first render
  useEffect(() => {
    initializeSampleData()
  }, [])

  // Update store search when local search changes
  useEffect(() => {
    setStoreSearchQuery(searchQuery)
  }, [searchQuery, setStoreSearchQuery])
  
  const filteredContainers = getFilteredContainers()

  // Calculate stats
  const stats = {
    total: containers.length,
    active: containers.filter(c => c.status === 'active' || c.status === 'in-progress').length,
    completed: containers.filter(c => c.status === 'completed').length,
    blocked: containers.filter(c => c.status === 'blocked').length,
    avgProgress: containers.length > 0 ? Math.round(containers.reduce((sum, c) => sum + c.progress, 0) / containers.length) : 0
  }

  // Get recent activity
  const recentContainers = containers
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  // Group containers by type for better organization
  const containersByType = containers.reduce((acc, container) => {
    if (!acc[container.type]) acc[container.type] = []
    acc[container.type].push(container)
    return acc
  }, {} as Record<ContainerType, Container[]>)

  const handleCreateContainer = useCallback((type: ContainerType) => {
    createContainer({
      type,
      title: `New ${type}`,
      status: 'planned',
      progress: 0,
      connections: [],
      metadata: {},
      importance: 0.5,
      createdBy: 'user'
    })
  }, [createContainer])

  const handleContainerClick = useCallback((container: Container) => {
    console.log('Container clicked:', container.id)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enhanced Workspace</h1>
            <p className="text-gray-600">Context-aware productivity dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCreateContainer('goal')}
            >
              <Target className="w-4 h-4 mr-2" />
              New Goal
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateContainer('block')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Block
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'containers', label: 'All Containers', icon: LayoutGrid },
            { key: 'progress', label: 'Progress', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as typeof activeView)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeView === key
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview View */}
        {activeView === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <LayoutGrid className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Containers</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Work</p>
                      <p className="text-2xl font-bold">{stats.active}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Progress</p>
                      <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentContainers.map((container) => (
                  <div
                    key={container.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleContainerClick(container)}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      container.status === 'completed' ? 'bg-green-500' :
                      container.status === 'active' ? 'bg-blue-500' :
                      container.status === 'blocked' ? 'bg-red-500' :
                      'bg-gray-400'
                    )} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{container.title}</p>
                      <p className="text-xs text-gray-600">
                        {container.type} • {container.progress}% • {new Date(container.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {container.status}
                    </Badge>
                  </div>
                ))}
                
                {recentContainers.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { type: 'goal' as ContainerType, label: 'Create Goal', icon: Target, color: 'purple' },
                    { type: 'block' as ContainerType, label: 'Add Block', icon: Plus, color: 'blue' },
                    { type: 'decision' as ContainerType, label: 'Record Decision', icon: CheckCircle, color: 'green' },
                    { type: 'context' as ContainerType, label: 'Add Context', icon: Brain, color: 'orange' }
                  ].map(({ type, label, icon: Icon, color }) => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => handleCreateContainer(type)}
                      className="h-20 flex flex-col gap-2"
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        color === 'purple' ? 'bg-purple-100' :
                        color === 'blue' ? 'bg-blue-100' :
                        color === 'green' ? 'bg-green-100' :
                        'bg-orange-100'
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          color === 'purple' ? 'text-purple-600' :
                          color === 'blue' ? 'text-blue-600' :
                          color === 'green' ? 'text-green-600' :
                          'text-orange-600'
                        )} />
                      </div>
                      <span className="text-xs font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Containers View */}
        {activeView === 'containers' && (
          <div className="p-6 space-y-6">
            {/* Search Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search containers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Container Groups */}
            {Object.entries(containersByType).map(([type, typeContainers]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-semibold capitalize">{type}s</h3>
                  <Badge variant="secondary">{typeContainers.length}</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {typeContainers
                    .filter(container =>
                      container.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      container.description?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(container => (
                      <ContainerCard
                        key={container.id}
                        container={container}
                        onClick={handleContainerClick}
                        variant="compact"
                        className="h-fit"
                      />
                    ))}
                </div>
              </div>
            ))}

            {filteredContainers.length === 0 && (
              <div className="text-center py-12">
                <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No containers found' : 'No containers yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Create your first container to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => handleCreateContainer('goal')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Goal
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress View */}
        {activeView === 'progress' && (
          <div className="p-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Progress Overview</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-gray-600">{stats.avgProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${stats.avgProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Progress by Type */}
                  {Object.entries(containersByType).map(([type, typeContainers]) => {
                    const avgProgress = typeContainers.length > 0
                      ? Math.round(typeContainers.reduce((sum, c) => sum + c.progress, 0) / typeContainers.length)
                      : 0

                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">{type}s</span>
                          <span className="text-sm text-gray-600">{avgProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              type === 'goal' ? 'bg-purple-500' :
                              type === 'block' ? 'bg-blue-500' :
                              type === 'decision' ? 'bg-green-500' :
                              'bg-orange-500'
                            )}
                            style={{ width: `${avgProgress}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Status Distribution</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { status: 'active', label: 'Active', count: stats.active, color: 'bg-blue-500' },
                    { status: 'completed', label: 'Completed', count: stats.completed, color: 'bg-green-500' },
                    { status: 'planned', label: 'Planned', count: containers.filter(c => c.status === 'planned').length, color: 'bg-gray-500' },
                    { status: 'blocked', label: 'Blocked', count: stats.blocked, color: 'bg-red-500' }
                  ].map(({ status, label, count, color }) => (
                    <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className={cn("w-4 h-4 rounded-full mx-auto mb-2", color)} />
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-gray-600">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}