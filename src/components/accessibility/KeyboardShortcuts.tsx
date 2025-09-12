import { useState, useEffect } from 'react'
import { Keyboard, X, Command, Zap, Plus, Search, Target, Settings } from 'lucide-react'
import { Modal, Button, Badge } from '@/components/ui'

interface KeyboardShortcut {
  keys: string[]
  description: string
  category: 'navigation' | 'actions' | 'creation' | 'general'
  icon?: React.ComponentType<{ className?: string }>
}

const shortcuts: KeyboardShortcut[] = [
  // General
  { keys: ['Ctrl', 'K'], description: 'Open command palette', category: 'general', icon: Command },
  { keys: ['Ctrl', '?'], description: 'Show keyboard shortcuts', category: 'general', icon: Keyboard },
  { keys: ['Escape'], description: 'Close modals/cancel actions', category: 'general' },
  
  // Navigation
  { keys: ['G', 'H'], description: 'Go to home/dashboard', category: 'navigation' },
  { keys: ['G', 'P'], description: 'Go to projects', category: 'navigation' },
  { keys: ['G', 'S'], description: 'Go to settings', category: 'navigation', icon: Settings },
  { keys: ['1-5'], description: 'Switch between swim lanes', category: 'navigation', icon: Target },
  
  // Actions
  { keys: ['Ctrl', 'Enter'], description: 'Start interactive tour', category: 'actions', icon: Zap },
  { keys: ['Ctrl', 'S'], description: 'Save current changes', category: 'actions' },
  { keys: ['Ctrl', 'Z'], description: 'Undo last action', category: 'actions' },
  { keys: ['Ctrl', 'Y'], description: 'Redo action', category: 'actions' },
  
  // Creation
  { keys: ['N', 'P'], description: 'New project', category: 'creation', icon: Plus },
  { keys: ['N', 'B'], description: 'New block in current lane', category: 'creation', icon: Plus },
  { keys: ['Ctrl', 'I'], description: 'AI import blocks', category: 'creation', icon: Zap },
  { keys: ['/', 'F'], description: 'Focus search', category: 'creation', icon: Search }
]

const categoryLabels = {
  general: 'General',
  navigation: 'Navigation', 
  actions: 'Actions',
  creation: 'Creation'
}

const categoryColors = {
  general: 'bg-gray-100 text-gray-700',
  navigation: 'bg-blue-100 text-blue-700',
  actions: 'bg-green-100 text-green-700', 
  creation: 'bg-purple-100 text-purple-700'
}

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter shortcuts based on search
  const filteredShortcuts = searchQuery
    ? shortcuts.filter(shortcut => 
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.keys.some(key => key.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : shortcuts

  // Group by category
  const shortcutsByCategory = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = []
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  const renderKey = (key: string) => (
    <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
      {key}
    </kbd>
  )

  const renderShortcut = (shortcut: KeyboardShortcut) => (
    <div key={shortcut.keys.join('+') + shortcut.description} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3">
        {shortcut.icon && (
          <shortcut.icon className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm">{shortcut.description}</span>
      </div>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <span key={key} className="flex items-center gap-1">
            {index > 0 && <span className="text-xs text-muted-foreground">+</span>}
            {renderKey(key)}
          </span>
        ))}
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      className="max-w-2xl"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
              <p className="text-sm text-muted-foreground">Boost your productivity with these shortcuts</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Shortcuts List */}
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-3">
                <Badge size="sm" className={categoryColors[category as keyof typeof categoryColors]}>
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {categoryShortcuts.length} shortcuts
                </span>
              </div>
              <div className="space-y-1">
                {categoryShortcuts.map(renderShortcut)}
              </div>
            </div>
          ))}
        </div>

        {filteredShortcuts.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No shortcuts found for "{searchQuery}"</p>
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Tip: Press {renderKey('Ctrl')} + {renderKey('?')} anytime to open this dialog
          </p>
        </div>
      </div>
    </Modal>
  )
}

// Hook for keyboard shortcuts
export function useKeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + ? to show shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === '?') {
        event.preventDefault()
        setShowShortcuts(true)
      }
      
      // Escape to close shortcuts
      if (event.key === 'Escape' && showShortcuts) {
        event.preventDefault()
        setShowShortcuts(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showShortcuts])

  return {
    showShortcuts,
    setShowShortcuts,
    openShortcuts: () => setShowShortcuts(true),
    closeShortcuts: () => setShowShortcuts(false)
  }
}