import { useState, useEffect } from 'react'
import { User, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { PresenceData } from '@/lib/realtime'

interface PresenceIndicatorProps {
  presenceData: Map<string, PresenceData>
  currentUserId: string
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  className?: string
}

export function PresenceIndicator({ 
  presenceData, 
  currentUserId, 
  connectionStatus,
  className = '' 
}: PresenceIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Filter out current user from presence
  const otherUsers = Array.from(presenceData.values()).filter(
    user => user.user_id !== currentUserId
  )

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-3 h-3 text-green-500" />
      case 'connecting':
        return <Wifi className="w-3 h-3 text-yellow-500 animate-pulse" />
      case 'disconnected':
        return <WifiOff className="w-3 h-3 text-gray-400" />
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return `${otherUsers.length} online`
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Offline'
      case 'error':
        return 'Connection error'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'connecting':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'disconnected':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Status Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        
        {/* User Avatars */}
        {otherUsers.length > 0 && connectionStatus === 'connected' && (
          <div className="flex -space-x-2">
            {otherUsers.slice(0, 3).map((user, index) => (
              <UserAvatar
                key={user.user_id}
                user={user}
                size="sm"
                className={`ring-2 ring-white z-${10 - index}`}
              />
            ))}
            {otherUsers.length > 3 && (
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 ring-2 ring-white">
                +{otherUsers.length - 3}
              </div>
            )}
          </div>
        )}
      </button>

      {/* Detailed Presence Panel */}
      {showDetails && connectionStatus === 'connected' && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-border rounded-lg shadow-lg p-4 z-50">
          <h3 className="font-medium text-sm mb-3">Active Users</h3>
          
          {otherUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">You're working alone</p>
          ) : (
            <div className="space-y-2">
              {otherUsers.map(user => (
                <UserPresenceItem key={user.user_id} user={user} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}

interface UserAvatarProps {
  user: PresenceData
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  }

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      const names = name.trim().split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    return email[0].toUpperCase()
  }

  const getAvatarColor = (userId: string) => {
    // Generate consistent color based on user ID
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ]
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(user.user_id)} ${className}`}
      title={`${user.user_name} (${user.user_email})`}
    >
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.user_name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{getInitials(user.user_name, user.user_email)}</span>
      )}
    </div>
  )
}

interface UserPresenceItemProps {
  user: PresenceData
}

function UserPresenceItem({ user }: UserPresenceItemProps) {
  const getTimeSince = (timestamp: string) => {
    const now = new Date()
    const lastSeen = new Date(timestamp)
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)

    if (diffSeconds < 30) {
      return 'Just now'
    } else if (diffMinutes < 1) {
      return `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else {
      const diffHours = Math.floor(diffMinutes / 60)
      return `${diffHours}h ago`
    }
  }

  const isActive = () => {
    const now = new Date()
    const lastSeen = new Date(user.last_seen)
    const diffMs = now.getTime() - lastSeen.getTime()
    return diffMs < 60000 // Active if seen within last minute
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <UserAvatar user={user} size="sm" />
        {isActive() && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.user_name}</p>
        <p className="text-xs text-muted-foreground">
          {getTimeSince(user.last_seen)}
        </p>
      </div>

      {user.active_block && (
        <Badge variant="secondary" size="sm">
          Editing
        </Badge>
      )}
    </div>
  )
}