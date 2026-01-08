/**
 * useAstroAI Hook
 * Client-side hook for calling the Perplexity-powered AI chat
 * Includes subscription-based usage tracking
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { monitoredEdgeFunction } from '@/lib/monitoring';
import type { Planet, PlanetaryPosition, PlanetaryLine } from '@/lib/astro-types';
import type { LocationAnalysis } from '@/lib/location-line-utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SubscriptionResponse {
  id: string;
  remaining: number | null;
  model: string;
  isNew: boolean;
}

interface AstroContext {
  birthData?: {
    date: string;
    time: string;
    location: string;
    latitude: number;
    longitude: number;
  };
  planetaryPositions?: Array<{
    planet: string;
    sign: string;
    degree: number;
  }>;
  selectedLine?: {
    planet: string;
    lineType: string;
  };
  locationAnalysis?: {
    latitude: number;
    longitude: number;
    nearbyLines: Array<{
      planet: string;
      lineType: string;
      distance: number;
    }>;
  };
  visibleLines?: Array<{
    planet: string;
    lineType: string;
  }>;
  mode?: 'standard' | 'relocated' | 'localSpace';
}

interface ToolCall {
  action: string;
  params: Record<string, unknown>;
}

interface SubscriptionInfo {
  subscriptionId?: string;
  userId?: string;
  anonymousId?: string;
}

interface UseAstroAIOptions {
  onToolCall?: (toolCall: ToolCall) => void;
  onSubscriptionUpdate?: (subscription: SubscriptionResponse) => void;
  subscriptionInfo?: SubscriptionInfo;
  preferredModel?: 'sonar' | 'sonar-pro';
}

// Generate anonymous ID for non-authenticated users
function getAnonymousId(): string {
  const key = 'astro_anonymous_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function useAstroAI(options: UseAstroAIOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionResponse | null>(null);
  const contextRef = useRef<AstroContext>({});

  // Update context
  const updateContext = useCallback((context: Partial<AstroContext>) => {
    contextRef.current = { ...contextRef.current, ...context };
  }, []);

  // Send a message to the AI
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build conversation history
      const conversationHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Get subscription info (from options or generate anonymous ID)
      const subInfo = options.subscriptionInfo || {};
      const anonymousId = subInfo.anonymousId || (!subInfo.userId ? getAnonymousId() : undefined);

      // Call Supabase Edge Function with subscription info (monitored)
      const data = await monitoredEdgeFunction<{
        error?: string;
        reason?: string;
        subscription?: SubscriptionResponse;
        message: string;
        toolCalls?: ToolCall[];
      }>('astro-ai-chat', () =>
        supabase.functions.invoke('astro-ai-chat', {
          body: {
            message,
            context: contextRef.current,
            conversationHistory,
            subscriptionId: subInfo.subscriptionId || subscriptionState?.id,
            userId: subInfo.userId,
            anonymousId,
            preferredModel: options.preferredModel,
          },
        })
      );

      // Check for subscription limit error
      if (data.error === 'subscription_limit') {
        const limitMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `You've reached your question limit. ${data.reason} You can upgrade your plan or purchase credits to continue exploring.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, limitMessage]);
        setError(data.reason);
        return null;
      }

      // Update subscription state if returned
      if (data.subscription) {
        setSubscriptionState(data.subscription);
        if (options.onSubscriptionUpdate) {
          options.onSubscriptionUpdate(data.subscription);
        }
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Handle tool calls
      if (data.toolCalls && options.onToolCall) {
        for (const toolCall of data.toolCalls) {
          options.onToolCall(toolCall);
        }
      }

      return data.message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);

      // Add error message as assistant response
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm having trouble connecting right now. ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, options, subscriptionState]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    updateContext,
    clearMessages,
    subscription: subscriptionState,
  };
}

// Helper to convert planetary positions to context format
export function positionsToContext(
  positions: PlanetaryPosition[]
): Array<{ planet: string; sign: string; degree: number }> {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  return positions.map(p => ({
    planet: p.planet,
    sign: signs[Math.floor((p.eclipticLongitude % 360) / 30)],
    degree: p.eclipticLongitude % 30,
  }));
}

// Helper to convert location analysis to context format
export function analysisToContext(
  analysis: LocationAnalysis
): {
  latitude: number;
  longitude: number;
  nearbyLines: Array<{ planet: string; lineType: string; distance: number }>;
} {
  return {
    latitude: analysis.latitude,
    longitude: analysis.longitude,
    nearbyLines: analysis.lines.map(l => ({
      planet: l.planet,
      lineType: l.lineType || 'ASPECT',
      distance: l.distance,
    })),
  };
}

export default useAstroAI;
