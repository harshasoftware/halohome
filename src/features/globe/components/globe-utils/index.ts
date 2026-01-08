/**
 * Globe Utilities
 *
 * Performance-optimized utilities and sub-components for MigrationGlobe:
 * - markerCache: Flyweight pattern for caching marker DOM elements
 * - threeObjectPool: Object pool for THREE.js geometries and materials
 * - markerFactory: Factory functions for creating marker elements
 * - markerClustering: Grid-based clustering for large marker datasets
 * - types: Shared type definitions (GlobePath, ZenithMarker, ParanCrossingMarker)
 * - webglUtils: WebGL availability checking with retries
 * - GlobeErrorBoundary: Error boundary for WebGL/Three.js errors
 * - GlobeStateUI: Loading, fallback, tooltip, and indicator components
 */

export * from './markerCache';
export * from './threeObjectPool';
export * from './markerFactory';
export * from './markerClustering';
export * from './types';
export * from './webglUtils';
export { GlobeErrorBoundary } from './GlobeErrorBoundary';
export {
  GlobeLoadingState,
  GlobeFallbackState,
  LineHoverTooltip,
  ZoneDrawingIndicator,
  ZoneActiveBadge,
} from './GlobeStateUI';
