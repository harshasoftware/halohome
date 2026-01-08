/**
 * Service Registry using Singleton and Caching Proxy patterns
 *
 * Provides centralized access to all services with built-in caching.
 */

import {
  createSingleton,
  createCachingProxy,
  createEventBus,
  createFlyweightFactory,
} from '@/lib/patterns';

// ============================================================================
// Event Bus for Cross-Component Communication
// ============================================================================

/**
 * Typed event bus for globe interactions.
 * Use instead of prop drilling for loosely coupled components.
 *
 * @example
 * // In component A (emit)
 * import { globeEvents } from '@/lib/services/registry';
 * globeEvents.emit('marker:click', { cityId: 'paris', lat: 48.8566, lng: 2.3522 });
 *
 * // In component B (subscribe)
 * useEffect(() => {
 *   return globeEvents.on('marker:click', ({ cityId, lat, lng }) => {
 *     zoomToLocation(lat, lng);
 *   });
 * }, []);
 */
type GlobeEvents = {
  'marker:click': { cityId: string; lat: number; lng: number };
  'marker:hover': { cityId: string | null };
  'line:hover': { planet: string; lineType: string } | null;
  'view:change': { lat: number; lng: number; altitude: number };
  'city:select': { cityId: string; name: string; lat: number; lng: number };
  'chart:update': { birthData: unknown };
  'panel:toggle': { panel: 'city' | 'lines' | 'chart' | 'compatibility'; open: boolean };
};

export const globeEvents = createEventBus<GlobeEvents>();

// ============================================================================
// UI Events for State Coordination
// ============================================================================

type UIEvents = {
  'modal:open': { id: string; data?: unknown };
  'modal:close': { id: string };
  'toast:show': { message: string; type: 'success' | 'error' | 'info' };
  'loading:start': { id: string };
  'loading:end': { id: string };
};

export const uiEvents = createEventBus<UIEvents>();

// ============================================================================
// Flyweight for Expensive Objects
// ============================================================================

/**
 * Icon factory using Flyweight pattern.
 * Shares icon instances to reduce memory usage.
 */
export const iconFactory = createFlyweightFactory(
  (name: string, size: number) => `${name}-${size}`,
  (name: string, size: number) => ({
    name,
    size,
    className: `icon icon-${name}`,
    viewBox: '0 0 24 24',
  })
);

/**
 * Line data flyweight for astrocartography lines.
 * Caches calculated line geometries by planet + type.
 */
export const lineDataFactory = createFlyweightFactory(
  (planet: string, lineType: string) => `${planet}-${lineType}`,
  (planet: string, lineType: string) => ({
    planet,
    lineType,
    id: `${planet}-${lineType}`,
    color: getPlanetColor(planet),
    label: `${planet} ${lineType.toUpperCase()}`,
  })
);

// Planet color mapping
function getPlanetColor(planet: string): string {
  const colors: Record<string, string> = {
    sun: '#FFD700',
    moon: '#C0C0C0',
    mercury: '#87CEEB',
    venus: '#FF69B4',
    mars: '#FF4500',
    jupiter: '#DAA520',
    saturn: '#8B4513',
    uranus: '#00CED1',
    neptune: '#4169E1',
    pluto: '#800080',
    northnode: '#32CD32',
    southnode: '#DC143C',
    chiron: '#FF8C00',
  };
  return colors[planet.toLowerCase()] || '#FFFFFF';
}

// ============================================================================
// Singleton Services
// ============================================================================

/**
 * Get the Supabase client (singleton).
 * Ensures only one client instance exists.
 */
export const getSupabaseClient = createSingleton(async () => {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
});

/**
 * WebGL context pool for efficient resource management.
 * Use when creating multiple WebGL contexts.
 */
export const getWebGLContextPool = createSingleton(() => {
  const contexts = new Map<string, WebGLRenderingContext | WebGL2RenderingContext>();
  let nextId = 0;

  return {
    acquire(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
      const id = `ctx-${nextId++}`;
      const ctx = canvas.getContext('webgl2', options) ||
                  canvas.getContext('webgl', options);
      if (ctx) {
        contexts.set(id, ctx);
      }
      return { id, context: ctx };
    },

    release(id: string) {
      const ctx = contexts.get(id);
      if (ctx) {
        // Clean up WebGL resources
        const loseContext = ctx.getExtension('WEBGL_lose_context');
        loseContext?.loseContext();
        contexts.delete(id);
      }
    },

    get size() {
      return contexts.size;
    },
  };
});

// ============================================================================
// Service Status Tracking
// ============================================================================

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'error';
  lastCheck: number;
  latency?: number;
  errorCount: number;
}

const serviceHealth = new Map<string, ServiceHealth>();

export function getServiceHealth(name: string): ServiceHealth | undefined {
  return serviceHealth.get(name);
}

export function updateServiceHealth(
  name: string,
  status: 'healthy' | 'degraded' | 'error',
  latency?: number
): void {
  const current = serviceHealth.get(name) || {
    name,
    status: 'healthy',
    lastCheck: 0,
    errorCount: 0,
  };

  serviceHealth.set(name, {
    ...current,
    status,
    lastCheck: Date.now(),
    latency,
    errorCount: status === 'error' ? current.errorCount + 1 : 0,
  });
}

export function getAllServiceHealth(): ServiceHealth[] {
  return Array.from(serviceHealth.values());
}
