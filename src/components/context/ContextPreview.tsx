import { useState } from 'react'
import { 
  Eye, EyeOff, Star, StarOff, Settings, Download, RefreshCw, 
  BarChart3, Clock, Zap, AlertTriangle, CheckCircle, Archive,
  ChevronDown, ChevronUp, Copy, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, CardContent, CardHeader, 
  Button, Badge, Textarea, 
  Modal, Select, SelectOption,
  Tooltip
} from '@/components/ui'
import { useContextManager } from '@/hooks/useContextManager'
import type { ContextItem, ContextScoringConfig } from '@/lib/context-manager'
import type { Block, Project } from '@/lib/database.types'
import { cn } from '@/utils'

interface ContextPreviewProps {
  projectId: string
  project?: Project
  className?: string
  onContextGenerated?: (context: string) => void
}

export function ContextPreview({ 
  projectId, 
  project, 
  className,
  onContextGenerated 
}: ContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'markdown' | 'txt'>('markdown')
  const [previewContext, setPreviewContext] = useState<string | null>(null)
  
  const {
    context,
    loading,
    error,
    lastGenerated,
    stats,
    config,
    updateConfig,
    userImportantBlocks,
    markBlockImportant,
    manualOverrides,
    setBlockOverride,
    generateContext,
    getContextString,
    exportContextData,
    isBlockIncluded,
    getBlockScore
  } = useContextManager({ projectId, project })
  
  const formatOptions: SelectOption[] = [
    { value: 'markdown', label: 'Markdown' },
    { value: 'json', label: 'JSON' },
    { value: 'txt', label: 'Plain Text' }
  ]
  
  const handlePreviewContext = () => {
    const contextString = getContextString()
    setPreviewContext(contextString)
    onContextGenerated?.(contextString || '')
  }
  
  const handleExport = () => {
    const exported = exportContextData(selectedFormat)
    if (!exported) return
    
    const blob = new Blob([exported], { 
      type: selectedFormat === 'json' ? 'application/json' : 'text/plain' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frizy-context-${projectId}-${Date.now()}.${selectedFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const handleCopyContext = async () => {
    const contextString = getContextString()
    if (contextString) {
      await navigator.clipboard.writeText(contextString)
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Zap className="w-3 h-3 text-green-600" />
      case 'blocked': return <AlertTriangle className="w-3 h-3 text-red-600" />
      case 'completed': return <CheckCircle className="w-3 h-3 text-blue-600" />
      case 'archived': return <Archive className="w-3 h-3 text-gray-600" />
      default: return <Clock className="w-3 h-3 text-gray-600" />
    }
  }
  
  const getCompressionBadge = (level: ContextItem['compressionLevel']) => {
    switch (level) {
      case 'minimal':
        return <Badge variant="outline" size="sm" className="text-xs">Minimal</Badge>
      case 'summary':
        return <Badge variant="secondary" size="sm" className="text-xs">Summary</Badge>
      case 'full':
        return <Badge variant="default" size="sm" className="text-xs">Full Detail</Badge>
    }
  }
  
  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Claude Context Preview</h3>
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip content="Configure context scoring">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="h-7 w-7 p-0"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </Tooltip>
              
              <Tooltip content="Refresh context">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateContext}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                >
                  <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                </Button>
              </Tooltip>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {/* Context Stats */}
          {stats && (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
              <span>{stats.includedBlocks}/{stats.totalBlocks} blocks included</span>
              <span>{stats.compressedBlocks} compressed</span>
              <span>~{Math.round(stats.contextSize / 1000)}k chars</span>
              <span>Avg score: {stats.avgScore.toFixed(2)}</span>
              {lastGenerated && (
                <span>Updated: {new Date(lastGenerated).toLocaleTimeString()}</span>
              )}
            </div>
          )}
        </CardHeader>
        
        <AnimatePresence>
          {isExpanded && context && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0 space-y-4">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handlePreviewContext}
                    className="h-7"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview Context
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyContext}
                    className="h-7"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <Select
                      value={selectedFormat}
                      onValueChange={(value) => setSelectedFormat(value as any)}
                      size="sm"
                    >
                      {formatOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="h-7"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Context Items */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {context.items.map((item, index) => {
                    const included = index < context.summary.includedBlocks && item.manualOverride !== 'exclude'
                    const isImportant = userImportantBlocks.has(item.block.id)
                    const override = manualOverrides[item.block.id]
                    
                    return (
                      <div
                        key={item.block.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-all",
                          included ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
                          override === 'include' && "ring-2 ring-blue-200",
                          override === 'exclude' && "ring-2 ring-red-200"
                        )}
                      >
                        {/* Inclusion Toggle */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBlockOverride(
                              item.block.id, 
                              override === 'include' ? null : 'include'
                            )}
                            className={cn(
                              "h-6 w-6 p-0",
                              override === 'include' ? "text-blue-600" : "text-gray-400"
                            )}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBlockOverride(
                              item.block.id,
                              override === 'exclude' ? null : 'exclude'
                            )}
                            className={cn(
                              "h-6 w-6 p-0",
                              override === 'exclude' ? "text-red-600" : "text-gray-400"
                            )}
                          >
                            <EyeOff className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {/* Block Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.block.title}</h4>
                              {getStatusIcon(item.block.status)}
                              <Badge 
                                size="sm" 
                                className={cn("text-xs", getPriorityColor(item.block.priority))}
                              >
                                {item.block.priority}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markBlockImportant(item.block.id, !isImportant)}
                                className={cn(
                                  "h-6 w-6 p-0",
                                  isImportant ? "text-yellow-600" : "text-gray-400"
                                )}
                              >
                                {isImportant ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
                              </Button>
                              
                              {getCompressionBadge(item.compressionLevel)}
                            </div>
                          </div>
                          
                          {/* Score Breakdown */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                            <span className="font-medium">Score: {item.score.toFixed(2)}</span>
                            <span>Recency: {item.scoreBreakdown.recency.toFixed(2)}</span>
                            <span>Sessions: {item.scoreBreakdown.sessions.toFixed(2)}</span>
                            <span>Priority: {item.scoreBreakdown.priority.toFixed(2)}</span>
                          </div>
                          
                          {/* Inclusion Reasons */}
                          {item.includeReason.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.includeReason.map((reason, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs"
                                >
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      
      {/* Context Preview Modal */}
      <Modal
        isOpen={!!previewContext}
        onClose={() => setPreviewContext(null)}
        title="Claude Context Preview"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              This is the context that will be provided to Claude
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyContext}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://claude.ai', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Claude
              </Button>
            </div>
          </div>
          
          <Textarea
            value={previewContext || ''}
            readOnly
            className="min-h-96 font-mono text-xs"
            placeholder="Context will appear here..."
          />
          
          {stats && (
            <div className="text-xs text-muted-foreground">
              {stats.includedBlocks} blocks • {Math.round(stats.contextSize / 1000)}k characters • 
              Generated: {lastGenerated ? new Date(lastGenerated).toLocaleString() : 'Never'}
            </div>
          )}
        </div>
      </Modal>
      
      {/* Settings Modal */}
      <ContextSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={config}
        onConfigUpdate={updateConfig}
        stats={stats}
      />
    </>
  )
}

// Context Settings Modal Component
interface ContextSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  config: ContextScoringConfig
  onConfigUpdate: (config: Partial<ContextScoringConfig>) => void
  stats: any
}

function ContextSettingsModal({
  isOpen,
  onClose,
  config,
  onConfigUpdate,
  stats
}: ContextSettingsModalProps) {
  const [localConfig, setLocalConfig] = useState(config)
  
  const handleSave = () => {
    onConfigUpdate(localConfig)
    onClose()
  }
  
  const handleReset = () => {
    setLocalConfig(config)
  }
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Context Scoring Configuration"
      size="md"
    >
      <div className="space-y-6">
        {/* Scoring Weights */}
        <div>
          <h4 className="font-medium mb-3">Scoring Weights</h4>
          <div className="space-y-3">
            {Object.entries(localConfig.weights).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={value}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      weights: {
                        ...prev.weights,
                        [key]: parseFloat(e.target.value)
                      }
                    }))}
                    className="w-24"
                  />
                  <span className="text-xs w-12 text-right">{value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Other Settings */}
        <div>
          <h4 className="font-medium mb-3">Context Limits</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Max Context Blocks</label>
              <input
                type="number"
                min="5"
                max="50"
                value={localConfig.maxContextBlocks}
                onChange={(e) => setLocalConfig(prev => ({
                  ...prev,
                  maxContextBlocks: parseInt(e.target.value)
                }))}
                className="w-20 px-2 py-1 text-sm border rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm">Compression Threshold</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={localConfig.compressionThreshold}
                onChange={(e) => setLocalConfig(prev => ({
                  ...prev,
                  compressionThreshold: parseFloat(e.target.value)
                }))}
                className="w-20 px-2 py-1 text-sm border rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm">Recency Decay (days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={localConfig.recencyDecayDays}
                onChange={(e) => setLocalConfig(prev => ({
                  ...prev,
                  recencyDecayDays: parseInt(e.target.value)
                }))}
                className="w-20 px-2 py-1 text-sm border rounded"
              />
            </div>
          </div>
        </div>
        
        {/* Current Stats */}
        {stats && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium mb-2 text-sm">Current Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Included: {stats.includedBlocks}</div>
              <div>Compressed: {stats.compressedBlocks}</div>
              <div>Size: ~{Math.round(stats.contextSize / 1000)}k chars</div>
              <div>Avg Score: {stats.avgScore.toFixed(2)}</div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}