import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  Database,
  Clock,
  GitBranch,
  FileText,
  Zap,
  Users
} from 'lucide-react';

interface AnalyticsData {
  metrics: {
    sessions: Map<string, any>;
    events: any[];
    performance: any[];
    errors: any[];
    contextUsage: any[];
  };
  aggregates: {
    eventsPerHour: number;
    eventsPerDay: number;
    avgSessionDuration: number;
    topTools: Array<{ tool: string; count: number }>;
    contextWarnings: number;
  };
  performance: {
    database: {
      size: number;
      tables: Record<string, number>;
    };
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    uptime: number;
    connections: number;
  };
  timestamp: number;
}

interface AnalyticsDashboardProps {
  wsUrl?: string;
  apiUrl?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  wsUrl = 'ws://localhost:3333',
  apiUrl = 'http://localhost:3333/analytics'
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'sessions' | 'events' | 'performance'>('overview');

  useEffect(() => {
    // Fetch initial data
    fetchAnalytics();

    // Set up WebSocket connection
    connectWebSocket();

    // Refresh data periodically
    const interval = setInterval(fetchAnalytics, 10000);

    return () => {
      clearInterval(interval);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const connectWebSocket = () => {
    try {
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        setIsConnected(true);
        console.log('Analytics WebSocket connected');
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleRealtimeUpdate(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        setIsConnected(false);
        console.log('Analytics WebSocket disconnected');
        // Attempt reconnection after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const handleRealtimeUpdate = (message: any) => {
    switch (message.type) {
      case 'analytics_update':
        setData(message.data);
        break;
      case 'session_created':
      case 'session_updated':
      case 'event_logged':
      case 'context_critical':
        // Refresh analytics data
        fetchAnalytics();
        break;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold">MCP Analytics Dashboard</h2>
          <div className={`px-2 py-1 rounded text-xs ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* View Selector */}
        <div className="flex gap-2">
          {(['overview', 'sessions', 'events', 'performance'] as const).map(view => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1 rounded text-sm capitalize ${
                selectedView === view
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Events Per Hour */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-xs text-gray-500">Per Hour</span>
            </div>
            <div className="text-2xl font-bold">
              {data.aggregates.eventsPerHour.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">Events</div>
          </div>

          {/* Events Per Day */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-xs text-gray-500">Per Day</span>
            </div>
            <div className="text-2xl font-bold">
              {data.aggregates.eventsPerDay.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">Events</div>
          </div>

          {/* Active Connections */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-xs text-gray-500">Active</span>
            </div>
            <div className="text-2xl font-bold">
              {data.performance.connections}
            </div>
            <div className="text-xs text-gray-400 mt-1">Connections</div>
          </div>

          {/* Context Warnings */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <span className="text-xs text-gray-500">Warnings</span>
            </div>
            <div className="text-2xl font-bold">
              {data.aggregates.contextWarnings}
            </div>
            <div className="text-xs text-gray-400 mt-1">Context Alerts</div>
          </div>

          {/* Top Tools */}
          <div className="bg-gray-800 rounded-lg p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Top Tools</h3>
              <FileText className="h-4 w-4 text-gray-500" />
            </div>
            <div className="space-y-2">
              {data.aggregates.topTools.slice(0, 5).map((tool, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{tool.tool || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${(tool.count / data.aggregates.topTools[0].count) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {tool.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-800 rounded-lg p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">System Status</h3>
              <Database className="h-4 w-4 text-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Database</div>
                <div className="text-sm font-medium">
                  {formatBytes(data.performance.database.size)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Memory</div>
                <div className="text-sm font-medium">
                  {formatBytes(data.performance.memory.heapUsed)} / 
                  {formatBytes(data.performance.memory.heapTotal)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Uptime</div>
                <div className="text-sm font-medium">
                  {formatDuration(data.performance.uptime)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Sessions</div>
                <div className="text-sm font-medium">
                  {data.performance.database.tables.sessions || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions View */}
      {selectedView === 'sessions' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Active Sessions</h3>
            <div className="space-y-2">
              {Array.from(data.metrics.sessions.values())
                .filter((s: any) => s.status === 'active')
                .map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <div>
                      <div className="text-sm font-medium">{session.title}</div>
                      <div className="text-xs text-gray-400">
                        {session.event_count} events • {formatBytes(session.total_tokens * 4)} tokens
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Started {new Date(session.started_at * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Events View */}
      {selectedView === 'events' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Event Timeline</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.metrics.events.slice(-20).reverse().map((event: any, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <div className="flex-1">
                    <div className="text-sm">{event.type}</div>
                    {event.tool && (
                      <div className="text-xs text-gray-400">Tool: {event.tool}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance View */}
      {selectedView === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Database Tables</h3>
            <div className="space-y-2">
              {Object.entries(data.performance.database.tables).map(([table, count]) => (
                <div key={table} className="flex justify-between">
                  <span className="text-sm text-gray-400 capitalize">{table}</span>
                  <span className="text-sm font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Memory Usage</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">RSS</span>
                <span className="text-sm font-medium">
                  {formatBytes(data.performance.memory.rss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Heap Used</span>
                <span className="text-sm font-medium">
                  {formatBytes(data.performance.memory.heapUsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Heap Total</span>
                <span className="text-sm font-medium">
                  {formatBytes(data.performance.memory.heapTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;