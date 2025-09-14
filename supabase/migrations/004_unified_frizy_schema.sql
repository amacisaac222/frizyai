-- Unified Frizy Schema - Complete Multi-tenant Project Support with Context Capture
-- This migration creates all necessary tables with TEXT IDs (matching existing codebase)
-- Compatible with existing auth.users and uses created_by pattern

-- First, check and preserve any existing data if needed
DO $$
BEGIN
  -- Log existing tables for reference
  RAISE NOTICE 'Starting unified migration. Checking existing tables...';

  -- Check if we have existing projects table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    RAISE NOTICE 'Projects table exists. Will preserve structure.';
  END IF;
END $$;

-- 1. Projects table - Core project entity (using TEXT IDs to match codebase)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  github_repo TEXT,
  github_token TEXT, -- Encrypted in application layer
  mcp_server_url TEXT DEFAULT 'wss://api.frizyai.com/mcp',
  mcp_api_key TEXT, -- Encrypted in application layer
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'on-hold', 'completed')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(created_by, name)
);

-- 2. Sessions table - Represents Claude Code conversations
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255),
  summary TEXT,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Blocks table - Work units within sessions
CREATE TABLE IF NOT EXISTS public.blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title VARCHAR(255),
  type VARCHAR(50),
  summary TEXT,
  status VARCHAR(50),
  metrics JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Traces table - Operations within blocks
CREATE TABLE IF NOT EXISTS public.traces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  block_id TEXT NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  name VARCHAR(255),
  type VARCHAR(50),
  summary TEXT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Events table - Detailed events (partitioned for scale)
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT DEFAULT gen_random_uuid()::TEXT,
  trace_id TEXT NOT NULL,
  project_id TEXT NOT NULL, -- Denormalized for partitioning
  type VARCHAR(50),
  tool VARCHAR(100),
  data JSONB,
  impact VARCHAR(20),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, created_at, id)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for events (next 12 months)
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'events_' || TO_CHAR(start_date, 'YYYY_MM');

    -- Check if partition already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = partition_name
    ) THEN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF public.events
        FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        start_date,
        end_date
      );
      RAISE NOTICE 'Created partition: %', partition_name;
    END IF;

    start_date := end_date;
  END LOOP;
END $$;

-- 6. MCP-specific tables for Claude Code integration
-- These use the same naming convention as migration 003 but with consistent structure

CREATE TABLE IF NOT EXISTS public.mcp_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255),
  summary TEXT,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.context_blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT REFERENCES public.mcp_sessions(id) ON DELETE CASCADE,
  title VARCHAR(255),
  type VARCHAR(50),
  summary TEXT,
  status VARCHAR(50),
  metrics JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.context_traces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  block_id TEXT REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  name VARCHAR(255),
  type VARCHAR(50),
  summary TEXT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.context_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  trace_id TEXT REFERENCES public.context_traces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  type VARCHAR(50),
  tool VARCHAR(100),
  data JSONB,
  impact VARCHAR(20),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create all indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON public.sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_session_id ON public.blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_block_id ON public.traces(block_id);
CREATE INDEX IF NOT EXISTS idx_events_trace_id ON public.events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON public.events(timestamp DESC);

-- MCP-specific indexes
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_project_id ON public.mcp_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_status ON public.mcp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_created_at ON public.mcp_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_blocks_session_id ON public.context_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_context_traces_block_id ON public.context_traces(block_id);
CREATE INDEX IF NOT EXISTS idx_context_events_trace_id ON public.context_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_context_events_project_id ON public.context_events(project_id);
CREATE INDEX IF NOT EXISTS idx_context_events_timestamp ON public.context_events(timestamp DESC);

-- Enable Row Level Security on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for Sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own sessions" ON public.sessions
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for Blocks
DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocks;

CREATE POLICY "Users can view own blocks" ON public.blocks
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own blocks" ON public.blocks
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

-- RLS Policies for Traces
DROP POLICY IF EXISTS "Users can view own traces" ON public.traces;
DROP POLICY IF EXISTS "Users can manage own traces" ON public.traces;

CREATE POLICY "Users can view own traces" ON public.traces
  FOR SELECT USING (
    block_id IN (
      SELECT b.id FROM public.blocks b
      JOIN public.sessions s ON b.session_id = s.id
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own traces" ON public.traces
  FOR ALL USING (
    block_id IN (
      SELECT b.id FROM public.blocks b
      JOIN public.sessions s ON b.session_id = s.id
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

-- RLS Policies for Events
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can manage own events" ON public.events;

CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage own events" ON public.events
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for MCP Sessions
DROP POLICY IF EXISTS "Users can view mcp sessions in own projects" ON public.mcp_sessions;
DROP POLICY IF EXISTS "Users can manage mcp sessions in own projects" ON public.mcp_sessions;

CREATE POLICY "Users can view mcp sessions in own projects" ON public.mcp_sessions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage mcp sessions in own projects" ON public.mcp_sessions
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for Context Blocks
DROP POLICY IF EXISTS "Users can view context blocks in own projects" ON public.context_blocks;
DROP POLICY IF EXISTS "Users can manage context blocks in own projects" ON public.context_blocks;

CREATE POLICY "Users can view context blocks in own projects" ON public.context_blocks
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM public.mcp_sessions s
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage context blocks in own projects" ON public.context_blocks
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM public.mcp_sessions s
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

-- RLS Policies for Context Traces
DROP POLICY IF EXISTS "Users can view context traces in own projects" ON public.context_traces;
DROP POLICY IF EXISTS "Users can manage context traces in own projects" ON public.context_traces;

CREATE POLICY "Users can view context traces in own projects" ON public.context_traces
  FOR SELECT USING (
    block_id IN (
      SELECT b.id FROM public.context_blocks b
      JOIN public.mcp_sessions s ON b.session_id = s.id
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage context traces in own projects" ON public.context_traces
  FOR ALL USING (
    block_id IN (
      SELECT b.id FROM public.context_blocks b
      JOIN public.mcp_sessions s ON b.session_id = s.id
      JOIN public.projects p ON s.project_id = p.id
      WHERE p.created_by = auth.uid()
    )
  );

-- RLS Policies for Context Events
DROP POLICY IF EXISTS "Users can view context events in own projects" ON public.context_events;
DROP POLICY IF EXISTS "Users can manage context events in own projects" ON public.context_events;

CREATE POLICY "Users can view context events in own projects" ON public.context_events
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage context events in own projects" ON public.context_events
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
DROP TRIGGER IF EXISTS update_mcp_sessions_updated_at ON public.mcp_sessions;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_sessions_updated_at BEFORE UPDATE ON public.mcp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Analytics views for dashboard
CREATE OR REPLACE VIEW project_statistics AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p.created_by as user_id,
  p.status,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT b.id) as total_blocks,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sessions,
  AVG((s.metadata->>'contextUsage')::NUMERIC) as avg_context_usage,
  MAX(s.created_at) as last_activity
FROM public.projects p
LEFT JOIN public.sessions s ON p.id = s.project_id
LEFT JOIN public.blocks b ON s.id = b.session_id
GROUP BY p.id, p.name, p.created_by, p.status;

CREATE OR REPLACE VIEW project_mcp_statistics AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p.created_by as user_id,
  COUNT(DISTINCT s.id) as total_mcp_sessions,
  COUNT(DISTINCT b.id) as total_context_blocks,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sessions,
  AVG((s.metadata->>'contextUsage')::NUMERIC) as avg_context_usage,
  MAX(s.created_at) as last_mcp_activity
FROM public.projects p
LEFT JOIN public.mcp_sessions s ON p.id = s.project_id
LEFT JOIN public.context_blocks b ON s.id = b.session_id
GROUP BY p.id, p.name, p.created_by;

-- Function to clean up old events (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.sessions TO authenticated;
GRANT ALL ON public.blocks TO authenticated;
GRANT ALL ON public.traces TO authenticated;
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.mcp_sessions TO authenticated;
GRANT ALL ON public.context_blocks TO authenticated;
GRANT ALL ON public.context_traces TO authenticated;
GRANT ALL ON public.context_events TO authenticated;
GRANT SELECT ON project_statistics TO authenticated;
GRANT SELECT ON project_mcp_statistics TO authenticated;

-- Add sample data for testing (only if tables are empty)
DO $$
BEGIN
  -- Only insert sample data if projects table is empty
  IF NOT EXISTS (SELECT 1 FROM public.projects LIMIT 1) THEN
    RAISE NOTICE 'Inserting sample project data for testing...';

    -- Insert a sample project (requires a valid user_id from auth.users)
    -- This will only work if there's at least one user in the system
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
      INSERT INTO public.projects (id, created_by, name, description, status)
      SELECT
        'sample-project-001',
        id,
        'Sample Project',
        'A sample project for testing the Frizy platform',
        'active'
      FROM auth.users
      LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Unified Frizy schema created successfully!';
  RAISE NOTICE 'Tables created: projects, sessions, blocks, traces, events, mcp_sessions, context_blocks, context_traces, context_events';
  RAISE NOTICE 'All tables use TEXT IDs and created_by pattern for consistency with codebase';
END $$;