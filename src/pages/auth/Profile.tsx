import { UserProfile } from '@/components/auth/UserProfile'
import { Layout } from '@/components/Layout'
import { RequireAuth } from '@/components/auth/ProtectedRoute'

export function Profile() {
  return (
    <RequireAuth>
      <Layout>
        <UserProfile />
      </Layout>
    </RequireAuth>
  )
}