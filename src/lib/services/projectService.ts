import { supabase } from '@/lib/supabase'
import type { Project as DBProject, ProjectInsert, ProjectUpdate } from '@/lib/database.types'
import type { ProjectTemplate } from '@/lib/templates/projectTemplates'

export interface ProjectWithStats extends DBProject {
  blocksCount: number
  activeBlocks: number
  completedBlocks: number
  claudeSessions: number
  lastWorked?: string
}

class ProjectService {
  async getProjects(): Promise<{ data: ProjectWithStats[] | null; error: string | null }> {
    try {
      // For now, return mock data since we don't have full database setup
      // In production, this would query the projects table with joins to get block stats
      const mockProjects: ProjectWithStats[] = [
        {
          id: 'frizy-mvp',
          name: 'Frizy MVP',
          description: 'AI-powered project management platform with retro design',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'demo-user',
          status: 'active',
          settings: {},
          blocksCount: 12,
          activeBlocks: 8,
          completedBlocks: 4,
          claudeSessions: 23,
          lastWorked: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'ecommerce-platform',
          name: 'E-commerce Platform',
          description: 'Full-stack e-commerce solution with React and Node.js',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'demo-user',
          status: 'on-hold',
          settings: {},
          blocksCount: 8,
          activeBlocks: 3,
          completedBlocks: 5,
          claudeSessions: 15,
          lastWorked: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'mobile-app',
          name: 'Mobile App Redesign',
          description: 'React Native app with modern UI/UX',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'demo-user',
          status: 'completed',
          settings: {},
          blocksCount: 15,
          activeBlocks: 0,
          completedBlocks: 15,
          claudeSessions: 31,
          lastWorked: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ]

      return { data: mockProjects, error: null }
    } catch (error) {
      console.error('Error getting projects:', error)
      return { data: null, error: error instanceof Error ? error.message : 'Failed to get projects' }
    }
  }

  async createProject(project: {
    name: string
    description: string
    template?: 'blank' | 'software' | 'marketing' | 'research'
  }): Promise<{ data: DBProject | null; error: string | null }> {
    try {
      // Generate a project ID from the name
      const projectId = project.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Create project object
      const newProject: DBProject = {
        id: projectId,
        name: project.name,
        description: project.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'demo-user', // In production, get from auth context
        status: 'active',
        settings: {
          template: project.template || 'blank',
          color: this.getRandomColor(),
        }
      }

      // In production, this would insert into the database
      // const { data, error } = await supabase.from('projects').insert(newProject).select().single()

      // For now, just return the mock project
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay

      return { data: newProject, error: null }
    } catch (error) {
      console.error('Error creating project:', error)
      return { data: null, error: error instanceof Error ? error.message : 'Failed to create project' }
    }
  }

  async updateProject(projectId: string, updates: ProjectUpdate): Promise<{ data: DBProject | null; error: string | null }> {
    try {
      // In production, this would update the database
      // const { data, error } = await supabase.from('projects').update(updates).eq('id', projectId).select().single()

      // For now, simulate the update
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return { data: null, error: null } // Mock success
    } catch (error) {
      console.error('Error updating project:', error)
      return { data: null, error: error instanceof Error ? error.message : 'Failed to update project' }
    }
  }

  async deleteProject(projectId: string): Promise<{ error: string | null }> {
    try {
      // In production, this would delete from database
      // const { error } = await supabase.from('projects').delete().eq('id', projectId)

      // For now, simulate the deletion
      await new Promise(resolve => setTimeout(resolve, 300))

      return { error: null }
    } catch (error) {
      console.error('Error deleting project:', error)
      return { error: error instanceof Error ? error.message : 'Failed to delete project' }
    }
  }

  private getRandomColor(): string {
    const colors = ['pink', 'cyan', 'purple', 'yellow', 'green']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Template-based project initialization
  async initializeProjectTemplate(projectId: string, template: string) {
    if (template === 'software') {
      // Create default software development blocks
      const defaultBlocks = [
        { title: 'Setup Development Environment', lane: 'current', priority: 'high' },
        { title: 'Design System Architecture', lane: 'current', priority: 'medium' },
        { title: 'Implement Core Features', lane: 'next', priority: 'high' },
        { title: 'Testing & QA', lane: 'next', priority: 'medium' },
        { title: 'Production Deployment', lane: 'goals', priority: 'medium' },
        { title: 'User Feedback Integration', lane: 'goals', priority: 'low' },
        { title: 'Technical Documentation', lane: 'context', priority: 'low' },
        { title: 'Project Requirements', lane: 'context', priority: 'medium' }
      ]
      
      // In production, create these blocks in the database
      console.log('Creating default software blocks for project:', projectId, defaultBlocks)
    }
    // Add more templates as needed
  }

  // New comprehensive template initialization
  async initializeProjectFromTemplate(projectId: string, template: ProjectTemplate): Promise<{ error: string | null }> {
    try {
      console.log(`Initializing project ${projectId} with template: ${template.name}`)
      console.log(`Creating ${template.blocks.length} blocks:`)
      
      // Log each block for debugging
      template.blocks.forEach((block, index) => {
        console.log(`  ${index + 1}. [${block.lane.toUpperCase()}] ${block.title} (${block.priority} priority, ${block.effort} effort)`)
      })

      // In production, this would create actual blocks in the database
      // For now, we simulate the initialization
      await new Promise(resolve => setTimeout(resolve, 1000))

      return { error: null }
    } catch (error) {
      console.error('Error initializing project from template:', error)
      return { error: error instanceof Error ? error.message : 'Failed to initialize project template' }
    }
  }
}

export const projectService = new ProjectService()