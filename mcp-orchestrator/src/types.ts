import { z } from 'zod';

// Event types for the event-sourced architecture
export const EventTypeSchema = z.enum([
  'block.created',
  'block.updated',
  'block.moved',
  'block.deleted',
  'block.progress_updated',
  'context.captured',
  'context.linked',
  'session.started',
  'session.ended',
  'github.pr.opened',
  'github.pr.merged',
  'github.commit.pushed',
  'project.created',
  'project.updated'
]);

export type EventType = z.infer<typeof EventTypeSchema>;

// Database event structure
export const EventSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: EventTypeSchema,
  actor_id: z.string().uuid().optional(),
  payload: z.record(z.any()),
  created_at: z.string().datetime()
});

export type Event = z.infer<typeof EventSchema>;

// Block-related schemas
export const BlockLaneSchema = z.enum(['vision', 'goals', 'current', 'next', 'context']);
export const BlockStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'cancelled']);
export const BlockPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const BlockSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().optional(),
  lane: BlockLaneSchema,
  status: BlockStatusSchema.default('not_started'),
  priority: BlockPrioritySchema.default('medium'),
  progress: z.number().int().min(0).max(100).default(0),
  effort: z.number().int().min(1).optional(),
  last_worked_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type Block = z.infer<typeof BlockSchema>;

// Context item schemas
export const ContextTypeSchema = z.enum(['decision', 'insight', 'blocker', 'solution', 'reference', 'note']);

export const ContextItemSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  type: ContextTypeSchema,
  title: z.string().optional(),
  content: z.string(),
  source: z.string().default('mcp'),
  author_id: z.string().uuid().optional(),
  created_at: z.string().datetime()
});

export type ContextItem = z.infer<typeof ContextItemSchema>;

// MCP tool call schemas
export const FrizyCreateBlockSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().optional(),
  lane: BlockLaneSchema.default('current'),
  priority: BlockPrioritySchema.default('medium'),
  effort: z.number().int().min(1).optional()
});

export const FrizyMoveBlockSchema = z.object({
  project_id: z.string().uuid(),
  block_id: z.string().uuid(),
  lane: BlockLaneSchema
});

export const FrizyUpdateProgressSchema = z.object({
  project_id: z.string().uuid(),
  block_id: z.string().uuid(),
  progress: z.number().int().min(0).max(100)
});

export const FrizyCaptureContextSchema = z.object({
  project_id: z.string().uuid(),
  type: ContextTypeSchema,
  title: z.string().optional(),
  content: z.string(),
  block_id: z.string().uuid().optional()
});

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  event_id: z.string().uuid().optional()
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// Project context preview schema
export const ContextPreviewItemSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string().optional(),
  content: z.string(),
  score: z.number().min(0).max(1),
  source: z.string(),
  links: z.array(z.string()).default([]),
  created_at: z.string().datetime()
});

export const ContextPreviewSchema = z.object({
  project_id: z.string().uuid(),
  preview: z.array(ContextPreviewItemSchema),
  summary: z.string(),
  total_items: z.number(),
  generated_at: z.string().datetime()
});

export type ContextPreview = z.infer<typeof ContextPreviewSchema>;
export type ContextPreviewItem = z.infer<typeof ContextPreviewItemSchema>;

// MCP connection info
export interface MCPConnectionInfo {
  project_id: string;
  connection_string: string;
  api_key: string;
  created_at: string;
}