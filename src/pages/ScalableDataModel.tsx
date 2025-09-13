import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain,
  Code,
  MessageSquare,
  Database,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
  FileText,
  GitCommit,
  ArrowRight,
  Minimize2,
  Maximize2,
  DollarSign,
  TrendingDown,
  Package,
  Clock,
  Hash
} from 'lucide-react';

// This shows the ACTUAL scalable data we would store
const SCALABLE_DATA_EXAMPLES = {
  // Example 1: User conversation about bug
  conversation: {
    full: {
      id: 'e1_full',
      type: 'conversation',
      timestamp: '2024-01-15T14:00:00Z',
      userId: 'user_123',
      sessionId: 'session_abc',
      messageId: 'msg_456',
      author: 'User',
      fullMessage: 'When integrating with Claude Code via an MCP and GitHub, what data can we expect to be streaming in and what data do we want to have come in? How will this work from an architecture standpoint? Can you build that somewhere?',
      claudeResponse: '(2000+ tokens of response about MCP architecture...)',
      tokensUsed: 2487,
      responseTime: 3.2,
      model: 'claude-opus-4-1',
      temperature: 0.7,
      maxTokens: 4000,
      stopSequences: [],
      metadata: {
        browser: 'Chrome 120',
        os: 'Windows 11',
        timezone: 'EST',
        language: 'en-US'
      },
      sizeBytes: 8500
    },
    optimized: {
      id: 'e1_opt',
      type: 'conversation',
      timestamp: '2024-01-15T14:00:00Z',
      sessionId: 'session_abc',
      parentId: null,
      
      // Core summary (not full text)
      title: 'MCP Integration Question',
      intent: 'Understand data architecture',
      
      // Key context only
      context: {
        topic: 'MCP + GitHub integration',
        decision: 'Event-driven with WebSocket'
      },
      
      // Metrics only (not full content)
      impact: {
        tokensUsed: 2487,
        responseTime: 3.2
      },
      
      // Reference to full conversation if needed
      references: {
        messageId: 'msg_456',  // Can retrieve from Claude if needed
        gitSha: null
      },
      
      sizeBytes: 245  // 97% smaller!
    }
  },

  // Example 2: Code change event
  codeChange: {
    full: {
      id: 'e2_full',
      type: 'code_write',
      timestamp: '2024-01-15T14:01:00Z',
      file: 'src/components/mcp/MCPStreamHandler.tsx',
      fullOldContent: '// ... 500 lines of original file ...',
      fullNewContent: `import React, { useState, useEffect, useRef } from 'react';
import { MCPEvent, MCPStreamEvent } from '@/types/mcp';
// ... entire 680 line file with all the component code ...
export const MCPStreamHandler: React.FC<MCPStreamHandlerProps> = ({ 
  onEventReceived, 
  connectionUrl = 'ws://localhost:3001/mcp',
  reconnectInterval = 5000,
  maxReconnectAttempts = 10,
  batchSize = 50,
  flushInterval = 1000
}) => {
  // ... 200+ lines of implementation ...
}`,
      diff: '// ... 300 lines of diff ...',
      ast: '// ... Abstract syntax tree ...',
      sizeBytes: 45000
    },
    optimized: {
      id: 'e2_opt',
      type: 'code_write',
      timestamp: '2024-01-15T14:01:00Z',
      sessionId: 'session_abc',
      parentId: 'e1_opt',
      
      // Summary of change
      title: 'Created MCPStreamHandler',
      intent: 'Handle real-time MCP events',
      
      // Just the key change (not full file)
      keyChange: `
+export const MCPStreamHandler: React.FC = () => {
+  const ws = useRef<WebSocket>(null);
+  
+  useEffect(() => {
+    ws.current = new WebSocket('ws://localhost:3001/mcp');
+    ws.current.onmessage = (event) => {
+      const enriched = enrichMCPEvent(JSON.parse(event.data));
+      setEvents(prev => [...prev, enriched]);
+    };
+  }, []);
+}`,
      
      // Impact metrics only
      impact: {
        files: ['src/components/mcp/MCPStreamHandler.tsx'],
        metrics: { lines: 180, functions: 5, components: 1 }
      },
      
      // Git reference for full content
      references: {
        gitSha: 'abc123def',  // Full code in git
        prNumber: null
      },
      
      sizeBytes: 420  // 99% smaller!
    }
  },

  // Example 3: Decision event
  decision: {
    full: {
      id: 'e3_full',
      type: 'decision',
      timestamp: '2024-01-15T14:05:30Z',
      fullAnalysis: `After analyzing the current architecture, I can see several issues:
      1. Storage inefficiency: Each event is 10-50KB, which means for 100k users generating 100 events per day, we're looking at 10M events × 50KB = 500GB per day
      2. Query performance: Searching through nested JSON structures in PostgreSQL is O(n) at best
      3. Cost implications: At AWS RDS pricing, this would cost approximately $10,000/month just for storage
      
      I recommend redesigning the architecture with the following approach:
      - Tiered storage: Hot (Redis) → Warm (PostgreSQL) → Cold (S3)
      - Compression: Use zstd compression for 90% reduction
      - Aggregation: Store patterns, not individual events
      - Materialized views: Pre-compute common queries
      
      This should reduce costs by 99% while improving performance...`,
      alternatives: [
        'Option 1: Keep current approach but add caching',
        'Option 2: Move to NoSQL like DynamoDB',
        'Option 3: Use time-series database like TimescaleDB'
      ],
      evaluation: '// ... detailed evaluation matrix ...',
      sizeBytes: 5500
    },
    optimized: {
      id: 'e3_opt',
      type: 'decision',
      timestamp: '2024-01-15T14:05:30Z',
      sessionId: 'session_abc',
      parentId: 'e1_opt',
      
      // Core decision only
      title: 'Scalability Redesign',
      intent: 'Reduce storage 95%, costs 99%',
      
      // Key insight
      rationale: 'Current: 50KB/event. New: 200B/event via compression + tiering',
      
      // Chosen approach (not all alternatives)
      approach: {
        solution: 'Tiered storage + compression',
        keyChange: 'Redis(24h) → PG(30d) → S3(archive)',
        impact: '$10k/mo → $100/mo'
      },
      
      // No full analysis stored
      references: {
        documentId: 'doc_789',  // Full analysis in separate doc if needed
        gitSha: 'def456ghi'
      },
      
      sizeBytes: 310  // 94% smaller!
    }
  },

  // Example 4: Error event
  error: {
    full: {
      id: 'e4_full',
      type: 'error',
      timestamp: '2024-01-15T14:11:00Z',
      error: {
        message: "This site can't be reached - localhost refused to connect",
        stack: `Error: connect ECONNREFUSED 127.0.0.1:3000
          at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
          at Protocol._enqueue (/node_modules/mysql/lib/protocol/Protocol.js:144:48)
          at Protocol.handshake (/node_modules/mysql/lib/protocol/Protocol.js:51:23)
          ... 50 more lines of stack trace ...`,
        systemInfo: {
          platform: 'win32',
          arch: 'x64',
          nodeVersion: '18.17.0',
          memory: { rss: 85434368, heapTotal: 56434688, heapUsed: 33568584 }
        },
        attempts: [
          { port: 5173, result: 'in use' },
          { port: 5174, result: 'in use' },
          { port: 5175, result: 'in use' }
        ]
      },
      sizeBytes: 3200
    },
    optimized: {
      id: 'e4_opt',
      type: 'error',
      timestamp: '2024-01-15T14:11:00Z',
      sessionId: 'session_abc',
      parentId: 'e2_opt',
      
      // Error summary only
      title: 'Connection refused',
      intent: 'Start dev server',
      
      // Just the key error (not full stack)
      error: 'ECONNREFUSED 127.0.0.1:3000',
      
      // Resolution (what fixed it)
      resolution: 'Restarted on port 3000 with --host 0.0.0.0',
      
      // No system info or attempts stored
      impact: {
        downtime: 30,  // seconds
        retriesNeeded: 3
      },
      
      sizeBytes: 180  // 94% smaller!
    }
  },

  // Aggregated session data
  sessionAggregation: {
    full: {
      events: '// ... 100 individual events ...',
      totalSize: 450000  // 450KB for full session
    },
    optimized: {
      sessionId: 'session_abc',
      period: '2024-01-15T14:00:00Z/PT3H',
      
      // Aggregated patterns (not individual events)
      patterns: {
        conversations: { count: 9, topics: ['MCP', 'scalability', 'UI'] },
        decisions: { count: 5, themes: ['architecture', 'performance'] },
        codeChanges: { 
          count: 11, 
          files: ['MCPStreamHandler.tsx', 'GitHubEventCapture.ts'],
          totalLines: 3850
        },
        errors: { count: 1, types: ['connection'] }
      },
      
      // Key outcomes only
      outcomes: {
        filesCreated: 11,
        decisionsMode: 5,
        keyPivots: ['MCP Design', 'Scalability', 'Clean UI'],
        result: 'Working dashboard with context capture'
      },
      
      // Embedding for semantic search
      embedding: new Array(384).fill(0).map(() => Math.random()),
      
      // Links to detailed data if needed
      references: {
        fullSessionLog: 's3://archive/session_abc.parquet',
        gitCommits: ['abc123', 'def456'],
        prNumber: 234
      },
      
      totalSize: 5200  // 5KB for entire session (99% reduction!)
    }
  }
};

// Cost calculations
const COST_COMPARISON = {
  traditional: {
    perEvent: 0.001,  // $0.001 per event stored
    perUser: 0.10,    // $0.10 per user per month
    at100kUsers: 10000  // $10,000/month
  },
  optimized: {
    perEvent: 0.00001,  // $0.00001 per event
    perUser: 0.001,     // $0.001 per user per month
    at100kUsers: 100    // $100/month
  }
};

export const ScalableDataModel: React.FC = () => {
  const [viewMode, setViewMode] = useState<'comparison' | 'examples' | 'architecture'>('comparison');
  const [showFull, setShowFull] = useState(false);

  const renderComparison = () => (
    <div className="space-y-6">
      {/* Size Comparison */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Size Comparison
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(SCALABLE_DATA_EXAMPLES).filter(([key]) => key !== 'sessionAggregation').map(([key, data]) => {
              const reduction = Math.round((1 - data.optimized.sizeBytes / data.full.sizeBytes) * 100);
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Full</div>
                      <div className="font-mono text-sm text-red-600">
                        {(data.full.sizeBytes / 1000).toFixed(1)}KB
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Optimized</div>
                      <div className="font-mono text-sm text-green-600">
                        {data.optimized.sizeBytes}B
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {reduction}%
                    </Badge>
                  </div>
                </div>
              );
            })}
            
            {/* Session Total */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-purple-600" />
                <div className="font-semibold">Full Session (100 events)</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-gray-500">Traditional</div>
                  <div className="font-mono text-sm text-red-600">450KB</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-right">
                  <div className="text-xs text-gray-500">Optimized</div>
                  <div className="font-mono text-sm text-green-600">5KB</div>
                </div>
                <Badge className="bg-green-500 text-white">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  99%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost at Scale (100k users)
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-3">Traditional Storage</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Per Event</span>
                  <span className="font-mono">${COST_COMPARISON.traditional.perEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per User/Month</span>
                  <span className="font-mono">${COST_COMPARISON.traditional.perUser}</span>
                </div>
                <div className="pt-2 border-t border-red-200">
                  <div className="flex justify-between font-semibold">
                    <span>Monthly Total</span>
                    <span className="font-mono text-red-600">
                      ${COST_COMPARISON.traditional.at100kUsers.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3">Optimized Storage</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Per Event</span>
                  <span className="font-mono">${COST_COMPARISON.optimized.perEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per User/Month</span>
                  <span className="font-mono">${COST_COMPARISON.optimized.perUser}</span>
                </div>
                <div className="pt-2 border-t border-green-200">
                  <div className="flex justify-between font-semibold">
                    <span>Monthly Total</span>
                    <span className="font-mono text-green-600">
                      ${COST_COMPARISON.optimized.at100kUsers}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
            <span className="text-2xl font-bold text-blue-900">99% Cost Reduction</span>
            <p className="text-sm text-blue-700 mt-1">
              Saving ${(COST_COMPARISON.traditional.at100kUsers - COST_COMPARISON.optimized.at100kUsers).toLocaleString()}/month
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExamples = () => (
    <div className="space-y-6">
      {Object.entries(SCALABLE_DATA_EXAMPLES).filter(([key]) => key !== 'sessionAggregation').map(([key, example]) => (
        <Card key={key}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold capitalize">
                {key.replace(/([A-Z])/g, ' $1')} Event
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {showFull ? example.full.sizeBytes + ' bytes' : example.optimized.sizeBytes + ' bytes'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFull(!showFull)}
                >
                  {showFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {showFull ? 'Optimized' : 'Full'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(showFull ? example.full : example.optimized, null, 2)}
            </pre>
            
            {!showFull && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">What We Keep:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>✓ Core event identity (id, type, timestamp)</li>
                  <li>✓ Semantic summary (title, intent)</li>
                  <li>✓ Key changes only (not full content)</li>
                  <li>✓ Impact metrics (files, lines, tokens)</li>
                  <li>✓ References to full data (git SHA, message ID)</li>
                </ul>
                
                <h4 className="text-sm font-semibold text-blue-900 mt-3 mb-2">What We Don't Store:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>✗ Full file contents (use git)</li>
                  <li>✗ Complete messages (use message ID)</li>
                  <li>✗ System metadata (browser, OS)</li>
                  <li>✗ Redundant information</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderArchitecture = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Tiered Storage Architecture</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Hot Tier */}
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-600" />
                  Hot Tier (Redis)
                </h4>
                <Badge className="bg-red-100">Last 24 hours</Badge>
              </div>
              <div className="text-sm text-gray-700">
                <p className="mb-2">Immediate access for active sessions</p>
                <div className="font-mono text-xs bg-white p-2 rounded">
                  {`await redis.setex(eventId, 86400, compressed);`}
                </div>
              </div>
            </div>

            {/* Warm Tier */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-yellow-600" />
                  Warm Tier (PostgreSQL)
                </h4>
                <Badge className="bg-yellow-100">1-30 days</Badge>
              </div>
              <div className="text-sm text-gray-700">
                <p className="mb-2">Indexed for searching and analytics</p>
                <div className="font-mono text-xs bg-white p-2 rounded">
                  {`INSERT INTO events (id, summary, embedding) VALUES ($1, $2, $3);`}
                </div>
              </div>
            </div>

            {/* Cold Tier */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  Cold Tier (S3 Parquet)
                </h4>
                <Badge className="bg-blue-100">30+ days</Badge>
              </div>
              <div className="text-sm text-gray-700">
                <p className="mb-2">Compressed archives for compliance/history</p>
                <div className="font-mono text-xs bg-white p-2 rounded">
                  {`await s3.upload('archive', parquet.encode(aggregated));`}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Aggregation Strategy</h3>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-100 rounded-lg">
            <pre className="text-xs">
{`// Instead of 100 individual events:
[
  { type: 'search', query: 'auth', timestamp: '14:00:01' },
  { type: 'search', query: 'validation', timestamp: '14:00:05' },
  { type: 'search', query: 'regex', timestamp: '14:00:08' },
  // ... 97 more events
]

// We store patterns:
{
  period: '2024-01-15T14:00-15:00',
  patterns: {
    searches: { 
      count: 100, 
      topics: ['auth', 'validation', 'regex'],
      frequency: { auth: 45, validation: 30, regex: 25 }
    },
    decisions: {
      count: 5,
      themes: ['scalability', 'performance', 'UX'],
      outcomes: ['redesign', 'optimization']
    }
  },
  embedding: [...],  // For semantic search
  references: {
    detailsUrl: 's3://archive/session_abc.parquet'
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scalable Data Model</h1>
            <p className="text-sm text-gray-600 mt-1">
              How we achieve 99% storage reduction while keeping full context
            </p>
          </div>
          
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'comparison' ? 'default' : 'ghost'}
              onClick={() => setViewMode('comparison')}
            >
              Comparison
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'examples' ? 'default' : 'ghost'}
              onClick={() => setViewMode('examples')}
            >
              Examples
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'architecture' ? 'default' : 'ghost'}
              onClick={() => setViewMode('architecture')}
            >
              Architecture
            </Button>
          </div>
        </div>
      </header>
      
      <div className="p-6 max-w-6xl mx-auto">
        {viewMode === 'comparison' && renderComparison()}
        {viewMode === 'examples' && renderExamples()}
        {viewMode === 'architecture' && renderArchitecture()}
      </div>
    </div>
  );
};