import React, { useState, useEffect } from 'react';
import { 
  Activity, Layers, Package, GitBranch, Clock, Search, Settings, 
  ChevronRight, ChevronDown, Plus, X, Maximize2, Minimize2,
  PlayCircle, CheckCircle, AlertCircle, Code, Database, Zap,
  FileText, GitCommit, Terminal, Bug, Target, Folder, FolderOpen
} from 'lucide-react';

// Type definitions for hierarchical data structure
interface RawEvent {
  id: string;
  timestamp: string;
  type: 'mcp' | 'github' | 'system';
  data: any;
  sessionId: string;
}

interface Trace {
  id: string;
  name: string;
  events: RawEvent[];
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  summary: string;
}

interface Block {
  id: string;
  title: string;
  traces: Trace[];
  type: 'code' | 'debug' | 'test' | 'review';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  impact: 'low' | 'medium' | 'high';
}

interface Task {
  id: string;
  name: string;
  blocks: Block[];
  description: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  progress: number;
  status: 'planned' | 'active' | 'completed' | 'archived';
}

interface Feature {
  id: string;
  title: string;
  tasks: Task[];
  description: string;
  startDate: string;
  targetDate?: string;
  progress: number;
  status: 'planning' | 'development' | 'testing' | 'deployed';
  metrics: {
    commits: number;
    files: number;
    additions: number;
    deletions: number;
  };
}

type ViewType = 'traces' | 'blocks' | 'tasks' | 'features' | 'timeline';
type PanelContent = {
  type: ViewType;
  data?: any;
  id: string;
};

export function IDEDashboard() {
  // Layout state
  const [activeTab, setActiveTab] = useState<'explorer' | 'search' | 'git' | 'debug'>('explorer');
  const [explorerExpanded, setExplorerExpanded] = useState(true);
  const [panels, setPanels] = useState<PanelContent[]>([
    { type: 'timeline', id: 'panel-1' }
  ]);
  
  // Data state
  const [currentSession, setCurrentSession] = useState<string>('current');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  
  // Explorer state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['features', 'tasks']));
  
  // Initialize with sample data
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    // Sample raw events
    const sampleEvents: RawEvent[] = [
      { id: 'evt-1', timestamp: new Date().toISOString(), type: 'mcp', data: { tool: 'Read', file: 'App.tsx' }, sessionId: currentSession },
      { id: 'evt-2', timestamp: new Date().toISOString(), type: 'github', data: { action: 'push', commits: 3 }, sessionId: currentSession },
      { id: 'evt-3', timestamp: new Date().toISOString(), type: 'system', data: { message: 'Build completed' }, sessionId: currentSession },
    ];
    
    // Sample traces
    const sampleTraces: Trace[] = [
      {
        id: 'trace-1',
        name: 'Component Implementation',
        events: sampleEvents.slice(0, 2),
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        summary: 'Implemented new dashboard component'
      },
      {
        id: 'trace-2',
        name: 'Bug Investigation',
        events: [sampleEvents[2]],
        startTime: new Date().toISOString(),
        status: 'active',
        summary: 'Investigating performance issue'
      }
    ];
    
    // Sample blocks
    const sampleBlocks: Block[] = [
      {
        id: 'block-1',
        title: 'Dashboard Refactor',
        traces: [sampleTraces[0]],
        type: 'code',
        status: 'completed',
        progress: 100,
        impact: 'high'
      },
      {
        id: 'block-2',
        title: 'Performance Debug',
        traces: [sampleTraces[1]],
        type: 'debug',
        status: 'in_progress',
        progress: 45,
        impact: 'medium'
      }
    ];
    
    // Sample tasks
    const sampleTasks: Task[] = [
      {
        id: 'task-1',
        name: 'Implement IDE Dashboard',
        blocks: sampleBlocks,
        description: 'Create VS Code-like dashboard interface',
        priority: 'high',
        progress: 72,
        status: 'active'
      },
      {
        id: 'task-2',
        name: 'Add MCP Integration',
        blocks: [],
        description: 'Integrate Model Context Protocol',
        priority: 'medium',
        progress: 0,
        status: 'planned'
      }
    ];
    
    // Sample features
    const sampleFeatures: Feature[] = [
      {
        id: 'feat-1',
        title: 'Context-First Memory System',
        tasks: sampleTasks,
        description: 'Transform Frizy into a context-aware development platform',
        startDate: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
        targetDate: new Date(Date.now() + 14 * 24 * 3600000).toISOString(),
        progress: 35,
        status: 'development',
        metrics: {
          commits: 47,
          files: 23,
          additions: 3421,
          deletions: 892
        }
      }
    ];
    
    setRawEvents(sampleEvents);
    setTraces(sampleTraces);
    setBlocks(sampleBlocks);
    setTasks(sampleTasks);
    setFeatures(sampleFeatures);
  };

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
      setPanels([{ type: 'timeline', id: 'panel-default' }]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'active':
      case 'in_progress':
      case 'development':
        return <PlayCircle className="h-4 w-4 text-blue-400" />;
      case 'blocked':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPanelWidth = () => {
    switch (panels.length) {
      case 1: return 'w-full';
      case 2: return 'w-1/2';
      case 3: return 'w-1/3';
      default: return 'w-full';
    }
  };

  // Render different view types
  const renderPanelContent = (panel: PanelContent) => {
    switch (panel.type) {
      case 'timeline':
        return <TimelineView features={features} tasks={tasks} onItemClick={(type, item) => openPanel(type as ViewType, item)} />;
      case 'features':
        return <FeatureView feature={panel.data || features[0]} tasks={tasks} />;
      case 'tasks':
        return <TaskView task={panel.data || tasks[0]} blocks={blocks} />;
      case 'blocks':
        return <BlockView block={panel.data || blocks[0]} traces={traces} />;
      case 'traces':
        return <TraceView trace={panel.data || traces[0]} events={rawEvents} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex">
      {/* Mini Sidebar - Activity Bar */}
      <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`p-3 hover:bg-gray-800 ${activeTab === 'explorer' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
        >
          <Folder className="h-5 w-5" />
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`p-3 hover:bg-gray-800 ${activeTab === 'search' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          onClick={() => setActiveTab('git')}
          className={`p-3 hover:bg-gray-800 ${activeTab === 'git' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
        >
          <GitBranch className="h-5 w-5" />
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={`p-3 hover:bg-gray-800 ${activeTab === 'debug' ? 'bg-gray-800 border-l-2 border-blue-400' : ''}`}
        >
          <Bug className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <button className="p-3 hover:bg-gray-800">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Explorer Panel */}
      {explorerExpanded && (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">
              {activeTab === 'explorer' ? 'Project Explorer' : activeTab.toUpperCase()}
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
              {/* Features */}
              <div className="mb-2">
                <button
                  onClick={() => toggleNode('features')}
                  className="flex items-center gap-1 w-full hover:bg-gray-800 p-1 rounded text-sm"
                >
                  {expandedNodes.has('features') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Package className="h-3 w-3 text-purple-400" />
                  <span>Features ({features.length})</span>
                </button>
                {expandedNodes.has('features') && (
                  <div className="ml-4 mt-1">
                    {features.map(feature => (
                      <button
                        key={feature.id}
                        onClick={() => openPanel('features', feature)}
                        className="flex items-center gap-2 w-full hover:bg-gray-800 p-1 rounded text-xs"
                      >
                        {getStatusIcon(feature.status)}
                        <span className="truncate">{feature.title}</span>
                        <span className="text-gray-500">{feature.progress}%</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="mb-2">
                <button
                  onClick={() => toggleNode('tasks')}
                  className="flex items-center gap-1 w-full hover:bg-gray-800 p-1 rounded text-sm"
                >
                  {expandedNodes.has('tasks') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Target className="h-3 w-3 text-blue-400" />
                  <span>Tasks ({tasks.length})</span>
                </button>
                {expandedNodes.has('tasks') && (
                  <div className="ml-4 mt-1">
                    {tasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => openPanel('tasks', task)}
                        className="flex items-center gap-2 w-full hover:bg-gray-800 p-1 rounded text-xs"
                      >
                        {getStatusIcon(task.status)}
                        <span className="truncate">{task.name}</span>
                        <span className={`text-xs px-1 rounded ${
                          task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {task.priority[0].toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocks */}
              <div className="mb-2">
                <button
                  onClick={() => toggleNode('blocks')}
                  className="flex items-center gap-1 w-full hover:bg-gray-800 p-1 rounded text-sm"
                >
                  {expandedNodes.has('blocks') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Layers className="h-3 w-3 text-green-400" />
                  <span>Blocks ({blocks.length})</span>
                </button>
                {expandedNodes.has('blocks') && (
                  <div className="ml-4 mt-1">
                    {blocks.map(block => (
                      <button
                        key={block.id}
                        onClick={() => openPanel('blocks', block)}
                        className="flex items-center gap-2 w-full hover:bg-gray-800 p-1 rounded text-xs"
                      >
                        {getStatusIcon(block.status)}
                        <span className="truncate">{block.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Traces */}
              <div className="mb-2">
                <button
                  onClick={() => toggleNode('traces')}
                  className="flex items-center gap-1 w-full hover:bg-gray-800 p-1 rounded text-sm"
                >
                  {expandedNodes.has('traces') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Activity className="h-3 w-3 text-cyan-400" />
                  <span>Traces ({traces.length})</span>
                </button>
                {expandedNodes.has('traces') && (
                  <div className="ml-4 mt-1">
                    {traces.map(trace => (
                      <button
                        key={trace.id}
                        onClick={() => openPanel('traces', trace)}
                        className="flex items-center gap-2 w-full hover:bg-gray-800 p-1 rounded text-xs"
                      >
                        {getStatusIcon(trace.status)}
                        <span className="truncate">{trace.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sessions */}
              <div className="mb-2">
                <button
                  onClick={() => toggleNode('sessions')}
                  className="flex items-center gap-1 w-full hover:bg-gray-800 p-1 rounded text-sm"
                >
                  {expandedNodes.has('sessions') ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Database className="h-3 w-3 text-orange-400" />
                  <span>Sessions</span>
                </button>
                {expandedNodes.has('sessions') && (
                  <div className="ml-4 mt-1">
                    <button className="flex items-center gap-2 w-full hover:bg-gray-800 p-1 rounded text-xs">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <span>Current Session</span>
                    </button>
                    <button className="flex items-center gap-2 w-full hover:bg-gray-800 p-1 rounded text-xs">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      <span>Previous (2h ago)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Panel Area */}
      <div className="flex-1 flex">
        {panels.map((panel, index) => (
          <div key={panel.id} className={`${getPanelWidth()} border-r border-gray-800 last:border-r-0 flex flex-col`}>
            {/* Panel Header */}
            <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-2">
              <span className="text-xs font-medium capitalize">{panel.type} View</span>
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
    </div>
  );
}

// Timeline View Component
function TimelineView({ features, tasks, onItemClick }: {
  features: Feature[];
  tasks: Task[];
  onItemClick: (type: string, item: any) => void;
}) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Current Progress</h2>
      
      {/* Active Features */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Active Features</h3>
        {features.filter(f => f.status === 'development' || f.status === 'testing').map(feature => (
          <div
            key={feature.id}
            onClick={() => onItemClick('features', feature)}
            className="bg-gray-900 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{feature.title}</h4>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                {feature.status}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${feature.progress}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>{feature.tasks.length} tasks</span>
              <span>{feature.metrics.commits} commits</span>
              <span>+{feature.metrics.additions} -{feature.metrics.deletions}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Tasks */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Active Tasks</h3>
        {tasks.filter(t => t.status === 'active').map(task => (
          <div
            key={task.id}
            onClick={() => onItemClick('tasks', task)}
            className="bg-gray-900 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-sm">{task.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-600/20 text-gray-400'
                }`}>
                  {task.priority}
                </span>
                <span className="text-xs text-gray-400">{task.progress}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Past Features */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Completed Features</h3>
        {features.filter(f => f.status === 'deployed').map(feature => (
          <div
            key={feature.id}
            onClick={() => onItemClick('features', feature)}
            className="bg-gray-900/50 rounded-lg p-2 mb-1 cursor-pointer hover:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-sm">{feature.title}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(feature.startDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Feature View Component
function FeatureView({ feature, tasks }: { feature: Feature; tasks: Task[] }) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{feature.title}</h2>
        <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Progress</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${feature.progress}%` }}
              />
            </div>
            <span className="text-sm font-medium">{feature.progress}%</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Timeline</div>
          <div className="text-sm">
            {new Date(feature.startDate).toLocaleDateString()} - {feature.targetDate ? new Date(feature.targetDate).toLocaleDateString() : 'Ongoing'}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Metrics</h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-900 rounded p-2 text-center">
            <div className="text-lg font-bold">{feature.metrics.commits}</div>
            <div className="text-xs text-gray-400">Commits</div>
          </div>
          <div className="bg-gray-900 rounded p-2 text-center">
            <div className="text-lg font-bold">{feature.metrics.files}</div>
            <div className="text-xs text-gray-400">Files</div>
          </div>
          <div className="bg-gray-900 rounded p-2 text-center">
            <div className="text-lg font-bold text-green-400">+{feature.metrics.additions}</div>
            <div className="text-xs text-gray-400">Added</div>
          </div>
          <div className="bg-gray-900 rounded p-2 text-center">
            <div className="text-lg font-bold text-red-400">-{feature.metrics.deletions}</div>
            <div className="text-xs text-gray-400">Removed</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Tasks</h3>
        {feature.tasks.map(task => (
          <div key={task.id} className="bg-gray-900 rounded p-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{task.name}</span>
              <span className="text-xs text-gray-400">{task.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Task View Component
function TaskView({ task, blocks }: { task: Task; blocks: Block[] }) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{task.name}</h2>
        <p className="text-sm text-gray-400 mt-1">{task.description}</p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-2 py-1 rounded ${
          task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
          task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-gray-600/20 text-gray-400'
        }`}>
          {task.priority} priority
        </span>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
          {task.status}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-medium">{task.progress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Blocks</h3>
        {task.blocks.map(block => (
          <div key={block.id} className="bg-gray-900 rounded p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {block.type === 'code' && <Code className="h-4 w-4 text-blue-400" />}
                {block.type === 'debug' && <Bug className="h-4 w-4 text-red-400" />}
                {block.type === 'test' && <CheckCircle className="h-4 w-4 text-green-400" />}
                {block.type === 'review' && <GitBranch className="h-4 w-4 text-purple-400" />}
                <span className="font-medium">{block.title}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                block.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                block.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-600/20 text-gray-400'
              }`}>
                {block.impact} impact
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {block.traces.length} traces • {block.progress}% complete
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Block View Component
function BlockView({ block, traces }: { block: Block; traces: Trace[] }) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{block.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-1 rounded ${
            block.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            block.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
            block.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-600/20 text-gray-400'
          }`}>
            {block.status}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            block.impact === 'high' ? 'bg-red-500/20 text-red-400' :
            block.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-600/20 text-gray-400'
          }`}>
            {block.impact} impact
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-medium">{block.progress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${block.progress}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Traces</h3>
        {block.traces.map(trace => (
          <div key={trace.id} className="bg-gray-900 rounded p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{trace.name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                trace.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                trace.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {trace.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">{trace.summary}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{trace.events.length} events</span>
              <span>{new Date(trace.startTime).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Trace View Component
function TraceView({ trace, events }: { trace: Trace; events: RawEvent[] }) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{trace.name}</h2>
        <p className="text-sm text-gray-400 mt-1">{trace.summary}</p>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className={`px-2 py-1 rounded ${
          trace.status === 'completed' ? 'bg-green-500/20 text-green-400' :
          trace.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {trace.status}
        </span>
        <span className="text-gray-400">
          Started: {new Date(trace.startTime).toLocaleTimeString()}
        </span>
        {trace.endTime && (
          <span className="text-gray-400">
            Ended: {new Date(trace.endTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Events</h3>
        <div className="space-y-2">
          {trace.events.map(event => (
            <div key={event.id} className="bg-gray-900 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {event.type === 'mcp' && <Zap className="h-4 w-4 text-blue-400" />}
                  {event.type === 'github' && <GitCommit className="h-4 w-4 text-green-400" />}
                  {event.type === 'system' && <Terminal className="h-4 w-4 text-orange-400" />}
                  <span className="font-medium text-sm">{event.type.toUpperCase()}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-xs text-gray-400 overflow-x-auto">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}