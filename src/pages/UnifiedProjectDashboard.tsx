import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Package,
  Layers,
  GitBranch,
  MessageSquare,
  Code,
  Brain,
  Search,
  Terminal,
  FileText,
  Zap,
  Users,
  Calendar,
  TrendingUp,
  ArrowRight,
  Circle,
  PlayCircle,
  Settings,
  BarChart3,
  Database,
  Activity,
  Filter,
  Home,
  ExternalLink,
  Hash,
  Link2,
  Eye
} from 'lucide-react';

// Unified block structure for all levels
interface UnifiedBlock {
  // Core fields (same for all)
  id: string;
  level: 'pillar' | 'goal' | 'event';
  type: string;
  title: string;
  summary: string;
  status: 'completed' | 'active' | 'blocked' | 'planned';
  progress?: number;
  timestamp?: string;
  
  // Context fields
  context?: {
    goal?: string;
    reason?: string;
    impact?: string;
  };
  
  // Metrics (standardized)
  metrics?: {
    completed?: number;
    total?: number;
    custom?: { [key: string]: number | string };
  };
  
  // Relationships
  relationships?: {
    parent?: string;
    children?: string[];
    dependencies?: string[];
    enables?: string[];
    related?: string[];
  };
  
  // References (to session data)
  references?: {
    sessionId?: string;
    eventIds?: string[];
    gitSha?: string;
    prNumber?: number;
  };
}

// Sample data linked to session
const PROJECT_DATA: UnifiedBlock[] = [
  // PILLARS
  {
    id: 'p1',
    level: 'pillar',
    type: 'feature',
    title: 'Authentication System',
    summary: 'Secure, scalable authentication with MFA support',
    status: 'completed',
    progress: 100,
    context: {
      goal: 'Enable secure user access',
      reason: 'Foundation for all user features',
      impact: 'Affects 100% of users'
    },
    metrics: {
      completed: 4,
      total: 4,
      custom: { blockers: 0, days: 14 }
    },
    relationships: {
      children: ['g1', 'g2', 'g3'],
      enables: ['p2']
    },
    references: {
      sessionId: 'session_2024_01_15_auth'
    }
  },
  {
    id: 'p2',
    level: 'pillar',
    type: 'feature',
    title: 'Context Capture System',
    summary: 'MCP integration for capturing development context',
    status: 'active',
    progress: 65,
    context: {
      goal: 'Never lose development context',
      reason: 'Core value proposition of Frizy',
      impact: 'Saves 2+ hours per day per developer'
    },
    metrics: {
      completed: 3,
      total: 5,
      custom: { blockers: 1, events: 150 }
    },
    relationships: {
      children: ['g4', 'g5', 'g6'],
      dependencies: ['p1'],
      enables: ['p3', 'p4']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e1', 'e2', 'e3', 'e6', 'e7']
    }
  },
  {
    id: 'p3',
    level: 'pillar',
    type: 'infrastructure',
    title: 'Scalable Architecture',
    summary: 'Optimize for 100k users with 99% cost reduction',
    status: 'active',
    progress: 40,
    context: {
      goal: 'Make platform economically viable',
      reason: 'Current costs would be $10k/month at scale',
      impact: 'Reduces cost to $100/month'
    },
    metrics: {
      completed: 2,
      total: 6,
      custom: { reduction: '99%', storage: '5KB/session' }
    },
    relationships: {
      children: ['g7', 'g8'],
      dependencies: ['p2']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e6', 'e7', 'e8']
    }
  },
  
  // GOALS
  {
    id: 'g1',
    level: 'goal',
    type: 'bugfix',
    title: 'Fix Corporate Email Login',
    summary: 'Support multi-level domain emails',
    status: 'completed',
    progress: 100,
    timestamp: '2024-01-15 10:00',
    context: {
      goal: 'Allow @company.subdomain.com logins',
      reason: 'Users with corporate emails cannot access',
      impact: '~30% of enterprise users affected'
    },
    metrics: {
      completed: 5,
      total: 5,
      custom: { files: 1, tests: 47, time: '45min' }
    },
    relationships: {
      parent: 'p1',
      children: ['e1', 'e2', 'e3', 'e4', 'e5'],
      enables: ['g2']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      gitSha: 'abc123'
    }
  },
  {
    id: 'g4',
    level: 'goal',
    type: 'feature',
    title: 'MCP Stream Handler',
    summary: 'Real-time event capture from Claude Code',
    status: 'completed',
    progress: 100,
    timestamp: '2024-01-15 14:01',
    context: {
      goal: 'Capture all Claude Code events',
      reason: 'Need real-time context capture',
      impact: 'Enables entire context system'
    },
    metrics: {
      completed: 6,
      total: 6,
      custom: { lines: 180, components: 1 }
    },
    relationships: {
      parent: 'p2',
      children: ['e6', 'e7', 'e8'],
      enables: ['g5', 'g6']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e3'],
      gitSha: 'def456'
    }
  },
  {
    id: 'g7',
    level: 'goal',
    type: 'optimization',
    title: 'Tiered Storage Implementation',
    summary: 'Redis → PostgreSQL → S3 pipeline',
    status: 'active',
    progress: 70,
    timestamp: '2024-01-15 14:06',
    context: {
      goal: 'Reduce storage costs by 99%',
      reason: 'Current approach costs $10k/month',
      impact: 'Makes platform economically viable'
    },
    metrics: {
      completed: 4,
      total: 6,
      custom: { before: '50KB/event', after: '200B/event' }
    },
    relationships: {
      parent: 'p3',
      children: ['e9', 'e10'],
      dependencies: ['g4']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e7', 'e8']
    }
  },
  
  // EVENTS (from session data)
  {
    id: 'e1',
    level: 'event',
    type: 'conversation',
    title: 'User reported issue',
    summary: 'Login failing for @company.subdomain.com',
    status: 'completed',
    timestamp: '10:00:00',
    context: {
      reason: 'User cannot access system',
      impact: 'Blocking enterprise customers'
    },
    metrics: {
      custom: { priority: 'high', response: '30s' }
    },
    relationships: {
      parent: 'g1',
      children: ['e2']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e1']
    }
  },
  {
    id: 'e2',
    level: 'event',
    type: 'search',
    title: 'Searched validation logic',
    summary: 'Found restrictive regex in 3 files',
    status: 'completed',
    timestamp: '10:01:00',
    context: {
      goal: 'Locate email validation',
      reason: 'Need to find root cause',
      impact: 'Identified problem area'
    },
    metrics: {
      custom: { files: 3, patterns: 'email.*validation' }
    },
    relationships: {
      parent: 'g1',
      dependencies: ['e1'],
      children: ['e3']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e2']
    }
  },
  {
    id: 'e3',
    level: 'event',
    type: 'decision',
    title: 'Identified root cause',
    summary: 'Regex rejects multi-level domains',
    status: 'completed',
    timestamp: '10:02:00',
    context: {
      reason: 'Pattern /^[^@]+@[^.]+\\.[^.]+$/ too restrictive',
      impact: 'Affects all subdomain emails'
    },
    metrics: {
      custom: { confidence: '100%', alternatives: 2 }
    },
    relationships: {
      parent: 'g1',
      dependencies: ['e2'],
      children: ['e4']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e3', 'e14']
    }
  },
  {
    id: 'e6',
    level: 'event',
    type: 'conversation',
    title: 'MCP Integration Question',
    summary: 'What data to capture from Claude Code',
    status: 'completed',
    timestamp: '14:00:00',
    context: {
      goal: 'Understand data architecture',
      reason: 'Planning MCP integration',
      impact: 'Defines entire capture strategy'
    },
    metrics: {
      custom: { tokens: 2487, decisions: 3 }
    },
    relationships: {
      parent: 'g4',
      children: ['e7']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e1', 'e2']
    }
  },
  {
    id: 'e7',
    level: 'event',
    type: 'code',
    title: 'Created MCPStreamHandler',
    summary: 'WebSocket handler for MCP events',
    status: 'completed',
    timestamp: '14:01:00',
    context: {
      goal: 'Handle real-time events',
      reason: 'Need continuous connection',
      impact: 'Core component of system'
    },
    metrics: {
      custom: { lines: 180, functions: 5 }
    },
    relationships: {
      parent: 'g4',
      dependencies: ['e6'],
      enables: ['g5']
    },
    references: {
      sessionId: 'session_2024_01_15_frizy',
      eventIds: ['e3', 'e4'],
      gitSha: 'abc123'
    }
  }
];

export const UnifiedProjectDashboard: React.FC = () => {
  const [selectedBlocks, setSelectedBlocks] = useState<{
    pillar?: UnifiedBlock;
    goal?: UnifiedBlock;
    event?: UnifiedBlock;
  }>({});
  
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'metrics'>('overview');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Get children blocks
  const getChildren = (parentId: string): UnifiedBlock[] => {
    return PROJECT_DATA.filter(block => 
      block.relationships?.parent === parentId ||
      PROJECT_DATA.find(p => p.id === parentId)?.relationships?.children?.includes(block.id)
    );
  };
  
  // Get blocks by level
  const getBlocksByLevel = (level: string) => {
    return PROJECT_DATA.filter(b => b.level === level);
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-700';
      case 'active': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'blocked': return 'bg-red-50 border-red-200 text-red-700';
      case 'planned': return 'bg-gray-50 border-gray-200 text-gray-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'active': return PlayCircle;
      case 'blocked': return AlertCircle;
      case 'planned': return Clock;
      default: return Circle;
    }
  };
  
  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation': return MessageSquare;
      case 'decision': return Brain;
      case 'code': return Code;
      case 'search': return Search;
      case 'test': return Terminal;
      case 'feature': return Package;
      case 'bugfix': return AlertCircle;
      case 'optimization': return TrendingUp;
      default: return FileText;
    }
  };
  
  // Render unified block structure (same for all levels)
  const renderBlock = (block: UnifiedBlock, isSelected: boolean, onClick: () => void) => {
    const StatusIcon = getStatusIcon(block.status);
    const TypeIcon = getTypeIcon(block.type);
    
    return (
      <Card
        key={block.id}
        className={`cursor-pointer transition-all mb-3 ${
          isSelected ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'
        } ${getStatusColor(block.status)}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/80">
                <TypeIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{block.title}</h3>
                <p className="text-xs mt-1 opacity-90">{block.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              {block.progress !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {block.progress}%
                </Badge>
              )}
            </div>
          </div>
          
          {/* Context Section (always same structure) */}
          {block.context && (
            <div className="bg-white/50 rounded p-2 mb-3">
              <div className="grid grid-cols-1 gap-1 text-xs">
                {block.context.goal && (
                  <div><span className="font-medium">Goal:</span> {block.context.goal}</div>
                )}
                {block.context.reason && (
                  <div><span className="font-medium">Why:</span> {block.context.reason}</div>
                )}
                {block.context.impact && (
                  <div><span className="font-medium">Impact:</span> {block.context.impact}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Metrics Row (standardized) */}
          {block.metrics && (
            <div className="flex items-center gap-3 text-xs mb-3">
              {block.metrics.completed !== undefined && (
                <Badge variant="outline" className="bg-white/80">
                  {block.metrics.completed}/{block.metrics.total}
                </Badge>
              )}
              {block.metrics.custom && Object.entries(block.metrics.custom).slice(0, 3).map(([key, value]) => (
                <Badge key={key} variant="outline" className="bg-white/80">
                  {key}: {value}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Relationships Footer */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 opacity-75">
              {block.timestamp && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {block.timestamp}
                </span>
              )}
              {block.relationships?.children && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {block.relationships.children.length} items
                </span>
              )}
            </div>
            {block.references?.sessionId && (
              <Link2 className="h-3 w-3 opacity-50" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Calculate column widths
  const getColumnWidth = () => {
    const activeColumns = [
      true, // pillars always shown
      !!selectedBlocks.pillar,
      !!selectedBlocks.goal
    ].filter(Boolean).length;
    
    return activeColumns === 1 ? 'flex-1' : 'w-96';
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Frizy Project Dashboard</h1>
            <Badge variant="secondary">Context-Aware Development</Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/session-data', '_blank')}
            >
              <Database className="h-4 w-4 mr-1" />
              Session Data
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/enhanced-data', '_blank')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Full Context
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Admin Panel */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Overview & Controls
            </h2>
            
            {/* View Mode Toggle */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-gray-600">View Mode</label>
              <div className="flex flex-col gap-1">
                {['overview', 'timeline', 'metrics'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={`px-3 py-2 text-xs rounded transition-colors text-left ${
                      viewMode === mode 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-gray-600">Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="planned">Planned</option>
              </select>
            </div>
          </div>
          
          {/* Stats */}
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-medium text-gray-600 mb-2">Project Stats</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Pillars</span>
                <span className="font-semibold">{getBlocksByLevel('pillar').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Goals</span>
                <span className="font-semibold">{getBlocksByLevel('goal').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Events</span>
                <span className="font-semibold">{getBlocksByLevel('event').length}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex justify-between text-xs mb-2">
                <span>Progress</span>
                <span className="font-semibold">58%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style={{ width: '58%' }} />
              </div>
            </div>
            
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>4 Completed</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>3 Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>1 Blocked</span>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="p-4 border-t">
            <h3 className="text-xs font-medium text-gray-600 mb-2">Quick Links</h3>
            <div className="space-y-1">
              <a href="/session-data" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700">
                <ExternalLink className="h-3 w-3" />
                Session Data
              </a>
              <a href="/enhanced-data" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700">
                <ExternalLink className="h-3 w-3" />
                Enhanced Context
              </a>
              <a href="/scalable-data" className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700">
                <ExternalLink className="h-3 w-3" />
                Data Model
              </a>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Pillars Column */}
          <div className={`${getColumnWidth()} border-r bg-white overflow-y-auto`}>
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <h2 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Project Pillars
              </h2>
            </div>
            <div className="p-4">
              {getBlocksByLevel('pillar')
                .filter(b => filterStatus === 'all' || b.status === filterStatus)
                .map(pillar => renderBlock(
                  pillar,
                  selectedBlocks.pillar?.id === pillar.id,
                  () => setSelectedBlocks({ pillar })
                ))}
            </div>
          </div>
          
          {/* Goals Column */}
          {selectedBlocks.pillar && (
            <div className={`${getColumnWidth()} border-r bg-white overflow-y-auto`}>
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Package className="h-3 w-3" />
                  <span>{selectedBlocks.pillar.title}</span>
                </div>
                <h2 className="font-semibold">Goals & Containers</h2>
              </div>
              <div className="p-4">
                {getChildren(selectedBlocks.pillar.id)
                  .filter(b => filterStatus === 'all' || b.status === filterStatus)
                  .map(goal => renderBlock(
                    goal,
                    selectedBlocks.goal?.id === goal.id,
                    () => setSelectedBlocks({ ...selectedBlocks, goal })
                  ))}
              </div>
            </div>
          )}
          
          {/* Events Column */}
          {selectedBlocks.goal && (
            <div className="flex-1 bg-white overflow-y-auto">
              <div className="p-4 border-b bg-gradient-to-r from-green-50 to-yellow-50">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Layers className="h-3 w-3" />
                  <span>{selectedBlocks.pillar?.title}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{selectedBlocks.goal.title}</span>
                </div>
                <h2 className="font-semibold">Events & Context</h2>
              </div>
              <div className="p-4">
                {getChildren(selectedBlocks.goal.id)
                  .filter(b => filterStatus === 'all' || b.status === filterStatus)
                  .map(event => renderBlock(
                    event,
                    selectedBlocks.event?.id === event.id,
                    () => setSelectedBlocks({ ...selectedBlocks, event })
                  ))}
                  
                {/* Link to session data */}
                {selectedBlocks.goal.references?.sessionId && (
                  <Card className="mt-4 bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            View Full Session Data
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open('/session-data', '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Session: {selectedBlocks.goal.references.sessionId}
                      </p>
                      {selectedBlocks.goal.references.eventIds && (
                        <p className="text-xs text-blue-600 mt-1">
                          {selectedBlocks.goal.references.eventIds.length} linked events
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};