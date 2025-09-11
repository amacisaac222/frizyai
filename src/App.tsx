import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { DesignSystem } from './pages/DesignSystem'
import { CollaborativeTest } from './pages/CollaborativeTest'
import { VerticalFlowDemo } from './pages/VerticalFlowDemo'
import { NewHome } from './pages/NewHome'
import { Features } from './pages/Features'
import { Pricing } from './pages/Pricing'
import { Login } from './pages/auth/Login'
import { Signup } from './pages/auth/Signup'
import { Profile } from './pages/auth/Profile'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/auth'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        
        {/* Demo routes (public for now) */}
        <Route path="/vertical-flow" element={<VerticalFlowDemo />} />
        <Route path="/new-home" element={<NewHome />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        
        {/* Protected routes - require authentication */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/test-collaboration" element={<RequireAuth><CollaborativeTest /></RequireAuth>} />
        
        {/* Default layout routes */}
        <Route path="*" element={
          <Routes>
            <Route path="/" element={<NewHome />} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="/old-home" element={
              <Layout>
                <Home />
              </Layout>
            } />
          </Routes>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App