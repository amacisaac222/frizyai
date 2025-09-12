import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Target,
  Brain,
  Zap,
  Sparkles,
  ArrowDown,
  MousePointer,
  Lightbulb
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/utils'

interface TourStep {
  id: string
  target?: string // CSS selector for the element to highlight
  title: string
  content: string
  icon: React.ComponentType<{ className?: string }>
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  showPointer?: boolean
  action?: () => void
  actionLabel?: string
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard!',
    content: 'This is your command center where all the magic happens. Let\'s explore the key areas that will make you incredibly productive.',
    icon: Target,
    position: 'center'
  },
  {
    id: 'project-selector',
    target: '[data-tour="project-selector"]',
    title: 'Project Selector',
    content: 'Switch between projects instantly. Each project gets its own color-coded workspace with separate swim lanes and AI insights.',
    icon: Target,
    position: 'bottom',
    showPointer: true
  },
  {
    id: 'swim-lanes',
    target: '[data-tour="swim-lanes"]',
    title: 'AI-Powered Swim Lanes',
    content: 'Organize your work across 5 intelligent lanes: Vision (big picture), Goals (objectives), Current (active work), Next (upcoming), and Context (reference).',
    icon: Brain,
    position: 'left'
  },
  {
    id: 'stats-bar',
    target: '[data-tour="stats-bar"]',
    title: 'Live Project Stats',
    content: 'Track your progress with real-time metrics: active blocks, Claude AI sessions, and your inspiration level.',
    icon: Zap,
    position: 'bottom',
    showPointer: true
  },
  {
    id: 'ai-import',
    title: 'AI Block Creation',
    content: 'Here\'s the game-changer: paste any messy text, meeting notes, or brain dump and Claude AI will organize it into perfect project blocks automatically.',
    icon: Sparkles,
    position: 'center',
    actionLabel: 'Try AI Import',
    action: () => {
      // This will be passed down from parent to trigger AI modal
    }
  },
  {
    id: 'collaboration',
    target: '[data-tour="status-bar"]',
    title: 'Real-time Collaboration',
    content: 'See live updates, track who\'s working on what, and maintain your productivity streak. The status bar shows your current project health.',
    icon: Zap,
    position: 'top'
  }
]

interface InteractiveTourProps {
  isActive: boolean
  onComplete: () => void
  onTriggerAIImport?: () => void
}

export function InteractiveTour({ isActive, onComplete, onTriggerAIImport }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      setCurrentStep(0)
      setIsVisible(true)
      // Add tour class to body for styling
      document.body.classList.add('tour-active')
    } else {
      setIsVisible(false)
      document.body.classList.remove('tour-active')
    }

    return () => {
      document.body.classList.remove('tour-active')
    }
  }, [isActive])

  const currentStepData = tourSteps[currentStep]

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  const handleStepAction = () => {
    if (currentStepData.action) {
      currentStepData.action()
    } else if (currentStepData.id === 'ai-import' && onTriggerAIImport) {
      onTriggerAIImport()
    }
  }

  const getTooltipPosition = (step: TourStep) => {
    if (!step.target) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const element = document.querySelector(step.target)
    if (!element) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const rect = element.getBoundingClientRect()
    const tooltipOffset = 20

    switch (step.position) {
      case 'top':
        return {
          top: rect.top - tooltipOffset,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, -100%)'
        }
      case 'bottom':
        return {
          top: rect.bottom + tooltipOffset,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, 0)'
        }
      case 'left':
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - tooltipOffset,
          transform: 'translate(-100%, -50%)'
        }
      case 'right':
        return {
          top: rect.top + rect.height / 2,
          left: rect.right + tooltipOffset,
          transform: 'translate(0, -50%)'
        }
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

      {/* Spotlight effect */}
      {currentStepData.target && (
        <div
          className="fixed pointer-events-none z-[51]"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: currentStepData.target ? `
              radial-gradient(circle at ${
                document.querySelector(currentStepData.target)?.getBoundingClientRect().left +
                (document.querySelector(currentStepData.target)?.getBoundingClientRect().width || 0) / 2
              }px ${
                document.querySelector(currentStepData.target)?.getBoundingClientRect().top +
                (document.querySelector(currentStepData.target)?.getBoundingClientRect().height || 0) / 2
              }px, transparent 0%, transparent 60px, rgba(0,0,0,0.7) 120px)
            ` : 'none'
          }}
        />
      )}

      {/* Tour tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[52] max-w-sm"
          style={getTooltipPosition(currentStepData)}
        >
          <Card className="shadow-2xl border-2 border-purple-200 bg-white">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <currentStepData.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
                    <div className="text-xs text-muted-foreground">
                      Step {currentStep + 1} of {tourSteps.length}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComplete}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {currentStepData.content}
              </p>

              {/* Action button for specific steps */}
              {currentStepData.actionLabel && (
                <div className="mb-4">
                  <Button
                    onClick={handleStepAction}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {currentStepData.actionLabel}
                  </Button>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {tourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentStep
                          ? "bg-gradient-to-r from-purple-600 to-pink-600"
                          : index < currentStep
                          ? "bg-green-400"
                          : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  className={cn(
                    "flex items-center gap-2",
                    currentStep === tourSteps.length - 1
                      ? "bg-gradient-to-r from-green-600 to-emerald-600"
                      : ""
                  )}
                >
                  {currentStep === tourSteps.length - 1 ? (
                    <>
                      Complete
                      <Sparkles className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pointer arrow */}
          {currentStepData.showPointer && currentStepData.target && (
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                "absolute w-6 h-6 text-purple-600",
                currentStepData.position === 'bottom' && "-top-8 left-1/2 transform -translate-x-1/2",
                currentStepData.position === 'top' && "-bottom-8 left-1/2 transform -translate-x-1/2 rotate-180",
                currentStepData.position === 'left' && "-right-8 top-1/2 transform -translate-y-1/2 rotate-90",
                currentStepData.position === 'right' && "-left-8 top-1/2 transform -translate-y-1/2 -rotate-90"
              )}
            >
              <ArrowDown className="w-6 h-6" />
            </motion.div>
          )}

          {/* Mouse pointer for clickable elements */}
          {currentStepData.showPointer && (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -bottom-4 -right-4 text-purple-600"
            >
              <MousePointer className="w-5 h-5" />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

// CSS to add to globals.css for tour highlighting
export const tourStyles = `
.tour-active [data-tour] {
  position: relative;
  z-index: 60;
}

.tour-active [data-tour]::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid rgb(147, 51, 234);
  border-radius: 8px;
  pointer-events: none;
  animation: tour-pulse 2s infinite;
}

@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(147, 51, 234, 0); }
}
`