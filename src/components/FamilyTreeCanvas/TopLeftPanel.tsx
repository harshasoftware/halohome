import React from 'react';
import { ViewModeSwitcher } from '@/components/ViewModeSwitcher';
import { FilterPane } from '@/components/FilterPane';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Filter } from 'lucide-react';
import { ViewMode } from '@/pages/Workspace';

/**
 * TopLeftPanel renders the top-left overlays: ViewModeSwitcher, FilterPane, and mobile controls toggle.
 */
interface TopLeftPanelProps {
  isMobile: boolean;
  showMobileControls: boolean;
  setShowMobileControls: (show: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filterMinimized: boolean;
  setFilterMinimized: (min: boolean) => void;
  onFilterChange?: (filter: string, value: string) => void;
  nodes: import('@stubs/xyflow').Node[];
}

export const TopLeftPanel: React.FC<TopLeftPanelProps> = ({
  isMobile,
  showMobileControls,
  setShowMobileControls,
  viewMode,
  onViewModeChange,
  filterMinimized,
  setFilterMinimized,
  onFilterChange,
  nodes,
}) => {
  const filterPaneHeaderProps = isMobile ? { noHeader: true, noDescription: true } : {};
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 pointer-events-none">
      {!isMobile && (
        <div className="pointer-events-auto">
          <ViewModeSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
      )}
      {isMobile && (
        <button
          className="pointer-events-auto w-10 h-10 mb-2 bg-white/80 dark:bg-slate-950/80 rounded-md shadow-md border border-slate-200 dark:border-slate-800 flex items-center justify-center"
          onClick={() => setShowMobileControls(!showMobileControls)}
          aria-label={showMobileControls ? 'Hide Controls' : 'Show Controls'}
        >
          {showMobileControls ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
      {viewMode !== 'timeline' && !isMobile && (
        <div className="pointer-events-auto">
          {filterMinimized ? (
            <Button variant="outline" size="icon" onClick={() => setFilterMinimized(false)} aria-label="Show Filters">
              <Filter className="w-5 h-5" />
            </Button>
          ) : (
            <FilterPane
              onFilterChange={onFilterChange}
              locationsCount={nodes.filter(n => n.type === 'person').length}
              onMinimize={() => setFilterMinimized(true)}
              {...filterPaneHeaderProps}
            />
          )}
        </div>
      )}
    </div>
  );
}; 