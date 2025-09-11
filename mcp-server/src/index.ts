#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import logger from './utils/logger.js';
import { tools, toolHandlers, hasToolHandler } from './tools/index.js';
import { frizyApi } from './services/frizy-api.js';

// Load environment variables
config();

class FrizyMcpServer {
  private server: Server;
  private isShuttingDown = false;

  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'frizy-ai',
        version: process.env.MCP_SERVER_VERSION || '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools', { toolCount: tools.length });
      return {
        tools: tools
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Tool call received', { 
        toolName: name, 
        hasArgs: !!args,
        argsKeys: args ? Object.keys(args) : []
      });

      // Check if tool exists
      if (!hasToolHandler(name)) {
        logger.warn('Unknown tool called', { toolName: name });
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        // Execute tool handler
        const handler = toolHandlers[name];
        if (!handler) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Handler not found for tool: ${name}`
          );
        }
        const result = await handler(args || {});

        logger.info('Tool executed successfully', { 
          toolName: name,
          resultLength: result.length 
        });

        return {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Tool execution failed', { 
          toolName: name, 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  private setupErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.shutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      this.shutdown(1);
    });

    // Handle graceful shutdown signals
    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal, shutting down gracefully');
      this.shutdown(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal, shutting down gracefully');
      this.shutdown(0);
    });
  }

  private async shutdown(exitCode: number): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Starting server shutdown', { exitCode });

    try {
      // Close server connections
      await this.server.close();
      logger.info('Server closed successfully');
    } catch (error) {
      logger.error('Error during server shutdown', { error });
    }

    process.exit(exitCode);
  }

  async start(): Promise<void> {
    logger.info('Starting Frizy MCP Server', {
      name: process.env.MCP_SERVER_NAME || 'frizy-ai',
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
      toolCount: tools.length,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    });

    try {
      // Test API connection
      const isHealthy = await frizyApi.healthCheck();
      if (!isHealthy) {
        logger.warn('Frizy API health check failed, but continuing startup');
      } else {
        logger.info('Frizy API connection successful');
      }

      // Start server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('Frizy MCP Server started successfully', {
        transport: 'stdio',
        availableTools: tools.map(t => t.name)
      });

    } catch (error) {
      logger.error('Failed to start server', { error });
      throw error;
    }
  }
}

// Start the server
async function main(): Promise<void> {
  try {
    const server = new FrizyMcpServer();
    await server.start();
  } catch (error) {
    logger.error('Server startup failed', { error });
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Fatal error during startup', { error });
    process.exit(1);
  });
}

export { FrizyMcpServer };