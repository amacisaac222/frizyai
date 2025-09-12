import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.js';
import { ContextService } from './context-service.js';
import {
  FrizyCreateBlockSchema,
  FrizyMoveBlockSchema,
  FrizyUpdateProgressSchema,
  FrizyCaptureContextSchema,
} from './types.js';

export class FrizyMCPServer {
  private server: Server;
  private db: Database;
  private contextService: ContextService;

  constructor(database: Database, contextService: ContextService) {
    this.db = database;
    this.contextService = contextService;
    
    this.server = new Server(
      {
        name: 'frizy-orchestrator',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'frizy_create_block',
            description: 'Create a new block in the project board',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'UUID of the project'
                },
                title: {
                  type: 'string',
                  description: 'Title of the block'
                },
                content: {
                  type: 'string',
                  description: 'Optional content/description of the block'
                },
                lane: {
                  type: 'string',
                  enum: ['vision', 'goals', 'current', 'next', 'context'],
                  description: 'Which lane to place the block in',
                  default: 'current'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Priority level of the block',
                  default: 'medium'
                },
                effort: {
                  type: 'number',
                  description: 'Effort estimation (1-10 scale)'
                }
              },
              required: ['project_id', 'title']
            }
          },
          {
            name: 'frizy_move_block',
            description: 'Move a block to a different lane',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'UUID of the project'
                },
                block_id: {
                  type: 'string',
                  description: 'UUID of the block to move'
                },
                lane: {
                  type: 'string',
                  enum: ['vision', 'goals', 'current', 'next', 'context'],
                  description: 'Target lane'
                }
              },
              required: ['project_id', 'block_id', 'lane']
            }
          },
          {
            name: 'frizy_update_progress',
            description: 'Update the progress percentage of a block',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'UUID of the project'
                },
                block_id: {
                  type: 'string',
                  description: 'UUID of the block to update'
                },
                progress: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: 'Progress percentage (0-100)'
                }
              },
              required: ['project_id', 'block_id', 'progress']
            }
          },
          {
            name: 'frizy_capture_context',
            description: 'Capture important context, decisions, or insights for the project',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'UUID of the project'
                },
                type: {
                  type: 'string',
                  enum: ['decision', 'insight', 'blocker', 'solution', 'reference', 'note'],
                  description: 'Type of context being captured'
                },
                title: {
                  type: 'string',
                  description: 'Optional title for the context item'
                },
                content: {
                  type: 'string',
                  description: 'The context content'
                },
                block_id: {
                  type: 'string',
                  description: 'Optional UUID of related block'
                }
              },
              required: ['project_id', 'type', 'content']
            }
          },
          {
            name: 'frizy_get_context',
            description: 'Get relevant project context for current work',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'UUID of the project'
                },
                user_query: {
                  type: 'string',
                  description: 'Optional query to focus the context retrieval'
                },
                max_tokens: {
                  type: 'number',
                  description: 'Maximum tokens for the response',
                  default: 4000
                }
              },
              required: ['project_id']
            }
          },
          {
            name: 'frizy_list_blocks',
            description: 'List all blocks in a project, optionally filtered by lane or status',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'UUID of the project'
                },
                lane: {
                  type: 'string',
                  enum: ['vision', 'goals', 'current', 'next', 'context'],
                  description: 'Optional lane filter'
                },
                status: {
                  type: 'string',
                  enum: ['not_started', 'in_progress', 'completed', 'blocked', 'cancelled'],
                  description: 'Optional status filter'
                }
              },
              required: ['project_id']
            }
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'frizy_create_block':
            return await this.handleCreateBlock(args);
            
          case 'frizy_move_block':
            return await this.handleMoveBlock(args);
            
          case 'frizy_update_progress':
            return await this.handleUpdateProgress(args);
            
          case 'frizy_capture_context':
            return await this.handleCaptureContext(args);
            
          case 'frizy_get_context':
            return await this.handleGetContext(args);
            
          case 'frizy_list_blocks':
            return await this.handleListBlocks(args);
            
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Tool ${name} not found`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`Error handling tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private setupResourceHandlers() {
    // We can add resource handlers here later for providing context files, etc.
  }

  private async handleCreateBlock(args: any) {
    const validatedArgs = FrizyCreateBlockSchema.parse(args);
    
    const blockId = uuidv4();
    const event = await this.db.createEvent({
      project_id: validatedArgs.project_id,
      type: 'block.created',
      payload: {
        id: blockId,
        title: validatedArgs.title,
        content: validatedArgs.content,
        lane: validatedArgs.lane,
        priority: validatedArgs.priority,
        effort: validatedArgs.effort,
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created block "${validatedArgs.title}" in ${validatedArgs.lane} lane\n` +
                `Block ID: ${blockId}\n` +
                `Event ID: ${event.id}\n` +
                `Priority: ${validatedArgs.priority}`
        }
      ]
    };
  }

  private async handleMoveBlock(args: any) {
    const validatedArgs = FrizyMoveBlockSchema.parse(args);
    
    // Verify block exists
    const block = await this.db.getBlock(validatedArgs.block_id);
    if (!block) {
      throw new McpError(ErrorCode.InvalidParams, `Block ${validatedArgs.block_id} not found`);
    }

    const event = await this.db.createEvent({
      project_id: validatedArgs.project_id,
      type: 'block.moved',
      payload: {
        id: validatedArgs.block_id,
        lane: validatedArgs.lane,
        previous_lane: block.lane
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Moved block "${block.title}" from ${block.lane} to ${validatedArgs.lane}\n` +
                `Event ID: ${event.id}`
        }
      ]
    };
  }

  private async handleUpdateProgress(args: any) {
    const validatedArgs = FrizyUpdateProgressSchema.parse(args);
    
    const block = await this.db.getBlock(validatedArgs.block_id);
    if (!block) {
      throw new McpError(ErrorCode.InvalidParams, `Block ${validatedArgs.block_id} not found`);
    }

    const event = await this.db.createEvent({
      project_id: validatedArgs.project_id,
      type: 'block.progress_updated',
      payload: {
        id: validatedArgs.block_id,
        progress: validatedArgs.progress,
        previous_progress: block.progress
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Updated progress for "${block.title}" to ${validatedArgs.progress}%\n` +
                `Previous: ${block.progress}%\n` +
                `Event ID: ${event.id}`
        }
      ]
    };
  }

  private async handleCaptureContext(args: any) {
    const validatedArgs = FrizyCaptureContextSchema.parse(args);
    
    const contextId = uuidv4();
    const event = await this.db.createEvent({
      project_id: validatedArgs.project_id,
      type: 'context.captured',
      payload: {
        id: contextId,
        type: validatedArgs.type,
        title: validatedArgs.title,
        content: validatedArgs.content,
        block_id: validatedArgs.block_id,
        source: 'mcp'
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Captured ${validatedArgs.type}: ${validatedArgs.title || 'Untitled'}\n` +
                `Context ID: ${contextId}\n` +
                `Event ID: ${event.id}\n` +
                `Content: ${validatedArgs.content.slice(0, 100)}${validatedArgs.content.length > 100 ? '...' : ''}`
        }
      ]
    };
  }

  private async handleGetContext(args: any) {
    const { project_id, user_query, max_tokens = 4000 } = args;
    
    const contextPreview = await this.contextService.generateContextPreview(project_id, {
      maxTokens: max_tokens,
      userQuery: user_query
    });

    const formattedContent = this.formatContextPreview(contextPreview);

    return {
      content: [
        {
          type: 'text',
          text: formattedContent
        }
      ]
    };
  }

  private async handleListBlocks(args: any) {
    const { project_id, lane, status } = args;
    
    const blocks = await this.db.getBlocksByProject(project_id);
    
    const filteredBlocks = blocks.filter(block => {
      if (lane && block.lane !== lane) return false;
      if (status && block.status !== status) return false;
      return true;
    });

    const formattedBlocks = filteredBlocks.map(block => 
      `• ${block.title} [${block.lane}] - ${block.status} (${block.progress}%)`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `📋 Project Blocks ${lane ? `(${lane} lane)` : ''} ${status ? `(${status})` : ''}\n\n` +
                `${formattedBlocks || 'No blocks found matching criteria'}\n\n` +
                `Total: ${filteredBlocks.length} blocks`
        }
      ]
    };
  }

  private formatContextPreview(preview: any): string {
    const sections = [
      `🎯 Project Context Preview`,
      `Generated: ${new Date(preview.generated_at).toLocaleString()}`,
      `Items: ${preview.preview.length}/${preview.total_items}`,
      '',
      `📖 Summary:`,
      preview.summary,
      '',
      `🔍 Key Context Items:`
    ];

    preview.preview.forEach((item: any, index: number) => {
      sections.push(
        `${index + 1}. [${item.type}] ${item.title || 'Untitled'} (score: ${item.score.toFixed(2)})`,
        `   ${item.content.slice(0, 150)}${item.content.length > 150 ? '...' : ''}`,
        `   Links: ${item.links.join(', ')}`,
        ''
      );
    });

    return sections.join('\n');
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Frizy MCP Server started');
  }

  async stop() {
    await this.server.close();
    await this.db.close();
  }
}