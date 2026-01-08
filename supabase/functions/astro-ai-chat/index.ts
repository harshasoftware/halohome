/**
 * Astro AI Chat Edge Function
 * Provides intelligent astrocartography responses
 * Handles travel recommendations, location research, and astrological insights
 * Includes subscription-based access control and usage tracking
 */

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ChatRequest {
  message: string;
  subscriptionId?: string; // AI subscription ID for tracking
  userId?: string; // User ID for authenticated users
  anonymousId?: string; // Browser fingerprint for anonymous users
  preferredModel?: 'sonar' | 'sonar-pro'; // Model preference
  context: {
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
    natalChart?: {
      ascendant: {
        degree: number;
        sign: string;
      };
      midheaven: {
        degree: number;
        sign: string;
      };
      houseSystem?: string;
      zodiacType?: string;
    };
    // Related context from past conversations (semantic search)
    relatedContext?: string | null;
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface SubscriptionCheck {
  allowed: boolean;
  reason: string;
  model: string;
  remaining: number;
  subscriptionId?: string;
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Line interpretation ratings for accurate predictions
// Rating: 1-5 (5 = extremely beneficial, 1 = very challenging)
const LINE_RATINGS: Record<string, Record<string, { rating: number; nature: string; keywords: string }>> = {
  Sun: {
    MC: { rating: 5, nature: 'beneficial', keywords: 'leadership, recognition, career success, authority, visibility' },
    IC: { rating: 4, nature: 'beneficial', keywords: 'home pride, family importance, strong roots, heritage' },
    ASC: { rating: 5, nature: 'beneficial', keywords: 'vitality, confidence, identity, self-expression, charisma' },
    DSC: { rating: 4, nature: 'beneficial', keywords: 'significant partnerships, recognized through others, important relationships' },
  },
  Moon: {
    MC: { rating: 4, nature: 'beneficial', keywords: 'emotional fulfillment through career, public nurturing, intuitive work' },
    IC: { rating: 5, nature: 'beneficial', keywords: 'emotional security, comfort, ideal for home and family' },
    ASC: { rating: 4, nature: 'beneficial', keywords: 'heightened intuition, emotional sensitivity, nurturing presence' },
    DSC: { rating: 4, nature: 'beneficial', keywords: 'nurturing relationships, emotional bonds, supportive partnerships' },
  },
  Mercury: {
    MC: { rating: 4, nature: 'beneficial', keywords: 'communication success, teaching, writing, commerce, intellectual recognition' },
    IC: { rating: 3, nature: 'neutral', keywords: 'mental stimulation at home, home-based learning or work' },
    ASC: { rating: 4, nature: 'beneficial', keywords: 'quick thinking, articulate, excellent networking, mental agility' },
    DSC: { rating: 4, nature: 'beneficial', keywords: 'intellectual partners, stimulating conversations, mental exchanges' },
  },
  Venus: {
    MC: { rating: 5, nature: 'beneficial', keywords: 'artistic success, social popularity, beauty in career, harmony' },
    IC: { rating: 4, nature: 'beneficial', keywords: 'beautiful home, love in domestic life, aesthetic environment' },
    ASC: { rating: 5, nature: 'beneficial', keywords: 'enhanced charm, attractiveness, social grace, magnetic presence' },
    DSC: { rating: 5, nature: 'beneficial', keywords: 'romantic attraction, love partnerships, harmony in relationships' },
  },
  Mars: {
    MC: { rating: 4, nature: 'mixed', keywords: 'career drive, competitive success, entrepreneurial energy, but potential conflicts' },
    IC: { rating: 2, nature: 'challenging', keywords: 'active home life but family conflicts, renovation energy, heated domestic matters' },
    ASC: { rating: 3, nature: 'mixed', keywords: 'courage and initiative, physical vitality, but impulsiveness, accident-prone' },
    DSC: { rating: 2, nature: 'challenging', keywords: 'passionate but conflictual relationships, arguments with partners' },
  },
  Jupiter: {
    MC: { rating: 5, nature: 'beneficial', keywords: 'career expansion, luck, recognition, international opportunities, abundance' },
    IC: { rating: 5, nature: 'beneficial', keywords: 'abundance at home, generous family, growth and prosperity' },
    ASC: { rating: 5, nature: 'beneficial', keywords: 'optimism, personal growth, opportunities find you, expanded worldview' },
    DSC: { rating: 5, nature: 'beneficial', keywords: 'beneficial partnerships, luck through relationships, generous partners' },
  },
  Saturn: {
    MC: { rating: 3, nature: 'mixed', keywords: 'serious achievements through discipline, authority, but delays and hard work required' },
    IC: { rating: 2, nature: 'challenging', keywords: 'building solid foundations, but family burdens, responsibilities, coldness' },
    ASC: { rating: 2, nature: 'challenging', keywords: 'discipline and maturity, but depression risk, low energy, heaviness' },
    DSC: { rating: 2, nature: 'challenging', keywords: 'committed relationships, but karmic lessons, delays in partnership, loneliness' },
  },
  Uranus: {
    MC: { rating: 3, nature: 'mixed', keywords: 'unconventional career, innovation, technology, but sudden changes, instability' },
    IC: { rating: 2, nature: 'challenging', keywords: 'unusual home life, freedom, but frequent moves, domestic disruption' },
    ASC: { rating: 3, nature: 'mixed', keywords: 'unique self-expression, originality, but erratic behavior, unpredictability' },
    DSC: { rating: 2, nature: 'challenging', keywords: 'exciting relationships, but unstable partnerships, sudden breakups' },
  },
  Neptune: {
    MC: { rating: 3, nature: 'mixed', keywords: 'creative/spiritual career, artistic recognition, but confusion, deception, unclear goals' },
    IC: { rating: 3, nature: 'mixed', keywords: 'spiritual home, idealistic family, but escapism, unclear boundaries' },
    ASC: { rating: 3, nature: 'mixed', keywords: 'enhanced intuition, creativity, compassion, but confusion, deception, unclear identity' },
    DSC: { rating: 3, nature: 'mixed', keywords: 'soulmate connections, spiritual bonds, but idealization, deception, unclear partnerships' },
  },
  Pluto: {
    MC: { rating: 3, nature: 'mixed', keywords: 'transformative career, power and influence, but power struggles, obsession' },
    IC: { rating: 2, nature: 'challenging', keywords: 'deep psychological roots, transformation, but family power struggles, intensity' },
    ASC: { rating: 3, nature: 'mixed', keywords: 'personal transformation, empowerment, but intensity, control issues' },
    DSC: { rating: 2, nature: 'challenging', keywords: 'intense relationships, deep bonds, but power struggles, obsession, manipulation' },
  },
  Chiron: {
    MC: { rating: 4, nature: 'beneficial', keywords: 'healing through career, teaching, mentoring, guiding from experience' },
    IC: { rating: 3, nature: 'mixed', keywords: 'healing family wounds, but vulnerability around home and roots' },
    ASC: { rating: 3, nature: 'mixed', keywords: 'embracing wounds as gifts, wisdom, but sensitivity and past hurts surface' },
    DSC: { rating: 4, nature: 'beneficial', keywords: 'healing through relationships, attracting those who benefit from your wisdom' },
  },
  NorthNode: {
    MC: { rating: 5, nature: 'beneficial', keywords: 'career aligned with life purpose, destiny calling in public sphere' },
    IC: { rating: 4, nature: 'beneficial', keywords: 'soul growth through family and home, karmic connections to roots' },
    ASC: { rating: 5, nature: 'beneficial', keywords: 'stepping into destined self, life path activation, soul purpose' },
    DSC: { rating: 5, nature: 'beneficial', keywords: 'karmic relationships, meeting destined partners for soul growth' },
  },
};

// Category-to-line mappings for life area analysis
const CATEGORY_BEST_LINES: Record<string, Array<{ planet: string; lineType: string; reason: string }>> = {
  career: [
    { planet: 'Sun', lineType: 'MC', reason: 'Leadership and recognition' },
    { planet: 'Jupiter', lineType: 'MC', reason: 'Career expansion and luck' },
    { planet: 'Venus', lineType: 'MC', reason: 'Artistic success and popularity' },
    { planet: 'NorthNode', lineType: 'MC', reason: 'Destiny and purpose alignment' },
  ],
  love: [
    { planet: 'Venus', lineType: 'DSC', reason: 'Romantic attraction and harmony' },
    { planet: 'Venus', lineType: 'ASC', reason: 'Enhanced charm and magnetism' },
    { planet: 'Jupiter', lineType: 'DSC', reason: 'Beneficial partnerships' },
    { planet: 'NorthNode', lineType: 'DSC', reason: 'Karmic soulmate connections' },
  ],
  health: [
    { planet: 'Sun', lineType: 'ASC', reason: 'Vitality and energy' },
    { planet: 'Jupiter', lineType: 'ASC', reason: 'Optimism and wellbeing' },
    { planet: 'Mars', lineType: 'ASC', reason: 'Physical energy (with caution)' },
  ],
  home: [
    { planet: 'Moon', lineType: 'IC', reason: 'Emotional security and comfort' },
    { planet: 'Jupiter', lineType: 'IC', reason: 'Abundance in home life' },
    { planet: 'Venus', lineType: 'IC', reason: 'Beautiful, harmonious home' },
  ],
  wellbeing: [
    { planet: 'Jupiter', lineType: 'ASC', reason: 'Optimism and personal growth' },
    { planet: 'Venus', lineType: 'ASC', reason: 'Pleasure and harmony' },
    { planet: 'Moon', lineType: 'IC', reason: 'Emotional peace and security' },
  ],
  wealth: [
    { planet: 'Jupiter', lineType: 'MC', reason: 'Financial expansion and opportunities' },
    { planet: 'Venus', lineType: 'MC', reason: 'Money through art/beauty/relationships' },
    { planet: 'Sun', lineType: 'MC', reason: 'Recognition leading to wealth' },
  ],
};

const CATEGORY_CHALLENGING_LINES: Record<string, Array<{ planet: string; lineType: string; reason: string }>> = {
  career: [
    { planet: 'Neptune', lineType: 'MC', reason: 'Career confusion and deception' },
    { planet: 'Saturn', lineType: 'MC', reason: 'Delays and hard work required' },
  ],
  love: [
    { planet: 'Saturn', lineType: 'DSC', reason: 'Heavy, karmic relationships' },
    { planet: 'Pluto', lineType: 'DSC', reason: 'Power struggles in partnerships' },
    { planet: 'Mars', lineType: 'DSC', reason: 'Conflict and arguments' },
    { planet: 'Uranus', lineType: 'DSC', reason: 'Unstable relationships' },
  ],
  health: [
    { planet: 'Saturn', lineType: 'ASC', reason: 'Low energy, chronic issues' },
    { planet: 'Neptune', lineType: 'ASC', reason: 'Confusion, unclear health' },
    { planet: 'Pluto', lineType: 'ASC', reason: 'Intensity and transformation' },
  ],
  home: [
    { planet: 'Uranus', lineType: 'IC', reason: 'Frequent moves, instability' },
    { planet: 'Mars', lineType: 'IC', reason: 'Family conflicts' },
    { planet: 'Pluto', lineType: 'IC', reason: 'Power struggles at home' },
  ],
  wellbeing: [
    { planet: 'Saturn', lineType: 'ASC', reason: 'Depression, heaviness' },
    { planet: 'Pluto', lineType: 'ASC', reason: 'Intensity, control issues' },
    { planet: 'Mars', lineType: 'ASC', reason: 'Burnout risk' },
  ],
  wealth: [
    { planet: 'Neptune', lineType: 'MC', reason: 'Financial confusion' },
    { planet: 'Uranus', lineType: 'MC', reason: 'Financial instability' },
  ],
};

// System prompt for the AI - Astrocartography methodology
const SYSTEM_PROMPT = `You are an expert astrocartography guide. You help users understand their planetary lines and find ideal locations using accurate, methodical interpretation.

## ASTROCARTOGRAPHY INTERPRETATION METHODOLOGY

### STEP 1: Understand the Four Angles
- **MC (Midheaven)**: Career, public image, life direction, reputation, achievements
- **IC (Imum Coeli)**: Home, family, roots, inner foundations, private life, property
- **ASC (Ascendant)**: Personal identity, first impressions, physical vitality, how you're perceived
- **DSC (Descendant)**: Relationships, partnerships, marriage, one-on-one interactions

### STEP 2: Planetary Meanings & Ratings
Each planet has a nature that interacts with each angle. Use these ratings (1-5, where 5=highly beneficial, 1=very challenging):

**BENEFICIAL PLANETS (Generally positive):**
- Sun: Vitality, leadership, recognition, ego, confidence
- Moon: Emotions, intuition, nurturing, home, comfort
- Venus: Love, beauty, art, harmony, pleasure, attraction
- Jupiter: Expansion, luck, growth, wisdom, abundance, opportunities
- NorthNode: Destiny, soul purpose, karmic growth

**MIXED PLANETS (Depends on context):**
- Mercury: Communication, learning, commerce (usually positive but neutral)
- Neptune: Spirituality, creativity, dreams (but also confusion, deception)
- Uranus: Innovation, freedom, change (but also instability, disruption)
- Pluto: Transformation, power (but also intensity, control issues)

**CHALLENGING PLANETS (Require awareness):**
- Mars: Energy, action, courage (but also conflict, accidents, anger)
- Saturn: Discipline, structure (but also delays, limitations, depression)
- Chiron: Healing wisdom (but also wounds surfacing)

### STEP 3: Rating Lines for Life Categories

**FOR CAREER:** Look at MC lines
- Best: Sun MC (5), Jupiter MC (5), Venus MC (5), NorthNode MC (5)
- Challenging: Neptune MC (confusion), Saturn MC (delays), Mars MC (conflicts)

**FOR LOVE/RELATIONSHIPS:** Look at DSC and ASC lines
- Best: Venus DSC (5), Venus ASC (5), Jupiter DSC (5), NorthNode DSC (5)
- Challenging: Saturn DSC (heavy), Pluto DSC (power struggles), Mars DSC (conflict), Uranus DSC (instability)

**FOR HOME/SETTLING:** Look at IC lines
- Best: Moon IC (5), Jupiter IC (5), Venus IC (4), Sun IC (4)
- Challenging: Uranus IC (frequent moves), Mars IC (family conflicts), Pluto IC (power struggles)

**FOR HEALTH/VITALITY:** Look at ASC lines
- Best: Sun ASC (5), Jupiter ASC (5), Mars ASC (energy, but caution)
- Challenging: Saturn ASC (low energy), Neptune ASC (confusion), Pluto ASC (intensity)

**FOR WEALTH:** Look at MC and Jupiter lines
- Best: Jupiter MC (5), Jupiter ASC (5), Venus MC (5), Sun MC (5)
- Challenging: Neptune MC (financial confusion), Uranus MC (instability)

**FOR PEACE/WELLBEING:** Look for harmonious lines
- Best: Venus lines, Moon IC, Jupiter ASC, Neptune (spiritual peace)
- Challenging: Mars (stress), Saturn (heaviness), Pluto (intensity)

### STEP 4: Aspect Lines (Secondary Influence)
Aspect lines show where planets form angular relationships:
- **Trines/Sextiles**: Harmonious, "easy" energy, supportive
- **Squares**: Challenging, tension, requires effort but can drive growth
- Aspect lines are less powerful than major (conjunction) lines but add texture

### STEP 5: Parans (Intersection Points)
Where two major lines cross = combined influence:
- Venus/Jupiter paran = love + abundance
- Sun/Saturn paran = recognition through hard work
- Mars/Pluto paran = intense power (use carefully)

### STEP 6: Consider Context
- User's natal chart matters: A Saturn-dominant person may handle Saturn lines better
- Transits amplify lines: Jupiter transiting a Venus line = enhanced romance
- Personal goals determine which lines matter most

## RESPONSE GUIDELINES

1. **Always classify locations as beneficial, mixed, or challenging** based on the ratings
2. **Be specific about WHY** a location is good/bad (which planet, which angle, what it means)
3. **Consider the user's stated goals** (career? love? home? health?)
4. **Acknowledge both opportunities AND challenges** at any location
5. **Give practical advice** - what to do, what to watch out for
6. **Be honest about challenging placements** - don't sugarcoat, but offer constructive framing
7. **Keep responses concise** (2-3 paragraphs) unless asked for detail
8. **Use plain language** (e.g., "career success" not just "Sun MC")
9. **When researching cities**, include practical info (cost of living, visa, best times to visit)
10. **Connect insights to actionable decisions**`;

/**
 * Get or create a subscription for a user (authenticated or anonymous)
 */
async function getOrCreateSubscription(
  userId?: string,
  anonymousId?: string
): Promise<{ subscriptionId: string; isNew: boolean }> {
  // First, try to find existing subscription
  let query = supabase.from('ai_subscriptions').select('id');

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (anonymousId) {
    query = query.eq('anonymous_id', anonymousId);
  } else {
    throw new Error('Either userId or anonymousId is required');
  }

  const { data: existing, error: findError } = await query.single();

  if (existing && !findError) {
    return { subscriptionId: existing.id, isNew: false };
  }

  // Create new subscription with free tier
  const insertData: Record<string, unknown> = {
    plan_type: 'free',
    questions_limit: 5,
    questions_used: 0,
    has_sonar_pro_access: false,
  };

  if (userId) {
    insertData.user_id = userId;
  } else {
    insertData.anonymous_id = anonymousId;
  }

  const { data: newSub, error: createError } = await supabase
    .from('ai_subscriptions')
    .insert(insertData)
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating subscription:', createError);
    throw new Error('Failed to create subscription');
  }

  return { subscriptionId: newSub.id, isNew: true };
}

/**
 * Check if user can ask a question using the database function
 */
async function checkSubscription(subscriptionId: string): Promise<SubscriptionCheck> {
  const { data, error } = await supabase.rpc('can_ask_ai_question', {
    p_subscription_id: subscriptionId,
  });

  if (error) {
    console.error('Error checking subscription:', error);
    return {
      allowed: false,
      reason: 'Subscription check failed',
      model: 'sonar',
      remaining: 0,
    };
  }

  const result = data?.[0] || { allowed: false, reason: 'Unknown error', model: 'sonar', remaining: 0 };

  return {
    allowed: result.allowed,
    reason: result.reason,
    model: result.model,
    remaining: result.remaining,
    subscriptionId,
  };
}

/**
 * Record usage after a successful question
 */
async function recordUsage(
  subscriptionId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  questionPreview: string,
  hasBirthData: boolean
): Promise<void> {
  // Use the database function to consume and log
  const { error } = await supabase.rpc('consume_ai_question', {
    p_subscription_id: subscriptionId,
    p_model: model,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
  });

  if (error) {
    console.error('Error recording usage:', error);
  }

  // Update the usage log with additional context
  await supabase
    .from('ai_usage_log')
    .update({
      question_preview: questionPreview.substring(0, 100),
      has_birth_data: hasBirthData,
    })
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1);
}

async function callPerplexity(
  messages: PerplexityMessage[],
  model: 'sonar' | 'sonar-pro' = 'sonar'
): Promise<{ content: string; usage: { input_tokens: number; output_tokens: number } }> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model, // Use the specified model (sonar or sonar-pro)
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Perplexity API error:', error);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

  return {
    content,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
    },
  };
}

/**
 * Get line rating and interpretation for a planet/lineType combination
 */
function getLineAnalysis(planet: string, lineType: string): { rating: number; nature: string; keywords: string } | null {
  return LINE_RATINGS[planet]?.[lineType] || null;
}

/**
 * Analyze lines for a specific life category
 */
function analyzeForCategory(
  category: string,
  nearbyLines: Array<{ planet: string; lineType: string; distance: number }>
): { beneficial: string[]; challenging: string[] } {
  const beneficial: string[] = [];
  const challenging: string[] = [];

  const bestLines = CATEGORY_BEST_LINES[category] || [];
  const badLines = CATEGORY_CHALLENGING_LINES[category] || [];

  for (const line of nearbyLines) {
    const bestMatch = bestLines.find(b => b.planet === line.planet && b.lineType === line.lineType);
    if (bestMatch) {
      beneficial.push(`${line.planet} ${line.lineType} (${bestMatch.reason}) - ${line.distance.toFixed(0)}km away`);
    }

    const badMatch = badLines.find(b => b.planet === line.planet && b.lineType === line.lineType);
    if (badMatch) {
      challenging.push(`${line.planet} ${line.lineType} (${badMatch.reason}) - ${line.distance.toFixed(0)}km away`);
    }
  }

  return { beneficial, challenging };
}

function buildContextMessage(context: ChatRequest['context']): string {
  const parts: string[] = [];

  if (context.birthData) {
    parts.push(`User's birth data: Born on ${context.birthData.date} at ${context.birthData.time} in ${context.birthData.location} (${context.birthData.latitude.toFixed(2)}°, ${context.birthData.longitude.toFixed(2)}°)`);
  }

  if (context.planetaryPositions && context.planetaryPositions.length > 0) {
    const positions = context.planetaryPositions
      .slice(0, 5) // Just major planets
      .map(p => `${p.planet} in ${p.sign}`)
      .join(', ');
    parts.push(`Key planetary positions: ${positions}`);
  }

  if (context.natalChart) {
    const chartInfo = [
      `Ascendant: ${context.natalChart.ascendant.sign} (${context.natalChart.ascendant.degree.toFixed(1)}°)`,
      `Midheaven: ${context.natalChart.midheaven.sign} (${context.natalChart.midheaven.degree.toFixed(1)}°)`,
    ];
    if (context.natalChart.houseSystem) {
      chartInfo.push(`House System: ${context.natalChart.houseSystem}`);
    }
    if (context.natalChart.zodiacType) {
      chartInfo.push(`Zodiac: ${context.natalChart.zodiacType}`);
    }
    parts.push(`Natal chart: ${chartInfo.join(', ')}`);
  }

  // Enhanced selected line context with rating
  if (context.selectedLine) {
    const analysis = getLineAnalysis(context.selectedLine.planet, context.selectedLine.lineType);
    if (analysis) {
      parts.push(`Currently viewing: ${context.selectedLine.planet} ${context.selectedLine.lineType} line`);
      parts.push(`  → Rating: ${analysis.rating}/5 (${analysis.nature})`);
      parts.push(`  → Keywords: ${analysis.keywords}`);
    } else {
      parts.push(`Currently viewing: ${context.selectedLine.planet} ${context.selectedLine.lineType} line`);
    }
  }

  // Enhanced location analysis with ratings and category breakdown
  if (context.locationAnalysis) {
    const { latitude, longitude, nearbyLines } = context.locationAnalysis;
    parts.push(`\nLOCATION ANALYSIS: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);

    // Add nearby lines with ratings
    if (nearbyLines.length > 0) {
      parts.push('Nearby planetary lines:');
      for (const line of nearbyLines.slice(0, 5)) {
        const analysis = getLineAnalysis(line.planet, line.lineType);
        if (analysis) {
          parts.push(`  • ${line.planet} ${line.lineType}: ${line.distance.toFixed(0)}km away - Rating ${analysis.rating}/5 (${analysis.nature}) - ${analysis.keywords}`);
        } else {
          parts.push(`  • ${line.planet} ${line.lineType}: ${line.distance.toFixed(0)}km away`);
        }
      }

      // Category-based analysis
      parts.push('\nCategory Analysis for this location:');
      for (const category of ['career', 'love', 'health', 'home', 'wellbeing', 'wealth']) {
        const categoryAnalysis = analyzeForCategory(category, nearbyLines);
        if (categoryAnalysis.beneficial.length > 0 || categoryAnalysis.challenging.length > 0) {
          parts.push(`  ${category.toUpperCase()}:`);
          if (categoryAnalysis.beneficial.length > 0) {
            parts.push(`    ✓ Beneficial: ${categoryAnalysis.beneficial.join('; ')}`);
          }
          if (categoryAnalysis.challenging.length > 0) {
            parts.push(`    ⚠ Challenging: ${categoryAnalysis.challenging.join('; ')}`);
          }
        }
      }
    }
  }

  if (context.mode && context.mode !== 'standard') {
    parts.push(`Chart mode: ${context.mode}`);
  }

  // Add related context from past conversations
  if (context.relatedContext) {
    parts.push(`\nRELATED CONTEXT FROM PAST CONVERSATIONS:\n${context.relatedContext}`);
  }

  return parts.length > 0 ? `\n\nCURRENT CONTEXT:\n${parts.join('\n')}` : '';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      message,
      context,
      conversationHistory = [],
      subscriptionId: providedSubId,
      userId,
      anonymousId,
      preferredModel,
    }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create subscription
    let subscriptionId = providedSubId;
    let isNewSubscription = false;

    if (!subscriptionId && (userId || anonymousId)) {
      try {
        const subResult = await getOrCreateSubscription(userId, anonymousId);
        subscriptionId = subResult.subscriptionId;
        isNewSubscription = subResult.isNew;
      } catch (subError) {
        console.error('Subscription error:', subError);
        // Continue without subscription tracking for now
      }
    }

    // Check subscription status (if we have a subscription)
    let subscriptionStatus: SubscriptionCheck | null = null;
    let modelToUse: 'sonar' | 'sonar-pro' = 'sonar';

    if (subscriptionId) {
      subscriptionStatus = await checkSubscription(subscriptionId);

      if (!subscriptionStatus.allowed) {
        return new Response(
          JSON.stringify({
            error: 'subscription_limit',
            reason: subscriptionStatus.reason,
            remaining: 0,
            subscriptionId,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine which model to use
      // Pro plan users automatically get sonar-pro unless they explicitly want sonar
      if (subscriptionStatus.model === 'sonar-pro') {
        // User has sonar-pro access (pro plan) - use it by default
        modelToUse = preferredModel === 'sonar' ? 'sonar' : 'sonar-pro';
      } else {
        // Free/starter plan - use sonar
        modelToUse = 'sonar';
      }
    }

    // Build messages for Perplexity
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + buildContextMessage(context),
      },
    ];

    // Add conversation history (last 6 messages to stay within context)
    for (const msg of conversationHistory.slice(-6)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Perplexity with the appropriate model
    const { content: responseContent, usage } = await callPerplexity(messages, modelToUse);

    // Record usage (if we have a subscription)
    if (subscriptionId) {
      await recordUsage(
        subscriptionId,
        modelToUse,
        usage.input_tokens,
        usage.output_tokens,
        message,
        !!context.birthData
      );
    }

    // Extract any tool calls from the response (if the AI suggests actions)
    const toolCalls = extractToolCalls(responseContent);

    // Calculate remaining questions
    const remaining = subscriptionStatus ? Math.max(0, subscriptionStatus.remaining - 1) : null;

    return new Response(
      JSON.stringify({
        message: responseContent,
        toolCalls,
        subscription: subscriptionId ? {
          id: subscriptionId,
          remaining,
          model: modelToUse,
          isNew: isNewSubscription,
        } : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in astro-ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract tool calls from AI response (for map control)
function extractToolCalls(response: string): Array<{ action: string; params: Record<string, unknown> }> {
  const toolCalls: Array<{ action: string; params: Record<string, unknown> }> = [];

  // Check for location mentions to zoom to
  const locationMatch = response.match(/zoom(?:ing)? to ([^,.]+)/i);
  if (locationMatch) {
    toolCalls.push({
      action: 'zoomToCity',
      params: { cityName: locationMatch[1].trim() },
    });
  }

  // Check for line highlights
  const lineMatch = response.match(/highlight(?:ing)? (?:the |your )?(\w+) (ASC|DSC|MC|IC)/i);
  if (lineMatch) {
    toolCalls.push({
      action: 'highlightLine',
      params: { planet: lineMatch[1], lineType: lineMatch[2] },
    });
  }

  // Check for analyze suggestions
  const analyzeMatch = response.match(/analyz(?:e|ing) (?:the )?(?:location|influences) (?:at|in) ([^,.]+)/i);
  if (analyzeMatch) {
    toolCalls.push({
      action: 'analyzeLocation',
      params: { locationName: analyzeMatch[1].trim() },
    });
  }

  return toolCalls;
}
