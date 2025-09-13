import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Database, Github, Zap, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';
import { UnifiedBlock } from '../types/container';

export function MCPIntegrationDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<UnifiedBlock[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalEvents: 0,
    eventsByType: {},
    compressionRatio: 0,
    storageSize: 0
  });
  const [storageMetrics, setStorageMetrics] = useState<any>({
    hotCount: 0,
    warmCount: 0,
    coldCount: 0,
    totalSize: 0,
    compressionRatio: 1,
    costEstimate: 0
  });
  const [context, setContext] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50));
  };

  const startServices = async () => {
    try {
      addLog('Connecting to MCP WebSocket server...');
      
      // Connect to WebSocket server (you'll need to run a separate Node.js server)
      const websocket = new WebSocket('ws://localhost:3001/mcp');
      
      websocket.onopen = () => {
        addLog('Connected to MCP WebSocket server');
        setIsRunning(true);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'event') {
            const block: UnifiedBlock = {
              id: data.id,
              level: 'event',
              type: data.eventType || 'mcp',
              title: data.title || 'MCP Event',
              summary: data.summary || '',
              status: data.status || 'active',
              timestamp: data.timestamp
            };
            setEvents(prev => [block, ...prev].slice(0, 100));
            addLog(`New event: ${block.title}`);
          } else if (data.type === 'metrics') {
            setMetrics(data.metrics);
          } else if (data.type === 'storage') {
            setStorageMetrics(data.storage);
          } else if (data.type === 'context') {
            setContext(data.context);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      websocket.onerror = (error) => {
        addLog(`WebSocket error: ${error}`);
      };

      websocket.onclose = () => {
        addLog('Disconnected from MCP server');
        setIsRunning(false);
      };

      setWs(websocket);
    } catch (error) {
      addLog(`Error starting services: ${error}`);
    }
  };

  const stopServices = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setIsRunning(false);
    addLog('Services stopped');
  };

  const simulateMCPEvent = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('Not connected to server');
      return;
    }

    const eventTypes = ['tool_use', 'conversation', 'decision', 'error', 'context_update'];
    const tools = ['Read', 'Write', 'Edit', 'Bash', 'WebSearch'];
    
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const tool = tools[Math.floor(Math.random() * tools.length)];

    const event = {
      type: 'simulate',
      payload: {
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: type,
        tool: type === 'tool_use' ? tool : undefined,
        message: `Test ${type} event`
      }
    };

    ws.send(JSON.stringify(event));
    addLog(`Simulated MCP event: ${type}`);
  };

  const simulateGitHubEvent = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('Not connected to server');
      return;
    }

    const events = ['push', 'pull_request', 'issues', 'workflow_run'];
    const eventName = events[Math.floor(Math.random() * events.length)];

    const payload = {
      type: 'github',
      payload: {
        eventName,
        repository: 'test/repo',
        action: 'opened'
      }
    };

    ws.send(JSON.stringify(payload));
    addLog(`Simulated GitHub event: ${eventName}`);
  };

  const refreshMetrics = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('Not connected to server');
      return;
    }

    ws.send(JSON.stringify({ type: 'get_metrics' }));
    addLog('Metrics refresh requested');
  };

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MCP Integration Dashboard</h1>
          <p className="text-gray-400">Monitor real-time MCP and GitHub events</p>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Control Panel</h2>
            <div className={`px-3 py-1 rounded-full text-sm ${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
              {isRunning ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="flex gap-4">
            {!isRunning ? (
              <button
                onClick={startServices}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Play className="h-4 w-4" />
                Connect to Server
              </button>
            ) : (
              <button
                onClick={stopServices}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <Pause className="h-4 w-4" />
                Disconnect
              </button>
            )}

            <button
              onClick={simulateMCPEvent}
              disabled={!isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Simulate MCP Event
            </button>

            <button
              onClick={simulateGitHubEvent}
              disabled={!isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              <Github className="h-4 w-4" />
              Simulate GitHub Event
            </button>

            <button
              onClick={refreshMetrics}
              disabled={!isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Metrics
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-800 rounded text-xs text-gray-400">
            <p>Note: To use this dashboard, you need to run the MCP WebSocket server separately:</p>
            <code className="block mt-2 text-blue-400">node src/services/mcp/server.js</code>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Event Metrics */}
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold">Event Metrics</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Events</span>
                <span>{metrics.totalEvents || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Compression Ratio</span>
                <span>{((1 - (metrics.compressionRatio || 1)) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Storage Size</span>
                <span>{((metrics.storageSize || 0) / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          </div>

          {/* Storage Metrics */}
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-green-400" />
              <h3 className="font-semibold">Storage Tiers</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Hot (Memory)</span>
                <span>{storageMetrics.hotCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Warm (Database)</span>
                <span>{storageMetrics.warmCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cold (Archive)</span>
                <span>{storageMetrics.coldCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Est. Cost</span>
                <span>${(storageMetrics.costEstimate || 0).toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Context Metrics */}
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold">Context Analysis</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate</span>
                <span>{(context?.metrics?.successRate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Goals</span>
                <span>{context?.metrics?.activeGoals || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Patterns</span>
                <span>{context?.patterns?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Blocked Items</span>
                <span className="text-red-400">{context?.metrics?.blockedItems || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Events and Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Events */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Recent Events</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className="bg-gray-800 rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {event.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : event.status === 'blocked' ? (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-blue-400" />
                        )}
                        <span className="font-medium text-sm">{event.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{event.summary}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No events yet. Connect to the server and simulate some events.
                </div>
              )}
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="font-semibold mb-4">System Logs</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No logs yet. Connect to the server to see activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}