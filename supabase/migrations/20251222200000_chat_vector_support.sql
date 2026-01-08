-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to chat_messages (768 dimensions for Google's text-embedding-004)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_chat_messages_embedding
ON chat_messages USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search chat history semantically
CREATE OR REPLACE FUNCTION search_chat_history(
  query_embedding vector(768),
  user_uuid uuid,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  role text,
  content text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id as message_id,
    cm.conversation_id,
    cm.role,
    cm.content,
    cm.created_at,
    1 - (cm.embedding <=> query_embedding) as similarity
  FROM chat_messages cm
  JOIN chat_conversations cc ON cm.conversation_id = cc.id
  WHERE
    cc.user_id = user_uuid
    AND cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> query_embedding) > similarity_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get conversation context (messages before and after a matched message)
CREATE OR REPLACE FUNCTION get_conversation_context(
  message_uuid uuid,
  context_size int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  role text,
  content text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
  msg_created_at timestamptz;
BEGIN
  -- Get the conversation_id and created_at of the target message
  SELECT cm.conversation_id, cm.created_at INTO conv_id, msg_created_at
  FROM chat_messages cm
  WHERE cm.id = message_uuid;

  -- Return messages around the target
  RETURN QUERY
  SELECT cm.id, cm.role, cm.content, cm.created_at
  FROM chat_messages cm
  WHERE cm.conversation_id = conv_id
  ORDER BY ABS(EXTRACT(EPOCH FROM (cm.created_at - msg_created_at)))
  LIMIT context_size * 2 + 1;
END;
$$;

-- Add summary column to conversations for quick context
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS summary text;

-- Add topic/tags for filtering
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS topics text[] DEFAULT '{}';

-- Create index on topics for filtering
CREATE INDEX IF NOT EXISTS idx_chat_conversations_topics
ON chat_conversations USING gin(topics);

-- Function to update conversation summary (called periodically or on conversation end)
CREATE OR REPLACE FUNCTION update_conversation_summary(
  conv_uuid uuid,
  new_summary text,
  new_topics text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE chat_conversations
  SET
    summary = new_summary,
    topics = COALESCE(new_topics, topics),
    updated_at = NOW()
  WHERE id = conv_uuid;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION search_chat_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_context TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_summary TO authenticated;
