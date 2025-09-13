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
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Fast and efficient for analysis
          max_tokens: 4096,
          messages,
          system: systemPrompt || 'You are a helpful AI assistant that analyzes coding sessions and provides insights.'
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.content[0].text,
        model: data.model,
        stop_reason: data.stop_reason
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }

  async analyzeSession(session: Session): Promise<string> {
    const prompt = this.compileSessionToPrompt(session);
    
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Please analyze this coding session and provide insights:\n\n${prompt}`
      }
    ];

    const response = await this.sendMessage(messages);
    return response.content;
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