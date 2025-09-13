import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'
import { UnifiedDashboard } from './pages/UnifiedDashboard'
import { ContextFlow } from './pages/ContextFlow'
import { RealSessionData } from './pages/RealSessionData'
import { EnhancedSessionData } from './pages/EnhancedSessionData'
import { ScalableDataModel } from './pages/ScalableDataModel'
import { VerticalKanbanFlow } from './pages/VerticalKanbanFlow'
import { HierarchicalProjectView } from './pages/HierarchicalProjectView'
import { UnifiedProjectDashboard } from './pages/UnifiedProjectDashboard'
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
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { MCPIntegrationTest } from './pages/MCPIntegrationTest'
import { MCPIntegrationDashboard } from './pages/MCPIntegrationDashboard'
import { IDEDashboard } from './pages/IDEDashboard'
import { IDESessionDashboard } from './pages/IDESessionDashboard'

function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <Routes>
        {/* Public routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        
        {/* Demo routes (public for now) */}
        <Route path="/vertical-flow" element={<VerticalFlowDemo />} />
        <Route path="/new-home" element={<NewHome />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/session-data" element={<RealSessionData />} />
        <Route path="/enhanced-data" element={<EnhancedSessionData />} />
        <Route path="/scalable-data" element={<ScalableDataModel />} />
        
        {/* Protected routes - require authentication */}
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><IDESessionDashboard /></RequireAuth>} />
        <Route path="/projects/new" element={<RequireAuth><IDESessionDashboard /></RequireAuth>} />
        <Route path="/projects/:projectId" element={<RequireAuth><IDESessionDashboard /></RequireAuth>} />
        <Route path="/projects/:projectId/settings" element={<RequireAuth><IDESessionDashboard /></RequireAuth>} />
        <Route path="/dashboard-unified" element={<RequireAuth><UnifiedDashboard /></RequireAuth>} />
        <Route path="/dashboard-old" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/test-collaboration" element={<RequireAuth><CollaborativeTest /></RequireAuth>} />
        <Route path="/mcp-test" element={<RequireAuth><MCPIntegrationDashboard /></RequireAuth>} />
        <Route path="/ide" element={<RequireAuth><IDESessionDashboard /></RequireAuth>} />
        <Route path="/ide-old" element={<RequireAuth><IDEDashboard /></RequireAuth>} />
        
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
      </AccessibilityProvider>
    </AuthProvider>
  )
}

export default App