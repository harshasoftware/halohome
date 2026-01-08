import { useProjectState } from './family-tree-parts/useProjectState';
import { useChartData } from './family-tree-parts/useChartData';
import { useFilterState } from './family-tree-parts/useFilterState';
import { useEncryptionManager } from './family-tree-parts/useEncryptionManager';
import { useProjectManagement } from './family-tree-parts/useProjectManagement';
import { useTreeMutations } from './family-tree-parts/useTreeMutations';
import { useAutoSave } from './family-tree-parts/useAutoSave';
import { useAuth } from '@/hooks/useAuth-context';
import { useMemo, useCallback } from 'react';
import { useTreeData } from './family-tree-parts/useTreeData';
import type { ScreenToFlowPosition } from './family-tree-parts/useTreeMutations';
import { useModalManager } from './useModalManager';

export const useChartManager = (
  projectIdFromUrl?: string | null,
  screenToFlowPosition?: ScreenToFlowPosition,
  accessToken?: string,
  handleUpgrade?: () => void,
  externalModalManager?: ReturnType<typeof useModalManager>
) => {
  const { user } = useAuth();
  const project = useProjectState(projectIdFromUrl);
  const chartData = useChartData();
  const filters = useFilterState();

  // Create internal modalManager as fallback if none provided
  const internalModalManager = useModalManager();
  const modalManager = externalModalManager ?? internalModalManager;

  const encryption = useEncryptionManager(modalManager);

  // Integrate useTreeData for data loading
  useTreeData({
    user,
    accessToken,
    isDataLoaded: chartData.isDataLoaded,
    projectId: project.projectId,
    nodes: chartData.nodes,
    edges: chartData.edges,
    setNodes: chartData.setNodes,
    setEdges: chartData.setEdges,
    setIsDataLoaded: chartData.setIsDataLoaded,
    setProjectId: project.setProjectId,
    setProjectName: project.setProjectName,
    setExistingProjects: project.setExistingProjects,
    setEncryptionKey: encryption.setEncryptionKey,
    promptForPassword: encryption.promptForPassword,
  });

  // Memoize isProjectPermanent
  const isProjectPermanent = useMemo(() => {
    const existingProjects = Array.isArray(project.existingProjects) ? project.existingProjects : [];
    return !!(
      project.projectId &&
      existingProjects.find((p) => p.id === project.projectId)?.is_permanent
    );
  }, [project.projectId, project.existingProjects]);

  // Example: memoize a derived handler (if you pass to children)
  const memoizedHandleAutoLayout = useCallback(() => {
    if (typeof handleUpgrade === 'function') handleUpgrade();
  }, [handleUpgrade]);

  const projectMgmt = useProjectManagement({
    user,
    projectId: project.projectId,
    projectName: project.projectName,
    nodes: chartData.nodes,
    edges: chartData.edges,
    setNodes: chartData.setNodes,
    setEdges: chartData.setEdges,
    setProjectId: project.setProjectId,
    setProjectName: project.setProjectName,
    setExistingProjects: project.setExistingProjects,
    setEncryptionKey: encryption.setEncryptionKey,
    encryptionKey: encryption.encryptionKey,
  });

  const mutations = useTreeMutations({
    nodes: chartData.nodes,
    edges: chartData.edges,
    setNodes: chartData.setNodes,
    setEdges: chartData.setEdges,
    screenToFlowPosition,
  });

  useAutoSave({
    nodes: chartData.nodes,
    edges: chartData.edges,
    isProjectPermanent,
    isDataLoaded: chartData.isDataLoaded,
    user,
    handleSaveToCloud: projectMgmt.handleSaveToCloud,
    encryptionKey: encryption.encryptionKey,
  });

  return useMemo(() => ({
    projectId: project.projectId,
    setProjectId: project.setProjectId,
    projectName: project.projectName,
    setProjectName: project.setProjectName,
    existingProjects: project.existingProjects,
    setExistingProjects: project.setExistingProjects,
    ...chartData,
    ...filters,
    ...encryption,
    ...projectMgmt,
    ...mutations,
    isProjectPermanent,
    memoizedHandleAutoLayout,
    handleUpgrade,
  }), [project, chartData, filters, encryption, projectMgmt, mutations, isProjectPermanent, memoizedHandleAutoLayout, handleUpgrade]);
};
