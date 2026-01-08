import React from 'react';
import { MiniMap } from '@stubs/xyflow';
import { MinusSquare, Eye } from 'lucide-react';

/**
 * MiniMapToggle renders the minimap and its hide button. Should be used inside ReactFlow.
 */
interface MiniMapToggleProps {
  showMiniMap: boolean;
  setShowMiniMap: (show: boolean) => void;
  getNodeColor: (node: import('@stubs/xyflow').Node) => string;
}

export const MiniMapToggle: React.FC<MiniMapToggleProps> = ({
  showMiniMap,
  setShowMiniMap,
  getNodeColor,
}) => {
  if (!showMiniMap) return null;
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <MiniMap nodeColor={getNodeColor} />
      <button
        className="absolute top-1 right-1 w-6 h-6 bg-white/80 rounded-md flex items-center justify-center border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800"
        onClick={() => setShowMiniMap(false)}
        aria-label="Hide Minimap"
        style={{ zIndex: 30 }}
      >
        <MinusSquare className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * MiniMapShowButton renders the button to show the minimap. Should be used outside ReactFlow.
 */
interface MiniMapShowButtonProps {
  showMiniMap: boolean;
  setShowMiniMap: (show: boolean) => void;
  isMobile: boolean;
  showMobileControls: boolean;
}

export const MiniMapShowButton: React.FC<MiniMapShowButtonProps> = ({
  showMiniMap,
  setShowMiniMap,
  isMobile,
  showMobileControls,
}) => {
  if (showMiniMap) return null;
  if (!isMobile || showMobileControls) {
    return (
      <button
        className="absolute bottom-4 right-4 z-20 w-8 h-8 bg-white/80 rounded-md flex items-center justify-center border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800"
        onClick={() => setShowMiniMap(true)}
        aria-label="Show Minimap"
        style={{ zIndex: 30 }}
      >
        <Eye className="w-5 h-5" />
      </button>
    );
  }
  return null;
}; 