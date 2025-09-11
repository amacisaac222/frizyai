import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Target, 
  Zap, 
  Code, 
  Users, 
  BarChart3, 
  Plug,
  GitBranch,
  MessageSquare,
  Clock,
  CheckCircle,
  Star,
  Play,
  ArrowRight
} from 'lucide-react'
import { Button, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import { InteractiveVerticalBoard } from '@/components/boards/InteractiveVerticalBoard'
import { BlockLane, BlockStatus, type Block } from '@/lib/database.types'
import { cn } from '@/utils'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

// Feature demo blocks
const contextBlocks: Block[] = [
  {
    id: 'context-1',
    project_id: 'demo',
    created_by: 'user',
    title: 'API Decision: Use FastAPI over Flask',
    content: 'FastAPI provides automatic API documentation and better async support for our AI integrations.',
    lane: BlockLane.context,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'high',
    effort: 2,
    claude_sessions: 3,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['decision', 'api', 'architecture'],
    metadata: {}
  },
  {
    id: 'current-context',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build authentication middleware',
    content: 'Implement JWT-based auth that integrates with our user management system.',
    lane: BlockLane.current,
    status: BlockStatus.in_progress,
    progress: 60,
    priority: 'high',
    effort: 5,
    claude_sessions: 4,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['auth', 'security'],
    metadata: {}
  }
]

const trackingBlocks: Block[] = [
  {
    id: 'vision-track',
    project_id: 'demo',
    created_by: 'user',
    title: 'Build the best AI-assisted note-taking app',
    content: 'Create something that actually understands context and helps users think better, not just store information.',
    lane: BlockLane.vision,
    status: BlockStatus.in_progress,
    progress: 45,
    priority: 'high',
    effort: 10,
    claude_sessions: 8,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['vision', 'ai', 'notes'],
    metadata: {}
  },
  {
    id: 'goals-track',
    project_id: 'demo',
    created_by: 'user',
    title: 'Launch MVP with core features',
    content: 'Get basic note creation, AI suggestions, and context linking working perfectly.',
    lane: BlockLane.goals,
    status: BlockStatus.in_progress,
    progress: 70,
    priority: 'high',
    effort: 8,
    claude_sessions: 12,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['mvp', 'launch'],
    metadata: {}
  },
  {
    id: 'current-track',
    project_id: 'demo',
    created_by: 'user',
    title: 'Implement AI-powered note suggestions',
    content: 'When users type, show relevant suggestions from their existing notes using vector search.',
    lane: BlockLane.current,
    status: BlockStatus.completed,
    progress: 100,
    priority: 'medium',
    effort: 6,
    claude_sessions: 8,
    last_worked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['ai', 'features'],
    metadata: {}
  }
]

export function Features() {
  const [activeDemo, setActiveDemo] = useState<'context' | 'tracking' | 'integration'>('context')
  const [demoBlocks, setDemoBlocks] = useState<Record<string, Block[]>>({
    context: contextBlocks,
    tracking: trackingBlocks,
    integration: []
  })

  const handleBlockUpdate = (demo: string) => (blockId: string, updates: Partial<Block>) => {
    setDemoBlocks(prev => ({
      ...prev,
      [demo]: prev[demo]?.map(block => 
        block.id === blockId ? { ...block, ...updates } : block
      ) || []
    }))
  }

  const coreFeatures = [
    {
      id: 'context',
      icon: MessageSquare,
      title: 'Context Continuity',
      subtitle: 'Never start from scratch again',
      description: 'Your AI remembers everything about your project: decisions, architecture, progress, and context.',
      color: 'pink',
      benefits: [
        'Original vision and goals',
        'Key decisions and reasoning',
        'Progress on each feature',
        'Blockers and solutions',
        'Code architecture choices'
      ]
    },
    {
      id: 'tracking',
      icon: Target,
      title: 'Project Intelligence',
      subtitle: 'Stay focused on what matters',
      description: 'Visual project board that adapts to how you actually work, with smart insights and recommendations.',
      color: 'cyan',
      benefits: [
        'Automatic scope creep detection',
        'Progress tracking with realistic timelines',
        'Energy-based task recommendations',
        'Quick win identification',
        'Smart priority suggestions'
      ]
    },
    {
      id: 'integration',
      icon: Zap,
      title: 'MCP Integration',
      subtitle: 'Built for Claude Code from day one',
      description: 'Seamless Model Context Protocol integration means zero configuration and instant context injection.',
      color: 'yellow',
      benefits: [
        'Zero configuration setup',
        'Automatic context injection',
        'Real-time progress tracking',
        'Persistent memory across sessions',
        'Multi-project context switching'
      ]
    }
  ]

  const advancedFeatures = [
    {
      icon: Code,
      title: 'Vibe Coder Features',
      description: 'Tools designed for the new way of building with AI',
      items: [
        'Energy tracking and task matching',
        'Quick wins identification',
        'Brain dump mode for chaotic thoughts',
        'Session flow guidance'
      ]
    },
    {
      icon: Users,
      title: 'Real-time Collaboration',
      description: 'Build together without losing context',
      items: [
        'Shared project context',
        'Live progress updates',
        'Decision history tracking',
        'Conflict-free merging'
      ]
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Understand your development patterns',
      items: [
        'Velocity tracking over time',
        'Energy pattern analysis',
        'Productivity insights',
        'Project completion predictions'
      ]
    },
    {
      icon: Plug,
      title: 'Custom Integrations',
      description: 'Connect your entire toolchain',
      items: [
        'GitHub, Linear, Notion integration',
        'Custom MCP servers',
        'API webhooks',
        'Legacy system connections'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50/30 to-cyan-50">
      <Header />
      <div className="pt-16">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="space-y-4">
            <Badge className="gap-1 bg-gradient-to-r from-pink-100 via-yellow-100 to-cyan-100 text-gray-800 border-pink-200">
              <Star className="w-3 h-3" />
              Complete Feature Overview
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Everything you need to build with AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Frizy gives Claude Code the memory and project intelligence it needs to be your perfect development partner.
            </p>
          </div>
        </div>
      </div>

      {/* Core Features with Interactive Demos */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="space-y-16">
            {coreFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={cn(
                  "grid lg:grid-cols-2 gap-12 items-center",
                  index % 2 === 1 && "lg:grid-flow-col-dense"
                )}
              >
                {/* Content */}
                <div className={cn(
                  "space-y-6",
                  index % 2 === 1 && "lg:col-start-2"
                )}>
                  <div className="space-y-4">
                    <div className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      feature.color === 'pink' && 'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600',
                      feature.color === 'cyan' && 'bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-600',
                      feature.color === 'yellow' && 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-600'
                    )}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    
                    <div>
                      <h3 className="text-3xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-lg text-muted-foreground mb-4">{feature.subtitle}</p>
                      <p className="text-lg leading-relaxed">{feature.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Key Benefits:</h4>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    size="lg"
                    variant={activeDemo === feature.id ? 'default' : 'outline'}
                    onClick={() => setActiveDemo(feature.id as any)}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Try Interactive Demo
                  </Button>
                </div>

                {/* Interactive Demo */}
                <div className={cn(
                  "bg-white rounded-xl shadow-lg p-6",
                  index % 2 === 1 && "lg:col-start-1 lg:row-start-1"
                )}>
                  {activeDemo === feature.id ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-pink-50 to-cyan-50 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Interactive Demo:</strong> Try editing blocks, moving them around, 
                          or adding new ones. This shows how your AI sees your project context.
                        </p>
                      </div>
                      <InteractiveVerticalBoard
                        blocks={demoBlocks[feature.id] || []}
                        onBlockUpdate={handleBlockUpdate(feature.id)}
                        onBlockDelete={(id) => {
                          setDemoBlocks(prev => ({
                            ...prev,
                            [feature.id]: prev[feature.id]?.filter(b => b.id !== id) || []
                          }))
                        }}
                        onBlockMove={(id, lane) => {
                          handleBlockUpdate(feature.id)(id, { lane })
                        }}
                        onBlockCreate={(block) => {
                          const newBlock: Block = {
                            id: `demo-${Date.now()}`,
                            project_id: 'demo',
                            created_by: 'user',
                            title: block.title || 'New Block',
                            content: block.content || '',
                            lane: block.lane || BlockLane.current,
                            status: BlockStatus.not_started,
                            progress: 0,
                            priority: block.priority || 'medium',
                            effort: 3,
                            claude_sessions: 0,
                            last_worked: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            tags: [],
                            metadata: {}
                          }
                          setDemoBlocks(prev => ({
                            ...prev,
                            [feature.id]: [...(prev[feature.id] || []), newBlock]
                          }))
                        }}
                        projectId="demo"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <feature.icon className={cn(
                        'w-16 h-16 mx-auto opacity-40',
                        feature.color === 'blue' && 'text-blue-500',
                        feature.color === 'green' && 'text-green-500',
                        feature.color === 'purple' && 'text-purple-500'
                      )} />
                      <p className="text-muted-foreground">
                        Click "Try Interactive Demo" to see {feature.title} in action
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Advanced Features</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything else you need for professional AI-assisted development
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {advancedFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full text-left">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      
                      <ul className="space-y-2 text-sm">
                        {feature.items.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-2" />
                            <span className="text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-4xl font-bold">
              Ready to experience the difference?
            </h2>
            <p className="text-xl text-blue-100">
              Join developers who build faster with AI that never forgets.
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
              className="text-lg px-8 py-4 bg-white text-pink-600 hover:bg-gradient-to-r hover:from-pink-50 hover:to-yellow-50 gap-2"
            >
              Start Free Forever
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Link to="/vertical-flow">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 border-white text-white hover:bg-white/10 gap-2"
              >
                <Play className="w-5 h-5" />
                Try Full Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      </div>
      <Footer />
    </div>
  )
}