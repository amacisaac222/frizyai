import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Brain, 
  Target, 
  Zap, 
  ChevronRight, 
  Check,
  Play,
  BookOpen,
  Users,
  ArrowRight
} from 'lucide-react'
import { Modal, Button, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTour: () => void
  onCreateFirstProject: () => void
}

type OnboardingStep = 'welcome' | 'features' | 'getting-started' | 'complete'

interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  badge?: string
}

const features: Feature[] = [
  {
    icon: Brain,
    title: 'AI-Powered Organization',
    description: 'Claude AI helps break down complex projects into manageable blocks and suggests optimal workflows.',
    badge: 'New'
  },
  {
    icon: Target,
    title: 'Smart Swim Lanes',
    description: 'Organize work across Vision, Goals, Current, Next, and Context lanes for perfect project flow.',
  },
  {
    icon: Zap,
    title: 'Real-time Collaboration',
    description: 'Work together seamlessly with real-time updates, shared context, and team insights.',
  },
  {
    icon: Sparkles,
    title: 'Intelligent Insights',
    description: 'Get AI-powered suggestions for task prioritization, effort estimation, and project optimization.',
  }
]

export function WelcomeModal({ isOpen, onClose, onStartTour, onCreateFirstProject }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const { dbUser } = useAuth()
  
  // Reset to welcome step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('welcome')
    }
  }, [isOpen])

  const handleNext = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('features')
        break
      case 'features':
        setCurrentStep('getting-started')
        break
      case 'getting-started':
        setCurrentStep('complete')
        break
    }
  }

  const handleGetStarted = (action: 'tour' | 'project') => {
    if (action === 'tour') {
      onStartTour()
    } else {
      onCreateFirstProject()
    }
    onClose()
  }

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
          Welcome to Frizy AI!
        </h1>
        <p className="text-lg text-muted-foreground">
          Hey {dbUser?.full_name || 'there'}! 👋
        </p>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Ready to supercharge your productivity with AI-powered project management? 
          Let's show you what makes Frizy special.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Button onClick={handleNext} className="bg-gradient-to-r from-purple-600 to-pink-600">
          <Sparkles className="w-4 h-4 mr-2" />
          Show Me Around
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="outline" onClick={() => handleGetStarted('project')}>
          Skip to Create Project
        </Button>
      </motion.div>
    </div>
  )

  const renderFeaturesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-3">What Makes Frizy Special</h2>
        <p className="text-muted-foreground">
          Discover the features that will transform how you manage projects
        </p>
      </div>

      <div className="grid gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{feature.title}</h3>
                {feature.badge && (
                  <Badge size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    {feature.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setCurrentStep('welcome')}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next: Getting Started
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderGettingStartedStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
        <p className="text-muted-foreground">
          Choose how you'd like to begin your Frizy journey
        </p>
      </div>

      <div className="grid gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleGetStarted('tour')}
          className="p-6 border border-border rounded-lg hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-700 transition-colors">
                Take the Interactive Tour
              </h3>
              <p className="text-muted-foreground">
                3-minute walkthrough of key features with sample data
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleGetStarted('project')}
          className="p-6 border border-border rounded-lg hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-700 transition-colors">
                Create Your First Project
              </h3>
              <p className="text-muted-foreground">
                Jump right in and start organizing your work with AI assistance
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
          </div>
        </motion.button>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-purple-800 mb-1">Need Help Later?</h4>
            <p className="text-sm text-purple-700">
              Access tutorials, keyboard shortcuts, and help documentation anytime from the 
              dashboard settings menu.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={() => setCurrentStep('features')}>
          Back
        </Button>
        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
          I'll explore on my own
        </Button>
      </div>
    </div>
  )

  const getStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcomeStep()
      case 'features':
        return renderFeaturesStep()
      case 'getting-started':
        return renderGettingStartedStep()
      default:
        return null
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      className="max-w-2xl"
    >
      <div className="p-6">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {['welcome', 'features', 'getting-started'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : index < ['welcome', 'features', 'getting-started'].indexOf(currentStep)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {index < ['welcome', 'features', 'getting-started'].indexOf(currentStep) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && (
                  <div
                    className={`w-8 h-px mx-2 transition-colors ${
                      index < ['welcome', 'features', 'getting-started'].indexOf(currentStep)
                        ? 'bg-green-300'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {getStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  )
}