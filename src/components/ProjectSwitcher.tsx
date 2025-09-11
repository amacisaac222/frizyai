import { useState } from 'react'
import { ChevronDown, Plus, FolderOpen } from 'lucide-react'
import { Button } from './ui'
import { Project } from '@/lib/types'

interface ProjectSwitcherProps {
  currentProject?: Project
  projects: Project[]
  onProjectChange: (project: Project) => void
  onCreateProject: () => void
}

export function ProjectSwitcher({ 
  currentProject, 
  projects, 
  onProjectChange, 
  onCreateProject 
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 justify-start gap-2 min-w-[200px] bg-muted/50"
      >
        <FolderOpen className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 text-left truncate">
          {currentProject?.name || 'Select Project'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-72 bg-popover border rounded-md shadow-md z-20 py-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Recent Projects
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    onProjectChange(project)
                    setIsOpen(false)
                  }}
                  className={`w-full px-2 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-start gap-3 ${
                    currentProject?.id === project.id ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <FolderOpen className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {project.description || 'No description'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {project.totalSessions} sessions
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {projects.length === 0 && (
              <div className="px-2 py-8 text-center text-muted-foreground text-sm">
                No projects yet
              </div>
            )}

            <div className="border-t mt-1 pt-1">
              <button
                onClick={() => {
                  onCreateProject()
                  setIsOpen(false)
                }}
                className="w-full px-2 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Create New Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}