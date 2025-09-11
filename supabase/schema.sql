-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE block_lane AS ENUM ('vision', 'goals', 'current', 'next', 'context');
CREATE TYPE block_status AS ENUM ('not_started', 'in_progress', 'blocked', 'completed', 'archived');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE energy_level AS ENUM ('low', 'medium', 'high', 'peak');
CREATE TYPE complexity AS ENUM ('simple', 'moderate', 'complex', 'unknown');
CREATE TYPE project_mood AS ENUM ('excited', 'focused', 'stressed', 'overwhelmed', 'motivated', 'tired');
CREATE TYPE mcp_connection_status AS ENUM ('connected', 'disconnected', 'error', 'unknown');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- User preferences
  timezone TEXT DEFAULT 'UTC',
  default_energy_level energy_level DEFAULT 'medium',
  preferred_complexity complexity DEFAULT 'moderate',
  
  -- Analytics
  total_projects INTEGER DEFAULT 0,
  total_blocks INTEGER DEFAULT 0,
  total_claude_sessions INTEGER DEFAULT 0
);

-- Projects table
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic project info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Project state
  mood project_mood,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analytics
  total_blocks INTEGER DEFAULT 0,
  completed_blocks INTEGER DEFAULT 0,
  total_claude_sessions INTEGER DEFAULT 0,
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  
  CONSTRAINT projects_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Blocks table
CREATE TABLE public.blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  
  -- Organization
  lane block_lane NOT NULL,
  status block_status DEFAULT 'not_started',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Priority and effort
  priority priority DEFAULT 'medium',
  effort DECIMAL(10,2) DEFAULT 1.0 CHECK (effort >= 0),
  
  -- Claude integration
  claude_sessions INTEGER DEFAULT 0,
  last_worked TIMESTAMP WITH TIME ZONE,
  related_session_ids TEXT[] DEFAULT '{}',
  
  -- Vibe coding attributes
  energy_level energy_level DEFAULT 'medium',
  complexity complexity DEFAULT 'moderate',
  inspiration INTEGER DEFAULT 5 CHECK (inspiration >= 1 AND inspiration <= 10),
  mood TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  
  -- Dependencies
  dependencies UUID[] DEFAULT '{}', -- References other block IDs
  blocked_by UUID[] DEFAULT '{}',   -- References other block IDs
  
  -- Advanced features
  subtasks JSONB DEFAULT '[]',
  ai_suggestions JSONB DEFAULT '[]',
  
  CONSTRAINT blocks_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
  CONSTRAINT blocks_content_length CHECK (char_length(content) <= 5000),
  CONSTRAINT blocks_tags_limit CHECK (array_length(tags, 1) <= 10)
);

-- Claude Code sessions table
CREATE TABLE public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Session metadata
  session_id TEXT UNIQUE NOT NULL, -- Claude Code session identifier
  title TEXT,
  
  -- Context
  context_at_start JSONB DEFAULT '{}',
  context_at_end JSONB DEFAULT '{}',
  
  -- Related blocks
  related_block_ids UUID[] DEFAULT '{}',
  blocks_created UUID[] DEFAULT '{}',
  blocks_modified UUID[] DEFAULT '{}',
  
  -- Session data
  messages_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Outcomes
  insights TEXT[],
  achievements TEXT[],
  next_steps TEXT[],
  
  -- MCP integration
  mcp_status mcp_connection_status DEFAULT 'unknown',
  mcp_data JSONB DEFAULT '{}'
);

-- Context items table (captured insights and knowledge)
CREATE TABLE public.context_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'insight', -- insight, decision, learning, reference, etc.
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  
  -- Relationships
  related_block_ids UUID[] DEFAULT '{}',
  related_session_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  source TEXT, -- 'claude_session', 'manual', 'import', etc.
  confidence_score INTEGER DEFAULT 5 CHECK (confidence_score >= 1 AND confidence_score <= 10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector,
  
  CONSTRAINT context_items_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT context_items_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 10000)
);

-- Create indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_active ON public.projects(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at DESC);

CREATE INDEX idx_blocks_project_id ON public.blocks(project_id);
CREATE INDEX idx_blocks_created_by ON public.blocks(created_by);
CREATE INDEX idx_blocks_lane ON public.blocks(project_id, lane);
CREATE INDEX idx_blocks_status ON public.blocks(project_id, status);
CREATE INDEX idx_blocks_priority ON public.blocks(project_id, priority);
CREATE INDEX idx_blocks_updated_at ON public.blocks(updated_at DESC);
CREATE INDEX idx_blocks_last_worked ON public.blocks(last_worked DESC) WHERE last_worked IS NOT NULL;
CREATE INDEX idx_blocks_tags ON public.blocks USING GIN(tags);
CREATE INDEX idx_blocks_dependencies ON public.blocks USING GIN(dependencies);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_project_id ON public.sessions(project_id);
CREATE INDEX idx_sessions_session_id ON public.sessions(session_id);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX idx_sessions_related_blocks ON public.sessions USING GIN(related_block_ids);

CREATE INDEX idx_context_items_user_id ON public.context_items(user_id);
CREATE INDEX idx_context_items_project_id ON public.context_items(project_id);
CREATE INDEX idx_context_items_type ON public.context_items(project_id, type);
CREATE INDEX idx_context_items_tags ON public.context_items USING GIN(tags);
CREATE INDEX idx_context_items_search ON public.context_items USING GIN(search_vector);
CREATE INDEX idx_context_items_related_blocks ON public.context_items USING GIN(related_block_ids);

-- Create full-text search index
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_context_items_search_vector
  BEFORE INSERT OR UPDATE ON public.context_items
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_items_updated_at
  BEFORE UPDATE ON public.context_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Analytics functions
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.projects SET
      total_blocks = (
        SELECT COUNT(*) FROM public.blocks 
        WHERE project_id = NEW.project_id AND status != 'archived'
      ),
      completed_blocks = (
        SELECT COUNT(*) FROM public.blocks 
        WHERE project_id = NEW.project_id AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = NEW.project_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET
      total_blocks = (
        SELECT COUNT(*) FROM public.blocks 
        WHERE project_id = OLD.project_id AND status != 'archived'
      ),
      completed_blocks = (
        SELECT COUNT(*) FROM public.blocks 
        WHERE project_id = OLD.project_id AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = OLD.project_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION update_project_stats();