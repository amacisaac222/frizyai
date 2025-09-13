import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  MessageSquare, 
  Code, 
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Brain,
  Search,
  Edit3,
  Terminal,
  FileText,
  GitCommit,
  ArrowDown,
  Sparkles,
  ChevronRight,
  Eye,
  Target,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

interface StoryBlock {
  id: string;
  type: 'conversation' | 'decision' | 'code_read' | 'code_write' | 'search' | 'test' | 'error' | 'success' | 'thinking';
  timestamp: string;
  duration?: number; // milliseconds
  title: string;
  content: string;
  details?: any;
  importance: 'critical' | 'high' | 'normal' | 'low';
  connections: {
    from?: string[]; // IDs this block was influenced by
    to?: string[]; // IDs this block influences
    reason?: string; // Why they're connected
  };
  status: 'completed' | 'current' | 'upcoming' | 'blocked';
  impact?: {
    files?: number;
    lines?: number;
    tests?: number;
  };
}

export const WaterfallStoryView: React.FC = () => {
  const [blocks, setBlocks] = useState<StoryBlock[]>([
    {
      id: 'b1',
      type: 'conversation',
      timestamp: '10:00:00',
      title: 'User requested authentication fix',
      content: 'Login failing for corporate email domains like @company.subdomain.com',
      importance: 'critical',
      connections: { to: ['b2', 'b3'] },
      status: 'completed'
    },
    {
      id: 'b2',
      type: 'thinking',
      timestamp: '10:00:05',
      duration: 3000,
      title: 'Analyzing the problem',
      content: 'Corporate emails have multiple subdomains. Need to check email validation logic.',
      importance: 'high',
      connections: { from: ['b1'], to: ['b3', 'b4'] },
      status: 'completed'
    },
    {
      id: 'b3',
      type: 'search',
      timestamp: '10:00:08',
      title: 'Searched for email validation',
      content: 'Found 3 files with email regex patterns',
      details: { pattern: 'email.*validation|regex.*@', matches: 3 },
      importance: 'normal',
      connections: { from: ['b1', 'b2'], to: ['b4'] },
      status: 'completed'
    },
    {
      id: 'b4',
      type: 'code_read',
      timestamp: '10:00:15',
      title: 'Examined auth/validators.ts',
      content: 'Found restrictive regex: /^[^@]+@[^.]+\\.[^.]+$/',
      details: { file: 'auth/validators.ts', lines: [45, 67] },
      importance: 'critical',
      connections: { from: ['b2', 'b3'], to: ['b5', 'b6'] },
      status: 'completed',
      impact: { files: 1, lines: 22 }
    },
    {
      id: 'b5',
      type: 'decision',
      timestamp: '10:00:30',
      title: 'Root cause identified',
      content: 'Regex rejects subdomains. Need to allow multiple domain levels.',
      importance: 'critical',
      connections: { from: ['b4'], to: ['b6'] },
      status: 'completed'
    },
    {
      id: 'b6',
      type: 'code_write',
      timestamp: '10:00:45',
      duration: 15000,
      title: 'Fixed email validation regex',
      content: 'Updated to support multiple subdomain levels',
      details: { 
        old: '/^[^@]+@[^.]+\\.[^.]+$/',
        new: '/^[^@]+@[^@]+\\.[^@]+$/'
      },
      importance: 'critical',
      connections: { from: ['b4', 'b5'], to: ['b7'] },
      status: 'completed',
      impact: { files: 1, lines: 2 }
    },
    {
      id: 'b7',
      type: 'test',
      timestamp: '10:01:00',
      duration: 8000,
      title: 'Running authentication tests',
      content: 'Testing email validation with various formats...',
      importance: 'high',
      connections: { from: ['b6'], to: ['b8'] },
      status: 'current', // CURRENTLY WORKING ON THIS
      impact: { tests: 47 }
    },
    {
      id: 'b8',
      type: 'success',
      timestamp: '10:01:08',
      title: 'All tests passing',
      content: '47/47 tests passed including new subdomain cases',
      importance: 'high',
      connections: { from: ['b7'] },
      status: 'upcoming'
    }
  ]);

  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current block
  useEffect(() => {
    const currentBlock = document.querySelector('[data-status="current"]');
    if (currentBlock) {
      currentBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const getBlockIcon = (type: StoryBlock['type']) => {
    const icons = {
      conversation: MessageSquare,
      decision: Brain,
      code_read: Eye,
      code_write: Edit3,
      search: Search,
      test: Terminal,
      error: AlertCircle,
      success: CheckCircle,
      thinking: Brain
    };
    return icons[type] || FileText;
  };

  const getBlockColor = (type: StoryBlock['type'], importance: StoryBlock['importance']) => {
    // Base colors by type
    const typeColors = {
      conversation: 'from-purple-500 to-purple-600',
      decision: 'from-yellow-500 to-amber-600',
      code_read: 'from-blue-500 to-blue-600',
      code_write: 'from-green-500 to-emerald-600',
      search: 'from-indigo-500 to-indigo-600',
      test: 'from-cyan-500 to-cyan-600',
      error: 'from-red-500 to-red-600',
      success: 'from-emerald-500 to-green-600',
      thinking: 'from-gray-500 to-gray-600'
    };

    // Intensity based on importance
    if (importance === 'critical') {
      return `bg-gradient-to-r ${typeColors[type]} shadow-lg`;
    }
    return `bg-gradient-to-r ${typeColors[type]} opacity-90`;
  };

  const renderConnectionLine = (block: StoryBlock, index: number) => {
    if (index === 0) return null;
    
    const isConnected = hoveredBlock && 
      (block.connections.from?.includes(hoveredBlock) || 
       blocks.find(b => b.id === hoveredBlock)?.connections.to?.includes(block.id));

    return (
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8">
        <div 
          className={`h-full transition-all duration-300 ${
            isConnected 
              ? 'bg-gradient-to-b from-purple-500 to-purple-600 w-1' 
              : 'bg-gradient-to-b from-gray-300 to-gray-400'
          }`}
        />
        {/* Flow animation for current connections */}
        {isConnected && (
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="animate-pulse bg-white/50 w-full h-2 rounded-full" 
                 style={{ animation: 'flow 2s linear infinite' }} />
          </div>
        )}
      </div>
    );
  };

  const renderBlock = (block: StoryBlock, index: number) => {
    const Icon = getBlockIcon(block.type);
    const isSelected = selectedBlock === block.id;
    const isHovered = hoveredBlock === block.id;
    const isConnected = hoveredBlock && (
      block.connections.from?.includes(hoveredBlock) || 
      block.connections.to?.includes(hoveredBlock)
    );

    return (
      <div
        key={block.id}
        data-status={block.status}
        className={`relative transition-all duration-300 ${
          isHovered || isConnected ? 'scale-105 z-10' : ''
        }`}
        onMouseEnter={() => setHoveredBlock(block.id)}
        onMouseLeave={() => setHoveredBlock(null)}
        onClick={() => setSelectedBlock(isSelected ? null : block.id)}
      >
        {/* Connection line from previous block */}
        {renderConnectionLine(block, index)}

        {/* Status indicator for current/last */}
        {block.status === 'current' && (
          <div className="absolute -left-20 top-1/2 transform -translate-y-1/2">
            <div className="flex items-center gap-2 text-green-600 font-semibold animate-pulse">
              <PlayCircle className="h-5 w-5" />
              <span className="text-sm whitespace-nowrap">NOW</span>
            </div>
          </div>
        )}
        {index > 0 && blocks[index - 1].status === 'completed' && block.status === 'current' && (
          <div className="absolute -left-20 top-0 transform -translate-y-full">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="whitespace-nowrap">LAST</span>
            </div>
          </div>
        )}

        {/* Main block card */}
        <Card 
          className={`cursor-pointer transition-all duration-300 ${
            isSelected ? 'ring-2 ring-purple-500' : ''
          } ${
            block.status === 'current' ? 'ring-2 ring-green-500 animate-pulse' : ''
          } ${
            block.status === 'blocked' ? 'opacity-50' : ''
          } ${
            block.status === 'upcoming' ? 'opacity-40' : ''
          }`}
        >
          <div className={`h-1 ${getBlockColor(block.type, block.importance)}`} />
          
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon with gradient background */}
              <div className={`p-2 rounded-lg ${getBlockColor(block.type, block.importance)} text-white`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{block.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{block.timestamp}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {block.duration && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {(block.duration / 1000).toFixed(1)}s
                      </Badge>
                    )}
                    {block.importance === 'critical' && (
                      <Badge variant="destructive" className="text-xs">
                        <Zap className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-2">{block.content}</p>

                {/* Impact indicators */}
                {block.impact && (
                  <div className="flex gap-3 text-xs text-gray-500">
                    {block.impact.files && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {block.impact.files} files
                      </span>
                    )}
                    {block.impact.lines && (
                      <span className="flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        {block.impact.lines} lines
                      </span>
                    )}
                    {block.impact.tests && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {block.impact.tests} tests
                      </span>
                    )}
                  </div>
                )}

                {/* Details preview (when selected) */}
                {isSelected && block.details && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                    <pre>{JSON.stringify(block.details, null, 2)}</pre>
                  </div>
                )}

                {/* Connection indicators */}
                <div className="flex items-center gap-4 mt-3">
                  {block.connections.from && block.connections.from.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ArrowDown className="h-3 w-3 rotate-180" />
                      <span>From {block.connections.from.length}</span>
                    </div>
                  )}
                  {block.connections.to && block.connections.to.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <ArrowDown className="h-3 w-3" />
                      <span>To {block.connections.to.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side connections for related blocks */}
        {isHovered && block.connections.to && block.connections.to.length > 0 && (
          <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2">
            <div className="bg-white border border-purple-200 rounded-lg p-2 shadow-lg">
              <p className="text-xs font-semibold text-purple-600 mb-1">Leads to:</p>
              {block.connections.to.map(id => {
                const targetBlock = blocks.find(b => b.id === id);
                return targetBlock ? (
                  <div key={id} className="text-xs text-gray-600">
                    <ChevronRight className="h-3 w-3 inline" />
                    {targetBlock.title}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Header with key info */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Development Story
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Your investigation flow with all connections
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span>Active: {blocks.filter(b => b.status === 'current').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                <span>Completed: {blocks.filter(b => b.status === 'completed').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>Critical: {blocks.filter(b => b.importance === 'critical').length}</span>
              </div>
            </div>

            <Button variant="outline" size="sm">
              <Target className="h-4 w-4 mr-1" />
              Jump to Current
            </Button>
          </div>
        </div>
      </div>

      {/* Main waterfall view */}
      <div className="flex-1 overflow-y-auto p-8" ref={containerRef}>
        <div className="max-w-3xl mx-auto space-y-8">
          {blocks.map((block, index) => renderBlock(block, index))}
          
          {/* Future/upcoming indicator */}
          <div className="relative opacity-40">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-transparent" />
            <Card className="border-dashed">
              <CardContent className="p-4 text-center text-gray-500">
                <p className="text-sm">Next steps will appear here...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating importance legend */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-3">
        <p className="text-xs font-semibold mb-2">Importance</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-red-500" />
            <span>Critical path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded" />
            <span>Supporting work</span>
          </div>
        </div>
      </div>
    </div>
  );
};