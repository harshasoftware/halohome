/**
 * useGSAPLazy - Lazy-loading wrapper for GSAP animations
 *
 * This hook mirrors the useGSAP API from @gsap/react but loads GSAP dynamically.
 * It handles the case where GSAP hasn't loaded yet gracefully and runs animations
 * once GSAP becomes available.
 *
 * Usage:
 * ```tsx
 * // Basic usage - mirrors @gsap/react useGSAP API
 * useGSAPLazy(() => {
 *   gsap.to('.box', { x: 100 });
 * }, { scope: containerRef, dependencies: [someState] });
 *
 * // With ScrollTrigger (auto-loads ScrollTrigger plugin)
 * useGSAPLazy(() => {
 *   gsap.to('.box', { scrollTrigger: { trigger: '.box' }, y: 100 });
 * }, { scope: containerRef, dependencies: [someState], withScrollTrigger: true });
 * ```
 */

import { useEffect, useRef, useCallback, useState, type RefObject } from 'react';
import {
  loadGSAP,
  loadScrollTrigger,
  getGSAP,
  isGSAPLoaded,
} from '@/lib/gsap-loader';
import type { GSAPStatic, ScrollTriggerStatic } from '@/lib/gsap-types';

/**
 * Context object passed to the animation callback
 */
export interface GSAPContextObject {
  /**
   * Add a function to be called on cleanup (for custom cleanup logic)
   */
  add: (fn: () => void) => void;

  /**
   * Revert all GSAP animations created within this context
   */
  revert: () => void;

  /**
   * Kill all GSAP animations created within this context
   */
  kill: () => void;

  /**
   * Clear all tracked animations without reverting
   */
  clear: () => void;
}

/**
 * Options for the useGSAPLazy hook
 */
export interface UseGSAPLazyOptions {
  /**
   * Scope element ref - all selectors within the callback will be scoped to this element
   * Mirrors the scope parameter from @gsap/react useGSAP
   */
  scope?: RefObject<Element | null>;

  /**
   * Dependencies array - animation callback will re-run when these change
   * Mirrors the dependencies parameter from @gsap/react useGSAP
   */
  dependencies?: unknown[];

  /**
   * Whether to also load ScrollTrigger plugin
   * Set to true if your animations use scrollTrigger
   */
  withScrollTrigger?: boolean;

  /**
   * Whether to skip running the animation (useful for conditional animations)
   */
  disabled?: boolean;
}

/**
 * Return type for useGSAPLazy
 */
export interface UseGSAPLazyResult {
  /**
   * The GSAP instance (null until loaded)
   */
  gsap: GSAPStatic | null;

  /**
   * The ScrollTrigger instance (null until loaded, only available if withScrollTrigger is true)
   */
  ScrollTrigger: ScrollTriggerStatic | null;

  /**
   * Whether GSAP has finished loading
   */
  isLoaded: boolean;

  /**
   * Whether GSAP is currently loading
   */
  isLoading: boolean;

  /**
   * The context object for manual control
   */
  context: GSAPContextObject | null;
}

/**
 * Lazy-loading hook for GSAP animations
 *
 * Mirrors the useGSAP API from @gsap/react but loads GSAP dynamically.
 * The animation callback is called once GSAP is loaded and when dependencies change.
 *
 * @param callback - Function that creates GSAP animations. Receives (gsap, contextSafe) parameters.
 * @param options - Configuration options including scope, dependencies, and withScrollTrigger
 * @returns Object containing gsap instance, loading state, and context
 */
export function useGSAPLazy(
  callback: (
    gsap: GSAPStatic,
    contextSafe: <T extends (...args: unknown[]) => unknown>(fn: T) => T
  ) => void | (() => void),
  options: UseGSAPLazyOptions = {}
): UseGSAPLazyResult {
  const { scope, dependencies = [], withScrollTrigger = false, disabled = false } = options;

  const [gsapInstance, setGsapInstance] = useState<GSAPStatic | null>(() => getGSAP());
  const [scrollTriggerInstance, setScrollTriggerInstance] = useState<ScrollTriggerStatic | null>(null);
  const [isLoading, setIsLoading] = useState(!isGSAPLoaded());
  const [isLoaded, setIsLoaded] = useState(isGSAPLoaded());

  // Track cleanup functions and GSAP context
  const cleanupRef = useRef<(() => void) | null>(null);
  const additionalCleanups = useRef<Set<() => void>>(new Set());
  const gsapContextRef = useRef<ReturnType<GSAPStatic['context']> | null>(null);

  // Create the context object for the callback
  const contextObject = useRef<GSAPContextObject>({
    add: (fn: () => void) => {
      additionalCleanups.current.add(fn);
    },
    revert: () => {
      gsapContextRef.current?.revert();
    },
    kill: () => {
      gsapContextRef.current?.kill();
    },
    clear: () => {
      gsapContextRef.current?.clear();
    },
  });

  // Load GSAP on mount
  useEffect(() => {
    if (disabled) return;

    let isMounted = true;

    const load = async () => {
      try {
        setIsLoading(true);

        if (withScrollTrigger) {
          const result = await loadScrollTrigger();
          if (isMounted) {
            setGsapInstance(result.gsap);
            setScrollTriggerInstance(result.ScrollTrigger);
            setIsLoaded(true);
            setIsLoading(false);
          }
        } else {
          const gsap = await loadGSAP();
          if (isMounted) {
            setGsapInstance(gsap);
            setIsLoaded(true);
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          setIsLoading(false);
          // GSAP failed to load - animations won't run but app continues
        }
      }
    };

    // If already loaded, use cached instance immediately
    if (isGSAPLoaded() && (!withScrollTrigger || scrollTriggerInstance)) {
      setIsLoaded(true);
      setIsLoading(false);
    } else {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [withScrollTrigger, disabled]);

  // Create a contextSafe wrapper function
  const createContextSafe = useCallback(
    (gsap: GSAPStatic) => {
      return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
        // In a GSAP context, this wraps the function to be safe for use in event handlers
        // The wrapped function will properly participate in the context's cleanup
        return ((...args: unknown[]) => {
          if (gsapContextRef.current) {
            gsapContextRef.current.add(() => fn(...args));
            return fn(...args);
          }
          return fn(...args);
        }) as T;
      };
    },
    []
  );

  // Run animation callback when GSAP is loaded and dependencies change
  useEffect(() => {
    if (disabled || !isLoaded || !gsapInstance) return;

    // Clean up previous animations
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    additionalCleanups.current.forEach((fn) => fn());
    additionalCleanups.current.clear();

    // Revert previous GSAP context
    if (gsapContextRef.current) {
      gsapContextRef.current.revert();
      gsapContextRef.current = null;
    }

    // Create GSAP context scoped to the provided element
    const scopeElement = scope?.current || undefined;
    const ctx = gsapInstance.context(() => {
      // Run the animation callback
      const cleanup = callback(gsapInstance, createContextSafe(gsapInstance));
      if (typeof cleanup === 'function') {
        cleanupRef.current = cleanup;
      }
    }, scopeElement);

    gsapContextRef.current = ctx;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      additionalCleanups.current.forEach((fn) => fn());
      additionalCleanups.current.clear();

      if (gsapContextRef.current) {
        gsapContextRef.current.revert();
        gsapContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, gsapInstance, disabled, callback, ...dependencies]);

  return {
    gsap: gsapInstance,
    ScrollTrigger: scrollTriggerInstance,
    isLoaded,
    isLoading,
    context: contextObject.current,
  };
}

/**
 * Simple version of useGSAPLazy that just provides the GSAP instance
 * Use this when you need manual control over when animations run
 *
 * @param withScrollTrigger - Whether to also load ScrollTrigger plugin
 * @returns Object containing gsap instance and loading state
 */
export function useGSAPInstance(withScrollTrigger = false): {
  gsap: GSAPStatic | null;
  ScrollTrigger: ScrollTriggerStatic | null;
  isLoaded: boolean;
  isLoading: boolean;
} {
  const [gsapInstance, setGsapInstance] = useState<GSAPStatic | null>(() => getGSAP());
  const [scrollTriggerInstance, setScrollTriggerInstance] = useState<ScrollTriggerStatic | null>(null);
  const [isLoading, setIsLoading] = useState(!isGSAPLoaded());
  const [isLoaded, setIsLoaded] = useState(isGSAPLoaded());

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setIsLoading(true);

        if (withScrollTrigger) {
          const result = await loadScrollTrigger();
          if (isMounted) {
            setGsapInstance(result.gsap);
            setScrollTriggerInstance(result.ScrollTrigger);
            setIsLoaded(true);
            setIsLoading(false);
          }
        } else {
          const gsap = await loadGSAP();
          if (isMounted) {
            setGsapInstance(gsap);
            setIsLoaded(true);
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!isGSAPLoaded() || (withScrollTrigger && !scrollTriggerInstance)) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [withScrollTrigger, scrollTriggerInstance]);

  return {
    gsap: gsapInstance,
    ScrollTrigger: scrollTriggerInstance,
    isLoaded,
    isLoading,
  };
}

export default useGSAPLazy;
