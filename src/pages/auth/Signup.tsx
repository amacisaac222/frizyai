import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignupForm } from '@/components/auth/SignupForm'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuth } from '@/contexts/AuthContext'

export function Signup() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSuccess = () => {
    // After successful signup, redirect to login
    navigate('/auth/login', { replace: true })
  }

  return (
    <AuthLayout>
      <SignupForm onSuccess={handleSuccess} />
    </AuthLayout>
  )
}