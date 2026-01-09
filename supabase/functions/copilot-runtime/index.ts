/**
 * CopilotKit Runtime Edge Function
 * Implements full AG-UI protocol for CopilotKit v1.50+ agent support
 * Uses Perplexity API for intelligent astrocartography responses
 */

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkRateLimit,
  getClientIp,
  buildIdentifier,
  getRateLimitConfig,
  getUserTier,
  rateLimitHeaders,
  RATE_LIMIT_ENDPOINTS,
  type RateLimitResult,
} from '../_shared/rate-limit.ts';

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

// System prompt for astrocartography AI agent
const SYSTEM_PROMPT = `You are an expert astrocartography guide helping users understand their planetary lines and find ideal locations. You have deep knowledge of:

1. ASTROCARTOGRAPHY LINES:
- ASC (Ascendant) lines: Where a planet was rising. Affects personal identity, first impressions, and how you're perceived.
- DSC (Descendant) lines: Where a planet was setting. Affects relationships, partnerships, and interactions with others.
- MC (Midheaven) lines: Where a planet was at its highest point. Affects career, public image, and life direction.
- IC (Imum Coeli) lines: Where a planet was at its lowest point. Affects home, family, and inner foundations.

2. PLANETARY MEANINGS:
- Sun: Vitality, leadership, recognition, ego
- Moon: Emotions, intuition, home, nurturing
- Mercury: Communication, learning, commerce, travel
- Venus: Love, beauty, art, harmony, pleasure
- Mars: Energy, action, competition, courage
- Jupiter: Expansion, luck, growth, wisdom, travel
- Saturn: Structure, discipline, challenges, karma
- Uranus: Innovation, freedom, change, technology
- Neptune: Spirituality, creativity, illusion, dreams
- Pluto: Transformation, power, depth, rebirth

GUIDELINES:
- Be conversational and friendly
- Keep responses concise (2-3 paragraphs max)
- When discussing cities, include practical travel info
- Connect astrological insights to practical life decisions
- When you want to show something on the map, use the available tools
- Always use tools when relevant to enhance the user's experience`;

// Tool definitions for Perplexity (OpenAI-compatible format)
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'highlightLine',
      description: 'Highlight a specific planetary line on the map to show the user. Use this when discussing a particular line.',
      parameters: {
        type: 'object',
        properties: {
          planet: {
            type: 'string',
            enum: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
            description: 'The planet whose line to highlight',
          },
          lineType: {
            type: 'string',
            enum: ['ASC', 'DSC', 'MC', 'IC'],
            description: 'The type of line to highlight',
          },
        },
        required: ['planet', 'lineType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'zoomToLocation',
      description: 'Zoom the map to a specific location. Use this when recommending or discussing a city or region.',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'The latitude to zoom to' },
          longitude: { type: 'number', description: 'The longitude to zoom to' },
          locationName: { type: 'string', description: 'Name of the location (optional)' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyzeLocation',
      description: 'Analyze the planetary influences at a specific location',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'The latitude to analyze' },
          longitude: { type: 'number', description: 'The longitude to analyze' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'togglePlanetVisibility',
      description: "Show or hide a specific planet's lines on the map",
      parameters: {
        type: 'object',
        properties: {
          planet: {
            type: 'string',
            enum: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
            description: 'The planet to toggle',
          },
        },
        required: ['planet'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'relocateChart',
      description: 'Relocate the birth chart to a new location to see how planetary influences change',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'The latitude to relocate to' },
          longitude: { type: 'number', description: 'The longitude to relocate to' },
          locationName: { type: 'string', description: 'Name of the location (optional)' },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
];

// Convert tools to AG-UI actions format for /info endpoint
const ACTIONS = TOOLS.map(tool => ({
  name: tool.function.name,
  description: tool.function.description,
  parameters: Object.entries(tool.function.parameters.properties || {}).map(([name, prop]: [string, any]) => ({
    name,
    type: prop.type,
    description: prop.description,
    required: (tool.function.parameters.required || []).includes(name),
  })),
}));

// AG-UI Agent definition for CopilotKit v1.50+
const AGENTS = {
  default: {
    name: 'default',
    description: 'Astrocartography AI agent powered by Perplexity that helps users understand their planetary lines and find ideal locations worldwide.',
  },
};

// ============================================================================
// Types
// ============================================================================

interface AGUIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  name?: string;
  toolCallId?: string;
}

interface RunAgentInput {
  threadId?: string;
  runId?: string;
  agentId?: string;
  messages?: AGUIMessage[];
  tools?: any[];
  context?: Record<string, unknown>;
  forwardedProps?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

// ============================================================================
// Utilities
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function encodeEvent(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function buildContextFromState(state: Record<string, unknown> | undefined): string {
  if (!state) return '';

  const parts: string[] = [];
  for (const [key, value] of Object.entries(state)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
  }
  return parts.length > 0 ? `\n\nCURRENT USER CONTEXT:\n${parts.join('\n')}` : '';
}

// ============================================================================
// Perplexity API
// ============================================================================

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callPerplexity(messages: PerplexityMessage[]): Promise<{
  content: string;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }>;
}> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  // Try with tools first
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Perplexity API error with tools:', response.status, error);

    // Fallback without tools
    console.log('Retrying without tools...');
    const fallbackResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!fallbackResponse.ok) {
      const fallbackError = await fallbackResponse.text();
      throw new Error(`Perplexity API error: ${fallbackResponse.status} - ${fallbackError.slice(0, 200)}`);
    }

    const fallbackData = await fallbackResponse.json();
    return {
      content: fallbackData.choices?.[0]?.message?.content || '',
      toolCalls: [],
    };
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;

  const toolCalls = (message?.tool_calls || []).map((tc: any) => ({
    id: tc.id || generateId(),
    name: tc.function?.name,
    arguments: JSON.parse(tc.function?.arguments || '{}'),
  }));

  return {
    content: message?.content || '',
    toolCalls,
  };
}

// ============================================================================
// AG-UI Event Stream
// ============================================================================

async function* streamAGUIEvents(input: RunAgentInput): AsyncGenerator<string> {
  const threadId = input.threadId || generateId();
  const runId = input.runId || generateId();
  const messageId = generateId();

  // Emit RunStartedEvent
  yield encodeEvent({
    type: 'RunStartedEvent',
    threadId,
    runId,
  });

  try {
    // Build messages for Perplexity
    const contextMessage = buildContextFromState(input.state || input.forwardedProps);

    // Convert AG-UI messages to Perplexity format
    const perplexityMessages: PerplexityMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + contextMessage,
      },
    ];

    // Add conversation history
    if (input.messages) {
      for (const msg of input.messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          perplexityMessages.push({
            role: msg.role,
            content: msg.content || '',
          });
        }
      }
    }

    // Call Perplexity
    const { content, toolCalls } = await callPerplexity(perplexityMessages);

    // Emit tool calls as ToolCallEvents
    for (const toolCall of toolCalls) {
      // ToolCallStartEvent
      yield encodeEvent({
        type: 'ToolCallStartEvent',
        toolCallId: toolCall.id,
        toolCallName: toolCall.name,
      });

      // ToolCallArgsEvent
      yield encodeEvent({
        type: 'ToolCallArgsEvent',
        toolCallId: toolCall.id,
        delta: JSON.stringify(toolCall.arguments),
      });

      // ToolCallEndEvent
      yield encodeEvent({
        type: 'ToolCallEndEvent',
        toolCallId: toolCall.id,
      });
    }

    // Emit text message
    if (content) {
      // TextMessageStartEvent
      yield encodeEvent({
        type: 'TextMessageStartEvent',
        messageId,
        role: 'assistant',
      });

      // Stream content in chunks
      const words = content.split(' ');
      let chunk = '';
      for (let i = 0; i < words.length; i++) {
        chunk += (i === 0 ? '' : ' ') + words[i];
        if (chunk.length > 50 || i === words.length - 1) {
          yield encodeEvent({
            type: 'TextMessageContentEvent',
            messageId,
            delta: chunk,
          });
          chunk = '';
        }
      }

      // TextMessageEndEvent
      yield encodeEvent({
        type: 'TextMessageEndEvent',
        messageId,
      });
    }

    // Emit RunFinishedEvent
    yield encodeEvent({
      type: 'RunFinishedEvent',
      threadId,
      runId,
    });

  } catch (error) {
    console.error('Error in AG-UI stream:', error);

    // Emit error message
    yield encodeEvent({
      type: 'TextMessageStartEvent',
      messageId,
      role: 'assistant',
    });

    yield encodeEvent({
      type: 'TextMessageContentEvent',
      messageId,
      delta: `I apologize, but I encountered an error: ${error.message}`,
    });

    yield encodeEvent({
      type: 'TextMessageEndEvent',
      messageId,
    });

    // Emit RunErrorEvent
    yield encodeEvent({
      type: 'RunErrorEvent',
      message: error.message,
      code: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// Rate Limit Response
// ============================================================================

function createRateLimitResponse(
  rateLimitResult: RateLimitResult,
  additionalHeaders: Record<string, string> = {}
): Response {
  const threadId = generateId();
  const runId = generateId();
  const messageId = generateId();

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
  );

  const events = [
    encodeEvent({ type: 'RunStartedEvent', threadId, runId }),
    encodeEvent({ type: 'TextMessageStartEvent', messageId, role: 'assistant' }),
    encodeEvent({
      type: 'TextMessageContentEvent',
      messageId,
      delta: `I'm currently receiving too many requests. Please wait ${retryAfterSeconds} seconds before trying again.`
    }),
    encodeEvent({ type: 'TextMessageEndEvent', messageId }),
    encodeEvent({
      type: 'RunErrorEvent',
      message: `Rate limit exceeded. Please retry after ${retryAfterSeconds} seconds.`,
      code: 'RATE_LIMIT_EXCEEDED',
    }),
  ];

  return new Response(events.join(''), {
    status: 429,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...additionalHeaders,
      ...rateLimitHeaders(rateLimitResult),
    },
  });
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle /info endpoint for AG-UI agent discovery
    if (pathname.endsWith('/info') || url.searchParams.get('info') === 'true') {
      console.log('Handling /info request - returning agent info');
      return new Response(
        JSON.stringify({
          version: '1.50.1',
          agents: AGENTS,
          actions: ACTIONS,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Initialize Supabase client for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check
    const clientIp = getClientIp(req);
    const identifier = buildIdentifier(null, clientIp);
    const userTier = getUserTier(null);
    const rateLimitConfig = getRateLimitConfig(RATE_LIMIT_ENDPOINTS.COPILOT_RUNTIME, userTier);

    const rateLimitResult = await checkRateLimit(
      supabase,
      identifier,
      RATE_LIMIT_ENDPOINTS.COPILOT_RUNTIME,
      rateLimitConfig
    );

    if (!rateLimitResult.allowed) {
      console.warn(`[SECURITY] Rate limit exceeded for copilot-runtime. IP: ${clientIp}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Parse request body
    let body: RunAgentInput;
    try {
      body = await req.json() as RunAgentInput;
    } catch {
      // Empty body - return info
      console.log('Empty/invalid body, returning info');
      return new Response(
        JSON.stringify({
          version: '1.50.1',
          agents: AGENTS,
          actions: ACTIONS,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // If no messages, return info
    if (!body.messages || body.messages.length === 0) {
      console.log('No messages, returning info');
      return new Response(
        JSON.stringify({
          version: '1.50.1',
          agents: AGENTS,
          actions: ACTIONS,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Processing AG-UI run request:', {
      agentId: body.agentId,
      threadId: body.threadId,
      messageCount: body.messages?.length,
    });

    // Create AG-UI event stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of streamAGUIEvents(body)) {
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...rateLimitHeaders(rateLimitResult),
      },
    });

  } catch (error) {
    console.error('Error in copilot-runtime:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
