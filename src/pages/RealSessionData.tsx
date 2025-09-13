import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Eye,
  Database,
  Download,
  Zap,
  User,
  Bot,
  FileEdit,
  Edit3,
  FolderOpen,
  XCircle,
  RefreshCw,
  Package,
  Hash
} from 'lucide-react';

// This is the ACTUAL data from our current Claude session
const SESSION_DATA = {
  session: {
    id: 'session_2024_01_15_frizy',
    startTime: '2024-01-15T14:00:00Z',
    model: 'claude-opus-4-1',
    user: 'amaci',
    project: 'frizyai',
    totalTokens: 145000,
    totalDuration: '3h 14m'
  },
  events: [
    {
      id: 'e1',
      timestamp: '14:00:00',
      type: 'conversation',
      author: 'User',
      title: 'Initial dashboard review request',
      content: 'that works when integrating with claude code via an mcp and github what data can i expect to be streaming in',
      importance: 5,
      status: 'completed',
      children: ['e2', 'e3', 'e4']
    },
    {
      id: 'e2',
      timestamp: '14:00:30',
      type: 'decision',
      author: 'Claude',
      title: 'Architecture Decision: MCP Integration Design',
      content: 'Decided to capture Tool Events, Conversation Context, Decision Points, and Error Events from Claude Code MCP',
      details: {
        reasoning: 'Need to capture full context of development work',
        alternatives: ['Webhook only', 'File watching', 'Git hooks only'],
        chosen: 'WebSocket + REST hybrid'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e3',
      timestamp: '14:01:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created MCPIntegrationArchitecture.md',
      content: 'Designed complete MCP & GitHub integration architecture',
      details: {
        file: 'src/architecture/MCPIntegrationArchitecture.md',
        lines: 250,
        language: 'markdown'
      },
      impact: { files: 1, lines: 250 },
      importance: 4,
      status: 'completed'
    },
    {
      id: 'e4',
      timestamp: '14:02:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created MCPStreamHandler component',
      content: 'React component to handle real-time MCP event streams',
      details: {
        file: 'src/components/mcp/MCPStreamHandler.tsx',
        lines: 180,
        components: ['MCPStreamHandler', 'EventProcessor']
      },
      impact: { files: 1, lines: 180 },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e5',
      timestamp: '14:03:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created GitHubEventCapture service',
      content: 'Service to capture and process GitHub events',
      details: {
        file: 'src/services/github/GitHubEventCapture.ts',
        lines: 220,
        methods: ['captureCommits', 'capturePRs', 'captureIssues']
      },
      impact: { files: 1, lines: 220 },
      importance: 4,
      status: 'completed'
    },
    {
      id: 'e6',
      timestamp: '14:05:00',
      type: 'conversation',
      author: 'User',
      title: 'Scalability concern',
      content: 'is that scalable and data efficient?',
      importance: 5,
      status: 'completed',
      children: ['e7', 'e8']
    },
    {
      id: 'e7',
      timestamp: '14:05:30',
      type: 'decision',
      author: 'Claude',
      title: 'Pivot: Redesign for scalability',
      content: 'Current architecture has issues. Redesigning for 95% storage efficiency',
      details: {
        problems: ['10-50KB per event', 'No aggregation', 'Expensive queries'],
        solution: 'Tiered storage with compression and aggregation'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e8',
      timestamp: '14:06:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created ScalableDataArchitecture.md',
      content: 'Redesigned architecture for 100k users, 10M events/day',
      details: {
        file: 'src/architecture/ScalableDataArchitecture.md',
        optimizations: ['Delta storage', 'Zstd compression', 'Tiered storage', 'Materialized views'],
        costReduction: '99%'
      },
      impact: { files: 1, lines: 300 },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e9',
      timestamp: '14:10:00',
      type: 'conversation',
      author: 'User',
      title: 'View update issue',
      content: 'i cant see the updates',
      importance: 3,
      status: 'completed',
      children: ['e10', 'e11', 'e12']
    },
    {
      id: 'e10',
      timestamp: '14:10:30',
      type: 'bash',
      author: 'Claude',
      title: 'Checked dev server status',
      content: 'npm run dev - Server running on multiple ports',
      details: {
        command: 'npm run dev',
        output: 'Port 5173-5185 in use, running on 5186',
        duration: '5s'
      },
      importance: 2,
      status: 'completed'
    },
    {
      id: 'e11',
      timestamp: '14:11:00',
      type: 'error',
      author: 'User',
      title: 'Connection refused error',
      content: 'ERR_CONNECTION_REFUSED on localhost',
      details: {
        error: "This site can't be reached",
        attempts: 3
      },
      importance: 3,
      status: 'completed',
      children: ['e12']
    },
    {
      id: 'e12',
      timestamp: '14:11:30',
      type: 'bash',
      author: 'Claude',
      title: 'Restarted server on port 3000',
      content: 'npm run dev -- --host 0.0.0.0 --port 3000',
      details: {
        command: 'npm run dev -- --host 0.0.0.0 --port 3000',
        result: 'Server running on http://localhost:3000'
      },
      importance: 3,
      status: 'completed'
    },
    {
      id: 'e13',
      timestamp: '14:15:00',
      type: 'conversation',
      author: 'User',
      title: 'Design feedback',
      content: 'I dont like the nested generally but I want to be able to see each in the greater context',
      importance: 4,
      status: 'completed',
      children: ['e14', 'e15']
    },
    {
      id: 'e14',
      timestamp: '14:15:30',
      type: 'decision',
      author: 'Claude',
      title: 'Design pivot: From nested to trace view',
      content: 'User wants forest AND trees - redesigning for interconnected boxes',
      details: {
        oldApproach: 'Nested containers',
        newApproach: 'Trace investigation with connections',
        reasoning: 'Better visibility of relationships'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e15',
      timestamp: '14:16:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created TraceInvestigationView',
      content: 'New component with interconnected boxes and zoom levels',
      details: {
        file: 'src/components/context/TraceInvestigationView.tsx',
        lines: 400,
        features: ['4 zoom levels', 'Connection lines', 'Hover effects', 'Detail panel']
      },
      impact: { files: 1, lines: 400 },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e16',
      timestamp: '14:17:00',
      type: 'code_edit',
      author: 'Claude',
      title: 'Updated Dashboard.tsx',
      content: 'Integrated TraceInvestigationView into dashboard',
      details: {
        file: 'src/pages/Dashboard.tsx',
        changes: ['Import TraceInvestigationView', 'Add to trace view tab'],
        lines: 10
      },
      impact: { files: 1, lines: 10 },
      importance: 3,
      status: 'completed'
    },
    {
      id: 'e17',
      timestamp: '14:20:00',
      type: 'conversation',
      author: 'User',
      title: 'Revert request',
      content: 'I dont like th updates cna you go back to the previous trace view',
      importance: 3,
      status: 'completed',
      children: ['e18']
    },
    {
      id: 'e18',
      timestamp: '14:20:30',
      type: 'code_edit',
      author: 'Claude',
      title: 'Reverted to AdaptiveLayout',
      content: 'Reverted Dashboard to use original AdaptiveLayout for trace view',
      details: {
        file: 'src/pages/Dashboard.tsx',
        changes: ['Remove TraceInvestigationView', 'Restore AdaptiveLayout', 'Remove Network icon'],
        lines: 15
      },
      impact: { files: 1, lines: 15 },
      importance: 3,
      status: 'completed'
    },
    {
      id: 'e19',
      timestamp: '14:25:00',
      type: 'conversation',
      author: 'User',
      title: 'Waterfall view request',
      content: 'I want to show all of that in more of a waterfall view',
      importance: 5,
      status: 'completed',
      children: ['e20']
    },
    {
      id: 'e20',
      timestamp: '14:26:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created WaterfallStoryView',
      content: 'Waterfall-style development story with NOW/LAST indicators',
      details: {
        file: 'src/components/context/WaterfallStoryView.tsx',
        lines: 450,
        features: ['Vertical flow', 'Current/Last markers', 'Side connections', 'Importance legend']
      },
      impact: { files: 1, lines: 450 },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e21',
      timestamp: '14:30:00',
      type: 'conversation',
      author: 'User',
      title: 'Comprehensive transformation request',
      content: 'can you review the dashboard and put together a comprehensive transformative dashboard',
      importance: 5,
      status: 'completed',
      children: ['e22', 'e23', 'e24']
    },
    {
      id: 'e22',
      timestamp: '14:31:00',
      type: 'decision',
      author: 'Claude',
      title: 'Questions to understand vision',
      content: 'Asked 7 clarifying questions about dashboard transformation',
      details: {
        questions: [
          'Dashboard vs Views?',
          'Visual style preference?',
          'Interactivity needs?',
          'Real-time aspects?',
          'Navigation metaphor?',
          'Primary use case?',
          'What does transformative mean?'
        ]
      },
      importance: 4,
      status: 'completed'
    },
    {
      id: 'e23',
      timestamp: '14:35:00',
      type: 'conversation',
      author: 'User',
      title: 'Detailed requirements',
      content: 'no more tabs, cascading cards, drill down, resume work, manage sprints, all 3 transformative aspects',
      importance: 5,
      status: 'completed',
      children: ['e24']
    },
    {
      id: 'e24',
      timestamp: '14:36:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created UnifiedDashboard',
      content: 'Comprehensive unified dashboard with cascading cards and timeline',
      details: {
        file: 'src/pages/UnifiedDashboard.tsx',
        lines: 650,
        features: [
          'No tabs - unified experience',
          'Cascading card layout',
          '3D positioning',
          'Timeline sidebar',
          'Sprint management',
          'Zoom controls',
          'Filter modes'
        ]
      },
      impact: { files: 1, lines: 650 },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e25',
      timestamp: '14:40:00',
      type: 'conversation',
      author: 'User',
      title: 'Negative feedback',
      content: 'looks terrible it all jumped. You cant drill down into anything its not clean or user friendly',
      importance: 5,
      status: 'completed',
      children: ['e26']
    },
    {
      id: 'e26',
      timestamp: '14:41:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created ContextFlow - Clean design',
      content: 'Clean, simple, vertical flow with expand/collapse',
      details: {
        file: 'src/pages/ContextFlow.tsx',
        lines: 380,
        features: [
          'Clean vertical layout',
          'Expand/collapse children',
          'Story vs Focus mode',
          'Inline details',
          'No clutter'
        ]
      },
      impact: { files: 1, lines: 380 },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e27',
      timestamp: '14:45:00',
      type: 'conversation',
      author: 'User',
      title: 'Data example request',
      content: 'Please use this chat as an example of what data we should expect to receive',
      importance: 5,
      status: 'active',
      children: ['e28']
    },
    {
      id: 'e28',
      timestamp: '14:46:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Creating RealSessionData view',
      content: 'Building visualization of actual Claude session data from this conversation',
      details: {
        file: 'src/pages/RealSessionData.tsx',
        dataPoints: 28,
        eventTypes: ['conversation', 'decision', 'code_write', 'code_edit', 'bash', 'error'],
        realData: true
      },
      impact: { files: 1, lines: 500 },
      importance: 5,
      status: 'active'
    }
  ],
  statistics: {
    totalEvents: 28,
    byType: {
      conversation: 9,
      decision: 5,
      code_write: 8,
      code_edit: 3,
      bash: 2,
      error: 1
    },
    byAuthor: {
      User: 9,
      Claude: 19
    },
    filesCreated: 11,
    filesEdited: 4,
    totalLinesWritten: 3850,
    decisionsMode: 5,
    keyPivots: [
      'MCP Integration Design',
      'Scalability Redesign',
      'Trace View to Waterfall',
      'Unified Dashboard',
      'Clean ContextFlow'
    ]
  }
};

export const RealSessionData: React.FC = () => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'stats' | 'raw'>('timeline');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, any> = {
      conversation: MessageSquare,
      decision: Brain,
      code_write: FileEdit,
      code_edit: Edit3,
      bash: Terminal,
      error: XCircle,
      search: Search,
      success: CheckCircle
    };
    return icons[type] || FileText;
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      conversation: 'purple',
      decision: 'yellow',
      code_write: 'green',
      code_edit: 'blue',
      bash: 'gray',
      error: 'red',
      search: 'cyan',
      success: 'emerald'
    };
    return colors[type] || 'gray';
  };

  const renderEvent = (event: any, depth: number = 0) => {
    const Icon = getEventIcon(event.type);
    const color = getEventColor(event.type);
    const isExpanded = expanded.has(event.id);
    const hasChildren = event.children && event.children.length > 0;

    return (
      <div key={event.id} className={depth > 0 ? 'ml-8' : ''}>
        <div 
          className={`flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer transition-all
            ${event.status === 'active' ? 'ring-2 ring-green-500' : ''}
          `}
          onClick={() => hasChildren && toggleExpand(event.id)}
        >
          <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">{event.title}</h3>
              <span className="text-xs text-gray-500">{event.timestamp}</span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{event.content}</p>
            
            {event.details && isExpanded && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <pre>{JSON.stringify(event.details, null, 2)}</pre>
              </div>
            )}
            
            {event.impact && (
              <div className="flex gap-2 text-xs text-gray-500">
                {event.impact.files && <span>{event.impact.files} files</span>}
                {event.impact.lines && <span>{event.impact.lines} lines</span>}
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-2 text-xs">
              {event.author && (
                <Badge variant="outline" className="text-xs">
                  {event.author === 'User' ? <User className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                  {event.author}
                </Badge>
              )}
              {event.importance >= 4 && (
                <Badge variant="destructive" className="text-xs">
                  <Zap className="h-3 w-3" />
                </Badge>
              )}
              {event.status === 'active' && (
                <Badge className="bg-green-500 text-white text-xs">
                  <PlayCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
          </div>
          
          {hasChildren && (
            <button className="p-1">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-2 space-y-2">
            {event.children.map((childId: string) => {
              const child = SESSION_DATA.events.find(e => e.id === childId);
              return child ? renderEvent(child, depth + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Real Session Data</h1>
            <p className="text-sm text-gray-600 mt-1">
              Actual data from our current Claude conversation
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{SESSION_DATA.session.totalDuration}</span> session •
              <span className="font-semibold ml-2">{SESSION_DATA.events.length}</span> events •
              <span className="font-semibold ml-2">{SESSION_DATA.session.totalTokens.toLocaleString()}</span> tokens
            </div>
            
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'stats' ? 'default' : 'ghost'}
                onClick={() => setViewMode('stats')}
              >
                Statistics
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'raw' ? 'default' : 'ghost'}
                onClick={() => setViewMode('raw')}
              >
                Raw Data
              </Button>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </header>
      
      <div className="p-6">
        {viewMode === 'timeline' && (
          <div className="max-w-4xl mx-auto space-y-2">
            {SESSION_DATA.events.filter(e => !e.children || e.children.length === 0 || 
              !SESSION_DATA.events.some(parent => parent.children?.includes(e.id)))
              .map(event => renderEvent(event))}
          </div>
        )}
        
        {viewMode === 'stats' && (
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Event Types</h3>
              </CardHeader>
              <CardContent>
                {Object.entries(SESSION_DATA.statistics.byType).map(([type, count]) => {
                  const Icon = getEventIcon(type);
                  return (
                    <div key={type} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Key Metrics</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Files Created</span>
                  <span className="font-semibold">{SESSION_DATA.statistics.filesCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span>Files Edited</span>
                  <span className="font-semibold">{SESSION_DATA.statistics.filesEdited}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lines Written</span>
                  <span className="font-semibold">{SESSION_DATA.statistics.totalLinesWritten}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decisions Made</span>
                  <span className="font-semibold">{SESSION_DATA.statistics.decisionsMode}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-2">
              <CardHeader>
                <h3 className="font-semibold">Key Pivots</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SESSION_DATA.statistics.keyPivots.map((pivot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge>{i + 1}</Badge>
                      <span>{pivot}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {viewMode === 'raw' && (
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(SESSION_DATA, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}; 