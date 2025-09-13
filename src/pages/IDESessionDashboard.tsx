import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, ChevronDown, Maximize2, Search, MessageSquare, BarChart, Settings, Map, Bot, Sparkles, Copy, CheckCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { NaturalLanguageSearch } from '../components/search/NaturalLanguageSearch';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { ClaudePanel } from '../components/claude/ClaudePanel';
import { ProjectOnboarding } from '../components/onboarding/ProjectOnboarding';
import { ProjectSwitcher } from '../components/projects/ProjectSwitcher';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Session represents a Claude conversation from start to context limit/close
interface Session {
  id: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'context_exceeded' | 'closed';
  title: string;
  summary: string;
  metadata: {
    totalEvents: number;
    totalBlocks: number;
    contextUsage: number; // percentage
    duration?: number; // minutes
    endReason?: 'context_limit' | 'window_closed' | 'session_restart' | 'user_ended';
  };
  blocks: Block[];
}

interface Block {
  id: string;
  sessionId: string;
  title: string;
  type: 'task' | 'exploration' | 'debugging' | 'implementation' | 'review';
  summary: string;
  startTime: string;
  endTime?: string;
  status: 'completed' | 'in_progress' | 'abandoned';
  traces: Trace[];
  metrics: {
    filesModified: number;
    linesChanged: number;
    toolsUsed: string[];
  };
}

interface Trace {
  id: string;
  blockId: string;
  name: string;
  type: 'tool_sequence' | 'conversation' | 'error_handling' | 'file_operation';
  events: RawEvent[];
  summary: string;
  duration: number; // seconds
}

interface RawEvent {
  id: string;
  timestamp: string;
  type: 'tool_use' | 'message' | 'error' | 'context_update' | 'file_change';
  tool?: string;
  data: any;
  impact: 'low' | 'medium' | 'high';
}

type ViewType = 'sessions' | 'blocks' | 'traces' | 'events' | 'overview' | 'search' | 'claude';
type PanelContent = {
  type: ViewType;
  data?: any;
  id: string;
};

// Color system for different types
const colors = {
  session: {
    active: 'bg-emerald-500',
    completed: 'bg-blue-500',
    context_exceeded: 'bg-amber-500',
    closed: 'bg-gray-500'
  },
  block: {
    task: 'bg-blue-500',
    exploration: 'bg-purple-500',
    debugging: 'bg-red-500',
    implementation: 'bg-green-500',
    review: 'bg-orange-500'
  },
  trace: {
    tool_sequence: 'bg-cyan-500',
    conversation: 'bg-indigo-500',
    error_handling: 'bg-rose-500',
    file_operation: 'bg-teal-500'
  },
  event: {
    tool_use: 'bg-blue-400',
    message: 'bg-green-400',
    error: 'bg-red-400',
    context_update: 'bg-purple-400',
    file_change: 'bg-amber-400'
  },
  impact: {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  }
};

export function IDESessionDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Layout state
  const [activeTab, setActiveTab] = useState<'explorer' | 'roadmap' | 'analytics' | 'settings'>('explorer');
  const [explorerExpanded, setExplorerExpanded] = useState(true);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');
  const [sessionPage, setSessionPage] = useState(0);
  const [panels, setPanels] = useState<PanelContent[]>([
    { type: 'overview', id: 'panel-1' }
  ]);
  const [draggedPanel, setDraggedPanel] = useState<string | null>(null);
  const [dragOverPanel, setDragOverPanel] = useState<string | null>(null);
  
  // Data state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['active-session']));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Project state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId || null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);
  
  // Constants for pagination
  const SESSIONS_PER_PAGE = 20;
  const PAGE_SIZE = 20;
  
  // Check for projects and load data
  useEffect(() => {
    if (user) {
      checkUserProjects();
    }
  }, [user]);

  useEffect(() => {
    if (currentProjectId) {
      loadProjectSessions(currentProjectId);
    } else if (hasProjects === false) {
      loadSampleSessions();
    }
  }, [currentProjectId, hasProjects]);

  const checkUserProjects = async () => {
    if (!user) return;
    
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      if (projects && projects.length > 0) {
        setHasProjects(true);
        if (!currentProjectId) {
          setCurrentProjectId(projects[0].id);
          navigate(`/projects/${projects[0].id}`);
        }
      } else {
        setHasProjects(false);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking projects:', error);
      setHasProjects(false);
    }
  };

  const loadProjectSessions = async (projectId: string) => {
    try {
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform database sessions to our Session interface
      const transformedSessions = (sessionsData || []).map(s => ({
        id: s.id,
        startTime: s.created_at,
        endTime: s.ended_at,
        status: s.status || 'completed',
        title: s.title || 'Untitled Session',
        summary: s.summary || '',
        metadata: s.metadata || {
          totalEvents: 0,
          totalBlocks: 0,
          contextUsage: 0,
          duration: 0
        },
        blocks: []
      }));

      setSessions(transformedSessions);
      
      // Set current session if there's an active one
      const activeSession = transformedSessions.find(s => s.status === 'active');
      if (activeSession) {
        setCurrentSession(activeSession);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Fall back to sample data on error
      loadSampleSessions();
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    setCurrentProjectId(newProjectId);
    navigate(`/projects/${newProjectId}`);
  };

  const handleNewProject = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = (newProjectId: string) => {
    setShowOnboarding(false);
    setHasProjects(true);
    setCurrentProjectId(newProjectId);
    navigate(`/projects/${newProjectId}`);
  };

  const loadSampleSessions = () => {
    const now = new Date();
    
    // Current active session
    const activeSession: Session = {
      id: 'session-current',
      startTime: new Date(now.getTime() - 45 * 60000).toISOString(), // 45 mins ago
      status: 'active',
      title: 'Implementing IDE Dashboard',
      summary: 'Building VS Code-style interface with session management',
      metadata: {
        totalEvents: 234,
        totalBlocks: 5,
        contextUsage: 68,
        duration: 45
      },
      blocks: [
        {
          id: 'block-1',
          sessionId: 'session-current',
          title: 'Initial Setup',
          type: 'implementation',
          summary: 'Created base IDE structure with panels',
          startTime: new Date(now.getTime() - 45 * 60000).toISOString(),
          endTime: new Date(now.getTime() - 35 * 60000).toISOString(),
          status: 'completed',
          traces: [
            {
              id: 'trace-1',
              blockId: 'block-1',
              name: 'Component Creation',
              type: 'file_operation',
              events: generateEvents(5),
              summary: 'Created IDEDashboard.tsx with layout',
              duration: 120
            }
          ],
          metrics: {
            filesModified: 3,
            linesChanged: 450,
            toolsUsed: ['Write', 'Edit', 'Read']
          }
        },
        {
          id: 'block-2',
          sessionId: 'session-current',
          title: 'Session Management',
          type: 'implementation',
          summary: 'Adding session hierarchy and exploration',
          startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
          status: 'in_progress',
          traces: [
            {
              id: 'trace-2',
              blockId: 'block-2',
              name: 'Refactoring Explorer',
              type: 'file_operation',
              events: generateEvents(8),
              summary: 'Updating explorer to show sessions',
              duration: 240
            }
          ],
          metrics: {
            filesModified: 2,
            linesChanged: 320,
            toolsUsed: ['Read', 'Edit', 'MultiEdit']
          }
        }
      ]
    };

    // Previous completed sessions
    const previousSessions: Session[] = [
      {
        id: 'session-1',
        startTime: new Date(now.getTime() - 4 * 3600000).toISOString(), // 4 hours ago
        endTime: new Date(now.getTime() - 2 * 3600000).toISOString(),
        status: 'context_exceeded',
        title: 'MCP Integration Implementation',
        summary: 'Built WebSocket server and event processing system',
        metadata: {
          totalEvents: 892,
          totalBlocks: 12,
          contextUsage: 100,
          duration: 120,
          endReason: 'context_limit'
        },
        blocks: generateBlocks('session-1', 12)
      },
      {
        id: 'session-2',
        startTime: new Date(now.getTime() - 24 * 3600000).toISOString(), // Yesterday
        endTime: new Date(now.getTime() - 22 * 3600000).toISOString(),
        status: 'completed',
        title: 'Dashboard Redesign',
        summary: 'Transformed dashboard to context-first memory system',
        metadata: {
          totalEvents: 567,
          totalBlocks: 8,
          contextUsage: 78,
          duration: 120,
          endReason: 'user_ended'
        },
        blocks: generateBlocks('session-2', 8)
      },
      {
        id: 'session-3',
        startTime: new Date(now.getTime() - 48 * 3600000).toISOString(), // 2 days ago
        endTime: new Date(now.getTime() - 46 * 3600000).toISOString(),
        status: 'closed',
        title: 'Bug Fixes and Performance',
        summary: 'Fixed connection issues and optimized rendering',
        metadata: {
          totalEvents: 234,
          totalBlocks: 5,
          contextUsage: 45,
          duration: 120,
          endReason: 'window_closed'
        },
        blocks: generateBlocks('session-3', 5)
      }
    ];

    setSessions([activeSession, ...previousSessions]);
    setCurrentSession(activeSession);
  };

  // Helper to generate sample data
  function generateEvents(count: number): RawEvent[] {
    const tools = ['Read', 'Write', 'Edit', 'Bash', 'WebSearch', 'Grep', 'MultiEdit'];
    const types: RawEvent['type'][] = ['tool_use', 'message', 'error', 'context_update', 'file_change'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `event-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      type: types[Math.floor(Math.random() * types.length)],
      tool: tools[Math.floor(Math.random() * tools.length)],
      data: { action: 'sample', details: `Event ${i + 1}` },
      impact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high'
    }));
  }

  function generateBlocks(sessionId: string, count: number): Block[] {
    const blockTypes: Block['type'][] = ['task', 'exploration', 'debugging', 'implementation', 'review'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `${sessionId}-block-${i}`,
      sessionId,
      title: `Block ${i + 1}`,
      type: blockTypes[Math.floor(Math.random() * blockTypes.length)],
      summary: `Work block ${i + 1} in session`,
      startTime: new Date(Date.now() - (count - i) * 600000).toISOString(),
      endTime: new Date(Date.now() - (count - i - 1) * 600000).toISOString(),
      status: 'completed',
      traces: [
        {
          id: `${sessionId}-trace-${i}`,
          blockId: `${sessionId}-block-${i}`,
          name: `Trace ${i + 1}`,
          type: 'tool_sequence',
          events: generateEvents(3),
          summary: `Trace operations for block ${i + 1}`,
          duration: 180
        }
      ],
      metrics: {
        filesModified: Math.floor(Math.random() * 5) + 1,
        linesChanged: Math.floor(Math.random() * 200) + 50,
        toolsUsed: ['Read', 'Write', 'Edit']
      }
    }));
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const openPanel = (type: ViewType, data?: any) => {
    const newPanel: PanelContent = {
      type,
      data,
      id: `panel-${Date.now()}`
    };
    
    if (panels.length < 3) {
      setPanels([...panels, newPanel]);
    } else {
      // Replace the last panel if we have 3
      setPanels([...panels.slice(0, 2), newPanel]);
    }
  };

  const closePanel = (id: string) => {
    setPanels(panels.filter(p => p.id !== id));
    if (panels.length === 1) {
      // Always keep at least one panel
      setPanels([{ type: 'overview', id: 'panel-default' }]);
    }
  };

  const handleDragStart = (e: React.DragEvent, panelId: string) => {
    setDraggedPanel(panelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, panelId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPanel && draggedPanel !== panelId) {
      setDragOverPanel(panelId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPanel(null);
  };

  const handleDrop = (e: React.DragEvent, targetPanelId: string) => {
    e.preventDefault();
    
    if (draggedPanel && draggedPanel !== targetPanelId) {
      const draggedIndex = panels.findIndex(p => p.id === draggedPanel);
      const targetIndex = panels.findIndex(p => p.id === targetPanelId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newPanels = [...panels];
        const [draggedItem] = newPanels.splice(draggedIndex, 1);
        newPanels.splice(targetIndex, 0, draggedItem);
        setPanels(newPanels);
      }
    }
    
    setDraggedPanel(null);
    setDragOverPanel(null);
  };

  const handleDragEnd = () => {
    setDraggedPanel(null);
    setDragOverPanel(null);
  };

  const getPanelWidth = () => {
    switch (panels.length) {
      case 1: return 'w-full';
      case 2: return 'w-1/2';
      case 3: return 'w-1/3';
      default: return 'w-full';
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };;

  const handleNavigateFromSearch = (type: string, id: string, metadata?: any) => {
    // Navigate to the appropriate item based on type
    if (type === 'session' && metadata?.sessionId) {
      const session = sessions.find(s => s.id === metadata.sessionId);
      if (session) {
        setCurrentSession(session);
        openPanel('sessions', session);
        setActiveTab('explorer');
        setExplorerExpanded(true);
      }
    } else if (type === 'block' && metadata?.sessionId && metadata?.blockId) {
      const session = sessions.find(s => s.id === metadata.sessionId);
      const block = session?.blocks.find(b => b.id === metadata.blockId);
      if (block) {
        openPanel('blocks', block);
        setActiveTab('explorer');
        setExplorerExpanded(true);
        // Expand the session in the explorer
        setExpandedNodes(prev => new Set([...prev, metadata.sessionId]));
      }
    } else if (type === 'trace' && metadata?.sessionId && metadata?.blockId && metadata?.traceId) {
      const session = sessions.find(s => s.id === metadata.sessionId);
      const block = session?.blocks.find(b => b.id === metadata.blockId);
      const trace = block?.traces.find(t => t.id === metadata.traceId);
      if (trace) {
        openPanel('traces', trace);
        setActiveTab('explorer');
        setExplorerExpanded(true);
        // Expand both session and block in the explorer
        setExpandedNodes(prev => new Set([...prev, metadata.sessionId, metadata.blockId]));
      }
    } else if (type === 'event') {
      // For events, show the containing trace
      openPanel('events', { id, ...metadata });
      setActiveTab('explorer');
      setExplorerExpanded(true);
    }
  };

  const getGitHubContext = () => {
    // This would be populated from actual git status and GitHub API
    return {
      currentBranch: 'main',
      recentCommits: [
        {
          hash: 'b57b0be',
          message: 'feat: transform Frizy into context-first memory system',
          author: 'user',
          timestamp: new Date().toISOString()
        }
      ],
      modifiedFiles: [
        'src/pages/IDESessionDashboard.tsx',
        'src/components/search/NaturalLanguageSearch.tsx'
      ],
      repository: 'frizyai'
    };
  };

  // Render different view types
  const handleCompileToClaudePanel = (prompt: string) => {
    // Open Claude panel with the compiled prompt
    openPanel('claude', { sessions, currentSession, initialPrompt: prompt });
  };

  const renderPanelContent = (panel: PanelContent) => {
    switch (panel.type) {
      case 'overview':
        return <OverviewView sessions={sessions} currentSession={currentSession} onItemClick={openPanel} onCompile={handleCompileToClaudePanel} />;
      case 'sessions':
        return <SessionView session={panel.data || currentSession} onBlockClick={(block) => openPanel('blocks', block)} onCompile={handleCompileToClaudePanel} />;
      case 'blocks':
        return <BlockView block={panel.data} onTraceClick={(trace) => openPanel('traces', trace)} onCompile={handleCompileToClaudePanel} />;
      case 'traces':
        return <TraceView trace={panel.data} onEventClick={(event) => openPanel('events', event)} onCompile={handleCompileToClaudePanel} />;
      case 'events':
        return <EventView event={panel.data} />;
      case 'claude':
        return <ClaudePanel sessions={sessions} currentSession={currentSession} initialPrompt={panel.data?.initialPrompt} />;
      default:
        return null;
    }
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return <ProjectOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Frizy AI</h1>
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Project Switcher */}
          {hasProjects && (
            <ProjectSwitcher
              currentProjectId={currentProjectId}
              onProjectChange={handleProjectChange}
              onNewProject={handleNewProject}
            />
          )}
          
          <div className="h-6 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            {currentSession && currentSession.status === 'active' && (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-gray-400">Active Session</span>
                <span className="text-sm text-emerald-400 font-medium">{currentSession.metadata.contextUsage}% context</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{sessions.length} total sessions</span>
            <span>{sessions.reduce((acc, s) => acc + s.metadata.totalEvents, 0)} events tracked</span>
          </div>
          <button
            onClick={() => openPanel('claude', { sessions, currentSession })}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Bot className="h-4 w-4" />
            <span className="text-sm font-medium">Ask Claude</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mini Sidebar - Activity Bar */}
        <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`p-3 hover:bg-gray-800 ${activeTab === 'explorer' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
            title="Explorer"
          >
            <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-400 to-blue-600" />
          </button>
          <button
            onClick={() => { setActiveTab('roadmap'); setExplorerExpanded(true); }}
            className={`p-3 hover:bg-gray-800 ${activeTab === 'roadmap' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
            title="Roadmap"
          >
            <div className="h-5 w-5 rounded bg-gradient-to-br from-orange-400 to-orange-600" />
          </button>
          <button
            onClick={() => setSearchPanelOpen(!searchPanelOpen)}
            className={`p-3 hover:bg-gray-800 ${searchPanelOpen ? 'bg-gray-800 border-l-2 border-purple-400' : ''}`}
            title="Toggle Search Panel"
          >
            <div className="h-5 w-5 rounded bg-gradient-to-br from-purple-400 to-purple-600" />
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`p-3 hover:bg-gray-800 ${activeTab === 'analytics' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
            title="Analytics"
          >
            <div className="h-5 w-5 rounded bg-gradient-to-br from-green-400 to-green-600" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-3 hover:bg-gray-800 ${activeTab === 'settings' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
            title="Settings"
          >
            <div className="h-5 w-5 rounded bg-gradient-to-br from-gray-400 to-gray-600" />
          </button>
        </div>

        {/* Explorer Panel */}
        {explorerExpanded && (
          <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-400">
                {activeTab === 'explorer' ? 'Session Explorer' : activeTab === 'roadmap' ? 'Development Roadmap' : activeTab.toUpperCase()}
              </span>
              <button
                onClick={() => setExplorerExpanded(false)}
                className="hover:bg-gray-800 p-1 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            
            {activeTab === 'explorer' && (
              <div className="flex-1 overflow-y-auto p-2">
                {/* Search/Filter Bar */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Filter sessions..."
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    className="w-full px-2 py-1 bg-gray-800 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                
                <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center justify-between">
                  <span>SESSION HISTORY</span>
                  <span className="text-xs font-normal">{sessions.length} total</span>
                </div>
                
                <div className="space-y-1">
                  {/* Show filtered and paginated sessions */}
                  {useMemo(() => {
                    const filtered = sessions.filter(s => 
                      !sessionFilter || 
                      s.title.toLowerCase().includes(sessionFilter.toLowerCase()) ||
                      s.summary.toLowerCase().includes(sessionFilter.toLowerCase())
                    );
                    return filtered.slice(sessionPage * SESSIONS_PER_PAGE, (sessionPage + 1) * SESSIONS_PER_PAGE);
                  }, [sessions, sessionFilter, sessionPage]).map((session, index) => (
                      <div key={session.id} className="group">
                        <button
                          onClick={() => openPanel('sessions', session)}
                          className={`w-full text-left rounded px-2 py-1.5 transition-all ${
                            session.status === 'active' 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-l-2 border-emerald-500' 
                              : 'hover:bg-gray-800 border-l-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs font-medium truncate">{session.title}</span>
                              {session.status === 'active' && (
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{formatTimeAgo(session.startTime)}</span>
                              <span className={`${
                                session.metadata.contextUsage > 80 ? 'text-red-400' : 
                                session.metadata.contextUsage > 60 ? 'text-amber-400' : 
                                'text-gray-500'
                              }`}>
                                {session.metadata.contextUsage}%
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {sessions.length > SESSIONS_PER_PAGE && (
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => setSessionPage(Math.max(0, sessionPage - 1))}
                        disabled={sessionPage === 0}
                        className="px-2 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-gray-400">
                        Page {sessionPage + 1} of {Math.ceil(sessions.length / SESSIONS_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setSessionPage(Math.min(Math.ceil(sessions.length / SESSIONS_PER_PAGE) - 1, sessionPage + 1))}
                        disabled={sessionPage >= Math.ceil(sessions.length / SESSIONS_PER_PAGE) - 1}
                        className="px-2 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="flex-1 overflow-hidden">
                <RoadmapView 
                  sessions={sessions}
                  onItemClick={(item) => {
                    // You can handle roadmap item clicks here
                    console.log('Roadmap item clicked:', item);
                  }}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="p-2 space-y-4">
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Total Sessions</div>
                  <div className="text-2xl font-bold">{sessions.length}</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Avg Duration</div>
                  <div className="text-xl font-bold">
                    {formatDuration(
                      Math.round(
                        sessions.reduce((acc, s) => acc + (s.metadata.duration || 0), 0) / sessions.length
                      )
                    )}
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Total Events</div>
                  <div className="text-xl font-bold">
                    {sessions.reduce((acc, s) => acc + s.metadata.totalEvents, 0)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Panel Area */}
        <div className="flex-1 flex">
          {panels.map((panel, index) => (
            <div 
              key={panel.id} 
              className={`${getPanelWidth()} border-r border-gray-800 last:border-r-0 flex flex-col ${
                dragOverPanel === panel.id ? 'bg-blue-500/10' : ''
              } transition-colors`}
              draggable
              onDragStart={(e) => handleDragStart(e, panel.id)}
              onDragOver={(e) => handleDragOver(e, panel.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, panel.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Panel Header */}
              <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-2 cursor-move">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                  </div>
                  <span className="text-xs font-medium capitalize">{panel.type} View</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="hover:bg-gray-800 p-1 rounded">
                    <Maximize2 className="h-3 w-3" />
                  </button>
                  {panels.length > 1 && (
                    <button
                      onClick={() => closePanel(panel.id)}
                      className="hover:bg-gray-800 p-1 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Panel Content */}
              <div className="flex-1 overflow-auto">
                {renderPanelContent(panel)}
              </div>
            </div>
          ))}
        </div>

        {/* Search Panel - Optional Side Panel */}
        {searchPanelOpen && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gradient-to-br from-purple-400 to-purple-600" />
                <span className="text-xs font-medium">Claude Natural Language</span>
              </div>
              <button
                onClick={() => setSearchPanelOpen(false)}
                className="hover:bg-gray-800 p-1 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <NaturalLanguageSearch 
                sessions={sessions}
                onNavigate={handleNavigateFromSearch}
                githubContext={getGitHubContext()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Overview View - Shows all sessions
function OverviewView({ sessions, currentSession, onItemClick, onCompile }: {
  sessions: Session[];
  currentSession: Session | null;
  onItemClick: (type: ViewType, item: any) => void;
  onCompile?: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const compileToPrompt = () => {
    let prompt = `## Sessions Overview\n\n`;
    
    if (currentSession && currentSession.status === 'active') {
      prompt += `### Current Active Session\n`;
      prompt += `**${currentSession.title}**\n`;
      prompt += `${currentSession.summary}\n`;
      prompt += `- Context: ${currentSession.metadata.contextUsage}%\n`;
      prompt += `- Blocks: ${currentSession.metadata.totalBlocks}\n`;
      prompt += `- Events: ${currentSession.metadata.totalEvents}\n`;
      prompt += `- Duration: ${formatDuration(currentSession.metadata.duration)}\n\n`;
    }
    
    const historicalSessions = sessions.filter(s => s.status !== 'active');
    if (historicalSessions.length > 0) {
      prompt += `### Recent Sessions (${historicalSessions.length})\n\n`;
      historicalSessions.slice(0, 5).forEach((session, idx) => {
        prompt += `${idx + 1}. **${session.title}** (${session.status})\n`;
        prompt += `   ${session.summary}\n`;
        prompt += `   - Blocks: ${session.metadata.totalBlocks}, Events: ${session.metadata.totalEvents}\n`;
        prompt += `   - Context: ${session.metadata.contextUsage}%, Duration: ${formatDuration(session.metadata.duration)}\n\n`;
      });
    }
    
    return prompt;
  };

  const handleCompile = () => {
    const prompt = compileToPrompt();
    if (onCompile) {
      onCompile(prompt);
    } else {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Session Overview</h2>
            <p className="text-sm text-gray-400 mt-1">Current and historical sessions</p>
          </div>
          <button
            onClick={handleCompile}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Compile</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Current Session */}
      {currentSession && currentSession.status === 'active' && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Current Session</h3>
          <div
            onClick={() => onItemClick('sessions', currentSession)}
            className="bg-gray-900 rounded-lg p-3 cursor-pointer hover:bg-gray-800 border-l-2 border-emerald-500"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-medium text-sm">{currentSession.title}</span>
              <div className="text-xs text-gray-500">
                {currentSession.metadata.contextUsage}% context
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">{currentSession.summary}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{currentSession.metadata.totalBlocks} blocks</span>
              <span>{currentSession.metadata.totalEvents} events</span>
              <span>{formatDuration(currentSession.metadata.duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Session History */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Session History</h3>
        <div className="space-y-2">
          {sessions.filter(s => s.status !== 'active').map(session => (
            <div
              key={session.id}
              onClick={() => onItemClick('sessions', session)}
              className="bg-gray-900 rounded-lg p-3 cursor-pointer hover:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{session.title}</span>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(session.startTime)}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">{session.summary}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{session.metadata.totalBlocks} blocks</span>
                <span>{session.metadata.totalEvents} events</span>
                <span>{formatDuration(session.metadata.duration)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Session View - Shows blocks within a session
function SessionView({ session, onBlockClick, onCompile }: {
  session: Session | null;
  onBlockClick: (block: Block) => void;
  onCompile?: (prompt: string) => void;
}) {
  if (!session) return <div className="p-4">No session selected</div>;

  const [copied, setCopied] = useState(false);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const compileToPrompt = () => {
    let prompt = `## Context: ${session.title}\n\n`;
    prompt += `### Summary\n${session.summary}\n\n`;
    prompt += `### Session Metrics\n`;
    prompt += `- Status: ${session.status}\n`;
    prompt += `- Duration: ${formatDuration(session.metadata.duration)}\n`;
    prompt += `- Context Usage: ${session.metadata.contextUsage}%\n`;
    prompt += `- Total Blocks: ${session.metadata.totalBlocks}\n`;
    prompt += `- Total Events: ${session.metadata.totalEvents}\n\n`;
    
    if (session.blocks && session.blocks.length > 0) {
      prompt += `### Work Blocks\n`;
      session.blocks.forEach((block, idx) => {
        prompt += `\n${idx + 1}. **${block.title}** (${block.status})\n`;
        prompt += `   ${block.summary}\n`;
        prompt += `   - Files: ${block.metrics.filesModified}, Lines: ${block.metrics.linesChanged}\n`;
        prompt += `   - Tools: ${block.metrics.toolsUsed.join(', ')}\n`;
      });
    }
    
    return prompt;
  };

  const handleCompile = () => {
    const prompt = compileToPrompt();
    if (onCompile) {
      onCompile(prompt);
    } else {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{session.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{session.summary}</p>
          </div>
          <button
            onClick={handleCompile}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Compile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Details Block */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Session Details</h3>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Context Usage</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      session.metadata.contextUsage >= 90 ? 'bg-red-500' :
                      session.metadata.contextUsage >= 70 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${session.metadata.contextUsage}%` }}
                  />
                </div>
                <span className="text-xs">{session.metadata.contextUsage}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Duration</div>
              <div className="text-xs">{formatDuration(session.metadata.duration)}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-800">
            <div>
              <div className="text-xs text-gray-400">Events</div>
              <div className="text-sm font-medium">{session.metadata.totalEvents}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Blocks</div>
              <div className="text-sm font-medium">{session.metadata.totalBlocks}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Status</div>
              <div className="text-sm font-medium">{session.status}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Blocks */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Work Blocks</h3>
        <div className="space-y-2">
          {session.blocks.map(block => (
            <div
              key={block.id}
              onClick={() => onBlockClick(block)}
              className="bg-gray-900 rounded-lg p-3 cursor-pointer hover:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{block.title}</span>
                <span className="text-xs text-gray-500">
                  {block.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{block.summary}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{block.metrics.filesModified} files</span>
                <span>{block.metrics.linesChanged} lines</span>
                <span>{block.traces.length} traces</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Block View - Shows traces within a block
function BlockView({ block, onTraceClick, onCompile }: {
  block: Block | null;
  onTraceClick: (trace: Trace) => void;
  onCompile?: (prompt: string) => void;
}) {
  if (!block) return <div className="p-4">No block selected</div>;

  const [copied, setCopied] = useState(false);

  const compileToPrompt = () => {
    let prompt = `## Context: ${block.title}\n\n`;
    prompt += `### Summary\n${block.summary}\n\n`;
    prompt += `### Block Details\n`;
    prompt += `- Type: ${block.type}\n`;
    prompt += `- Status: ${block.status}\n`;
    prompt += `- Files Modified: ${block.metrics.filesModified}\n`;
    prompt += `- Lines Changed: ${block.metrics.linesChanged}\n`;
    prompt += `- Tools Used: ${block.metrics.toolsUsed.join(', ')}\n\n`;
    
    if (block.traces && block.traces.length > 0) {
      prompt += `### Traces (${block.traces.length})\n`;
      block.traces.forEach((trace, idx) => {
        prompt += `\n${idx + 1}. **${trace.name}** (${trace.type})\n`;
        prompt += `   ${trace.summary}\n`;
        prompt += `   - Duration: ${trace.duration}s\n`;
        prompt += `   - Events: ${trace.events.length}\n`;
      });
    }
    
    return prompt;
  };

  const handleCompile = () => {
    const prompt = compileToPrompt();
    if (onCompile) {
      onCompile(prompt);
    } else {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{block.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{block.summary}</p>
          </div>
          <button
            onClick={handleCompile}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Compile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Block Details */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Block Details</h3>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-400">Files Modified</div>
              <div className="text-sm font-medium">{block.metrics.filesModified}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Lines Changed</div>
              <div className="text-sm font-medium">{block.metrics.linesChanged}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Status</div>
              <div className="text-sm font-medium">{block.status}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Tools Used</div>
            <div className="flex flex-wrap gap-1">
              {block.metrics.toolsUsed.map(tool => (
                <span key={tool} className="text-xs bg-gray-800 px-2 py-0.5 rounded">{tool}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Traces */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Traces</h3>
        <div className="space-y-2">
          {block.traces.map(trace => (
            <div
              key={trace.id}
              onClick={() => onTraceClick(trace)}
              className="bg-gray-900 rounded-lg p-3 cursor-pointer hover:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-sm">{trace.name}</span>
                <span className="text-xs text-gray-500">{trace.duration}s</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{trace.summary}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{trace.type.replace('_', ' ')}</span>
                <span>{trace.events.length} events</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Trace View - Shows events within a trace
function TraceView({ trace, onEventClick, onCompile }: {
  trace: Trace | null;
  onEventClick: (event: RawEvent) => void;
  onCompile?: (prompt: string) => void;
}) {
  if (!trace) return <div className="p-4">No trace selected</div>;

  const [copied, setCopied] = useState(false);

  const compileToPrompt = () => {
    let prompt = `## Context: ${trace.name}\n\n`;
    prompt += `### Summary\n${trace.summary}\n\n`;
    prompt += `### Trace Details\n`;
    prompt += `- Type: ${trace.type.replace('_', ' ')}\n`;
    prompt += `- Duration: ${trace.duration}s\n`;
    prompt += `- Total Events: ${trace.events.length}\n\n`;
    
    if (trace.events && trace.events.length > 0) {
      prompt += `### Events\n`;
      trace.events.forEach((event, idx) => {
        prompt += `\n${idx + 1}. **${event.type.replace('_', ' ')}**\n`;
        prompt += `   - Impact: ${event.impact}\n`;
        if (event.tool) prompt += `   - Tool: ${event.tool}\n`;
        prompt += `   - Timestamp: ${new Date(event.timestamp).toLocaleString()}\n`;
        if (event.data && Object.keys(event.data).length > 0) {
          prompt += `   - Data: ${JSON.stringify(event.data, null, 2).substring(0, 200)}...\n`;
        }
      });
    }
    
    return prompt;
  };

  const handleCompile = () => {
    const prompt = compileToPrompt();
    if (onCompile) {
      onCompile(prompt);
    } else {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{trace.name}</h2>
            <p className="text-sm text-gray-400 mt-1">{trace.summary}</p>
          </div>
          <button
            onClick={handleCompile}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Compile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trace Details */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Trace Details</h3>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-400">Type</div>
              <div className="text-sm font-medium">{trace.type.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Duration</div>
              <div className="text-sm font-medium">{trace.duration}s</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Events</div>
              <div className="text-sm font-medium">{trace.events.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Events */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Raw Events</h3>
        <div className="space-y-2">
          {trace.events.map(event => (
            <div
              key={event.id}
              onClick={() => onEventClick(event)}
              className="bg-gray-900 rounded-lg p-3 cursor-pointer hover:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{event.type.replace('_', ' ')}</span>
                  {event.tool && (
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                      {event.tool}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">Event: {event.type.replace('_', ' ')}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{event.impact} impact</span>
                {event.tool && <span>{event.tool}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Event View - Shows raw event details
function EventView({ event }: { event: RawEvent | null }) {
  if (!event) return <div className="p-4">No event selected</div>;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Event Details</h2>
        <p className="text-sm text-gray-400 mt-1">Raw event information</p>
      </div>

      {/* Event Details Block */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Event Information</h3>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400">Event ID</div>
              <div className="font-mono text-xs">{event.id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Timestamp</div>
              <div className="text-xs">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-800">
            <div>
              <div className="text-xs text-gray-400">Type</div>
              <div className="text-sm font-medium">{event.type.replace('_', ' ')}</div>
            </div>
            {event.tool && (
              <div>
                <div className="text-xs text-gray-400">Tool</div>
                <div className="text-sm">{event.tool}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400">Impact</div>
              <div className="text-sm font-medium">{event.impact}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Data Block */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Event Data</h3>
        <div className="bg-gray-900 rounded-lg p-3">
          <pre className="text-xs overflow-x-auto text-gray-300">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}