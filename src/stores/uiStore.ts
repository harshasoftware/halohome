/**
 * UI Store - Zustand store for UI state and modals
 *
 * Replaces useModalManager hook and Workspace.tsx UI state.
 * Provides fine-grained subscriptions for better performance.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import type { PersonData } from '@/types/familyTree';
import type { Connection, Edge, Node } from '@stubs/xyflow';

type ViewMode = 'map';

interface PasswordModalProject {
  id: string;
  name: string;
  is_encrypted: boolean;
  encryption_salt?: string | null;
}

interface PasswordModalCallbacks {
  resolve: ((key: CryptoKey) => void) | null;
  reject: ((reason?: unknown) => void) | null;
}

interface BirthDataPrefill {
  place: string;
  lat: number;
  lng: number;
}

interface UIState {
  // === Modal State (from useModalManager) ===
  // Person dialog
  isPersonDialogOpen: boolean;
  editingPerson: PersonData | null;

  // Birth data dialog (for landing page flow)
  isBirthDataDialogOpen: boolean;
  birthDataPrefill: BirthDataPrefill | null;

  // Relationship modal
  isRelationshipModalOpen: boolean;
  pendingConnection: Connection | Edge | null;
  currentSourceNode: Node | null;
  currentTargetNode: Node | null;

  // Other modals
  isProjectModalOpen: boolean;
  isClearDataModalOpen: boolean;
  isAuthModalOpen: boolean;
  isRenameModalOpen: boolean;
  isWelcomeDialogOpen: boolean;
  isSubscriptionModalOpen: boolean;

  // Password modal
  isPasswordModalOpen: boolean;
  passwordModalProject: PasswordModalProject | null;
  passwordModalCallbacks: PasswordModalCallbacks;

  // === UI State (from Workspace.tsx) ===
  viewMode: ViewMode;
  selectedNodeId: string | null;
  filterMinimized: boolean;
  isLegendMinimized: boolean;
  showMobileControls: boolean;
  isFeedbackOpen: boolean;
  isHelpOpen: boolean;
  showExportPanel: boolean;
  showChartPicker: boolean;
  isAIChatOpen: boolean;
  isBottomSheetOpen: boolean;
  personToDelete: string | null;

  // === Modal Actions ===
  openPersonDialog: (person: PersonData | null) => void;
  closePersonDialog: () => void;
  openRelationshipModal: (params: Connection | Edge, sourceNode: Node, targetNode: Node) => void;
  closeRelationshipModal: () => void;
  openPasswordModal: (
    project: PasswordModalProject,
    resolve: (key: CryptoKey) => void,
    reject: (reason?: unknown) => void
  ) => void;
  closePasswordModal: () => void;
  submitPasswordModal: (key: CryptoKey) => void;

  // Birth data dialog actions
  openBirthDataDialog: (prefill?: BirthDataPrefill | null) => void;
  closeBirthDataDialog: () => void;

  // Simple modal setters
  setIsPersonDialogOpen: (open: boolean) => void;
  setIsProjectModalOpen: (open: boolean) => void;
  setIsClearDataModalOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsRenameModalOpen: (open: boolean) => void;
  setIsWelcomeDialogOpen: (open: boolean) => void;
  setIsSubscriptionModalOpen: (open: boolean) => void;

  // === UI Actions ===
  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setFilterMinimized: (minimized: boolean) => void;
  toggleLegend: () => void;
  setIsLegendMinimized: (minimized: boolean) => void;
  setShowMobileControls: (show: boolean) => void;
  setIsFeedbackOpen: (open: boolean) => void;
  setIsHelpOpen: (open: boolean) => void;
  setShowExportPanel: (show: boolean) => void;
  setShowChartPicker: (show: boolean) => void;
  toggleAIChat: () => void;
  setIsAIChatOpen: (open: boolean) => void;
  setIsBottomSheetOpen: (open: boolean) => void;
  setPersonToDelete: (id: string | null) => void;

  // Batch actions
  closeAllModals: () => void;
  closeAllPanels: () => void;
}

const initialModalState = {
  isPersonDialogOpen: false,
  editingPerson: null,
  isBirthDataDialogOpen: false,
  birthDataPrefill: null,
  isRelationshipModalOpen: false,
  pendingConnection: null,
  currentSourceNode: null,
  currentTargetNode: null,
  isProjectModalOpen: false,
  isClearDataModalOpen: false,
  isAuthModalOpen: false,
  isRenameModalOpen: false,
  isWelcomeDialogOpen: false,
  isSubscriptionModalOpen: false,
  isPasswordModalOpen: false,
  passwordModalProject: null,
  passwordModalCallbacks: { resolve: null, reject: null },
};

const initialUIState = {
  viewMode: 'map' as ViewMode,
  selectedNodeId: null,
  filterMinimized: true,
  isLegendMinimized: true,
  showMobileControls: false,
  isFeedbackOpen: false,
  isHelpOpen: false,
  showExportPanel: false,
  showChartPicker: false,
  isAIChatOpen: false,
  isBottomSheetOpen: false,
  personToDelete: null,
};

export const useUIStore = create<UIState>()(
  devtools(
    immer((set) => ({
      ...initialModalState,
      ...initialUIState,

      // === Modal Actions ===
      openPersonDialog: (person) => set((state) => {
        state.isPersonDialogOpen = true;
        state.editingPerson = person;
      }),
      closePersonDialog: () => set((state) => {
        state.isPersonDialogOpen = false;
        state.editingPerson = null;
      }),
      openRelationshipModal: (params, sourceNode, targetNode) => set((state) => {
        state.isRelationshipModalOpen = true;
        state.pendingConnection = params;
        state.currentSourceNode = sourceNode;
        state.currentTargetNode = targetNode;
      }),
      closeRelationshipModal: () => set((state) => {
        state.isRelationshipModalOpen = false;
        state.pendingConnection = null;
        state.currentSourceNode = null;
        state.currentTargetNode = null;
      }),
      openPasswordModal: (project, resolve, reject) => set((state) => {
        state.isPasswordModalOpen = true;
        state.passwordModalProject = project;
        state.passwordModalCallbacks = { resolve, reject };
      }),
      closePasswordModal: () => set((state) => {
        // Call reject if exists
        if (state.passwordModalCallbacks.reject) {
          state.passwordModalCallbacks.reject(new Error("Password prompt was closed."));
        }
        state.isPasswordModalOpen = false;
        state.passwordModalProject = null;
        state.passwordModalCallbacks = { resolve: null, reject: null };
      }),
      submitPasswordModal: (key) => set((state) => {
        // Call resolve with key
        if (state.passwordModalCallbacks.resolve) {
          state.passwordModalCallbacks.resolve(key);
        }
        state.isPasswordModalOpen = false;
        state.passwordModalProject = null;
        state.passwordModalCallbacks = { resolve: null, reject: null };
      }),

      // Birth data dialog actions
      openBirthDataDialog: (prefill = null) => set((state) => {
        state.isBirthDataDialogOpen = true;
        state.birthDataPrefill = prefill;
      }),
      closeBirthDataDialog: () => set((state) => {
        state.isBirthDataDialogOpen = false;
        state.birthDataPrefill = null;
      }),

      // Simple modal setters
      setIsPersonDialogOpen: (open) => set((state) => { state.isPersonDialogOpen = open; }),
      setIsProjectModalOpen: (open) => set((state) => { state.isProjectModalOpen = open; }),
      setIsClearDataModalOpen: (open) => set((state) => { state.isClearDataModalOpen = open; }),
      setIsAuthModalOpen: (open) => set((state) => { state.isAuthModalOpen = open; }),
      setIsRenameModalOpen: (open) => set((state) => { state.isRenameModalOpen = open; }),
      setIsWelcomeDialogOpen: (open) => set((state) => { state.isWelcomeDialogOpen = open; }),
      setIsSubscriptionModalOpen: (open) => set((state) => { state.isSubscriptionModalOpen = open; }),

      // === UI Actions ===
      setViewMode: (mode) => set((state) => { state.viewMode = mode; }),
      setSelectedNodeId: (id) => set((state) => { state.selectedNodeId = id; }),
      setFilterMinimized: (minimized) => set((state) => { state.filterMinimized = minimized; }),
      toggleLegend: () => set((state) => { state.isLegendMinimized = !state.isLegendMinimized; }),
      setIsLegendMinimized: (minimized) => set((state) => { state.isLegendMinimized = minimized; }),
      setShowMobileControls: (show) => set((state) => { state.showMobileControls = show; }),
      setIsFeedbackOpen: (open) => set((state) => { state.isFeedbackOpen = open; }),
      setIsHelpOpen: (open) => set((state) => { state.isHelpOpen = open; }),
      setShowExportPanel: (show) => set((state) => { state.showExportPanel = show; }),
      setShowChartPicker: (show) => set((state) => { state.showChartPicker = show; }),
      toggleAIChat: () => set((state) => { state.isAIChatOpen = !state.isAIChatOpen; }),
      setIsAIChatOpen: (open) => set((state) => { state.isAIChatOpen = open; }),
      setIsBottomSheetOpen: (open) => set((state) => { state.isBottomSheetOpen = open; }),
      setPersonToDelete: (id) => set((state) => { state.personToDelete = id; }),

      // Batch actions
      closeAllModals: () => set((state) => {
        Object.assign(state, initialModalState);
      }),
      closeAllPanels: () => set((state) => {
        state.showExportPanel = false;
        state.isFeedbackOpen = false;
        state.isHelpOpen = false;
        state.showChartPicker = false;
      }),
    })),
    { name: 'ui-store' }
  )
);

// === Selectors for fine-grained subscriptions ===

// Modal selectors
export const usePersonDialog = () => useUIStore(useShallow((state) => ({
  isOpen: state.isPersonDialogOpen,
  editingPerson: state.editingPerson,
  open: state.openPersonDialog,
  close: state.closePersonDialog,
  setIsOpen: state.setIsPersonDialogOpen,
})));

export const useRelationshipModal = () => useUIStore(useShallow((state) => ({
  isOpen: state.isRelationshipModalOpen,
  pendingConnection: state.pendingConnection,
  sourceNode: state.currentSourceNode,
  targetNode: state.currentTargetNode,
  open: state.openRelationshipModal,
  close: state.closeRelationshipModal,
})));

export const usePasswordModal = () => useUIStore(useShallow((state) => ({
  isOpen: state.isPasswordModalOpen,
  project: state.passwordModalProject,
  open: state.openPasswordModal,
  close: state.closePasswordModal,
  submit: state.submitPasswordModal,
})));

// UI selectors
export const useToolbarState = () => useUIStore(useShallow((state) => ({
  isLegendMinimized: state.isLegendMinimized,
  isAIChatOpen: state.isAIChatOpen,
  showExportPanel: state.showExportPanel,
  isBottomSheetOpen: state.isBottomSheetOpen,
  toggleLegend: state.toggleLegend,
  toggleAIChat: state.toggleAIChat,
})));

export const useDeleteConfirmation = () => useUIStore(useShallow((state) => ({
  personToDelete: state.personToDelete,
  setPersonToDelete: state.setPersonToDelete,
})));

export const useBirthDataDialog = () => useUIStore(useShallow((state) => ({
  isOpen: state.isBirthDataDialogOpen,
  prefill: state.birthDataPrefill,
  open: state.openBirthDataDialog,
  close: state.closeBirthDataDialog,
})));

export const useAnyModalOpen = () => useUIStore((state) =>
  state.isPersonDialogOpen ||
  state.isBirthDataDialogOpen ||
  state.isRelationshipModalOpen ||
  state.isProjectModalOpen ||
  state.isClearDataModalOpen ||
  state.isAuthModalOpen ||
  state.isRenameModalOpen ||
  state.isWelcomeDialogOpen ||
  state.isPasswordModalOpen ||
  state.isSubscriptionModalOpen
);

export const useSubscriptionModal = () => useUIStore(useShallow((state) => ({
  isOpen: state.isSubscriptionModalOpen,
  setIsOpen: state.setIsSubscriptionModalOpen,
})));
