import React, { useEffect, useState, useCallback } from 'react';
import { Activity, GitBranch, Terminal, FileText, Search, Globe, Zap, AlertCircle } from 'lucide-react';

// Stream event types from Claude Code MCP
export interface MCPStreamEvent {
  id: string;
  timestamp: string;
  type: 'tool' | 'conversation' | 'decision' | 'error';
  data: ToolEvent | ConversationEvent | DecisionEvent | ErrorEvent;
}

export interface ToolEvent {
  tool: 'Read' | 'Write' | 'Edit' | 'MultiEdit' | 'Bash' | 'Search' | 'Grep' | 'WebFetch';
  parameters: Record<string, any>;
  result: {
    success: boolean;
    output?: string;
    error?: string;
    tokens: number;
    duration: number;
  };
  context: {
    file?: string;
    line?: number;
    conversationId: string;
    projectPath: string;
  };
}

export interface ConversationEvent {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: { input: number; output: number };
  model: string;
  reasoning?: string[];
  planSteps?: string[];
}

export interface DecisionEvent {
  type: 'architecture' | 'implementation' | 'debugging' | 'refactoring';
  question: string;
  options: string[];
  selected: string;
  rationale: string;
  confidence: number;
  affectedFiles: string[];
}

export interface ErrorEvent {
  severity: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  recoverable: boolean;
  suggestion?: string;
}

interface MCPStreamHandlerProps {
  projectId: string;
  onEventReceived?: (event: MCPStreamEvent) => void;
  autoConnect?: boolean;
}

export const MCPStreamHandler: React.FC<MCPStreamHandlerProps> = ({
  projectId,
  onEventReceived,
  autoConnect = true
}) => {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<MCPStreamEvent[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    toolCalls: 0,
    decisions: 0,
    errors: 0,
    tokensUsed: 0
  });
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Connect to MCP WebSocket
  const connect = useCallback(() => {
    const websocket = new WebSocket(`ws://localhost:3001/mcp/stream/${projectId}`);
    
    websocket.onopen = () => {
      console.log('Connected to MCP stream');
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const mcpEvent: MCPStreamEvent = JSON.parse(event.data);
        
        // Update events list
        setEvents(prev => [mcpEvent, ...prev].slice(0, 100)); // Keep last 100 events
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalEvents: prev.totalEvents + 1,
          toolCalls: mcpEvent.type === 'tool' ? prev.toolCalls + 1 : prev.toolCalls,
          decisions: mcpEvent.type === 'decision' ? prev.decisions + 1 : prev.decisions,
          errors: mcpEvent.type === 'error' ? prev.errors + 1 : prev.errors,
          tokensUsed: mcpEvent.type === 'tool' && 'result' in mcpEvent.data 
            ? prev.tokensUsed + (mcpEvent.data as ToolEvent).result.tokens 
            : prev.tokensUsed
        }));

        // Callback for parent component
        if (onEventReceived) {
          onEventReceived(mcpEvent);
        }

        // Process event for context creation
        processEventForContext(mcpEvent);
      } catch (error) {
        console.error('Failed to parse MCP event:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('MCP WebSocket error:', error);
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('Disconnected from MCP stream');
      setConnected(false);
      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        if (autoConnect) connect();
      }, 5000);
    };

    setWs(websocket);
  }, [projectId, onEventReceived, autoConnect]);

  // Process events to create context blocks
  const processEventForContext = (event: MCPStreamEvent) => {
    // Transform MCP events into Frizy context blocks
    const contextBlock = transformToContextBlock(event);
    
    // Store in local state or send to backend
    storeContextBlock(contextBlock);
  };

  const transformToContextBlock = (event: MCPStreamEvent) => {
    const baseBlock = {
      id: `ctx-${event.id}`,
      timestamp: event.timestamp,
      projectId
    };

    switch (event.type) {
      case 'tool':
        const toolData = event.data as ToolEvent;
        return {
          ...baseBlock,
          type: 'action' as const,
          title: `${toolData.tool} Operation`,
          summary: generateToolSummary(toolData),
          importance: calculateToolImportance(toolData),
          trace: {
            tool: toolData.tool,
            parameters: toolData.parameters,
            result: toolData.result,
            context: toolData.context
          }
        };

      case 'decision':
        const decisionData = event.data as DecisionEvent;
        return {
          ...baseBlock,
          type: 'decision' as const,
          title: `${decisionData.type} Decision`,
          summary: `Chose: ${decisionData.selected}`,
          importance: decisionData.confidence,
          trace: {
            question: decisionData.question,
            rationale: decisionData.rationale,
            affectedFiles: decisionData.affectedFiles
          }
        };

      case 'conversation':
        const convData = event.data as ConversationEvent;
        return {
          ...baseBlock,
          type: 'memory' as const,
          title: `${convData.role} Message`,
          summary: convData.content.slice(0, 100) + '...',
          importance: convData.reasoning ? 0.8 : 0.5,
          trace: {
            content: convData.content,
            reasoning: convData.reasoning,
            planSteps: convData.planSteps,
            tokens: convData.tokens
          }
        };

      default:
        return baseBlock;
    }
  };

  const generateToolSummary = (tool: ToolEvent): string => {
    switch (tool.tool) {
      case 'Write':
        return `Created ${tool.context.file}`;
      case 'Edit':
        return `Modified ${tool.context.file} at line ${tool.context.line}`;
      case 'Read':
        return `Read ${tool.context.file}`;
      case 'Bash':
        return `Executed: ${tool.parameters.command}`;
      case 'Search':
      case 'Grep':
        return `Searched for: ${tool.parameters.pattern}`;
      case 'WebFetch':
        return `Fetched: ${tool.parameters.url}`;
      default:
        return `${tool.tool} operation completed`;
    }
  };

  const calculateToolImportance = (tool: ToolEvent): number => {
    // Higher importance for write operations and errors
    if (!tool.result.success) return 0.9;
    if (tool.tool === 'Write' || tool.tool === 'Edit') return 0.8;
    if (tool.tool === 'Bash') return 0.7;
    return 0.5;
  };

  const storeContextBlock = async (block: any) => {
    // Send to backend API
    try {
      await fetch(`/api/contexts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block)
      });
    } catch (error) {
      console.error('Failed to store context block:', error);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tool': return <Terminal className="w-4 h-4" />;
      case 'decision': return <GitBranch className="w-4 h-4" />;
      case 'conversation': return <FileText className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'tool': return 'text-blue-600 bg-blue-50';
      case 'decision': return 'text-purple-600 bg-purple-50';
      case 'conversation': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {connected ? 'Connected to Claude Code' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>Events: {stats.totalEvents}</span>
          <span>Tools: {stats.toolCalls}</span>
          <span>Tokens: {stats.tokensUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* Real-time Event Stream */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.map(event => (
          <div
            key={event.id}
            className={`flex items-start gap-3 p-2 rounded-lg ${getEventColor(event.type)}`}
          >
            <div className="mt-0.5">{getEventIcon(event.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{event.type}</span>
                <span className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 truncate">
                {event.type === 'tool' && generateToolSummary(event.data as ToolEvent)}
                {event.type === 'decision' && (event.data as DecisionEvent).selected}
                {event.type === 'conversation' && (event.data as ConversationEvent).content.slice(0, 50) + '...'}
                {event.type === 'error' && (event.data as ErrorEvent).message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Stream Control */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => connected ? ws?.close() : connect()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          {connected ? 'Disconnect' : 'Connect to Stream'}
        </button>
      </div>
    </div>
  );
};