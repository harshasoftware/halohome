/**
 * Network Status Utilities
 *
 * This module provides utilities for detecting network connectivity status,
 * useful for graceful error handling when lazy-loaded components fail due
 * to network issues.
 *
 * @module network
 */

/**
 * Network status information with detailed state.
 */
export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** The effective connection type (if available) */
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  /** Whether connection is considered slow (2g or slow-2g) */
  isSlow?: boolean;
  /** Timestamp when the status was checked */
  timestamp: number;
}

/**
 * Extended navigator type to include Network Information API.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation|MDN NetworkInformation}
 */
interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
    saveData?: boolean;
    downlink?: number;
    rtt?: number;
  };
}

/**
 * Checks if the browser is currently online.
 *
 * Uses the `navigator.onLine` API which provides a reliable baseline
 * for network connectivity status across all modern browsers.
 *
 * @returns `true` if the browser reports being online, `false` otherwise
 *
 * @remarks
 * This function is safe to call in any environment:
 * - In browsers: Uses navigator.onLine API
 * - In SSR/Node: Returns true (assumes online in server context)
 *
 * Note that `navigator.onLine` may return false negatives in some cases
 * (e.g., device is connected to a network but the network has no internet).
 * However, it reliably detects when a device is definitely offline.
 *
 * @example
 * ```typescript
 * if (!isOnline()) {
 *   showOfflineMessage();
 * }
 * ```
 */
export function isOnline(): boolean {
  // Handle SSR/Node environment where navigator doesn't exist
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

/**
 * Gets detailed network status information.
 *
 * Provides more comprehensive network status including:
 * - Basic online/offline status
 * - Effective connection type (4g, 3g, 2g, slow-2g) when available
 * - Whether the connection is considered slow
 *
 * @returns A {@link NetworkStatus} object with current network information
 *
 * @remarks
 * The effective connection type is only available in browsers that support
 * the Network Information API (Chrome, Edge, Opera). Other browsers will
 * only receive the basic online/offline status.
 *
 * @example
 * ```typescript
 * const status = getNetworkStatus();
 * if (!status.isOnline) {
 *   console.log('User is offline');
 * } else if (status.isSlow) {
 *   console.log('Connection is slow, consider reducing data usage');
 * }
 * ```
 */
export function getNetworkStatus(): NetworkStatus {
  const status: NetworkStatus = {
    isOnline: isOnline(),
    timestamp: Date.now(),
  };

  // Check for Network Information API support (Chrome, Edge, Opera)
  if (typeof navigator !== 'undefined') {
    const nav = navigator as NavigatorWithConnection;
    if (nav.connection?.effectiveType) {
      status.effectiveType = nav.connection.effectiveType;
      status.isSlow = nav.connection.effectiveType === '2g' ||
                      nav.connection.effectiveType === 'slow-2g';
    }
  }

  return status;
}

/**
 * Type definition for network status change event handler.
 */
export type NetworkStatusHandler = (isOnline: boolean) => void;

/**
 * Subscribes to network status changes.
 *
 * Registers event listeners for online/offline events and calls the
 * provided handler whenever the network status changes.
 *
 * @param handler - Callback function called with `true` when online, `false` when offline
 * @returns A cleanup function that removes the event listeners
 *
 * @remarks
 * Always call the returned cleanup function when the subscription is no longer
 * needed (e.g., in React useEffect cleanup or component unmount).
 *
 * @example
 * ```typescript
 * // React useEffect example
 * useEffect(() => {
 *   const cleanup = subscribeToNetworkChanges((isOnline) => {
 *     setOnlineStatus(isOnline);
 *   });
 *   return cleanup;
 * }, []);
 * ```
 */
export function subscribeToNetworkChanges(handler: NetworkStatusHandler): () => void {
  // Handle SSR/Node environment
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onOnline = () => handler(true);
  const onOffline = () => handler(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
