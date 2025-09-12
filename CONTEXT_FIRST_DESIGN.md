# Frizy: Context-First Redesign 🧠

## The Vision
**"Your project's memory, not another task tracker"**

Frizy is a context graph system that automatically captures, connects, and retrieves the *why* behind your work. It's designed for AI-native workflows where Claude/GPT are team members, not tools.

## 🎨 UI Redesign: Context Graph as Hero

### Primary View: Context Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│  [Today's Context]  [Graph View]  [Timeline]  [Search]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 🧠 Active Context                                │       │
│  │                                                   │       │
│  │  Current Block: "Implement MCP server"           │       │
│  │  └─ Decision: Use TypeScript for type safety     │       │
│  │      └─ Context: Claude suggested approach       │       │
│  │          └─ PR #234, Commit abc123              │       │
│  │                                                   │       │
│  │  Related Nodes: [5 connections]                  │       │
│  │  • depends_on: "Setup PostgreSQL"                │       │
│  │  • blocks: "Frontend integration"                │       │
│  │  • derived_from: "Architecture decision #12"     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ 📊 Context Graph (Interactive)                   │       │
│  │                                                   │       │
│  │     [Block]──derives──>[Decision]                │       │
│  │        │                    │                     │       │
│  │     depends              informed_by             │       │
│  │        ↓                    ↓                     │       │
│  │     [Block]←──────────[Context Item]             │       │
│  │                            │                      │       │
│  │                      captured_from                │       │
│  │                            ↓                      │       │
│  │                    [Integration Event]           │       │
│  │                     (commit, PR, chat)           │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Secondary View: Linear-Style Board (Minimal)
```
┌─────────────────────────────────────────────────────────────┐
│  Active | Next | Future | Archive                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐                                   │
│  │ B1  │ │ B4  │ │ B7  │  ← Blocks are secondary           │
│  │ •••│ │     │ │     │    Context graph is primary        │
│  └─────┘ └─────┘ └─────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Architecture: Graph-First

### 1. Data Model (PostgreSQL + pgvector)
```sql
-- Core graph nodes
CREATE TABLE nodes (
  id UUID PRIMARY KEY,
  type VARCHAR(50), -- 'block', 'decision', 'context', 'event'
  title TEXT,
  content TEXT,
  embedding vector(1536), -- for semantic search
  metadata JSONB,
  created_at TIMESTAMP,
  created_by UUID
);

-- Graph edges (relationships)
CREATE TABLE edges (
  id UUID PRIMARY KEY,
  from_node UUID REFERENCES nodes(id),
  to_node UUID REFERENCES nodes(id),
  edge_type VARCHAR(50), -- 'depends_on', 'derived_from', 'blocks', 'related_to'
  weight FLOAT DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMP
);

-- Event log (append-only)
CREATE TABLE events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100),
  source VARCHAR(50), -- 'github', 'claude', 'user', 'slack'
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

-- Automatic indexing
CREATE INDEX idx_nodes_embedding ON nodes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_edges_from_to ON edges(from_node, to_node);
CREATE INDEX idx_events_processed ON events(processed, created_at);
```

### 2. MCP Server Integration
```typescript
// mcp-server/frizy-mcp.ts
export class FrizyMCPServer {
  async getContext(query: {
    user?: string;
    project?: string;
    timeframe?: string;
  }): Promise<ContextGraph> {
    // Returns relevant graph slice for Claude
    const activeBlock = await this.getActiveBlock(query.user);
    const relatedNodes = await this.traverseGraph(activeBlock.id, depth: 2);
    const decisions = await this.getRecentDecisions(query.project);
    
    return {
      activeWork: activeBlock,
      context: relatedNodes,
      decisions: decisions,
      summary: this.generateSummary(relatedNodes)
    };
  }

  async captureContext(data: {
    type: 'decision' | 'context' | 'insight';
    content: string;
    relatedTo?: string[];
  }): Promise<void> {
    // Claude can push context back
    await this.createNode(data);
    await this.createEdges(data.relatedTo);
    await this.updateEmbeddings(data.content);
  }
}
```

### 3. Event Capture System
```typescript
// Auto-capture from integrations
export class EventCapture {
  // GitHub webhook handler
  async handleGitHubEvent(event: GitHubWebhook) {
    if (event.type === 'pull_request' || event.type === 'push') {
      await this.events.create({
        type: 'code_change',
        source: 'github',
        payload: {
          repo: event.repository.name,
          author: event.sender.login,
          description: event.pull_request?.title || event.head_commit?.message,
          url: event.html_url,
          diff: await this.fetchDiff(event)
        }
      });
      
      // Auto-create context node
      await this.processIntoGraph(event);
    }
  }

  // Claude conversation capture
  async captureClaudeSession(session: ClaudeSession) {
    const summary = await this.ai.summarize(session.messages);
    const decisions = await this.ai.extractDecisions(session.messages);
    
    for (const decision of decisions) {
      await this.graph.createDecisionNode(decision);
    }
  }
}
```

### 4. Semantic Search & Retrieval
```typescript
export class ContextRetrieval {
  async query(naturalLanguage: string): Promise<GraphSlice> {
    // Embed the query
    const queryEmbedding = await this.embed(naturalLanguage);
    
    // Vector similarity search
    const similarNodes = await this.db.query(`
      SELECT * FROM nodes 
      ORDER BY embedding <=> $1 
      LIMIT 20
    `, [queryEmbedding]);
    
    // Graph traversal from similar nodes
    const subgraph = await this.expandGraph(similarNodes);
    
    // Rerank by relevance
    return this.rerank(subgraph, naturalLanguage);
  }
}
```

## 🚀 Implementation Phases

### Phase 1: Core Graph (Week 1-2)
- [ ] PostgreSQL setup with graph schema
- [ ] Basic node/edge CRUD operations
- [ ] Event log system
- [ ] Simple graph visualization (using vis.js or d3)

### Phase 2: MCP Integration (Week 3-4)
- [ ] MCP server implementation
- [ ] Claude integration for context injection
- [ ] Auto-capture from Claude conversations
- [ ] Context retrieval API

### Phase 3: Auto-Capture (Week 5-6)
- [ ] GitHub webhook integration
- [ ] Commit/PR auto-linking
- [ ] Daily summarization
- [ ] Slack/Discord integration

### Phase 4: UI Polish (Week 7-8)
- [ ] Interactive graph explorer
- [ ] Timeline view
- [ ] Natural language search
- [ ] Context recommendations

## 🎯 Key Features to Highlight

### 1. "Today's Context" Widget
- Shows active block + related decisions
- One-click to inject into Claude
- Auto-updates as you work

### 2. Graph Explorer
- Interactive node navigation
- Filter by type/time/person
- Semantic similarity clusters
- Dependency chains

### 3. Natural Language Queries
- "What led to this decision?"
- "Show me blockers for feature X"
- "What was discussed about authentication?"
- "Who worked on the payment system?"

### 4. Automatic Capture
- Every commit → context node
- Every PR → decision node
- Every Claude chat → extracted insights
- Every meeting → action items

### 5. AI Context Injection
```typescript
// Before Claude answers any question
const context = await frizy.getRelevantContext({
  query: userQuestion,
  user: currentUser,
  depth: 2
});

claudePrompt = `
Context from your project memory:
${context.summary}

Active work: ${context.activeBlock}
Recent decisions: ${context.decisions}

Now answer: ${userQuestion}
`;
```

## 🎨 Visual Design Language

### Colors (Linear-inspired)
- Background: `#FAFAFA` (light) / `#0A0A0A` (dark)
- Primary: `#5E5CE6` (electric purple)
- Graph nodes:
  - Blocks: `#007AFF` (blue)
  - Decisions: `#34C759` (green)
  - Context: `#FF9500` (orange)
  - Events: `#8E8E93` (gray)

### Typography
- Headers: Inter 600
- Body: Inter 400
- Code: JetBrains Mono

### Interactions
- Hover: Subtle scale + shadow
- Click: Ripple effect
- Drag: Ghost preview
- Connect: Magnetic snap

## 🔥 Why This Wins

1. **Not another task tracker** - It's a memory system
2. **AI-native** - Built for Claude/GPT as first-class users
3. **Automatic** - No manual logging required
4. **Graph-powered** - See connections, not lists
5. **Developer-focused** - Git/code-centric, not PM-centric

## Next Steps

1. Set up PostgreSQL with pgvector
2. Create the graph schema
3. Build MCP server skeleton
4. Replace current swim-lane UI with context dashboard
5. Implement GitHub webhook capture
6. Add graph visualization

The key is making context retrieval so good that developers can't imagine working without it. When Claude can instantly know "what you were working on yesterday" and "why that decision was made", it becomes indispensable.