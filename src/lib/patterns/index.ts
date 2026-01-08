/**
 * Design Patterns Library
 *
 * A comprehensive collection of design patterns for building maintainable,
 * performant React/TypeScript applications.
 *
 * Categories:
 * - Creational: Singleton, Factory, Prototype, Builder, Object Pool
 * - Structural: Proxy, Flyweight, Module, Adapter, Decorator
 * - Behavioral: Observer, Mediator, Command, Strategy, State, Chain of Responsibility
 * - Composition: Mixin, Provider, Feature Flags, Static Import
 * - Performance: Dynamic Import, PRPL, Preload/Prefetch, Compression
 * - Rendering: Islands Architecture, View Transitions, Virtualization
 * - React: HOC, Compound, Container/Presentational, Render Props, Progressive Loading
 */

// ============================================================================
// Creational Patterns
// ============================================================================
export {
  createSingleton,
  createAsyncSingleton,
  createFactory,
  createAbstractFactory,
  cloneable,
  deepClone,
  createPrototypeRegistry,
  createBuilder,
  createDirector,
  createObjectPool,
} from './creational';

// ============================================================================
// Structural Patterns
// ============================================================================
export {
  createLazyProxy,
  createCachingProxy,
  createValidationProxy,
  createLoggingProxy,
  createFlyweightFactory,
  createFlyweightPool,
  createModule,
  createNamespace,
  revealingModule,
  createAdapter,
  createDecorator,
  composeDecorators,
} from './structural';

// ============================================================================
// Behavioral Patterns
// ============================================================================
export {
  createObservable,
  createEventBus,
  createReactiveState,
  createMiddlewarePipeline,
  createMediator,
  createCommandInvoker,
  createMacroCommand,
  createStrategyContext,
  createStateMachine,
  createChainOfResponsibility,
  type Listener,
  type Unsubscribe,
  type Middleware,
  type Command,
  type Handler,
} from './behavioral';

// ============================================================================
// Composition Patterns (React)
// ============================================================================
export {
  applyMixins,
  createMixin,
  createHookMixin,
  createProvider,
  createStateProvider,
  composeProviders,
  createServiceProvider,
  createFeatureFlagProvider,
  createStaticModule,
  createBarrelExport,
} from './composition';

// ============================================================================
// Performance Patterns
// ============================================================================
export {
  createDynamicImport,
  importWithRetry,
  importOnVisibility,
  importOnInteraction,
  createChunkedImports,
  createPRPL,
  preloadResource,
  prefetchResource,
  preconnect,
  createResourceHints,
  createThirdPartyLoader,
  compressData,
  decompressData,
  createEfficientStore,
} from './performance';

// ============================================================================
// Rendering Patterns (React)
// ============================================================================
export {
  Island,
  createIsland,
  supportsViewTransitions,
  viewTransition,
  useViewTransition,
  ViewTransitionName,
  VirtualList,
  InfiniteVirtualList,
  useDeferredState,
  useBatchedUpdates,
  ContentSkeleton,
  createSkeletonComponent,
  ContentVisibility,
} from './rendering';

// ============================================================================
// HOC Patterns (React)
// ============================================================================
export {
  withMonitoring,
  withErrorBoundary,
  withAuth,
  withLazyLoad,
  withMemo,
  compose,
} from './hoc';

// ============================================================================
// Compound Pattern (React)
// ============================================================================
export {
  createCompoundComponent,
  type CompoundComponentContext,
} from './compound';

// ============================================================================
// Container/Presentational Pattern (React)
// ============================================================================
export {
  createContainer,
  type ContainerProps,
  type PresentationalProps,
} from './container';

// ============================================================================
// Render Props Pattern (React)
// ============================================================================
export {
  DataFetcher,
  AsyncBoundary,
  MouseTracker,
  IntersectionTracker,
  Form,
  Toggle,
  WindowSize,
  type DataFetcherProps,
  type AsyncBoundaryProps,
} from './render-props';

// ============================================================================
// Progressive Loading Patterns (React)
// ============================================================================
export {
  ProgressiveLoader,
  SelectiveHydration,
  DeferredRender,
  PriorityQueue,
  ChunkedRender,
  VirtualizedList as ChunkedVirtualList,
  createLazyComponent,
  Skeleton,
  SkeletonGroup,
  type LoadingPriority,
} from './progressive';
