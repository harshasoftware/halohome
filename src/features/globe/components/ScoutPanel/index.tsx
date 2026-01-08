/**
 * ScoutPanel Component
 *
 * Displays scouted locations by life category with filtering.
 *
 * This directory structure follows the CityInfoPanel pattern:
 * - index.tsx: Main component (this file)
 * - components/: Sub-components extracted from the main component
 * - constants.ts: Static data and constants
 * - types.ts: TypeScript type definitions
 *
 * During the refactoring process, this file re-exports from the original
 * ScoutPanel.tsx to maintain backward compatibility while sub-components
 * are extracted incrementally.
 */

// Re-export from original ScoutPanel.tsx to maintain backward compatibility
// This will be replaced with the refactored component in subtask 5.2
export { ScoutPanel, default } from '../ScoutPanel.tsx';

// Export types (will be populated in subtask 1.4)
export * from './types';
