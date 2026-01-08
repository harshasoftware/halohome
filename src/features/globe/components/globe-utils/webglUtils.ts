/**
 * WebGL Utilities - WebGL availability checking with retries
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getWebGLDiagnostics,
  trackWebGLCheckStarted,
  trackWebGLCheckSuccess,
  trackWebGLCheckFailed,
  trackWebGLRetryAttempt,
  trackWebGLRecoverySuccess,
  trackWebGLRecoveryFailed,
  startWebGLTrace,
  stopWebGLTrace,
  logDiagnosticReport,
} from '@/lib/webgl-diagnostics';

/**
 * Try to force cleanup any orphaned WebGL contexts (helps on iOS with context limits)
 */
export function forceWebGLCleanup(): void {
  try {
    // Force garbage collection hint by creating and immediately destroying a context
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempGl = tempCanvas.getContext('webgl', { powerPreference: 'low-power' });
    if (tempGl) {
      const ext = tempGl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Detect iOS for platform-specific handling
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

interface UseWebGLAvailabilityResult {
  available: boolean | null;
  retry: () => void;
  isRetrying: boolean;
  error: string | null;
  retryCount: number;
}

/**
 * Hook to check WebGL with retries and comprehensive analytics tracking
 * iOS needs longer delays due to slower context recycling
 */
export function useWebGLAvailability(maxRetries = 5, baseRetryDelay = 300): UseWebGLAvailabilityResult {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStartedCheck = useRef(false);
  const checkStartTime = useRef<number>(0);

  const checkWebGL = useCallback(() => {
    // Track check started only once
    if (!hasStartedCheck.current) {
      hasStartedCheck.current = true;
      checkStartTime.current = Date.now();
      trackWebGLCheckStarted();
      startWebGLTrace();

      // Log full diagnostic report on first check
      if (process.env.NODE_ENV === 'development') {
        logDiagnosticReport();
      }
    }

    // On first check or after cleanup, try to free orphaned contexts
    if (retryCount === 0 || retryCount === 2) {
      forceWebGLCleanup();
    }

    // Track retry attempts
    if (retryCount > 0) {
      trackWebGLRetryAttempt(retryCount, maxRetries);
    }

    // Get comprehensive diagnostics
    const diagnostics = getWebGLDiagnostics();

    if (diagnostics.available) {
      setAvailable(true);
      setError(null);

      // Track success with full diagnostics
      trackWebGLCheckSuccess(diagnostics);
      stopWebGLTrace(true, diagnostics);

      // If this was a recovery (retry succeeded), track it
      if (retryCount > 0) {
        trackWebGLRecoverySuccess(retryCount);
      }
    } else if (retryCount < maxRetries) {
      // Track this failure
      trackWebGLCheckFailed(
        diagnostics.error?.includes('Shader') ? 'ShaderError' :
        diagnostics.error?.includes('context') ? 'ContextError' : 'InitError',
        diagnostics.error || 'Unknown error',
        retryCount
      );

      // Exponential backoff - iOS needs more time between retries
      const delay = baseRetryDelay * Math.pow(1.5, retryCount) * (isIOS() ? 2 : 1);
      console.log(`[WebGL] Check failed, retry ${retryCount + 1}/${maxRetries} in ${Math.round(delay)}ms`);
      console.log('[WebGL] Diagnostics:', diagnostics);

      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, delay);
    } else {
      // All retries exhausted
      setAvailable(false);
      const finalError = diagnostics.error || 'Graphics failed after multiple attempts';
      setError(finalError + '. Try closing other tabs or restarting the browser.');

      // Track final failure
      trackWebGLRecoveryFailed(retryCount, finalError);
      stopWebGLTrace(false, diagnostics);

      // Log full diagnostics for debugging
      console.error('[WebGL] All retries exhausted. Full diagnostics:');
      logDiagnosticReport();
    }
  }, [retryCount, maxRetries, baseRetryDelay]);

  useEffect(() => {
    checkWebGL();
  }, [checkWebGL]);

  const retry = useCallback(() => {
    // Reset tracking for new retry cycle
    hasStartedCheck.current = false;

    // Force cleanup before retry
    forceWebGLCleanup();
    setRetryCount(0);
    setAvailable(null);
    setError(null);
  }, []);

  return { available, retry, isRetrying: available === null && retryCount > 0, error, retryCount };
}
