/**
 * useBirthDataFlow - Hook for birth data creation flow
 *
 * Manages the flow of creating birth data from globe interactions:
 * - Double-tap on globe shows pending marker then quick birth modal
 * - City search selection shows birth date/time modal
 * - Handles pending birth location state
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { useScoutStore } from '@/stores/scoutStore';

interface BirthDataPayload {
  lat: number;
  lng: number;
  date: string;
  time: string;
  cityName?: string;
}

interface UseBirthDataFlowOptions {
  onBirthDataCreate?: (data: BirthDataPayload) => void;
  onClearBirthData?: () => void;
  onPendingBirthChange?: (hasPending: boolean, clearFn: () => void) => void;
  pendingMarkerDelay?: number;
}

interface UseBirthDataFlowReturn {
  // State
  pendingBirthCoords: { lat: number; lng: number } | null;
  showQuickBirthModal: boolean;
  showBirthDateTimeModal: boolean;
  pendingBirthplace: { lat: number; lng: number; cityName: string } | null;
  // Initial city for QuickBirthDataModal (used when city search or landing page flow)
  initialCityForQuickModal: { lat: number; lng: number; name: string } | null;

  // Actions
  handleGlobeDoubleTap: (lat: number, lng: number) => void;
  handleCitySearchSelect: (lat: number, lng: number, cityName: string) => void;
  handleQuickBirthConfirm: (data: BirthDataPayload) => void;
  handleBirthDateTimeConfirm: (data: BirthDataPayload) => void;
  handleCancelQuickBirth: () => void;
  handleCancelBirthDateTime: () => void;
  clearPendingBirthLocation: () => void;
  clearBirthDataWithCleanup: () => void;
}

export function useBirthDataFlow({
  onBirthDataCreate,
  onClearBirthData,
  onPendingBirthChange,
  pendingMarkerDelay = 1500,
}: UseBirthDataFlowOptions): UseBirthDataFlowReturn {
  const pendingBirthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for initial city when using city search flow (opens QuickBirthDataModal with pre-filled city)
  const [initialCityForQuickModal, setInitialCityForQuickModal] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  // Get state from store
  const pendingBirthCoords = useGlobeInteractionStore((s) => s.pendingBirthCoords);
  const showQuickBirthModal = useGlobeInteractionStore((s) => s.showQuickBirthModal);
  const showBirthDateTimeModal = useGlobeInteractionStore((s) => s.showBirthDateTimeModal);
  const pendingBirthplace = useGlobeInteractionStore((s) => s.pendingBirthplace);

  // Get actions from store
  const setPendingBirthCoords = useGlobeInteractionStore((s) => s.setPendingBirthCoords);
  const setShowQuickBirthModal = useGlobeInteractionStore((s) => s.setShowQuickBirthModal);
  const setShowBirthDateTimeModal = useGlobeInteractionStore((s) => s.setShowBirthDateTimeModal);
  const setPendingBirthplace = useGlobeInteractionStore((s) => s.setPendingBirthplace);
  const storeClearPendingBirthLocation = useGlobeInteractionStore((s) => s.clearPendingBirthLocation);

  // Actions for full cleanup when clearing birth data
  const closeAllPanels = useGlobeInteractionStore((s) => s.closeAllPanels);
  const clearAllSelections = useGlobeInteractionStore((s) => s.clearAllSelections);
  const clearZone = useGlobeInteractionStore((s) => s.clearZone);
  const setHighlightedLine = useGlobeInteractionStore((s) => s.setHighlightedLine);
  const setHighlightedScoutCity = useGlobeInteractionStore((s) => s.setHighlightedScoutCity);
  const setMobileScoutSheetOpen = useGlobeInteractionStore((s) => s.setMobileScoutSheetOpen);
  const setMobileChartsSheetOpen = useGlobeInteractionStore((s) => s.setMobileChartsSheetOpen);
  const setMobileFavoritesSheetOpen = useGlobeInteractionStore((s) => s.setMobileFavoritesSheetOpen);
  const setMobileDrawerOpen = useGlobeInteractionStore((s) => s.setMobileDrawerOpen);

  // Scout store actions - to clear markers when birth data is cleared
  const clearScoutResults = useScoutStore((s) => s.clearResults);

  // Clear pending birth location and cancel any pending timeout
  const clearPendingBirthLocation = useCallback(() => {
    if (pendingBirthTimeoutRef.current) {
      clearTimeout(pendingBirthTimeoutRef.current);
      pendingBirthTimeoutRef.current = null;
    }
    storeClearPendingBirthLocation();
  }, [storeClearPendingBirthLocation]);

  // Notify parent when pending birth location state changes
  useEffect(() => {
    onPendingBirthChange?.(!!pendingBirthCoords, clearPendingBirthLocation);
  }, [pendingBirthCoords, onPendingBirthChange, clearPendingBirthLocation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingBirthTimeoutRef.current) {
        clearTimeout(pendingBirthTimeoutRef.current);
      }
    };
  }, []);

  // Handle double-tap on globe (when no birth data exists)
  const handleGlobeDoubleTap = useCallback(
    (lat: number, lng: number) => {
      // Clear any existing timeout
      if (pendingBirthTimeoutRef.current) {
        clearTimeout(pendingBirthTimeoutRef.current);
      }

      // First show the marker at the tapped location
      setPendingBirthCoords({ lat, lng });

      // After delay, show the modal
      pendingBirthTimeoutRef.current = setTimeout(() => {
        setShowQuickBirthModal(true);
      }, pendingMarkerDelay);
    },
    [setPendingBirthCoords, setShowQuickBirthModal, pendingMarkerDelay]
  );

  // Handle city selection from search bar or landing page (when no birth data exists)
  // Uses QuickBirthDataModal for unified stepper experience
  const handleCitySearchSelect = useCallback(
    (lat: number, lng: number, cityName: string) => {
      // Set the initial city for QuickBirthDataModal
      setInitialCityForQuickModal({ lat, lng, name: cityName });
      // Set pending coords for the modal (used as fallback if initialCity is somehow missing)
      setPendingBirthCoords({ lat, lng });
      // Open the QuickBirthDataModal (same stepper as globe double-tap flow)
      setShowQuickBirthModal(true);
    },
    [setPendingBirthCoords, setShowQuickBirthModal]
  );

  // Handle confirmation from quick birth modal
  const handleQuickBirthConfirm = useCallback(
    (data: BirthDataPayload) => {
      onBirthDataCreate?.(data);
      setPendingBirthCoords(null);
      setShowQuickBirthModal(false);
      // Clear initial city (used when coming from city search or landing page)
      setInitialCityForQuickModal(null);
    },
    [onBirthDataCreate, setPendingBirthCoords, setShowQuickBirthModal]
  );

  // Handle confirmation from birth date/time modal
  const handleBirthDateTimeConfirm = useCallback(
    (data: BirthDataPayload) => {
      onBirthDataCreate?.(data);
      setPendingBirthplace(null);
      setShowBirthDateTimeModal(false);
    },
    [onBirthDataCreate, setPendingBirthplace, setShowBirthDateTimeModal]
  );

  // Handle canceling quick birth modal
  const handleCancelQuickBirth = useCallback(() => {
    setShowQuickBirthModal(false);
    // Clear initial city (for city search/landing page flow)
    setInitialCityForQuickModal(null);
    // Don't clear coordinates immediately - they may want to try again
  }, [setShowQuickBirthModal]);

  // Handle canceling birth date/time modal
  const handleCancelBirthDateTime = useCallback(() => {
    setShowBirthDateTimeModal(false);
    setPendingBirthplace(null);
  }, [setShowBirthDateTimeModal, setPendingBirthplace]);

  // Clear birth data with full cleanup - resets to initial state
  const clearBirthDataWithCleanup = useCallback(() => {
    // Clear pending state
    clearPendingBirthLocation();

    // Close modals
    setShowQuickBirthModal(false);
    setShowBirthDateTimeModal(false);
    setPendingBirthplace(null);

    // Close all panels (scout panel, line info, etc.)
    closeAllPanels();

    // Clear all selections (lines, cities, locations)
    clearAllSelections();

    // Clear zone drawing
    clearZone();

    // Clear highlighted items
    setHighlightedLine(null);
    setHighlightedScoutCity(null);

    // Clear scout results (removes markers from globe)
    clearScoutResults();

    // Close mobile sheets
    setMobileScoutSheetOpen(false);
    setMobileChartsSheetOpen(false);
    setMobileFavoritesSheetOpen(false);
    setMobileDrawerOpen(false);

    // Call parent's clear function (clears astro store birth data and results)
    onClearBirthData?.();
  }, [
    clearPendingBirthLocation,
    setShowQuickBirthModal,
    setShowBirthDateTimeModal,
    setPendingBirthplace,
    closeAllPanels,
    clearAllSelections,
    clearZone,
    setHighlightedLine,
    setHighlightedScoutCity,
    clearScoutResults,
    setMobileScoutSheetOpen,
    setMobileChartsSheetOpen,
    setMobileFavoritesSheetOpen,
    setMobileDrawerOpen,
    onClearBirthData,
  ]);

  return {
    // State
    pendingBirthCoords,
    showQuickBirthModal,
    showBirthDateTimeModal,
    pendingBirthplace,
    initialCityForQuickModal,

    // Actions
    handleGlobeDoubleTap,
    handleCitySearchSelect,
    handleQuickBirthConfirm,
    handleBirthDateTimeConfirm,
    handleCancelQuickBirth,
    handleCancelBirthDateTime,
    clearPendingBirthLocation,
    clearBirthDataWithCleanup,
  };
}

export default useBirthDataFlow;
