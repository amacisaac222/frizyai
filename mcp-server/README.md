# Frizy.ai MCP Server

A Model Context Protocol (MCP) server that enables Claude Code to interact with Frizy.ai project management platform. This server allows Claude to automatically capture insights, update block progress, and manage project context during coding sessions.

## Features

- **Block Progress Updates**: Update progress on project blocks as work is completed
- **Status Management**: Change block status (not started, in progress, blocked, completed, archived)
- **Context Capture**: Save important conversation context (decisions, solutions, references, learnings)
- **Insight Tracking**: Capture key insights from conversations with confidence scoring
- **Real-time Integration**: Direct API connection to Frizy.ai platform
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## Installation

1. Clone or copy the MCP server code:
```bash
cd mcp-server
npm install
```

2. Create environment configuration:
```bash
cp .env.example .env
# Edit .env with your Frizy.ai API configuration
```

3. Build the server:
```bash
npm run build
```

## Configuration

Create a `.env` file with the following variables:

```env
# Frizy.ai API Configuration
FRIZY_API_BASE_URL=http://localhost:3000/api
FRIZY_API_KEY=your-api-key-here

# Server Configuration
NODE_ENV=production
LOG_LEVEL=info
MCP_SERVER_NAME=frizy-ai
MCP_SERVER_VERSION=1.0.0
```

## Available Tools

### frizy_progress
Update the progress percentage of a project block.

**Parameters:**
- `blockId` (string, required): ID of the block to update
- `progress` (number, required): Progress percentage (0-100)
- `notes` (string, optional): Notes about the progress update
- `metadata` (object, optional): Additional metadata

**Example:**
```json
{
  "blockId": "block-123",
  "progress": 75,
  "notes": "Completed API integration"
}
```

### frizy_status
Update the status of a project block.

**Parameters:**
- `blockId` (string, required): ID of the block to update
- `status` (string, required): New status (not_started, in_progress, blocked, completed, archived)
- `notes` (string, optional): Notes about the status change
- `metadata` (object, optional): Additional metadata

**Example:**
```json
{
  "blockId": "block-123",
  "status": "completed",
  "notes": "Feature fully implemented and tested"
}
```

### frizy_context
Save important context from conversations to the project.

**Parameters:**
- `projectId` (string, required): ID of the project
- `title` (string, required): Brief title for the context
- `content` (string, required): Detailed content
- `type` (string, required): Type (decision, solution, idea, reference, learning)
- `tags` (array, optional): Tags for categorization
- `relatedBlockIds` (array, optional): Related block IDs
- `importance` (string, optional): Importance level (low, medium, high)
- `metadata` (object, optional): Additional metadata

**Example:**
```json
{
  "projectId": "project-456",
  "title": "Database Schema Decision",
  "content": "Decided to use PostgreSQL for better JSON support",
  "type": "decision",
  "importance": "high",
  "tags": ["database", "architecture"]
}
```

### frizy_insight
Capture key insights from conversations.

**Parameters:**
- `projectId` (string, required): ID of the project
- `type` (string, required): Type (decision, problem_solution, idea, learning, blocker, next_step)
- `title` (string, required): Concise title
- `content` (string, required): Detailed explanation
- `relatedBlockIds` (array, optional): Related block IDs
- `tags` (array, optional): Tags for categorization
- `importance` (string, optional): Importance level (low, medium, high)
- `confidence` (number, optional): Confidence level (0-1)
- `metadata` (object, optional): Additional metadata

**Example:**
```json
{
  "projectId": "project-456",
  "type": "problem_solution",
  "title": "Memory Leak Fix",
  "content": "Fixed memory leak by properly disposing event listeners",
  "confidence": 0.9,
  "importance": "high",
  "tags": ["bug-fix", "performance"]
}
```

## Development

### Start Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

### Lint Code
```bash
npm run lint
```

## Integration with Claude Code

To integrate this MCP server with Claude Code, add it to your MCP configuration:

1. Add the server to your Claude Code MCP settings
2. Configure the server path to point to the built server executable
3. Ensure the Frizy.ai API is accessible from Claude Code's environment

The server will automatically register all available tools with Claude Code, enabling automatic project management integration during coding sessions.

## API Requirements

This MCP server expects the Frizy.ai API to have the following endpoints:

- `PATCH /blocks/{id}/progress` - Update block progress
- `PATCH /blocks/{id}/status` - Update block status
- `POST /context-items` - Create context item
- `POST /insights` - Capture insight
- `GET /blocks/{id}` - Get block details
- `GET /projects/{id}/blocks` - Get project blocks
- `GET /health` - Health check

## Error Handling

The server includes comprehensive error handling:

- Input validation using Zod schemas
- API error handling with detailed logging
- Graceful shutdown on SIGINT/SIGTERM
- Uncaught exception handling

## Logging

Structured logging with Winston:
- Console output in development
- File logging in production
- Configurable log levels
- Request/response logging
- Error tracking with stack traces

## License

MIT License - see LICENSE file for details.