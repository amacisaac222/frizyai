-- Frizy MCP Orchestrator Database Schema
-- This creates all the tables needed for the event-sourced architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table (event store)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    actor_id UUID,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks table (projection from events)
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    lane VARCHAR(50) NOT NULL DEFAULT 'current',
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    effort INTEGER,
    last_worked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Context items table
CREATE TABLE IF NOT EXISTS context_items (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'mcp',
    author_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Block relations table (for dependency tracking)
CREATE TABLE IF NOT EXISTS block_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    to_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'depends_on',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_block_id, to_block_id, relation_type)
);

-- Context links (linking context items to blocks)
CREATE TABLE IF NOT EXISTS context_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(context_id, block_id)
);

-- Claude sessions tracking
CREATE TABLE IF NOT EXISTS claude_sessions (
    id UUID PRIMARY KEY,
    block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID,
    session_type VARCHAR(50) NOT NULL DEFAULT 'coding',
    context_data JSONB DEFAULT '{}',
    messages_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    outcomes JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GitHub entities (PRs, issues, commits, etc.)
CREATE TABLE IF NOT EXISTS github_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL, -- 'pr', 'issue', 'commit', 'release'
    provider_id VARCHAR(100) NOT NULL, -- GitHub ID
    url VARCHAR(500),
    title VARCHAR(500),
    status VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, provider_type, provider_id)
);

-- Projection offsets (for event consumer)
CREATE TABLE IF NOT EXISTS projection_offsets (
    id VARCHAR(100) PRIMARY KEY, -- consumer_id
    last_event_id UUID,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_blocks_project ON blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_blocks_status ON blocks(status);
CREATE INDEX IF NOT EXISTS idx_blocks_lane ON blocks(lane);
CREATE INDEX IF NOT EXISTS idx_blocks_last_worked ON blocks(last_worked_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_items_project ON context_items(project_id);
CREATE INDEX IF NOT EXISTS idx_context_items_type ON context_items(type);
CREATE INDEX IF NOT EXISTS idx_github_entities_project ON github_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_github_entities_type ON github_entities(provider_type);

-- Create a view for recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'event' as activity_type,
    id::text as activity_id,
    project_id,
    type as activity_name,
    payload->>'title' as activity_title,
    created_at
FROM events
WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'block_update' as activity_type,
    id::text as activity_id,
    project_id,
    'block.worked' as activity_name,
    title as activity_title,
    last_worked_at as created_at
FROM blocks
WHERE last_worked_at IS NOT NULL 
  AND last_worked_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Insert sample data for development
-- You can uncomment this for testing:
/*
INSERT INTO projects (id, name, description, owner_id) VALUES 
(uuid_generate_v4(), 'Sample Project', 'A sample project for testing Frizy MCP', uuid_generate_v4())
ON CONFLICT DO NOTHING;
*/