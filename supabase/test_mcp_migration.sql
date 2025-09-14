-- Test Script for MCP Migration
-- Run these queries in Supabase SQL Editor to verify the migration worked

-- 1. Check if new columns were added to projects table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('github_repo', 'github_token', 'mcp_server_url', 'mcp_api_key')
ORDER BY column_name;

-- 2. Check if new tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('mcp_sessions', 'context_blocks', 'context_traces', 'context_events')
ORDER BY table_name;

-- 3. Test inserting data (requires a valid user and project)
-- First, get a test user and project
DO $$
DECLARE
  test_user_id UUID;
  test_project_id TEXT;
  test_session_id TEXT;
  test_block_id TEXT;
  test_trace_id TEXT;
BEGIN
  -- Get first user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    -- Get or create a test project
    SELECT id INTO test_project_id
    FROM public.projects
    WHERE created_by = test_user_id
    LIMIT 1;

    IF test_project_id IS NULL THEN
      -- Create a test project
      INSERT INTO public.projects (id, name, description, created_by, mcp_server_url)
      VALUES ('test-mcp-project', 'Test MCP Project', 'Testing MCP features', test_user_id, 'wss://api.frizyai.com/mcp')
      RETURNING id INTO test_project_id;
    END IF;

    -- Test MCP session creation
    INSERT INTO public.mcp_sessions (id, project_id, title, summary, status)
    VALUES ('test-session-001', test_project_id, 'Test Session', 'Testing MCP integration', 'active')
    RETURNING id INTO test_session_id;

    -- Test context block creation
    INSERT INTO public.context_blocks (id, session_id, title, type, summary, status)
    VALUES ('test-block-001', test_session_id, 'Test Block', 'coding', 'Testing context capture', 'in_progress')
    RETURNING id INTO test_block_id;

    -- Test context trace creation
    INSERT INTO public.context_traces (id, block_id, name, type, summary, duration_seconds)
    VALUES ('test-trace-001', test_block_id, 'Test Trace', 'tool_use', 'Testing trace capture', 15)
    RETURNING id INTO test_trace_id;

    -- Test context event creation
    INSERT INTO public.context_events (id, trace_id, project_id, type, tool, data, impact)
    VALUES ('test-event-001', test_trace_id, test_project_id, 'file_edit', 'editor', '{"file": "test.ts", "lines": 10}', 'high');

    RAISE NOTICE '✅ Test data created successfully!';
    RAISE NOTICE 'Project ID: %', test_project_id;
    RAISE NOTICE 'Session ID: %', test_session_id;
    RAISE NOTICE 'Block ID: %', test_block_id;
    RAISE NOTICE 'Trace ID: %', test_trace_id;
  ELSE
    RAISE NOTICE '⚠️ No users found. Please create a user first.';
  END IF;
END $$;

-- 4. Query the test data
SELECT
  ms.id as session_id,
  ms.title as session_title,
  ms.status,
  p.name as project_name,
  COUNT(DISTINCT cb.id) as block_count,
  COUNT(DISTINCT ct.id) as trace_count,
  COUNT(DISTINCT ce.id) as event_count
FROM public.mcp_sessions ms
JOIN public.projects p ON ms.project_id = p.id
LEFT JOIN public.context_blocks cb ON ms.id = cb.session_id
LEFT JOIN public.context_traces ct ON cb.id = ct.block_id
LEFT JOIN public.context_events ce ON ct.id = ce.trace_id
WHERE ms.id = 'test-session-001'
GROUP BY ms.id, ms.title, ms.status, p.name;

-- 5. Test the view
SELECT * FROM project_mcp_statistics
WHERE project_id IN (
  SELECT id FROM public.projects
  WHERE name = 'Test MCP Project'
);

-- 6. Test RLS policies (run as authenticated user)
-- This should only show projects/sessions for the current user
SELECT
  p.name as project,
  COUNT(ms.id) as mcp_sessions
FROM public.projects p
LEFT JOIN public.mcp_sessions ms ON p.id = ms.project_id
GROUP BY p.name;

-- 7. Clean up test data (optional)
/*
DELETE FROM public.context_events WHERE id = 'test-event-001';
DELETE FROM public.context_traces WHERE id = 'test-trace-001';
DELETE FROM public.context_blocks WHERE id = 'test-block-001';
DELETE FROM public.mcp_sessions WHERE id = 'test-session-001';
DELETE FROM public.projects WHERE id = 'test-mcp-project';
*/

-- Summary query to see what's in the database
SELECT
  'Projects' as table_name, COUNT(*) as record_count FROM public.projects
UNION ALL
SELECT 'MCP Sessions', COUNT(*) FROM public.mcp_sessions
UNION ALL
SELECT 'Context Blocks', COUNT(*) FROM public.context_blocks
UNION ALL
SELECT 'Context Traces', COUNT(*) FROM public.context_traces
UNION ALL
SELECT 'Context Events', COUNT(*) FROM public.context_events
ORDER BY table_name;