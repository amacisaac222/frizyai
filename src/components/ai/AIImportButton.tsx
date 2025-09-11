import { useState } from 'react'
import { Brain, Sparkles, Wand2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'
import { AIImportModal } from './AIImportModal'

interface AIImportButtonProps {
  onImportBlocks: (blocks: any[]) => Promise<void>
  projectId: string
  projectContext?: string
  variant?: 'primary' | 'secondary' | 'floating'
  className?: string
}

export function AIImportButton({
  onImportBlocks,
  projectId,
  projectContext,
  variant = 'primary',
  className = ''
}: AIImportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleImport = async (blocks: any[]) => {
    try {
      await onImportBlocks(blocks)
      setIsModalOpen(false)
    } catch (error) {
      // Error is handled in the modal
      throw error
    }
  }

  if (variant === 'floating') {
    return (
      <>
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 group ${className}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="AI Import - Turn messy text into organized blocks"
        >
          <Brain className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          
          {/* Sparkle effects */}
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3"
            animate={{ 
              rotate: [0, 180, 360],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </motion.div>
        </motion.button>

        <AIImportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onImportBlocks={handleImport}
          projectId={projectId}
          projectContext={projectContext}
        />
      </>
    )
  }

  if (variant === 'secondary') {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          icon={Brain}
          className={`group ${className}`}
        >
          <span className="flex items-center gap-2">
            AI Import
            <Sparkles className="w-3 h-3 text-purple-500 group-hover:text-purple-600 transition-colors" />
          </span>
        </Button>

        <AIImportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onImportBlocks={handleImport}
          projectId={projectId}
          projectContext={projectContext}
        />
      </>
    )
  }

  // Primary variant
  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={`bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 group ${className}`}
        icon={Wand2}
      >
        <span className="flex items-center gap-2">
          AI Import
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </span>
      </Button>

      <AIImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportBlocks={handleImport}
        projectId={projectId}
        projectContext={projectContext}
      />
    </>
  )
}

// Quick access component for empty states
interface AIImportPromptProps {
  onImportBlocks: (blocks: any[]) => Promise<void>
  projectId: string
  projectContext?: string
  title?: string
  description?: string
}

export function AIImportPrompt({
  onImportBlocks,
  projectId,
  projectContext,
  title = "Start with AI Import",
  description = "Paste any messy text and let AI organize it into structured blocks"
}: AIImportPromptProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <motion.div
        className="text-center p-8 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl mb-4 group-hover:from-purple-200 group-hover:to-blue-200 transition-colors">
          <Brain className="w-8 h-8 text-purple-600" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {description}
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-purple-600 group-hover:text-purple-700 transition-colors">
          <Wand2 className="w-4 h-4" />
          <span>Click to get started</span>
          <Sparkles className="w-4 h-4" />
        </div>
      </motion.div>

      <AIImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportBlocks={onImportBlocks}
        projectId={projectId}
        projectContext={projectContext}
      />
    </>
  )
}