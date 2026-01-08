import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveNoteParams<T> {
  /** The initial value for the note */
  initialValue: T;
  /** Function to call when saving. Should return a Promise. */
  saveFn: (value: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 1500ms) */
  delay?: number;
}

interface UseAutoSaveNoteReturn<T> {
  /** Current local value */
  value: T;
  /** Update the local value (triggers debounced save) */
  setValue: (value: T) => void;
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Whether there are unsaved changes pending */
  hasUnsavedChanges: boolean;
  /** Last save error, if any */
  error: Error | null;
}

/**
 * Hook for auto-saving a single value with debounce.
 * Useful for inline editing fields like notes.
 *
 * @param params - Configuration parameters
 * @returns Object with value, setValue, and status indicators
 */
export function useAutoSaveNote<T = string>({
  initialValue,
  saveFn,
  delay = 1500,
}: UseAutoSaveNoteParams<T>): UseAutoSaveNoteReturn<T> {
  const [value, setValueInternal] = useState<T>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef<T>(initialValue);
  const isMountedRef = useRef(true);

  // Update value when initialValue changes (e.g., from external source)
  useEffect(() => {
    setValueInternal(initialValue);
    lastSavedValueRef.current = initialValue;
    setHasUnsavedChanges(false);
  }, [initialValue]);

  // Track mounted state for safe async updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const performSave = useCallback(async (valueToSave: T) => {
    // Skip if value hasn't changed from last saved
    if (valueToSave === lastSavedValueRef.current) {
      if (isMountedRef.current) {
        setHasUnsavedChanges(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsSaving(true);
      setError(null);
    }

    try {
      await saveFn(valueToSave);
      if (isMountedRef.current) {
        lastSavedValueRef.current = valueToSave;
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to save'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [saveFn]);

  const setValue = useCallback((newValue: T) => {
    setValueInternal(newValue);
    setHasUnsavedChanges(newValue !== lastSavedValueRef.current);
    setError(null);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set up new debounced save
    saveTimeoutRef.current = setTimeout(() => {
      performSave(newValue);
    }, delay);
  }, [delay, performSave]);

  return {
    value,
    setValue,
    isSaving,
    hasUnsavedChanges,
    error,
  };
}
