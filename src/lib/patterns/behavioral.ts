/**
 * Behavioral Design Patterns
 *
 * Patterns for communication and assignment of responsibilities
 * between objects.
 */

// ============================================================================
// Observer Pattern - Pub/Sub for state changes
// ============================================================================

/**
 * Event type for observer pattern.
 */
export type Listener<T> = (data: T) => void;
export type Unsubscribe = () => void;

/**
 * Creates a simple observable/event emitter.
 *
 * @example
 * const userEvents = createObservable<{ type: 'login' | 'logout'; userId: string }>();
 * const unsub = userEvents.subscribe((event) => console.log(event));
 * userEvents.emit({ type: 'login', userId: '123' });
 * unsub(); // Cleanup
 */
export function createObservable<T>() {
  const listeners = new Set<Listener<T>>();

  return {
    subscribe(listener: Listener<T>): Unsubscribe {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    emit(data: T): void {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error('Observer error:', error);
        }
      });
    },

    once(listener: Listener<T>): Unsubscribe {
      const wrapper: Listener<T> = (data) => {
        listeners.delete(wrapper);
        listener(data);
      };
      listeners.add(wrapper);
      return () => listeners.delete(wrapper);
    },

    get subscriberCount(): number {
      return listeners.size;
    },

    clear(): void {
      listeners.clear();
    },
  };
}

/**
 * Creates a typed event bus with multiple event types.
 *
 * @example
 * type Events = {
 *   userLogin: { userId: string };
 *   userLogout: { userId: string };
 *   dataUpdate: { key: string; value: unknown };
 * };
 * const bus = createEventBus<Events>();
 * bus.on('userLogin', (data) => console.log(data.userId));
 * bus.emit('userLogin', { userId: '123' });
 */
export function createEventBus<TEvents extends Record<string, unknown>>() {
  const listeners = new Map<keyof TEvents, Set<Listener<any>>>();

  return {
    on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): Unsubscribe {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
      return () => listeners.get(event)?.delete(listener);
    },

    once<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): Unsubscribe {
      const wrapper = (data: TEvents[K]) => {
        listeners.get(event)?.delete(wrapper);
        listener(data);
      };
      return this.on(event, wrapper);
    },

    emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
      listeners.get(event)?.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Event bus error [${String(event)}]:`, error);
        }
      });
    },

    off<K extends keyof TEvents>(event: K, listener?: Listener<TEvents[K]>): void {
      if (listener) {
        listeners.get(event)?.delete(listener);
      } else {
        listeners.delete(event);
      }
    },

    clear(): void {
      listeners.clear();
    },
  };
}

/**
 * Creates a reactive state container with observers.
 *
 * @example
 * const state = createReactiveState({ count: 0, name: 'App' });
 * state.subscribe('count', (value) => console.log('Count:', value));
 * state.set('count', 5); // Logs: "Count: 5"
 */
export function createReactiveState<T extends Record<string, unknown>>(initial: T) {
  const state = { ...initial };
  const observers = new Map<keyof T, Set<Listener<unknown>>>();

  return {
    get<K extends keyof T>(key: K): T[K] {
      return state[key];
    },

    set<K extends keyof T>(key: K, value: T[K]): void {
      const oldValue = state[key];
      if (oldValue === value) return;

      state[key] = value;
      observers.get(key)?.forEach((listener) => listener(value));
    },

    subscribe<K extends keyof T>(key: K, listener: Listener<T[K]>): Unsubscribe {
      if (!observers.has(key)) {
        observers.set(key, new Set());
      }
      observers.get(key)!.add(listener as Listener<unknown>);
      return () => observers.get(key)?.delete(listener as Listener<unknown>);
    },

    getState(): Readonly<T> {
      return { ...state };
    },

    setState(partial: Partial<T>): void {
      for (const [key, value] of Object.entries(partial)) {
        this.set(key as keyof T, value as T[keyof T]);
      }
    },
  };
}

// ============================================================================
// Mediator/Middleware Pattern - Centralizes communication
// ============================================================================

/**
 * Middleware function type.
 */
export type Middleware<TContext, TResult = void> = (
  context: TContext,
  next: () => Promise<TResult>
) => Promise<TResult>;

/**
 * Creates a middleware pipeline.
 *
 * @example
 * const pipeline = createMiddlewarePipeline<{ request: Request; response?: Response }>();
 * pipeline.use(async (ctx, next) => {
 *   console.log('Before');
 *   await next();
 *   console.log('After');
 * });
 * pipeline.use(async (ctx, next) => {
 *   ctx.response = await fetch(ctx.request);
 * });
 * await pipeline.execute({ request: new Request('/api') });
 */
export function createMiddlewarePipeline<TContext, TResult = void>() {
  const middlewares: Middleware<TContext, TResult>[] = [];

  return {
    use(middleware: Middleware<TContext, TResult>): void {
      middlewares.push(middleware);
    },

    async execute(context: TContext): Promise<TResult> {
      let index = 0;

      const next = async (): Promise<TResult> => {
        if (index >= middlewares.length) {
          return undefined as TResult;
        }

        const middleware = middlewares[index++];
        return middleware(context, next);
      };

      return next();
    },

    clear(): void {
      middlewares.length = 0;
    },

    get length(): number {
      return middlewares.length;
    },
  };
}

/**
 * Creates a mediator for component communication.
 *
 * @example
 * const mediator = createMediator<{
 *   'cart:add': { productId: string; quantity: number };
 *   'cart:remove': { productId: string };
 *   'cart:updated': { total: number };
 * }>();
 *
 * // Cart component registers handler
 * mediator.register('cart:add', async (data) => {
 *   await addToCart(data.productId, data.quantity);
 *   mediator.send('cart:updated', { total: getCartTotal() });
 * });
 *
 * // Product component sends message
 * mediator.send('cart:add', { productId: '123', quantity: 1 });
 */
export function createMediator<TMessages extends Record<string, unknown>>() {
  const handlers = new Map<keyof TMessages, (data: any) => Promise<void> | void>();
  const observers = new Map<keyof TMessages, Set<(data: any) => void>>();

  return {
    register<K extends keyof TMessages>(
      message: K,
      handler: (data: TMessages[K]) => Promise<void> | void
    ): void {
      handlers.set(message, handler);
    },

    unregister(message: keyof TMessages): void {
      handlers.delete(message);
    },

    async send<K extends keyof TMessages>(message: K, data: TMessages[K]): Promise<void> {
      // Notify handler
      const handler = handlers.get(message);
      if (handler) {
        await handler(data);
      }

      // Notify observers
      observers.get(message)?.forEach((observer) => observer(data));
    },

    observe<K extends keyof TMessages>(
      message: K,
      observer: (data: TMessages[K]) => void
    ): Unsubscribe {
      if (!observers.has(message)) {
        observers.set(message, new Set());
      }
      observers.get(message)!.add(observer);
      return () => observers.get(message)?.delete(observer);
    },
  };
}

// ============================================================================
// Command Pattern - Encapsulates actions as objects
// ============================================================================

/**
 * Command interface.
 */
export interface Command<TResult = void> {
  execute(): TResult | Promise<TResult>;
  undo?(): void | Promise<void>;
  description?: string;
}

/**
 * Creates a command invoker with undo/redo support.
 *
 * @example
 * const invoker = createCommandInvoker();
 *
 * const addCommand = {
 *   execute: () => { state.items.push(item); },
 *   undo: () => { state.items.pop(); },
 * };
 *
 * await invoker.execute(addCommand);
 * invoker.undo(); // Removes the item
 * invoker.redo(); // Adds it back
 */
export function createCommandInvoker<TResult = void>(options: { maxHistory?: number } = {}) {
  const { maxHistory = 100 } = options;
  const history: Command<TResult>[] = [];
  let currentIndex = -1;

  return {
    async execute(command: Command<TResult>): Promise<TResult> {
      // Remove any redo history
      history.splice(currentIndex + 1);

      const result = await command.execute();

      if (command.undo) {
        history.push(command);
        currentIndex++;

        // Limit history size
        if (history.length > maxHistory) {
          history.shift();
          currentIndex--;
        }
      }

      return result;
    },

    async undo(): Promise<boolean> {
      if (currentIndex < 0) return false;

      const command = history[currentIndex];
      if (command.undo) {
        await command.undo();
        currentIndex--;
        return true;
      }

      return false;
    },

    async redo(): Promise<boolean> {
      if (currentIndex >= history.length - 1) return false;

      currentIndex++;
      const command = history[currentIndex];
      await command.execute();
      return true;
    },

    get canUndo(): boolean {
      return currentIndex >= 0;
    },

    get canRedo(): boolean {
      return currentIndex < history.length - 1;
    },

    getHistory(): { description?: string }[] {
      return history.slice(0, currentIndex + 1).map((cmd) => ({
        description: cmd.description,
      }));
    },

    clear(): void {
      history.length = 0;
      currentIndex = -1;
    },
  };
}

/**
 * Creates a macro command that groups multiple commands.
 *
 * @example
 * const macro = createMacroCommand([
 *   { execute: () => console.log('1') },
 *   { execute: () => console.log('2') },
 *   { execute: () => console.log('3') },
 * ]);
 * await macro.execute(); // Logs: 1, 2, 3
 */
export function createMacroCommand<TResult>(
  commands: Command<TResult>[],
  options: { parallel?: boolean; description?: string } = {}
): Command<TResult[]> {
  const { parallel = false, description } = options;

  return {
    description,

    async execute(): Promise<TResult[]> {
      if (parallel) {
        return Promise.all(commands.map((cmd) => cmd.execute()));
      }

      const results: TResult[] = [];
      for (const cmd of commands) {
        results.push(await cmd.execute());
      }
      return results;
    },

    async undo(): Promise<void> {
      // Undo in reverse order
      const undoCommands = [...commands].reverse().filter((cmd) => cmd.undo);

      if (parallel) {
        await Promise.all(undoCommands.map((cmd) => cmd.undo!()));
      } else {
        for (const cmd of undoCommands) {
          await cmd.undo!();
        }
      }
    },
  };
}

// ============================================================================
// Strategy Pattern - Defines a family of interchangeable algorithms
// ============================================================================

/**
 * Creates a strategy context for algorithm selection.
 *
 * @example
 * const sorter = createStrategyContext<number[], number[]>({
 *   bubble: (arr) => [...arr].sort((a, b) => a - b),
 *   quick: (arr) => quickSort([...arr]),
 *   merge: (arr) => mergeSort([...arr]),
 * });
 *
 * sorter.setStrategy('quick');
 * const sorted = sorter.execute([3, 1, 4, 1, 5]);
 */
export function createStrategyContext<TInput, TOutput>(
  strategies: Record<string, (input: TInput) => TOutput>
) {
  let currentStrategy: string = Object.keys(strategies)[0];

  return {
    setStrategy(name: string): void {
      if (!(name in strategies)) {
        throw new Error(`Unknown strategy: ${name}`);
      }
      currentStrategy = name;
    },

    execute(input: TInput): TOutput {
      return strategies[currentStrategy](input);
    },

    getStrategy(): string {
      return currentStrategy;
    },

    strategies(): string[] {
      return Object.keys(strategies);
    },
  };
}

// ============================================================================
// State Pattern - Changes behavior based on internal state
// ============================================================================

/**
 * Creates a state machine.
 *
 * @example
 * const trafficLight = createStateMachine({
 *   initial: 'red',
 *   states: {
 *     red: { on: { TIMER: 'green' } },
 *     green: { on: { TIMER: 'yellow' } },
 *     yellow: { on: { TIMER: 'red' } },
 *   },
 * });
 *
 * trafficLight.send('TIMER'); // green
 * trafficLight.send('TIMER'); // yellow
 */
export function createStateMachine<
  TState extends string,
  TEvent extends string
>(config: {
  initial: TState;
  states: Record<TState, {
    on?: Partial<Record<TEvent, TState>>;
    onEnter?: () => void;
    onExit?: () => void;
  }>;
}) {
  let currentState: TState = config.initial;
  const observers = new Set<(state: TState) => void>();

  // Call initial onEnter
  config.states[currentState].onEnter?.();

  return {
    get state(): TState {
      return currentState;
    },

    send(event: TEvent): TState {
      const stateConfig = config.states[currentState];
      const nextState = stateConfig.on?.[event];

      if (nextState && nextState !== currentState) {
        stateConfig.onExit?.();
        currentState = nextState;
        config.states[currentState].onEnter?.();
        observers.forEach((observer) => observer(currentState));
      }

      return currentState;
    },

    can(event: TEvent): boolean {
      return !!config.states[currentState].on?.[event];
    },

    subscribe(observer: (state: TState) => void): Unsubscribe {
      observers.add(observer);
      return () => observers.delete(observer);
    },

    reset(): void {
      if (currentState !== config.initial) {
        config.states[currentState].onExit?.();
        currentState = config.initial;
        config.states[currentState].onEnter?.();
        observers.forEach((observer) => observer(currentState));
      }
    },
  };
}

// ============================================================================
// Chain of Responsibility - Passes requests along a chain
// ============================================================================

/**
 * Handler function type.
 */
export type Handler<TRequest, TResponse = void> = (
  request: TRequest,
  next: () => TResponse | Promise<TResponse>
) => TResponse | Promise<TResponse>;

/**
 * Creates a chain of responsibility.
 *
 * @example
 * const authChain = createChainOfResponsibility<Request, boolean>();
 * authChain.addHandler((req, next) => {
 *   if (req.headers.get('Authorization')) return true;
 *   return next();
 * });
 * authChain.addHandler((req, next) => {
 *   if (req.cookies.get('session')) return true;
 *   return next();
 * });
 * authChain.setFallback(() => false);
 */
export function createChainOfResponsibility<TRequest, TResponse>() {
  const handlers: Handler<TRequest, TResponse>[] = [];
  let fallback: () => TResponse = () => undefined as TResponse;

  return {
    addHandler(handler: Handler<TRequest, TResponse>): void {
      handlers.push(handler);
    },

    setFallback(handler: () => TResponse): void {
      fallback = handler;
    },

    async handle(request: TRequest): Promise<TResponse> {
      let index = 0;

      const next = (): TResponse | Promise<TResponse> => {
        if (index >= handlers.length) {
          return fallback();
        }
        return handlers[index++](request, next);
      };

      return next();
    },
  };
}
