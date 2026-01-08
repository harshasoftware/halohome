# Globe Feature Architecture

This document outlines the architecture of the interactive globe feature.

## Components

- **MigrationGlobe**: The main component that renders the globe and manages its state.
- **AvatarMarker**: Renders individual avatars on the globe.
- **PersonCard**: Displays detailed information about a person when their avatar is clicked.
- **ControlPanel**: Provides options for filtering and customizing the globe view.
- **TimelineScrubber**: Allows users to navigate through different time periods.

## Hooks

- **useGlobeData**: Fetches and prepares the data for the globe.
- **useFilters**: Manages the state of the filters.
- **usePersonFocus**: Manages the currently focused person.

## Utilities

- **transformTree**: Converts the family tree data into a format suitable for the globe.

## Scout Feature

The Scout feature analyzes planetary lines to recommend optimal locations for different life categories. See [Scout Algorithm Documentation](./scout-algorithm.md) for detailed algorithm specifications.

### Scout Components

- **ScoutPanel**: Main UI component for scout location results
- **useScoutWasm**: Hook providing Web Worker-based scoring

### Scout Algorithm Versions

| Version | Implementation | Execution |
|---------|---------------|-----------|
| V1 | `scout-utils.ts` | Main thread |
| C2 | `scout-algorithm-c2.ts` | Web Worker |
| C2 WASM | `astro-core/scout.rs` | Web Worker + WASM |
