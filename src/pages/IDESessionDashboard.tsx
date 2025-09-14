import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronRight, ChevronDown, Maximize2, Search, MessageSquare, BarChart, Settings, Map, Bot, Sparkles, Copy, CheckCircle, Layers, Activity, Database, GitBranch, Clock, HelpCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { NaturalLanguageSearch } from '../components/search/NaturalLanguageSearch';
import { RoadmapView } from '../components/roadmap/RoadmapView';
import { ClaudePanel } from '../components/claude/ClaudePanel';
import { ProjectOnboarding } from '../components/onboarding/ProjectOnboarding';
import { ProjectSwitcher } from '../components/projects/ProjectSwitcher';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { MCPSetupWizard } from '../components/MCPSetupWizard';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { MCPSetupInstructions } from '../components/MCPSetupInstructions';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper functions
const formatDuration = (value?: number, unit: 'seconds' | 'minutes' = 'minutes'): string => {
  if (!value) return '';
  let minutes = unit === 'seconds' ? Math.floor(value / 60) : value;
  if (unit === 'seconds' && value < 60) return `${value}s`;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

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

type ViewType = 'sessions' | 'blocks' | 'traces' | 'events' | 'overview' | 'search' | 'claude' | 'analytics';
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
  
  // Data state - Initialize mcpEvents from localStorage if available
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['active-session']));
  const [searchQuery, setSearchQuery] = useState('');
  const [mcpEvents, setMcpEvents] = useState<any[]>(() => {
    // Try to load events from localStorage on initial load
    try {
      const savedEvents = localStorage.getItem('mcp-events');
      if (savedEvents) {
        const events = JSON.parse(savedEvents);
        console.log('Restored', events.length, 'events from localStorage');
        return events;
      }
    } catch (error) {
      console.error('Failed to load events from localStorage:', error);
    }
    return [];
  });
  const [fileChanges, setFileChanges] = useState<any[]>([]);

  // Use ref to access current mcpEvents in WebSocket handler
  const mcpEventsRef = useRef(mcpEvents);
  useEffect(() => {
    mcpEventsRef.current = mcpEvents;
  }, [mcpEvents]);

  // Project state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId || null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);

  // MCP Setup state
  const [showMCPSetup, setShowMCPSetup] = useState(false);
  const [showMCPInstructions, setShowMCPInstructions] = useState(false);
  
  // Constants for pagination
  const SESSIONS_PER_PAGE = 20;
  const PAGE_SIZE = 20;

  // Helper function to organize events into blocks and traces
  const organizeEventsIntoBlocks = (events: RawEvent[]): Block[] => {
    if (events.length === 0) return [];

    const blocks: Block[] = [];
    let currentBlock: Block | null = null;
    let currentTrace: Trace | null = null;
    let blockEvents: RawEvent[] = [];
    let traceEvents: RawEvent[] = [];

    events.forEach((event, index) => {
      const prevEvent = events[index - 1];
      const timeSincePrev = prevEvent
        ? (new Date(event.timestamp).getTime() - new Date(prevEvent.timestamp).getTime()) / 1000 / 60
        : 0;

      // Start new block after 15 minutes gap or different activity type
      const shouldStartNewBlock = !currentBlock || timeSincePrev > 15 ||
        (prevEvent && detectActivityChange(prevEvent, event));

      if (shouldStartNewBlock) {
        // Save previous block if exists
        if (currentBlock && currentTrace) {
          currentTrace.events = traceEvents;
          currentBlock.traces.push(currentTrace);
          currentBlock.metrics.filesModified = blockEvents.filter(e => e.type === 'file_change').length;
          currentBlock.metrics.toolsUsed = [...new Set(blockEvents.filter(e => e.tool).map(e => e.tool))];
          blocks.push(currentBlock);
        }

        // Create new block
        const blockType = determineBlockType(event);
        const blockTitle = getBlockTitle(blockType, event);
        const timeLabel = formatTimestamp(event.timestamp);
        currentBlock = {
          id: `block-${blocks.length + 1}`,
          sessionId: 'mcp-realtime',
          title: `${blockTitle} • ${timeLabel}`,
          type: blockType,
          summary: generateBlockSummary(blockType, event),
          startTime: event.timestamp,
          status: 'completed' as const,
          traces: [],
          metrics: {
            filesModified: 0,
            linesChanged: 0,
            toolsUsed: []
          }
        };
        blockEvents = [];
        currentTrace = null;
        traceEvents = [];
      }

      // Start new trace every 5 events of same type or on type change
      const shouldStartNewTrace = !currentTrace || traceEvents.length >= 5 ||
        (prevEvent && prevEvent.type !== event.type);

      if (shouldStartNewTrace && currentBlock) {
        // Save previous trace if exists
        if (currentTrace && traceEvents.length > 0) {
          currentTrace.events = traceEvents;
          currentTrace.duration = calculateDuration(traceEvents);
          currentBlock.traces.push(currentTrace);
        }

        // Create new trace
        currentTrace = {
          id: `trace-${currentBlock.traces.length + 1}`,
          blockId: currentBlock.id,
          name: getTraceName(event),
          type: getTraceType(event),
          events: [],
          summary: '',
          duration: 0
        };
        traceEvents = [];
      }

      // Add event to current collections
      blockEvents.push(event);
      traceEvents.push(event);
    });

    // Save final block and trace
    if (currentBlock && currentTrace) {
      currentTrace.events = traceEvents;
      currentTrace.duration = calculateDuration(traceEvents);
      currentBlock.traces.push(currentTrace);
      currentBlock.metrics.filesModified = blockEvents.filter(e => e.type === 'file_change').length;
      currentBlock.metrics.toolsUsed = [...new Set(blockEvents.filter(e => e.tool).map(e => e.tool))];
      currentBlock.status = 'in_progress'; // Last block is still in progress
      blocks.push(currentBlock);
    }

    return blocks;
  };

  const detectActivityChange = (prev: RawEvent, curr: RawEvent): boolean => {
    // Major activity changes that warrant new block
    if (prev.tool === 'git' && curr.tool !== 'git') return true;
    if (prev.type === 'error' && curr.type !== 'error') return true;
    return false;
  };

  const determineBlockType = (event: RawEvent): Block['type'] => {
    if (event.type === 'error') return 'debugging';
    if (event.tool === 'git') return 'review';
    if (event.type === 'file_change') return 'implementation';
    return 'exploration';
  };

  const getBlockTitle = (type: Block['type'], event: RawEvent): string => {
    // Extract contextual information from the event
    const data = event.data || {};

    switch (type) {
      case 'debugging': {
        const errorMessage = data.error || data.message || '';
        return errorMessage ? `Fixing: ${errorMessage.substring(0, 50)}...` : 'Error Resolution';
      }
      case 'review': {
        // Git operations - show branch and operation type
        if (data.subtype === 'commit') {
          return `Git Commit: ${data.message?.substring(0, 40) || 'Changes'}`;
        }
        if (data.subtype === 'status_update' && data.status) {
          const branch = data.status.branch || 'main';
          const modified = data.status.modified || 0;
          const ahead = data.status.ahead || 0;
          const behind = data.status.behind || 0;

          let statusText = `Git: ${branch}`;
          if (modified > 0) statusText += ` (${modified} modified)`;
          if (ahead > 0) statusText += ` ↑${ahead}`;
          if (behind > 0) statusText += ` ↓${behind}`;
          return statusText;
        }
        if (data.status?.branch) {
          return `Git: ${data.status.branch} (${data.status.modified || 0} modified)`;
        }
        return 'Git Operations';
      }
      case 'implementation': {
        // File changes - show affected files
        if (data.files && data.files.length > 0) {
          const fileNames = data.files.map((f: any) =>
            typeof f === 'string' ? f.split('/').pop() : f.path?.split('/').pop()
          ).filter(Boolean);
          if (fileNames.length === 1) {
            return `Editing: ${fileNames[0]}`;
          } else if (fileNames.length <= 3) {
            return `Editing: ${fileNames.join(', ')}`;
          } else {
            return `Editing ${fileNames.length} files`;
          }
        }
        if (data.path) {
          const fileName = data.path.split('/').pop();
          return `Working on: ${fileName}`;
        }
        return 'Code Changes';
      }
      case 'task': {
        return data.taskName || 'Task Execution';
      }
      default: {
        // Try to extract any meaningful context
        if (data.action) return data.action;
        if (data.command) return `Running: ${data.command.substring(0, 30)}...`;
        return 'Development Activity';
      }
    }
  };

  const getTraceName = (event: RawEvent): string => {
    const data = event.data || {};

    if (event.tool === 'git') {
      if (data.subtype) return `git ${data.subtype}`;
      return 'git operations';
    }

    if (event.type === 'file_change') {
      if (data.files && data.files.length > 0) {
        const ext = data.files[0].split('.').pop();
        return `${ext} file changes`;
      }
      return 'File modifications';
    }

    if (event.tool) {
      return `${event.tool} ${data.action || 'operations'}`;
    }

    return event.type.replace('_', ' ');
  };

  const getTraceType = (event: RawEvent): Trace['type'] => {
    if (event.type === 'error') return 'error_handling';
    if (event.type === 'file_change') return 'file_operation';
    if (event.tool) return 'tool_sequence';
    return 'conversation';
  };

  const calculateDuration = (events: RawEvent[]): number => {
    if (events.length < 2) return 0;
    const first = new Date(events[0].timestamp).getTime();
    const last = new Date(events[events.length - 1].timestamp).getTime();
    return Math.round((last - first) / 1000); // seconds
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };


  const generateBlockSummary = (type: Block['type'], event: RawEvent): string => {
    const data = event.data || {};

    switch (type) {
      case 'debugging':
        return `Resolving errors and debugging issues`;
      case 'review':
        if (data.status) {
          const { modified = 0, added = 0, deleted = 0 } = data.status;
          return `Repository status: +${added} -${deleted} ~${modified} files`;
        }
        return 'Version control operations';
      case 'implementation':
        if (data.stats) {
          return `${data.stats.totalChanges || 0} changes across ${data.stats.filesChanged || 0} files`;
        }
        return 'Implementing features and modifications';
      default:
        return 'Exploring and analyzing codebase';
    }
  };
  
  // Save events to localStorage whenever they change
  useEffect(() => {
    if (mcpEvents.length > 0) {
      try {
        // Limit storage to last 100 events to avoid localStorage limits
        const eventsToSave = mcpEvents.slice(-100);
        localStorage.setItem('mcp-events', JSON.stringify(eventsToSave));
        console.log('Saved', eventsToSave.length, 'events to localStorage');
      } catch (error) {
        console.error('Failed to save events to localStorage:', error);
      }
    }
  }, [mcpEvents]);

  // Estimate token usage from events (rough approximation)
  const estimateTokenUsage = (events: RawEvent[]): number => {
    let totalTokens = 0;
    events.forEach(event => {
      // Estimate tokens from event data (roughly 1 token per 4 characters)
      const dataString = JSON.stringify(event.data || {});
      totalTokens += Math.ceil(dataString.length / 4);
      // Add base tokens for event metadata
      totalTokens += 20; // timestamp, type, tool, impact etc.
    });
    return totalTokens;
  };

  // Update session when mcpEvents changes
  useEffect(() => {
    if (currentSession && currentSession.id === 'mcp-realtime') {
      // Organize events into logical blocks and traces
      const organizedBlocks = organizeEventsIntoBlocks(mcpEvents);

      // Calculate context usage (assuming 200k token limit)
      const tokensUsed = estimateTokenUsage(mcpEvents);
      const maxTokens = 200000; // Claude's context window
      const contextPercentage = Math.min(100, Math.round((tokensUsed / maxTokens) * 100));

      const updatedSession = {
        ...currentSession,
        metadata: {
          ...currentSession.metadata,
          totalEvents: mcpEvents.length,
          totalBlocks: organizedBlocks.length,
          contextUsage: contextPercentage
        },
        blocks: organizedBlocks
      };
      setCurrentSession(updatedSession);
      setSessions([updatedSession]);
      console.log(`Updated session: ${mcpEvents.length} events, ${organizedBlocks.length} blocks, ${contextPercentage}% context`);
    }
  }, [mcpEvents]); // Re-run when events array changes

  // Connect to MCP WebSocket for real data
  useEffect(() => {
    const connectToMCP = () => {
      try {
        const ws = new WebSocket('ws://localhost:3334');

        ws.onopen = () => {
          console.log('Dashboard connected to MCP server');
          // Request initial data
          ws.send(JSON.stringify({ type: 'get_analytics' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('MCP data received:', data);

            // Handle different message types
            if (data.type === 'connected') {
              console.log('Connected with client ID:', data.clientId);

              // Get existing events from ref (which may have been loaded from localStorage)
              const existingEvents = mcpEventsRef.current;
              console.log('Creating session with', existingEvents.length, 'existing events');

              // Organize events into logical blocks and traces
              const organizedBlocks = organizeEventsIntoBlocks(existingEvents);

              const sessionStartTime = existingEvents.length > 0 && existingEvents[0]?.timestamp
                ? existingEvents[0].timestamp
                : new Date().toISOString();

              // Calculate context usage
              const tokensUsed = estimateTokenUsage(existingEvents);
              const maxTokens = 200000;
              const contextPercentage = Math.min(100, Math.round((tokensUsed / maxTokens) * 100));

              const realtimeSession: Session = {
                id: 'mcp-realtime',
                startTime: sessionStartTime,
                status: 'active',
                title: 'Development Session - Frizy AI',
                summary: `Active coding session with ${existingEvents.length} tracked events`,
                metadata: {
                  totalEvents: existingEvents.length,
                  totalBlocks: organizedBlocks.length || 1,
                  contextUsage: contextPercentage,
                  duration: 0
                },
                blocks: organizedBlocks.length > 0 ? organizedBlocks : [{
                  id: 'initial-block',
                  sessionId: 'mcp-realtime',
                  title: 'Starting Session',
                  type: 'exploration',
                  summary: 'Waiting for events...',
                  startTime: new Date().toISOString(),
                  status: 'in_progress',
                  traces: [],
                  metrics: {
                    filesModified: 0,
                    linesChanged: 0,
                    toolsUsed: []
                  }
                }]
              };
              setCurrentSession(realtimeSession);
              setSessions([realtimeSession]);
            } else if (data.type === 'file_changes') {
              console.log('File changes detected:', data);
              setFileChanges(prev => [...prev, data]);
              // Add file change as an event
              const fileEvent: RawEvent = {
                id: `file-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'file_change',
                data: data,
                impact: data.stats?.totalChanges > 5 ? 'high' : 'medium'
              };
              console.log('Creating file event:', fileEvent);
              setMcpEvents(prev => {
                const newEvents = [...prev, fileEvent];
                console.log('Updated mcpEvents array:', newEvents);
                console.log('Total events now:', newEvents.length);

                // Check if we should create a new block or trace
                if (currentSession && currentSession.id === 'mcp-realtime') {
                  const lastEvent = prev[prev.length - 1];
                  const timeSinceLastEvent = lastEvent
                    ? (new Date().getTime() - new Date(lastEvent.timestamp).getTime()) / 1000 / 60 // minutes
                    : 0;

                  // Create new block after 15 minutes of inactivity
                  if (timeSinceLastEvent > 15) {
                    console.log('Creating new block due to time gap:', timeSinceLastEvent, 'minutes');
                    // This would trigger new block creation logic
                  }

                  // Group events into traces by type (every 5 similar events)
                  const recentFileChanges = prev.slice(-5).filter(e => e.type === 'file_change').length;
                  if (recentFileChanges >= 5) {
                    console.log('Should create new trace for file change batch');
                  }
                }

                return newEvents;
              });
            } else if (data.type === 'git_event') {
              console.log('Git event:', data);
              const gitEvent: RawEvent = {
                id: `git-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'tool_use',
                tool: 'git',
                data: data,
                impact: 'medium'
              };
              setMcpEvents(prev => [...prev, gitEvent]);
            } else if (data.type === 'events_logged') {
              console.log('Events logged:', data);
              // Add logged events to our events list
              const newEvents: RawEvent[] = data.events.map((e: any) => ({
                id: e.id,
                timestamp: new Date().toISOString(),
                type: e.type || 'tool_use',
                tool: e.tool,
                data: e.data,
                impact: e.impact || 'low'
              }));

              setMcpEvents(prev => [...prev, ...newEvents]);
            }
          } catch (error) {
            console.error('Error parsing MCP message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('MCP WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('MCP WebSocket closed, reconnecting in 5s...');
          setTimeout(connectToMCP, 5000);
        };

        return ws;
      } catch (error) {
        console.error('Failed to connect to MCP:', error);
        setTimeout(connectToMCP, 5000);
      }
    };

    const ws = connectToMCP();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

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
      // Don't load sample sessions if we have MCP data or a current session
      if (mcpEvents.length === 0 && !currentSession) {
        loadSampleSessions();
      }
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

  const expandPanel = (panelId: string) => {
    // Find the panel to expand
    const panelToExpand = panels.find(p => p.id === panelId);
    if (panelToExpand) {
      // Set this panel as the only panel
      setPanels([panelToExpand]);
    }
  };

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
        // If no specific block is selected, show all blocks from all sessions
        if (!panel.data) {
          const allBlocks = sessions.flatMap(s => s.blocks);
          return <AllBlocksView blocks={allBlocks} onBlockClick={(block) => openPanel('blocks', block)} onCompile={handleCompileToClaudePanel} />;
        }
        return <BlockView block={panel.data} onTraceClick={(trace) => openPanel('traces', trace)} onCompile={handleCompileToClaudePanel} />;
      case 'traces':
        // If no specific trace is selected, show all traces from all blocks
        if (!panel.data) {
          const allTraces = sessions.flatMap(s => s.blocks.flatMap(b => b.traces));
          return <AllTracesView traces={allTraces} onTraceClick={(trace) => openPanel('traces', trace)} onCompile={handleCompileToClaudePanel} />;
        }
        return <TraceView trace={panel.data} onEventClick={(event) => openPanel('events', event)} onCompile={handleCompileToClaudePanel} />;
      case 'events':
        // If no specific event is selected, show all events
        if (!panel.data) {
          // Use mcpEvents if available, otherwise fall back to nested events
          const allEvents = mcpEvents.length > 0 ? mcpEvents : sessions.flatMap(s => s.blocks.flatMap(b => b.traces.flatMap(t => t.events)));
          return <AllEventsView events={allEvents} onEventClick={(event) => openPanel('events', event)} onCompile={handleCompileToClaudePanel} />;
        }
        return <EventView event={panel.data} onCompile={handleCompileToClaudePanel} />;
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 via-yellow-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 bg-clip-text text-transparent">
              Frizy AI
            </h1>
          </div>
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
          {/* Connection Status */}
          <ConnectionStatus onSetupClick={() => setShowMCPSetup(true)} />

          {/* MCP Instructions Button */}
          <button
            onClick={() => setShowMCPInstructions(true)}
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Setup Guide</span>
          </button>

          <div className="h-6 w-px bg-gray-700" />

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
        {/* Mini Sidebar - Waterfall View */}
        <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col">
          {/* Header */}
          <div className="p-2 border-b border-gray-800">
            <div className="text-[10px] font-semibold text-gray-400 text-center">VIEWS</div>
          </div>

          {/* Session Overview */}
          <button
            onClick={() => openPanel('overview', null)}
            className={`p-2 hover:bg-gray-800 group relative`}
            title="Session Overview"
          >
            <Layers className="h-5 w-5 mx-auto text-blue-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Overview</div>
          </button>

          {/* Work Blocks */}
          <button
            onClick={() => openPanel('blocks', null)}
            className={`p-2 hover:bg-gray-800 group relative`}
            title="Work Blocks"
          >
            <GitBranch className="h-5 w-5 mx-auto text-green-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Blocks</div>
          </button>

          {/* Traces */}
          <button
            onClick={() => openPanel('traces', null)}
            className={`p-2 hover:bg-gray-800 group relative`}
            title="Traces - Tool Sequences"
          >
            <Activity className="h-5 w-5 mx-auto text-orange-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Traces</div>
          </button>

          {/* Raw Events */}
          <button
            onClick={() => openPanel('events', null)}
            className={`p-2 hover:bg-gray-800 group relative`}
            title="Raw Events"
          >
            <Database className="h-5 w-5 mx-auto text-purple-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Events</div>
          </button>

          <div className="my-2 mx-2 border-t border-gray-700" />

          {/* Analytics */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`p-2 hover:bg-gray-800 group relative ${activeTab === 'analytics' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
            title="Analytics"
          >
            <BarChart className="h-5 w-5 mx-auto text-cyan-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Stats</div>
          </button>

          {/* Search */}
          <button
            onClick={() => setSearchPanelOpen(!searchPanelOpen)}
            className={`p-2 hover:bg-gray-800 group relative ${searchPanelOpen ? 'bg-gray-800 border-l-2 border-purple-400' : ''}`}
            title="Search"
          >
            <Search className="h-5 w-5 mx-auto text-purple-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Search</div>
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 hover:bg-gray-800 group relative ${activeTab === 'settings' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
            title="Settings"
          >
            <Settings className="h-5 w-5 mx-auto text-gray-400" />
            <div className="text-[9px] mt-0.5 text-gray-400 group-hover:text-white">Settings</div>
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
              <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center px-2">
                {/* Left side - Panel title */}
                <div className="flex-1 flex items-center">
                  <span className="text-xs font-medium capitalize">{panel.type} View</span>
                </div>

                {/* Center - Drag handle (4 dots) */}
                <div className="flex items-center justify-center cursor-move px-2">
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                    <div className="h-1 w-1 bg-gray-600 rounded-full" />
                  </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex-1 flex items-center justify-end gap-1">
                  <button
                    onClick={() => expandPanel(panel.id)}
                    className="hover:bg-gray-800 p-1 rounded"
                    title="Expand panel"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                  {panels.length > 1 && (
                    <button
                      onClick={() => closePanel(panel.id)}
                      className="hover:bg-gray-800 p-1 rounded"
                      title="Close panel"
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

      {/* MCP Setup Wizard */}
      <MCPSetupWizard
        isOpen={showMCPSetup}
        onClose={() => setShowMCPSetup(false)}
        onComplete={(config) => {
          console.log('MCP Config saved:', config);
          setShowMCPSetup(false);
          // Trigger reconnection with new config
          window.location.reload();
        }}
      />

      {/* MCP Setup Instructions Modal */}
      {showMCPInstructions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MCPSetupInstructions onClose={() => setShowMCPInstructions(false)} />
        </div>
      )}
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

// All Blocks View - Shows all blocks from all sessions
function AllBlocksView({ blocks, onBlockClick, onCompile }: {
  blocks: Block[];
  onBlockClick: (block: Block) => void;
  onCompile?: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const compileToPrompt = () => {
    let prompt = `## All Work Blocks (${blocks.length} total)\n\n`;
    blocks.forEach((block, idx) => {
      prompt += `### ${idx + 1}. ${block.title}\n`;
      prompt += `${block.summary}\n`;
      prompt += `- Type: ${block.type}, Status: ${block.status}\n`;
      prompt += `- Metrics: ${block.metrics.filesModified} files, ${block.metrics.linesChanged} lines\n`;
      prompt += `- Traces: ${block.traces.length}\n\n`;
    });
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
          <div>
            <h2 className="text-xl font-semibold">All Work Blocks</h2>
            <p className="text-sm text-gray-400 mt-1">{blocks.length} blocks across all sessions</p>
          </div>
          <button
            onClick={handleCompile}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Compile to Claude</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            onClick={() => onBlockClick(block)}
            className="bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${colors.block[block.type]}`} />
                <span className="font-medium">{block.title}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                block.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                block.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {block.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-3">{block.summary}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{block.metrics.filesModified} files modified</span>
              <span>{block.metrics.linesChanged} lines changed</span>
              <span>{block.traces.length} traces</span>
              <span>{block.metrics.toolsUsed.length} tools used</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// All Traces View - Shows all traces from all blocks
function AllTracesView({ traces, onTraceClick, onCompile }: {
  traces: Trace[];
  onTraceClick: (trace: Trace) => void;
  onCompile?: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const compileToPrompt = () => {
    let prompt = `## All Traces (${traces.length} total)\n\n`;
    traces.forEach((trace, idx) => {
      prompt += `### ${idx + 1}. ${trace.name}\n`;
      prompt += `${trace.summary}\n`;
      prompt += `- Type: ${trace.type}\n`;
      prompt += `- Duration: ${trace.duration}s\n`;
      prompt += `- Events: ${trace.events.length}\n\n`;
    });
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
          <div>
            <h2 className="text-xl font-semibold">All Traces</h2>
            <p className="text-sm text-gray-400 mt-1">{traces.length} traces across all blocks</p>
          </div>
          <button
            onClick={handleCompile}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
          >
            {copied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Compile to Claude</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {traces.map((trace, index) => (
          <div
            key={trace.id}
            onClick={() => onTraceClick(trace)}
            className="bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${colors.trace[trace.type]}`} />
                <span className="font-medium">{trace.name}</span>
              </div>
              <span className="text-xs text-gray-500">{trace.duration}s</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">{trace.summary}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{trace.type}</span>
              <span>{trace.events.length} events</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// All Events View - Shows all events
function AllEventsView({ events, onEventClick, onCompile }: {
  events: RawEvent[];
  onEventClick: (event: RawEvent) => void;
  onCompile: (prompt: string) => void;
}) {
  const compileAllEvents = () => {
    const prompt = `Analyze these ${events.length} events from the current development session:\n\n${events.map(e =>
      `- [${e.timestamp}] ${e.type}${e.tool ? ` (${e.tool})` : ''}: ${JSON.stringify(e.data).substring(0, 100)}...`
    ).join('\n')}\n\nWhat patterns do you see in these events?`;
    onCompile(prompt);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Events</h2>
          <p className="text-sm text-gray-400 mt-1">{events.length} events across all traces</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={compileAllEvents}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>Compile All</span>
          </button>
          {events.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all events? This will remove them from localStorage.')) {
                  setMcpEvents([]);
                  localStorage.removeItem('mcp-events');
                  console.log('Cleared all events');
                }
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
              title="Clear all events"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="bg-gray-900 rounded p-3 hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <div
                onClick={() => onEventClick(event)}
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                <div className={`h-2 w-2 rounded-full ${colors.event[event.type]}`} />
                <span className="text-sm font-medium">{event.type}</span>
                {event.tool && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                    {event.tool}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  event.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                  event.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {event.impact} impact
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const prompt = `Analyze this ${event.type} event:\n\nTool: ${event.tool || 'N/A'}\nImpact: ${event.impact}\nTime: ${event.timestamp}\nData: ${JSON.stringify(event.data).substring(0, 200)}...\n\nWhat does this tell us?`;
                    onCompile(prompt);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-500/20 rounded"
                  title="Compile this event"
                >
                  <Sparkles className="h-3 w-3 text-purple-400" />
                </button>
              </div>
            </div>
            <div
              onClick={() => onEventClick(event)}
              className="text-xs text-gray-500 cursor-pointer"
            >
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
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
function EventView({ event, onCompile }: { event: RawEvent | null; onCompile: (prompt: string) => void }) {
  if (!event) return <div className="p-4">No event selected</div>;

  const compileEvent = () => {
    const prompt = `Analyze this event from my development session:

Event Type: ${event.type}
Tool: ${event.tool || 'N/A'}
Impact: ${event.impact}
Timestamp: ${event.timestamp}

Event Data:
${JSON.stringify(event.data, null, 2)}

What does this event tell us about the development activity? What actions were taken and what was their impact?`;
    onCompile(prompt);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Event Details</h2>
          <p className="text-sm text-gray-400 mt-1">Raw event information</p>
        </div>
        <button
          onClick={compileEvent}
          className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs transition-all"
        >
          <Sparkles className="h-3 w-3" />
          <span>Compile</span>
        </button>
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