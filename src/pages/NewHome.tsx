import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, 
  Play, 
  Sparkles, 
  Brain, 
  Target, 
  Zap, 
  GitBranch,
  Users,
  CheckCircle,
  Star,
  Code,
  MessageSquare,
  Clock,
  BookOpen,
  Flag
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { InteractiveVerticalBoard } from '@/components/boards/InteractiveVerticalBoard'
import { BlockLane, BlockStatus, type Block } from '@/lib/database.types'
import { cn } from '@/utils'

// Mock demo blocks for homepage demonstration
const mockDemoBlocks: Block[] = [
  {
    id: 'demo-1',
    project_id: 'homepage-demo',
    created_by: 'demo-user',
    title: 'Build Frizy MVP',
    content: 'Create the core features for the AI-powered project management platform',
    lane: BlockLane.current,
    status: BlockStatus.in_progress,
    progress: 75,
    priority: 'high',
    effort: 20,
    claude_sessions: 5,
    last_worked: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    related_session_ids: [],
    energy_level: 'high',
    complexity: 'complex',
    inspiration: 8,
    mood: 'focused',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ['mvp', 'core-features', 'ai'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'demo-2',
    project_id: 'homepage-demo',
    created_by: 'demo-user',
    title: 'Design retro UI system',
    content: 'Create the pink/yellow/cyan gradient design system with lightning bolt branding',
    lane: BlockLane.current,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'medium',
    effort: 8,
    claude_sessions: 3,
    last_worked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    related_session_ids: [],
    energy_level: 'peak',
    complexity: 'moderate',
    inspiration: 9,
    mood: 'excited',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['design', 'retro', 'ui-system'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'demo-3',
    project_id: 'homepage-demo',
    created_by: 'demo-user',
    title: 'Launch to 1000 users',
    content: 'Scale platform and marketing to reach first 1000 active users',
    lane: BlockLane.goals,
    status: BlockStatus.not_started,
    progress: 0,
    priority: 'urgent',
    effort: 40,
    claude_sessions: 0,
    last_worked: null,
    related_session_ids: [],
    energy_level: 'medium',
    complexity: 'complex',
    inspiration: 7,
    mood: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['growth', 'marketing', 'scale'],
    dependencies: ['demo-1'],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  },
  {
    id: 'demo-4',
    project_id: 'homepage-demo',
    created_by: 'demo-user',
    title: 'AI context research',
    content: 'Research best practices for maintaining AI context across long coding sessions',
    lane: BlockLane.context,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'low',
    effort: 12,
    claude_sessions: 8,
    last_worked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    related_session_ids: [],
    energy_level: 'medium',
    complexity: 'moderate',
    inspiration: 6,
    mood: 'motivated',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['research', 'ai', 'context'],
    dependencies: [],
    blocked_by: [],
    subtasks: [],
    ai_suggestions: []
  }
]
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LightningLogo, LightningBolt } from '@/components/ui/LightningLogo'

// Demo blocks for the interactive showcase
const demoBlocks: Block[] = [
  {
    id: 'vision-demo',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build an AI-native todo app that actually works',
    content: 'Create something that understands my chaotic workflow and helps me stay focused without being annoying.',
    lane: BlockLane.vision,
    status: BlockStatus.in_progress,
    progress: 40,
    priority: 'high',
    effort: 8,
    claude_sessions: 3,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['vision', 'ai', 'productivity'],
    metadata: {}
  },
  {
    id: 'context-demo',
    project_id: 'demo',
    created_by: 'user',
    title: 'Key Decision: Use React + Claude Code integration',
    content: 'After trying several approaches, React with direct MCP integration gives us the flexibility we need while keeping the AI context rich.',
    lane: BlockLane.context,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'medium',
    effort: 2,
    claude_sessions: 2,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['decision', 'architecture'],
    metadata: {}
  },
  {
    id: 'current-demo',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build the task creation flow',
    content: 'Users should be able to quickly add tasks without friction. Focus on speed and natural language input.',
    lane: BlockLane.current,
    status: BlockStatus.in_progress,
    progress: 75,
    priority: 'high',
    effort: 5,
    claude_sessions: 4,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['feature', 'ui'],
    metadata: {}
  }
]

export function NewHome() {
  const [isVisible, setIsVisible] = useState(false)
  const [demoMode, setDemoMode] = useState<'static' | 'interactive'>('static')
  const [blocks, setBlocks] = useState<Block[]>(demoBlocks)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleBlockUpdate = (blockId: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ))
  }

  const handleBlockDelete = (blockId: string) => {
    setBlocks(prev => prev.filter(block => block.id !== blockId))
  }

  const handleBlockMove = (blockId: string, toLane: BlockLane) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, lane: toLane } : block
    ))
  }

  const handleBlockCreate = (newBlock: Partial<Block>) => {
    const block: Block = {
      id: `demo-${Date.now()}`,
      project_id: 'demo',
      created_by: 'user',
      title: newBlock.title || 'New Block',
      content: newBlock.content || '',
      lane: newBlock.lane || BlockLane.current,
      status: newBlock.status || BlockStatus.not_started,
      progress: 0,
      priority: newBlock.priority || 'medium',
      effort: 3,
      claude_sessions: 0,
      last_worked: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
      metadata: {}
    }
    setBlocks(prev => [...prev, block])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50/30 to-cyan-50">
      <Header />
      <div className="pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-yellow-500/10 to-cyan-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            <div className="space-y-4">
              <Badge className="mx-auto gap-1 bg-gradient-to-r from-pink-100 via-yellow-100 to-cyan-100 text-gray-800 border-pink-200">
                <LightningBolt className="w-3 h-3 text-pink-600" />
                AI-Native Project Management
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                Turn any codebase into an
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 block animate-retro-gradient bg-300">
                  AI-native workspace
                </span>
                <span className="text-2xl md:text-3xl font-normal text-muted-foreground block mt-2">
                  in minutes
                </span>
              </h1>
            </div>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Your AI remembers everything about your project. No more context loss, no more starting over. 
              <strong className="text-gray-900"> Built for vibe coders who want to stay in the flow.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="text-lg px-8 py-4 gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 hover:from-cyan-500 hover:via-pink-500 hover:to-yellow-500 text-white border-0 animate-retro-gradient bg-300">
                Start Building for Free
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Link to="/vertical-flow">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4 gap-2 bg-white/80 backdrop-blur-sm hover:bg-white border-2 hover:border-pink-500 hover:text-pink-500 transition-all duration-300"
                >
                  <Play className="w-5 h-5" />
                  Watch 2-min Demo
                </Button>
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <Link to="/features">
                <Button variant="ghost" size="sm" className="gap-1 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 hover:from-cyan-500 hover:via-pink-500 hover:to-yellow-500">
                  View All Features
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
              <Link to="/vertical-flow">
                <Button variant="ghost" size="sm" className="gap-1 text-purple-600 hover:text-purple-700">
                  Try Interactive Demo
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground pt-8"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                2,847 projects created
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                89% faster context restoration
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                3.2x more projects completed
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement - Board Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">
                AI coding tools are amazing...
                <span className="bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 bg-clip-text text-transparent block">until they forget everything</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Every new session starts from zero. Sound familiar?
              </p>
            </div>

            {/* Problem Cards in Board Layout - Updated with Retro Colors */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: MessageSquare,
                  title: 'Context Loss',
                  description: '"What were we working on again?" Every new session starts from zero',
                  color: 'retro-pink'
                },
                {
                  icon: GitBranch,
                  title: 'Scope Creep', 
                  description: 'Started building a login form, now you\'re redesigning the entire database',
                  color: 'retro-yellow'
                },
                {
                  icon: Clock,
                  title: 'Progress Tracking',
                  description: 'No idea how close you are to shipping or what\'s actually done',
                  color: 'retro-cyan'
                },
                {
                  icon: Target,
                  title: 'Vision Drift',
                  description: 'Your original idea got lost somewhere in the 47th ChatGPT conversation',
                  color: 'retro-purple'
                }
              ].map((problem, index) => (
                <motion.div
                  key={problem.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className={cn(
                        'w-12 h-12 rounded-lg mx-auto flex items-center justify-center',
                        problem.color === 'retro-pink' && 'bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 text-white',
                        problem.color === 'retro-yellow' && 'bg-gradient-to-br from-yellow-500 via-cyan-500 to-pink-500 text-white',
                        problem.color === 'retro-cyan' && 'bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white',
                        problem.color === 'retro-purple' && 'bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 text-white'
                      )}>
                        <problem.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold">{problem.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {problem.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-50 rounded-xl p-8 max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-1 justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-xl italic text-gray-700 mb-4">
                "I love Claude Code, but I spend half my time re-explaining my project every session. There has to be a better way."
              </blockquote>
              <cite className="text-sm font-medium text-gray-900">
                — Sarah K., Full-stack Developer
              </cite>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-20 bg-gradient-to-br from-pink-50 via-yellow-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">
                Finally, an AI that
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 block">
                  gets your project
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Experience the difference when your AI remembers everything. Try our interactive demo:
              </p>
            </div>

            {/* Interactive Demo Board */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-xl p-4 md:p-8 max-w-6xl mx-auto"
            >
              <div className="text-left bg-gradient-to-r from-pink-50 via-yellow-50 to-cyan-50 rounded-lg p-4 border border-pink-200 mb-6">
                <p className="text-sm text-gray-800">
                  <strong>✨ Try it yourself:</strong> Drag blocks between swim lanes, click to edit, experience real-time project management.
                </p>
              </div>
              <InteractiveVerticalBoard 
                blocks={mockDemoBlocks}
                projectId="homepage-demo"
                onBlockCreate={(block) => console.log('Demo block created:', block)}
                onBlockUpdate={(id, updates) => console.log('Demo block updated:', id, updates)}
                onBlockDelete={(id) => console.log('Demo block deleted:', id)}
                onBlockMove={(id, lane) => console.log('Demo block moved:', id, lane)}
              />
            </motion.div>

            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              This is your project board. Your AI sees this context in every conversation, 
              so it always knows what you're building and where you left off.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Board Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500">
                Core Features
              </span>
            </h2>

            <div className="grid lg:grid-cols-2 gap-12 text-left">
              {[
                {
                  icon: MessageSquare,
                  title: 'Never Lose Context Again',
                  description: 'Your AI remembers every decision, every conversation, every breakthrough. Pick up exactly where you left off, every time.',
                  color: 'pink'
                },
                {
                  icon: Target,
                  title: 'Stay On Track',
                  description: 'Visual project board keeps you focused on what matters. See your progress, catch scope creep early, celebrate wins.',
                  color: 'cyan'
                },
                {
                  icon: Zap,
                  title: 'MCP-Native Integration',
                  description: 'Built specifically for Claude Code with seamless Model Context Protocol integration. No setup, no configuration headaches.',
                  color: 'yellow'
                },
                {
                  icon: Users,
                  title: 'Vibe Coder Friendly',
                  description: 'Designed for developers who trust the vibes. Track energy levels, celebrate quick wins, maintain momentum.',
                  color: 'purple'
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex gap-6"
                >
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center',
                    feature.color === 'pink' && 'bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 text-white',
                    feature.color === 'cyan' && 'bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white',
                    feature.color === 'yellow' && 'bg-gradient-to-br from-yellow-500 via-cyan-500 to-pink-500 text-white',
                    feature.color === 'purple' && 'bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 text-white'
                  )}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 text-white animate-retro-gradient bg-300">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to build with AI that remembers?
            </h2>
            <p className="text-xl text-white/90">
              Join thousands of developers who never lose context again.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-white text-gray-800 hover:bg-gray-50 gap-2"
            >
              Start Free Forever
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4 border-white text-white hover:bg-white/10 gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Join Discord Community
            </Button>
          </motion.div>

          <p className="text-sm text-white/75">
            No credit card required • Set up in 5 minutes • Cancel anytime
          </p>
        </div>
      </section>
      </div>
      <Footer />
    </div>
  )
}

// Static demo board for non-interactive view 
interface StaticDemoBoardProps {
  blocks: Block[]
}

function StaticDemoBoard({ blocks }: StaticDemoBoardProps) {
  const laneConfigs = [
    { id: BlockLane.vision, title: 'Vision', icon: Target, color: 'pink' },
    { id: BlockLane.context, title: 'Context', icon: BookOpen, color: 'cyan' },
    { id: BlockLane.goals, title: 'Goals', icon: Flag, color: 'purple' },
    { id: BlockLane.current, title: 'Current Sprint', icon: Zap, color: 'yellow' },
    { id: BlockLane.next, title: 'Next Sprint', icon: Clock, color: 'retro-gradient' }
  ]

  const blocksByLane = blocks.reduce((acc, block) => {
    if (!acc[block.lane]) acc[block.lane] = []
    acc[block.lane].push(block)
    return acc
  }, {} as Record<BlockLane, Block[]>)

  return (
    <div className="space-y-6">
      {laneConfigs.map((config) => {
        const laneBlocks = blocksByLane[config.id] || []
        const Icon = config.icon

        return (
          <Card key={config.id} className="text-left">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  config.color === 'pink' && 'bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 text-white',
                  config.color === 'cyan' && 'bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white',
                  config.color === 'purple' && 'bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 text-white',
                  config.color === 'yellow' && 'bg-gradient-to-br from-yellow-500 via-cyan-500 to-pink-500 text-white',
                  config.color === 'retro-gradient' && 'bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 text-white'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold">{config.title}</h3>
                <Badge variant="secondary">{laneBlocks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {laneBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-3 bg-gradient-to-r from-pink-50 via-yellow-50 to-cyan-50 rounded-lg border-l-4 border-pink-500"
                  >
                    <h4 className="font-medium text-sm">{block.title}</h4>
                    {block.content && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {block.content}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <Badge variant="outline" size="sm">
                        {block.status.replace('_', ' ')}
                      </Badge>
                      {block.progress > 0 && (
                        <span className="text-muted-foreground">
                          {block.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}