/**
 * Generate Embedding Edge Function
 * Generates vector embeddings for chat messages using Google's Generative AI
 * and stores them in the chat_messages table for semantic search
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbeddingRequest {
  message_id?: string;
  content: string;
  return_embedding?: boolean; // If true, return the embedding without storing
}

// Google's text-embedding-004 produces 768 dimensions
const EMBEDDING_DIMENSIONS = 768;

async function generateGoogleEmbedding(apiKey: string, texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Google's API processes one text at a time for embeddings
  for (const text of texts) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text }]
          },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${error}`);
    }

    const data = await response.json();
    embeddings.push(data.embedding.values);
  }

  return embeddings;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!googleApiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()

    // Check if this is a query-only request (for semantic search)
    if (body.return_embedding && body.content) {
      const [embedding] = await generateGoogleEmbedding(googleApiKey, [body.content]);

      return new Response(
        JSON.stringify({ embedding }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Support both single message and batch processing
    const messages: EmbeddingRequest[] = body.messages || [{ message_id: body.message_id, content: body.content }]

    if (!messages.length || !messages[0].content) {
      throw new Error('No content provided for embedding')
    }

    // Filter out empty content
    const validMessages = messages.filter(m => m.content && m.content.trim().length > 0)

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No valid content to embed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate embeddings using Google AI
    const embeddings = await generateGoogleEmbedding(
      googleApiKey,
      validMessages.map(m => m.content)
    );

    // Update each message with its embedding
    const updatePromises = validMessages.map(async (message, index) => {
      const embedding = embeddings[index]

      if (!message.message_id) {
        return { success: true, embedding }
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ embedding })
        .eq('id', message.message_id)

      if (error) {
        console.error(`Failed to update embedding for message ${message.message_id}:`, error)
        return { message_id: message.message_id, success: false, error: error.message }
      }

      return { message_id: message.message_id, success: true }
    })

    const results = await Promise.all(updatePromises)
    const failed = results.filter(r => !r.success)

    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        processed: results.length,
        failed: failed.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating embedding:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
