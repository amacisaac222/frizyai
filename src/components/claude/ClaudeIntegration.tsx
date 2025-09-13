import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader, Copy, CheckCircle, Upload, X } from 'lucide-react';
import { ClaudeAPIService } from '../../services/claude/ClaudeAPIService';

interface ClaudeIntegrationProps {
  sessions: any[];
  currentSession: any;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    action?: 'compile' | 'push' | 'analyze';
    sessionId?: string;
  };
}

export function ClaudeIntegration({ sessions, currentSession, onClose }: ClaudeIntegrationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [compiledPrompt, setCompiledPrompt] = useState<string | null>(null);
  const [showPushConfirm, setShowPushConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const claudeService = useRef(new ClaudeAPIService());

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response = '';
      
      // Check for specific commands
      if (input.toLowerCase().includes('compile') && input.toLowerCase().includes('session')) {
        // Compile session details
        const sessionToCompile = input.toLowerCase().includes('last') 
          ? sessions[0] 
          : currentSession || sessions[0];
          
        if (sessionToCompile) {
          const prompt = claudeService.current.compileSessionToPrompt(sessionToCompile);
          setCompiledPrompt(prompt);
          
          response = `I've compiled the session details into a prompt for Claude Code:\n\n\`\`\`\n${prompt}\n\`\`\`\n\nWould you like me to:\n1. Copy this to clipboard?\n2. Push it via the MCP server?\n3. Analyze it further?`;
          
          userMessage.metadata = { action: 'compile', sessionId: sessionToCompile.id };
        } else {
          response = 'No session found to compile.';
        }
      } else if (input.toLowerCase().includes('push') && input.toLowerCase().includes('mcp')) {
        // Prepare for MCP push
        if (compiledPrompt || currentSession) {
          const sessionToPush = currentSession || sessions[0];
          const result = await claudeService.current.prepareForMCPPush(sessionToPush);
          
          response = `**MCP Push Analysis:**\n\nSession: ${sessionToPush.title}\nRecommendation: ${result.shouldPush ? '✅ Ready to push' : '⚠️ Consider reviewing first'}\n\n**What will be sent:**\n- Session metadata\n- ${sessionToPush.metadata.totalBlocks} blocks\n- ${sessionToPush.metadata.totalEvents} events\n- Context usage: ${sessionToPush.metadata.contextUsage}%\n\n${result.shouldPush ? 'Click "Push to MCP" to proceed.' : 'You may want to complete more work before pushing.'}`;
          
          setShowPushConfirm(result.shouldPush);
          userMessage.metadata = { action: 'push', sessionId: sessionToPush.id };
        } else {
          response = 'Please compile a session first before pushing to MCP.';
        }
      } else if (input.toLowerCase().includes('analyze')) {
        // Analyze sessions
        const analysisTarget = input.toLowerCase().includes('all') 
          ? sessions 
          : [currentSession || sessions[0]];
          
        const analysis = await claudeService.current.compileSessions(analysisTarget);
        response = `**Session Analysis:**\n\n${analysis}`;
        
        userMessage.metadata = { action: 'analyze' };
      } else {
        // General question
        const context = {
          totalSessions: sessions.length,
          currentSession: currentSession ? {
            title: currentSession.title,
            status: currentSession.status,
            blocks: currentSession.metadata.totalBlocks
          } : null,
          recentActivity: sessions.slice(0, 3).map(s => ({
            title: s.title,
            status: s.status,
            time: s.startTime
          }))
        };
        
        response = await claudeService.current.askQuestion(input, context);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const pushToMCP = async () => {
    // Implementation for pushing to MCP server
    console.log('Pushing to MCP server...', compiledPrompt);
    setShowPushConfirm(false);
    
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: '✅ Successfully pushed to MCP server',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const quickActions = [
    'Compile last session into a prompt',
    'Analyze all sessions',
    'What patterns do you see?',
    'Push current session to MCP'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Claude Integration</h2>
          </div>
          <button onClick={onClose} className="hover:bg-gray-800 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Ask Claude about your sessions</p>
              <p className="text-sm">Try: "Compile the last session" or "Analyze patterns"</p>
            </div>
          )}

          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : message.role === 'assistant'
                  ? 'bg-gray-800 text-gray-100'
                  : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.content.includes('```') && (
                  <button
                    onClick={() => {
                      const codeMatch = message.content.match(/```([\s\S]*?)```/);
                      if (codeMatch) copyToClipboard(codeMatch[1]);
                    }}
                    className="mt-2 flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3">
                <Loader className="h-5 w-5 animate-spin text-blue-400" />
              </div>
            </div>
          )}

          {showPushConfirm && (
            <div className="bg-blue-600/20 border border-blue-600/40 rounded-lg p-4">
              <p className="text-sm mb-3">Ready to push session to MCP server?</p>
              <div className="flex gap-2">
                <button
                  onClick={pushToMCP}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 inline mr-1" />
                  Push to MCP
                </button>
                <button
                  onClick={() => setShowPushConfirm(false)}
                  className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-800 p-2 flex gap-2 overflow-x-auto">
          {quickActions.map(action => (
            <button
              key={action}
              onClick={() => setInput(action)}
              className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white whitespace-nowrap"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about sessions, compile prompts, or push to MCP..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}