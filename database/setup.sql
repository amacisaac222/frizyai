-- Frizy Database Setup - Complete Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Profile Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on-hold', 'archived')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Blocks Table (Main work items)
CREATE TABLE IF NOT EXISTS public.blocks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    lane TEXT NOT NULL CHECK (lane IN ('vision', 'goals', 'current', 'next', 'context')),
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    effort INTEGER DEFAULT 1 CHECK (effort > 0),
    claude_sessions INTEGER DEFAULT 0,
    last_worked TIMESTAMP WITH TIME ZONE,
    related_session_ids TEXT[] DEFAULT '{}',
    energy_level TEXT DEFAULT 'medium' CHECK (energy_level IN ('low', 'medium', 'high', 'peak')),
    complexity TEXT DEFAULT 'moderate' CHECK (complexity IN ('simple', 'moderate', 'complex')),
    inspiration INTEGER DEFAULT 5 CHECK (inspiration >= 1 AND inspiration <= 10),
    mood TEXT CHECK (mood IN ('excited', 'focused', 'motivated', 'stressed', 'tired', 'creative')),
    tags TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    blocked_by TEXT[] DEFAULT '{}',
    subtasks JSONB DEFAULT '[]',
    ai_suggestions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Events Table (Event Sourcing)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id TEXT NOT NULL, -- project_id or block_id
    stream_type TEXT NOT NULL CHECK (stream_type IN ('project', 'block', 'user')),
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sequence_number BIGSERIAL
);

-- 5. Claude Sessions Table (Track AI interactions)
CREATE TABLE IF NOT EXISTS public.claude_sessions (
    id TEXT PRIMARY KEY,
    block_id TEXT REFERENCES public.blocks(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT DEFAULT 'coding' CHECK (session_type IN ('coding', 'planning', 'debugging', 'research')),
    context_data JSONB DEFAULT '{}',
    messages_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    outcomes JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Block Relationships Table (Dependencies, etc.)
CREATE TABLE IF NOT EXISTS public.block_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_block_id TEXT REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    target_block_id TEXT REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('depends_on', 'blocks', 'related_to', 'parent_of', 'child_of')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_block_id, target_block_id, relationship_type)
);

-- 7. Collaboration Table (Real-time collaboration)
CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);

CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON public.blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_by ON public.blocks(created_by);
CREATE INDEX IF NOT EXISTS idx_blocks_lane ON public.blocks(lane);
CREATE INDEX IF NOT EXISTS idx_blocks_status ON public.blocks(status);
CREATE INDEX IF NOT EXISTS idx_blocks_priority ON public.blocks(priority);
CREATE INDEX IF NOT EXISTS idx_blocks_last_worked ON public.blocks(last_worked);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON public.blocks(created_at);

CREATE INDEX IF NOT EXISTS idx_events_stream_id ON public.events(stream_id);
CREATE INDEX IF NOT EXISTS idx_events_stream_type ON public.events(stream_type);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_sequence ON public.events(sequence_number);

CREATE INDEX IF NOT EXISTS idx_claude_sessions_block_id ON public.claude_sessions(block_id);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_project_id ON public.claude_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_user_id ON public.claude_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_block_relationships_source ON public.block_relationships(source_block_id);
CREATE INDEX IF NOT EXISTS idx_block_relationships_target ON public.block_relationships(target_block_id);

-- Create Updated At Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON public.blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claude_sessions_updated_at BEFORE UPDATE ON public.claude_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: Users can see projects they created or have access to
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = created_by);

-- Blocks: Users can see blocks in their projects
CREATE POLICY "Users can view blocks in own projects" ON public.blocks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = blocks.project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create blocks in own projects" ON public.blocks
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update blocks in own projects" ON public.blocks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = blocks.project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete blocks in own projects" ON public.blocks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = blocks.project_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Events: Users can see events for their streams
CREATE POLICY "Users can view own events" ON public.events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Claude Sessions: Users can see their own sessions
CREATE POLICY "Users can view own claude sessions" ON public.claude_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create claude sessions" ON public.claude_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claude sessions" ON public.claude_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Block Relationships: Based on block access
CREATE POLICY "Users can view block relationships in own projects" ON public.block_relationships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.blocks 
            JOIN public.projects ON blocks.project_id = projects.id
            WHERE blocks.id = block_relationships.source_block_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create block relationships in own projects" ON public.block_relationships
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.blocks 
            JOIN public.projects ON blocks.project_id = projects.id
            WHERE blocks.id = source_block_id 
            AND projects.created_by = auth.uid()
        )
    );

-- Collaboration Sessions: Users can see sessions in their projects
CREATE POLICY "Users can view collaboration in own projects" ON public.collaboration_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = collaboration_sessions.project_id 
            AND projects.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create collaboration sessions" ON public.collaboration_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collaboration sessions" ON public.collaboration_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample data for testing
INSERT INTO public.projects (id, name, description, created_by, status) VALUES
    ('sample-project-1', 'Sample Project', 'A demo project for testing', (SELECT id FROM auth.users LIMIT 1), 'active')
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Frizy database setup completed successfully! 🎉' as message;