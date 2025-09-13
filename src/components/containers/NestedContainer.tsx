import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Brain, GitBranch, FileText, Code, Clock, CheckCircle } from 'lucide-react';

interface StreamData {
  id: string;
  timestamp: string;
  content: string;
  tokens: number;
}

interface NodeData {
  id: string;
  name: string;
  type: 'input' | 'process' | 'output';
  streams: StreamData[];
}

interface TraceData {
  id: string;
  name: string;
  nodes: NodeData[];
}

interface ContextBlock {
  id: string;
  title: string;
  type: 'memory' | 'action' | 'decision';
  traces: TraceData[];
  summary: string;
  timestamp: string;
}

interface Container {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  contexts: ContextBlock[];
  progress: number;
  lastActivity: string;
}

interface NestedContainerProps {
  container: Container;
}

export const NestedContainer: React.FC<NestedContainerProps> = ({ container }) => {
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-blue-500 bg-blue-50';
      case 'completed': return 'border-green-500 bg-green-50';
      case 'pending': return 'border-gray-400 bg-gray-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'memory': return <Brain className="w-4 h-4 text-purple-600" />;
      case 'action': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'decision': return <GitBranch className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(container.status)}`}>
      {/* Container Level */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleExpand(`container-${container.id}`)}
            className="p-1 hover:bg-white/50 rounded transition-colors"
          >
            {expandedLevels.has(`container-${container.id}`) ? 
              <ChevronDown className="w-5 h-5" /> : 
              <ChevronRight className="w-5 h-5" />
            }
          </button>
          <h3 className="font-semibold text-lg">{container.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            container.status === 'active' ? 'bg-blue-100 text-blue-700' :
            container.status === 'completed' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {container.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{container.lastActivity}</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 w-24">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${container.progress}%` }}
            />
          </div>
          <span className="text-xs font-medium">{container.progress}%</span>
        </div>
      </div>

      {/* Context Blocks Level */}
      {expandedLevels.has(`container-${container.id}`) && (
        <div className="ml-6 space-y-2">
          {container.contexts.map(context => (
            <div key={context.id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(`context-${context.id}`)}
                    className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  >
                    {expandedLevels.has(`context-${context.id}`) ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                  {getTypeIcon(context.type)}
                  <span className="font-medium">{context.title}</span>
                </div>
                <span className="text-xs text-gray-500">{context.timestamp}</span>
              </div>
              
              <p className="text-sm text-gray-600 mt-2 ml-7">{context.summary}</p>

              {/* Trace Level */}
              {expandedLevels.has(`context-${context.id}`) && (
                <div className="ml-7 mt-3 space-y-2">
                  {context.traces.map(trace => (
                    <div key={trace.id} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(`trace-${trace.id}`)}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                        >
                          {expandedLevels.has(`trace-${trace.id}`) ? 
                            <ChevronDown className="w-3 h-3" /> : 
                            <ChevronRight className="w-3 h-3" />
                          }
                        </button>
                        <GitBranch className="w-3 h-3 text-gray-500" />
                        <span className="text-sm font-medium">{trace.name}</span>
                      </div>

                      {/* Node Level */}
                      {expandedLevels.has(`trace-${trace.id}`) && (
                        <div className="ml-5 mt-2 space-y-1">
                          {trace.nodes.map(node => (
                            <div key={node.id} className="bg-gray-50 rounded p-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleExpand(`node-${node.id}`)}
                                  className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                >
                                  {expandedLevels.has(`node-${node.id}`) ? 
                                    <ChevronDown className="w-3 h-3" /> : 
                                    <ChevronRight className="w-3 h-3" />
                                  }
                                </button>
                                <div className={`w-2 h-2 rounded-full ${
                                  node.type === 'input' ? 'bg-green-500' :
                                  node.type === 'process' ? 'bg-blue-500' :
                                  'bg-purple-500'
                                }`} />
                                <span className="text-xs font-medium">{node.name}</span>
                                <span className="text-xs text-gray-500">({node.type})</span>
                              </div>

                              {/* Stream Level */}
                              {expandedLevels.has(`node-${node.id}`) && (
                                <div className="ml-5 mt-2 space-y-1">
                                  {node.streams.map(stream => (
                                    <div key={stream.id} className="bg-white border rounded p-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <Code className="w-3 h-3 text-gray-400" />
                                          <span className="text-xs text-gray-600">{stream.timestamp}</span>
                                        </div>
                                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                          {stream.tokens} tokens
                                        </span>
                                      </div>
                                      <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                                        <code>{stream.content}</code>
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};