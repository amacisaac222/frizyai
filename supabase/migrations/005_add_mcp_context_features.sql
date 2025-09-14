-- Add MCP and Context Capture Features to Existing Frizy Schema
-- This migration adds new tables for MCP server integration and context capture
-- WITHOUT breaking the existing schema

-- Add MCP-specific columns to existing projects table if they don't exist
DO $$
BEGIN
  -- Add github_repo column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects'
                 AND column_name = 'github_repo') THEN
    ALTER TABLE public.projects ADD COLUMN github_repo TEXT;
  END IF;

  -- Add github_token column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects'
                 AND column_name = 'github_token') THEN
    ALTER TABLE public.projects ADD COLUMN github_token TEXT;
  END IF;

  -- Add mcp_server_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects'
                 AND column_name = 'mcp_server_url') THEN
    ALTER TABLE public.projects ADD COLUMN mcp_server_url TEXT DEFAULT 'wss://api.frizyai.com/mcp';
  END IF;

  -- Add mcp_api_key column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects'
                 AND column_name = 'mcp_api_key') THEN
    ALTER TABLE public.projects ADD COLUMN mcp_api_key TEXT;
  END IF;
END $$;

-- 1. MCP Sessions table - Represents Claude Code conversations
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

-- 2. Context Blocks table - Work units within MCP sessions
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

-- 3. Context Traces table - Operations within context blocks
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

-- 4. Context Events table - Detailed events
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_project_id ON public.mcp_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_status ON public.mcp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_created_at ON public.mcp_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_blocks_session_id ON public.context_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_context_traces_block_id ON public.context_traces(block_id);
CREATE INDEX IF NOT EXISTS idx_context_events_trace_id ON public.context_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_context_events_project_id ON public.context_events(project_id);
CREATE INDEX IF NOT EXISTS idx_context_events_timestamp ON public.context_events(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.mcp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for MCP Sessions
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

-- Add triggers for updated_at (check if function exists first)
DO $$
BEGIN
  -- Check if the trigger already exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mcp_sessions_updated_at') THEN
    CREATE TRIGGER update_mcp_sessions_updated_at BEFORE UPDATE ON public.mcp_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create view for project statistics including MCP data
CREATE OR REPLACE VIEW project_mcp_statistics AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p.created_by as user_id,
  COUNT(DISTINCT ms.id) as total_mcp_sessions,
  COUNT(DISTINCT cb.id) as total_context_blocks,
  COUNT(DISTINCT CASE WHEN ms.status = 'active' THEN ms.id END) as active_mcp_sessions,
  AVG((ms.metadata->>'contextUsage')::NUMERIC) as avg_context_usage,
  MAX(ms.created_at) as last_mcp_activity
FROM public.projects p
LEFT JOIN public.mcp_sessions ms ON p.id = ms.project_id
LEFT JOIN public.context_blocks cb ON ms.id = cb.session_id
GROUP BY p.id, p.name, p.created_by;

-- Grant permissions to authenticated users
GRANT ALL ON public.mcp_sessions TO authenticated;
GRANT ALL ON public.context_blocks TO authenticated;
GRANT ALL ON public.context_traces TO authenticated;
GRANT ALL ON public.context_events TO authenticated;
GRANT SELECT ON project_mcp_statistics TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ MCP and Context Capture features added successfully!';
  RAISE NOTICE 'New tables: mcp_sessions, context_blocks, context_traces, context_events';
  RAISE NOTICE 'New columns added to projects: github_repo, github_token, mcp_server_url, mcp_api_key';
END $$;