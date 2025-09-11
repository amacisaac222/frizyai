import { useState, useCallback, useEffect } from 'react'
import { Brain, Sparkles, Loader2, Check, X, Edit3, Wand2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal, Button, Textarea, Select, SelectOption, Badge, Card, CardContent } from '@/components/ui'
import { analyzeAndSuggestBlocks, createDemoSuggestions, IMPORT_MODES, type ImportMode, type SuggestedBlock, type AnalysisResult } from '@/lib/claude'
import { convertSuggestedBlocksToInserts } from '@/lib/claude'

interface AIImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportBlocks: (blocks: any[]) => Promise<void>
  projectId: string
  projectContext?: string
}

type ImportStep = 'input' | 'analyzing' | 'review' | 'importing' | 'complete'

export function AIImportModal({
  isOpen,
  onClose,
  onImportBlocks,
  projectId,
  projectContext
}: AIImportModalProps) {
  const [step, setStep] = useState<ImportStep>('input')
  const [inputText, setInputText] = useState('')
  const [selectedMode, setSelectedMode] = useState<ImportMode>('brain-dump')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set())
  const [editingBlock, setEditingBlock] = useState<string | null>(null)
  const [editedBlocks, setEditedBlocks] = useState<Map<string, SuggestedBlock>>(new Map())
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('input')
      setInputText('')
      setSelectedMode('brain-dump')
      setAnalysisResult(null)
      setSelectedBlocks(new Set())
      setEditingBlock(null)
      setEditedBlocks(new Map())
      setError(null)
    }
  }, [isOpen])

  // Create mode options for select
  const modeOptions: SelectOption[] = Object.entries(IMPORT_MODES).map(([key, config]) => ({
    value: key,
    label: `${config.icon} ${config.name}`,
    description: config.description
  }))

  // Handle AI analysis
  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze')
      return
    }

    setStep('analyzing')
    setError(null)

    try {
      let result: AnalysisResult

      // Check if we have an API key, otherwise use demo
      if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key') {
        // Use demo suggestions
        await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API delay
        result = createDemoSuggestions(inputText, selectedMode)
      } else {
        // Use real OpenAI API
        result = await analyzeAndSuggestBlocks(inputText, selectedMode, projectContext)
      }

      setAnalysisResult(result)
      // Select all blocks by default
      setSelectedBlocks(new Set(result.suggestions.map(s => s.id)))
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze text')
      setStep('input')
    }
  }, [inputText, selectedMode, projectContext])

  // Toggle block selection
  const toggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return newSet
    })
  }, [])

  // Handle block editing
  const handleEditBlock = useCallback((block: SuggestedBlock) => {
    setEditedBlocks(prev => new Map(prev).set(block.id, { ...block }))
    setEditingBlock(block.id)
  }, [])

  const handleSaveEdit = useCallback((blockId: string, updates: Partial<SuggestedBlock>) => {
    setEditedBlocks(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(blockId) || analysisResult!.suggestions.find(s => s.id === blockId)!
      newMap.set(blockId, { ...existing, ...updates })
      return newMap
    })
    setEditingBlock(null)
  }, [analysisResult])

  // Get final block (edited version if exists, otherwise original)
  const getFinalBlock = useCallback((blockId: string): SuggestedBlock => {
    const edited = editedBlocks.get(blockId)
    if (edited) return edited
    return analysisResult!.suggestions.find(s => s.id === blockId)!
  }, [editedBlocks, analysisResult])

  // Handle import
  const handleImport = useCallback(async () => {
    if (!analysisResult || selectedBlocks.size === 0) return

    setStep('importing')
    setError(null)

    try {
      const selectedSuggestions = Array.from(selectedBlocks).map(id => getFinalBlock(id))
      const blockInserts = convertSuggestedBlocksToInserts(selectedSuggestions, projectId)
      
      await onImportBlocks(blockInserts)
      setStep('complete')
      
      // Auto-close after success
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import blocks')
      setStep('review')
    }
  }, [analysisResult, selectedBlocks, getFinalBlock, projectId, onImportBlocks, onClose])

  const renderInputStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl mb-4">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-semibold mb-2">AI-Powered Import</h2>
        <p className="text-muted-foreground">
          Paste any messy text and watch AI organize it into structured blocks
        </p>
      </div>

      {/* Mode Selection */}
      <div>
        <Select
          label="Import Mode"
          options={modeOptions}
          value={selectedMode}
          onChange={(value) => setSelectedMode(value as ImportMode)}
          helperText={IMPORT_MODES[selectedMode].focusAreas.join(' • ')}
        />
      </div>

      {/* Text Input */}
      <div>
        <Textarea
          label="Your Text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Paste your ${IMPORT_MODES[selectedMode].name.toLowerCase()} here...

Examples:
• Meeting notes with scattered action items
• Random thoughts and ideas
• Research findings and insights
• Goals and project plans
• Any messy text that needs organizing`}
          className="min-h-[200px] font-mono text-sm"
          maxLength={5000}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{inputText.length}/5000 characters</span>
          <span>{inputText.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )

  const renderAnalyzingStep = () => (
    <div className="text-center py-12">
      <motion.div
        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl mb-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles className="w-8 h-8 text-white" />
      </motion.div>
      
      <h3 className="text-lg font-semibold mb-2">AI is analyzing your text...</h3>
      <p className="text-muted-foreground mb-6">
        Understanding content, extracting tasks, and organizing blocks
      </p>
      
      {/* Progress indicators */}
      <div className="space-y-3 text-sm text-muted-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          Parsing and understanding content
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex items-center justify-center gap-2"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          Extracting actionable items
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="flex items-center justify-center gap-2"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          Organizing and prioritizing blocks
        </motion.div>
      </div>
    </div>
  )

  const renderReviewStep = () => {
    if (!analysisResult) return null

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Review AI Suggestions</h3>
          <p className="text-muted-foreground">{analysisResult.summary}</p>
          
          {/* Processing time */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Processed in {analysisResult.processingTime}ms</span>
            <span>•</span>
            <span>{analysisResult.suggestions.length} blocks suggested</span>
            <span>•</span>
            <span>{selectedBlocks.size} selected for import</span>
          </div>
        </div>

        {/* Suggested Blocks */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {analysisResult.suggestions.map((suggestion) => {
            const isSelected = selectedBlocks.has(suggestion.id)
            const isEditing = editingBlock === suggestion.id
            const finalBlock = getFinalBlock(suggestion.id)
            const isEdited = editedBlocks.has(suggestion.id)

            return (
              <SuggestedBlockCard
                key={suggestion.id}
                block={finalBlock}
                isSelected={isSelected}
                isEditing={isEditing}
                isEdited={isEdited}
                onToggleSelect={() => toggleBlockSelection(suggestion.id)}
                onEdit={() => handleEditBlock(suggestion)}
                onSaveEdit={(updates) => handleSaveEdit(suggestion.id, updates)}
                onCancelEdit={() => setEditingBlock(null)}
              />
            )
          })}
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBlocks(new Set(analysisResult.suggestions.map(s => s.id)))}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBlocks(new Set())}
            >
              Select None
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedBlocks.size} of {analysisResult.suggestions.length} selected
          </span>
        </div>
      </div>
    )
  }

  const renderImportingStep = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-xl mb-6">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">Creating blocks...</h3>
      <p className="text-muted-foreground">
        Adding {selectedBlocks.size} blocks to your project
      </p>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="text-center py-12">
      <motion.div
        className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-xl mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <Check className="w-8 h-8 text-green-600" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
        <p className="text-muted-foreground">
          Successfully created {selectedBlocks.size} blocks from your text
        </p>
      </motion.div>
    </div>
  )

  const getActionButtons = () => {
    switch (step) {
      case 'input':
        return (
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
              icon={Wand2}
            >
              Analyze Text
            </Button>
          </div>
        )
      case 'reviewing':
      case 'review':
        return (
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep('input')}
            >
              Back to Edit
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedBlocks.size === 0}
                icon={Sparkles}
              >
                Import {selectedBlocks.size} Blocks
              </Button>
            </div>
          </div>
        )
      case 'analyzing':
      case 'importing':
        return null
      case 'complete':
        return (
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      className="max-h-[90vh] overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 'input' && renderInputStep()}
              {step === 'analyzing' && renderAnalyzingStep()}
              {step === 'review' && renderReviewStep()}
              {step === 'importing' && renderImportingStep()}
              {step === 'complete' && renderCompleteStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        {getActionButtons() && (
          <div className="border-t border-border p-6">
            {getActionButtons()}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Individual suggested block card component
interface SuggestedBlockCardProps {
  block: SuggestedBlock
  isSelected: boolean
  isEditing: boolean
  isEdited: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onSaveEdit: (updates: Partial<SuggestedBlock>) => void
  onCancelEdit: () => void
}

function SuggestedBlockCard({
  block,
  isSelected,
  isEditing,
  isEdited,
  onToggleSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit
}: SuggestedBlockCardProps) {
  const [editData, setEditData] = useState(block)

  useEffect(() => {
    setEditData(block)
  }, [block])

  const handleSave = () => {
    onSaveEdit(editData)
  }

  const getLaneColor = (lane: string) => {
    const colors = {
      vision: 'bg-purple-100 text-purple-800',
      goals: 'bg-blue-100 text-blue-800',
      current: 'bg-green-100 text-green-800',
      next: 'bg-orange-100 text-orange-800',
      context: 'bg-gray-100 text-gray-800'
    }
    return colors[lane as keyof typeof colors] || colors.current
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0 pt-1">
            <button
              onClick={onToggleSelect}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-primary border-primary text-white'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          </div>

          {/* Block Content */}
          <div className="flex-1 space-y-3">
            {isEditing ? (
              // Editing Mode
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md font-medium"
                  placeholder="Block title..."
                />
                
                <textarea
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm resize-none"
                  placeholder="Block content..."
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Lane</label>
                    <select
                      value={editData.lane}
                      onChange={(e) => setEditData({ ...editData, lane: e.target.value as any })}
                      className="w-full px-2 py-1 border border-border rounded text-sm"
                    >
                      <option value="vision">Vision</option>
                      <option value="goals">Goals</option>
                      <option value="current">Current</option>
                      <option value="next">Next</option>
                      <option value="context">Context</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                      className="w-full px-2 py-1 border border-border rounded text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              // Display Mode
              <>
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm flex-1 pr-2">
                    {block.title}
                    {isEdited && (
                      <Badge variant="secondary" size="sm" className="ml-2">
                        Edited
                      </Badge>
                    )}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="flex-shrink-0"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                </div>

                {block.content && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {block.content}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getLaneColor(block.lane)} size="sm">
                    {block.lane}
                  </Badge>
                  <Badge className={getPriorityColor(block.priority)} size="sm">
                    {block.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {block.effort}h • {block.inspiration}/10 ✨
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(block.confidence * 100)}% confidence
                  </div>
                </div>

                {block.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {block.tags.map((tag) => (
                      <Badge key={tag} variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {block.reasoning && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      AI Reasoning
                    </summary>
                    <p className="mt-1 pl-2 border-l-2 border-muted">{block.reasoning}</p>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}