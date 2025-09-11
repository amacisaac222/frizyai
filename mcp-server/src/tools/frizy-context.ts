import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import logger from '../utils/logger.js';
import { frizyApi } from '../services/frizy-api.js';
import { ContextItemSchema } from '../types/frizy.js';

export const frizyContextTool: Tool = {
  name: 'frizy_context',
  description: 'Save important context from conversations to Frizy.ai. Use this to capture decisions, solutions, references, or learnings that should be preserved for the project.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The ID of the project this context relates to'
      },
      title: {
        type: 'string',
        description: 'A brief, descriptive title for this context item'
      },
      content: {
        type: 'string',
        description: 'The detailed content or explanation'
      },
      type: {
        type: 'string',
        enum: ['decision', 'solution', 'idea', 'reference', 'learning'],
        description: 'Type of context being saved'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to categorize this context',
        default: []
      },
      relatedBlockIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of blocks this context relates to',
        default: []
      },
      importance: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Importance level of this context',
        default: 'medium'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about this context',
        additionalProperties: true
      }
    },
    required: ['projectId', 'title', 'content', 'type']
  }
};

export async function handleFrizyContext(args: unknown): Promise<string> {
  try {
    // Validate input
    const input = ContextItemSchema.parse(args);
    
    logger.info('Creating context item', { 
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      importance: input.importance,
      tagsCount: input.tags.length,
      relatedBlocksCount: input.relatedBlockIds.length
    });

    // Create context item via API
    const result = await frizyApi.createContextItem({
      ...input,
      source: 'claude_conversation',
      metadata: {
        ...input.metadata,
        capturedAt: new Date().toISOString(),
        conversationContext: true
      }
    });
    
    logger.info('Context item created successfully', {
      contextId: result.id,
      projectId: input.projectId,
      type: input.type,
      title: input.title
    });

    const typeLabels = {
      decision: 'decision',
      solution: 'solution', 
      idea: 'idea',
      reference: 'reference',
      learning: 'learning'
    };

    const typeLabel = typeLabels[input.type] || input.type;
    
    return `Successfully saved ${typeLabel} "${input.title}" to project context. ${input.relatedBlockIds.length > 0 ? `Linked to ${input.relatedBlockIds.length} block(s).` : ''} ${input.tags.length > 0 ? `Tagged: ${input.tags.join(', ')}.` : ''}`;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Failed to create context item', { error: errorMessage, args });
    
    if (error instanceof z.ZodError) {
      return `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }
    
    return `Failed to save context: ${errorMessage}`;
  }
}