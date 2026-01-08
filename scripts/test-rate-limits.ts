#!/usr/bin/env node
/**
 * Rate Limit Testing Script
 *
 * Tests that rate limiting works correctly across all protected endpoints.
 * Run against local Supabase functions or deployed environment.
 *
 * Prerequisites:
 * - Local: `npx supabase functions serve` must be running
 * - Deployed: Set SUPABASE_URL environment variable
 *
 * Usage:
 *   # Test against local functions server (default)
 *   npx tsx scripts/test-rate-limits.ts
 *
 *   # Test against deployed environment
 *   SUPABASE_URL=https://your-project.supabase.co npx tsx scripts/test-rate-limits.ts
 *
 *   # Test specific endpoint only
 *   npx tsx scripts/test-rate-limits.ts --endpoint=astro-ai-chat
 *
 *   # Skip window reset test (takes 60+ seconds)
 *   npx tsx scripts/test-rate-limits.ts --skip-reset-test
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof COLORS = 'reset'): void {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSuccess(message: string): void {
  log(`✅ ${message}`, 'green');
}

function logError(message: string): void {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string): void {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string): void {
  log(`ℹ️  ${message}`, 'blue');
}

// Default to local Supabase functions server
const BASE_URL = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL}/functions/v1`
  : 'http://127.0.0.1:54321/functions/v1';

// Rate limit configurations (should match rate-limit.ts)
const RATE_LIMIT_CONFIGS = {
  'astro-ai-chat': { anonymous: 5, authenticated: 20, window: 60 },
  'create-astro-report-payment': { anonymous: 10, authenticated: 10, window: 60 },
  'verify-astro-payment': { anonymous: 5, authenticated: 10, window: 60 },
  'ai-subscription': { anonymous: 20, authenticated: 30, window: 60 },
  'ai-subscription-checkout': { anonymous: 5, authenticated: 10, window: 60 },
  'copilot-runtime': { anonymous: 5, authenticated: 20, window: 60 },
  'search-flights': { anonymous: 10, authenticated: 20, window: 60 },
} as const;

type EndpointName = keyof typeof RATE_LIMIT_CONFIGS;

interface TestResult {
  endpoint: string;
  passed: boolean;
  message: string;
  details?: string;
}

interface RateLimitResponse {
  error?: string;
  message?: string;
  retryAfter?: number;
  resetAt?: string;
  limit?: number;
}

/**
 * Build request options for each endpoint
 * Each endpoint has different required parameters
 */
function getRequestOptions(endpoint: EndpointName): RequestInit & { body?: string; url?: string } {
  const baseHeaders = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': `192.168.1.${Math.floor(Math.random() * 255)}`, // Unique IP per test run
  };

  switch (endpoint) {
    case 'astro-ai-chat':
      return {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          currentLocation: { lat: 0, lng: 0, name: 'Test' },
          visibleLines: ['sun_ac', 'sun_mc'],
        }),
      };

    case 'create-astro-report-payment':
      return {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          birthData: {
            date: '1990-01-01',
            time: '12:00',
            latitude: 40.7128,
            longitude: -74.006,
            timezone: 'America/New_York',
            locationName: 'New York',
          },
          destinationCoordinates: { lat: 51.5074, lng: -0.1278 },
          destinationName: 'London',
          email: 'test@example.com',
        }),
      };

    case 'verify-astro-payment':
      return {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          purchaseId: 'test-purchase-id-' + Date.now(),
        }),
      };

    case 'ai-subscription':
      return {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          action: 'getPlans', // Use a read-only action for testing
        }),
        url: `${BASE_URL}/ai-subscription`,
      };

    case 'ai-subscription-checkout':
      return {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          action: 'purchaseCreditsAnonymous',
          credits: 10,
          email: 'test@example.com',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        }),
        url: `${BASE_URL}/ai-subscription`,
      };

    case 'copilot-runtime':
      return {
        method: 'POST',
        headers: {
          ...baseHeaders,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          threadId: 'test-thread',
          messages: [{ role: 'user', content: 'test' }],
        }),
      };

    case 'search-flights':
      return {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          origin: 'JFK',
          destination: 'LAX',
          departureDate: '2025-06-01',
          adults: 1,
        }),
      };

    default:
      return {
        method: 'POST',
        headers: baseHeaders,
        body: '{}',
      };
  }
}

/**
 * Make a request to an endpoint and return response details
 */
async function makeRequest(
  endpoint: EndpointName,
  customIp?: string
): Promise<{
  status: number;
  headers: Headers;
  body: RateLimitResponse | null;
  isStreaming: boolean;
}> {
  const options = getRequestOptions(endpoint);
  const url = options.url || `${BASE_URL}/${endpoint}`;

  // Override IP if specified
  if (customIp) {
    (options.headers as Record<string, string>)['X-Forwarded-For'] = customIp;
  }

  try {
    const response = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    });

    const isStreaming = response.headers.get('Content-Type')?.includes('text/event-stream') || false;

    let body: RateLimitResponse | null = null;
    if (!isStreaming) {
      try {
        const text = await response.text();
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
    } else {
      // For streaming responses, consume and check for rate limit error
      const text = await response.text();
      if (text.includes('RATE_LIMIT_EXCEEDED')) {
        body = { error: 'Rate limit exceeded (streaming)' };
      }
    }

    return {
      status: response.status,
      headers: response.headers,
      body,
      isStreaming,
    };
  } catch (error) {
    throw new Error(`Failed to connect to ${url}: ${error}`);
  }
}

/**
 * Test that an endpoint returns 429 after exceeding the rate limit
 */
async function testRateLimitExceeded(endpoint: EndpointName): Promise<TestResult> {
  const config = RATE_LIMIT_CONFIGS[endpoint];
  const testIp = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const requestCount = config.anonymous + 2; // Make more requests than limit

  logInfo(`Testing ${endpoint}: Making ${requestCount} rapid requests (limit: ${config.anonymous})`);

  let rateLimitHit = false;
  let rateLimitResponse: { status: number; headers: Headers; body: RateLimitResponse | null } | null =
    null;
  let successfulRequests = 0;

  for (let i = 0; i < requestCount; i++) {
    try {
      const response = await makeRequest(endpoint, testIp);

      if (response.status === 429) {
        rateLimitHit = true;
        rateLimitResponse = response;
        logInfo(`  Request ${i + 1}: 429 Too Many Requests (rate limit hit!)`);
        break;
      } else {
        successfulRequests++;
        // Log first few and when approaching limit
        if (i < 3 || i >= config.anonymous - 2) {
          logInfo(`  Request ${i + 1}: ${response.status}`);
        } else if (i === 3) {
          logInfo(`  ... (${config.anonymous - 5} more requests)`);
        }
      }
    } catch (error) {
      return {
        endpoint,
        passed: false,
        message: `Request failed: ${error}`,
      };
    }
  }

  if (!rateLimitHit) {
    return {
      endpoint,
      passed: false,
      message: `No 429 response after ${requestCount} requests (expected limit: ${config.anonymous})`,
      details: `Successful requests: ${successfulRequests}`,
    };
  }

  return {
    endpoint,
    passed: true,
    message: `429 returned after ${successfulRequests} successful requests (limit: ${config.anonymous})`,
    details: rateLimitResponse?.body?.message || undefined,
  };
}

/**
 * Test that 429 responses include Retry-After header
 */
async function testRetryAfterHeader(endpoint: EndpointName): Promise<TestResult> {
  const config = RATE_LIMIT_CONFIGS[endpoint];
  const testIp = `10.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  logInfo(`Testing ${endpoint}: Checking for Retry-After header`);

  // Exhaust the rate limit first
  for (let i = 0; i <= config.anonymous; i++) {
    await makeRequest(endpoint, testIp);
  }

  // Make one more request to get the 429 with headers
  const response = await makeRequest(endpoint, testIp);

  if (response.status !== 429) {
    return {
      endpoint,
      passed: false,
      message: `Expected 429 but got ${response.status}`,
    };
  }

  const retryAfter = response.headers.get('Retry-After');
  const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
  const rateLimitReset = response.headers.get('X-RateLimit-Reset');

  const missingHeaders: string[] = [];
  if (!retryAfter) missingHeaders.push('Retry-After');
  if (!rateLimitLimit) missingHeaders.push('X-RateLimit-Limit');
  if (!rateLimitRemaining) missingHeaders.push('X-RateLimit-Remaining');
  if (!rateLimitReset) missingHeaders.push('X-RateLimit-Reset');

  if (missingHeaders.length > 0) {
    return {
      endpoint,
      passed: false,
      message: `Missing headers: ${missingHeaders.join(', ')}`,
      details: `Present: Retry-After=${retryAfter}, X-RateLimit-Limit=${rateLimitLimit}`,
    };
  }

  // Verify Retry-After is a positive number
  const retryAfterNum = parseInt(retryAfter!, 10);
  if (isNaN(retryAfterNum) || retryAfterNum <= 0 || retryAfterNum > config.window) {
    return {
      endpoint,
      passed: false,
      message: `Invalid Retry-After value: ${retryAfter} (expected 1-${config.window})`,
    };
  }

  return {
    endpoint,
    passed: true,
    message: `Retry-After: ${retryAfter}s, Limit: ${rateLimitLimit}, Remaining: ${rateLimitRemaining}`,
    details: `Reset at: ${rateLimitReset}`,
  };
}

/**
 * Test that rate limits reset after window expires
 */
async function testWindowReset(endpoint: EndpointName): Promise<TestResult> {
  const config = RATE_LIMIT_CONFIGS[endpoint];
  const testIp = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  // For this test, we use a shorter effective window by relying on database state
  // In production, the window is 60 seconds. We'll simulate by checking the behavior.

  logInfo(`Testing ${endpoint}: Rate limit window reset behavior`);

  // Step 1: Exhaust the rate limit
  logInfo(`  Exhausting rate limit (${config.anonymous} requests)...`);
  for (let i = 0; i <= config.anonymous; i++) {
    await makeRequest(endpoint, testIp);
  }

  // Step 2: Verify we're rate limited
  const rateLimitedResponse = await makeRequest(endpoint, testIp);
  if (rateLimitedResponse.status !== 429) {
    return {
      endpoint,
      passed: false,
      message: `Expected to be rate limited (429) but got ${rateLimitedResponse.status}`,
    };
  }

  const retryAfter = rateLimitedResponse.headers.get('Retry-After');
  const waitTime = retryAfter ? parseInt(retryAfter, 10) : config.window;

  // Step 3: Wait for window to reset
  logInfo(`  Rate limited. Waiting ${waitTime} seconds for window to reset...`);

  // Only wait up to 65 seconds to avoid very long test times
  const actualWaitTime = Math.min(waitTime + 2, 65);
  await new Promise((resolve) => setTimeout(resolve, actualWaitTime * 1000));

  // Step 4: Verify we can make requests again
  logInfo(`  Window should be reset. Making new request...`);
  const afterResetResponse = await makeRequest(endpoint, testIp);

  // After reset, we should NOT get a 429
  // Note: We might get other errors (like auth errors) but not 429
  if (afterResetResponse.status === 429) {
    return {
      endpoint,
      passed: false,
      message: `Still rate limited after ${actualWaitTime}s wait`,
      details: `Retry-After was ${retryAfter}s`,
    };
  }

  return {
    endpoint,
    passed: true,
    message: `Rate limit reset after ${actualWaitTime}s wait`,
    details: `Post-reset status: ${afterResetResponse.status}`,
  };
}

/**
 * Run all tests for a specific endpoint
 */
async function runEndpointTests(
  endpoint: EndpointName,
  skipResetTest: boolean
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing: ${endpoint}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');

  // Test 1: Rate limit exceeded returns 429
  results.push(await testRateLimitExceeded(endpoint));

  // Test 2: Retry-After header is present
  results.push(await testRetryAfterHeader(endpoint));

  // Test 3: Window reset (optional, takes time)
  if (!skipResetTest) {
    results.push(await testWindowReset(endpoint));
  }

  return results;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { endpoint?: EndpointName; skipResetTest: boolean } {
  const args = process.argv.slice(2);
  let endpoint: EndpointName | undefined;
  let skipResetTest = false;

  for (const arg of args) {
    if (arg.startsWith('--endpoint=')) {
      const value = arg.split('=')[1] as EndpointName;
      if (value in RATE_LIMIT_CONFIGS) {
        endpoint = value;
      } else {
        logError(`Unknown endpoint: ${value}`);
        logInfo(`Available endpoints: ${Object.keys(RATE_LIMIT_CONFIGS).join(', ')}`);
        process.exit(1);
      }
    } else if (arg === '--skip-reset-test') {
      skipResetTest = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Rate Limit Testing Script

Usage:
  npx tsx scripts/test-rate-limits.ts [options]

Options:
  --endpoint=<name>    Test only this endpoint
  --skip-reset-test    Skip the window reset test (saves ~60s per endpoint)
  --help, -h           Show this help message

Environment Variables:
  SUPABASE_URL         Base URL for Supabase (default: http://127.0.0.1:54321)

Available Endpoints:
${Object.entries(RATE_LIMIT_CONFIGS)
  .map(([name, config]) => `  ${name}: ${config.anonymous} req/min (anonymous)`)
  .join('\n')}
`);
      process.exit(0);
    }
  }

  return { endpoint, skipResetTest };
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  const { endpoint: specificEndpoint, skipResetTest } = parseArgs();

  log('\n' + '='.repeat(60), 'bright');
  log('Rate Limit Testing Suite', 'bright');
  log('='.repeat(60), 'bright');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Skip reset test: ${skipResetTest}`);
  if (specificEndpoint) {
    logInfo(`Testing only: ${specificEndpoint}`);
  }

  // Determine which endpoints to test
  const endpointsToTest = specificEndpoint
    ? [specificEndpoint]
    : (Object.keys(RATE_LIMIT_CONFIGS) as EndpointName[]);

  // Run tests
  const allResults: TestResult[] = [];

  for (const endpoint of endpointsToTest) {
    const results = await runEndpointTests(endpoint, skipResetTest);
    allResults.push(...results);

    // Print results for this endpoint
    for (const result of results) {
      if (result.passed) {
        logSuccess(result.message);
      } else {
        logError(result.message);
      }
      if (result.details) {
        log(`   Details: ${result.details}`, 'cyan');
      }
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('Test Summary', 'bright');
  log('='.repeat(60), 'bright');

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  const total = allResults.length;

  if (failed === 0) {
    logSuccess(`All ${total} tests passed!`);
  } else {
    logError(`${failed}/${total} tests failed`);

    log('\nFailed tests:', 'red');
    for (const result of allResults.filter((r) => !r.passed)) {
      logError(`  ${result.endpoint}: ${result.message}`);
    }
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch((error) => {
  logError(`Test runner failed: ${error}`);
  process.exit(1);
});
