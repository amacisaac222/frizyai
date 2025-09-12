import { useState, useCallback } from 'react'
import { X, Folder } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { projectService } from '@/lib/services/projectService'
import { projectTemplates } from '@/lib/templates/projectTemplates'
import { cn } from '@/utils'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (projectId: string) => void
}

// Import comprehensive templates

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [step, setStep] = useState<'template' | 'details' | 'category'>('category')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplateData = projectTemplates.find(t => t.id === selectedTemplate)
  const categorizedTemplates = selectedCategory ? 
    projectTemplates.filter(t => t.category === selectedCategory) :
    projectTemplates

  const handleReset = useCallback(() => {
    setStep('category')
    setSelectedCategory('')
    setSelectedTemplate('')
    setProjectName('')
    setProjectDescription('')
    setLoading(false)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category)
    setStep('template')
  }, [])

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId)
    setStep('details')
    
    // Pre-fill name and description based on template
    const template = projectTemplates.find(t => t.id === templateId)
    if (template) {
      setProjectName(template.name)
      setProjectDescription(template.description)
    }
  }, [])

  const handleCreateProject = useCallback(async () => {
    if (!projectName.trim()) {
      setError('Project name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await projectService.createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || selectedTemplateData?.description || 'A new project',
        template: selectedTemplate as any
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.data) {
        // Initialize template-specific content with blocks
        if (selectedTemplateData && selectedTemplateData.blocks.length > 0) {
          await projectService.initializeProjectFromTemplate(result.data.id, selectedTemplateData)
        }

        onProjectCreated(result.data.id)
        handleClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }, [projectName, projectDescription, selectedTemplate, selectedTemplateData, onProjectCreated, handleClose])

  if (!isOpen) return null

  // Category options
  const categories = [
    { id: 'work', name: 'Work & Business', description: 'Professional projects and business initiatives', icon: '💼' },
    { id: 'startup', name: 'Startup & Innovation', description: 'Building new ventures and innovative solutions', icon: '🚀' },
    { id: 'creative', name: 'Creative Projects', description: 'Design, content, and artistic endeavors', icon: '🎨' },
    { id: 'personal', name: 'Personal Goals', description: 'Life improvements and personal development', icon: '🌱' },
    { id: 'education', name: 'Learning & Education', description: 'Academic projects and skill development', icon: '📚' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
      <div className="max-w-3xl mx-auto">
        {step === 'category' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Choose a Category</h3>
              <p className="text-muted-foreground text-sm">
                What type of project would you like to create?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className="p-6 text-left border-2 border-border rounded-lg transition-all hover:shadow-md hover:border-primary/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-2xl">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedCategory('work')
                  setStep('template')
                }}
                className="text-muted-foreground"
              >
                Show All Templates →
              </Button>
            </div>
          </div>
        )}

        {step === 'template' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Choose a Template</h3>
              <p className="text-muted-foreground text-sm">
                {selectedCategory ? `${categories.find(c => c.id === selectedCategory)?.name} templates` : 'All available templates'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedTemplates.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      "p-4 text-left border-2 rounded-lg transition-all hover:shadow-md",
                      selectedTemplate === template.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Folder className="w-3 h-3" />
                            <span>{template.blocks.length} blocks</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {template.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('category')}>
                ← Back to Categories
              </Button>
              <Button 
                onClick={() => setStep('details')}
                disabled={!selectedTemplate}
                className="bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 text-white hover:opacity-90"
              >
                Next: Project Details
              </Button>
            </div>
          </div>
        )}

        {step === 'details' && selectedTemplateData && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <button
                onClick={() => setStep('template')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <selectedTemplateData.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{selectedTemplateData.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{selectedTemplateData.category} template</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {projectName.length}/100 characters
                </p>
              </div>

              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe your project goals and objectives..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {projectDescription.length}/500 characters
                </p>
              </div>

              {selectedTemplateData.blocks.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm mb-2 text-blue-900">Template Features</h4>
                  <p className="text-xs text-blue-800 mb-3">
                    This template will create <strong>{selectedTemplateData.blocks.length} starter blocks</strong> 
                    organized across your swim lanes to help you get started quickly.
                  </p>
                  <div className="space-y-1">
                    {Object.entries(
                      selectedTemplateData.blocks.reduce((acc, block) => {
                        acc[block.lane] = (acc[block.lane] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                    ).map(([lane, count]) => (
                      <div key={lane} className="flex justify-between text-xs text-blue-700">
                        <span className="capitalize">{lane}:</span>
                        <span>{count} blocks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('template')}>
                Back to Templates
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={loading || !projectName.trim()}
                className="bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 text-white hover:opacity-90"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}