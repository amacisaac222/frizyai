import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { frizyProgressTool, handleFrizyProgress } from './frizy-progress.js';
import { frizyStatusTool, handleFrizyStatus } from './frizy-status.js';
import { frizyContextTool, handleFrizyContext } from './frizy-context.js';
import { frizyInsightTool, handleFrizyInsight } from './frizy-insight.js';

// Export all tools
export const tools: Tool[] = [
  frizyProgressTool,
  frizyStatusTool,
  frizyContextTool,
  frizyInsightTool
];

// Tool handler mapping
export const toolHandlers: Record<string, (args: unknown) => Promise<string>> = {
  frizy_progress: handleFrizyProgress,
  frizy_status: handleFrizyStatus,
  frizy_context: handleFrizyContext,
  frizy_insight: handleFrizyInsight
};

// Helper function to get tool by name
export function getTool(name: string): Tool | undefined {
  return tools.find(tool => tool.name === name);
}

// Helper function to check if tool exists
export function hasToolHandler(name: string): boolean {
  return name in toolHandlers;
}

// Get all tool names
export function getToolNames(): string[] {
  return tools.map(tool => tool.name);
}