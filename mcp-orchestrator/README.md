# Frizy MCP Orchestrator

The Frizy MCP Orchestrator connects Claude Code to the Frizy project management platform, enabling seamless AI-powered project management and context sharing.

## Features

- 🔧 **MCP Server**: Direct integration with Claude Code via Model Context Protocol
- 🌐 **REST API**: Web interface and webhook support
- 📊 **Context Compression**: AI-powered project context summarization for Claude
- 🔄 **Event Sourcing**: All changes tracked through immutable event log
- 🔍 **Semantic Search**: pgvector integration for intelligent context retrieval
- 🐙 **GitHub Integration**: Automatic capture of PR and commit events

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database and API keys
```

### Running

```bash
# API Server (for web UI and webhooks)
npm run dev

# MCP Server (for Claude Code integration)
npm run dev:mcp

# Build for production
npm run build
npm start
```

## MCP Tools Available

### `frizy_create_block`
Create a new block in the project board.

```typescript
{
  project_id: "uuid",
  title: "Block title",
  content?: "Optional description",
  lane?: "current" | "next" | "goals" | "vision" | "context",
  priority?: "low" | "medium" | "high" | "urgent",
  effort?: number
}
```

### `frizy_move_block`
Move a block to a different lane.

```typescript
{
  project_id: "uuid",
  block_id: "uuid",
  lane: "current" | "next" | "goals" | "vision" | "context"
}
```

### `frizy_update_progress`
Update block progress percentage.

```typescript
{
  project_id: "uuid",
  block_id: "uuid", 
  progress: 0-100
}
```

### `frizy_capture_context`
Capture important context, decisions, or insights.

```typescript
{
  project_id: "uuid",
  type: "decision" | "insight" | "blocker" | "solution" | "reference" | "note",
  title?: "Context title",
  content: "Context content",
  block_id?: "uuid"
}
```

### `frizy_get_context`
Get relevant project context for current work.

```typescript
{
  project_id: "uuid",
  user_query?: "Optional query to focus context",
  max_tokens?: 4000
}
```

### `frizy_list_blocks`
List blocks with optional filtering.

```typescript
{
  project_id: "uuid",
  lane?: "current" | "next" | "goals" | "vision" | "context",
  status?: "not_started" | "in_progress" | "completed" | "blocked" | "cancelled"
}
```

## API Endpoints

### Events
- `POST /api/events` - Create new event
- `GET /api/projects/:id/events` - Get project events

### Project Data
- `GET /api/projects/:id/graph` - Get full project graph
- `GET /api/projects/:id/context-preview` - Get compressed context
- `GET /api/projects/:id/blocks` - Get project blocks

### MCP Integration
- `POST /api/mcp/connections` - Create MCP connection string

### Webhooks
- `POST /api/webhooks/github` - GitHub webhook handler

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/frizy

# API Configuration
PORT=4000
NODE_ENV=development
MCP_API_KEY=your_secure_key

# AI Services
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5182
```

## Claude Code Integration

1. **Generate Connection**: Use the `/api/mcp/connections` endpoint to get a connection string
2. **Configure Claude Code**: Add the connection string to your Claude Code MCP configuration
3. **Start Coding**: Claude will automatically have access to project context and can manipulate blocks

Example Claude Code `.claude/settings.json`:
```json
{
  "mcp_servers": {
    "frizy": {
      "command": "node",
      "args": ["/path/to/mcp-orchestrator/dist/index.js", "mcp"],
      "env": {
        "DATABASE_URL": "your_db_url",
        "PROJECT_ID": "your_project_id"
      }
    }
  }
}
```

## Architecture

```
Claude Code ←→ MCP Server ←→ Event Store ←→ Projections
                     ↓
Web UI ←→ REST API ←→ Database ←→ GitHub Webhooks
```

### Event Sourcing Flow

1. **Action occurs** (block created, moved, etc.)
2. **Event written** to immutable event log
3. **Projections updated** (blocks, context_items tables)
4. **Real-time updates** sent to connected clients

### Context Compression

1. **Gather context** from blocks, decisions, GitHub activity
2. **Score relevance** based on recency, priority, user query
3. **Compress with AI** to fit token budget
4. **Deliver to Claude** with provenance links

## Development

```bash
# Run tests
npm test
npm run test:watch

# Type checking
npm run build

# Development with auto-reload
npm run dev        # API server
npm run dev:mcp    # MCP server
```

## Production Deployment

1. Build the application: `npm run build`
2. Set production environment variables
3. Run database migrations (use the schema from the main project)
4. Start services:
   - API server: `npm run start:api`
   - MCP server: `npm run start:mcp`

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Ensure pgvector extension is installed
- Check database permissions

### MCP Integration Issues
- Verify Claude Code configuration
- Check MCP server logs (stderr)
- Ensure environment variables are passed correctly

### Context Compression Issues
- Verify OpenAI/Anthropic API keys
- Check token limits and quotas
- Monitor compression quality and adjust scoring