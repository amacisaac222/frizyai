import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  GitBranch, 
  Activity, 
  Clock,
  Link2,
  Eye,
  EyeOff,
  Layers,
  Network,
  Search,
  Filter
} from 'lucide-react';

interface TraceNode {
  id: string;
  type: 'mcp_tool' | 'conversation' | 'decision' | 'github_event' | 'error';
  timestamp: string;
  title: string;
  summary: string;
  details: any;
  connections: string[]; // IDs of connected traces
  importance: number; // 0-1 score
  depth: number; // How deep in the investigation
  category: string;
}

interface ViewMode {
  level: 'overview' | 'context' | 'detail' | 'raw';
  showConnections: boolean;
  timeRange: 'all' | 'hour' | 'session';
  filter: string[];
}

export const TraceInvestigationView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>({
    level: 'context',
    showConnections: true,
    timeRange: 'session',
    filter: []
  });

  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [hoveredTrace, setHoveredTrace] = useState<string | null>(null);

  // Sample data showing a real investigation flow
  const traces: TraceNode[] = [
    {
      id: 't1',
      type: 'conversation',
      timestamp: '10:00:00',
      title: 'User Request: Fix Authentication',
      summary: 'User reports login failing for certain email domains',
      details: { message: 'Login not working for @company.com emails' },
      connections: ['t2', 't3'],
      importance: 1.0,
      depth: 0,
      category: 'request'
    },
    {
      id: 't2',
      type: 'mcp_tool',
      timestamp: '10:00:15',
      title: 'Read: auth/loginController.ts',
      summary: 'Examined authentication logic, found email validation regex',
      details: { tool: 'Read', path: 'src/auth/loginController.ts', lines: 450 },
      connections: ['t1', 't4', 't5'],
      importance: 0.8,
      depth: 1,
      category: 'investigation'
    },
    {
      id: 't3',
      type: 'mcp_tool',
      timestamp: '10:00:30',
      title: 'Grep: Error logs for auth failures',
      summary: 'Found pattern of failures for corporate domains',
      details: { pattern: 'AUTH_FAILED.*@.*\\.com', matches: 47 },
      connections: ['t1', 't6'],
      importance: 0.9,
      depth: 1,
      category: 'investigation'
    },
    {
      id: 't4',
      type: 'decision',
      timestamp: '10:01:00',
      title: 'Decision: Regex Too Restrictive',
      summary: 'Email regex excludes subdomains, causing corporate email failures',
      details: { 
        problem: 'Regex pattern /^[^@]+@[^.]+\\.[^.]+$/ fails for sub.company.com',
        solution: 'Update to allow multiple domain levels'
      },
      connections: ['t2', 't7'],
      importance: 1.0,
      depth: 2,
      category: 'analysis'
    },
    {
      id: 't5',
      type: 'mcp_tool',
      timestamp: '10:01:30',
      title: 'Read: auth/validators.ts',
      summary: 'Found centralized email validation function',
      details: { tool: 'Read', path: 'src/auth/validators.ts' },
      connections: ['t2', 't7'],
      importance: 0.7,
      depth: 2,
      category: 'investigation'
    },
    {
      id: 't6',
      type: 'github_event',
      timestamp: '10:02:00',
      title: 'Related Issue #234',
      summary: 'Found existing issue about corporate email login',
      details: { issue: 234, reporter: 'user123', age: '3 days' },
      connections: ['t3', 't4'],
      importance: 0.6,
      depth: 2,
      category: 'context'
    },
    {
      id: 't7',
      type: 'mcp_tool',
      timestamp: '10:02:30',
      title: 'Edit: Fixed Email Validation',
      summary: 'Updated regex to support multiple subdomain levels',
      details: { 
        tool: 'Edit',
        old: '/^[^@]+@[^.]+\\.[^.]+$/',
        new: '/^[^@]+@[^@]+\\.[^@]+$/'
      },
      connections: ['t4', 't5', 't8'],
      importance: 1.0,
      depth: 3,
      category: 'solution'
    },
    {
      id: 't8',
      type: 'mcp_tool',
      timestamp: '10:03:00',
      title: 'Bash: Run Tests',
      summary: 'All authentication tests passing',
      details: { command: 'npm test auth', passed: 47, failed: 0 },
      connections: ['t7'],
      importance: 0.8,
      depth: 4,
      category: 'validation'
    }
  ];

  // Calculate layout positions based on connections
  const traceLayout = useMemo(() => {
    const layout = new Map<string, { x: number; y: number; width: number }>();
    
    // Group by depth for vertical positioning
    const depthGroups = traces.reduce((acc, trace) => {
      if (!acc[trace.depth]) acc[trace.depth] = [];
      acc[trace.depth].push(trace);
      return acc;
    }, {} as Record<number, TraceNode[]>);

    // Position nodes
    Object.entries(depthGroups).forEach(([depth, nodes]) => {
      const depthNum = parseInt(depth);
      nodes.forEach((node, index) => {
        layout.set(node.id, {
          x: (index * 300) + 50,
          y: (depthNum * 180) + 50,
          width: 250
        });
      });
    });

    return layout;
  }, [traces]);

  // Get color based on trace type
  const getTraceColor = (type: TraceNode['type']) => {
    const colors = {
      mcp_tool: 'bg-blue-100 border-blue-300',
      conversation: 'bg-purple-100 border-purple-300',
      decision: 'bg-yellow-100 border-yellow-300',
      github_event: 'bg-green-100 border-green-300',
      error: 'bg-red-100 border-red-300'
    };
    return colors[type];
  };

  // Render connection lines
  const renderConnections = () => {
    if (!viewMode.showConnections) return null;

    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {traces.flatMap(trace => 
          trace.connections.map(targetId => {
            const source = traceLayout.get(trace.id);
            const target = traceLayout.get(targetId);
            if (!source || !target) return null;

            const isHighlighted = hoveredTrace === trace.id || hoveredTrace === targetId;
            
            return (
              <line
                key={`${trace.id}-${targetId}`}
                x1={source.x + source.width / 2}
                y1={source.y + 40}
                x2={target.x + target.width / 2}
                y2={target.y + 40}
                stroke={isHighlighted ? '#3b82f6' : '#cbd5e1'}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeDasharray={trace.importance < 0.7 ? '5,5' : undefined}
                opacity={isHighlighted ? 1 : 0.3}
              />
            );
          })
        )}
      </svg>
    );
  };

  // Render individual trace box
  const renderTraceBox = (trace: TraceNode) => {
    const position = traceLayout.get(trace.id);
    if (!position) return null;

    const isSelected = selectedTrace === trace.id;
    const isHovered = hoveredTrace === trace.id;
    const showDetail = viewMode.level === 'detail' || viewMode.level === 'raw';

    return (
      <div
        key={trace.id}
        className={`absolute transition-all duration-200 ${getTraceColor(trace.type)} 
          border-2 rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-lg
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isHovered ? 'z-10 scale-105' : 'z-1'}`}
        style={{
          left: position.x,
          top: position.y,
          width: position.width
        }}
        onClick={() => setSelectedTrace(trace.id)}
        onMouseEnter={() => setHoveredTrace(trace.id)}
        onMouseLeave={() => setHoveredTrace(null)}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-gray-500">{trace.timestamp}</span>
          {trace.importance >= 0.8 && (
            <Badge variant="destructive" className="text-xs">Important</Badge>
          )}
        </div>
        
        <h4 className="font-semibold text-sm mb-1">{trace.title}</h4>
        
        {(viewMode.level === 'context' || showDetail) && (
          <p className="text-xs text-gray-600 mb-2">{trace.summary}</p>
        )}

        {showDetail && trace.details && (
          <div className="bg-white/50 rounded p-2 mt-2">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(trace.details, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex gap-1 mt-2">
          <Badge variant="outline" className="text-xs">{trace.category}</Badge>
          {trace.connections.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Link2 className="h-3 w-3 mr-1" />
              {trace.connections.length}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Control Bar */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Network className="h-5 w-5" />
              Investigation Trace View
            </h2>
            
            {/* View Level Controls */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode.level === 'overview' ? 'default' : 'ghost'}
                onClick={() => setViewMode(v => ({ ...v, level: 'overview' }))}
              >
                <Layers className="h-4 w-4 mr-1" />
                Overview
              </Button>
              <Button
                size="sm"
                variant={viewMode.level === 'context' ? 'default' : 'ghost'}
                onClick={() => setViewMode(v => ({ ...v, level: 'context' }))}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Context
              </Button>
              <Button
                size="sm"
                variant={viewMode.level === 'detail' ? 'default' : 'ghost'}
                onClick={() => setViewMode(v => ({ ...v, level: 'detail' }))}
              >
                <Search className="h-4 w-4 mr-1" />
                Detail
              </Button>
              <Button
                size="sm"
                variant={viewMode.level === 'raw' ? 'default' : 'ghost'}
                onClick={() => setViewMode(v => ({ ...v, level: 'raw' }))}
              >
                <Activity className="h-4 w-4 mr-1" />
                Raw
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode(v => ({ ...v, showConnections: !v.showConnections }))}
            >
              {viewMode.showConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Connections
            </Button>
            
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span>Total Traces: {traces.length}</span>
          <span>•</span>
          <span>Connections: {traces.reduce((sum, t) => sum + t.connections.length, 0)}</span>
          <span>•</span>
          <span>Time Span: 3 minutes</span>
          <span>•</span>
          <span>Categories: {new Set(traces.map(t => t.category)).size}</span>
        </div>
      </div>

      {/* Main Trace Visualization */}
      <div className="flex-1 relative bg-gray-50 overflow-auto">
        <div className="relative" style={{ width: '2000px', height: '1200px' }}>
          {renderConnections()}
          {traces.map(renderTraceBox)}
        </div>
      </div>

      {/* Selected Trace Detail Panel */}
      {selectedTrace && (
        <div className="bg-white border-t p-4 h-48 overflow-y-auto">
          <div className="max-w-4xl">
            <h3 className="font-semibold mb-2">
              Trace Details: {traces.find(t => t.id === selectedTrace)?.title}
            </h3>
            <pre className="text-sm bg-gray-100 p-3 rounded">
              {JSON.stringify(traces.find(t => t.id === selectedTrace), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};