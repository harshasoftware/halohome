/**
 * Performance Design Patterns
 *
 * Patterns for optimizing loading, rendering, and runtime performance.
 * Based on patterns.dev performance patterns.
 */

// ============================================================================
// Dynamic Import Pattern - Load modules on demand
// ============================================================================

/**
 * Creates a dynamic importer with loading state tracking.
 *
 * @example
 * const loadChart = createDynamicImport(() => import('./HeavyChart'));
 * const { module, isLoading, error, load } = loadChart();
 *
 * // Trigger load
 * const Chart = await load();
 */
export function createDynamicImport<T>(
  importFn: () => Promise<{ default: T }>,
  options: { preload?: boolean } = {}
) {
  let promise: Promise<T> | null = null;
  let result: T | null = null;
  let error: Error | null = null;

  const load = async (): Promise<T> => {
    if (result) return result;
    if (error) throw error;

    if (!promise) {
      promise = importFn()
        .then((module) => {
          result = module.default;
          return result;
        })
        .catch((err) => {
          error = err;
          throw err;
        });
    }

    return promise;
  };

  // Preload on idle
  if (options.preload && typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => load().catch(() => {}));
    } else {
      setTimeout(() => load().catch(() => {}), 200);
    }
  }

  return {
    load,
    get isLoaded() { return result !== null; },
    get isLoading() { return promise !== null && result === null && error === null; },
    get error() { return error; },
    get module() { return result; },
    preload: () => { load().catch(() => {}); },
  };
}

/**
 * Import with retry logic for unreliable networks.
 *
 * @example
 * const module = await importWithRetry(
 *   () => import('./LargeModule'),
 *   { retries: 3, delay: 1000 }
 * );
 */
export async function importWithRetry<T>(
  importFn: () => Promise<T>,
  options: { retries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(backoff, attempt))
        );
      }
    }
  }

  throw lastError;
}

// ============================================================================
// Import On Visibility - Load when element becomes visible
// ============================================================================

/**
 * Creates a visibility-triggered importer.
 *
 * @example
 * const { ref, Component } = importOnVisibility(
 *   () => import('./HeavyComponent'),
 *   { rootMargin: '100px' }
 * );
 *
 * return <div ref={ref}>{Component && <Component />}</div>;
 */
export function importOnVisibility<T>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
) {
  let component: T | null = null;
  let observer: IntersectionObserver | null = null;
  const callbacks = new Set<(c: T) => void>();

  const createObserver = () => {
    if (observer) return observer;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            importFn().then((module) => {
              component = module.default;
              callbacks.forEach((cb) => cb(component!));
              observer?.disconnect();
            });
          }
        }
      },
      { rootMargin: '50px', ...options }
    );

    return observer;
  };

  return {
    observe(element: Element): void {
      createObserver().observe(element);
    },

    onLoad(callback: (component: T) => void): void {
      if (component) {
        callback(component);
      } else {
        callbacks.add(callback);
      }
    },

    disconnect(): void {
      observer?.disconnect();
    },

    get isLoaded(): boolean {
      return component !== null;
    },

    get component(): T | null {
      return component;
    },
  };
}

// ============================================================================
// Import On Interaction - Load on user interaction
// ============================================================================

type InteractionEvent = 'click' | 'hover' | 'focus' | 'touchstart';

/**
 * Creates an interaction-triggered importer.
 *
 * @example
 * const { attach, Component, load } = importOnInteraction(
 *   () => import('./Modal'),
 *   ['click', 'hover']
 * );
 *
 * <button ref={attach}>Open Modal</button>
 * {Component && <Component />}
 */
export function importOnInteraction<T>(
  importFn: () => Promise<{ default: T }>,
  events: InteractionEvent[] = ['click', 'hover']
) {
  let component: T | null = null;
  let isLoading = false;
  const callbacks = new Set<(c: T) => void>();

  const load = async (): Promise<T> => {
    if (component) return component;
    if (isLoading) {
      return new Promise((resolve) => {
        callbacks.add(resolve);
      });
    }

    isLoading = true;
    const module = await importFn();
    component = module.default;
    isLoading = false;
    callbacks.forEach((cb) => cb(component!));
    callbacks.clear();
    return component;
  };

  const eventMap: Record<InteractionEvent, string> = {
    click: 'click',
    hover: 'mouseenter',
    focus: 'focus',
    touchstart: 'touchstart',
  };

  return {
    attach(element: HTMLElement | null): void {
      if (!element) return;

      const handler = () => load();

      for (const event of events) {
        element.addEventListener(eventMap[event], handler, { once: true, passive: true });
      }
    },

    load,

    onLoad(callback: (component: T) => void): void {
      if (component) {
        callback(component);
      } else {
        callbacks.add(callback);
      }
    },

    get isLoaded(): boolean {
      return component !== null;
    },

    get isLoading(): boolean {
      return isLoading;
    },

    get component(): T | null {
      return component;
    },
  };
}

// ============================================================================
// Bundle Splitting Helpers
// ============================================================================

/**
 * Creates named chunk imports for better bundle splitting.
 *
 * @example
 * const chunks = createChunkedImports({
 *   dashboard: () => import(/* webpackChunkName: "dashboard" *\/ './Dashboard'),
 *   settings: () => import(/* webpackChunkName: "settings" *\/ './Settings'),
 *   analytics: () => import(/* webpackChunkName: "analytics" *\/ './Analytics'),
 * });
 *
 * const Dashboard = await chunks.load('dashboard');
 */
export function createChunkedImports<T extends Record<string, () => Promise<{ default: unknown }>>>(
  chunks: T
) {
  const loaded = new Map<keyof T, unknown>();

  return {
    async load<K extends keyof T>(name: K): Promise<Awaited<ReturnType<T[K]>>['default']> {
      if (loaded.has(name)) {
        return loaded.get(name) as Awaited<ReturnType<T[K]>>['default'];
      }

      const module = await chunks[name]();
      loaded.set(name, module.default);
      return module.default as Awaited<ReturnType<T[K]>>['default'];
    },

    preloadAll(): void {
      for (const loader of Object.values(chunks)) {
        (loader as () => Promise<unknown>)().catch(() => {});
      }
    },

    preload<K extends keyof T>(name: K): void {
      chunks[name]().catch(() => {});
    },

    isLoaded<K extends keyof T>(name: K): boolean {
      return loaded.has(name);
    },
  };
}

// ============================================================================
// PRPL Pattern - Push, Render, Pre-cache, Lazy-load
// ============================================================================

/**
 * PRPL pattern implementation for optimal loading.
 *
 * @example
 * const prpl = createPRPL({
 *   critical: ['./App', './Router'],
 *   secondary: ['./Dashboard', './Settings'],
 *   tertiary: ['./Analytics', './Reports'],
 * });
 *
 * // On app load
 * await prpl.loadCritical();
 * prpl.preloadSecondary(); // In background
 */
export function createPRPL<T = unknown>(config: {
  critical: (() => Promise<T>)[];
  secondary?: (() => Promise<T>)[];
  tertiary?: (() => Promise<T>)[];
}) {
  const loadedModules = new Map<string, T>();

  const loadModules = async (
    modules: (() => Promise<T>)[],
    parallel = true
  ): Promise<T[]> => {
    if (parallel) {
      return Promise.all(modules.map((m) => m()));
    }

    const results: T[] = [];
    for (const m of modules) {
      results.push(await m());
    }
    return results;
  };

  const preloadOnIdle = (modules: (() => Promise<T>)[]) => {
    if (typeof window === 'undefined') return;

    const preload = () => {
      modules.forEach((m) => m().catch(() => {}));
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload);
    } else {
      setTimeout(preload, 200);
    }
  };

  return {
    async loadCritical(): Promise<T[]> {
      return loadModules(config.critical);
    },

    preloadSecondary(): void {
      if (config.secondary) {
        preloadOnIdle(config.secondary);
      }
    },

    preloadTertiary(): void {
      if (config.tertiary) {
        preloadOnIdle(config.tertiary);
      }
    },

    async loadAll(): Promise<{ critical: T[]; secondary: T[]; tertiary: T[] }> {
      const [critical, secondary, tertiary] = await Promise.all([
        loadModules(config.critical),
        config.secondary ? loadModules(config.secondary) : Promise.resolve([]),
        config.tertiary ? loadModules(config.tertiary) : Promise.resolve([]),
      ]);

      return { critical, secondary, tertiary };
    },
  };
}

// ============================================================================
// Preload & Prefetch Helpers
// ============================================================================

/**
 * Preloads a resource for the current navigation.
 *
 * @example
 * preloadResource('/api/user', 'fetch');
 * preloadResource('/fonts/main.woff2', 'font');
 * preloadResource('/images/hero.jpg', 'image');
 */
export function preloadResource(
  href: string,
  as: 'script' | 'style' | 'image' | 'font' | 'fetch',
  options: { crossOrigin?: 'anonymous' | 'use-credentials'; type?: string } = {}
): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;

  // Check if already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return existing as HTMLLinkElement;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;

  if (options.crossOrigin) {
    link.crossOrigin = options.crossOrigin;
  }

  if (options.type) {
    link.type = options.type;
  }

  document.head.appendChild(link);
  return link;
}

/**
 * Prefetches a resource for future navigation.
 *
 * @example
 * prefetchResource('/next-page.js');
 * prefetchResource('/api/data', { as: 'fetch' });
 */
export function prefetchResource(
  href: string,
  options: { as?: string; crossOrigin?: 'anonymous' | 'use-credentials' } = {}
): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;

  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
  if (existing) return existing as HTMLLinkElement;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;

  if (options.as) {
    link.setAttribute('as', options.as);
  }

  if (options.crossOrigin) {
    link.crossOrigin = options.crossOrigin;
  }

  document.head.appendChild(link);
  return link;
}

/**
 * Preconnects to an origin for faster subsequent requests.
 *
 * @example
 * preconnect('https://api.example.com');
 * preconnect('https://fonts.googleapis.com', true); // DNS only
 */
export function preconnect(origin: string, dnsOnly = false): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;

  const rel = dnsOnly ? 'dns-prefetch' : 'preconnect';
  const existing = document.querySelector(`link[rel="${rel}"][href="${origin}"]`);
  if (existing) return existing as HTMLLinkElement;

  const link = document.createElement('link');
  link.rel = rel;
  link.href = origin;

  if (!dnsOnly) {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
  return link;
}

// ============================================================================
// Resource Hints Manager
// ============================================================================

/**
 * Manages resource hints for optimal loading.
 *
 * @example
 * const hints = createResourceHints();
 *
 * // On route change
 * hints.prefetchRoute('/dashboard', [
 *   '/api/dashboard',
 *   '/chunks/dashboard.js',
 * ]);
 */
export function createResourceHints() {
  const preloaded = new Set<string>();
  const prefetched = new Set<string>();
  const preconnected = new Set<string>();

  return {
    preload(href: string, as: 'script' | 'style' | 'image' | 'font' | 'fetch'): void {
      if (preloaded.has(href)) return;
      preloadResource(href, as);
      preloaded.add(href);
    },

    prefetch(href: string): void {
      if (prefetched.has(href)) return;
      prefetchResource(href);
      prefetched.add(href);
    },

    preconnect(origin: string): void {
      if (preconnected.has(origin)) return;
      preconnect(origin);
      preconnected.add(origin);
    },

    prefetchRoute(route: string, resources: string[]): void {
      resources.forEach((href) => this.prefetch(href));
    },

    preloadCritical(resources: Array<{ href: string; as: 'script' | 'style' | 'image' | 'font' | 'fetch' }>): void {
      resources.forEach(({ href, as }) => this.preload(href, as));
    },

    clear(): void {
      preloaded.clear();
      prefetched.clear();
      preconnected.clear();
    },
  };
}

// ============================================================================
// Third-Party Script Loading
// ============================================================================

type ScriptLoadStrategy = 'eager' | 'lazy' | 'idle' | 'interaction';

/**
 * Optimizes third-party script loading.
 *
 * @example
 * const scripts = createThirdPartyLoader();
 *
 * // Load analytics on idle
 * scripts.load('https://analytics.com/script.js', { strategy: 'idle' });
 *
 * // Load chat widget on interaction
 * scripts.load('https://chat.com/widget.js', {
 *   strategy: 'interaction',
 *   trigger: document.getElementById('chat-button'),
 * });
 */
export function createThirdPartyLoader() {
  const loaded = new Set<string>();
  const loading = new Map<string, Promise<void>>();

  const loadScript = (src: string, async = true): Promise<void> => {
    if (loaded.has(src)) return Promise.resolve();
    if (loading.has(src)) return loading.get(src)!;

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = async;

      script.onload = () => {
        loaded.add(src);
        loading.delete(src);
        resolve();
      };

      script.onerror = () => {
        loading.delete(src);
        reject(new Error(`Failed to load script: ${src}`));
      };

      document.head.appendChild(script);
    });

    loading.set(src, promise);
    return promise;
  };

  return {
    load(
      src: string,
      options: {
        strategy?: ScriptLoadStrategy;
        trigger?: HTMLElement | null;
        delay?: number;
      } = {}
    ): Promise<void> {
      const { strategy = 'eager', trigger, delay = 0 } = options;

      switch (strategy) {
        case 'eager':
          return loadScript(src);

        case 'lazy':
          return new Promise((resolve) => {
            setTimeout(() => {
              loadScript(src).then(resolve);
            }, delay);
          });

        case 'idle':
          return new Promise((resolve) => {
            const load = () => loadScript(src).then(resolve);
            if ('requestIdleCallback' in window) {
              requestIdleCallback(load);
            } else {
              setTimeout(load, 200);
            }
          });

        case 'interaction':
          return new Promise((resolve) => {
            if (!trigger) {
              console.warn('Interaction strategy requires a trigger element');
              return loadScript(src).then(resolve);
            }

            const events = ['click', 'mouseenter', 'touchstart', 'focus'];
            const handler = () => {
              events.forEach((e) => trigger.removeEventListener(e, handler));
              loadScript(src).then(resolve);
            };

            events.forEach((e) => trigger.addEventListener(e, handler, { once: true, passive: true }));
          });

        default:
          return loadScript(src);
      }
    },

    isLoaded(src: string): boolean {
      return loaded.has(src);
    },

    isLoading(src: string): boolean {
      return loading.has(src);
    },
  };
}

// ============================================================================
// Compression Helpers (Runtime)
// ============================================================================

/**
 * Compresses JSON data for storage/transmission.
 * Uses CompressionStream API when available.
 *
 * @example
 * const compressed = await compressData({ users: [...] });
 * localStorage.setItem('data', compressed);
 *
 * const data = await decompressData(localStorage.getItem('data'));
 */
export async function compressData(data: unknown): Promise<string> {
  const json = JSON.stringify(data);

  // Use CompressionStream if available (modern browsers)
  if ('CompressionStream' in window) {
    const stream = new Blob([json]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();
    const arrayBuffer = await compressedBlob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  }

  // Fallback: basic string encoding
  return btoa(encodeURIComponent(json));
}

export async function decompressData<T = unknown>(compressed: string): Promise<T> {
  // Try CompressionStream first
  if ('DecompressionStream' in window) {
    try {
      const bytes = Uint8Array.from(atob(compressed), (c) => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(decompressedStream).text();
      return JSON.parse(text);
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback
  const json = decodeURIComponent(atob(compressed));
  return JSON.parse(json);
}

// ============================================================================
// Memory-Efficient Data Handling
// ============================================================================

/**
 * Creates a memory-efficient data store with automatic cleanup.
 *
 * @example
 * const store = createEfficientStore<User>({
 *   maxSize: 1000,
 *   ttl: 5 * 60 * 1000, // 5 minutes
 * });
 *
 * store.set('user:1', userData);
 * const user = store.get('user:1');
 */
export function createEfficientStore<T>(options: {
  maxSize?: number;
  ttl?: number;
  onEvict?: (key: string, value: T) => void;
} = {}) {
  const { maxSize = 1000, ttl = 0, onEvict } = options;

  const store = new Map<string, { value: T; expires: number; accessed: number }>();

  const cleanup = () => {
    const now = Date.now();

    // Remove expired entries
    if (ttl > 0) {
      for (const [key, entry] of store.entries()) {
        if (entry.expires < now) {
          onEvict?.(key, entry.value);
          store.delete(key);
        }
      }
    }

    // Evict LRU if over size
    while (store.size > maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of store.entries()) {
        if (entry.accessed < oldestTime) {
          oldestTime = entry.accessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const entry = store.get(oldestKey);
        if (entry) onEvict?.(oldestKey, entry.value);
        store.delete(oldestKey);
      }
    }
  };

  return {
    set(key: string, value: T): void {
      const now = Date.now();
      store.set(key, {
        value,
        expires: ttl > 0 ? now + ttl : Infinity,
        accessed: now,
      });
      cleanup();
    },

    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;

      const now = Date.now();
      if (entry.expires < now) {
        onEvict?.(key, entry.value);
        store.delete(key);
        return undefined;
      }

      entry.accessed = now;
      return entry.value;
    },

    delete(key: string): boolean {
      const entry = store.get(key);
      if (entry) {
        onEvict?.(key, entry.value);
      }
      return store.delete(key);
    },

    clear(): void {
      if (onEvict) {
        for (const [key, entry] of store.entries()) {
          onEvict(key, entry.value);
        }
      }
      store.clear();
    },

    get size(): number {
      return store.size;
    },

    keys(): string[] {
      return [...store.keys()];
    },
  };
}
