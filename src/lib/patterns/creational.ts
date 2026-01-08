/**
 * Creational Design Patterns
 *
 * Patterns for object creation mechanisms that increase flexibility
 * and reuse of existing code.
 */

// ============================================================================
// Singleton Pattern - Ensures a class has only one instance
// ============================================================================

/**
 * Creates a singleton instance of a class or factory function.
 * Thread-safe and lazy-initialized.
 *
 * @example
 * const getAnalytics = createSingleton(() => new AnalyticsService());
 * const analytics1 = getAnalytics();
 * const analytics2 = getAnalytics();
 * console.log(analytics1 === analytics2); // true
 */
export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | null = null;
  let isInitializing = false;

  return () => {
    if (instance !== null) return instance;

    if (isInitializing) {
      throw new Error('Circular dependency detected in singleton initialization');
    }

    isInitializing = true;
    try {
      instance = factory();
    } finally {
      isInitializing = false;
    }

    return instance;
  };
}

/**
 * Decorator for creating singleton classes.
 * Use with TypeScript experimental decorators.
 *
 * @example
 * @singleton
 * class DatabaseConnection {
 *   constructor() { ... }
 * }
 */
export function singleton<T extends new (...args: any[]) => any>(constructor: T): T {
  let instance: InstanceType<T> | null = null;

  return class extends constructor {
    constructor(...args: any[]) {
      if (instance) return instance;
      super(...args);
      instance = this;
    }
  } as T;
}

/**
 * Async singleton for services that need async initialization.
 *
 * @example
 * const getDatabase = createAsyncSingleton(async () => {
 *   const db = new Database();
 *   await db.connect();
 *   return db;
 * });
 */
export function createAsyncSingleton<T>(factory: () => Promise<T>): () => Promise<T> {
  let instance: T | null = null;
  let pending: Promise<T> | null = null;

  return async () => {
    if (instance !== null) return instance;
    if (pending !== null) return pending;

    pending = factory().then((result) => {
      instance = result;
      pending = null;
      return result;
    });

    return pending;
  };
}

// ============================================================================
// Factory Pattern - Creates objects without specifying exact class
// ============================================================================

/**
 * Simple factory function type.
 */
export type Factory<T, P extends unknown[] = []> = (...args: P) => T;

/**
 * Creates a factory with registration capabilities.
 * Useful for plugin systems or dynamic object creation.
 *
 * @example
 * const chartFactory = createFactory<Chart>();
 * chartFactory.register('line', (data) => new LineChart(data));
 * chartFactory.register('bar', (data) => new BarChart(data));
 * const chart = chartFactory.create('line', myData);
 */
export function createFactory<T, P extends unknown[] = [unknown]>() {
  const creators = new Map<string, Factory<T, P>>();

  return {
    register(type: string, creator: Factory<T, P>) {
      creators.set(type, creator);
    },

    unregister(type: string) {
      creators.delete(type);
    },

    create(type: string, ...args: P): T {
      const creator = creators.get(type);
      if (!creator) {
        throw new Error(`Unknown type: ${type}. Available: ${[...creators.keys()].join(', ')}`);
      }
      return creator(...args);
    },

    has(type: string): boolean {
      return creators.has(type);
    },

    types(): string[] {
      return [...creators.keys()];
    },
  };
}

/**
 * Abstract factory for creating families of related objects.
 *
 * @example
 * const uiFactory = createAbstractFactory({
 *   light: { button: LightButton, input: LightInput },
 *   dark: { button: DarkButton, input: DarkInput },
 * });
 * const factory = uiFactory.getFactory('dark');
 * const button = factory.create('button', props);
 */
export function createAbstractFactory<
  TProducts extends Record<string, new (...args: any[]) => any>,
  TVariants extends Record<string, TProducts>
>(variants: TVariants) {
  return {
    getFactory<V extends keyof TVariants>(variant: V) {
      const products = variants[variant];
      if (!products) {
        throw new Error(`Unknown variant: ${String(variant)}`);
      }

      return {
        create<P extends keyof TProducts>(
          product: P,
          ...args: ConstructorParameters<TProducts[P]>
        ): InstanceType<TProducts[P]> {
          const ProductClass = products[product as keyof typeof products];
          if (!ProductClass) {
            throw new Error(`Unknown product: ${String(product)}`);
          }
          return new ProductClass(...args);
        },
      };
    },

    variants(): (keyof TVariants)[] {
      return Object.keys(variants) as (keyof TVariants)[];
    },
  };
}

// ============================================================================
// Prototype Pattern - Creates objects by cloning existing instances
// ============================================================================

/**
 * Makes an object cloneable with deep copy support.
 *
 * @example
 * const template = cloneable({ name: '', settings: { theme: 'dark' } });
 * const instance = template.clone();
 * instance.name = 'User1';
 */
export function cloneable<T extends object>(prototype: T): T & { clone(): T } {
  return {
    ...prototype,
    clone(): T {
      return deepClone(prototype);
    },
  };
}

/**
 * Deep clone utility with circular reference handling.
 */
export function deepClone<T>(obj: T, seen = new WeakMap()): T {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj as object)) {
    return seen.get(obj as object);
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const arrCopy: unknown[] = [];
    seen.set(obj, arrCopy);
    for (let i = 0; i < obj.length; i++) {
      arrCopy[i] = deepClone(obj[i], seen);
    }
    return arrCopy as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const mapCopy = new Map();
    seen.set(obj, mapCopy);
    obj.forEach((value, key) => {
      mapCopy.set(deepClone(key, seen), deepClone(value, seen));
    });
    return mapCopy as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const setCopy = new Set();
    seen.set(obj, setCopy);
    obj.forEach((value) => {
      setCopy.add(deepClone(value, seen));
    });
    return setCopy as T;
  }

  // Handle plain objects
  const objCopy = Object.create(Object.getPrototypeOf(obj));
  seen.set(obj as object, objCopy);

  for (const key of Reflect.ownKeys(obj as object)) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor) {
      if ('value' in descriptor) {
        descriptor.value = deepClone(descriptor.value, seen);
      }
      Object.defineProperty(objCopy, key, descriptor);
    }
  }

  return objCopy;
}

/**
 * Prototype registry for managing clonable prototypes.
 *
 * @example
 * const registry = createPrototypeRegistry<UserSettings>();
 * registry.register('default', { theme: 'light', notifications: true });
 * registry.register('power-user', { theme: 'dark', notifications: true, devMode: true });
 * const settings = registry.clone('power-user');
 */
export function createPrototypeRegistry<T extends object>() {
  const prototypes = new Map<string, T>();

  return {
    register(name: string, prototype: T) {
      prototypes.set(name, prototype);
    },

    unregister(name: string) {
      prototypes.delete(name);
    },

    clone(name: string): T {
      const prototype = prototypes.get(name);
      if (!prototype) {
        throw new Error(`Unknown prototype: ${name}`);
      }
      return deepClone(prototype);
    },

    has(name: string): boolean {
      return prototypes.has(name);
    },

    names(): string[] {
      return [...prototypes.keys()];
    },
  };
}

// ============================================================================
// Builder Pattern - Constructs complex objects step by step
// ============================================================================

/**
 * Creates a fluent builder for complex object construction.
 *
 * @example
 * const userBuilder = createBuilder<User>()
 *   .with('name', 'John')
 *   .with('email', 'john@example.com')
 *   .with('settings', { theme: 'dark' });
 * const user = userBuilder.build();
 */
export function createBuilder<T extends object>(initial: Partial<T> = {}) {
  let current: Partial<T> = { ...initial };

  const builder = {
    with<K extends keyof T>(key: K, value: T[K]) {
      current[key] = value;
      return builder;
    },

    merge(partial: Partial<T>) {
      current = { ...current, ...partial };
      return builder;
    },

    transform<K extends keyof T>(key: K, fn: (value: T[K] | undefined) => T[K]) {
      current[key] = fn(current[key]);
      return builder;
    },

    reset(newInitial: Partial<T> = {}) {
      current = { ...newInitial };
      return builder;
    },

    build(): T {
      return current as T;
    },

    buildWith(overrides: Partial<T>): T {
      return { ...current, ...overrides } as T;
    },
  };

  return builder;
}

/**
 * Director that uses a builder to construct objects in a specific way.
 *
 * @example
 * const director = createDirector(userBuilder, {
 *   admin: (b) => b.with('role', 'admin').with('permissions', ['all']),
 *   guest: (b) => b.with('role', 'guest').with('permissions', ['read']),
 * });
 * const admin = director.construct('admin');
 */
export function createDirector<T extends object, V extends string>(
  builderFactory: () => ReturnType<typeof createBuilder<T>>,
  recipes: Record<V, (builder: ReturnType<typeof createBuilder<T>>) => ReturnType<typeof createBuilder<T>>>
) {
  return {
    construct(variant: V): T {
      const recipe = recipes[variant];
      if (!recipe) {
        throw new Error(`Unknown variant: ${variant}`);
      }
      const builder = builderFactory();
      return recipe(builder).build();
    },

    variants(): V[] {
      return Object.keys(recipes) as V[];
    },
  };
}

// ============================================================================
// Object Pool Pattern - Reuses objects to avoid expensive creation
// ============================================================================

/**
 * Creates an object pool for expensive-to-create objects.
 *
 * @example
 * const connectionPool = createObjectPool(
 *   () => new DatabaseConnection(),
 *   (conn) => conn.reset(),
 *   10
 * );
 * const conn = connectionPool.acquire();
 * // ... use connection
 * connectionPool.release(conn);
 */
export function createObjectPool<T>(
  create: () => T,
  reset: (obj: T) => void,
  maxSize = 10
) {
  const available: T[] = [];
  const inUse = new Set<T>();

  return {
    acquire(): T {
      let obj: T;

      if (available.length > 0) {
        obj = available.pop()!;
      } else {
        obj = create();
      }

      inUse.add(obj);
      return obj;
    },

    release(obj: T): void {
      if (!inUse.has(obj)) {
        console.warn('Attempted to release object not from this pool');
        return;
      }

      inUse.delete(obj);
      reset(obj);

      if (available.length < maxSize) {
        available.push(obj);
      }
    },

    get size() {
      return available.length;
    },

    get activeCount() {
      return inUse.size;
    },

    clear(): void {
      available.length = 0;
      inUse.clear();
    },
  };
}
