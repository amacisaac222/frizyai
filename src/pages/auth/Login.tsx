import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuth } from '@/contexts/AuthContext'

export function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the intended destination from location state, default to dashboard
  const from = location.state?.from || '/dashboard'

  useEffect(() => {
    // If user is already logged in, redirect to intended destination
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  const handleSuccess = () => {
    navigate(from, { replace: true })
  }

  return (
    <AuthLayout>
      <LoginForm onSuccess={handleSuccess} />
    </AuthLayout>
  )
}