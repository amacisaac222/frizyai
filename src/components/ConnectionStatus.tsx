import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Github, Server, AlertCircle, CheckCircle, Loader, Settings, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  onSetupClick?: () => void;
}

interface MCPConnection {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  serverName?: string;
  lastConnected?: Date;
  autoReconnect: boolean;
}

interface GitHubConnection {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  username?: string;
  repository?: string;
  branch?: string;
}

export function ConnectionStatus({ onSetupClick }: ConnectionStatusProps) {
  const [mcpConnection, setMcpConnection] = useState<MCPConnection>({
    status: 'disconnected',
    autoReconnect: true
  });

  const [githubConnection, setGitHubConnection] = useState<GitHubConnection>({
    status: 'disconnected'
  });

  const [showDetails, setShowDetails] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Connect to actual MCP WebSocket server
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Connect to the real MCP server on port 3334
        const websocket = new WebSocket('ws://localhost:3334');

        websocket.onopen = () => {
          console.log('Connected to MCP server on port 3334');
          setMcpConnection({
            status: 'connected',
            serverName: 'Frizy MCP Server',
            lastConnected: new Date(),
            autoReconnect: true
          });
          setReconnectAttempts(0);
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('MCP Server message:', data);

            // Handle different message types from the server
            if (data.type === 'connected') {
              console.log('MCP Server ready, client ID:', data.clientId);
            } else if (data.type === 'file_changes') {
              console.log('File changes detected:', data.summary);
            } else if (data.type === 'git_event') {
              console.log('Git event:', data.subtype);
            }
          } catch (error) {
            console.error('Error parsing MCP message:', error);
          }
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setMcpConnection(prev => ({
            ...prev,
            status: 'error'
          }));
        };

        websocket.onclose = () => {
          console.log('Disconnected from MCP server');
          setMcpConnection(prev => ({
            ...prev,
            status: 'disconnected'
          }));

          // Auto-reconnect after 5 seconds
          if (mcpConnection.autoReconnect && reconnectAttempts < 3) {
            setReconnectAttempts(prev => prev + 1);
            setTimeout(connectWebSocket, 5000);
          }
        };

        setWs(websocket);
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setMcpConnection(prev => ({
          ...prev,
          status: 'error'
        }));
      }
    };

    connectWebSocket();

    // Check GitHub connection
    checkGitHubConnection();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const connectToMCP = () => {
    // Close existing connection if any
    if (ws) {
      ws.close();
    }

    setMcpConnection(prev => ({ ...prev, status: 'connecting' }));

    try {
      const websocket = new WebSocket('ws://localhost:3334');

      websocket.onopen = () => {
        console.log('Reconnected to MCP server');
        setMcpConnection({
          status: 'connected',
          serverName: 'Frizy MCP Server',
          lastConnected: new Date(),
          autoReconnect: true
        });
        setReconnectAttempts(0);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('MCP Server message:', data);
        } catch (error) {
          console.error('Error parsing MCP message:', error);
        }
      };

      websocket.onerror = () => {
        setMcpConnection(prev => ({ ...prev, status: 'error' }));
      };

      websocket.onclose = () => {
        setMcpConnection(prev => ({ ...prev, status: 'disconnected' }));
      };

      setWs(websocket);
    } catch (error) {
      setMcpConnection(prev => ({ ...prev, status: 'error' }));
      console.error('MCP connection error:', error);
    }
  };

  const checkGitHubConnection = async () => {
    setGitHubConnection(prev => ({ ...prev, status: 'connecting' }));

    try {
      // Check if we're in a git repository
      const gitStatus = await fetch('/api/git/status').catch(() => null);

      if (gitStatus && gitStatus.ok) {
        const data = await gitStatus.json();
        setGitHubConnection({
          status: 'connected',
          username: data.username || 'user',
          repository: data.repository || 'frizyai',
          branch: data.branch || 'main'
        });
      } else {
        setGitHubConnection(prev => ({ ...prev, status: 'disconnected' }));
      }
    } catch (error) {
      setGitHubConnection(prev => ({ ...prev, status: 'error' }));
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-3 w-3" />;
      case 'connecting': return <Loader className="h-3 w-3 animate-spin" />;
      case 'error': return <AlertCircle className="h-3 w-3" />;
      default: return <WifiOff className="h-3 w-3" />;
    }
  };

  return (
    <div className="relative">
      {/* Main Status Bar */}
      <div className="flex items-center gap-3 text-xs">
        {/* MCP Status */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 transition-colors ${getStatusColor(mcpConnection.status)}`}
        >
          <Server className="h-3 w-3" />
          <span>MCP</span>
          {getStatusIcon(mcpConnection.status)}
        </button>

        {/* GitHub Status */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 transition-colors ${getStatusColor(githubConnection.status)}`}
        >
          <Github className="h-3 w-3" />
          <span>GitHub</span>
          {getStatusIcon(githubConnection.status)}
        </button>

        {/* Quick Actions */}
        {(mcpConnection.status === 'disconnected' || mcpConnection.status === 'error') && (
          <button
            onClick={() => connectToMCP()}
            className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reconnect</span>
          </button>
        )}
      </div>

      {/* Detailed Status Dropdown */}
      {showDetails && (
        <div className="absolute top-8 right-0 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-4">
            {/* MCP Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  MCP Server
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  mcpConnection.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                  mcpConnection.status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                  mcpConnection.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {mcpConnection.status}
                </span>
              </div>

              {mcpConnection.status === 'connected' ? (
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Server: {mcpConnection.serverName}</p>
                  <p>Connected: {mcpConnection.lastConnected?.toLocaleTimeString()}</p>
                  <p>Auto-reconnect: {mcpConnection.autoReconnect ? 'Enabled' : 'Disabled'}</p>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  <p>Not connected to MCP server</p>
                  {reconnectAttempts > 0 && (
                    <p className="text-yellow-400 mt-1">
                      Reconnection attempt {reconnectAttempts}/3
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                {mcpConnection.status !== 'connected' && (
                  <button
                    onClick={() => connectToMCP()}
                    className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                  >
                    Connect
                  </button>
                )}
                <button
                  onClick={onSetupClick}
                  className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                >
                  <Settings className="h-3 w-3 inline mr-1" />
                  Configure
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* GitHub Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  githubConnection.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                  githubConnection.status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                  githubConnection.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {githubConnection.status}
                </span>
              </div>

              {githubConnection.status === 'connected' ? (
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Repository: {githubConnection.repository}</p>
                  <p>Branch: {githubConnection.branch}</p>
                  <p>User: {githubConnection.username}</p>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  <p>Not connected to GitHub</p>
                </div>
              )}

              <div className="mt-2">
                <button
                  onClick={checkGitHubConnection}
                  className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                >
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  Refresh Status
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500">
                MCP server enables Claude to interact with your codebase.
                {mcpConnection.status === 'disconnected' && ' Click Configure to set up your connection.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}