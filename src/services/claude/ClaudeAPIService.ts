import { Session, Block, Trace, RawEvent } from '../../pages/IDESessionDashboard';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: string;
  model: string;
  stop_reason?: string;
}

export class ClaudeAPIService {
  private apiKey: string;
  private apiUrl = 'https://api.anthropic.com/v1/messages';
  
  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Claude API key not found in environment variables');
    }
  }

  async sendMessage(messages: ClaudeMessage[], systemPrompt?: string): Promise<ClaudeResponse> {
    try {
      // Check if we have an API key
      if (!this.apiKey) {
        // Return a simulated response when no API key is available
        return this.getSimulatedResponse(messages, systemPrompt);
      }

      // Note: Direct API calls from browser will fail due to CORS
      // In production, you would need a backend proxy
      // For now, we'll use simulated responses

      // Uncomment this code when you have a backend proxy:
      /*
      const response = await fetch('/api/claude', { // Use your backend proxy endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.content,
        model: data.model,
        stop_reason: data.stop_reason
      };
      */

      // For now, return simulated response
      return this.getSimulatedResponse(messages, systemPrompt);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      // Return a helpful error message instead of throwing
      return {
        content: 'I\'m currently unable to connect to the Claude API. However, I can still help you compile and analyze your sessions locally. Try commands like "compile session" or "analyze patterns".',
        model: 'simulated',
        stop_reason: 'error'
      };
    }
  }

  private getSimulatedResponse(messages: ClaudeMessage[], systemPrompt?: string): ClaudeResponse {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

    let content = '';

    if (lastMessage.includes('compile') && lastMessage.includes('session')) {
      content = 'I\'ve analyzed the session data. The compilation is ready in the code block above. You can copy it to use in your next Claude conversation or push it to the MCP server for persistence.';
    } else if (lastMessage.includes('analyze')) {
      content = `Based on the session data:\n\n**Key Insights:**\n- Total blocks completed: Multiple productive work blocks\n- Context usage is optimal\n- Good balance between exploration and implementation\n\n**Recommendations:**\n1. Consider breaking down larger blocks into smaller tasks\n2. The current session structure is well-organized\n3. Context usage is efficient`;
    } else if (lastMessage.includes('push') && lastMessage.includes('mcp')) {
      content = 'Ready to push to MCP server. The compiled context will be sent via WebSocket to ensure it\'s available for your next session.';
    } else {
      content = `I can help you with:\n- **Compile session**: Create a detailed prompt from your session data\n- **Analyze patterns**: Review your coding patterns and productivity\n- **Push to MCP**: Send context to the MCP server\n- **Show blockers**: Identify any blocking issues\n\nWhat would you like to do?`;
    }

    return {
      content,
      model: 'simulated-response',
      stop_reason: 'stop_sequence'
    };
  }

  async analyzeSession(session: Session): Promise<string> {
    const prompt = this.compileSessionToPrompt(session);

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Please analyze this coding session and provide insights:\n\n${prompt}`
      }
    ];

    try {
      const response = await this.sendMessage(messages);
      return response.content;
    } catch (error) {
      // Return a local analysis if API fails
      return `📊 **Local Session Analysis**\n\n` +
        `**Session:** ${session.title}\n` +
        `**Status:** ${session.status}\n` +
        `**Duration:** ${session.metadata.duration} minutes\n` +
        `**Context Usage:** ${session.metadata.contextUsage}%\n\n` +
        `**Activity Summary:**\n` +
        `- Total Blocks: ${session.metadata.totalBlocks}\n` +
        `- Total Events: ${session.metadata.totalEvents}\n` +
        `${session.metadata.endReason ? `- End Reason: ${session.metadata.endReason}\n` : ''}\n\n` +
        `**Recommendations:**\n` +
        `✅ Session data successfully compiled\n` +
        `✅ Ready to push to MCP server\n` +
        `💡 Use the compile button to get the full context`;
    }
  }

  compileSessionToPrompt(session: Session): string {
    let prompt = `## Session: ${session.title}\n`;
    prompt += `**Status**: ${session.status}\n`;
    prompt += `**Duration**: ${session.metadata.duration} minutes\n`;
    prompt += `**Context Usage**: ${session.metadata.contextUsage}%\n`;
    prompt += `**Summary**: ${session.summary}\n\n`;

    if (session.blocks && session.blocks.length > 0) {
      prompt += `### Blocks (${session.blocks.length}):\n`;
      
      session.blocks.forEach((block, index) => {
        prompt += `\n${index + 1}. **${block.title}** (${block.type})\n`;
        prompt += `   Status: ${block.status}\n`;
        prompt += `   Summary: ${block.summary}\n`;
        
        if (block.metrics) {
          prompt += `   Metrics:\n`;
          prompt += `   - Files Modified: ${block.metrics.filesModified}\n`;
          prompt += `   - Lines Changed: ${block.metrics.linesChanged}\n`;
          prompt += `   - Tools Used: ${block.metrics.toolsUsed.join(', ')}\n`;
        }

        if (block.traces && block.traces.length > 0) {
          prompt += `   Traces: ${block.traces.length} operations\n`;
        }
      });
    }

    prompt += `\n### Key Metrics:\n`;
    prompt += `- Total Events: ${session.metadata.totalEvents}\n`;
    prompt += `- Total Blocks: ${session.metadata.totalBlocks}\n`;
    
    if (session.metadata.endReason) {
      prompt += `- End Reason: ${session.metadata.endReason.replace('_', ' ')}\n`;
    }

    return prompt;
  }

  async compileSessions(sessions: Session[]): Promise<string> {
    let compilation = `# Session Compilation Report\n\n`;
    compilation += `Total Sessions: ${sessions.length}\n\n`;

    const activeSessions = sessions.filter(s => s.status === 'active');
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const contextExceededSessions = sessions.filter(s => s.status === 'context_exceeded');

    compilation += `## Overview\n`;
    compilation += `- Active: ${activeSessions.length}\n`;
    compilation += `- Completed: ${completedSessions.length}\n`;
    compilation += `- Context Exceeded: ${contextExceededSessions.length}\n\n`;

    // Add recent sessions detail
    compilation += `## Recent Sessions\n\n`;
    sessions.slice(0, 5).forEach(session => {
      compilation += this.compileSessionToPrompt(session);
      compilation += '\n---\n\n';
    });

    return compilation;
  }

  async askQuestion(question: string, context: any): Promise<string> {
    const systemPrompt = `You are an AI assistant integrated with a development environment. 
You have access to session data, blocks, traces, and events from coding sessions.
You can help compile session details, analyze patterns, and provide insights.
When asked about pushing to MCP server, you should explain what would be sent.`;

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Context: ${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`
      }
    ];

    const response = await this.sendMessage(messages, systemPrompt);
    return response.content;
  }

  async prepareForMCPPush(session: Session): Promise<{
    prompt: string;
    metadata: any;
    shouldPush: boolean;
  }> {
    const prompt = this.compileSessionToPrompt(session);
    
    const metadata = {
      sessionId: session.id,
      title: session.title,
      timestamp: session.startTime,
      contextUsage: session.metadata.contextUsage,
      blocksCount: session.metadata.totalBlocks,
      eventsCount: session.metadata.totalEvents
    };

    // Ask Claude if this should be pushed
    const analysisPrompt = `Should this session be pushed to the MCP server? Consider:
1. Is the session complete or meaningful?
2. Does it contain valuable context?
3. Is the context usage significant?

Session: ${prompt}`;

    const response = await this.sendMessage([
      { role: 'user', content: analysisPrompt }
    ]);

    const shouldPush = response.content.toLowerCase().includes('yes') || 
                      response.content.toLowerCase().includes('should be pushed');

    return {
      prompt,
      metadata,
      shouldPush
    };
  }
}