/**
 * Rate Limiting Utility Module
 * Provides a clean interface for checking rate limits from any edge function.
 * Uses the check_rate_limit PostgreSQL function for atomic operations.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// RATE LIMIT CONFIGURATIONS
// =============================================================================

/**
 * Endpoint identifiers for rate limiting
 * Use these constants when calling checkRateLimit to ensure consistency
 */
export const RATE_LIMIT_ENDPOINTS = {
  ASTRO_AI_CHAT: 'astro-ai-chat',
  CREATE_ASTRO_REPORT_PAYMENT: 'create-astro-report-payment',
  VERIFY_ASTRO_PAYMENT: 'verify-astro-payment',
  AI_SUBSCRIPTION: 'ai-subscription',
  AI_SUBSCRIPTION_CHECKOUT: 'ai-subscription-checkout',
  COPILOT_RUNTIME: 'copilot-runtime',
  SEARCH_FLIGHTS: 'search-flights',
} as const;

export type RateLimitEndpoint = typeof RATE_LIMIT_ENDPOINTS[keyof typeof RATE_LIMIT_ENDPOINTS];

/**
 * User tier for rate limiting
 * Different tiers receive different rate limits
 */
export type UserTier = 'anonymous' | 'authenticated';

/**
 * Rate limit configuration for a specific check
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Tiered rate limit configuration with separate limits per user tier
 */
export interface TieredRateLimitConfig {
  anonymous: RateLimitConfig;
  authenticated: RateLimitConfig;
}

/**
 * Rate limit configurations for all endpoints
 *
 * Guidelines:
 * - AI endpoints (astro-ai-chat, copilot-runtime): Strictest limits due to expensive API costs
 * - Payment endpoints: Moderate limits to prevent enumeration/abuse
 * - Subscription checkout: Moderate limits, status checks more lenient
 * - Flight search: Moderate limits due to external API costs
 *
 * All windows are in seconds. Standard window is 60 seconds (1 minute).
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitEndpoint, TieredRateLimitConfig> = {
  // CRITICAL: AI Chat - Most expensive endpoint (Perplexity API costs)
  // Anonymous: 5 requests per minute (very strict to prevent abuse)
  // Authenticated: 20 requests per minute (generous for paying users)
  [RATE_LIMIT_ENDPOINTS.ASTRO_AI_CHAT]: {
    anonymous: { maxRequests: 5, windowSeconds: 60 },
    authenticated: { maxRequests: 20, windowSeconds: 60 },
  },

  // Payment Creation - Moderate limits to prevent session abuse
  // Same limits for both tiers as payment creation typically requires auth anyway
  [RATE_LIMIT_ENDPOINTS.CREATE_ASTRO_REPORT_PAYMENT]: {
    anonymous: { maxRequests: 10, windowSeconds: 60 },
    authenticated: { maxRequests: 10, windowSeconds: 60 },
  },

  // Payment Verification - Moderate limits to prevent enumeration attacks
  // Slightly stricter for anonymous to prevent brute-force attempts
  [RATE_LIMIT_ENDPOINTS.VERIFY_ASTRO_PAYMENT]: {
    anonymous: { maxRequests: 5, windowSeconds: 60 },
    authenticated: { maxRequests: 10, windowSeconds: 60 },
  },

  // AI Subscription - Status checks (general subscription operations)
  // More lenient as status checks don't cost money
  [RATE_LIMIT_ENDPOINTS.AI_SUBSCRIPTION]: {
    anonymous: { maxRequests: 20, windowSeconds: 60 },
    authenticated: { maxRequests: 30, windowSeconds: 60 },
  },

  // AI Subscription Checkout - Creating Stripe checkout sessions
  // Stricter than status checks as it creates external resources
  [RATE_LIMIT_ENDPOINTS.AI_SUBSCRIPTION_CHECKOUT]: {
    anonymous: { maxRequests: 5, windowSeconds: 60 },
    authenticated: { maxRequests: 10, windowSeconds: 60 },
  },

  // CopilotKit Runtime - Also uses Perplexity API
  // Similar limits to astro-ai-chat due to API costs
  [RATE_LIMIT_ENDPOINTS.COPILOT_RUNTIME]: {
    anonymous: { maxRequests: 5, windowSeconds: 60 },
    authenticated: { maxRequests: 20, windowSeconds: 60 },
  },

  // Flight Search - Uses RapidAPI Skyscanner
  // Moderate limits as external API has its own costs/limits
  [RATE_LIMIT_ENDPOINTS.SEARCH_FLIGHTS]: {
    anonymous: { maxRequests: 10, windowSeconds: 60 },
    authenticated: { maxRequests: 20, windowSeconds: 60 },
  },
};

/**
 * Get the rate limit configuration for an endpoint and user tier
 *
 * @param endpoint - The endpoint being rate limited
 * @param userTier - The user tier ('anonymous' or 'authenticated')
 * @returns Rate limit configuration for the endpoint/tier combination
 *
 * @example
 * ```ts
 * const config = getRateLimitConfig('astro-ai-chat', userId ? 'authenticated' : 'anonymous');
 * const result = await checkRateLimit(supabase, identifier, endpoint, config);
 * ```
 */
export function getRateLimitConfig(endpoint: RateLimitEndpoint, userTier: UserTier): RateLimitConfig {
  const endpointConfig = RATE_LIMIT_CONFIGS[endpoint];
  if (!endpointConfig) {
    // Fallback to strict anonymous limits for unknown endpoints
    return { maxRequests: 5, windowSeconds: 60 };
  }
  return endpointConfig[userTier];
}

/**
 * Determine user tier based on whether a user ID is present
 *
 * @param userId - Optional user ID from authentication
 * @returns 'authenticated' if userId is truthy, 'anonymous' otherwise
 */
export function getUserTier(userId?: string | null): UserTier {
  return userId ? 'authenticated' : 'anonymous';
}

// =============================================================================
// CORE RATE LIMIT TYPES AND FUNCTIONS
// =============================================================================

/**
 * Result from a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Timestamp when the window resets */
  resetAt: Date;
  /** Current request count in window */
  current: number;
  /** Maximum requests allowed */
  limit: number;
}

/**
 * Headers to include in responses for rate limit information
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Check rate limit for an identifier and endpoint
 *
 * @param supabase - Supabase client (must use service role for RLS access)
 * @param identifier - Unique identifier (IP address, user ID, or combination)
 * @param endpoint - The endpoint being rate limited (e.g., 'astro-ai-chat')
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * ```ts
 * const result = await checkRateLimit(
 *   supabase,
 *   '192.168.1.1',
 *   'astro-ai-chat',
 *   { maxRequests: 10, windowSeconds: 60 }
 * );
 *
 * if (!result.allowed) {
 *   return rateLimitResponse(result);
 * }
 * ```
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_endpoint: endpoint,
    p_max_requests: config.maxRequests,
    p_window_seconds: config.windowSeconds,
  });

  if (error) {
    // On error, allow the request but log the issue
    // This prevents rate limiting failures from blocking legitimate requests
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
      current: 0,
      limit: config.maxRequests,
    };
  }

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: new Date(data.reset_at),
    current: data.current,
    limit: data.limit,
  };
}

/**
 * Extract client IP address from a request
 * Checks standard headers used by proxies and load balancers
 *
 * @param req - The incoming request
 * @returns The client IP address or 'unknown' if not determinable
 *
 * @example
 * ```ts
 * const clientIp = getClientIp(req);
 * const identifier = userId || clientIp;
 * ```
 */
export function getClientIp(req: Request): string {
  // Check headers in order of reliability
  // X-Forwarded-For may contain multiple IPs; use the first (client IP)
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // X-Real-IP is often set by reverse proxies
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  // CF-Connecting-IP is set by Cloudflare
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  // True-Client-IP is set by some CDNs
  const trueClientIp = req.headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp.trim();

  // Fallback if no headers are present
  return 'unknown';
}

/**
 * Build rate limit headers for including in responses
 *
 * @param result - The rate limit check result
 * @returns Headers object to spread into response headers
 *
 * @example
 * ```ts
 * return new Response(JSON.stringify(data), {
 *   headers: { ...corsHeaders, ...rateLimitHeaders(result) }
 * });
 * ```
 */
export function rateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const resetTimestamp = Math.floor(result.resetAt.getTime() / 1000);
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': resetTimestamp.toString(),
  };

  // Add Retry-After if rate limited
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    );
    headers['Retry-After'] = retryAfterSeconds.toString();
  }

  return headers;
}

/**
 * Build a standard 429 Too Many Requests response
 *
 * @param result - The rate limit check result
 * @param additionalHeaders - Additional headers to include (e.g., CORS headers)
 * @returns A Response object with 429 status and rate limit information
 *
 * @example
 * ```ts
 * if (!result.allowed) {
 *   return rateLimitResponse(result, corsHeaders);
 * }
 * ```
 */
export function rateLimitResponse(
  result: RateLimitResult,
  additionalHeaders: Record<string, string> = {}
): Response {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
  );

  const body = {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Please retry after ${retryAfterSeconds} seconds.`,
    retryAfter: retryAfterSeconds,
    resetAt: result.resetAt.toISOString(),
    limit: result.limit,
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders,
      ...rateLimitHeaders(result),
    },
  });
}

/**
 * Build a rate limit identifier combining user ID (if authenticated) with IP
 * This provides per-user limits for authenticated users while still
 * preventing abuse from a single IP for anonymous users.
 *
 * @param userId - Optional user ID for authenticated users
 * @param clientIp - Client IP address
 * @returns A combined identifier string
 *
 * @example
 * ```ts
 * const identifier = buildIdentifier(userId, getClientIp(req));
 * ```
 */
export function buildIdentifier(userId?: string | null, clientIp?: string): string {
  if (userId) {
    // For authenticated users, use user ID (provides per-user rate limiting)
    return `user:${userId}`;
  }
  // For anonymous users, use IP address
  return `ip:${clientIp || 'unknown'}`;
}

/**
 * Helper to add rate limit metadata to a response object
 *
 * @param data - The response data object
 * @param rateLimit - The rate limit result
 * @returns The data object with rate limit metadata added
 */
export function addRateLimitToBody<T extends object>(
  data: T,
  rateLimit: RateLimitResult
): T & { meta: { rateLimit: { limit: number; remaining: number; resetAt: string } } } {
  return {
    ...data,
    meta: {
      rateLimit: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.toISOString(),
      },
    },
  };
}


