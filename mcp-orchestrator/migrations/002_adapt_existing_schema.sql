-- Adapt MCP Orchestrator to work with existing Frizy schema

-- Add missing context_items table
CREATE TABLE IF NOT EXISTS context_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL DEFAULT 'note',
    title VARCHAR(500),
    content TEXT NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'mcp',
    author_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing tables if they don't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';

-- Add missing columns to blocks if they don't exist  
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS last_worked_at TIMESTAMP WITH TIME ZONE;

-- Create missing tables with TEXT IDs to match existing schema
CREATE TABLE IF NOT EXISTS block_relations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    to_block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'depends_on',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_block_id, to_block_id, relation_type)
);

CREATE TABLE IF NOT EXISTS context_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    context_id TEXT NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(context_id, block_id)
);

CREATE TABLE IF NOT EXISTS github_entities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL,
    provider_id VARCHAR(100) NOT NULL,
    url VARCHAR(500),
    title VARCHAR(500),
    status VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, provider_type, provider_id)
);

CREATE TABLE IF NOT EXISTS projection_offsets (
    id VARCHAR(100) PRIMARY KEY,
    last_event_id UUID,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_items_project ON context_items(project_id);
CREATE INDEX IF NOT EXISTS idx_context_items_type ON context_items(type);
CREATE INDEX IF NOT EXISTS idx_github_entities_project ON github_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_github_entities_type ON github_entities(provider_type);
CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at);

-- Update the events table to work with our event consumer
-- Create a view to map existing events to our expected format
CREATE OR REPLACE VIEW mcp_events AS
SELECT 
    id,
    stream_id as project_id,
    event_type as type,
    user_id as actor_id,
    event_data as payload,
    created_at
FROM events
WHERE stream_type = 'project'

UNION ALL

-- Map any events that already have our format
SELECT 
    id,
    project_id,
    type,
    actor_id,
    payload,
    created_at
FROM events
WHERE project_id IS NOT NULL AND type IS NOT NULL;

-- Create a sample project if none exist (for testing)
INSERT INTO projects (id, name, description, created_by, status, created_at, updated_at) 
SELECT 
    gen_random_uuid()::text,
    'Frizy MCP Demo Project',
    'Sample project for testing the MCP orchestrator integration',
    (SELECT id FROM users LIMIT 1),
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM projects LIMIT 1) AND EXISTS (SELECT 1 FROM users LIMIT 1);

-- Create initial projection offset
INSERT INTO projection_offsets (id, last_event_id, last_seen_at)
VALUES ('mcp-orchestrator-default', NULL, NOW())
ON CONFLICT (id) DO NOTHING;