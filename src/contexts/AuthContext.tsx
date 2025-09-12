import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, signIn, signUp, signOut, getCurrentUser } from '@/lib/supabase'
import { userService } from '@/lib/database'
import type { User as DBUser } from '@/lib/database.types'

interface AuthState {
  // Auth state
  user: User | null
  session: Session | null
  dbUser: DBUser | null
  loading: boolean
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  
  // Profile methods
  updateProfile: (updates: Partial<DBUser>) => Promise<{ error: string | null }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Check if we're in demo mode
  const isDemoMode = import.meta.env.VITE_DEV_MODE === 'true'

  // Load user profile from database
  const loadUserProfile = async (authUser: User) => {
    try {
      const result = await userService.getCurrentUser()
      if (result.data) {
        setDbUser(result.data)
      } else if (result.error) {
        console.error('Failed to load user profile:', result.error)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        // In demo mode, create a mock user
        if (isDemoMode) {
          const demoUser = {
            id: 'demo-user-id',
            email: 'demo@frizy.ai',
            user_metadata: {
              full_name: 'Demo User'
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as unknown as User
          
          setUser(demoUser)
          setDbUser({
            id: 'demo-user-id',
            email: 'demo@frizy.ai',
            full_name: 'Demo User',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as DBUser)
          setLoading(false)
          return
        }
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        } else if (session?.user) {
          setUser(session.user)
          setSession(session)
          await loadUserProfile(session.user)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Skip auth state listener in demo mode
    if (isDemoMode) {
      return
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user)
        } else {
          setDbUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [isDemoMode])

  // Sign in method
  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // In demo mode, accept any credentials
      if (isDemoMode) {
        const demoUser = {
          id: 'demo-user-id',
          email: email || 'demo@frizy.ai',
          user_metadata: {
            full_name: 'Demo User'
          },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as unknown as User
        
        setUser(demoUser)
        setDbUser({
          id: 'demo-user-id',
          email: email || 'demo@frizy.ai',
          full_name: 'Demo User',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as DBUser)
        setLoading(false)
        return { error: null }
      }
      
      // Input validation
      if (!email || !email.includes('@')) {
        return { error: 'Please enter a valid email address' }
      }
      
      if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters long' }
      }
      
      // Attempt authentication with Supabase
      const result = await signIn(email, password)
      return { error: null }
    } catch (error) {
      let message = 'Failed to sign in'
      
      if (error instanceof Error) {
        // Handle specific Supabase auth errors
        if (error.message.includes('Invalid login credentials')) {
          message = 'Invalid email or password'
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Please check your email and confirm your account'
        } else if (error.message.includes('Too many requests')) {
          message = 'Too many login attempts. Please try again later'
        } else {
          message = error.message
        }
      }
      
      return { error: message }
    } finally {
      setLoading(false)
    }
  }

  // Sign up method
  const handleSignUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      setLoading(true)
      
      // Enhanced input validation
      if (!email || !email.includes('@') || email.length < 5) {
        return { error: 'Please enter a valid email address' }
      }
      
      if (!password || password.length < 8) {
        return { error: 'Password must be at least 8 characters long' }
      }
      
      // Password strength validation
      const hasUpperCase = /[A-Z]/.test(password)
      const hasLowerCase = /[a-z]/.test(password)
      const hasNumbers = /\d/.test(password)
      
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return { error: 'Password must contain uppercase, lowercase, and numbers' }
      }
      
      // Full name validation
      if (metadata?.full_name && metadata.full_name.trim().length < 2) {
        return { error: 'Full name must be at least 2 characters long' }
      }
      
      // Attempt registration with Supabase
      const result = await signUp(email, password, metadata)
      return { error: null }
    } catch (error) {
      let message = 'Failed to create account'
      
      if (error instanceof Error) {
        // Handle specific Supabase auth errors
        if (error.message.includes('User already registered')) {
          message = 'An account with this email already exists'
        } else if (error.message.includes('Password should be')) {
          message = 'Password does not meet security requirements'
        } else if (error.message.includes('Invalid email')) {
          message = 'Please enter a valid email address'
        } else if (error.message.includes('Signup is disabled')) {
          message = 'Account registration is temporarily disabled'
        } else {
          message = error.message
        }
      }
      
      return { error: message }
    } finally {
      setLoading(false)
    }
  }

  // Sign out method
  const handleSignOut = async () => {
    try {
      setLoading(true)
      await signOut()
      setUser(null)
      setSession(null)
      setDbUser(null)
      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out'
      return { error: message }
    } finally {
      setLoading(false)
    }
  }

  // Update profile method
  const updateProfile = async (updates: Partial<DBUser>) => {
    try {
      if (!user) {
        return { error: 'Not authenticated' }
      }

      const result = await userService.updateProfile(updates)
      if (result.error) {
        return { error: result.error }
      }

      if (result.data) {
        setDbUser(result.data)
      }

      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      return { error: message }
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    if (user) {
      await loadUserProfile(user)
    }
  }

  const value: AuthState = {
    user,
    session,
    dbUser,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    updateProfile,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}