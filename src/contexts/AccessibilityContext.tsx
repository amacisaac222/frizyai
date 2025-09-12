import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react'

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  focusElement: (selector: string) => void
  setFocusTrap: (enabled: boolean) => void
  highContrastMode: boolean
  reducedMotion: boolean
  toggleHighContrast: () => void
  keyboardNavigationMode: boolean
  setKeyboardNavigationMode: (enabled: boolean) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [highContrastMode, setHighContrastMode] = useState(false)
  const [keyboardNavigationMode, setKeyboardNavigationMode] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const politeRegionRef = useRef<HTMLDivElement>(null)

  // Detect user preferences
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setKeyboardNavigationMode(true)
      }
    }

    const handleMouseDown = () => {
      setKeyboardNavigationMode(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Apply high contrast mode to body
  useEffect(() => {
    if (highContrastMode) {
      document.body.classList.add('high-contrast')
    } else {
      document.body.classList.remove('high-contrast')
    }
  }, [highContrastMode])

  // Apply keyboard navigation mode to body
  useEffect(() => {
    if (keyboardNavigationMode) {
      document.body.classList.add('keyboard-navigation')
    } else {
      document.body.classList.remove('keyboard-navigation')
    }
  }, [keyboardNavigationMode])

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = priority === 'assertive' ? liveRegionRef.current : politeRegionRef.current
    if (region) {
      region.textContent = message
      // Clear after a delay to allow for re-announcements
      setTimeout(() => {
        if (region) region.textContent = ''
      }, 1000)
    }
  }, [])

  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
    }
  }, [])

  const setFocusTrap = useCallback((enabled: boolean) => {
    // This would implement focus trapping for modals
    // For now, we'll just add a class to the body
    if (enabled) {
      document.body.classList.add('focus-trapped')
    } else {
      document.body.classList.remove('focus-trapped')
    }
  }, [])

  const toggleHighContrast = useCallback(() => {
    setHighContrastMode(prev => !prev)
    announceToScreenReader(
      `High contrast mode ${highContrastMode ? 'disabled' : 'enabled'}`,
      'assertive'
    )
  }, [highContrastMode, announceToScreenReader])

  const value = {
    announceToScreenReader,
    focusElement,
    setFocusTrap,
    highContrastMode,
    reducedMotion,
    toggleHighContrast,
    keyboardNavigationMode,
    setKeyboardNavigationMode
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      
      {/* Screen reader live regions */}
      <div
        ref={liveRegionRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      <div
        ref={politeRegionRef}
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Hook for managing skip links
export function useSkipLinks() {
  const skipToMain = useCallback(() => {
    const mainContent = document.querySelector('#main-content, main, [role="main"]') as HTMLElement
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView()
    }
  }, [])

  const skipToNavigation = useCallback(() => {
    const nav = document.querySelector('nav, [role="navigation"]') as HTMLElement
    if (nav) {
      nav.focus()
      nav.scrollIntoView()
    }
  }, [])

  return { skipToMain, skipToNavigation }
}