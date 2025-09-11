import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/utils'
import { BlockStatus, Priority, EnergyLevel, Complexity, ProjectMood } from '@/lib/types'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base badge styles from globals.css
          'badge',
          // Size variants
          {
            'text-xs px-2 py-0.5': size === 'sm',
            'text-xs px-2.5 py-0.5': size === 'md',
            'text-sm px-3 py-1': size === 'lg',
          },
          // Color variants
          {
            'bg-primary/10 text-primary border-primary/20': variant === 'default',
            'bg-secondary text-secondary-foreground': variant === 'secondary', 
            'bg-destructive/10 text-destructive border-destructive/20': variant === 'destructive',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'bg-green-100 text-green-800 border-green-200': variant === 'success',
            'bg-yellow-100 text-yellow-800 border-yellow-200': variant === 'warning',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

// Specialized status badges with consistent styling
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: BlockStatus
}

const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const statusConfig = {
      [BlockStatus.NOT_STARTED]: {
        variant: 'secondary' as const,
        label: 'Not Started',
        className: 'bg-gray-100 text-gray-700 border-gray-200'
      },
      [BlockStatus.IN_PROGRESS]: {
        variant: 'default' as const,
        label: 'In Progress',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      [BlockStatus.BLOCKED]: {
        variant: 'destructive' as const,
        label: 'Blocked',
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      [BlockStatus.COMPLETED]: {
        variant: 'success' as const,
        label: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [BlockStatus.ON_HOLD]: {
        variant: 'warning' as const,
        label: 'On Hold',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
    }

    const config = statusConfig[status]
    
    return (
      <Badge
        ref={ref}
        className={cn(config.className, className)}
        {...props}
      >
        <span className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {config.label}
        </span>
      </Badge>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

// Priority badge
export interface PriorityBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  priority: Priority
}

const PriorityBadge = forwardRef<HTMLDivElement, PriorityBadgeProps>(
  ({ priority, className, ...props }, ref) => {
    const priorityConfig = {
      [Priority.LOW]: {
        label: 'Low',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [Priority.MEDIUM]: {
        label: 'Medium', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      [Priority.HIGH]: {
        label: 'High',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      [Priority.URGENT]: {
        label: 'Urgent',
        className: 'bg-red-100 text-red-800 border-red-200'
      },
    }

    const config = priorityConfig[priority]
    
    return (
      <Badge
        ref={ref}
        className={cn(config.className, className)}
        {...props}
      >
        {config.label}
      </Badge>
    )
  }
)

PriorityBadge.displayName = 'PriorityBadge'

// Energy level badge for vibe coders
export interface EnergyBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  energy: EnergyLevel
}

const EnergyBadge = forwardRef<HTMLDivElement, EnergyBadgeProps>(
  ({ energy, className, ...props }, ref) => {
    const energyConfig = {
      [EnergyLevel.LOW]: {
        label: 'Low Energy',
        icon: '🪫',
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      [EnergyLevel.MEDIUM]: {
        label: 'Medium', 
        icon: '🔋',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      [EnergyLevel.HIGH]: {
        label: 'High Energy',
        icon: '🔋',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [EnergyLevel.PEAK]: {
        label: 'Peak',
        icon: '⚡',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      },
    }

    const config = energyConfig[energy]
    
    return (
      <Badge
        ref={ref}
        className={cn(config.className, className)}
        {...props}
      >
        <span className="flex items-center gap-1">
          <span className="text-xs">{config.icon}</span>
          {config.label}
        </span>
      </Badge>
    )
  }
)

EnergyBadge.displayName = 'EnergyBadge'

// Complexity badge
export interface ComplexityBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  complexity: Complexity
}

const ComplexityBadge = forwardRef<HTMLDivElement, ComplexityBadgeProps>(
  ({ complexity, className, ...props }, ref) => {
    const complexityConfig = {
      [Complexity.SIMPLE]: {
        label: 'Simple',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [Complexity.MODERATE]: {
        label: 'Moderate',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      [Complexity.COMPLEX]: {
        label: 'Complex',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      [Complexity.UNKNOWN]: {
        label: 'Unknown',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      },
    }

    const config = complexityConfig[complexity]
    
    return (
      <Badge
        ref={ref}
        className={cn(config.className, className)}
        {...props}
      >
        {config.label}
      </Badge>
    )
  }
)

ComplexityBadge.displayName = 'ComplexityBadge'

// Project mood badge
export interface MoodBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  mood: ProjectMood
}

const MoodBadge = forwardRef<HTMLDivElement, MoodBadgeProps>(
  ({ mood, className, ...props }, ref) => {
    const moodConfig = {
      [ProjectMood.EXCITED]: {
        label: 'Excited',
        icon: '🚀',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [ProjectMood.FOCUSED]: {
        label: 'Focused',
        icon: '🎯',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      [ProjectMood.STRUGGLING]: {
        label: 'Struggling',
        icon: '😤',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      },
      [ProjectMood.BURNOUT]: {
        label: 'Burnout',
        icon: '😴',
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      [ProjectMood.EXPLORING]: {
        label: 'Exploring',
        icon: '🔍',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      },
    }

    const config = moodConfig[mood]
    
    return (
      <Badge
        ref={ref}
        className={cn(config.className, className)}
        {...props}
      >
        <span className="flex items-center gap-1">
          <span className="text-xs">{config.icon}</span>
          {config.label}
        </span>
      </Badge>
    )
  }
)

MoodBadge.displayName = 'MoodBadge'

export {
  Badge,
  StatusBadge,
  PriorityBadge,
  EnergyBadge,
  ComplexityBadge,
  MoodBadge,
}