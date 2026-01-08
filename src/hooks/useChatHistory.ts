/**
 * Chat History Hook
 * Manages chat conversations and messages for authenticated users
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth-context';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tool_calls?: unknown;
  interpretation?: unknown;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  birth_data?: unknown;
  metadata?: unknown;
  summary?: string | null;
  topics?: string[];
}

export interface SemanticSearchResult {
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  similarity: number;
}

export interface UseChatHistoryReturn {
  // Current conversation
  currentConversation: ChatConversation | null;
  messages: ChatMessage[];

  // Conversation list
  conversations: ChatConversation[];
  loadingConversations: boolean;

  // Actions
  createConversation: (birthData?: unknown) => Promise<ChatConversation | null>;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;

  // Message actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'created_at'>) => Promise<ChatMessage | null>;
  loadingMessages: boolean;

  // Semantic search
  searchChatHistory: (query: string, matchCount?: number) => Promise<SemanticSearchResult[]>;
  getRelatedContext: (query: string) => Promise<string | null>;

  // Refresh
  refreshConversations: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { user } = useAuth();
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load user's conversations
  const refreshConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      return;
    }

    setLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // Load conversations on mount and when user changes
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Create a new conversation
  const createConversation = useCallback(async (birthData?: unknown): Promise<ChatConversation | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          birth_data: birthData,
          title: 'New Conversation',
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversation(data);
      setMessages([]);
      setConversations(prev => [data, ...prev]);

      return data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  }, [user]);

  // Load a specific conversation and its messages
  const loadConversation = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      // Load conversation
      const { data: convData, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setCurrentConversation(convData);

      // Load messages
      const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      setMessages(msgData || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [currentConversation]);

  // Add a message to the current conversation
  const addMessage = useCallback(async (
    message: Omit<ChatMessage, 'id' | 'created_at'>
  ): Promise<ChatMessage | null> => {
    if (!currentConversation) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversation.id,
          role: message.role,
          content: message.content,
          tool_calls: message.tool_calls,
          interpretation: message.interpretation,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);

      // Update conversation title from first user message
      if (message.role === 'user' && messages.length === 0) {
        const title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        await supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', currentConversation.id);

        setCurrentConversation(prev => prev ? { ...prev, title } : null);
        setConversations(prev =>
          prev.map(c => c.id === currentConversation.id ? { ...c, title } : c)
        );
      }

      // Generate embedding for the message (fire and forget)
      if (data.id && message.content.length > 10) {
        generateEmbedding(data.id, message.content).catch(err => {
          console.warn('Failed to generate embedding:', err);
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to add message:', error);
      return null;
    }
  }, [currentConversation, messages.length]);

  // Generate embedding for a message
  const generateEmbedding = useCallback(async (messageId: string, content: string) => {
    try {
      const { error } = await supabase.functions.invoke('generate-embedding', {
        body: { message_id: messageId, content },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }
  }, []);

  // Search chat history semantically
  const searchChatHistory = useCallback(async (
    query: string,
    matchCount: number = 5
  ): Promise<SemanticSearchResult[]> => {
    if (!user) return [];

    try {
      // First, get the embedding for the query
      const { data: embeddingResponse, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { content: query, return_embedding: true },
      });

      if (embeddingError) throw embeddingError;
      if (!embeddingResponse?.embedding) return [];

      // Then search using the embedding
      const { data, error } = await supabase.rpc('search_chat_history', {
        query_embedding: embeddingResponse.embedding,
        user_uuid: user.id,
        match_count: matchCount,
        similarity_threshold: 0.7,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to search chat history:', error);
      return [];
    }
  }, [user]);

  // Get related context as a formatted string for AI injection
  const getRelatedContext = useCallback(async (query: string): Promise<string | null> => {
    const results = await searchChatHistory(query, 3);

    if (results.length === 0) return null;

    // Format the context for AI consumption
    const contextParts = results.map((result, index) => {
      const date = new Date(result.created_at).toLocaleDateString();
      return `[Previous conversation on ${date}]\n${result.role}: ${result.content}`;
    });

    return `Here is relevant context from previous conversations:\n\n${contextParts.join('\n\n---\n\n')}`;
  }, [searchChatHistory]);

  return {
    currentConversation,
    messages,
    conversations,
    loadingConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    addMessage,
    loadingMessages,
    searchChatHistory,
    getRelatedContext,
    refreshConversations,
  };
}
