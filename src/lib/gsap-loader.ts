/**
 * GSAP Lazy Loader
 *
 * Provides lazy loading functions for GSAP core and plugins (ScrollTrigger).
 * Uses singleton caching to ensure GSAP is only loaded once, and handles
 * plugin registration automatically.
 *
 * Usage:
 * ```ts
 * const gsap = await loadGSAP();
 * const { gsap, ScrollTrigger } = await loadScrollTrigger();
 * ```
 */

import type { GSAPStatic, ScrollTriggerStatic } from './gsap-types';

// Module state for singleton caching
let gsapModule: GSAPStatic | null = null;
let gsapLoadPromise: Promise<GSAPStatic> | null = null;

let scrollTriggerModule: ScrollTriggerStatic | null = null;
let scrollTriggerLoadPromise: Promise<{ gsap: GSAPStatic; ScrollTrigger: ScrollTriggerStatic }> | null = null;

/**
 * Check if GSAP is already loaded
 */
export function isGSAPLoaded(): boolean {
  return gsapModule !== null;
}

/**
 * Check if ScrollTrigger is already loaded
 */
export function isScrollTriggerLoaded(): boolean {
  return scrollTriggerModule !== null;
}

/**
 * Get the cached GSAP instance if already loaded (synchronous)
 * Returns null if not yet loaded
 */
export function getGSAP(): GSAPStatic | null {
  return gsapModule;
}

/**
 * Get the cached ScrollTrigger instance if already loaded (synchronous)
 * Returns null if not yet loaded
 */
export function getScrollTrigger(): ScrollTriggerStatic | null {
  return scrollTriggerModule;
}

/**
 * Lazy load GSAP core library
 *
 * Returns a cached instance if already loaded, or loads it dynamically.
 * This function is safe to call multiple times - GSAP will only be loaded once.
 *
 * @returns Promise resolving to the GSAP instance
 */
export async function loadGSAP(): Promise<GSAPStatic> {
  // Return cached module if already loaded
  if (gsapModule) return gsapModule;

  // Return existing promise if already loading
  if (gsapLoadPromise) return gsapLoadPromise;

  gsapLoadPromise = (async () => {
    try {
      // Dynamic import of GSAP
      const gsapImport = await import('gsap');
      gsapModule = gsapImport.default as GSAPStatic;
      return gsapModule;
    } catch (error) {
      // Reset promise so retry is possible
      gsapLoadPromise = null;
      throw new Error(`Failed to load GSAP: ${error instanceof Error ? error.message : String(error)}`);
    }
  })();

  return gsapLoadPromise;
}

/**
 * Lazy load GSAP with ScrollTrigger plugin
 *
 * Loads GSAP core (if not already loaded) and ScrollTrigger plugin,
 * then automatically registers ScrollTrigger with GSAP.
 *
 * @returns Promise resolving to an object with gsap and ScrollTrigger instances
 */
export async function loadScrollTrigger(): Promise<{ gsap: GSAPStatic; ScrollTrigger: ScrollTriggerStatic }> {
  // Return cached modules if already loaded
  if (gsapModule && scrollTriggerModule) {
    return { gsap: gsapModule, ScrollTrigger: scrollTriggerModule };
  }

  // Return existing promise if already loading
  if (scrollTriggerLoadPromise) return scrollTriggerLoadPromise;

  scrollTriggerLoadPromise = (async () => {
    try {
      // Load GSAP and ScrollTrigger in parallel
      const [gsapImport, scrollTriggerImport] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      gsapModule = gsapImport.default as GSAPStatic;
      scrollTriggerModule = scrollTriggerImport.ScrollTrigger as ScrollTriggerStatic;

      // Register ScrollTrigger plugin with GSAP
      gsapModule.registerPlugin(scrollTriggerModule);

      return { gsap: gsapModule, ScrollTrigger: scrollTriggerModule };
    } catch (error) {
      // Reset promise so retry is possible
      scrollTriggerLoadPromise = null;
      throw new Error(`Failed to load ScrollTrigger: ${error instanceof Error ? error.message : String(error)}`);
    }
  })();

  return scrollTriggerLoadPromise;
}

/**
 * Preload GSAP in the background without blocking
 *
 * Call this early in your app lifecycle to start loading GSAP
 * before it's actually needed, improving perceived performance.
 */
export function preloadGSAP(): void {
  if (!gsapModule && !gsapLoadPromise) {
    loadGSAP().catch(() => {
      // Silently handle preload errors - actual usage will retry
    });
  }
}

/**
 * Preload GSAP with ScrollTrigger in the background without blocking
 *
 * Call this early in your app lifecycle to start loading GSAP and ScrollTrigger
 * before they're actually needed, improving perceived performance.
 */
export function preloadScrollTrigger(): void {
  if ((!gsapModule || !scrollTriggerModule) && !scrollTriggerLoadPromise) {
    loadScrollTrigger().catch(() => {
      // Silently handle preload errors - actual usage will retry
    });
  }
}
