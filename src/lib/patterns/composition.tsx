/**
 * Composition Design Patterns
 *
 * Patterns for composing and mixing functionality in React applications.
 * Includes Mixin, Provider, and Static Import patterns.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
  ComponentType,
} from 'react';

// ============================================================================
// Mixin Pattern - Adds functionality to classes/objects
// ============================================================================

/**
 * Applies mixins to a target object or class.
 *
 * @example
 * const withTimestamp = {
 *   createdAt: Date.now(),
 *   updatedAt: Date.now(),
 *   touch() { this.updatedAt = Date.now(); }
 * };
 *
 * const withValidation = {
 *   validate() { return this.isValid; },
 *   isValid: true,
 * };
 *
 * const user = applyMixins({ name: 'John' }, withTimestamp, withValidation);
 */
export function applyMixins<T extends object>(
  target: T,
  ...mixins: object[]
): T & Record<string, unknown> {
  const result = { ...target };

  for (const mixin of mixins) {
    for (const key of Object.keys(mixin)) {
      const descriptor = Object.getOwnPropertyDescriptor(mixin, key);
      if (descriptor) {
        Object.defineProperty(result, key, descriptor);
      }
    }
  }

  return result as T & Record<string, unknown>;
}

/**
 * Creates a mixin factory for reusable behavior.
 *
 * @example
 * const createLoggingMixin = (prefix: string) => ({
 *   log(message: string) { console.log(`[${prefix}] ${message}`); },
 *   warn(message: string) { console.warn(`[${prefix}] ${message}`); },
 * });
 *
 * const service = applyMixins(baseService, createLoggingMixin('UserService'));
 */
export function createMixin<T extends object>(factory: () => T): () => T {
  return factory;
}

/**
 * React hook mixin pattern - combines multiple hooks.
 *
 * @example
 * const useEnhanced = createHookMixin(
 *   useAuth,
 *   useTheme,
 *   useAnalytics
 * );
 *
 * function Component() {
 *   const { user, theme, track } = useEnhanced();
 * }
 */
export function createHookMixin<
  T extends (() => object)[]
>(...hooks: T): () => UnionToIntersection<ReturnType<T[number]>> {
  return () => {
    const results = hooks.map(hook => hook());
    return Object.assign({}, ...results);
  };
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

// ============================================================================
// Provider Pattern - Provides global state/services via React Context
// ============================================================================

/**
 * Creates a typed provider with hook.
 *
 * @example
 * const [ThemeProvider, useTheme] = createProvider<ThemeState>({
 *   theme: 'dark',
 *   setTheme: () => {},
 * });
 *
 * // Usage
 * <ThemeProvider value={{ theme, setTheme }}>
 *   <App />
 * </ThemeProvider>
 *
 * // In component
 * const { theme, setTheme } = useTheme();
 */
export function createProvider<T>(defaultValue: T, displayName?: string) {
  const Context = createContext<T>(defaultValue);
  Context.displayName = displayName || 'Provider';

  const Provider = ({ children, value }: { children: ReactNode; value: T }) => (
    <Context.Provider value={value}>{children}</Context.Provider>
  );

  Provider.displayName = displayName || 'Provider';

  const useContextHook = () => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(`use${displayName || 'Context'} must be used within a ${displayName || 'Provider'}`);
    }
    return context;
  };

  return [Provider, useContextHook, Context] as const;
}

/**
 * Creates a state provider with built-in state management.
 *
 * @example
 * const [CartProvider, useCart] = createStateProvider({
 *   items: [],
 *   total: 0,
 * });
 *
 * // Automatically includes state and setState
 * const { state, setState } = useCart();
 */
export function createStateProvider<T extends object>(initialState: T, displayName?: string) {
  type ContextValue = {
    state: T;
    setState: React.Dispatch<React.SetStateAction<T>>;
    resetState: () => void;
  };

  const Context = createContext<ContextValue | null>(null);
  Context.displayName = displayName || 'StateProvider';

  const Provider = ({ children, initial }: { children: ReactNode; initial?: Partial<T> }) => {
    const [state, setState] = useState<T>({ ...initialState, ...initial });

    const resetState = useCallback(() => {
      setState(initialState);
    }, []);

    const value = useMemo(() => ({
      state,
      setState,
      resetState,
    }), [state, resetState]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  Provider.displayName = displayName || 'StateProvider';

  const useContextHook = () => {
    const context = useContext(Context);
    if (context === null) {
      throw new Error(`use${displayName || 'State'} must be used within a ${displayName || 'StateProvider'}`);
    }
    return context;
  };

  return [Provider, useContextHook] as const;
}

/**
 * Composes multiple providers into one.
 *
 * @example
 * const AppProviders = composeProviders([
 *   [ThemeProvider, { value: themeValue }],
 *   [AuthProvider, { value: authValue }],
 *   [CartProvider, {}],
 * ]);
 *
 * <AppProviders>
 *   <App />
 * </AppProviders>
 */
export function composeProviders(
  providers: Array<[ComponentType<any>, Record<string, unknown>]>
): ComponentType<{ children: ReactNode }> {
  return function ComposedProviders({ children }: { children: ReactNode }) {
    return providers.reduceRight(
      (acc, [Provider, props]) => <Provider {...props}>{acc}</Provider>,
      children
    ) as React.ReactElement;
  };
}

// ============================================================================
// Module/Service Provider Pattern
// ============================================================================

/**
 * Creates a service provider for dependency injection.
 *
 * @example
 * const [ServiceProvider, useService] = createServiceProvider(() => ({
 *   api: new ApiClient(),
 *   analytics: new AnalyticsService(),
 *   cache: new CacheService(),
 * }));
 *
 * const { api, analytics } = useService();
 */
export function createServiceProvider<T extends object>(
  factory: () => T,
  displayName?: string
) {
  const Context = createContext<T | null>(null);
  Context.displayName = displayName || 'ServiceProvider';

  const Provider = ({ children }: { children: ReactNode }) => {
    const services = useMemo(() => factory(), []);

    // Cleanup services on unmount if they have destroy/dispose methods
    useEffect(() => {
      return () => {
        for (const service of Object.values(services)) {
          if (service && typeof service === 'object') {
            const s = service as { destroy?: () => void; dispose?: () => void };
            s.destroy?.();
            s.dispose?.();
          }
        }
      };
    }, [services]);

    return <Context.Provider value={services}>{children}</Context.Provider>;
  };

  Provider.displayName = displayName || 'ServiceProvider';

  const useContextHook = () => {
    const context = useContext(Context);
    if (context === null) {
      throw new Error(`use${displayName || 'Service'} must be used within a ${displayName || 'ServiceProvider'}`);
    }
    return context;
  };

  return [Provider, useContextHook] as const;
}

// ============================================================================
// Feature Flag Provider Pattern
// ============================================================================

type FeatureFlags = Record<string, boolean>;

/**
 * Creates a feature flag provider.
 *
 * @example
 * const [FeatureProvider, useFeature] = createFeatureFlagProvider({
 *   newDashboard: false,
 *   betaFeatures: true,
 * });
 *
 * // In component
 * const { isEnabled, enable, disable } = useFeature();
 * if (isEnabled('newDashboard')) { ... }
 */
export function createFeatureFlagProvider(defaultFlags: FeatureFlags) {
  type ContextValue = {
    flags: FeatureFlags;
    isEnabled: (flag: string) => boolean;
    enable: (flag: string) => void;
    disable: (flag: string) => void;
    toggle: (flag: string) => void;
    setFlags: (flags: Partial<FeatureFlags>) => void;
  };

  const Context = createContext<ContextValue | null>(null);
  Context.displayName = 'FeatureFlagProvider';

  const Provider = ({ children, initial }: { children: ReactNode; initial?: FeatureFlags }) => {
    const [flags, setFlagsState] = useState<FeatureFlags>({ ...defaultFlags, ...initial });

    const isEnabled = useCallback((flag: string) => !!flags[flag], [flags]);

    const enable = useCallback((flag: string) => {
      setFlagsState(prev => ({ ...prev, [flag]: true }));
    }, []);

    const disable = useCallback((flag: string) => {
      setFlagsState(prev => ({ ...prev, [flag]: false }));
    }, []);

    const toggle = useCallback((flag: string) => {
      setFlagsState(prev => ({ ...prev, [flag]: !prev[flag] }));
    }, []);

    const setFlags = useCallback((newFlags: Partial<FeatureFlags>) => {
      setFlagsState(prev => ({ ...prev, ...newFlags }));
    }, []);

    const value = useMemo(() => ({
      flags,
      isEnabled,
      enable,
      disable,
      toggle,
      setFlags,
    }), [flags, isEnabled, enable, disable, toggle, setFlags]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useContextHook = () => {
    const context = useContext(Context);
    if (context === null) {
      throw new Error('useFeature must be used within a FeatureFlagProvider');
    }
    return context;
  };

  // HOC for feature-gated components
  const withFeature = (flag: string, fallback: ReactNode = null) => {
    return <P extends object>(Component: ComponentType<P>) => {
      const FeatureGated = (props: P) => {
        const { isEnabled } = useContextHook();
        if (!isEnabled(flag)) return <>{fallback}</>;
        return <Component {...props} />;
      };
      FeatureGated.displayName = `withFeature(${Component.displayName || Component.name})`;
      return FeatureGated;
    };
  };

  return [Provider, useContextHook, withFeature] as const;
}

// ============================================================================
// Static Import Pattern Helpers
// ============================================================================

/**
 * Creates a static module with eager loading.
 * Use for critical path dependencies.
 *
 * @example
 * // utils.ts
 * export const utils = createStaticModule({
 *   formatDate: (date: Date) => date.toISOString(),
 *   parseQuery: (str: string) => new URLSearchParams(str),
 * });
 *
 * // component.tsx
 * import { utils } from './utils';
 * const formatted = utils.formatDate(new Date());
 */
export function createStaticModule<T extends Record<string, unknown>>(
  exports: T
): Readonly<T> {
  return Object.freeze(exports);
}

/**
 * Creates an index file pattern for barrel exports.
 *
 * @example
 * // In your index.ts
 * export const components = createBarrelExport({
 *   Button: () => import('./Button'),
 *   Input: () => import('./Input'),
 *   Modal: () => import('./Modal'),
 * });
 */
export function createBarrelExport<T extends Record<string, () => Promise<{ default: unknown }>>>(
  imports: T
): { [K in keyof T]: () => Promise<Awaited<ReturnType<T[K]>>['default']> } {
  const result = {} as { [K in keyof T]: () => Promise<Awaited<ReturnType<T[K]>>['default']> };

  for (const [key, importFn] of Object.entries(imports)) {
    result[key as keyof T] = async () => {
      const module = await importFn();
      return module.default;
    };
  }

  return result;
}
