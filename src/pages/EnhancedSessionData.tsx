import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain,
  Code,
  MessageSquare,
  Search,
  Terminal,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  Download,
  Zap,
  User,
  Bot,
  FileEdit,
  Edit3,
  XCircle,
  GitCommit,
  Package,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';

// Enhanced data with actual context and code snippets
const ENHANCED_SESSION_DATA = {
  session: {
    id: 'session_2024_01_15_frizy',
    startTime: '2024-01-15T14:00:00Z',
    model: 'claude-opus-4-1',
    user: 'amaci',
    project: 'frizyai',
    context: 'Building a context-aware memory system for development',
    goal: 'Create dashboard that captures and visualizes Claude Code sessions'
  },
  events: [
    {
      id: 'e1',
      timestamp: '14:00:00',
      type: 'conversation',
      author: 'User',
      title: 'MCP Integration Question',
      summary: 'How to capture data from Claude Code MCP',
      content: 'When integrating with Claude Code via MCP and GitHub, what data can we expect to stream in?',
      context: {
        intent: 'Understand data architecture',
        projectPhase: 'Initial design',
        relatedConcepts: ['MCP protocol', 'WebSocket streams', 'GitHub webhooks']
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e2',
      timestamp: '14:00:30',
      type: 'decision',
      author: 'Claude',
      title: 'Architecture: MCP + GitHub Integration',
      summary: 'Hybrid approach with WebSocket for real-time, REST for batch',
      content: 'Capture tool events, conversations, decisions, and errors from Claude Code MCP',
      implementation: {
        approach: 'Event-driven architecture',
        components: ['MCPStreamHandler', 'GitHubEventCapture', 'EventProcessor'],
        rationale: 'Need real-time updates with historical context preservation'
      },
      codePreview: `
// Event structure from MCP
interface MCPEvent {
  id: string;
  timestamp: string;
  type: 'tool' | 'conversation' | 'decision';
  tool?: 'Read' | 'Write' | 'Edit' | 'Bash';
  parameters?: Record<string, any>;
  result?: any;
  tokensUsed: number;
}`,
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e3',
      timestamp: '14:01:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created MCPStreamHandler Component',
      summary: 'React component for real-time MCP event processing',
      content: 'Handles WebSocket connection, event normalization, and UI updates',
      implementation: {
        file: 'src/components/mcp/MCPStreamHandler.tsx',
        lines: 180,
        keyFeatures: [
          'WebSocket connection management',
          'Event queue with batching',
          'Automatic reconnection',
          'Token usage tracking'
        ]
      },
      codeSnippet: `
export const MCPStreamHandler: React.FC = () => {
  const [events, setEvents] = useState<MCPStreamEvent[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:3001/mcp');
    
    ws.current.onmessage = (event) => {
      const mpcEvent = JSON.parse(event.data);
      // Process and enrich the event
      const enriched = enrichMCPEvent(mpcEvent);
      setEvents(prev => [...prev, enriched]);
    };
  }, []);

  const enrichMCPEvent = (event: MCPEvent) => {
    // Add context, importance, relationships
    return {
      ...event,
      importance: calculateImportance(event),
      context: extractContext(event),
      relationships: findRelatedEvents(event)
    };
  };
}`,
      impact: { 
        files: 1, 
        lines: 180,
        components: ['MCPStreamHandler', 'EventProcessor'],
        dependencies: ['WebSocket API', 'React hooks']
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e4',
      timestamp: '14:02:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created GitHubEventCapture Service',
      summary: 'Service to capture commits, PRs, and issues from GitHub',
      content: 'Polls GitHub API and processes webhook events',
      implementation: {
        file: 'src/services/github/GitHubEventCapture.ts',
        lines: 220,
        keyFeatures: [
          'Octokit integration',
          'Webhook processing',
          'Event correlation with Claude sessions',
          'Automatic PR/issue linking'
        ]
      },
      codeSnippet: `
export class GitHubEventCapture {
  private octokit: Octokit;
  
  async captureCommits(since: Date) {
    const commits = await this.octokit.repos.listCommits({
      owner: this.config.owner,
      repo: this.config.repo,
      since: since.toISOString()
    });
    
    return commits.data.map(commit => ({
      type: 'commit',
      sha: commit.sha,
      message: commit.commit.message,
      files: commit.files?.map(f => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch?.substring(0, 500) // First 500 chars
      })),
      claudeContext: this.findRelatedClaudeSession(commit)
    }));
  }
}`,
      impact: { 
        files: 1, 
        lines: 220,
        apis: ['GitHub REST API', 'Webhooks'],
        dataFlow: 'GitHub → Frizy → Context enrichment'
      },
      importance: 4,
      status: 'completed'
    },
    {
      id: 'e5',
      timestamp: '14:05:00',
      type: 'conversation',
      author: 'User',
      title: 'Scalability Concern',
      summary: 'Is this approach scalable and data efficient?',
      content: 'Worried about storing 50-200 events per session across thousands of users',
      context: {
        concern: 'Storage costs and query performance',
        scale: '100k users, 10M events/day',
        currentApproach: 'Storing full events with 10-50KB each'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e6',
      timestamp: '14:05:30',
      type: 'decision',
      author: 'Claude',
      title: 'Pivot: Scalable Architecture Redesign',
      summary: 'Moved to tiered storage with compression and aggregation',
      content: 'Redesigned for 95% storage efficiency and 99% cost reduction',
      implementation: {
        oldApproach: {
          storage: 'Full events in PostgreSQL',
          size: '50KB per event',
          cost: '$10,000/month'
        },
        newApproach: {
          storage: 'Tiered (Redis → PostgreSQL → S3)',
          size: '200 bytes per event (compressed)',
          cost: '$100/month'
        },
        techniques: [
          'Delta compression',
          'Event aggregation',
          'Materialized views',
          'Cold storage archival'
        ]
      },
      codePreview: `
// New efficient storage model
class EventStorage {
  async store(event: MCPEvent) {
    // 1. Store delta only
    const delta = this.computeDelta(event);
    
    // 2. Compress with zstd
    const compressed = await zstd.compress(delta);
    
    // 3. Store in appropriate tier
    if (event.age < '24h') {
      await redis.set(event.id, compressed);
    } else if (event.age < '30d') {
      await postgres.insert('events', compressed);
    } else {
      await s3.putObject('archive', compressed);
    }
  }
}`,
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e7',
      timestamp: '14:15:00',
      type: 'conversation',
      author: 'User',
      title: 'UI Feedback: Nested View Issues',
      summary: 'Want to see forest AND trees - context in greater picture',
      content: 'I dont like the nested containers, want to see each element in the greater context',
      context: {
        uiProblem: 'Too much nesting hides relationships',
        userNeed: 'See both detail and overview',
        inspiration: 'Investigation flow visualization'
      },
      importance: 4,
      status: 'completed'
    },
    {
      id: 'e8',
      timestamp: '14:16:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created TraceInvestigationView',
      summary: 'Interconnected boxes with zoom levels and connections',
      content: 'Visual graph showing relationships between development events',
      implementation: {
        file: 'src/components/context/TraceInvestigationView.tsx',
        lines: 400,
        features: [
          '4 zoom levels (overview → detail)',
          'SVG connection lines with animation',
          'Hover highlighting of relationships',
          'Importance-based visual hierarchy'
        ]
      },
      codeSnippet: `
const renderConnections = () => (
  <svg className="absolute inset-0">
    {traces.flatMap(trace => 
      trace.connections.map(targetId => {
        const isHighlighted = hoveredTrace === trace.id;
        return (
          <line
            x1={source.x} y1={source.y}
            x2={target.x} y2={target.y}
            stroke={isHighlighted ? '#3b82f6' : '#cbd5e1'}
            strokeWidth={isHighlighted ? 2 : 1}
            opacity={isHighlighted ? 1 : 0.3}
          />
        );
      })
    )}
  </svg>
);`,
      visualDesign: {
        layout: 'Force-directed graph',
        interaction: 'Click to expand, hover to highlight',
        colors: 'Type-based gradient system'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e9',
      timestamp: '14:30:00',
      type: 'conversation',
      author: 'User',
      title: 'Comprehensive Transformation Request',
      summary: 'Create unified dashboard without tabs',
      content: 'No more tabs, cascading cards, drill down, manage sprints, transformative experience',
      context: {
        requirements: [
          'Single unified view',
          'Sprint/project management',
          'Resume work instantly',
          'See everything connected'
        ],
        inspiration: 'Spatial interfaces, IDE-like experience'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e10',
      timestamp: '14:36:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created UnifiedDashboard',
      summary: 'Comprehensive spatial interface with cascading cards',
      content: 'Eliminated tabs, created 3D-positioned card system with timeline',
      implementation: {
        file: 'src/pages/UnifiedDashboard.tsx',
        lines: 650,
        architecture: {
          layout: '3D spatial positioning',
          components: ['CascadingCards', 'Timeline', 'SprintManager'],
          state: 'Zustand for complex interactions'
        }
      },
      codeSnippet: `
// 3D positioning system
const renderCascadingCard = (block: ContextBlock) => {
  return (
    <div
      style={{
        left: block.position.x,
        top: block.position.y,
        zIndex: block.position.z,
        transform: \`translateZ(\${block.position.z * 10}px)\`
      }}
      className="absolute transition-all duration-300"
    >
      <Card className={\`
        \${isActive ? 'ring-2 ring-green-500' : ''}
        \${isHovered ? 'scale-105 shadow-xl' : ''}
      \`}>
        {/* Sprint context */}
        <Badge>{block.sprint}</Badge>
        {/* Active indicator */}
        {isActive && <PlayCircle className="animate-pulse" />}
      </Card>
    </div>
  );
};`,
      userExperience: {
        navigation: 'Spatial with zoom',
        filtering: 'Active/Critical/All modes',
        resumeWork: 'Floating action button',
        timeline: 'Collapsible sidebar'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e11',
      timestamp: '14:40:00',
      type: 'conversation',
      author: 'User',
      title: 'Negative Feedback',
      summary: 'UI too jumbled, not clean or user-friendly',
      content: 'looks terrible it all jumped. You cant drill down into anything',
      context: {
        problem: 'Over-engineered, lost simplicity',
        lesson: 'Transformative ≠ Complex',
        direction: 'Back to basics with clarity'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e12',
      timestamp: '14:41:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created ContextFlow - Clean Design',
      summary: 'Simple vertical flow with expand/collapse',
      content: 'Clean, minimal design focusing on clarity over complexity',
      implementation: {
        file: 'src/pages/ContextFlow.tsx',
        lines: 380,
        philosophy: 'Less is more',
        features: [
          'Vertical timeline',
          'Inline expansion',
          'Two modes: Story/Focus',
          'No visual noise'
        ]
      },
      codeSnippet: `
// Clean, simple component
const renderNode = (node: ContextNode) => (
  <div className="flex gap-3 p-4 border rounded-lg bg-white">
    <Icon className="h-4 w-4" />
    <div className="flex-1">
      <h3 className="font-semibold">{node.title}</h3>
      <p className="text-gray-600">{node.summary}</p>
      {isExpanded && (
        <pre className="mt-2 p-2 bg-gray-50 rounded">
          {node.details}
        </pre>
      )}
    </div>
    {hasChildren && (
      <ChevronDown onClick={toggleExpand} />
    )}
  </div>
);`,
      outcome: 'User-friendly, actually usable interface',
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e13',
      timestamp: '14:45:00',
      type: 'conversation',
      author: 'User',
      title: 'Data Example Request',
      summary: 'Show what data Frizy would actually capture',
      content: 'Use this chat as an example of what data we should expect',
      context: {
        purpose: 'Demonstrate real value',
        insight: 'Show actual Claude session data',
        format: 'Timeline, stats, raw export'
      },
      importance: 5,
      status: 'completed'
    },
    {
      id: 'e14',
      timestamp: '14:46:00',
      type: 'code_write',
      author: 'Claude',
      title: 'Created RealSessionData View',
      summary: 'Visualization of actual 3+ hour conversation',
      content: 'Shows 28 real events with context from our session',
      implementation: {
        file: 'src/pages/RealSessionData.tsx',
        lines: 742,
        data: {
          events: 28,
          duration: '3h 14m',
          tokens: 145000,
          filesCreated: 11,
          linesWritten: 3850
        }
      },
      keyInsights: [
        'Every decision is captured with rationale',
        'Code changes include snippets',
        'Errors and recovery are tracked',
        'User feedback drives iterations'
      ],
      importance: 5,
      status: 'completed'
    }
  ],
  contextSummary: {
    journey: 'From MCP integration question to working dashboard with real data',
    keyLearnings: [
      'Start with data architecture',
      'Scalability matters early',
      'Simple UI beats complex',
      'Real examples clarify value'
    ],
    filesCreated: [
      'MCPIntegrationArchitecture.md',
      'ScalableDataArchitecture.md',
      'MCPStreamHandler.tsx',
      'GitHubEventCapture.ts',
      'TraceInvestigationView.tsx',
      'WaterfallStoryView.tsx',
      'UnifiedDashboard.tsx',
      'ContextFlow.tsx',
      'RealSessionData.tsx',
      'EnhancedSessionData.tsx'
    ],
    outcome: 'Complete context capture system design with working prototypes'
  }
};

export const EnhancedSessionData: React.FC = () => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'story' | 'code' | 'insights'>('story');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

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
      error: 'red',
      success: 'emerald'
    };
    return colors[type] || 'gray';
  };

  const renderStoryView = () => (
    <div className="space-y-4">
      {ENHANCED_SESSION_DATA.events.map(event => {
        const Icon = getEventIcon(event.type);
        const color = getEventColor(event.type);
        const isExpanded = expanded.has(event.id);
        const isSelected = selectedEvent === event.id;

        return (
          <Card 
            key={event.id}
            className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setSelectedEvent(isSelected ? null : event.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{event.timestamp}</span>
                      {event.importance >= 5 && <Zap className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{event.content}</p>

                  {/* Context section */}
                  {event.context && isSelected && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-blue-900">Context</h4>
                      <div className="text-xs text-blue-800">
                        {Object.entries(event.context).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-medium">{key}:</span>{' '}
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Implementation details */}
                  {event.implementation && isSelected && (
                    <div className="mb-3 p-3 bg-green-50 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-green-900">Implementation</h4>
                      <div className="text-xs text-green-800">
                        <pre>{JSON.stringify(event.implementation, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Code snippet */}
                  {(event.codeSnippet || event.codePreview) && isSelected && (
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold mb-2">Code</h4>
                      <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                        {event.codeSnippet || event.codePreview}
                      </pre>
                    </div>
                  )}

                  {/* Impact */}
                  {event.impact && (
                    <div className="flex gap-3 text-xs text-gray-600">
                      {event.impact.files && (
                        <Badge variant="outline">{event.impact.files} files</Badge>
                      )}
                      {event.impact.lines && (
                        <Badge variant="outline">{event.impact.lines} lines</Badge>
                      )}
                      {event.impact.components && (
                        <Badge variant="outline">{event.impact.components.length} components</Badge>
                      )}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-2 mt-3">
                    {event.author === 'User' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                    <span className="text-xs text-gray-500">{event.author}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(event.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderCodeView = () => (
    <div className="space-y-4">
      {ENHANCED_SESSION_DATA.events
        .filter(e => e.type === 'code_write' || e.type === 'code_edit')
        .map(event => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{event.title}</h3>
                <Badge>{event.implementation?.file}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{event.summary}</p>
              {(event.codeSnippet || event.codePreview) && (
                <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                  {event.codeSnippet || event.codePreview}
                </pre>
              )}
              {event.implementation?.keyFeatures && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold mb-2">Key Features</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {event.implementation.keyFeatures.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );

  const renderInsightsView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Session Journey</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{ENHANCED_SESSION_DATA.contextSummary.journey}</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Key Learnings</h4>
              <ul className="space-y-1">
                {ENHANCED_SESSION_DATA.contextSummary.keyLearnings.map((learning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>{learning}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Files Created</h4>
              <div className="space-y-1">
                {ENHANCED_SESSION_DATA.contextSummary.filesCreated.slice(0, 5).map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-blue-500" />
                    <span className="font-mono text-xs">{file}</span>
                  </div>
                ))}
                <span className="text-xs text-gray-500">
                  +{ENHANCED_SESSION_DATA.contextSummary.filesCreated.length - 5} more
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Decision Flow</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ENHANCED_SESSION_DATA.events
              .filter(e => e.type === 'decision')
              .map((event, i, arr) => (
                <div key={event.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <p className="text-xs text-gray-600">{event.summary}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Outcome</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{ENHANCED_SESSION_DATA.contextSummary.outcome}</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Enhanced Session Data</h1>
            <p className="text-sm text-gray-600 mt-1">
              Complete context from our Claude conversation with code & decisions
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{ENHANCED_SESSION_DATA.events.length}</span> events •
              <span className="font-semibold ml-2">10</span> files created •
              <span className="font-semibold ml-2">3,850</span> lines written
            </div>
            
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'story' ? 'default' : 'ghost'}
                onClick={() => setViewMode('story')}
              >
                Story
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'code' ? 'default' : 'ghost'}
                onClick={() => setViewMode('code')}
              >
                Code
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'insights' ? 'default' : 'ghost'}
                onClick={() => setViewMode('insights')}
              >
                Insights
              </Button>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </header>
      
      <div className="p-6 max-w-6xl mx-auto">
        {viewMode === 'story' && renderStoryView()}
        {viewMode === 'code' && renderCodeView()}
        {viewMode === 'insights' && renderInsightsView()}
      </div>
    </div>
  );
};