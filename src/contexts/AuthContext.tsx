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
  }, [])

  // Sign in method
  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Demo mode for development
      if (email === 'demo@frizy.ai' && password === 'demo') {
        // Create a mock user for demo
        const mockUser = {
          id: 'demo-user-123',
          email: 'demo@frizy.ai',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { full_name: 'Demo User' },
          aud: 'authenticated',
          role: 'authenticated'
        } as any
        
        setUser(mockUser)
        setSession({ user: mockUser } as any)
        
        // Create mock DB user
        const mockDbUser = {
          id: 'demo-user-123',
          email: 'demo@frizy.ai',
          full_name: 'Demo User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any
        setDbUser(mockDbUser)
        
        return { error: null }
      }
      
      // Try real Supabase auth for production
      const result = await signIn(email, password)
      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in'
      return { error: message }
    } finally {
      setLoading(false)
    }
  }

  // Sign up method
  const handleSignUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    try {
      setLoading(true)
      const result = await signUp(email, password, metadata)
      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign up'
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