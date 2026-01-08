/**
 * WebGL Diagnostics & Analytics
 *
 * Comprehensive WebGL detection, error tracking, and crashlytics
 * for identifying and debugging graphics issues across devices.
 * Includes Firebase Performance traces for timing analysis.
 */

import { analytics, traceGlobeInit } from './analytics';
import type { PerformanceTrace } from './analytics/types';

// ============================================
// PLATFORM DETECTION
// ============================================

export interface PlatformInfo {
  platform: string;
  userAgent: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isPWA: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  memory?: number; // Device memory in GB (if available)
  hardwareConcurrency?: number; // CPU cores
}

export function getPlatformInfo(): PlatformInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'unknown';

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return {
    platform,
    userAgent: ua.slice(0, 200), // Truncate for analytics
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isPWA,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio || 1,
    memory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}

export function getPlatformString(): string {
  const info = getPlatformInfo();
  const parts: string[] = [];

  if (info.isIOS) parts.push('iOS');
  else if (info.isAndroid) parts.push('Android');
  else parts.push('Desktop');

  if (info.isSafari) parts.push('Safari');
  else if (info.isChrome) parts.push('Chrome');
  else if (info.isFirefox) parts.push('Firefox');

  if (info.isPWA) parts.push('PWA');

  return parts.join('-');
}

// ============================================
// WEBGL DIAGNOSTICS
// ============================================

export interface WebGLDiagnostics {
  available: boolean;
  version: 'webgl2' | 'webgl' | 'none';
  renderer: string;
  vendor: string;
  maxTextureSize: number;
  maxViewportDims: [number, number];
  maxRenderBufferSize: number;
  extensions: string[];
  contextAttributes: WebGLContextAttributes | null;
  error?: string;
  errorStack?: string;
}

/**
 * Get comprehensive WebGL diagnostics
 */
export function getWebGLDiagnostics(): WebGLDiagnostics {
  const result: WebGLDiagnostics = {
    available: false,
    version: 'none',
    renderer: 'unknown',
    vendor: 'unknown',
    maxTextureSize: 0,
    maxViewportDims: [0, 0],
    maxRenderBufferSize: 0,
    extensions: [],
    contextAttributes: null,
  };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Try WebGL2 first
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });

    if (gl) {
      result.version = 'webgl2';
    } else {
      // Fall back to WebGL1
      gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
           canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null;
      if (gl) {
        result.version = 'webgl';
      }
    }

    if (!gl) {
      result.error = 'No WebGL context available';
      return result;
    }

    // Check if context is lost
    if (gl.isContextLost()) {
      result.error = 'WebGL context is lost';
      return result;
    }

    result.available = true;
    result.contextAttributes = gl.getContextAttributes();

    // Get renderer info (unmasked if available)
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
    } else {
      result.renderer = gl.getParameter(gl.RENDERER) || 'unknown';
      result.vendor = gl.getParameter(gl.VENDOR) || 'unknown';
    }

    // Get capabilities
    result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    result.maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) || [0, 0];
    result.maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 0;

    // Get extensions list
    const extensions = gl.getSupportedExtensions();
    result.extensions = extensions ? extensions.slice(0, 20) : []; // Limit for analytics

    // Test shader compilation (catches the specific getShaderPrecisionFormat error)
    try {
      const shaderResult = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
      if (!shaderResult) {
        result.error = 'Shader precision format unavailable';
        result.available = false;
      }
    } catch (shaderError) {
      result.error = `Shader test failed: ${shaderError instanceof Error ? shaderError.message : String(shaderError)}`;
      result.errorStack = shaderError instanceof Error ? shaderError.stack : undefined;
      result.available = false;
    }

    // Clean up context
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.errorStack = error instanceof Error ? error.stack?.slice(0, 500) : undefined;
  }

  return result;
}

// ============================================
// PERFORMANCE TRACING
// ============================================

let webglCheckTrace: PerformanceTrace | null = null;
let globeRenderTrace: PerformanceTrace | null = null;

/**
 * Start WebGL initialization performance trace
 */
export function startWebGLTrace(): PerformanceTrace | null {
  webglCheckTrace = traceGlobeInit();
  if (webglCheckTrace) {
    webglCheckTrace.start();
    webglCheckTrace.setAttribute('platform', getPlatformString());
  }
  return webglCheckTrace;
}

/**
 * Stop WebGL initialization performance trace with result
 */
export function stopWebGLTrace(success: boolean, diagnostics?: WebGLDiagnostics): void {
  if (webglCheckTrace) {
    webglCheckTrace.setAttribute('success', success ? 'true' : 'false');
    if (diagnostics) {
      webglCheckTrace.setAttribute('webgl_version', diagnostics.version);
      webglCheckTrace.setAttribute('renderer', diagnostics.renderer.slice(0, 50));
      webglCheckTrace.setMetric('max_texture_size', diagnostics.maxTextureSize);
    }
    webglCheckTrace.stop();
    webglCheckTrace = null;
  }
}

/**
 * Create a trace for globe rendering operations
 */
export function createGlobeRenderTrace(operation: string): PerformanceTrace | null {
  const trace = analytics.createTrace(`globe_render_${operation}`);
  if (trace) {
    trace.start();
    trace.setAttribute('platform', getPlatformString());
    trace.setAttribute('operation', operation);
  }
  return trace;
}

/**
 * Start globe render performance trace
 */
export function startGlobeRenderTrace(): void {
  globeRenderTrace = analytics.createTrace('globe_render');
  if (globeRenderTrace) {
    globeRenderTrace.start();
    globeRenderTrace.setAttribute('platform', getPlatformString());
  }
}

/**
 * Stop globe render performance trace with metrics
 */
export function stopGlobeRenderTrace(success: boolean, lineCount?: number): void {
  if (globeRenderTrace) {
    globeRenderTrace.setAttribute('success', success ? 'true' : 'false');
    if (lineCount !== undefined) {
      globeRenderTrace.setMetric('line_count', lineCount);
    }
    globeRenderTrace.stop();
    globeRenderTrace = null;
  }
}

// ============================================
// ANALYTICS TRACKING
// ============================================

let checkStartTime: number | null = null;
let hasTrackedSuccess = false;
let lastError: string | null = null;

/**
 * Track WebGL check started
 */
export function trackWebGLCheckStarted(): void {
  checkStartTime = Date.now();
  hasTrackedSuccess = false;

  const platform = getPlatformInfo();
  analytics.track('webgl_check_started', {
    platform: getPlatformString(),
    user_agent: platform.userAgent,
  });

  console.log('[WebGL] Check started', { platform: getPlatformString() });
}

/**
 * Track WebGL check success with full diagnostics
 */
export function trackWebGLCheckSuccess(diagnostics: WebGLDiagnostics): void {
  if (hasTrackedSuccess) return; // Only track once per session
  hasTrackedSuccess = true;

  const platform = getPlatformInfo();

  analytics.track('webgl_check_success', {
    webgl_version: diagnostics.version,
    renderer: diagnostics.renderer.slice(0, 100),
    vendor: diagnostics.vendor.slice(0, 100),
    max_texture_size: diagnostics.maxTextureSize,
    platform: getPlatformString(),
    is_mobile: platform.isMobile,
  });

  console.log('[WebGL] Check success', {
    version: diagnostics.version,
    renderer: diagnostics.renderer,
    vendor: diagnostics.vendor,
    maxTextureSize: diagnostics.maxTextureSize,
  });
}

/**
 * Track WebGL check failure
 */
export function trackWebGLCheckFailed(
  errorType: string,
  errorMessage: string,
  retryCount: number
): void {
  lastError = errorMessage;
  const platform = getPlatformInfo();

  analytics.track('webgl_check_failed', {
    error_type: errorType,
    error_message: errorMessage.slice(0, 100),
    platform: getPlatformString(),
    user_agent: platform.userAgent,
    retry_count: retryCount,
  });

  console.warn('[WebGL] Check failed', {
    errorType,
    errorMessage,
    retryCount,
    platform: getPlatformString(),
  });
}

/**
 * Track retry attempt
 */
export function trackWebGLRetryAttempt(attemptNumber: number, maxRetries: number): void {
  analytics.track('webgl_retry_attempt', {
    attempt_number: attemptNumber,
    max_retries: maxRetries,
    platform: getPlatformString(),
  });

  console.log('[WebGL] Retry attempt', { attemptNumber, maxRetries });
}

/**
 * Track WebGL recovery success
 */
export function trackWebGLRecoverySuccess(totalAttempts: number): void {
  const recoveryTimeMs = checkStartTime ? Date.now() - checkStartTime : 0;

  analytics.track('webgl_recovery_success', {
    total_attempts: totalAttempts,
    recovery_time_ms: recoveryTimeMs,
    platform: getPlatformString(),
  });

  console.log('[WebGL] Recovery success', { totalAttempts, recoveryTimeMs });
}

/**
 * Track WebGL recovery failure (all retries exhausted)
 */
export function trackWebGLRecoveryFailed(totalAttempts: number, finalError: string): void {
  analytics.track('webgl_recovery_failed', {
    total_attempts: totalAttempts,
    final_error: finalError.slice(0, 100),
    platform: getPlatformString(),
  });

  console.error('[WebGL] Recovery failed', { totalAttempts, finalError });
}

/**
 * Track WebGL context lost event
 */
export function trackWebGLContextLost(): void {
  analytics.track('webgl_context_lost', {
    platform: getPlatformString(),
    had_previous_error: lastError !== null,
  });

  console.warn('[WebGL] Context lost');
}

/**
 * Track WebGL context restored event
 */
export function trackWebGLContextRestored(recoveryTimeMs: number): void {
  analytics.track('webgl_context_restored', {
    platform: getPlatformString(),
    recovery_time_ms: recoveryTimeMs,
  });

  console.log('[WebGL] Context restored', { recoveryTimeMs });
}

/**
 * Track general WebGL error
 */
export function trackWebGLError(
  error: Error | unknown,
  component: string = 'unknown'
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  analytics.track('webgl_error', {
    error_type: errorObj.name || 'UnknownError',
    error_message: errorObj.message.slice(0, 100),
    error_stack: (errorObj.stack || '').slice(0, 300),
    component,
    platform: getPlatformString(),
  });

  console.error('[WebGL] Error', { component, error: errorObj });
}

/**
 * Track globe render error (from error boundary)
 */
export function trackGlobeRenderError(
  error: Error | unknown,
  component: string = 'Globe'
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  analytics.track('globe_render_error', {
    error_type: errorObj.name || 'RenderError',
    error_message: errorObj.message.slice(0, 100),
    component,
    platform: getPlatformString(),
  });

  console.error('[WebGL] Globe render error', { component, error: errorObj });
}

// ============================================
// CONTEXT MONITORING
// ============================================

let contextLostTime: number | null = null;

/**
 * Set up WebGL context loss monitoring on a canvas
 */
export function monitorWebGLContext(canvas: HTMLCanvasElement): () => void {
  const handleContextLost = (event: WebGLContextEvent) => {
    event.preventDefault();
    contextLostTime = Date.now();
    trackWebGLContextLost();
  };

  const handleContextRestored = () => {
    const recoveryTime = contextLostTime ? Date.now() - contextLostTime : 0;
    contextLostTime = null;
    trackWebGLContextRestored(recoveryTime);
  };

  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
  };
}

// ============================================
// DIAGNOSTIC REPORT
// ============================================

/**
 * Generate a full diagnostic report for debugging
 */
export function generateDiagnosticReport(): string {
  const platform = getPlatformInfo();
  const webgl = getWebGLDiagnostics();

  const report = {
    timestamp: new Date().toISOString(),
    platform: {
      ...platform,
      platformString: getPlatformString(),
    },
    webgl: {
      ...webgl,
      extensions: webgl.extensions.length, // Just count for readability
    },
    browser: {
      language: navigator.language,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
    },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Log diagnostic report to console
 */
export function logDiagnosticReport(): void {
  console.group('[WebGL Diagnostic Report]');
  console.log(generateDiagnosticReport());
  console.groupEnd();
}
