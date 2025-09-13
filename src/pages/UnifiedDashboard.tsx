import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain,
  Zap,
  Clock,
  Target,
  Activity,
  GitBranch,
  MessageSquare,
  Code,
  Search,
  Filter,
  Eye,
  Edit3,
  Terminal,
  FileText,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Users,
  Sparkles,
  ArrowUp,
  ArrowDown,
  GitCommit,
  Package,
  Folder,
  Hash,
  MoreVertical,
  Plus,
  Settings,
  Bell,
  User
} from 'lucide-react';

// Types for our unified data model
interface ContextBlock {
  id: string;
  type: 'conversation' | 'decision' | 'code' | 'search' | 'test' | 'error' | 'success' | 'milestone';
  timestamp: string;
  duration?: number;
  title: string;
  content: string;
  status: 'completed' | 'active' | 'upcoming' | 'blocked';
  importance: 'critical' | 'high' | 'normal' | 'low';
  sprint?: string;
  project?: string;
  author?: string;
  impact?: {
    files?: number;
    lines?: number;
    tests?: number;
    users?: string[];
  };
  connections: {
    parents: string[];
    children: string[];
    related: string[];
  };
  details?: any;
  position?: { x: number; y: number; z: number }; // For 3D-like layering
}

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'review' | 'completed';
  goals: string[];
  progress: number;
}

interface Project {
  id: string;
  name: string;
  color: string;
  sprints: Sprint[];
  activeContext: string; // ID of current working context
  lastContext: string; // ID of last completed context
}

export const UnifiedDashboard: React.FC = () => {
  // State management
  const [blocks, setBlocks] = useState<ContextBlock[]>([
    {
      id: 'b1',
      type: 'milestone',
      timestamp: '2024-01-15 09:00',
      title: 'Sprint 3: Authentication System',
      content: 'Implementing secure authentication with MFA support',
      status: 'active',
      importance: 'critical',
      sprint: 'sprint-3',
      project: 'frizy-mvp',
      connections: { parents: [], children: ['b2', 'b3'], related: [] },
      position: { x: 400, y: 100, z: 2 }
    },
    {
      id: 'b2',
      type: 'conversation',
      timestamp: '2024-01-15 10:00',
      title: 'User: Fix corporate email login',
      content: 'Users with @company.subdomain.com emails cannot log in',
      status: 'completed',
      importance: 'high',
      sprint: 'sprint-3',
      connections: { parents: ['b1'], children: ['b4', 'b5'], related: [] },
      position: { x: 300, y: 200, z: 1 }
    },
    {
      id: 'b3',
      type: 'decision',
      timestamp: '2024-01-15 10:30',
      title: 'Architecture: Use JWT with refresh tokens',
      content: 'Decided on JWT for stateless auth with 15min access + 7day refresh',
      status: 'completed',
      importance: 'critical',
      sprint: 'sprint-3',
      connections: { parents: ['b1'], children: ['b6'], related: ['b2'] },
      position: { x: 500, y: 200, z: 1 }
    },
    {
      id: 'b4',
      type: 'search',
      timestamp: '2024-01-15 10:15',
      title: 'Searched: Email validation patterns',
      content: 'Found 3 files with email regex, identified restrictive pattern',
      status: 'completed',
      importance: 'normal',
      connections: { parents: ['b2'], children: ['b5'], related: [] },
      position: { x: 250, y: 300, z: 0 }
    },
    {
      id: 'b5',
      type: 'code',
      timestamp: '2024-01-15 10:45',
      title: 'Fixed: Email regex in validators.ts',
      content: 'Updated regex to support multiple subdomain levels',
      status: 'completed',
      importance: 'high',
      impact: { files: 1, lines: 12, tests: 47 },
      connections: { parents: ['b2', 'b4'], children: ['b7'], related: [] },
      position: { x: 300, y: 400, z: 1 }
    },
    {
      id: 'b6',
      type: 'code',
      timestamp: '2024-01-15 11:00',
      title: 'Implementing: JWT auth middleware',
      content: 'Creating token generation and validation middleware',
      status: 'active',
      importance: 'critical',
      sprint: 'sprint-3',
      author: 'Claude',
      impact: { files: 5, lines: 250 },
      connections: { parents: ['b3'], children: ['b8'], related: [] },
      position: { x: 500, y: 350, z: 2 }
    },
    {
      id: 'b7',
      type: 'test',
      timestamp: '2024-01-15 11:15',
      title: 'Tests: All auth tests passing',
      content: '47/47 tests pass including new subdomain cases',
      status: 'completed',
      importance: 'high',
      impact: { tests: 47 },
      connections: { parents: ['b5'], children: [], related: ['b6'] },
      position: { x: 300, y: 500, z: 0 }
    },
    {
      id: 'b8',
      type: 'upcoming',
      timestamp: '2024-01-15 12:00',
      title: 'Next: Implement MFA setup flow',
      content: 'Add TOTP-based two-factor authentication',
      status: 'upcoming',
      importance: 'high',
      sprint: 'sprint-3',
      connections: { parents: ['b6'], children: [], related: [] },
      position: { x: 500, y: 450, z: 1 }
    }
  ]);

  const [currentProject] = useState<Project>({
    id: 'frizy-mvp',
    name: 'Frizy MVP',
    color: 'from-purple-500 to-blue-500',
    activeContext: 'b6',
    lastContext: 'b7',
    sprints: [
      {
        id: 'sprint-3',
        name: 'Authentication & Security',
        startDate: '2024-01-08',
        endDate: '2024-01-22',
        status: 'active',
        goals: ['JWT implementation', 'Email validation fix', 'MFA support'],
        progress: 65
      }
    ]
  });

  const [zoomLevel, setZoomLevel] = useState<'overview' | 'normal' | 'detail'>('normal');
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'critical'>('all');
  const [showTimeline, setShowTimeline] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active block on mount
  useEffect(() => {
    const activeBlock = document.querySelector('[data-status="active"]');
    if (activeBlock) {
      activeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Get filtered blocks based on current filter
  const getFilteredBlocks = () => {
    switch (filterMode) {
      case 'active':
        return blocks.filter(b => b.status === 'active' || b.status === 'upcoming');
      case 'critical':
        return blocks.filter(b => b.importance === 'critical' || b.importance === 'high');
      default:
        return blocks;
    }
  };

  // Get color for block type
  const getBlockStyle = (block: ContextBlock) => {
    const typeColors = {
      milestone: 'bg-gradient-to-br from-purple-500 to-purple-600',
      conversation: 'bg-gradient-to-br from-indigo-500 to-blue-500',
      decision: 'bg-gradient-to-br from-yellow-500 to-amber-500',
      code: 'bg-gradient-to-br from-green-500 to-emerald-500',
      search: 'bg-gradient-to-br from-cyan-500 to-blue-500',
      test: 'bg-gradient-to-br from-teal-500 to-green-500',
      error: 'bg-gradient-to-br from-red-500 to-pink-500',
      success: 'bg-gradient-to-br from-emerald-500 to-green-600',
      upcoming: 'bg-gradient-to-br from-gray-400 to-gray-500'
    };
    return typeColors[block.type] || 'bg-gradient-to-br from-gray-500 to-gray-600';
  };

  // Get icon for block type
  const getBlockIcon = (type: ContextBlock['type']) => {
    const icons = {
      milestone: Target,
      conversation: MessageSquare,
      decision: Brain,
      code: Code,
      search: Search,
      test: Terminal,
      error: AlertCircle,
      success: CheckCircle,
      upcoming: Clock
    };
    return icons[type] || FileText;
  };

  // Render connection lines between blocks
  const renderConnections = () => {
    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {blocks.map(block => 
          block.connections.children.map(childId => {
            const child = blocks.find(b => b.id === childId);
            if (!child || !block.position || !child.position) return null;

            const isHighlighted = hoveredBlock === block.id || hoveredBlock === childId;
            const gradient = isHighlighted ? 
              'url(#gradient-highlight)' : 
              'url(#gradient-normal)';

            return (
              <g key={`${block.id}-${childId}`}>
                <defs>
                  <linearGradient id="gradient-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="gradient-normal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d={`M ${block.position.x + 150} ${block.position.y + 50} 
                     C ${block.position.x + 150} ${block.position.y + 100},
                       ${child.position.x + 150} ${child.position.y - 50},
                       ${child.position.x + 150} ${child.position.y}`}
                  stroke={gradient}
                  strokeWidth={isHighlighted ? 3 : 2}
                  fill="none"
                  strokeDasharray={block.importance === 'low' ? '5,5' : undefined}
                />
                {isHighlighted && (
                  <circle r="3" fill="#3b82f6">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M ${block.position.x + 150} ${block.position.y + 50} 
                             C ${block.position.x + 150} ${block.position.y + 100},
                               ${child.position.x + 150} ${child.position.y - 50},
                               ${child.position.x + 150} ${child.position.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })
        )}
      </svg>
    );
  };

  // Render individual cascading card
  const renderCascadingCard = (block: ContextBlock) => {
    const Icon = getBlockIcon(block.type);
    const isActive = block.id === currentProject.activeContext;
    const isLast = block.id === currentProject.lastContext;
    const isSelected = selectedBlock === block.id;
    const isHovered = hoveredBlock === block.id;
    const isConnected = hoveredBlock && (
      blocks.find(b => b.id === hoveredBlock)?.connections.children.includes(block.id) ||
      blocks.find(b => b.id === hoveredBlock)?.connections.parents.includes(block.id)
    );

    // Adjust size based on zoom level
    const cardSize = zoomLevel === 'overview' ? 'w-48 h-32' : 
                    zoomLevel === 'detail' ? 'w-96 h-auto' : 'w-72 h-40';

    return (
      <div
        key={block.id}
        data-status={block.status}
        className={`absolute transition-all duration-300 ${
          isHovered || isConnected ? 'z-20 scale-105' : `z-${block.position?.z || 1}`
        }`}
        style={{
          left: block.position?.x || 0,
          top: block.position?.y || 0,
          transform: `${isHovered ? 'translateZ(10px)' : ''}`
        }}
        onMouseEnter={() => setHoveredBlock(block.id)}
        onMouseLeave={() => setHoveredBlock(null)}
        onClick={() => setSelectedBlock(isSelected ? null : block.id)}
      >
        {/* Active/Last indicators */}
        {isActive && (
          <div className="absolute -top-8 left-0 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-green-500 animate-pulse" />
            <span className="text-sm font-bold text-green-600">ACTIVE NOW</span>
          </div>
        )}
        {isLast && (
          <div className="absolute -top-8 right-0 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">LAST COMPLETED</span>
          </div>
        )}

        <Card 
          className={`${cardSize} cursor-pointer transition-all duration-300 overflow-hidden
            ${isSelected ? 'ring-2 ring-purple-500' : ''}
            ${isActive ? 'ring-2 ring-green-500' : ''}
            ${block.status === 'blocked' ? 'opacity-50' : ''}
            ${block.status === 'upcoming' ? 'opacity-40 border-dashed' : ''}
            hover:shadow-xl`}
        >
          {/* Gradient header bar */}
          <div className={`h-2 ${getBlockStyle(block)}`} />
          
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded-lg ${getBlockStyle(block)} text-white flex-shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`font-semibold truncate ${
                    zoomLevel === 'overview' ? 'text-xs' : 'text-sm'
                  }`}>
                    {block.title}
                  </h3>
                  {block.importance === 'critical' && (
                    <Zap className="h-3 w-3 text-red-500 flex-shrink-0" />
                  )}
                </div>

                {zoomLevel !== 'overview' && (
                  <>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {block.content}
                    </p>
                    
                    {/* Impact badges */}
                    {block.impact && (
                      <div className="flex gap-2 flex-wrap">
                        {block.impact.files && (
                          <Badge variant="outline" className="text-xs py-0">
                            {block.impact.files} files
                          </Badge>
                        )}
                        {block.impact.tests && (
                          <Badge variant="outline" className="text-xs py-0">
                            {block.impact.tests} tests
                          </Badge>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Time and connections in overview */}
                {zoomLevel === 'overview' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {new Date(block.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {block.connections.children.length > 0 && (
                      <Badge variant="secondary" className="text-xs py-0 px-1">
                        →{block.connections.children.length}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Full details in detail view */}
                {zoomLevel === 'detail' && isSelected && block.details && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <pre className="overflow-x-auto">
                      {JSON.stringify(block.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection count indicator */}
        {(block.connections.children.length > 0 || block.connections.parents.length > 0) && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="flex gap-1">
              {block.connections.parents.length > 0 && (
                <div className="bg-white border rounded-full px-2 py-0.5 text-xs shadow-sm">
                  ↑{block.connections.parents.length}
                </div>
              )}
              {block.connections.children.length > 0 && (
                <div className="bg-white border rounded-full px-2 py-0.5 text-xs shadow-sm">
                  ↓{block.connections.children.length}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Timeline sidebar
  const renderTimeline = () => {
    const sortedBlocks = [...blocks].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return (
      <div className="w-64 bg-white border-l p-4 overflow-y-auto">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
        </h3>
        
        <div className="space-y-2">
          {sortedBlocks.map((block, index) => {
            const Icon = getBlockIcon(block.type);
            const isActive = block.id === currentProject.activeContext;
            
            return (
              <div
                key={block.id}
                className={`relative pl-6 pb-2 cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors
                  ${selectedBlock === block.id ? 'bg-purple-50' : ''}
                  ${isActive ? 'bg-green-50' : ''}`}
                onClick={() => {
                  setSelectedBlock(block.id);
                  // Scroll main view to this block
                  const element = document.querySelector(`[data-status="${block.status}"]`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                {/* Timeline line */}
                {index < sortedBlocks.length - 1 && (
                  <div className="absolute left-2 top-6 w-0.5 h-full bg-gray-200" />
                )}
                
                {/* Timeline dot */}
                <div className={`absolute left-0.5 top-2 w-3 h-3 rounded-full border-2 border-white
                  ${isActive ? 'bg-green-500' : 
                    block.status === 'completed' ? 'bg-gray-400' : 'bg-gray-200'}`} 
                />
                
                <div className="flex items-start gap-2">
                  <Icon className="h-3 w-3 text-gray-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{block.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(block.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {isActive && (
                    <PlayCircle className="h-3 w-3 text-green-500 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Unified Header */}
      <header className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Project Info */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentProject.color} 
                flex items-center justify-center text-white`}>
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{currentProject.name}</h1>
                <p className="text-xs text-gray-500">
                  Sprint 3: {currentProject.sprints[0].name} • {currentProject.sprints[0].progress}%
                </p>
              </div>
            </div>

            {/* Sprint Progress */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${currentProject.sprints[0].progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {Math.ceil((new Date(currentProject.sprints[0].endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Filter Controls */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={filterMode === 'all' ? 'default' : 'ghost'}
                onClick={() => setFilterMode('all')}
                className="text-xs"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filterMode === 'active' ? 'default' : 'ghost'}
                onClick={() => setFilterMode('active')}
                className="text-xs"
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={filterMode === 'critical' ? 'default' : 'ghost'}
                onClick={() => setFilterMode('critical')}
                className="text-xs"
              >
                Critical
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoomLevel('overview')}
                className={zoomLevel === 'overview' ? 'bg-white' : ''}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoomLevel('normal')}
                className={zoomLevel === 'normal' ? 'bg-white' : ''}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoomLevel('detail')}
                className={zoomLevel === 'detail' ? 'bg-white' : ''}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Timeline Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <Calendar className="h-4 w-4" />
            </Button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Bell className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-green-500" />
            <span>{blocks.filter(b => b.status === 'active').length} active</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-gray-500" />
            <span>{blocks.filter(b => b.status === 'completed').length} completed today</span>
          </div>
          <div className="flex items-center gap-2">
            <GitCommit className="h-3 w-3 text-blue-500" />
            <span>5 commits</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-purple-500" />
            <span>3 collaborators online</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cascading Cards Canvas */}
        <div className="flex-1 relative overflow-auto" ref={containerRef}>
          <div className="relative" style={{ width: '1200px', height: '800px' }}>
            {renderConnections()}
            {getFilteredBlocks().map(renderCascadingCard)}
          </div>

          {/* Floating Action: Resume Work */}
          {currentProject.activeContext && (
            <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-xl border p-4 max-w-sm">
              <div className="flex items-start gap-3">
                <PlayCircle className="h-5 w-5 text-green-500 animate-pulse mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">Resume Work</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    {blocks.find(b => b.id === currentProject.activeContext)?.title}
                  </p>
                  <Button size="sm" className="text-xs">
                    Continue <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Sidebar */}
        {showTimeline && renderTimeline()}
      </div>
    </div>
  );
};