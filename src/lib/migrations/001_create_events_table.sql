-- Migration: Create events table for event sourcing
-- This creates the foundation for event-sourced architecture

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  version INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure version uniqueness per aggregate
  UNIQUE(aggregate_id, version)
);

-- Create snapshots table for performance optimization
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Only one snapshot per aggregate (upsert pattern)
  UNIQUE(aggregate_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_id, version);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_project_data ON events USING GIN ((data->>'projectId'));

-- GIN index for full-text search on event data
CREATE INDEX IF NOT EXISTS idx_events_data_gin ON events USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_events_metadata_gin ON events USING GIN (metadata);

-- Snapshots indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate ON snapshots(aggregate_id, version DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own events
CREATE POLICY events_user_policy ON events
  FOR ALL USING (
    auth.uid() = user_id OR
    -- Allow access to events for projects the user owns
    auth.uid() IN (
      SELECT user_id FROM projects 
      WHERE id = (events.data->>'projectId')::UUID
      OR id = events.aggregate_id
    )
  );

-- Policy: Users can only access snapshots for their aggregates
CREATE POLICY snapshots_user_policy ON snapshots
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM projects 
      WHERE id = snapshots.aggregate_id
    ) OR
    auth.uid() IN (
      SELECT created_by FROM blocks
      WHERE id = snapshots.aggregate_id
    )
  );

-- Function to get events for a project (including related blocks, sessions, etc.)
CREATE OR REPLACE FUNCTION get_project_events(project_uuid UUID, from_timestamp TIMESTAMPTZ DEFAULT NULL, event_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  id UUID,
  type VARCHAR,
  aggregate_id UUID,
  aggregate_type VARCHAR,
  version INTEGER,
  timestamp TIMESTAMPTZ,
  data JSONB,
  metadata JSONB,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.type,
    e.aggregate_id,
    e.aggregate_type,
    e.version,
    e.timestamp,
    e.data,
    e.metadata,
    e.user_id
  FROM events e
  WHERE 
    -- Direct project events
    e.aggregate_id = project_uuid
    OR
    -- Events from blocks/sessions/context items belonging to this project
    (e.data->>'projectId')::UUID = project_uuid
    AND (from_timestamp IS NULL OR e.timestamp >= from_timestamp)
  ORDER BY e.timestamp ASC
  LIMIT event_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get aggregate current version
CREATE OR REPLACE FUNCTION get_aggregate_version(aggregate_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO current_version
  FROM events
  WHERE aggregate_id = aggregate_uuid;
  
  RETURN current_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to append event with concurrency check
CREATE OR REPLACE FUNCTION append_event(
  p_aggregate_id UUID,
  p_aggregate_type VARCHAR,
  p_event_type VARCHAR,
  p_data JSONB,
  p_metadata JSONB DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  current_version INTEGER;
  new_version INTEGER;
  event_id UUID;
BEGIN
  -- Get current version
  SELECT get_aggregate_version(p_aggregate_id) INTO current_version;
  
  -- Check expected version for optimistic concurrency
  IF p_expected_version IS NOT NULL AND current_version != p_expected_version THEN
    RAISE EXCEPTION 'Concurrency conflict: expected version %, current version %', p_expected_version, current_version;
  END IF;
  
  -- Calculate new version
  new_version := current_version + 1;
  
  -- Insert event
  INSERT INTO events (
    id,
    type,
    aggregate_id,
    aggregate_type,
    version,
    data,
    metadata,
    user_id
  ) VALUES (
    gen_random_uuid(),
    p_event_type,
    p_aggregate_id,
    p_aggregate_type,
    new_version,
    p_data,
    p_metadata,
    auth.uid()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update aggregate snapshot after events
CREATE OR REPLACE FUNCTION update_aggregate_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update project stats when block events occur
  IF NEW.aggregate_type = 'block' AND (NEW.data->>'projectId') IS NOT NULL THEN
    UPDATE projects SET 
      updated_at = NOW(),
      total_blocks = (
        SELECT COUNT(*) FROM blocks 
        WHERE project_id = (NEW.data->>'projectId')::UUID
      ),
      completed_blocks = (
        SELECT COUNT(*) FROM blocks 
        WHERE project_id = (NEW.data->>'projectId')::UUID 
        AND status = 'completed'
      )
    WHERE id = (NEW.data->>'projectId')::UUID;
  END IF;
  
  -- Update user stats
  IF NEW.user_id IS NOT NULL THEN
    UPDATE users SET
      updated_at = NOW(),
      total_claude_sessions = CASE 
        WHEN NEW.type = 'SessionStarted' THEN total_claude_sessions + 1
        ELSE total_claude_sessions
      END
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aggregate_stats
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_aggregate_stats();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_aggregate_version TO authenticated;
GRANT EXECUTE ON FUNCTION append_event TO authenticated;