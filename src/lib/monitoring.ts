/**
 * Lightweight Performance & Error Monitoring
 *
 * Decoupled utilities for tracking API calls, async operations,
 * and errors without tight coupling to any specific provider.
 *
 * Uses lazy imports to prevent initialization issues and circular dependencies.
 *
 * Usage:
 *   const result = await monitoredFetch('weather-api', () => fetch(url));
 *   const data = await monitoredEdgeFunction('city-info', () => supabase.functions.invoke(...));
 */

// Lazy analytics helper - prevents initialization errors
const getAnalytics = async () => {
  try {
    const { analytics } = await import('./analytics');
    return analytics;
  } catch {
    return null;
  }
};

// Fire-and-forget analytics tracking (non-blocking)
const trackAsync = (event: string, params: Record<string, unknown>) => {
  getAnalytics().then(a => a?.track(event, params)).catch(() => {});
};

// ============================================
// TYPES
// ============================================

// Result type for monitored operations (useful for callers who need metadata)
export interface MonitoringResult<T> {
  data: T;
  durationMs: number;
  success: boolean;
}

interface MonitoringOptions {
  /** Skip analytics tracking (still logs to console) */
  skipAnalytics?: boolean;
  /** Custom attributes to attach */
  attributes?: Record<string, string>;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

// ============================================
// CORE MONITORING WRAPPER
// ============================================

/**
 * Wrap any async operation with timing and error tracking
 */
export async function monitored<T>(
  operationName: string,
  operation: () => Promise<T>,
  options: MonitoringOptions = {}
): Promise<T> {
  const startTime = performance.now();
  const { skipAnalytics = false } = options;

  try {
    const result = await operation();
    const durationMs = Math.round(performance.now() - startTime);

    // Log success
    console.debug(`[Monitor] ${operationName} completed in ${durationMs}ms`);

    // Track if analytics enabled (non-blocking)
    if (!skipAnalytics) {
      trackAsync('api_latency', {
        endpoint: operationName,
        latency_ms: durationMs,
        success: true,
      });
    }

    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failure
    console.error(`[Monitor] ${operationName} failed after ${durationMs}ms:`, errorMessage);

    // Track error (non-blocking)
    if (!skipAnalytics) {
      trackAsync('api_latency', {
        endpoint: operationName,
        latency_ms: durationMs,
        success: false,
      });

      trackAsync('app_error', {
        error_type: 'OperationError',
        error_message: errorMessage.slice(0, 100),
        component_name: operationName,
      });
    }

    throw error;
  }
}

// ============================================
// SPECIALIZED WRAPPERS
// ============================================

/**
 * Monitor Supabase Edge Function calls
 */
export async function monitoredEdgeFunction<T>(
  functionName: string,
  invoker: () => Promise<{ data: T | null; error: Error | null }>
): Promise<T> {
  const startTime = performance.now();

  try {
    const { data, error } = await invoker();
    const durationMs = Math.round(performance.now() - startTime);

    if (error) {
      console.error(`[EdgeFunction] ${functionName} error after ${durationMs}ms:`, error.message);

      trackAsync('api_latency', {
        endpoint: `edge/${functionName}`,
        latency_ms: durationMs,
        success: false,
      });

      throw error;
    }

    console.debug(`[EdgeFunction] ${functionName} completed in ${durationMs}ms`);

    trackAsync('api_latency', {
      endpoint: `edge/${functionName}`,
      latency_ms: durationMs,
      success: true,
    });

    return data as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    trackAsync('app_error', {
      error_type: 'EdgeFunctionError',
      error_message: errorMessage.slice(0, 100),
      component_name: functionName,
    });

    throw error;
  }
}

/**
 * Monitor external API fetch calls
 */
export async function monitoredFetch<T>(
  apiName: string,
  fetcher: () => Promise<Response>,
  parser?: (response: Response) => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const response = await fetcher();
    const durationMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      console.error(`[API] ${apiName} returned ${response.status} after ${durationMs}ms`);

      trackAsync('api_latency', {
        endpoint: `api/${apiName}`,
        latency_ms: durationMs,
        success: false,
      });

      throw new Error(`${apiName} returned ${response.status}`);
    }

    console.debug(`[API] ${apiName} completed in ${durationMs}ms`);

    trackAsync('api_latency', {
      endpoint: `api/${apiName}`,
      latency_ms: durationMs,
      success: true,
    });

    // Parse response if parser provided
    if (parser) {
      return await parser(response);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only track if we haven't already (avoid double-tracking)
    if (!errorMessage.includes('returned')) {
      trackAsync('api_latency', {
        endpoint: `api/${apiName}`,
        latency_ms: durationMs,
        success: false,
      });
    }

    trackAsync('app_error', {
      error_type: 'FetchError',
      error_message: errorMessage.slice(0, 100),
      component_name: apiName,
    });

    throw error;
  }
}

/**
 * Monitor WASM operations
 */
export async function monitoredWasm<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const durationMs = Math.round(performance.now() - startTime);

    console.debug(`[WASM] ${operationName} completed in ${durationMs}ms`);

    trackAsync('wasm_operation', {
      operation: operationName,
      duration_ms: durationMs,
      success: true,
    });

    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[WASM] ${operationName} failed after ${durationMs}ms:`, errorMessage);

    trackAsync('app_error', {
      error_type: 'WasmError',
      error_message: errorMessage.slice(0, 100),
      component_name: `wasm/${operationName}`,
    });

    throw error;
  }
}

/**
 * Monitor authentication operations
 */
export async function monitoredAuth<T>(
  operationName: string,
  operation: () => Promise<{ data: T | null; error: Error | null }>
): Promise<T | null> {
  const startTime = performance.now();

  try {
    const { data, error } = await operation();
    const durationMs = Math.round(performance.now() - startTime);

    if (error) {
      console.warn(`[Auth] ${operationName} failed after ${durationMs}ms:`, error.message);

      trackAsync('app_error', {
        error_type: 'AuthError',
        error_message: error.message.slice(0, 100),
        component_name: `auth/${operationName}`,
      });

      return null;
    }

    console.debug(`[Auth] ${operationName} completed in ${durationMs}ms`);
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    trackAsync('app_error', {
      error_type: 'AuthError',
      error_message: errorMessage.slice(0, 100),
      component_name: `auth/${operationName}`,
    });

    return null;
  }
}

// ============================================
// BATCH MONITORING
// ============================================

/**
 * Monitor multiple parallel operations
 */
export async function monitoredParallel<T>(
  batchName: string,
  operations: Array<{ name: string; operation: () => Promise<T> }>
): Promise<Array<{ name: string; result: T | null; error?: Error }>> {
  const startTime = performance.now();

  const results = await Promise.allSettled(
    operations.map(async ({ name, operation }) => {
      try {
        const result = await operation();
        return { name, result, error: undefined };
      } catch (error) {
        return { name, result: null, error: error as Error };
      }
    })
  );

  const durationMs = Math.round(performance.now() - startTime);
  const successCount = results.filter(r => r.status === 'fulfilled' && !(r.value as { error?: Error }).error).length;
  const failCount = operations.length - successCount;

  console.debug(`[Batch] ${batchName}: ${successCount}/${operations.length} succeeded in ${durationMs}ms`);

  if (failCount > 0) {
    trackAsync('app_error', {
      error_type: 'BatchError',
      error_message: `${failCount}/${operations.length} operations failed`,
      component_name: batchName,
    });
  }

  return results.map(r => r.status === 'fulfilled' ? r.value : { name: 'unknown', result: null, error: new Error('Promise rejected') });
}

// ============================================
// ERROR BOUNDARY HELPER
// ============================================

/**
 * Track an error without throwing (for error boundaries)
 */
export function trackError(
  error: Error | unknown,
  componentName: string,
  _additionalContext?: Record<string, string>
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  console.error(`[Error] ${componentName}:`, errorObj.message);

  trackAsync('app_error', {
    error_type: errorObj.name || 'UnknownError',
    error_message: errorObj.message.slice(0, 100),
    component_name: componentName,
  });
}

// ============================================
// PERFORMANCE MARKS (for manual instrumentation)
// ============================================

const performanceMarks = new Map<string, number>();

/**
 * Start a performance measurement
 */
export function markStart(name: string): void {
  performanceMarks.set(name, performance.now());
}

/**
 * End a performance measurement and optionally track
 */
export function markEnd(name: string, track = true): number {
  const startTime = performanceMarks.get(name);
  if (!startTime) {
    console.warn(`[Performance] No start mark found for: ${name}`);
    return 0;
  }

  const durationMs = Math.round(performance.now() - startTime);
  performanceMarks.delete(name);

  console.debug(`[Performance] ${name}: ${durationMs}ms`);

  if (track) {
    trackAsync('screen_render_time', {
      screen_name: name,
      render_time_ms: durationMs,
    });
  }

  return durationMs;
}
