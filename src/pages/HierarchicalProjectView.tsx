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
  PlayCircle
} from 'lucide-react';

// Level 1: Project Pillars (Major Features/Initiatives)
interface ProjectPillar {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'future';
  progress: number;
  startDate?: string;
  endDate?: string;
  metrics: {
    goalsCompleted: number;
    goalsTotal: number;
    blockers: number;
  };
  relatedPillars?: string[];
}

// Level 2: Goals/Containers (Specific objectives within pillars)
interface GoalContainer {
  id: string;
  pillarId: string;
  title: string;
  goal: string;
  context: string;
  status: 'completed' | 'active' | 'blocked' | 'planned';
  progress: number;
  owner?: string;
  relatedContainers: {
    dependencies: string[];  // Must happen before
    enables: string[];       // This enables these
    related: string[];      // Related work
  };
  metrics: {
    eventsCompleted: number;
    eventsTotal: number;
    timeSpent?: string;
  };
}

// Level 3: Events/Nodes (Actual work items)
interface EventNode {
  id: string;
  containerId: string;
  type: 'conversation' | 'decision' | 'code' | 'test' | 'error' | 'research';
  title: string;
  context: string;
  timestamp: string;
  status: 'completed' | 'active' | 'pending';
  impact?: {
    files?: number;
    lines?: number;
    tests?: number;
  };
  outcome?: string;
}

// Sample Data Structure
const PROJECT_DATA = {
  pillars: [
    {
      id: 'p1',
      title: 'Authentication System',
      description: 'Secure, scalable authentication with MFA support',
      status: 'completed' as const,
      progress: 100,
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      metrics: {
        goalsCompleted: 4,
        goalsTotal: 4,
        blockers: 0
      },
      relatedPillars: ['p2']
    },
    {
      id: 'p2',
      title: 'Context Capture System',
      description: 'MCP integration for capturing development context',
      status: 'in_progress' as const,
      progress: 65,
      startDate: '2024-01-15',
      metrics: {
        goalsCompleted: 3,
        goalsTotal: 5,
        blockers: 1
      },
      relatedPillars: ['p1', 'p3']
    },
    {
      id: 'p3',
      title: 'Scalable Architecture',
      description: 'Optimize for 100k users with 99% cost reduction',
      status: 'in_progress' as const,
      progress: 40,
      startDate: '2024-01-16',
      metrics: {
        goalsCompleted: 2,
        goalsTotal: 6,
        blockers: 0
      },
      relatedPillars: ['p2']
    },
    {
      id: 'p4',
      title: 'AI-Powered Insights',
      description: 'Smart recommendations and pattern detection',
      status: 'future' as const,
      progress: 0,
      metrics: {
        goalsCompleted: 0,
        goalsTotal: 4,
        blockers: 0
      },
      relatedPillars: ['p2', 'p3']
    }
  ],
  
  goals: [
    // Authentication System Goals
    {
      id: 'g1',
      pillarId: 'p1',
      title: 'Fix Corporate Email Login',
      goal: 'Support multi-level domain emails',
      context: 'Users with @company.subdomain.com cannot login',
      status: 'completed' as const,
      progress: 100,
      owner: 'Claude',
      relatedContainers: {
        dependencies: [],
        enables: ['g2'],
        related: ['g3']
      },
      metrics: {
        eventsCompleted: 5,
        eventsTotal: 5,
        timeSpent: '45 min'
      }
    },
    {
      id: 'g2',
      pillarId: 'p1',
      title: 'Implement JWT Tokens',
      goal: 'Stateless authentication with refresh tokens',
      context: 'Need scalable auth that works with microservices',
      status: 'completed' as const,
      progress: 100,
      owner: 'Claude',
      relatedContainers: {
        dependencies: ['g1'],
        enables: ['g3'],
        related: []
      },
      metrics: {
        eventsCompleted: 8,
        eventsTotal: 8,
        timeSpent: '2 hours'
      }
    },
    
    // Context Capture Goals
    {
      id: 'g3',
      pillarId: 'p2',
      title: 'MCP Stream Handler',
      goal: 'Real-time event capture from Claude Code',
      context: 'WebSocket connection to capture tool events',
      status: 'completed' as const,
      progress: 100,
      owner: 'Claude',
      relatedContainers: {
        dependencies: [],
        enables: ['g4', 'g5'],
        related: ['g2']
      },
      metrics: {
        eventsCompleted: 6,
        eventsTotal: 6,
        timeSpent: '1.5 hours'
      }
    },
    {
      id: 'g4',
      pillarId: 'p2',
      title: 'GitHub Integration',
      goal: 'Capture commits, PRs, and issues',
      context: 'Link code changes to Claude conversations',
      status: 'active' as const,
      progress: 60,
      owner: 'Claude',
      relatedContainers: {
        dependencies: ['g3'],
        enables: ['g6'],
        related: []
      },
      metrics: {
        eventsCompleted: 3,
        eventsTotal: 5,
        timeSpent: '1 hour'
      }
    },
    {
      id: 'g5',
      pillarId: 'p2',
      title: 'Event Enrichment',
      goal: 'Add context and relationships to events',
      context: 'Raw events need semantic meaning',
      status: 'blocked' as const,
      progress: 30,
      owner: 'Claude',
      relatedContainers: {
        dependencies: ['g3'],
        enables: ['g7'],
        related: ['g4']
      },
      metrics: {
        eventsCompleted: 2,
        eventsTotal: 7
      }
    },
    
    // Scalable Architecture Goals
    {
      id: 'g6',
      pillarId: 'p3',
      title: 'Tiered Storage',
      goal: 'Redis → PostgreSQL → S3 pipeline',
      context: 'Optimize storage costs by 99%',
      status: 'active' as const,
      progress: 70,
      owner: 'Claude',
      relatedContainers: {
        dependencies: ['g4'],
        enables: ['g7'],
        related: []
      },
      metrics: {
        eventsCompleted: 4,
        eventsTotal: 6,
        timeSpent: '2 hours'
      }
    },
    {
      id: 'g7',
      pillarId: 'p3',
      title: 'Event Compression',
      goal: 'Reduce event size from 50KB to 200B',
      context: 'Store only essential data with references',
      status: 'planned' as const,
      progress: 0,
      relatedContainers: {
        dependencies: ['g5', 'g6'],
        enables: [],
        related: []
      },
      metrics: {
        eventsCompleted: 0,
        eventsTotal: 4
      }
    }
  ],
  
  events: [
    // Events for "Fix Corporate Email Login"
    {
      id: 'e1',
      containerId: 'g1',
      type: 'conversation' as const,
      title: 'User reported issue',
      context: 'Login failing for @company.subdomain.com',
      timestamp: '10:00 AM',
      status: 'completed' as const
    },
    {
      id: 'e2',
      containerId: 'g1',
      type: 'research' as const,
      title: 'Searched validation logic',
      context: 'Found restrictive regex in 3 files',
      timestamp: '10:01 AM',
      status: 'completed' as const,
      impact: { files: 3 }
    },
    {
      id: 'e3',
      containerId: 'g1',
      type: 'decision' as const,
      title: 'Identified root cause',
      context: 'Regex rejects multi-level domains',
      timestamp: '10:02 AM',
      status: 'completed' as const
    },
    {
      id: 'e4',
      containerId: 'g1',
      type: 'code' as const,
      title: 'Updated email regex',
      context: 'Changed pattern to support subdomains',
      timestamp: '10:03 AM',
      status: 'completed' as const,
      impact: { files: 1, lines: 2 },
      outcome: 'Fix deployed successfully'
    },
    {
      id: 'e5',
      containerId: 'g1',
      type: 'test' as const,
      title: 'Ran auth tests',
      context: 'Verify email validation works',
      timestamp: '10:04 AM',
      status: 'completed' as const,
      impact: { tests: 47 },
      outcome: '47/47 tests passing'
    },
    
    // Events for active goals
    {
      id: 'e6',
      containerId: 'g4',
      type: 'code' as const,
      title: 'Created GitHubEventCapture',
      context: 'Service to poll GitHub API',
      timestamp: '2:00 PM',
      status: 'completed' as const,
      impact: { files: 1, lines: 220 }
    },
    {
      id: 'e7',
      containerId: 'g4',
      type: 'decision' as const,
      title: 'Webhook vs Polling',
      context: 'Decided on hybrid approach',
      timestamp: '2:15 PM',
      status: 'completed' as const
    },
    {
      id: 'e8',
      containerId: 'g4',
      type: 'code' as const,
      title: 'Implementing webhook handler',
      context: 'Real-time GitHub events',
      timestamp: '2:30 PM',
      status: 'active' as const
    }
  ]
};

export const HierarchicalProjectView: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<ProjectPillar | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalContainer | null>(null);
  const [viewLevel, setViewLevel] = useState<'pillars' | 'goals' | 'events'>('pillars');

  // Get related goals for a pillar
  const getGoalsForPillar = (pillarId: string) => {
    return PROJECT_DATA.goals.filter(g => g.pillarId === pillarId);
  };

  // Get events for a goal
  const getEventsForGoal = (goalId: string) => {
    return PROJECT_DATA.events.filter(e => e.containerId === goalId);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress':
      case 'active': return 'text-blue-600 bg-blue-50';
      case 'blocked': return 'text-red-600 bg-red-50';
      case 'future':
      case 'planned': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress':
      case 'active': return PlayCircle;
      case 'blocked': return AlertCircle;
      case 'future':
      case 'planned': return Clock;
      default: return Circle;
    }
  };

  // Render Pillar Card (Level 1)
  const renderPillarCard = (pillar: ProjectPillar) => {
    const StatusIcon = getStatusIcon(pillar.status);
    const isSelected = selectedPillar?.id === pillar.id;
    
    return (
      <Card
        key={pillar.id}
        className={`cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={() => {
          setSelectedPillar(pillar);
          setSelectedGoal(null);
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${getStatusColor(pillar.status)}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{pillar.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{pillar.description}</p>
              </div>
            </div>
            {pillar.status === 'in_progress' && (
              <Badge variant="secondary">{pillar.progress}%</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {pillar.metrics.goalsCompleted}
              </div>
              <div className="text-xs text-gray-500">Goals Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {pillar.metrics.goalsTotal - pillar.metrics.goalsCompleted}
              </div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {pillar.metrics.blockers}
              </div>
              <div className="text-xs text-gray-500">Blockers</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {pillar.status === 'in_progress' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${pillar.progress}%` }}
              />
            </div>
          )}
          
          {/* Dates */}
          {pillar.startDate && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{pillar.startDate}</span>
              {pillar.endDate && (
                <>
                  <ArrowRight className="h-3 w-3" />
                  <span>{pillar.endDate}</span>
                </>
              )}
            </div>
          )}
          
          {/* Related Pillars */}
          {pillar.relatedPillars && pillar.relatedPillars.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-500 mb-1">Related to:</div>
              <div className="flex gap-2">
                {pillar.relatedPillars.map(id => {
                  const related = PROJECT_DATA.pillars.find(p => p.id === id);
                  return related ? (
                    <Badge key={id} variant="outline" className="text-xs">
                      {related.title}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render Goal Container (Level 2)
  const renderGoalContainer = (goal: GoalContainer) => {
    const StatusIcon = getStatusIcon(goal.status);
    const isSelected = selectedGoal?.id === goal.id;
    const events = getEventsForGoal(goal.id);
    
    return (
      <Card
        key={goal.id}
        className={`cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={() => setSelectedGoal(goal)}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded ${getStatusColor(goal.status)}`}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold">{goal.title}</h4>
                {goal.owner && (
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{goal.owner}</span>
                  </div>
                )}
              </div>
            </div>
            {goal.progress > 0 && (
              <Badge variant="secondary" className="text-xs">
                {goal.progress}%
              </Badge>
            )}
          </div>
          
          {/* Goal & Context */}
          <div className="space-y-2 mb-3">
            <div className="bg-blue-50 rounded p-2">
              <div className="text-xs font-medium text-blue-900 mb-1">Goal</div>
              <p className="text-sm text-blue-700">{goal.goal}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-xs font-medium text-gray-700 mb-1">Context</div>
              <p className="text-sm text-gray-600">{goal.context}</p>
            </div>
          </div>
          
          {/* Metrics */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span>{goal.metrics.eventsCompleted}/{goal.metrics.eventsTotal} events</span>
            {goal.metrics.timeSpent && (
              <>
                <span>•</span>
                <span>{goal.metrics.timeSpent}</span>
              </>
            )}
          </div>
          
          {/* Related Containers */}
          <div className="space-y-2 text-xs">
            {goal.relatedContainers.dependencies.length > 0 && (
              <div>
                <span className="text-gray-500">Depends on:</span>
                <div className="flex gap-1 mt-1">
                  {goal.relatedContainers.dependencies.map(id => {
                    const dep = PROJECT_DATA.goals.find(g => g.id === id);
                    return dep ? (
                      <Badge key={id} variant="outline" className="text-xs">
                        {dep.title}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            {goal.relatedContainers.enables.length > 0 && (
              <div>
                <span className="text-gray-500">Enables:</span>
                <div className="flex gap-1 mt-1">
                  {goal.relatedContainers.enables.map(id => {
                    const enables = PROJECT_DATA.goals.find(g => g.id === id);
                    return enables ? (
                      <Badge key={id} variant="outline" className="text-xs">
                        {enables.title}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Event Preview */}
          {events.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-500 mb-2">{events.length} events</div>
              <div className="flex gap-2">
                {events.slice(0, 3).map(event => {
                  const EventIcon = event.type === 'conversation' ? MessageSquare :
                                   event.type === 'decision' ? Brain :
                                   event.type === 'code' ? Code :
                                   event.type === 'test' ? Terminal :
                                   event.type === 'research' ? Search : FileText;
                  return (
                    <div
                      key={event.id}
                      className={`p-1 rounded ${getStatusColor(event.status)}`}
                    >
                      <EventIcon className="h-3 w-3" />
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{events.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render Event Node (Level 3)
  const renderEventNode = (event: EventNode) => {
    const TypeIcon = event.type === 'conversation' ? MessageSquare :
                    event.type === 'decision' ? Brain :
                    event.type === 'code' ? Code :
                    event.type === 'test' ? Terminal :
                    event.type === 'research' ? Search :
                    event.type === 'error' ? AlertCircle : FileText;
    
    return (
      <Card key={event.id} className="hover:shadow-md transition-all">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className={`p-1.5 rounded ${getStatusColor(event.status)}`}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h5 className="font-medium text-sm">{event.title}</h5>
                <span className="text-xs text-gray-500">{event.timestamp}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{event.context}</p>
              
              {/* Impact */}
              {event.impact && (
                <div className="flex gap-2 mt-2">
                  {event.impact.files && (
                    <Badge variant="outline" className="text-xs">
                      {event.impact.files} files
                    </Badge>
                  )}
                  {event.impact.lines && (
                    <Badge variant="outline" className="text-xs">
                      {event.impact.lines} lines
                    </Badge>
                  )}
                  {event.impact.tests && (
                    <Badge variant="outline" className="text-xs">
                      {event.impact.tests} tests
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Outcome */}
              {event.outcome && (
                <div className="mt-2 p-2 bg-green-50 rounded">
                  <p className="text-xs text-green-700">{event.outcome}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Column 1: Project Pillars */}
      <div className="w-96 border-r bg-white overflow-y-auto">
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Pillars
          </h2>
          <p className="text-sm text-gray-600 mt-1">Major features and initiatives</p>
        </div>
        
        <div className="p-4 space-y-4">
          {PROJECT_DATA.pillars.map(pillar => renderPillarCard(pillar))}
        </div>
      </div>
      
      {/* Column 2: Goals/Containers */}
      {selectedPillar && (
        <div className="w-96 border-r bg-white overflow-y-auto">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Package className="h-4 w-4" />
              <span>{selectedPillar.title}</span>
            </div>
            <h2 className="text-lg font-bold">Goals & Containers</h2>
            <p className="text-sm text-gray-600 mt-1">Specific objectives to achieve</p>
          </div>
          
          <div className="p-4 space-y-3">
            {getGoalsForPillar(selectedPillar.id).map(goal => renderGoalContainer(goal))}
          </div>
        </div>
      )}
      
      {/* Column 3: Events/Nodes */}
      {selectedGoal && (
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="p-4 border-b bg-gradient-to-r from-green-50 to-yellow-50">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Layers className="h-4 w-4" />
              <span>{selectedPillar?.title}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{selectedGoal.title}</span>
            </div>
            <h2 className="text-lg font-bold">Events & Context</h2>
            <p className="text-sm text-gray-600 mt-1">Individual work items and decisions</p>
          </div>
          
          <div className="p-4 space-y-3">
            {getEventsForGoal(selectedGoal.id).map(event => renderEventNode(event))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!selectedPillar && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-3" />
            <p>Select a pillar to see goals</p>
          </div>
        </div>
      )}
      
      {selectedPillar && !selectedGoal && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-3" />
            <p>Select a goal to see events</p>
          </div>
        </div>
      )}
    </div>
  );
};