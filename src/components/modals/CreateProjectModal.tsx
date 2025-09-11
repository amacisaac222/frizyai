import { useState, useCallback } from 'react'
import { X, Folder, Code, Megaphone, Search, Sparkles } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { projectService } from '@/lib/services/projectService'
import { cn } from '@/utils'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (projectId: string) => void
}

interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  color: string
  blocks: number
}

const templates: ProjectTemplate[] = [
  {
    id: 'software',
    name: 'Software Development',
    description: 'Full-stack development with planning, coding, testing, and deployment phases',
    icon: Code,
    color: 'from-pink-500 via-yellow-500 to-cyan-500',
    blocks: 8
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'Campaign planning, content creation, execution, and performance tracking',
    icon: Megaphone,
    color: 'from-cyan-500 via-pink-500 to-yellow-500',
    blocks: 6
  },
  {
    id: 'research',
    name: 'Research Project',
    description: 'Literature review, data collection, analysis, and report writing',
    icon: Search,
    color: 'from-purple-500 via-pink-500 to-cyan-500',
    blocks: 5
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch and create your own workflow',
    icon: Sparkles,
    color: 'from-yellow-500 via-cyan-500 to-pink-500',
    blocks: 0
  }
]

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [step, setStep] = useState<'template' | 'details'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('software')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  const handleReset = useCallback(() => {
    setStep('template')
    setSelectedTemplate('software')
    setProjectName('')
    setProjectDescription('')
    setLoading(false)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId)
    setStep('details')
    
    // Pre-fill name and description based on template
    const template = templates.find(t => t.id === templateId)
    if (template && templateId !== 'blank') {
      setProjectName(`My ${template.name} Project`)
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
        description: projectDescription.trim() || `A new ${selectedTemplateData?.name.toLowerCase()} project`,
        template: selectedTemplate as any
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.data) {
        // Initialize template-specific content
        if (selectedTemplate !== 'blank') {
          await projectService.initializeProjectTemplate(result.data.id, selectedTemplate)
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
      <div className="max-w-2xl mx-auto">
        {step === 'template' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Choose a Template</h3>
              <p className="text-muted-foreground text-sm">
                Start with a pre-configured workflow or build your own from scratch
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      "p-6 text-left border-2 rounded-lg transition-all hover:shadow-md",
                      selectedTemplate === template.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br",
                        template.color
                      )}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Folder className="w-3 h-3" />
                          <span>
                            {template.blocks === 0 ? 'Empty project' : `${template.blocks} starter blocks`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
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
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                selectedTemplateData.color
              )}>
                <selectedTemplateData.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{selectedTemplateData.name}</h3>
                <p className="text-xs text-muted-foreground">Template selected</p>
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

              {selectedTemplateData.blocks > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm mb-2 text-blue-900">Template Features</h4>
                  <p className="text-xs text-blue-800">
                    This template will create <strong>{selectedTemplateData.blocks} starter blocks</strong> 
                    organized across your swim lanes to help you get started quickly.
                  </p>
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