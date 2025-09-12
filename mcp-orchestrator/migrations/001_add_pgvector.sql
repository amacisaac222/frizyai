-- Add pgvector extension for semantic search
-- This should be run by a database administrator with proper permissions

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to context_items
ALTER TABLE context_items 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS context_items_embedding_idx 
ON context_items USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add embedding column to blocks for block similarity search
ALTER TABLE blocks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for block embeddings
CREATE INDEX IF NOT EXISTS blocks_embedding_idx 
ON blocks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function for updating embeddings
CREATE OR REPLACE FUNCTION update_context_item_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This would typically be called by the application
  -- when content changes, to trigger embedding regeneration
  NEW.embedding = NULL; -- Reset embedding to trigger regeneration
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset embeddings when content changes
DROP TRIGGER IF EXISTS reset_embedding_on_content_change ON context_items;
CREATE TRIGGER reset_embedding_on_content_change
  BEFORE UPDATE ON context_items
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION update_context_item_embedding();

-- Create similar trigger for blocks
CREATE OR REPLACE FUNCTION update_block_embedding()
RETURNS TRIGGER AS $$
BEGIN
  NEW.embedding = NULL; -- Reset embedding to trigger regeneration
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reset_block_embedding_on_content_change ON blocks;
CREATE TRIGGER reset_block_embedding_on_content_change
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION update_block_embedding();

-- Create a view for items that need embedding generation
CREATE OR REPLACE VIEW items_needing_embeddings AS
SELECT 
  'context_item' as item_type,
  id,
  project_id,
  COALESCE(title, '') || ' ' || content as text_content,
  created_at
FROM context_items 
WHERE embedding IS NULL
UNION ALL
SELECT 
  'block' as item_type,
  id,
  project_id,
  title || COALESCE(' ' || content, '') as text_content,
  created_at
FROM blocks 
WHERE embedding IS NULL
ORDER BY created_at DESC;

-- Create function for semantic search across all content
CREATE OR REPLACE FUNCTION semantic_search(
  p_project_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
  item_type TEXT,
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      'context_item'::text as item_type,
      ci.id,
      ci.title,
      ci.content,
      (1 - (ci.embedding <=> p_query_embedding)) as similarity,
      ci.created_at
    FROM context_items ci
    WHERE ci.project_id = p_project_id 
      AND ci.embedding IS NOT NULL
      AND (1 - (ci.embedding <=> p_query_embedding)) >= p_threshold
    
    UNION ALL
    
    SELECT 
      'block'::text as item_type,
      b.id,
      b.title,
      b.content,
      (1 - (b.embedding <=> p_query_embedding)) as similarity,
      b.created_at
    FROM blocks b
    WHERE b.project_id = p_project_id 
      AND b.embedding IS NOT NULL
      AND (1 - (b.embedding <=> p_query_embedding)) >= p_threshold
  ) combined
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;