import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import logger from '../utils/logger.js';
import { frizyApi } from '../services/frizy-api.js';
import { InsightSchema } from '../types/frizy.js';

export const frizyInsightTool: Tool = {
  name: 'frizy_insight',
  description: 'Capture key insights from conversations for Frizy.ai project intelligence. Use this for important discoveries, patterns, or realizations that emerge during work.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The ID of the project this insight relates to'
      },
      type: {
        type: 'string',
        enum: ['decision', 'problem_solution', 'idea', 'learning', 'blocker', 'next_step'],
        description: 'Type of insight being captured'
      },
      title: {
        type: 'string',
        description: 'A concise title for this insight'
      },
      content: {
        type: 'string',
        description: 'Detailed explanation of the insight'
      },
      relatedBlockIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of blocks this insight relates to',
        default: []
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to categorize this insight',
        default: []
      },
      importance: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Importance level of this insight',
        default: 'medium'
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confidence level in this insight (0-1)',
        default: 0.8
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about this insight',
        additionalProperties: true
      }
    },
    required: ['projectId', 'type', 'title', 'content']
  }
};

export async function handleFrizyInsight(args: unknown): Promise<string> {
  try {
    // Validate input
    const input = InsightSchema.parse(args);
    
    logger.info('Capturing insight', { 
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      importance: input.importance,
      confidence: input.confidence,
      tagsCount: input.tags.length,
      relatedBlocksCount: input.relatedBlockIds.length
    });

    // Capture insight via API
    const result = await frizyApi.captureInsight({
      ...input,
      metadata: {
        ...input.metadata,
        capturedAt: new Date().toISOString(),
        source: 'claude_conversation',
        confidenceLevel: input.confidence
      }
    });
    
    logger.info('Insight captured successfully', {
      insightId: result.id,
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      confidence: input.confidence
    });

    const typeLabels = {
      decision: 'Decision',
      problem_solution: 'Problem Solution',
      idea: 'Idea',
      learning: 'Learning',
      blocker: 'Blocker',
      next_step: 'Next Step'
    };

    const typeLabel = typeLabels[input.type] || input.type;
    const confidencePercent = Math.round(input.confidence * 100);
    
    return `Successfully captured ${typeLabel.toLowerCase()}: "${input.title}" with ${confidencePercent}% confidence. ${input.relatedBlockIds.length > 0 ? `Linked to ${input.relatedBlockIds.length} block(s). ` : ''}${input.importance === 'high' ? 'Marked as high importance. ' : ''}${input.tags.length > 0 ? `Tags: ${input.tags.join(', ')}.` : ''}`;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Failed to capture insight', { error: errorMessage, args });
    
    if (error instanceof z.ZodError) {
      return `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }
    
    return `Failed to capture insight: ${errorMessage}`;
  }
}