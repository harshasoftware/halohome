/**
 * Render Props Pattern
 *
 * Provides flexible, reusable components that share code via
 * render props (children as function or render prop).
 */

import React, {
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
  ComponentType,
} from 'react';
import { trackError, trackMetric } from '@/lib/monitoring';

// ============================================================================
// Types
// ============================================================================

export interface DataFetcherProps<T> {
  url?: string;
  fetcher?: () => Promise<T>;
  children: (state: {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => ReactNode;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  staleTime?: number;
}

export interface AsyncBoundaryProps<T> {
  promise: () => Promise<T>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  error?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  onResolve?: (data: T) => void;
  onReject?: (error: Error) => void;
}

// ============================================================================
// DataFetcher - Generic data fetching render prop
// ============================================================================

export function DataFetcher<T>({
  url,
  fetcher,
  children,
  onSuccess,
  onError,
  staleTime = 0,
}: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

  const fetch = useCallback(async () => {
    // Check cache
    if (staleTime > 0 && cacheRef.current) {
      if (Date.now() - cacheRef.current.timestamp < staleTime) {
        setData(cacheRef.current.data);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      let result: T;
      if (fetcher) {
        result = await fetcher();
      } else if (url) {
        const response = await window.fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        result = await response.json();
      } else {
        throw new Error('DataFetcher requires either url or fetcher prop');
      }

      setData(result);
      cacheRef.current = { data: result, timestamp: Date.now() };
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      trackError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [url, fetcher, staleTime, onSuccess, onError]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refetch = useCallback(() => {
    cacheRef.current = null;
    fetch();
  }, [fetch]);

  return <>{children({ data, isLoading, error, refetch })}</>;
}

// ============================================================================
// AsyncBoundary - Promise-based render prop with loading/error states
// ============================================================================

export function AsyncBoundary<T>({
  promise,
  children,
  loading,
  error: errorProp,
  onResolve,
  onReject,
}: AsyncBoundaryProps<T>) {
  const [state, setState] = useState<{
    status: 'pending' | 'resolved' | 'rejected';
    data: T | null;
    error: Error | null;
  }>({
    status: 'pending',
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null });

    try {
      const data = await promise();
      setState({ status: 'resolved', data, error: null });
      onResolve?.(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Promise rejected');
      setState({ status: 'rejected', data: null, error });
      onReject?.(error);
    }
  }, [promise, onResolve, onReject]);

  useEffect(() => {
    execute();
  }, [execute]);

  if (state.status === 'pending') {
    return (
      <>
        {loading ?? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        )}
      </>
    );
  }

  if (state.status === 'rejected' && state.error) {
    if (typeof errorProp === 'function') {
      return <>{errorProp(state.error, execute)}</>;
    }
    return (
      <>
        {errorProp ?? (
          <div className="p-4 text-red-400">
            Error: {state.error.message}
            <button
              className="ml-2 text-purple-400 hover:text-purple-300"
              onClick={execute}
            >
              Retry
            </button>
          </div>
        )}
      </>
    );
  }

  return <>{state.data !== null && children(state.data)}</>;
}

// ============================================================================
// MouseTracker - Tracks mouse position
// ============================================================================

interface MousePosition {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  elementX: number;
  elementY: number;
}

interface MouseTrackerProps {
  children: (position: MousePosition, isHovering: boolean) => ReactNode;
  throttle?: number;
}

export function MouseTracker({ children, throttle = 16 }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    elementX: 0,
    elementY: 0,
  });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdate = useRef(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now();
      if (now - lastUpdate.current < throttle) return;
      lastUpdate.current = now;

      const rect = containerRef.current?.getBoundingClientRect();
      setPosition({
        x: e.pageX,
        y: e.pageY,
        clientX: e.clientX,
        clientY: e.clientY,
        elementX: rect ? e.clientX - rect.left : 0,
        elementY: rect ? e.clientY - rect.top : 0,
      });
    },
    [throttle]
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ position: 'relative' }}
    >
      {children(position, isHovering)}
    </div>
  );
}

// ============================================================================
// IntersectionTracker - Tracks element visibility
// ============================================================================

interface IntersectionState {
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectReadOnly | null;
}

interface IntersectionTrackerProps {
  children: (state: IntersectionState, ref: React.RefObject<HTMLDivElement>) => ReactNode;
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  onChange?: (state: IntersectionState) => void;
}

export function IntersectionTracker({
  children,
  threshold = 0,
  rootMargin = '0px',
  triggerOnce = false,
  onChange,
}: IntersectionTrackerProps) {
  const [state, setState] = useState<IntersectionState>({
    isIntersecting: false,
    intersectionRatio: 0,
    boundingClientRect: null,
  });
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (triggerOnce && triggered.current) return;

        const newState: IntersectionState = {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          boundingClientRect: entry.boundingClientRect,
        };

        setState(newState);
        onChange?.(newState);

        if (entry.isIntersecting && triggerOnce) {
          triggered.current = true;
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, onChange]);

  return <>{children(state, ref)}</>;
}

// ============================================================================
// WindowSize - Tracks window dimensions
// ============================================================================

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

interface WindowSizeProps {
  children: (size: WindowSize) => ReactNode;
  debounce?: number;
}

export function WindowSize({ children, debounce = 100 }: WindowSizeProps) {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  }));

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setSize({
          width,
          height,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024,
        });
      }, debounce);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [debounce]);

  return <>{children(size)}</>;
}

// ============================================================================
// Toggle - Toggleable state render prop
// ============================================================================

interface ToggleState {
  isOn: boolean;
  toggle: () => void;
  setOn: () => void;
  setOff: () => void;
}

interface ToggleProps {
  children: (state: ToggleState) => ReactNode;
  defaultOn?: boolean;
  onChange?: (isOn: boolean) => void;
}

export function Toggle({ children, defaultOn = false, onChange }: ToggleProps) {
  const [isOn, setIsOn] = useState(defaultOn);

  const toggle = useCallback(() => {
    setIsOn((prev) => {
      const next = !prev;
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const setOn = useCallback(() => {
    setIsOn(true);
    onChange?.(true);
  }, [onChange]);

  const setOff = useCallback(() => {
    setIsOn(false);
    onChange?.(false);
  }, [onChange]);

  return <>{children({ isOn, toggle, setOn, setOff })}</>;
}

// ============================================================================
// Form - Form state render prop
// ============================================================================

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string | undefined) => void;
  reset: () => void;
}

interface FormProps<T extends object> {
  children: (state: FormState<T>) => ReactNode;
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function Form<T extends object>({
  children,
  initialValues,
  validate,
  onSubmit,
}: FormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValues((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (validate) {
        const newErrors = validate(values);
        setErrors(newErrors);
      }
    },
    [values, validate]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (validate) {
        const newErrors = validate(values);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return (
    <>
      {children({
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        handleSubmit,
        setFieldValue,
        setFieldError,
        reset,
      })}
    </>
  );
}
