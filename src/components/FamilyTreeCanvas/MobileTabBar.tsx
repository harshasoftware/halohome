import React from 'react';
import { Clock, Network, Map as MapIcon } from 'lucide-react';
import { ViewMode } from '@/pages/Workspace';

/**
 * MobileTabBar renders the bottom navigation for mobile view mode switching.
 */
interface MobileTabBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ viewMode, onViewModeChange }) => (
  <nav className="fixed bottom-0 z-50 w-full px-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md backdrop-saturate-150 shadow-[0_-2px_16px_0_rgba(0,0,0,0.10)] border-t border-white/30 dark:border-slate-700/40 flex justify-around items-center h-16">
    <button
      className={`flex flex-col items-center justify-center transition-all
        ${viewMode === 'timeline'
          ? 'text-slate-900 dark:text-slate-100'
          : 'text-slate-400 dark:text-slate-500'}
      `}
      onClick={() => onViewModeChange('timeline')}
      aria-label="Timeline View"
    >
      <Clock className={`${viewMode === 'timeline' ? 'w-7 h-7' : 'w-6 h-6'} mb-0.5`} />
      <span className="text-xs">Timeline</span>
    </button>
    <button
      className={`flex flex-col items-center justify-center transition-all
        ${viewMode === 'tree'
          ? 'text-slate-900 dark:text-slate-100'
          : 'text-slate-400 dark:text-slate-500'}
      `}
      onClick={() => onViewModeChange('tree')}
      aria-label="Tree View"
    >
      <Network className={`${viewMode === 'tree' ? 'w-7 h-7' : 'w-6 h-6'} mb-0.5`} />
      <span className="text-xs">Tree</span>
    </button>
    <button
      className={`flex flex-col items-center justify-center transition-all
        ${viewMode === 'map'
          ? 'text-slate-900 dark:text-slate-100'
          : 'text-slate-400 dark:text-slate-500'}
      `}
      onClick={() => onViewModeChange('map')}
      aria-label="Map View"
    >
      <MapIcon className={`${viewMode === 'map' ? 'w-7 h-7' : 'w-6 h-6'} mb-0.5`} />
      <span className="text-xs">Map</span>
    </button>
  </nav>
); 