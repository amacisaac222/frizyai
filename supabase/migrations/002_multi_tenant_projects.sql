-- Multi-tenant project support with scalability for 10,000+ users
-- This migration adds comprehensive project management and optimized storage

-- Projects table - Core project entity
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  github_repo TEXT,
  github_token TEXT, -- Encrypted in application layer
  mcp_server_url TEXT DEFAULT 'wss://api.frizyai.com/mcp',
  mcp_api_key TEXT, -- Encrypted in application layer
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Sessions table - Represents Claude conversations
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255),
  summary TEXT,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks table - Work units within sessions
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(255),
  type VARCHAR(50),
  summary TEXT,
  status VARCHAR(50),
  metrics JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traces table - Operations within blocks
CREATE TABLE IF NOT EXISTS traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  name VARCHAR(255),
  type VARCHAR(50),
  summary TEXT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table - Partitioned for scale
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  project_id UUID NOT NULL, -- Denormalized for partitioning
  type VARCHAR(50),
  tool VARCHAR(100),
  data JSONB,
  impact VARCHAR(20),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, created_at, id)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for events (example for next 12 months)
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'events_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I PARTITION OF events
      FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );
    
    start_date := end_date;
  END LOOP;
END $$;

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_blocks_session_id ON blocks(session_id);
CREATE INDEX idx_traces_block_id ON traces(block_id);
CREATE INDEX idx_events_trace_id ON events(trace_id);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Sessions policies (inherit from project ownership)
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own sessions" ON sessions
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Similar policies for blocks, traces, and events
CREATE POLICY "Users can view own blocks" ON blocks
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN projects p ON s.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own traces" ON traces
  FOR SELECT USING (
    block_id IN (
      SELECT b.id FROM blocks b
      JOIN sessions s ON b.session_id = s.id
      JOIN projects p ON s.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
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
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Analytics views for dashboard
CREATE OR REPLACE VIEW project_statistics AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT b.id) as total_blocks,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sessions,
  AVG((s.metadata->>'contextUsage')::NUMERIC) as avg_context_usage,
  MAX(s.created_at) as last_activity
FROM projects p
LEFT JOIN sessions s ON p.id = s.project_id
LEFT JOIN blocks b ON s.id = b.session_id
GROUP BY p.id, p.name, p.user_id;

-- Function to clean up old events (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job for cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-events', '0 2 * * *', 'SELECT cleanup_old_events(30);');