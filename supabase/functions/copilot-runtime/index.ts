/**
 * CopilotKit Runtime Edge Function
 * Implements CopilotKit's AG-UI protocol for agentic communications
 * Uses Perplexity API (OpenAI-compatible) for intelligent astrocartography responses
 */

import { corsHeaders } from '../_shared/cors.ts';

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

// System prompt for astrocartography AI
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

// Frontend actions for /info endpoint
const FRONTEND_ACTIONS = TOOLS.map(tool => ({
  name: tool.function.name,
  description: tool.function.description,
  parameters: Object.entries(tool.function.parameters.properties || {}).map(([name, prop]: [string, any]) => ({
    name,
    type: prop.type,
    description: prop.description,
    required: (tool.function.parameters.required || []).includes(name),
  })),
}));

// Define the default agent
const AGENTS = [
  {
    id: 'default',
    name: 'default',
    description: 'Astrocartography AI guide that helps users understand their planetary lines and find ideal locations',
  },
];

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface CopilotKitRequest {
  messages: Message[];
  actions?: any[];
  properties?: Record<string, unknown>;
  threadId?: string;
  runId?: string;
}

// Generate a unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// Build context message from CopilotKit properties (readable values)
function buildContextFromProperties(properties: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(properties)) {
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

// Create AG-UI event encoder
function encodeEvent(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Call Perplexity API with tool support
async function callPerplexityWithTools(messages: Message[]): Promise<{
  content: string;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }>;
}> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  // Note: Perplexity's sonar models support tool calling via OpenAI-compatible API
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

    // Always retry without tools on any error (tool calling may not be fully supported)
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
      console.error('Fallback also failed:', fallbackResponse.status, fallbackError);
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

// Stream AG-UI events for a chat response
async function* streamAGUIEvents(
  messages: Message[],
  properties: Record<string, unknown>,
  threadId: string,
): AsyncGenerator<string> {
  const runId = generateId();
  const messageId = generateId();

  // Emit RUN_STARTED event
  yield encodeEvent({
    type: 'RUN_STARTED',
    threadId,
    runId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Build messages for Perplexity
    const contextMessage = buildContextFromProperties(properties);

    // Filter to only include roles Perplexity supports (system, user, assistant)
    // and strip any tool-related fields
    const userAssistantMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
      }));

    const perplexityMessages: Message[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + contextMessage,
      },
      ...userAssistantMessages,
    ];

    // Get response from Perplexity with tool support
    const { content, toolCalls } = await callPerplexityWithTools(perplexityMessages);

    // Emit tool calls first (ActionExecution events)
    for (const toolCall of toolCalls) {
      const actionId = generateId();

      // ActionExecutionStart
      yield encodeEvent({
        type: 'ACTION_EXECUTION_START',
        actionExecutionId: actionId,
        actionName: toolCall.name,
        timestamp: new Date().toISOString(),
      });

      // ActionExecutionArgs
      yield encodeEvent({
        type: 'ACTION_EXECUTION_ARGS',
        actionExecutionId: actionId,
        args: JSON.stringify(toolCall.arguments),
        timestamp: new Date().toISOString(),
      });

      // ActionExecutionEnd
      yield encodeEvent({
        type: 'ACTION_EXECUTION_END',
        actionExecutionId: actionId,
        timestamp: new Date().toISOString(),
      });
    }

    // Emit text message if there's content
    if (content) {
      // TEXT_MESSAGE_START
      yield encodeEvent({
        type: 'TEXT_MESSAGE_START',
        messageId,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      });

      // Stream content in chunks
      const words = content.split(' ');
      let chunk = '';
      for (let i = 0; i < words.length; i++) {
        chunk += (i === 0 ? '' : ' ') + words[i];
        if (chunk.length > 50 || i === words.length - 1) {
          yield encodeEvent({
            type: 'TEXT_MESSAGE_CONTENT',
            messageId,
            delta: chunk,
            timestamp: new Date().toISOString(),
          });
          chunk = '';
        }
      }

      // TEXT_MESSAGE_END
      yield encodeEvent({
        type: 'TEXT_MESSAGE_END',
        messageId,
        timestamp: new Date().toISOString(),
      });
    }

    // Emit RUN_FINISHED event
    yield encodeEvent({
      type: 'RUN_FINISHED',
      threadId,
      runId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in AG-UI stream:', error);

    // Emit error as text message
    yield encodeEvent({
      type: 'TEXT_MESSAGE_START',
      messageId,
      role: 'assistant',
      timestamp: new Date().toISOString(),
    });

    yield encodeEvent({
      type: 'TEXT_MESSAGE_CONTENT',
      messageId,
      delta: `I apologize, but I encountered an error: ${error.message}`,
      timestamp: new Date().toISOString(),
    });

    yield encodeEvent({
      type: 'TEXT_MESSAGE_END',
      messageId,
      timestamp: new Date().toISOString(),
    });

    // Emit RUN_ERROR event
    yield encodeEvent({
      type: 'RUN_ERROR',
      message: error.message,
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Handle /info endpoint for CopilotKit runtime sync
    if (pathname.endsWith('/info') || url.searchParams.get('info') === 'true') {
      console.log('Handling /info request');
      return new Response(
        JSON.stringify({
          actions: FRONTEND_ACTIONS,
          agents: AGENTS,
          sdkVersion: '1.50.1',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse the request body for chat requests
    let body: CopilotKitRequest;
    try {
      body = await req.json() as CopilotKitRequest;
    } catch {
      // Empty body or invalid JSON - return info response
      console.log('Empty/invalid body, returning info');
      return new Response(
        JSON.stringify({
          actions: FRONTEND_ACTIONS,
          agents: AGENTS,
          sdkVersion: '1.50.1',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { messages, properties = {}, threadId = generateId() } = body;

    // If no messages, CopilotKit might be requesting runtime info
    if (!messages || messages.length === 0) {
      console.log('No messages, returning info');
      return new Response(
        JSON.stringify({
          actions: FRONTEND_ACTIONS,
          agents: AGENTS,
          sdkVersion: '1.50.1',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Processing chat request with', messages.length, 'messages');
    console.log('Properties:', JSON.stringify(properties));

    // Create a readable stream for AG-UI events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of streamAGUIEvents(messages, properties, threadId)) {
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
