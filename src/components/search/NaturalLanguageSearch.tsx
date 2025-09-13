import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, Clock, GitBranch, FileText, Hash, ArrowUpRight, X } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'session' | 'block' | 'trace' | 'event' | 'file' | 'commit';
  title: string;
  snippet: string;
  path: string[];
  timestamp?: string;
  relevance: number;
  metadata?: {
    sessionId?: string;
    blockId?: string;
    traceId?: string;
    fileName?: string;
    commitHash?: string;
    branch?: string;
  };
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  results?: SearchResult[];
  timestamp: string;
}

interface GitHubContext {
  currentBranch: string;
  recentCommits: Array<{
    hash: string;
    message: string;
    author: string;
    timestamp: string;
  }>;
  modifiedFiles: string[];
  repository?: string;
}

interface NaturalLanguageSearchProps {
  sessions: any[];
  onNavigate: (type: string, id: string, metadata?: any) => void;
  githubContext?: GitHubContext;
}

export function NaturalLanguageSearch({ sessions, onNavigate, githubContext }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const searchAcrossSessions = (searchQuery: string): SearchResult[] => {
    const results: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();
    const words = queryLower.split(' ').filter(w => w.length > 2);

    // Search through sessions
    sessions.forEach(session => {
      // Search session level
      if (session.title.toLowerCase().includes(queryLower) || 
          session.summary.toLowerCase().includes(queryLower) ||
          words.some(word => session.title.toLowerCase().includes(word) || 
                            session.summary.toLowerCase().includes(word))) {
        results.push({
          id: session.id,
          type: 'session',
          title: session.title,
          snippet: session.summary,
          path: [session.title],
          timestamp: session.startTime,
          relevance: session.title.toLowerCase().includes(queryLower) ? 1.0 : 0.8,
          metadata: { sessionId: session.id }
        });
      }

      // Search blocks
      session.blocks?.forEach(block => {
        if (block.title.toLowerCase().includes(queryLower) || 
            block.summary.toLowerCase().includes(queryLower) ||
            words.some(word => block.title.toLowerCase().includes(word) || 
                              block.summary.toLowerCase().includes(word))) {
          results.push({
            id: block.id,
            type: 'block',
            title: block.title,
            snippet: block.summary,
            path: [session.title, block.title],
            timestamp: block.startTime,
            relevance: block.title.toLowerCase().includes(queryLower) ? 0.9 : 0.7,
            metadata: { sessionId: session.id, blockId: block.id }
          });
        }

        // Search traces
        block.traces?.forEach(trace => {
          if (trace.name.toLowerCase().includes(queryLower) || 
              trace.summary.toLowerCase().includes(queryLower) ||
              words.some(word => trace.name.toLowerCase().includes(word) || 
                                trace.summary.toLowerCase().includes(word))) {
            results.push({
              id: trace.id,
              type: 'trace',
              title: trace.name,
              snippet: trace.summary,
              path: [session.title, block.title, trace.name],
              timestamp: trace.events?.[0]?.timestamp,
              relevance: trace.name.toLowerCase().includes(queryLower) ? 0.8 : 0.6,
              metadata: { sessionId: session.id, blockId: block.id, traceId: trace.id }
            });
          }

          // Search events
          trace.events?.forEach(event => {
            const eventString = `${event.type} ${event.tool || ''} ${JSON.stringify(event.data)}`.toLowerCase();
            if (eventString.includes(queryLower) ||
                words.some(word => eventString.includes(word))) {
              results.push({
                id: event.id,
                type: 'event',
                title: `${event.type}${event.tool ? `: ${event.tool}` : ''}`,
                snippet: JSON.stringify(event.data).slice(0, 100) + '...',
                path: [session.title, block.title, trace.name, event.type],
                timestamp: event.timestamp,
                relevance: 0.5,
                metadata: { sessionId: session.id, blockId: block.id, traceId: trace.id }
              });
            }
          });
        });
      });
    });

    // Sort by relevance and timestamp
    return results.sort((a, b) => {
      if (Math.abs(a.relevance - b.relevance) > 0.1) {
        return b.relevance - a.relevance;
      }
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    }).slice(0, 20);
  };

  const generateNaturalResponse = (query: string, results: SearchResult[]): string => {
    if (results.length === 0) {
      return `I couldn't find any results for "${query}". Try searching for specific tools, file names, or error messages.`;
    }

    const sessionResults = results.filter(r => r.type === 'session');
    const blockResults = results.filter(r => r.type === 'block');
    const traceResults = results.filter(r => r.type === 'trace');
    const eventResults = results.filter(r => r.type === 'event');

    let response = `Found ${results.length} results for "${query}":\n\n`;

    if (sessionResults.length > 0) {
      response += `**Sessions (${sessionResults.length}):**\n`;
      response += sessionResults.slice(0, 3).map(r => `• ${r.title}`).join('\n');
      response += '\n\n';
    }

    if (blockResults.length > 0) {
      response += `**Blocks (${blockResults.length}):**\n`;
      response += blockResults.slice(0, 3).map(r => `• ${r.title} (${r.path[0]})`).join('\n');
      response += '\n\n';
    }

    if (traceResults.length > 0) {
      response += `**Traces (${traceResults.length}):**\n`;
      response += traceResults.slice(0, 3).map(r => `• ${r.title}`).join('\n');
      response += '\n\n';
    }

    if (eventResults.length > 0) {
      response += `**Events (${eventResults.length}):**\n`;
      response += eventResults.slice(0, 3).map(r => `• ${r.title}`).join('\n');
    }

    return response;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSearching(true);
    setQuery('');

    // Simulate search delay
    setTimeout(() => {
      const results = searchAcrossSessions(query);
      const response = generateNaturalResponse(query, results);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        results: results,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsSearching(false);
    }, 500);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'session': return 'bg-emerald-500';
      case 'block': return 'bg-blue-500';
      case 'trace': return 'bg-purple-500';
      case 'event': return 'bg-amber-500';
      case 'file': return 'bg-teal-500';
      case 'commit': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Natural Language Search</h2>
          </div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
          >
            <GitBranch className="h-4 w-4" />
            {showContext ? 'Hide' : 'Show'} Context
          </button>
        </div>

        {/* GitHub Context Panel */}
        {showContext && githubContext && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-4 w-4 text-green-400" />
              <span className="text-gray-300">Branch:</span>
              <span className="text-white font-mono">{githubContext.currentBranch}</span>
            </div>
            {githubContext.repository && (
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">Repository:</span>
                <span className="text-white">{githubContext.repository}</span>
              </div>
            )}
            {githubContext.modifiedFiles.length > 0 && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-amber-400 mt-0.5" />
                <div>
                  <span className="text-gray-300">Modified:</span>
                  <div className="text-white text-xs mt-1">
                    {githubContext.modifiedFiles.slice(0, 3).join(', ')}
                    {githubContext.modifiedFiles.length > 3 && 
                      ` +${githubContext.modifiedFiles.length - 3} more`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Ask anything about your sessions</p>
            <p className="text-sm">Try: "Show me all debugging blocks" or "Find errors in the last session"</p>
          </div>
        )}

        {messages.map(message => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : ''}`}>
              <div className={`rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-100'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>

              {/* Search Results */}
              {message.results && message.results.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.results.slice(0, 5).map(result => (
                    <div
                      key={result.id}
                      onClick={() => onNavigate(result.type, result.id, result.metadata)}
                      className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getTypeColor(result.type)}`} />
                            <span className="text-xs text-gray-400 uppercase">{result.type}</span>
                            {result.timestamp && (
                              <>
                                <Clock className="h-3 w-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {new Date(result.timestamp).toLocaleTimeString()}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="font-medium text-sm">{result.title}</div>
                          <div className="text-xs text-gray-400 mt-1">{result.snippet}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {result.path.join(' → ')}
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-gray-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                  {message.results.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{message.results.length - 5} more results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isSearching && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animation-delay-400"></div>
                </div>
                <span className="text-sm text-gray-400">Searching...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ask about sessions, blocks, errors, or any pattern..."
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Search
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          {['Show all errors', 'Recent file changes', 'Active tasks', 'Tool usage'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => {
                setQuery(suggestion);
                inputRef.current?.focus();
              }}
              className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-750 hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}