import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PresenceData } from '@/lib/realtime'

interface LiveCursorProps {
  user: PresenceData
  position: { x: number; y: number }
  className?: string
}

export function LiveCursor({ user, position, className = '' }: LiveCursorProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Hide cursor after inactivity
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(false)
    }, 3000) // Hide after 3 seconds of inactivity

    return () => clearTimeout(timeout)
  }, [position])

  // Show cursor when position changes
  useEffect(() => {
    setIsVisible(true)
  }, [position.x, position.y])

  const getAvatarColor = (userId: string) => {
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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed pointer-events-none z-50 ${className}`}
          style={{
            left: position.x,
            top: position.y,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {/* Cursor SVG */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-lg"
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={getAvatarColor(user.user_id).replace('bg-', '#')}
              stroke="white"
              strokeWidth="1"
            />
          </svg>

          {/* User label */}
          <motion.div
            className={`ml-2 mt-1 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap ${getAvatarColor(user.user_id)}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {user.user_name || user.user_email.split('@')[0]}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface CollaborativeIndicatorProps {
  users: PresenceData[]
  blockId: string
  currentUserId: string
  className?: string
}

export function CollaborativeIndicator({ 
  users, 
  blockId, 
  currentUserId, 
  className = '' 
}: CollaborativeIndicatorProps) {
  // Filter users actively editing this block
  const activeUsers = users.filter(
    user => user.user_id !== currentUserId && user.active_block === blockId
  )

  if (activeUsers.length === 0) {
    return null
  }

  return (
    <motion.div
      className={`absolute top-2 right-2 flex items-center gap-1 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {/* Pulsing indicator */}
      <motion.div
        className="w-2 h-2 bg-green-500 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* User avatars */}
      <div className="flex -space-x-1">
        {activeUsers.slice(0, 2).map((user) => (
          <UserMiniAvatar key={user.user_id} user={user} />
        ))}
        {activeUsers.length > 2 && (
          <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 ring-1 ring-white">
            +{activeUsers.length - 2}
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface UserMiniAvatarProps {
  user: PresenceData
}

function UserMiniAvatar({ user }: UserMiniAvatarProps) {
  const getAvatarColor = (userId: string) => {
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

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      return name.trim()[0].toUpperCase()
    }
    return email[0].toUpperCase()
  }

  return (
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ring-1 ring-white ${getAvatarColor(user.user_id)}`}
      title={`${user.user_name} is editing`}
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

interface ConflictIndicatorProps {
  hasConflict: boolean
  conflictMessage?: string
  onResolve?: () => void
  className?: string
}

export function ConflictIndicator({ 
  hasConflict, 
  conflictMessage, 
  onResolve, 
  className = '' 
}: ConflictIndicatorProps) {
  if (!hasConflict) {
    return null
  }

  return (
    <motion.div
      className={`flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <motion.div
        className="w-2 h-2 bg-yellow-500 rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.6, 1]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <span className="flex-1">
        {conflictMessage || 'Changes conflict with another user'}
      </span>
      
      {onResolve && (
        <button
          onClick={onResolve}
          className="text-yellow-700 hover:text-yellow-900 font-medium"
        >
          Resolve
        </button>
      )}
    </motion.div>
  )
}