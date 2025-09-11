import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import logger from '../utils/logger.js';
import { frizyApi } from '../services/frizy-api.js';
import { BlockProgressSchema } from '../types/frizy.js';

export const frizyProgressTool: Tool = {
  name: 'frizy_progress',
  description: 'Update the progress of a block in Frizy.ai project management system. Use this when you help users make progress on specific tasks or blocks.',
  inputSchema: {
    type: 'object',
    properties: {
      blockId: {
        type: 'string',
        description: 'The ID of the block to update progress for'
      },
      progress: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Progress percentage (0-100)'
      },
      notes: {
        type: 'string',
        description: 'Optional notes about the progress update'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about the progress update',
        additionalProperties: true
      }
    },
    required: ['blockId', 'progress']
  }
};

export async function handleFrizyProgress(args: unknown): Promise<string> {
  try {
    // Validate input
    const input = BlockProgressSchema.parse(args);
    
    logger.info('Updating block progress', { 
      blockId: input.blockId, 
      progress: input.progress 
    });

    // Update block progress via API
    const updatedBlock = await frizyApi.updateBlockProgress(input);
    
    logger.info('Block progress updated successfully', {
      blockId: updatedBlock.id,
      title: updatedBlock.title,
      newProgress: updatedBlock.progress,
      status: updatedBlock.status
    });

    return `Successfully updated progress for block "${updatedBlock.title}" to ${updatedBlock.progress}%. Current status: ${updatedBlock.status}.`;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Failed to update block progress', { error: errorMessage, args });
    
    if (error instanceof z.ZodError) {
      return `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }
    
    return `Failed to update block progress: ${errorMessage}`;
  }
}