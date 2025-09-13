import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Settings, Check, Folder, Activity, GitBranch } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  description?: string;
  github_repo?: string;
  status: 'active' | 'inactive' | 'archived';
  last_activity?: string;
  session_count?: number;
  context_usage?: number;
}

interface ProjectSwitcherProps {
  currentProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectSwitcher({ currentProjectId, onProjectChange, onNewProject }: ProjectSwitcherProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    if (currentProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === currentProjectId);
      setCurrentProject(project || null);
    }
  }, [currentProjectId, projects]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      // Fetch projects with session stats
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          sessions:sessions(count),
          last_session:sessions(
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Process projects with additional stats
      const processedProjects = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get session count
          const { count: sessionCount } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          // Get latest activity
          const { data: lastSession } = await supabase
            .from('sessions')
            .select('created_at')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Calculate average context usage
          const { data: sessions } = await supabase
            .from('sessions')
            .select('metadata')
            .eq('project_id', project.id)
            .limit(10);

          const avgContextUsage = sessions?.reduce((acc, s) => {
            return acc + (s.metadata?.contextUsage || 0);
          }, 0) / (sessions?.length || 1);

          return {
            ...project,
            session_count: sessionCount || 0,
            last_activity: lastSession?.created_at,
            context_usage: Math.round(avgContextUsage)
          };
        })
      );

      setProjects(processedProjects);
      
      // Set current project if not set
      if (!currentProjectId && processedProjects.length > 0) {
        setCurrentProject(processedProjects[0]);
        onProjectChange(processedProjects[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'No activity';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    onProjectChange(project.id);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        <span className="text-sm">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Folder className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium">
          {currentProject?.name || 'Select Project'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900 rounded-lg shadow-xl border border-gray-800 z-50">
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">YOUR PROJECTS</div>
              
              <div className="max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`w-full text-left px-2 py-2 rounded-lg transition-colors ${
                      project.id === currentProjectId
                        ? 'bg-blue-600/20 hover:bg-blue-600/30'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{project.name}</span>
                          {project.id === currentProjectId && (
                            <Check className="h-3 w-3 text-blue-400" />
                          )}
                        </div>
                        {project.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Activity className="h-3 w-3" />
                            <span>{project.session_count || 0} sessions</span>
                          </div>
                          {project.github_repo && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <GitBranch className="h-3 w-3" />
                              <span>GitHub</span>
                            </div>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatLastActivity(project.last_activity)}
                          </span>
                        </div>
                      </div>
                      {project.context_usage !== undefined && (
                        <div className="text-right ml-4">
                          <div className="text-xs text-gray-500">Context</div>
                          <div className={`text-sm font-medium ${
                            project.context_usage > 80 ? 'text-red-400' :
                            project.context_usage > 60 ? 'text-amber-400' :
                            'text-green-400'
                          }`}>
                            {project.context_usage}%
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-800 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNewProject();
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">New Project</span>
                </button>
                
                {currentProject && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to project settings
                      window.location.href = `/projects/${currentProject.id}/settings`;
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Project Settings</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}