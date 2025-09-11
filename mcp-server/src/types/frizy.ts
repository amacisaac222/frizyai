import { z } from 'zod';

// Block status and lane types
export const BlockStatus = {
  not_started: 'not_started',
  in_progress: 'in_progress', 
  blocked: 'blocked',
  completed: 'completed',
  archived: 'archived'
} as const;

export const BlockLane = {
  vision: 'vision',
  goals: 'goals',
  current: 'current',
  next: 'next',
  context: 'context'
} as const;

export const BlockPriority = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent'
} as const;

// Zod schemas for validation
export const BlockProgressSchema = z.object({
  blockId: z.string(),
  progress: z.number().min(0).max(100),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const BlockStatusSchema = z.object({
  blockId: z.string(),
  status: z.enum([
    BlockStatus.not_started,
    BlockStatus.in_progress,
    BlockStatus.blocked,
    BlockStatus.completed,
    BlockStatus.archived
  ]),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const ContextItemSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['decision', 'solution', 'idea', 'reference', 'learning']),
  tags: z.array(z.string()).default([]),
  relatedBlockIds: z.array(z.string()).default([]),
  importance: z.enum(['low', 'medium', 'high']).default('medium'),
  source: z.string().default('claude_conversation'),
  metadata: z.record(z.any()).optional()
});

export const InsightSchema = z.object({
  projectId: z.string(),
  type: z.enum(['decision', 'problem_solution', 'idea', 'learning', 'blocker', 'next_step']),
  title: z.string(),
  content: z.string(),
  relatedBlockIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  importance: z.enum(['low', 'medium', 'high']).default('medium'),
  confidence: z.number().min(0).max(1).default(0.8),
  metadata: z.record(z.any()).optional()
});

// TypeScript types
export type BlockStatusType = keyof typeof BlockStatus;
export type BlockLaneType = keyof typeof BlockLane;
export type BlockPriorityType = keyof typeof BlockPriority;

export type BlockProgressInput = z.infer<typeof BlockProgressSchema>;
export type BlockStatusInput = z.infer<typeof BlockStatusSchema>;
export type ContextItemInput = z.infer<typeof ContextItemSchema>;
export type InsightInput = z.infer<typeof InsightSchema>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Block {
  id: string;
  title: string;
  content: string;
  status: BlockStatusType;
  lane: BlockLaneType;
  priority: BlockPriorityType;
  progress: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}