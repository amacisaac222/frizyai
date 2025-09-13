import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain,
  Code,
  MessageSquare,
  Search,
  GitBranch,
  Terminal,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  Target,
  Zap,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  User,
  Hash,
  ArrowRight,
  Sparkles,
  Activity
} from 'lucide-react';

interface ContextNode {
  id: string;
  type: 'conversation' | 'decision' | 'action' | 'search' | 'test' | 'error' | 'success';
  timestamp: string;
  title: string;
  summary: string;
  detail?: string;
  code?: { file: string; changes: string };
  status: 'done' | 'active' | 'next';
  importance: 1 | 2 | 3 | 4 | 5; // 5 is most important
  duration?: string;
  author?: string;
  impact?: { files: number; lines: number; tests: number };
  children?: ContextNode[];
}

export const ContextFlow: React.FC = () => {
  const [nodes] = useState<ContextNode[]>([
    {
      id: '1',
      type: 'conversation',
      timestamp: '10:00 AM',
      title: 'Fix authentication for corporate emails',
      summary: 'User reported login failures for @company.subdomain.com addresses',
      status: 'done',
      importance: 5,
      author: 'User',
      children: [
        {
          id: '2',
          type: 'search',
          timestamp: '10:01 AM',
          title: 'Searching email validation logic',
          summary: 'Found 3 files with email validation patterns',
          detail: 'auth/validators.ts, utils/email.ts, components/LoginForm.tsx',
          status: 'done',
          importance: 3,
          duration: '2s'
        },
        {
          id: '3',
          type: 'decision',
          timestamp: '10:02 AM',
          title: 'Regex pattern too restrictive',
          summary: 'Current pattern rejects subdomains. Need to allow multiple domain levels.',
          detail: 'Pattern /^[^@]+@[^.]+\\.[^.]+$/ fails for multi-level domains',
          status: 'done',
          importance: 5,
          author: 'Claude'
        }
      ]
    },
    {
      id: '4',
      type: 'action',
      timestamp: '10:03 AM',
      title: 'Updated email validation regex',
      summary: 'Modified pattern to support corporate email structures',
      code: {
        file: 'auth/validators.ts',
        changes: '- /^[^@]+@[^.]+\\.[^.]+$/\n+ /^[^@]+@[^@]+\\.[^@]+$/'
      },
      status: 'done',
      importance: 5,
      impact: { files: 1, lines: 2, tests: 0 },
      duration: '5s',
      children: [
        {
          id: '5',
          type: 'test',
          timestamp: '10:04 AM',
          title: 'Running auth test suite',
          summary: 'Testing email validation with new pattern',
          status: 'active',
          importance: 4,
          duration: '8s',
          impact: { files: 0, lines: 0, tests: 47 }
        }
      ]
    },
    {
      id: '6',
      type: 'success',
      timestamp: '10:05 AM',
      title: 'All tests passing',
      summary: '47/47 tests passed including new subdomain test cases',
      status: 'next',
      importance: 4
    }
  ]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1', '4']));
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'story' | 'focus'>('story');
  const [showDetails, setShowDetails] = useState(true);

  const getNodeIcon = (type: ContextNode['type']) => {
    switch (type) {
      case 'conversation': return MessageSquare;
      case 'decision': return Brain;
      case 'action': return Code;
      case 'search': return Search;
      case 'test': return Terminal;
      case 'error': return AlertCircle;
      case 'success': return CheckCircle;
      default: return FileText;
    }
  };

  const getNodeColor = (type: ContextNode['type'], importance: number) => {
    const baseColors = {
      conversation: 'purple',
      decision: 'yellow',
      action: 'green',
      search: 'blue',
      test: 'cyan',
      error: 'red',
      success: 'emerald'
    };
    const color = baseColors[type] || 'gray';
    const intensity = importance >= 4 ? '500' : '400';
    return `${color}-${intensity}`;
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderNode = (node: ContextNode, depth: number = 0, isLast: boolean = false) => {
    const Icon = getNodeIcon(node.type);
    const color = getNodeColor(node.type, node.importance);
    const isExpanded = expanded.has(node.id);
    const isSelected = selected === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className={`${depth > 0 ? 'ml-8' : ''}`}>
        {/* Connection line from parent */}
        {depth > 0 && (
          <div className="absolute left-4 -top-4 w-0.5 h-4 bg-gray-200" />
        )}

        {/* Main node */}
        <div 
          className={`relative group ${node.status === 'next' ? 'opacity-50' : ''}`}
          onClick={() => setSelected(isSelected ? null : node.id)}
        >
          {/* Active indicator */}
          {node.status === 'active' && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2">
              <PlayCircle className="h-5 w-5 text-green-500 animate-pulse" />
            </div>
          )}

          {/* Main card */}
          <div className={`
            flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer
            ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}
            ${node.status === 'active' ? 'ring-2 ring-green-500 ring-opacity-30' : ''}
          `}>
            {/* Icon */}
            <div className={`
              p-2 rounded-lg bg-${color} bg-opacity-10 text-${color}
              ${node.importance >= 4 ? 'ring-2 ring-' + color + ' ring-opacity-30' : ''}
            `}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{node.title}</h3>
                  {node.importance >= 5 && (
                    <Zap className="h-3 w-3 text-red-500" />
                  )}
                </div>
                <span className="text-xs text-gray-500">{node.timestamp}</span>
              </div>

              <p className="text-sm text-gray-600 mb-2">{node.summary}</p>

              {/* Details when selected */}
              {isSelected && showDetails && (
                <>
                  {node.detail && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                      {node.detail}
                    </div>
                  )}
                  
                  {node.code && (
                    <div className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs font-mono">
                      <div className="text-gray-500 mb-1">{node.code.file}</div>
                      <pre>{node.code.changes}</pre>
                    </div>
                  )}
                </>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {node.author && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {node.author}
                  </span>
                )}
                {node.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {node.duration}
                  </span>
                )}
                {node.impact && (
                  <>
                    {node.impact.files > 0 && (
                      <span>{node.impact.files} files</span>
                    )}
                    {node.impact.tests > 0 && (
                      <span>{node.impact.tests} tests</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Expand/collapse for children */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
          </div>

          {/* Connection to children */}
          {hasChildren && isExpanded && (
            <div className="absolute left-8 bottom-0 w-0.5 h-4 bg-gray-200" />
          )}
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children!.map((child, index) => 
              renderNode(child, depth + 1, index === node.children!.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Focus mode - shows only active and related nodes
  const renderFocusMode = () => {
    const activeNode = nodes.find(n => n.status === 'active' || 
      n.children?.some(c => c.status === 'active'));
    
    if (!activeNode) return null;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Current Focus</h2>
          <p className="text-sm text-gray-600">Working on authentication fixes</p>
        </div>
        {renderNode(activeNode)}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Clean header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Context Flow</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity className="h-4 w-4 text-green-500" />
              <span>Sprint 3: Day 5 of 14</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('story')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'story' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Story View
              </button>
              <button
                onClick={() => setViewMode('focus')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'focus' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Focus Mode
              </button>
            </div>

            {/* Detail toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showDetails ? (
                <Eye className="h-4 w-4 text-gray-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-600" />
              )}
            </button>

            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {viewMode === 'story' ? (
            <div className="space-y-4">
              {nodes.map((node, index) => renderNode(node, 0, index === nodes.length - 1))}
            </div>
          ) : (
            renderFocusMode()
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white border-t px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              4 completed
            </span>
            <span className="flex items-center gap-1">
              <PlayCircle className="h-3 w-3 text-green-500" />
              1 active
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              1 upcoming
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-purple-500" />
            <span>Context automatically captured</span>
          </div>
        </div>
      </div>
    </div>
  );
};