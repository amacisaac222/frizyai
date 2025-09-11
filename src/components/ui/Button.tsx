import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'btn',
          // Size variants
          {
            'btn-sm': size === 'sm',
            'btn-md': size === 'md', 
            'btn-lg': size === 'lg',
          },
          // Color variants
          {
            // Primary - Orange (Claude-inspired)
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow': variant === 'primary',
            
            // Secondary - Subtle gray
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            
            // Ghost - Transparent with hover
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            
            // Destructive - Red
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow': variant === 'destructive',
            
            // Outline - Border only
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
          },
          // Loading state
          {
            'opacity-50 cursor-not-allowed': loading || disabled,
          },
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }