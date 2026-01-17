/**
 * RightPanelStack Component
 * Unified right panel with stack-based navigation for all desktop side panels
 *
 * Uses globeInteractionStore for state management.
 * The usePanelStack hook is now provided by the store.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Re-export types from store for backwards compatibility
export type { PanelType, PanelItem } from '@/stores/globeInteractionStore';
import type { PanelType, PanelItem } from '@/stores/globeInteractionStore';

interface RightPanelStackProps {
  // Stack management
  stack: PanelItem[];
  currentIndex: number;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onClose: () => void;
  onCloseAll: () => void;
  onSetCurrentIndex?: (index: number) => void;

  // Content renderers for each panel type
  renderLine?: (data: unknown) => React.ReactNode;
  renderAnalysis?: (data: unknown) => React.ReactNode;
  renderCity?: (data: unknown) => React.ReactNode;
  renderPerson?: (data: unknown) => React.ReactNode;
  renderChat?: (data: unknown) => React.ReactNode;
  renderCompatibility?: (data: unknown) => React.ReactNode;
  renderRelocation?: (data: unknown) => React.ReactNode;
  renderFavorites?: (data: unknown) => React.ReactNode;
  renderScout?: (data: unknown) => React.ReactNode;
  renderCharts?: (data: unknown) => React.ReactNode;
  renderVastu?: (data: unknown) => React.ReactNode;

  // Optional footer (sticky at bottom)
  footer?: React.ReactNode;
}

const RightPanelStackComponent: React.FC<RightPanelStackProps> = ({
  stack,
  currentIndex,
  onNavigateBack,
  onNavigateForward,
  onClose,
  onCloseAll,
  onSetCurrentIndex,
  renderLine,
  renderAnalysis,
  renderCity,
  renderPerson,
  renderChat,
  renderCompatibility,
  renderRelocation,
  renderFavorites,
  renderScout,
  renderCharts,
  renderVastu,
  footer,
}) => {
  const currentPanel = stack[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < stack.length - 1;

  if (!currentPanel || stack.length === 0) {
    return null;
  }

  const renderContent = () => {
    switch (currentPanel.type) {
      case 'line':
        return renderLine?.(currentPanel.data);
      case 'analysis':
        return renderAnalysis?.(currentPanel.data);
      case 'city':
        return renderCity?.(currentPanel.data);
      case 'person':
        return renderPerson?.(currentPanel.data);
      case 'chat':
        return renderChat?.(currentPanel.data);
      case 'compatibility':
        return renderCompatibility?.(currentPanel.data);
      case 'relocation':
        return renderRelocation?.(currentPanel.data);
      case 'favorites':
        return renderFavorites?.(currentPanel.data);
      case 'scout':
        return renderScout?.(currentPanel.data);
      case 'charts':
        return renderCharts?.(currentPanel.data);
      case 'vastu':
        return renderVastu?.(currentPanel.data);
      default:
        return null;
    }
  };

  const getPanelIcon = (type: PanelType) => {
    switch (type) {
      case 'line': return '📍';
      case 'analysis': return '🔮';
      case 'city': return '🏙️';
      case 'person': return '👤';
      case 'chat': return '💬';
      case 'compatibility': return '💫';
      case 'relocation': return '🌍';
      case 'favorites': return '⭐';
      case 'scout': return '🔭';
      case 'charts': return '👥';
      case 'vastu': return '🧭';
      default: return '📄';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a] border-l border-slate-200 dark:border-white/10 overflow-hidden">
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Back/Forward navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNavigateBack}
              disabled={!canGoBack}
              title="Go back"
            >
              <ChevronLeft className={cn("h-4 w-4", !canGoBack && "opacity-30")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNavigateForward}
              disabled={!canGoForward}
              title="Go forward"
            >
              <ChevronRight className={cn("h-4 w-4", !canGoForward && "opacity-30")} />
            </Button>
          </div>

          {/* Compact Stack indicator with dropdown */}
          {stack.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer tabular-nums"
                  title="View panel history"
                >
                  <span>{currentIndex + 1}/{stack.length}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {stack.map((panel, index) => (
                  <DropdownMenuItem
                    key={panel.id}
                    onClick={() => onSetCurrentIndex?.(index)}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      index === currentIndex && "bg-slate-100 dark:bg-white/10"
                    )}
                  >
                    <span className="text-xs text-slate-400 w-4 tabular-nums">{index + 1}</span>
                    <span>{getPanelIcon(panel.type)}</span>
                    <span className="truncate flex-1">{panel.title}</span>
                    {index === currentIndex && (
                      <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-white/10 px-1 rounded">now</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Current panel title and close buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
            {getPanelIcon(currentPanel.type)} {currentPanel.title}
          </span>
          {stack.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
              onClick={onCloseAll}
              title="Close all panels"
            >
              Close All
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Close current panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panel Content - child components handle their own scrolling */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {renderContent()}
      </div>

      {/* Sticky Footer */}
      {footer && (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
};

export const RightPanelStack = React.memo(RightPanelStackComponent);

/**
 * usePanelStack Hook - Re-exported from globeInteractionStore
 *
 * This hook is now backed by Zustand for better performance
 * and global state management across components.
 */
export { usePanelStackActions as usePanelStack } from '@/stores/globeInteractionStore';
export type { UsePanelStackReturn } from '@/stores/globeInteractionStore';

export default RightPanelStack;
