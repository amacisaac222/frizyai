import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import logger from '../utils/logger.js';
import { frizyApi } from '../services/frizy-api.js';
import { BlockStatusSchema, BlockStatus } from '../types/frizy.js';

export const frizyStatusTool: Tool = {
  name: 'frizy_status',
  description: 'Update the status of a block in Frizy.ai project management system. Use this when a task changes state (started, completed, blocked, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      blockId: {
        type: 'string',
        description: 'The ID of the block to update status for'
      },
      status: {
        type: 'string',
        enum: [
          BlockStatus.not_started,
          BlockStatus.in_progress,
          BlockStatus.blocked,
          BlockStatus.completed,
          BlockStatus.archived
        ],
        description: 'New status for the block'
      },
      notes: {
        type: 'string',
        description: 'Optional notes about the status change'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about the status update',
        additionalProperties: true
      }
    },
    required: ['blockId', 'status']
  }
};

export async function handleFrizyStatus(args: unknown): Promise<string> {
  try {
    // Validate input
    const input = BlockStatusSchema.parse(args);
    
    logger.info('Updating block status', { 
      blockId: input.blockId, 
      newStatus: input.status,
      notes: input.notes 
    });

    // Update block status via API
    const updatedBlock = await frizyApi.updateBlockStatus(input);
    
    logger.info('Block status updated successfully', {
      blockId: updatedBlock.id,
      title: updatedBlock.title,
      oldStatus: 'unknown', // We don't have the old status
      newStatus: updatedBlock.status,
      progress: updatedBlock.progress
    });

    const statusMessages = {
      [BlockStatus.not_started]: 'marked as not started',
      [BlockStatus.in_progress]: 'marked as in progress', 
      [BlockStatus.blocked]: 'marked as blocked',
      [BlockStatus.completed]: 'marked as completed',
      [BlockStatus.archived]: 'archived'
    };

    const statusMessage = statusMessages[updatedBlock.status] || `updated to ${updatedBlock.status}`;
    
    return `Successfully ${statusMessage} block "${updatedBlock.title}". Current progress: ${updatedBlock.progress}%.${input.notes ? ` Notes: ${input.notes}` : ''}`;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Failed to update block status', { error: errorMessage, args });
    
    if (error instanceof z.ZodError) {
      return `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }
    
    return `Failed to update block status: ${errorMessage}`;
  }
}