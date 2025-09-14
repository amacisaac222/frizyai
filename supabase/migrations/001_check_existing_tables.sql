-- Check existing tables and their structure
-- Run this first to see what's already in your database

-- Check if projects table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check all existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- If you have an existing projects table with TEXT id, run this to migrate:
-- ALTER TABLE projects ALTER COLUMN id TYPE UUID USING id::uuid;