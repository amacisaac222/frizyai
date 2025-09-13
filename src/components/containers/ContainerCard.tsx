import { useState } from 'react'
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
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Users,
  Calendar,
  Zap,
  Eye,
  Link2,
  Edit3,
  Trash2
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { cn } from '@/utils'
import { Container, ContainerType, ContainerStatus } from '@/types/container'
import { useContainerStore } from '@/stores/containerStore'

interface ContainerCardProps {
  container: Container
  variant?: 'default' | 'compact' | 'detailed'
  showConnections?: boolean
  expandable?: boolean
  onEdit?: (container: Container) => void
  onDelete?: (container: Container) => void
  onClick?: (container: Container) => void
  className?: string
}

const getTypeIcon = (type: ContainerType) => {
  switch (type) {
    case 'project': return Target
    case 'block': return Brain
    case 'decision': return Zap
    case 'context': return MessageSquare
    case 'event': return GitCommit
    case 'trace': return Code
    default: return Brain
  }
}

const getTypeColor = (type: ContainerType) => {
  switch (type) {
    case 'project': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'block': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'decision': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'context': return 'bg-green-100 text-green-700 border-green-200'
    case 'event': return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'trace': return 'bg-orange-100 text-orange-700 border-orange-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const getStatusIcon = (status: ContainerStatus) => {
  switch (status) {
    case 'completed': return CheckCircle
    case 'active': 
    case 'in-progress': return Clock
    case 'blocked': return AlertCircle
    case 'planned': return Calendar
    case 'archived': return Eye
    default: return Clock
  }
}

const getStatusColor = (status: ContainerStatus) => {
  switch (status) {
    case 'completed': return 'text-green-600'
    case 'active':
    case 'in-progress': return 'text-blue-600'
    case 'blocked': return 'text-red-600'
    case 'planned': return 'text-gray-600'
    case 'archived': return 'text-gray-400'
    default: return 'text-gray-600'
  }
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500'
    case 'high': return 'bg-orange-500'
    case 'medium': return 'bg-yellow-500'
    case 'low': return 'bg-green-500'
    default: return 'bg-gray-300'
  }
}

export function ContainerCard({ 
  container, 
  variant = 'default',
  showConnections = true,
  expandable = true,
  onEdit,
  onDelete,
  onClick,
  className 
}: ContainerCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const { 
    expandedContainerIds, 
    toggleExpandedContainer, 
    getConnectedContainers,
    getContainer 
  } = useContainerStore()
  
  const isExpanded = expandedContainerIds.includes(container.id)
  const TypeIcon = getTypeIcon(container.type)
  const StatusIcon = getStatusIcon(container.status)
  const connectedContainers = showConnections ? getConnectedContainers(container.id, 1) : []
  
  const handleCardClick = () => {
    if (onClick) {
      onClick(container)
    } else if (expandable) {
      toggleExpandedContainer(container.id)
    }
  }

  const handleMenuAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    
    switch (action) {
      case 'edit':
        onEdit?.(container)
        break
      case 'delete':
        onDelete?.(container)
        break
    }
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'Unknown'
    }
    
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return dateObj.toLocaleDateString()
  }

  if (variant === 'compact') {
    return (
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-md transition-all border-l-4",
          getTypeColor(container.type).split(' ')[2], // Get border color
          className
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn("p-1 rounded", getTypeColor(container.type))}>
                <TypeIcon className="w-3 h-3" />
              </div>
              <span className="font-medium truncate">{container.title}</span>
              <StatusIcon className={cn("w-3 h-3", getStatusColor(container.status))} />
            </div>
            {container.metadata.priority && (
              <div className={cn("w-2 h-2 rounded-full ml-2", getPriorityColor(container.metadata.priority))} />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all",
        isExpanded && "ring-2 ring-purple-200",
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", getTypeColor(container.type))}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{container.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn("text-xs", getStatusColor(container.status))}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {container.status}
                </Badge>
                {container.metadata.priority && (
                  <Badge variant="outline" className="text-xs">
                    <div className={cn("w-2 h-2 rounded-full mr-1", getPriorityColor(container.metadata.priority))} />
                    {container.metadata.priority}
                  </Badge>
                )}
                {container.metadata.tags?.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {expandable && (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
              
              {showMenu && (
                <div className="absolute right-0 top-7 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-32">
                  <button
                    className="w-full px-3 py-1 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                    onClick={(e) => handleMenuAction('edit', e)}
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    className="w-full px-3 py-1 text-sm text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                    onClick={(e) => handleMenuAction('delete', e)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        {container.progress > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{container.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-purple-600 h-1 rounded-full transition-all"
                style={{ width: `${container.progress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {container.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{container.description}</p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {container.metadata.assignee && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {container.metadata.assignee}
              </div>
            )}
            {container.metadata.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(container.metadata.dueDate).toLocaleDateString()}
              </div>
            )}
            {container.connections.length > 0 && (
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {container.connections.length}
              </div>
            )}
          </div>
          <span>{formatDate(container.updatedAt)}</span>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t">
            {/* Business value */}
            {container.metadata.businessValue && (
              <div className="mb-3">
                <h4 className="text-sm font-medium mb-1">Business Value</h4>
                <p className="text-sm text-gray-600">{container.metadata.businessValue}</p>
              </div>
            )}

            {/* Success criteria */}
            {container.metadata.successCriteria && container.metadata.successCriteria.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium mb-1">Success Criteria</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {container.metadata.successCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 mt-0.5 text-green-500" />
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Connected containers */}
            {showConnections && connectedContainers.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium mb-2">Connected ({connectedContainers.length})</h4>
                <div className="space-y-1">
                  {connectedContainers.slice(0, 3).map(connected => {
                    const ConnectedIcon = getTypeIcon(connected.type)
                    return (
                      <div key={connected.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <ConnectedIcon className="w-3 h-3" />
                        <span className="truncate">{connected.title}</span>
                      </div>
                    )
                  })}
                  {connectedContainers.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{connectedContainers.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All tags */}
            {container.metadata.tags && container.metadata.tags.length > 2 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {container.metadata.tags.slice(2).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}