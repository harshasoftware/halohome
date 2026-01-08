import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@stubs/xyflow';
import { useChartManager } from '@/hooks/useChartManager';
import GlobePage from '@/features/globe/GlobePage';
import type { Node } from '@stubs/xyflow';
import type { PersonData } from '@/types/familyTree';

const SharePageContent = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const [error, setError] = useState<string | null>(null);

  const chartManager = useChartManager(null, () => ({ x: 0, y: 0 }), accessToken);
  const { nodes, edges, isDataLoaded, projectName, filters } = chartManager;

  useEffect(() => {
    if (!accessToken) {
      setError("No access token provided.");
    }
  }, [accessToken]);

  if (error) {
    return <div className="h-screen w-screen flex items-center justify-center bg-red-50 text-red-700">{error}</div>;
  }

  if (!isDataLoaded) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">Revealing a shared chart...</div>;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-black flex flex-col overflow-hidden">
      <div className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800 flex items-center justify-center px-4 md:px-6 shadow-sm">
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200 truncate">
          {projectName} (View-Only)
        </h1>
      </div>
      <div className="flex-1 relative min-h-0">
        <GlobePage
          filters={filters}
          nodes={nodes.filter(n => n.type === 'person') as Node<PersonData>[]}
          edges={edges}
          onFilterChange={() => {}}
          viewMode="map"
          onViewModeChange={() => {}}
        />
      </div>
    </div>
  );
};

const SharePage = () => (
  <ReactFlowProvider>
    <SharePageContent />
  </ReactFlowProvider>
);

export default SharePage;
