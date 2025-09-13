import React, { useState, useEffect } from 'react';
import { Save, Trash2, Archive, GitBranch, Link, Shield, Bell, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'github' | 'mcp' | 'advanced'>('general');
  
  const [project, setProject] = useState({
    name: '',
    description: '',
    github_repo: '',
    github_token: '',
    mcp_server_url: '',
    mcp_api_key: '',
    status: 'active',
    settings: {
      auto_capture: true,
      context_limit: 100000,
      retention_days: 30,
      notifications: {
        context_threshold: 80,
        email_alerts: false,
        webhook_url: ''
      }
    }
  });

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      setProject({
        ...data,
        settings: {
          ...project.settings,
          ...data.settings
        }
      });
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          github_repo: project.github_repo,
          github_token: project.github_token,
          mcp_server_url: project.mcp_server_url,
          mcp_api_key: project.mcp_api_key,
          settings: project.settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this project? You can restore it later.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all sessions, blocks, and events. Type "DELETE" to confirm.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Project Settings</h1>
          <p className="text-gray-400">Configure your project settings and integrations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-1 ${
              activeTab === 'general'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-1 ${
              activeTab === 'github'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            GitHub
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`pb-3 px-1 ${
              activeTab === 'mcp'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            MCP Server
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`pb-3 px-1 ${
              activeTab === 'advanced'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Advanced
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-900 rounded-lg p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => setProject({ ...project, name: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={project.description}
                  onChange={(e) => setProject({ ...project, description: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Auto Capture</label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={project.settings.auto_capture}
                    onChange={(e) => setProject({
                      ...project,
                      settings: { ...project.settings, auto_capture: e.target.checked }
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-300">
                    Automatically capture Claude Code sessions
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Repository URL</label>
                <input
                  type="text"
                  value={project.github_repo}
                  onChange={(e) => setProject({ ...project, github_repo: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/username/repository"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Personal Access Token</label>
                <input
                  type="password"
                  value={project.github_token}
                  onChange={(e) => setProject({ ...project, github_token: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Token is encrypted and stored securely
                </p>
              </div>

              <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <GitBranch className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-medium">GitHub Integration Status</p>
                    <p className="text-sm text-gray-300 mt-1">
                      {project.github_repo ? 'Connected' : 'Not configured'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">MCP Server URL</label>
                <input
                  type="text"
                  value={project.mcp_server_url}
                  onChange={(e) => setProject({ ...project, mcp_server_url: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="wss://api.frizyai.com/mcp"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input
                  type="password"
                  value={project.mcp_api_key}
                  onChange={(e) => setProject({ ...project, mcp_api_key: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">MCP Configuration for Claude Code</h4>
                <pre className="text-xs overflow-x-auto text-gray-300">
{`{
  "mcpServers": {
    "${project.name}": {
      "command": "npx",
      "args": ["-y", "@frizyai/mcp-server"],
      "env": {
        "FRIZY_PROJECT_ID": "${projectId}",
        "FRIZY_API_KEY": "${project.mcp_api_key || 'YOUR_API_KEY'}",
        "FRIZY_SERVER_URL": "${project.mcp_server_url}"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Context Limit (tokens)</label>
                <input
                  type="number"
                  value={project.settings.context_limit}
                  onChange={(e) => setProject({
                    ...project,
                    settings: { ...project.settings, context_limit: parseInt(e.target.value) }
                  })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Retention (days)</label>
                <input
                  type="number"
                  value={project.settings.retention_days}
                  onChange={(e) => setProject({
                    ...project,
                    settings: { ...project.settings, retention_days: parseInt(e.target.value) }
                  })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Sessions older than this will be automatically archived
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Context Warning Threshold (%)</label>
                <input
                  type="number"
                  value={project.settings.notifications?.context_threshold || 80}
                  onChange={(e) => setProject({
                    ...project,
                    settings: {
                      ...project.settings,
                      notifications: {
                        ...project.settings.notifications,
                        context_threshold: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-6 border-t border-gray-800">
                <h4 className="text-sm font-medium mb-4 text-red-400">Danger Zone</h4>
                <div className="space-y-3">
                  <button
                    onClick={handleArchive}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 rounded-lg text-amber-400"
                  >
                    <Archive className="h-4 w-4" />
                    Archive Project
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-lg text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}