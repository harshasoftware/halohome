/**
 * Database Provider
 *
 * Initializes SQLite WASM with OPFS persistence at app startup.
 * Provides database status and import progress to child components.
 *
 * Features:
 * - Async initialization on mount
 * - Progress reporting for city data import
 * - Status exposed via context
 * - Graceful fallback if initialization fails
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { initDatabase, getDatabaseStatus, type DatabaseStatus, type ImportProgress } from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

interface DatabaseContextValue {
  status: DatabaseStatus | null;
  isInitializing: boolean;
  isReady: boolean;
  error: string | null;
  importProgress: ImportProgress | null;
  reinitialize: () => Promise<void>;
}

interface DatabaseProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  // Initialize database
  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const dbStatus = await initDatabase((progress) => {
        setImportProgress(progress);
      });

      setStatus(dbStatus);
      console.log('[DatabaseProvider] Initialized:', dbStatus);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[DatabaseProvider] Initialization failed:', message);
      setError(message);

      // Still try to get status
      try {
        const fallbackStatus = await getDatabaseStatus();
        setStatus(fallbackStatus);
      } catch {
        // Ignore
      }
    } finally {
      setIsInitializing(false);
      setImportProgress(null);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const value: DatabaseContextValue = {
    status,
    isInitializing,
    isReady: status?.initialized === true && status?.citiesLoaded === true,
    error,
    importProgress,
    reinitialize: initialize,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);

  if (!context) {
    // Return a safe fallback if used outside provider
    return {
      status: null,
      isInitializing: false,
      isReady: false,
      error: 'DatabaseProvider not found',
      importProgress: null,
      reinitialize: async () => {},
    };
  }

  return context;
}

export default DatabaseProvider;
