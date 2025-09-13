import React, { useState } from 'react';
import { Github, Link, CheckCircle, Copy, ChevronRight, Terminal, Settings, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectOnboardingProps {
  onComplete: (projectId: string) => void;
}

export function ProjectOnboarding({ onComplete }: ProjectOnboardingProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [projectData, setProjectData] = useState({
    name: '',
    githubRepo: '',
    githubToken: '',
    mcpServerUrl: '',
    mcpApiKey: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const generateMCPConfig = () => {
    const config = {
      mcpServers: {
        [projectData.name]: {
          command: "npx",
          args: ["-y", "@frizyai/mcp-server"],
          env: {
            FRIZY_PROJECT_ID: "{{PROJECT_ID}}",
            FRIZY_API_KEY: projectData.mcpApiKey || "{{API_KEY}}",
            FRIZY_SERVER_URL: projectData.mcpServerUrl || "wss://api.frizyai.com/mcp"
          }
        }
      }
    };
    return JSON.stringify(config, null, 2);
  };

  const copyMCPConfig = () => {
    navigator.clipboard.writeText(generateMCPConfig());
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleCreateProject = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Create project in database
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectData.name,
          description: projectData.description,
          github_repo: projectData.githubRepo,
          github_token: projectData.githubToken,
          mcp_server_url: projectData.mcpServerUrl || 'wss://api.frizyai.com/mcp',
          mcp_api_key: projectData.mcpApiKey,
          status: 'active',
          settings: {
            auto_capture: true,
            context_limit: 100000,
            retention_days: 30
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial session
      await supabase
        .from('sessions')
        .insert({
          project_id: project.id,
          title: 'Initial Setup',
          status: 'completed',
          metadata: {
            type: 'setup',
            initialized: true
          }
        });

      onComplete(project.id);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Project Details',
      description: 'Basic information about your project'
    },
    {
      number: 2,
      title: 'GitHub Integration',
      description: 'Connect your repository'
    },
    {
      number: 3,
      title: 'MCP Setup',
      description: 'Configure Claude Code integration'
    },
    {
      number: 4,
      title: 'Review & Create',
      description: 'Finalize your project'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Frizy AI</h1>
          <p className="text-gray-400">Let's set up your first project and start capturing context from Claude Code</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className={`flex flex-col items-center ${index < steps.length - 1 ? 'mr-4' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.number ? 'bg-green-600' :
                    currentStep === step.number ? 'bg-blue-600' :
                    'bg-gray-800'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.number ? 'text-white' : 'text-gray-500'
                    }`}>{step.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${
                    currentStep > step.number ? 'bg-green-600' : 'bg-gray-800'
                  }`} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-gray-900 rounded-lg p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={projectData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Awesome Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={projectData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of your project"
                />
              </div>
              <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-medium">What you'll get:</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li>• Automatic context capture from Claude Code sessions</li>
                      <li>• Session history and analytics</li>
                      <li>• AI-powered insights and recommendations</li>
                      <li>• Seamless GitHub integration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">GitHub Repository URL</label>
                <input
                  type="text"
                  value={projectData.githubRepo}
                  onChange={(e) => handleInputChange('githubRepo', e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/username/repository"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">GitHub Personal Access Token</label>
                <input
                  type="password"
                  value={projectData.githubToken}
                  onChange={(e) => handleInputChange('githubToken', e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Need a token? <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Create one here</a> with repo access
                </p>
              </div>
              <div className="bg-amber-600/10 border border-amber-600/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Github className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400 font-medium">GitHub Integration Benefits:</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li>• Automatic commit context linking</li>
                      <li>• Pull request integration</li>
                      <li>• Issue tracking correlation</li>
                      <li>• Code change visualization</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Configure MCP Server for Claude Code</h3>
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">1. Copy this configuration</p>
                      <button
                        onClick={copyMCPConfig}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        {copiedCommand ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs overflow-x-auto text-gray-300 bg-gray-900 p-3 rounded">
                      {generateMCPConfig()}
                    </pre>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">2. Add to Claude Code settings</p>
                    <ol className="space-y-2 text-sm text-gray-300">
                      <li>• Open Claude Code</li>
                      <li>• Press <code className="bg-gray-900 px-1 py-0.5 rounded">Cmd/Ctrl + ,</code> to open settings</li>
                      <li>• Search for "MCP Servers"</li>
                      <li>• Click "Edit in settings.json"</li>
                      <li>• Paste the configuration above</li>
                      <li>• Restart Claude Code</li>
                    </ol>
                  </div>

                  <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Terminal className="h-5 w-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-400 font-medium">MCP Server Features:</p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-300">
                          <li>• Real-time context streaming</li>
                          <li>• Automatic session detection</li>
                          <li>• Tool usage tracking</li>
                          <li>• Performance metrics</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium mb-4">Review Your Configuration</h3>
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Project Name</p>
                  <p className="font-medium">{projectData.name || 'Not set'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">GitHub Repository</p>
                  <p className="font-medium">{projectData.githubRepo || 'Not configured'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">MCP Server</p>
                  <p className="font-medium">Ready to configure</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-lg p-6">
                <h4 className="text-lg font-medium mb-2">🚀 Ready to Launch!</h4>
                <p className="text-sm text-gray-300 mb-4">
                  Your project will be created and you'll be taken to your dashboard where you can:
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Start capturing Claude Code sessions automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    View real-time context analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Get AI-powered insights and recommendations
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              disabled={
                (currentStep === 1 && !projectData.name) ||
                (currentStep === 2 && (!projectData.githubRepo || !projectData.githubToken))
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCreateProject}
              disabled={isLoading || !projectData.name}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Project
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}