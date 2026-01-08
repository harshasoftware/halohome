/**
 * Structural Design Patterns
 *
 * Patterns for composing objects and classes into larger structures
 * while keeping the structures flexible and efficient.
 */

// ============================================================================
// Proxy Pattern - Provides a surrogate for another object
// ============================================================================

/**
 * Creates a lazy-loading proxy that initializes the target only when accessed.
 *
 * @example
 * const heavyService = createLazyProxy(() => new HeavyService());
 * // HeavyService not created yet
 * heavyService.doSomething(); // Now it's created and method is called
 */
export function createLazyProxy<T extends object>(factory: () => T): T {
  let instance: T | null = null;

  const handler: ProxyHandler<object> = {
    get(_target, prop, receiver) {
      if (instance === null) {
        instance = factory();
      }
      const value = Reflect.get(instance, prop, receiver);
      return typeof value === 'function' ? value.bind(instance) : value;
    },

    set(_target, prop, value, receiver) {
      if (instance === null) {
        instance = factory();
      }
      return Reflect.set(instance, prop, value, receiver);
    },

    has(_target, prop) {
      if (instance === null) {
        instance = factory();
      }
      return Reflect.has(instance, prop);
    },
  };

  return new Proxy({} as T, handler);
}

/**
 * Creates a caching proxy that memoizes method results.
 *
 * @example
 * const api = createCachingProxy(apiClient, {
 *   ttl: 60000, // 1 minute
 *   methods: ['getUser', 'getProducts'],
 * });
 */
export function createCachingProxy<T extends object>(
  target: T,
  options: {
    ttl?: number;
    methods?: string[];
    keyGenerator?: (method: string, args: unknown[]) => string;
  } = {}
): T {
  const { ttl = 5 * 60 * 1000, methods, keyGenerator } = options;
  const cache = new Map<string, { value: unknown; expires: number }>();

  const generateKey = keyGenerator || ((method, args) => `${method}:${JSON.stringify(args)}`);

  const handler: ProxyHandler<T> = {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      const methodName = String(prop);
      if (methods && !methods.includes(methodName)) {
        return value.bind(obj);
      }

      return (...args: unknown[]) => {
        const key = generateKey(methodName, args);
        const cached = cache.get(key);

        if (cached && cached.expires > Date.now()) {
          return cached.value;
        }

        const result = value.apply(obj, args);

        // Handle promises
        if (result instanceof Promise) {
          return result.then((resolved) => {
            cache.set(key, { value: resolved, expires: Date.now() + ttl });
            return resolved;
          });
        }

        cache.set(key, { value: result, expires: Date.now() + ttl });
        return result;
      };
    },
  };

  return new Proxy(target, handler);
}

/**
 * Creates a validation proxy that validates property assignments.
 *
 * @example
 * const user = createValidationProxy(
 *   { name: '', age: 0 },
 *   {
 *     name: (v) => typeof v === 'string' && v.length > 0,
 *     age: (v) => typeof v === 'number' && v >= 0 && v <= 150,
 *   }
 * );
 */
export function createValidationProxy<T extends object>(
  target: T,
  validators: Partial<Record<keyof T, (value: unknown) => boolean>>
): T {
  const handler: ProxyHandler<T> = {
    set(obj, prop, value, receiver) {
      const validator = validators[prop as keyof T];
      if (validator && !validator(value)) {
        throw new Error(`Invalid value for property ${String(prop)}`);
      }
      return Reflect.set(obj, prop, value, receiver);
    },
  };

  return new Proxy(target, handler);
}

/**
 * Creates a logging proxy that logs all property access and method calls.
 *
 * @example
 * const debugService = createLoggingProxy(service, {
 *   name: 'UserService',
 *   logArgs: true,
 *   logResult: true,
 * });
 */
export function createLoggingProxy<T extends object>(
  target: T,
  options: {
    name?: string;
    logArgs?: boolean;
    logResult?: boolean;
    logger?: (message: string) => void;
  } = {}
): T {
  const { name = 'Proxy', logArgs = false, logResult = false, logger = console.log } = options;

  const handler: ProxyHandler<T> = {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);

      if (typeof value !== 'function') {
        logger(`[${name}] GET ${String(prop)}`);
        return value;
      }

      return (...args: unknown[]) => {
        const argsStr = logArgs ? ` with args: ${JSON.stringify(args)}` : '';
        logger(`[${name}] CALL ${String(prop)}${argsStr}`);

        const result = value.apply(obj, args);

        if (result instanceof Promise) {
          return result.then((resolved) => {
            if (logResult) {
              logger(`[${name}] RESULT ${String(prop)}: ${JSON.stringify(resolved)}`);
            }
            return resolved;
          });
        }

        if (logResult) {
          logger(`[${name}] RESULT ${String(prop)}: ${JSON.stringify(result)}`);
        }
        return result;
      };
    },

    set(obj, prop, value, receiver) {
      logger(`[${name}] SET ${String(prop)} = ${JSON.stringify(value)}`);
      return Reflect.set(obj, prop, value, receiver);
    },
  };

  return new Proxy(target, handler);
}

// ============================================================================
// Flyweight Pattern - Shares common state between objects
// ============================================================================

/**
 * Creates a flyweight factory for sharing intrinsic state.
 *
 * @example
 * const iconFactory = createFlyweightFactory<Icon, [string, number]>(
 *   (name, size) => `${name}-${size}`,
 *   (name, size) => new Icon(name, size)
 * );
 * const icon1 = iconFactory.get('home', 24);
 * const icon2 = iconFactory.get('home', 24);
 * console.log(icon1 === icon2); // true - same instance
 */
export function createFlyweightFactory<T, Args extends unknown[]>(
  keyGenerator: (...args: Args) => string,
  factory: (...args: Args) => T
) {
  const cache = new Map<string, T>();

  return {
    get(...args: Args): T {
      const key = keyGenerator(...args);
      let instance = cache.get(key);

      if (!instance) {
        instance = factory(...args);
        cache.set(key, instance);
      }

      return instance;
    },

    has(...args: Args): boolean {
      return cache.has(keyGenerator(...args));
    },

    clear(): void {
      cache.clear();
    },

    get size(): number {
      return cache.size;
    },

    keys(): string[] {
      return [...cache.keys()];
    },
  };
}

/**
 * Creates a flyweight pool with automatic cleanup.
 *
 * @example
 * const particlePool = createFlyweightPool<Particle>(
 *   (type) => new Particle(type),
 *   { maxSize: 100, cleanupInterval: 60000 }
 * );
 */
export function createFlyweightPool<T>(
  factory: (key: string) => T,
  options: { maxSize?: number; cleanupInterval?: number } = {}
) {
  const { maxSize = 1000, cleanupInterval = 60000 } = options;
  const pool = new Map<string, { instance: T; lastAccessed: number }>();

  // Periodic cleanup
  if (typeof window !== 'undefined' && cleanupInterval > 0) {
    setInterval(() => {
      const now = Date.now();
      const threshold = now - cleanupInterval;

      for (const [key, entry] of pool.entries()) {
        if (entry.lastAccessed < threshold) {
          pool.delete(key);
        }
      }
    }, cleanupInterval);
  }

  return {
    get(key: string): T {
      let entry = pool.get(key);

      if (!entry) {
        // Evict oldest if at capacity
        if (pool.size >= maxSize) {
          let oldestKey: string | null = null;
          let oldestTime = Infinity;

          for (const [k, v] of pool.entries()) {
            if (v.lastAccessed < oldestTime) {
              oldestTime = v.lastAccessed;
              oldestKey = k;
            }
          }

          if (oldestKey) {
            pool.delete(oldestKey);
          }
        }

        entry = { instance: factory(key), lastAccessed: Date.now() };
        pool.set(key, entry);
      } else {
        entry.lastAccessed = Date.now();
      }

      return entry.instance;
    },

    get size(): number {
      return pool.size;
    },

    clear(): void {
      pool.clear();
    },
  };
}

// ============================================================================
// Module Pattern - Encapsulates related functionality
// ============================================================================

/**
 * Creates a module with private state and public interface.
 *
 * @example
 * const counterModule = createModule((expose) => {
 *   let count = 0; // private
 *
 *   expose({
 *     increment: () => ++count,
 *     decrement: () => --count,
 *     getCount: () => count,
 *   });
 * });
 */
export function createModule<T extends object>(
  initializer: (expose: (api: T) => void) => void
): T {
  let publicApi: T | null = null;

  initializer((api) => {
    publicApi = api;
  });

  if (!publicApi) {
    throw new Error('Module must call expose() with its public API');
  }

  return Object.freeze(publicApi);
}

/**
 * Creates a namespace module for organizing related functionality.
 *
 * @example
 * const utils = createNamespace({
 *   string: {
 *     capitalize: (s: string) => s[0].toUpperCase() + s.slice(1),
 *     truncate: (s: string, len: number) => s.slice(0, len),
 *   },
 *   array: {
 *     shuffle: <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5),
 *   },
 * });
 * utils.string.capitalize('hello'); // 'Hello'
 */
export function createNamespace<T extends Record<string, Record<string, unknown>>>(
  modules: T
): Readonly<T> {
  const namespace = {} as T;

  for (const [key, value] of Object.entries(modules)) {
    namespace[key as keyof T] = Object.freeze(value) as T[keyof T];
  }

  return Object.freeze(namespace);
}

/**
 * Revealing module pattern - defines all functionality then reveals specific parts.
 *
 * @example
 * const calculator = revealingModule({
 *   // All methods (some may be private)
 *   _validate: (n: number) => !isNaN(n),
 *   add: (a: number, b: number) => a + b,
 *   subtract: (a: number, b: number) => a - b,
 * }, ['add', 'subtract']); // Only reveal these
 */
export function revealingModule<
  T extends Record<string, unknown>,
  K extends keyof T
>(
  implementation: T,
  reveal: K[]
): Pick<T, K> {
  const publicApi = {} as Pick<T, K>;

  for (const key of reveal) {
    const value = implementation[key];
    publicApi[key] = typeof value === 'function'
      ? (value as Function).bind(implementation)
      : value;
  }

  return Object.freeze(publicApi);
}

// ============================================================================
// Adapter Pattern - Converts one interface to another
// ============================================================================

/**
 * Creates an adapter that transforms one interface to another.
 *
 * @example
 * const legacyToModern = createAdapter<LegacyUser, ModernUser>({
 *   id: (legacy) => legacy.userId,
 *   name: (legacy) => `${legacy.firstName} ${legacy.lastName}`,
 *   email: (legacy) => legacy.emailAddress,
 * });
 * const modernUser = legacyToModern.adapt(legacyUser);
 */
export function createAdapter<TSource, TTarget>(
  mappings: { [K in keyof TTarget]: (source: TSource) => TTarget[K] }
) {
  return {
    adapt(source: TSource): TTarget {
      const result = {} as TTarget;

      for (const [key, mapper] of Object.entries(mappings) as [
        keyof TTarget,
        (source: TSource) => TTarget[keyof TTarget]
      ][]) {
        result[key] = mapper(source);
      }

      return result;
    },

    adaptMany(sources: TSource[]): TTarget[] {
      return sources.map((source) => this.adapt(source));
    },
  };
}

// ============================================================================
// Decorator Pattern - Adds behavior to objects dynamically
// ============================================================================

/**
 * Creates a decorator that wraps an object with additional behavior.
 *
 * @example
 * const withLogging = createDecorator<API>({
 *   before: (method, args) => console.log(`Calling ${method}`),
 *   after: (method, result) => console.log(`Result: ${result}`),
 * });
 * const loggedApi = withLogging(api);
 */
export function createDecorator<T extends object>(hooks: {
  before?: (method: string, args: unknown[]) => void;
  after?: (method: string, result: unknown) => void;
  onError?: (method: string, error: Error) => void;
}): (target: T) => T {
  return (target: T) => {
    const handler: ProxyHandler<T> = {
      get(obj, prop, receiver) {
        const value = Reflect.get(obj, prop, receiver);

        if (typeof value !== 'function') {
          return value;
        }

        return (...args: unknown[]) => {
          const methodName = String(prop);

          hooks.before?.(methodName, args);

          try {
            const result = value.apply(obj, args);

            if (result instanceof Promise) {
              return result
                .then((resolved) => {
                  hooks.after?.(methodName, resolved);
                  return resolved;
                })
                .catch((error) => {
                  hooks.onError?.(methodName, error);
                  throw error;
                });
            }

            hooks.after?.(methodName, result);
            return result;
          } catch (error) {
            hooks.onError?.(methodName, error as Error);
            throw error;
          }
        };
      },
    };

    return new Proxy(target, handler);
  };
}

/**
 * Composes multiple decorators into one.
 *
 * @example
 * const enhance = composeDecorators(withLogging, withCaching, withRetry);
 * const enhancedApi = enhance(api);
 */
export function composeDecorators<T extends object>(
  ...decorators: ((target: T) => T)[]
): (target: T) => T {
  return (target: T) => {
    return decorators.reduce((acc, decorator) => decorator(acc), target);
  };
}
