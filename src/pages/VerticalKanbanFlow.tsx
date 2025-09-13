import React, { useState, useRef, useEffect } from 'react';
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
  Eye,
  Filter,
  Calendar,
  GitBranch,
  Zap,
  Link2,
  Layers,
  Hash,
  Package,
  Users,
  X,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';

// Scalable data model - standardized blocks
interface ContextBlock {
  // Core (always stored) - 100 bytes
  id: string;
  type: 'conversation' | 'decision' | 'code' | 'test' | 'error' | 'search';
  timestamp: string;
  sessionId: string;
  sprint?: string;
  
  // Summary (always stored) - 200 bytes  
  title: string;
  intent?: string;
  impact?: {
    files?: string[];
    metrics?: { lines?: number; tests?: number; functions?: number };
  };
  
  // Context (compressed) - 500 bytes
  keyChange?: string;
  rationale?: string;
  outcome?: string;
  
  // References (linked, not stored) - 50 bytes
  parentId?: string;
  relatedIds?: string[];
  gitSha?: string;
  prNumber?: number;
  
  // UI state (not persisted)
  importance?: number;
  status?: 'active' | 'completed' | 'blocked';
}

// Sample data using scalable model
const SAMPLE_BLOCKS: ContextBlock[] = [
  // Sprint 3 - Authentication
  {
    id: 'b1',
    type: 'conversation',
    timestamp: '10:00 AM',
    sessionId: 'session_1',
    sprint: 'Sprint 3',
    title: 'Fix corporate email login',
    intent: 'Support @company.subdomain.com',
    relatedIds: ['b2', 'b3', 'b5'],
    importance: 5,
    status: 'completed'
  },
  {
    id: 'b2',
    type: 'search',
    timestamp: '10:01 AM',
    sessionId: 'session_1',
    sprint: 'Sprint 3',
    title: 'Found email validation patterns',
    intent: 'Locate validation logic',
    impact: { files: ['validators.ts', 'email.ts'] },
    parentId: 'b1',
    importance: 3,
    status: 'completed'
  },
  {
    id: 'b3',
    type: 'decision',
    timestamp: '10:02 AM',
    sessionId: 'session_1',
    sprint: 'Sprint 3',
    title: 'Regex too restrictive',
    rationale: 'Rejects multi-level domains',
    keyChange: 'Support subdomain.company.com',
    parentId: 'b1',
    relatedIds: ['b4'],
    importance: 5,
    status: 'completed'
  },
  {
    id: 'b4',
    type: 'code',
    timestamp: '10:03 AM',
    sessionId: 'session_1',
    sprint: 'Sprint 3',
    title: 'Updated email regex',
    keyChange: '/^[^@]+@[^@]+\\.[^@]+$/',
    impact: { files: ['validators.ts'], metrics: { lines: 2 } },
    parentId: 'b3',
    relatedIds: ['b5'],
    gitSha: 'abc123',
    importance: 5,
    status: 'completed'
  },
  {
    id: 'b5',
    type: 'test',
    timestamp: '10:04 AM',
    sessionId: 'session_1',
    sprint: 'Sprint 3',
    title: 'All auth tests passing',
    outcome: '47/47 tests pass',
    impact: { metrics: { tests: 47 } },
    parentId: 'b4',
    importance: 4,
    status: 'completed'
  },
  // Sprint 3 - Scalability
  {
    id: 'b6',
    type: 'conversation',
    timestamp: '2:00 PM',
    sessionId: 'session_2',
    sprint: 'Sprint 3',
    title: 'Is this scalable?',
    intent: 'Evaluate storage costs',
    relatedIds: ['b7', 'b8'],
    importance: 5,
    status: 'completed'
  },
  {
    id: 'b7',
    type: 'decision',
    timestamp: '2:05 PM',
    sessionId: 'session_2',
    sprint: 'Sprint 3',
    title: 'Redesign for 99% reduction',
    rationale: 'Current: 50KB/event, New: 200B/event',
    keyChange: 'Tiered storage + compression',
    outcome: '$10k/mo → $100/mo',
    parentId: 'b6',
    relatedIds: ['b8'],
    importance: 5,
    status: 'completed'
  },
  {
    id: 'b8',
    type: 'code',
    timestamp: '2:10 PM',
    sessionId: 'session_2',
    sprint: 'Sprint 3',
    title: 'Implemented tiered storage',
    keyChange: 'Redis→PostgreSQL→S3',
    impact: { files: ['EventStorage.ts'], metrics: { lines: 250 } },
    parentId: 'b7',
    gitSha: 'def456',
    importance: 5,
    status: 'active'
  },
  // Sprint 4 - UI Improvements
  {
    id: 'b9',
    type: 'conversation',
    timestamp: '3:00 PM',
    sessionId: 'session_3',
    sprint: 'Sprint 4',
    title: 'Need vertical kanban view',
    intent: 'Better visualization',
    importance: 4,
    status: 'active'
  },
  {
    id: 'b10',
    type: 'error',
    timestamp: '3:15 PM',
    sessionId: 'session_3',
    sprint: 'Sprint 4',
    title: 'Connection refused',
    keyChange: 'ECONNREFUSED localhost:3000',
    outcome: 'Restarted on port 3000',
    importance: 2,
    status: 'completed'
  }
];

// Group blocks by column type
const COLUMNS = [
  { id: 'conversation', title: 'Conversations', icon: MessageSquare, color: 'purple' },
  { id: 'decision', title: 'Decisions', icon: Brain, color: 'yellow' },
  { id: 'code', title: 'Code Changes', icon: Code, color: 'green' },
  { id: 'search', title: 'Searches', icon: Search, color: 'blue' },
  { id: 'test', title: 'Tests', icon: Terminal, color: 'cyan' },
  { id: 'error', title: 'Errors', icon: AlertCircle, color: 'red' }
];

export const VerticalKanbanFlow: React.FC = () => {
  const [blocks] = useState<ContextBlock[]>(SAMPLE_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState<ContextBlock | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [showRelated, setShowRelated] = useState(true);
  const [detailLevel, setDetailLevel] = useState<'summary' | 'full'>('summary');
  
  // Get unique sprints
  const sprints = Array.from(new Set(blocks.map(b => b.sprint).filter(Boolean)));
  
  // Filter blocks by sprint
  const filteredBlocks = selectedSprint === 'all' 
    ? blocks 
    : blocks.filter(b => b.sprint === selectedSprint);
  
  // Group blocks by type for columns
  const getBlocksByType = (type: string) => {
    return filteredBlocks
      .filter(b => b.type === type)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  };
  
  // Get related blocks
  const getRelatedBlocks = (block: ContextBlock): ContextBlock[] => {
    const related: ContextBlock[] = [];
    
    // Add parent
    if (block.parentId) {
      const parent = blocks.find(b => b.id === block.parentId);
      if (parent) related.push(parent);
    }
    
    // Add related
    if (block.relatedIds) {
      block.relatedIds.forEach(id => {
        const relatedBlock = blocks.find(b => b.id === id);
        if (relatedBlock) related.push(relatedBlock);
      });
    }
    
    // Add children
    blocks.forEach(b => {
      if (b.parentId === block.id || b.relatedIds?.includes(block.id)) {
        related.push(b);
      }
    });
    
    return related;
  };
  
  // Render standardized block
  const renderBlock = (block: ContextBlock) => {
    const isSelected = selectedBlock?.id === block.id;
    const isRelated = selectedBlock && getRelatedBlocks(selectedBlock).some(b => b.id === block.id);
    
    return (
      <Card
        key={block.id}
        className={`
          cursor-pointer transition-all duration-200 mb-2
          ${isSelected ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}
          ${isRelated && showRelated ? 'ring-1 ring-blue-300' : ''}
          ${block.status === 'active' ? 'border-green-500' : ''}
          ${block.status === 'blocked' ? 'opacity-50' : ''}
        `}
        onClick={() => setSelectedBlock(block)}
      >
        <CardContent className="p-3">
          {/* Header with timestamp and status */}
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-gray-500">{block.timestamp}</span>
            {block.status === 'active' && (
              <PlayCircle className="h-3 w-3 text-green-500 animate-pulse" />
            )}
            {block.importance && block.importance >= 5 && (
              <Zap className="h-3 w-3 text-red-500" />
            )}
          </div>
          
          {/* Title */}
          <h4 className="font-medium text-sm mb-1 line-clamp-2">{block.title}</h4>
          
          {/* Intent/Summary (scalable data) */}
          {block.intent && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-1">{block.intent}</p>
          )}
          
          {/* Minimal impact metrics */}
          {block.impact && (
            <div className="flex gap-2 flex-wrap">
              {block.impact.files && (
                <Badge variant="outline" className="text-xs py-0">
                  {block.impact.files.length} files
                </Badge>
              )}
              {block.impact.metrics?.lines && (
                <Badge variant="outline" className="text-xs py-0">
                  {block.impact.metrics.lines} lines
                </Badge>
              )}
              {block.impact.metrics?.tests && (
                <Badge variant="outline" className="text-xs py-0">
                  {block.impact.metrics.tests} tests
                </Badge>
              )}
            </div>
          )}
          
          {/* Sprint tag */}
          {block.sprint && (
            <Badge className="text-xs mt-2" variant="secondary">
              {block.sprint}
            </Badge>
          )}
          
          {/* Relationship indicators */}
          {(block.parentId || block.relatedIds) && (
            <div className="flex items-center gap-1 mt-2">
              <Link2 className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {(block.relatedIds?.length || 0) + (block.parentId ? 1 : 0)} connected
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  // Render detail panel
  const renderDetailPanel = () => {
    if (!selectedBlock) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Eye className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Select a block to see details</p>
          </div>
        </div>
      );
    }
    
    const related = getRelatedBlocks(selectedBlock);
    
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 bg-white sticky top-0 border-b">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg">{selectedBlock.title}</h3>
            <button
              onClick={() => setSelectedBlock(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{selectedBlock.timestamp}</span>
            {selectedBlock.sprint && (
              <>
                <span>•</span>
                <span>{selectedBlock.sprint}</span>
              </>
            )}
            {selectedBlock.sessionId && (
              <>
                <span>•</span>
                <span>{selectedBlock.sessionId}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Core Data (Always Stored) */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Core Data (100 bytes)
            </h4>
            <div className="bg-gray-50 rounded p-3 text-xs font-mono">
              <div>id: {selectedBlock.id}</div>
              <div>type: {selectedBlock.type}</div>
              <div>timestamp: {selectedBlock.timestamp}</div>
              <div>sessionId: {selectedBlock.sessionId}</div>
            </div>
          </div>
          
          {/* Summary Data */}
          {(selectedBlock.intent || selectedBlock.impact) && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Summary (200 bytes)</h4>
              <div className="space-y-2">
                {selectedBlock.intent && (
                  <div className="bg-blue-50 rounded p-2">
                    <span className="text-xs font-medium text-blue-900">Intent:</span>
                    <p className="text-sm text-blue-700">{selectedBlock.intent}</p>
                  </div>
                )}
                {selectedBlock.impact && (
                  <div className="bg-green-50 rounded p-2">
                    <span className="text-xs font-medium text-green-900">Impact:</span>
                    <div className="text-sm text-green-700">
                      {selectedBlock.impact.files && (
                        <div>Files: {selectedBlock.impact.files.join(', ')}</div>
                      )}
                      {selectedBlock.impact.metrics && (
                        <div>Metrics: {JSON.stringify(selectedBlock.impact.metrics)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Context (Compressed) */}
          {(selectedBlock.keyChange || selectedBlock.rationale || selectedBlock.outcome) && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Context (500 bytes)</h4>
              <div className="space-y-2">
                {selectedBlock.keyChange && (
                  <div className="bg-yellow-50 rounded p-2">
                    <span className="text-xs font-medium text-yellow-900">Key Change:</span>
                    <pre className="text-xs text-yellow-700 mt-1">{selectedBlock.keyChange}</pre>
                  </div>
                )}
                {selectedBlock.rationale && (
                  <div className="bg-purple-50 rounded p-2">
                    <span className="text-xs font-medium text-purple-900">Rationale:</span>
                    <p className="text-sm text-purple-700">{selectedBlock.rationale}</p>
                  </div>
                )}
                {selectedBlock.outcome && (
                  <div className="bg-emerald-50 rounded p-2">
                    <span className="text-xs font-medium text-emerald-900">Outcome:</span>
                    <p className="text-sm text-emerald-700">{selectedBlock.outcome}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* References (Not Stored, Linked) */}
          {(selectedBlock.gitSha || selectedBlock.prNumber) && (
            <div>
              <h4 className="text-sm font-semibold mb-2">References (50 bytes)</h4>
              <div className="flex gap-2">
                {selectedBlock.gitSha && (
                  <Badge variant="outline" className="text-xs">
                    <GitBranch className="h-3 w-3 mr-1" />
                    {selectedBlock.gitSha}
                  </Badge>
                )}
                {selectedBlock.prNumber && (
                  <Badge variant="outline" className="text-xs">
                    PR #{selectedBlock.prNumber}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Related Blocks */}
          {related.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Related Blocks ({related.length})
              </h4>
              <div className="space-y-2">
                {related.map(block => (
                  <div
                    key={block.id}
                    className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedBlock(block)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{block.title}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {block.type}
                      </Badge>
                      <span className="text-xs text-gray-500">{block.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Storage Size */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Total Size (Optimized)</span>
              <span className="font-mono">~850 bytes</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>If stored traditionally</span>
              <span className="font-mono">~15KB</span>
            </div>
            <div className="mt-2">
              <Badge className="bg-green-100 text-green-700 text-xs">
                94% storage reduction
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Vertical Kanban Flow</h1>
            <Badge variant="secondary">Scalable Data Model</Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sprint Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All Sprints</option>
                {sprints.map(sprint => (
                  <option key={sprint} value={sprint}>{sprint}</option>
                ))}
              </select>
            </div>
            
            {/* Show Related Toggle */}
            <Button
              size="sm"
              variant={showRelated ? 'default' : 'outline'}
              onClick={() => setShowRelated(!showRelated)}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Related
            </Button>
            
            {/* Detail Level */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetailLevel(detailLevel === 'summary' ? 'full' : 'summary')}
            >
              {detailLevel === 'summary' ? 'Summary' : 'Full'}
            </Button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
          <span>{filteredBlocks.length} blocks</span>
          <span>•</span>
          <span>{blocks.filter(b => b.status === 'active').length} active</span>
          <span>•</span>
          <span>{blocks.filter(b => b.status === 'completed').length} completed</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            ~{(filteredBlocks.length * 850 / 1000).toFixed(1)}KB total
          </span>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Columns */}
        <div className="flex-1 flex overflow-x-auto p-4 gap-4">
          {COLUMNS.map(column => {
            const columnBlocks = getBlocksByType(column.id);
            const Icon = column.icon;
            
            return (
              <div key={column.id} className="flex-shrink-0 w-72">
                <div className="bg-white rounded-lg h-full flex flex-col">
                  {/* Column Header */}
                  <div className={`p-3 border-b bg-${column.color}-50`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 text-${column.color}-600`} />
                        <h3 className="font-semibold text-sm">{column.title}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {columnBlocks.length}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Column Content */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {columnBlocks.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No {column.title.toLowerCase()}
                      </div>
                    ) : (
                      columnBlocks.map(block => renderBlock(block))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Detail Panel */}
        <div className="w-96 border-l bg-white overflow-hidden">
          {renderDetailPanel()}
        </div>
      </div>
    </div>
  );
};