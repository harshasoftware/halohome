/**
 * MobileBottomSheet - Base component for mobile bottom sheets
 *
 * Provides consistent styling and behavior for all mobile bottom sheets:
 * - Slide-in animation
 * - Drag handle with swipe gestures
 * - Header with close button
 * - Scrollable content area
 * - Native-like swipe gestures:
 *   - Swipe up to expand/maximize
 *   - Swipe down to minimize/close
 */

import React, { useRef, useState, useCallback } from 'react';

interface MobileBottomSheetProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Fixed height for the sheet (forces this height regardless of content) */
  height?: string;
  /** Maximum height the sheet can grow to (content-based) */
  maxHeight?: string;
  showBackdrop?: boolean;
  onBackdropClick?: () => void;
  /** Enable maximize toggle button */
  allowMaximize?: boolean;
  /** Current maximized state (controlled) */
  isMaximized?: boolean;
  /** Callback when maximize is toggled */
  onToggleMaximize?: () => void;
  /** Called when maximize state changes (for global state sync) */
  onMaximizeChange?: (maximized: boolean) => void;
}

// Gesture thresholds
const SWIPE_THRESHOLD = 50; // Minimum distance to trigger action
const VELOCITY_THRESHOLD = 0.5; // Minimum velocity (px/ms) for quick swipes

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  children,
  onClose,
  title,
  subtitle,
  icon,
  height,
  maxHeight = '70vh',
  showBackdrop = false,
  onBackdropClick,
  allowMaximize = false,
  isMaximized = false,
  onToggleMaximize,
  onMaximizeChange,
}) => {
  // Gesture state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleToggleMaximize = useCallback(() => {
    const newMaximized = !isMaximized;
    onToggleMaximize?.();
    onMaximizeChange?.(newMaximized);
  }, [isMaximized, onToggleMaximize, onMaximizeChange]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { y: touch.clientY, time: Date.now() };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only allow dragging in the direction that makes sense:
    // - When maximized: only allow dragging down (positive deltaY)
    // - When not maximized: allow both directions, but clamp up direction
    if (isMaximized) {
      // When maximized, only allow dragging down
      setDragOffset(Math.max(0, deltaY));
    } else {
      // When not maximized, allow both but limit upward drag
      // Clamp upward drag to a smaller value for visual feedback
      setDragOffset(deltaY > 0 ? deltaY : Math.max(-100, deltaY));
    }
  }, [isMaximized]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;

    const deltaY = dragOffset;
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(deltaY) / elapsed;

    // Determine action based on swipe direction, distance, and velocity
    const isQuickSwipe = velocity > VELOCITY_THRESHOLD;
    const isSignificantSwipe = Math.abs(deltaY) > SWIPE_THRESHOLD;

    if (deltaY > 0 && (isSignificantSwipe || isQuickSwipe)) {
      // Swipe down
      if (isMaximized && allowMaximize) {
        // Minimize (un-maximize)
        handleToggleMaximize();
      } else {
        // Close the sheet
        onClose();
      }
    } else if (deltaY < 0 && (isSignificantSwipe || isQuickSwipe)) {
      // Swipe up - maximize if allowed and not already maximized
      if (allowMaximize && !isMaximized) {
        handleToggleMaximize();
      }
    }

    // Reset gesture state
    setDragOffset(0);
    setIsDragging(false);
    touchStartRef.current = null;
  }, [dragOffset, isMaximized, allowMaximize, handleToggleMaximize, onClose]);

  // When maximized, use full viewport height with safe area
  const effectiveHeight = isMaximized ? '100dvh' : height;
  const effectiveMaxHeight = isMaximized ? '100dvh' : maxHeight;

  // Always show header controls when maximized (for close/minimize), even without title
  const showHeader = title || icon || isMaximized;

  const content = (
    <div
      ref={sheetRef}
      className={`w-full max-w-full box-border bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col border-t border-slate-200 dark:border-white/10 ${isDragging ? '' : 'animate-in slide-in-from-bottom duration-300'} ${isMaximized ? 'rounded-none' : 'rounded-t-3xl'}`}
      style={{
        height: effectiveHeight,
        maxHeight: effectiveMaxHeight,
        // Add safe area padding when maximized
        paddingTop: isMaximized ? 'env(safe-area-inset-top, 0px)' : undefined,
        // Apply drag offset transform
        transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Drag handle - interactive swipe zone */}
      <div
        className={`flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none ${isMaximized ? 'pt-4' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className={`w-12 h-1.5 rounded-full transition-colors ${isDragging ? 'bg-slate-400 dark:bg-white/40' : 'bg-slate-300 dark:bg-white/20'}`} />
      </div>

      {/* Header - always show when maximized for controls, also draggable */}
      {showHeader && (
        <div
          className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-white/10 flex-shrink-0 touch-none"
          style={{
            paddingTop: isMaximized ? '12px' : '0',
            paddingBottom: '12px',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="flex items-center gap-2">
            {icon}
            <div>
              {title && <h3 className="font-semibold text-base">{title}</h3>}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Maximize/Minimize button */}
            {allowMaximize && (
              <button
                onClick={handleToggleMaximize}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  handleToggleMaximize();
                }}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                aria-label={isMaximized ? 'Minimize' : 'Maximize'}
              >
                {isMaximized ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
            )}
            {/* Close button */}
            <button
              onClick={onClose}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );

  if (showBackdrop) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onBackdropClick?.() ?? onClose();
          }
        }}
      >
        <div className="w-full max-w-full">{content}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 w-full">
      {content}
    </div>
  );
};

export default MobileBottomSheet;
