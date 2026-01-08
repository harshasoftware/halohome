# Claude Code Rules - The Modern Family

Project-specific rules and patterns for AI-assisted development.

## Project Overview

This is **The Modern Family** - an astrocartography web application built with:
- **React 18** with TypeScript
- **Vite** for bundling
- **Supabase** for backend (auth, database, edge functions)
- **React Flow** for family tree visualization
- **Globe.gl** for 3D Earth visualization
- **Framer Motion** for animations

## Design Patterns Library

Use patterns from `src/lib/patterns/` for consistent, maintainable code.

### When to Use Each Pattern

#### Creational Patterns (`creational.ts`)

| Pattern | When to Use |
|---------|------------|
| **Singleton** | Services that should have exactly one instance (API clients, caches, stores) |
| **Factory** | Creating objects without specifying exact class, when type depends on config/input |
| **Prototype** | Cloning complex objects, creating variations of base configurations |
| **Builder** | Constructing complex objects step-by-step with optional parameters |
| **Object Pool** | Reusing expensive objects (WebGL contexts, worker threads) |

```typescript
// Singleton for services
import { createSingleton } from '@/lib/patterns';

const getApiClient = createSingleton(() => new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
}));

// Factory for creating typed instances
const chartFactory = createFactory({
  natal: (data) => new NatalChart(data),
  transit: (data) => new TransitChart(data),
  synastry: (data) => new SynastryChart(data),
});
```

#### Structural Patterns (`structural.ts`)

| Pattern | When to Use |
|---------|------------|
| **Lazy Proxy** | Defer expensive initialization until first use |
| **Caching Proxy** | Cache method results with TTL (API calls, computations) |
| **Validation Proxy** | Enforce constraints on property assignments |
| **Logging Proxy** | Debug/monitor object interactions |
| **Flyweight** | Share common data between many similar objects |
| **Module** | Encapsulate private state with public interface |
| **Adapter** | Convert legacy/external data formats to internal types |
| **Decorator** | Add cross-cutting concerns (logging, timing, retries) |

```typescript
// Caching proxy for API calls
import { createCachingProxy } from '@/lib/patterns';

const cachedWeatherService = createCachingProxy(weatherService, {
  ttl: 5 * 60 * 1000, // 5 minutes
  methods: ['getWeather', 'getForecast'],
});

// Flyweight for shared icon instances
const iconFactory = createFlyweightFactory(
  (name, size) => `${name}-${size}`,
  (name, size) => createIcon(name, size)
);
```

#### Behavioral Patterns (`behavioral.ts`)

| Pattern | When to Use |
|---------|------------|
| **Observable** | Simple event subscription (single event type) |
| **Event Bus** | Multiple event types with typed payloads |
| **Reactive State** | Observable state with per-property subscriptions |
| **Middleware** | Request/response pipelines (like Express) |
| **Mediator** | Decouple component communication |
| **Command** | Encapsulate actions with undo/redo support |
| **Strategy** | Switch between algorithms at runtime |
| **State Machine** | Model finite states with transitions |
| **Chain of Responsibility** | Pass requests through handler chain |

```typescript
// Event bus for cross-component communication
import { createEventBus } from '@/lib/patterns';

type GlobeEvents = {
  'marker:click': { cityId: string; lat: number; lng: number };
  'line:hover': { planet: string; lineType: string };
  'view:change': { lat: number; lng: number; zoom: number };
};

export const globeEvents = createEventBus<GlobeEvents>();

// State machine for UI flows
const chartWizard = createStateMachine({
  initial: 'birthDate',
  states: {
    birthDate: { on: { NEXT: 'birthTime' } },
    birthTime: { on: { NEXT: 'birthPlace', BACK: 'birthDate' } },
    birthPlace: { on: { NEXT: 'complete', BACK: 'birthTime' } },
    complete: { on: { RESET: 'birthDate' } },
  },
});
```

#### Composition Patterns (`composition.tsx`)

| Pattern | When to Use |
|---------|------------|
| **Provider** | Share global state/services via React Context |
| **State Provider** | Provider with built-in useState/setState |
| **Service Provider** | Dependency injection for services |
| **Feature Flags** | Toggle features with runtime control |
| **Compose Providers** | Reduce provider nesting |

```typescript
// Service provider for DI
import { createServiceProvider } from '@/lib/patterns';

const [AstroServicesProvider, useAstroServices] = createServiceProvider(() => ({
  ephemeris: new EphemerisService(),
  geocoder: new GeocoderService(),
  weather: new WeatherService(),
}));

// Compose providers to reduce nesting
const AppProviders = composeProviders([
  [ThemeProvider, { theme: 'dark' }],
  [AuthProvider, {}],
  [AstroServicesProvider, {}],
]);
```

#### Performance Patterns (`performance.ts`)

| Pattern | When to Use |
|---------|------------|
| **Dynamic Import** | Code-split routes and heavy components |
| **Import on Visibility** | Load components when scrolled into view |
| **Import on Interaction** | Load on user interaction (click, hover) |
| **Bundle Splitting** | Split code into logical chunks for parallel loading |
| **PRPL Pattern** | Push, Render, Pre-cache, Lazy-load structure |
| **Tree Shaking** | Remove unused code (requires ES modules) |
| **Preload** | Load critical resources early (current navigation) |
| **Prefetch** | Load resources for likely future navigation |
| **Third-party Loader** | Load external scripts strategically |
| **List Virtualization** | Render only visible items in large lists |
| **Compression** | Compress large data for storage/transfer |

```typescript
// 1. DYNAMIC IMPORT - Code-split routes
const GlobePage = lazy(() => import('@/pages/GlobePage'));
const FamilyTree = lazy(() => import('@/pages/FamilyTree'));

// 2. IMPORT ON VISIBILITY - Load when scrolled into view
import { importOnVisibility } from '@/lib/patterns';

const LazyGlobe = importOnVisibility(
  () => import('@/features/globe/GlobeCanvas'),
  { rootMargin: '200px', fallback: <GlobeSkeleton /> }
);

// 3. IMPORT ON INTERACTION - Load on click/hover
import { importOnInteraction } from '@/lib/patterns';

const HeavyEditor = importOnInteraction(
  () => import('@/components/RichTextEditor'),
  { trigger: 'click', fallback: <EditorPlaceholder /> }
);

// 4. BUNDLE SPLITTING - Chunk related code together
import { createChunkedImports } from '@/lib/patterns';

const astroChunks = createChunkedImports({
  core: () => import('@/lib/astro-core'),
  charts: () => import('@/lib/astro-charts'),
  interpretations: () => import('@/lib/astro-interpretations'),
});

// 5. PRPL PATTERN - Optimal loading structure
import { createPRPL } from '@/lib/patterns';

const prpl = createPRPL({
  push: ['/fonts/inter.woff2', '/critical.css'],
  precache: ['/offline.html', '/manifest.json'],
  lazyRoutes: {
    '/globe': () => import('./pages/Globe'),
    '/tree': () => import('./pages/FamilyTree'),
  },
});

// 6. PRELOAD & PREFETCH - Resource hints
import { preloadResource, prefetchResource, preconnect } from '@/lib/patterns';

// Preload critical (needed for current page)
preloadResource('/fonts/inter-var.woff2', 'font');
preloadResource('/api/user', 'fetch');

// Prefetch likely next pages
prefetchResource('/globe', 'document');

// Preconnect to required origins
preconnect('https://api.mapbox.com');
preconnect('https://supabase.co');

// 7. THIRD-PARTY LOADING - Strategic external scripts
import { createThirdPartyLoader } from '@/lib/patterns';

const thirdParty = createThirdPartyLoader();
thirdParty.load('analytics', 'https://analytics.example.com/script.js', {
  strategy: 'idle',  // Load when browser is idle
  async: true,
});

// 8. COMPRESSION - Compress large data
import { compressData, decompressData } from '@/lib/patterns';

// Compress for storage
const compressed = await compressData(JSON.stringify(largeChartData));
localStorage.setItem('chart-cache', compressed);

// Decompress when needed
const data = JSON.parse(await decompressData(compressed));
```

##### Tree Shaking Best Practices

Tree shaking removes unused code at build time. Follow these rules:

```typescript
// BAD: Imports entire library
import _ from 'lodash';
const result = _.map(items, fn);

// GOOD: Import only what you need
import map from 'lodash/map';
const result = map(items, fn);

// BAD: Re-export everything
export * from './utils';

// GOOD: Named exports only
export { formatDate, parseDate } from './date-utils';
export { formatCurrency } from './currency-utils';

// BAD: Side effects in module scope
let cache = {};  // Prevents tree shaking
export const getItem = (key) => cache[key];

// GOOD: Pure functions, no side effects
export const createCache = () => {
  const cache = {};
  return { get: (key) => cache[key] };
};
```

##### Bundle Splitting Strategy

```typescript
// vite.config.ts - Manual chunks for optimal splitting
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],

          // Feature chunks
          'feature-globe': [
            './src/features/globe/GlobeCanvas',
            './src/features/globe/AstroLines',
          ],
          'feature-charts': [
            './src/features/charts/NatalChart',
            './src/features/charts/TransitChart',
          ],
        },
      },
    },
  },
});
```

#### Rendering Patterns (`rendering.tsx`)

| Pattern | When to Use |
|---------|------------|
| **Island** | Partial hydration for isolated interactive components |
| **View Transitions** | Smooth page/state transitions |
| **Virtual List** | Render large lists efficiently |
| **Infinite Virtual List** | Virtual list with infinite scroll |
| **Deferred State** | Lower priority updates for responsiveness |
| **Content Visibility** | CSS-based visibility optimization |
| **Content Skeleton** | Loading placeholders |

```typescript
// Island for interactive widget in static content
import { Island } from '@/lib/patterns';

<Island priority="high">
  <DatePicker onChange={handleDateChange} />
</Island>

// Virtual list for large datasets
import { VirtualList } from '@/lib/patterns';

<VirtualList
  items={cities}
  itemHeight={72}
  containerHeight={400}
  overscan={5}
  renderItem={(city) => <CityCard city={city} />}
/>
```

#### React Patterns (`hoc.tsx`, `compound.tsx`, `container.tsx`, `render-props.tsx`, `progressive.tsx`)

| Pattern | When to Use |
|---------|------------|
| **HOC** | Add cross-cutting behavior (auth, logging, error boundaries) |
| **Compound Components** | Related components sharing implicit state |
| **Container/Presentational** | Separate data fetching from rendering |
| **Render Props** | Share code between components via render function |
| **Progressive Loading** | Load content in priority order |

```typescript
// HOC composition
import { compose, withErrorBoundary, withAuth, withMemo } from '@/lib/patterns';

const EnhancedDashboard = compose(
  withErrorBoundary({ fallback: <ErrorFallback /> }),
  withAuth({ redirectTo: '/login' }),
  withMemo(['userId', 'chartData'])
)(Dashboard);

// Compound component for forms
const { Provider, Item, Trigger, Content } = createCompoundComponent({
  defaultValue: null,
  displayName: 'Accordion',
});
```

---

## Code Quality Rules

### File Organization

```
src/
├── components/        # Shared UI components
├── features/          # Feature modules (globe, family-tree)
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
├── hooks/             # Shared hooks
├── lib/
│   ├── patterns/      # Design patterns library
│   └── utils/         # Utility functions
├── pages/             # Route pages
└── services/          # API services
```

### Naming Conventions

- **Components**: PascalCase (`GlobeCanvas.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAstroLines.ts`)
- **Services**: camelCase with `Service` suffix (`weatherService.ts`)
- **Utilities**: camelCase (`formatCoordinates.ts`)
- **Types**: PascalCase, interfaces for objects, types for unions

### TypeScript Rules

1. **Explicit types** for function parameters and return values
2. **Avoid `any`** - use `unknown` with type guards instead
3. **Use discriminated unions** for state that can be in multiple forms:
   ```typescript
   type AsyncState<T> =
     | { status: 'idle' }
     | { status: 'loading' }
     | { status: 'success'; data: T }
     | { status: 'error'; error: Error };
   ```

### React Rules

1. **Prefer function components** with hooks
2. **Use React.memo** for expensive components that receive stable props
3. **Use useMemo/useCallback** only when:
   - Passing to memoized child components
   - Inside dependency arrays
   - Expensive computations
4. **Lazy load** routes and heavy components
5. **Use Suspense** with error boundaries for async operations
6. **Avoid objects in useEffect deps** - extract primitives or use refs (see Zustand Store Rules)
7. **Use ref pattern** for callbacks needed in useEffect that shouldn't trigger re-runs

### Performance Rules

1. **Bundle critical CSS inline**, defer non-critical
2. **Preconnect** to required origins
3. **Lazy load** images below the fold
4. **Virtual list** for lists > 50 items
5. **Debounce** user input handlers (300ms default)
6. **Use Web Workers** for heavy computations (> 16ms)

### State Management

1. **URL state** for shareable/bookmarkable state (filters, pagination)
2. **Component state** for UI-only state (open/closed, hover)
3. **Context** for cross-cutting concerns (theme, auth, feature flags)
4. **External store** (Zustand) for complex shared state

### Zustand Store Rules (CRITICAL - Prevents Infinite Loops)

These rules prevent "Maximum update depth exceeded" errors caused by unstable references.

#### 1. Never use inline arrow functions in selectors

Even with `useShallow`, inline functions create new references every render:

```typescript
// BAD - Creates new function reference every render, causes infinite loop
export const useToolbarState = () =>
  useMyStore(useShallow((state) => ({
    value: state.value,
    doSomething: () => state.setValue(true),  // NEW function every render!
  })));

// GOOD - Reference stable store action
export const useToolbarState = () =>
  useMyStore(useShallow((state) => ({
    value: state.value,
    doSomething: state.doSomething,  // Same reference every render
  })));
```

#### 2. Define all actions in the store, not in selectors

```typescript
// In store definition - add dedicated actions
interface MyState {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  openModal: () => void;  // Add dedicated action
}

const useMyStore = create<MyState>()((set) => ({
  showModal: false,
  setShowModal: (show) => set({ showModal: show }),
  openModal: () => set({ showModal: true }),  // Stable reference
}));
```

#### 3. Never include hook-returned objects in useEffect dependencies

Objects from hooks are recreated every render:

```typescript
// BAD - compatibility is a new object every render
const compatibility = useCompatibilityMode();
useEffect(() => {
  compatibility.calculate();
}, [compatibility]);  // Infinite loop!

// GOOD - Use ref pattern for functions, extract primitives for deps
const compatibility = useCompatibilityMode();
const calculateRef = useRef(compatibility.calculate);
calculateRef.current = compatibility.calculate;

useEffect(() => {
  calculateRef.current();
}, [compatibility.isEnabled, compatibility.partnerId]);  // Primitives only
```

#### 4. Use useShallow for all selectors returning objects

```typescript
// BAD - New object every render
const { value, action } = useMyStore((state) => ({
  value: state.value,
  action: state.action,
}));

// GOOD - Shallow comparison prevents unnecessary re-renders
import { useShallow } from 'zustand/react/shallow';

const { value, action } = useMyStore(useShallow((state) => ({
  value: state.value,
  action: state.action,
})));
```

#### 5. For single primitive values, skip useShallow

```typescript
// Simple primitive - no useShallow needed
const isEnabled = useMyStore((state) => state.isEnabled);
const count = useMyStore((state) => state.count);
```

### Error Handling

1. **Error boundaries** around route-level components
2. **Try-catch** in async operations with typed errors
3. **User-friendly messages** in UI, detailed logs in console
4. **Graceful degradation** when features fail

---

## Globe-Specific Rules

### WebGL Context

```typescript
// Always use Singleton for WebGL-heavy instances
const getGlobeInstance = createSingleton(() => new Globe());

// Pool WebGL resources
const texturePool = createObjectPool(
  () => createTexture(),
  (texture) => texture.dispose(),
  { maxSize: 50 }
);
```

### Line Calculations

```typescript
// Use Flyweight for repeated line data
const lineFactory = createFlyweightFactory(
  (planet, lineType) => `${planet}-${lineType}`,
  (planet, lineType) => calculateLineGeometry(planet, lineType)
);
```

### Event Handling

```typescript
// Use Event Bus for globe interactions
globeEvents.emit('marker:click', { cityId, lat, lng });

// Subscribe in components
useEffect(() => {
  return globeEvents.on('marker:click', handleMarkerClick);
}, []);
```

---

## Testing Rules

1. **Unit tests** for utilities, hooks, and pure functions
2. **Integration tests** for user flows
3. **Snapshot tests** for stable UI components
4. **Test patterns** from `src/lib/patterns/` as examples

---

## Git Rules

1. **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
2. **Small, focused commits** - one logical change per commit
3. **PR descriptions** with context and testing steps
4. **No force push** to main/shared branches

---

## Import Order

```typescript
// 1. React
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { motion } from 'framer-motion';

// 3. Internal aliases (@/)
import { createSingleton } from '@/lib/patterns';
import { useAuth } from '@/hooks/useAuth';

// 4. Relative imports
import { ChartCanvas } from './ChartCanvas';
import type { ChartData } from './types';
```

---

## Monitoring & Debugging

```typescript
// Use monitoring utility for services
import { monitor } from '@/lib/monitoring';

const result = await monitor('fetchWeather', () =>
  weatherService.getWeather(lat, lng)
);
```
