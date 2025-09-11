import { cn } from '@/utils'

interface LightningLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'white' | 'gradient'
}

export function LightningLogo({ 
  className, 
  size = 'md',
  variant = 'default' 
}: LightningLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className={cn(
      sizeClasses[size],
      'relative flex items-center justify-center',
      className
    )}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Retro gradient background */}
        <defs>
          <linearGradient id="retroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="25%" stopColor="#FFE66D" />
            <stop offset="50%" stopColor="#4ECDC4" />
            <stop offset="75%" stopColor="#95E1D3" />
            <stop offset="100%" stopColor="#A8E6CF" />
          </linearGradient>
          <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD93D" />
            <stop offset="50%" stopColor="#FF6BCB" />
            <stop offset="100%" stopColor="#6BCB77" />
          </linearGradient>
        </defs>

        {/* Background circle with retro gradient */}
        <circle 
          cx="16" 
          cy="16" 
          r="15" 
          fill="url(#retroGradient)"
          opacity="0.9"
        />

        {/* Lightning bolt */}
        <path
          d={variant === 'white' 
            ? "M19 7L11 18L14 18L13 25L21 14L18 14L19 7Z"
            : "M19 7L11 18L14 18L13 25L21 14L18 14L19 7Z"
          }
          fill={variant === 'white' ? 'white' : variant === 'gradient' ? 'url(#lightningGradient)' : '#FFD93D'}
          stroke={variant === 'white' ? 'white' : '#FF6BCB'}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Retro glow effect */}
        <circle 
          cx="16" 
          cy="16" 
          r="14" 
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          opacity="0.6"
        />
      </svg>
    </div>
  )
}

// Simplified version for favicon/small uses
export function LightningBolt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}