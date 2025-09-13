import React, { useState, useEffect } from 'react';
import { Shield, Database, Globe, AlertTriangle, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';

interface RoadmapItem {
  id: string;
  category: 'security' | 'data' | 'website' | 'performance' | 'feature';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  detectedFrom: string[]; // Session IDs where this was detected
  estimatedEffort: 'small' | 'medium' | 'large';
  impact: string;
  status: 'detected' | 'planned' | 'in_progress' | 'completed';
  visionAlignment: number; // 0-100 score of how well it aligns with product vision
}

interface RoadmapViewProps {
  sessions: any[];
  onItemClick?: (item: RoadmapItem) => void;
}

export function RoadmapView({ sessions, onItemClick }: RoadmapViewProps) {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'security' | 'data' | 'website' | 'performance' | 'feature'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'vision' | 'effort'>('priority');

  useEffect(() => {
    analyzeSessionsForRoadmap();
  }, [sessions]);

  const analyzeSessionsForRoadmap = () => {
    const items: RoadmapItem[] = [];
    
    // Analyze sessions for patterns and issues
    sessions.forEach(session => {
      // Check for security issues
      session.blocks?.forEach(block => {
        block.traces?.forEach(trace => {
          trace.events?.forEach(event => {
            // Look for error patterns
            if (event.type === 'error') {
              const errorData = JSON.stringify(event.data).toLowerCase();
              
              // Security checks
              if (errorData.includes('auth') || errorData.includes('permission') || errorData.includes('cors')) {
                const existingItem = items.find(i => i.title === 'Authentication & Authorization Improvements');
                if (!existingItem) {
                  items.push({
                    id: 'sec-001',
                    category: 'security',
                    priority: 'high',
                    title: 'Authentication & Authorization Improvements',
                    description: 'Multiple authentication errors detected. Need to strengthen auth flow and permission handling.',
                    detectedFrom: [session.id],
                    estimatedEffort: 'medium',
                    impact: 'Improves security posture and user access control',
                    status: 'detected',
                    visionAlignment: 85
                  });
                } else {
                  existingItem.detectedFrom.push(session.id);
                }
              }

              // Database performance issues
              if (errorData.includes('timeout') || errorData.includes('connection') || errorData.includes('pool')) {
                const existingItem = items.find(i => i.title === 'Database Connection Pooling');
                if (!existingItem) {
                  items.push({
                    id: 'data-001',
                    category: 'data',
                    priority: 'high',
                    title: 'Database Connection Pooling',
                    description: 'Connection timeouts detected. Implement connection pooling and query optimization.',
                    detectedFrom: [session.id],
                    estimatedEffort: 'medium',
                    impact: 'Reduces database load and improves response times',
                    status: 'detected',
                    visionAlignment: 75
                  });
                }
              }

              // Website/UI issues
              if (errorData.includes('render') || errorData.includes('component') || errorData.includes('undefined')) {
                const existingItem = items.find(i => i.title === 'Frontend Error Handling');
                if (!existingItem) {
                  items.push({
                    id: 'web-001',
                    category: 'website',
                    priority: 'medium',
                    title: 'Frontend Error Handling',
                    description: 'React component errors detected. Add error boundaries and graceful fallbacks.',
                    detectedFrom: [session.id],
                    estimatedEffort: 'small',
                    impact: 'Improves user experience and reduces crashes',
                    status: 'detected',
                    visionAlignment: 70
                  });
                }
              }
            }

            // Look for performance patterns
            if (event.type === 'context_update' && event.data?.contextUsage > 80) {
              const existingItem = items.find(i => i.title === 'Context Optimization');
              if (!existingItem) {
                items.push({
                  id: 'perf-001',
                  category: 'performance',
                  priority: 'critical',
                  title: 'Context Optimization',
                  description: 'High context usage detected. Implement better context management and compression.',
                  detectedFrom: [session.id],
                  estimatedEffort: 'large',
                  impact: 'Extends session length and reduces memory usage',
                  status: 'detected',
                  visionAlignment: 95
                });
              }
            }
          });
        });
      });

      // Analyze patterns for feature opportunities
      if (session.metadata?.totalBlocks > 10) {
        const existingItem = items.find(i => i.title === 'Session Management Dashboard');
        if (!existingItem) {
          items.push({
            id: 'feat-001',
            category: 'feature',
            priority: 'medium',
            title: 'Session Management Dashboard',
            description: 'Long sessions detected. Build better session management and resumption features.',
            detectedFrom: [session.id],
            estimatedEffort: 'large',
            impact: 'Improves productivity and context preservation',
            status: 'detected',
            visionAlignment: 90
          });
        }
      }
    });

    // Add some strategic items based on common patterns
    if (!items.find(i => i.title === 'Real-time Collaboration')) {
      items.push({
        id: 'feat-002',
        category: 'feature',
        priority: 'low',
        title: 'Real-time Collaboration',
        description: 'Enable multiple users to work on the same session simultaneously.',
        detectedFrom: [],
        estimatedEffort: 'large',
        impact: 'Enables team collaboration and knowledge sharing',
        status: 'planned',
        visionAlignment: 80
      });
    }

    if (!items.find(i => i.title === 'API Rate Limiting')) {
      items.push({
        id: 'sec-002',
        category: 'security',
        priority: 'medium',
        title: 'API Rate Limiting',
        description: 'Implement rate limiting to prevent abuse and ensure fair usage.',
        detectedFrom: [],
        estimatedEffort: 'small',
        impact: 'Protects against abuse and ensures system stability',
        status: 'planned',
        visionAlignment: 65
      });
    }

    if (!items.find(i => i.title === 'Data Export & Backup')) {
      items.push({
        id: 'data-002',
        category: 'data',
        priority: 'high',
        title: 'Data Export & Backup',
        description: 'Allow users to export their session data and implement automated backups.',
        detectedFrom: [],
        estimatedEffort: 'medium',
        impact: 'Ensures data portability and disaster recovery',
        status: 'planned',
        visionAlignment: 85
      });
    }

    setRoadmapItems(items);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="h-4 w-4" />;
      case 'data': return <Database className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'feature': return <TrendingUp className="h-4 w-4" />;
      default: return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'data': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'website': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'performance': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'feature': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getEffortSize = (effort: string) => {
    switch (effort) {
      case 'small': return 'S';
      case 'medium': return 'M';
      case 'large': return 'L';
      default: return '?';
    }
  };

  const filteredItems = roadmapItems
    .filter(item => filter === 'all' || item.category === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'vision':
          return b.visionAlignment - a.visionAlignment;
        case 'effort':
          const effortOrder = { small: 0, medium: 1, large: 2 };
          return effortOrder[a.estimatedEffort] - effortOrder[b.estimatedEffort];
        default:
          return 0;
      }
    });

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Development Roadmap</h2>
        
        {/* Filters */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Filter:</span>
            <div className="flex gap-1">
              {['all', 'security', 'data', 'website', 'performance', 'feature'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat as any)}
                  className={`px-2 py-1 text-xs rounded ${
                    filter === cat ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort:</span>
            <div className="flex gap-1">
              {['priority', 'vision', 'effort'].map(sort => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort as any)}
                  className={`px-2 py-1 text-xs rounded ${
                    sortBy === sort ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Total Items: {roadmapItems.length}</span>
          <span>Critical: {roadmapItems.filter(i => i.priority === 'critical').length}</span>
          <span>High Priority: {roadmapItems.filter(i => i.priority === 'high').length}</span>
          <span>Detected Issues: {roadmapItems.filter(i => i.status === 'detected').length}</span>
        </div>
      </div>

      {/* Roadmap Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.map(item => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-900/50 transition-colors ${getCategoryColor(item.category)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getCategoryIcon(item.category)}
                <h3 className="font-medium text-sm">{item.title}</h3>
                <div className={`h-2 w-2 rounded-full ${getPriorityColor(item.priority)}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                  {getEffortSize(item.estimatedEffort)}
                </span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{item.visionAlignment}%</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-2">{item.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Impact: {item.impact}</span>
                {item.detectedFrom.length > 0 && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Detected in {item.detectedFrom.length} session{item.detectedFrom.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {item.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-400" />}
                {item.status === 'in_progress' && <Clock className="h-3 w-3 text-blue-400" />}
                <span className="text-xs text-gray-500 capitalize">{item.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>No roadmap items found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}