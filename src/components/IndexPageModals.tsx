import React, { useCallback } from 'react';
import { Node, Edge } from '@stubs/xyflow';
import { BirthDataDialog } from '@/components/BirthDataDialog';
import { ProjectManagementModal } from '@/components/ProjectManagementModal';
import { AuthModal } from '@/components/AuthModal';
import { RenameProjectModal } from '@/components/RenameProjectModal';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { PersonData } from '@/types/familyTree';
import { useModalManager } from '@/hooks/useModalManager';
import { useChartManager } from '@/hooks/useChartManager';

interface IndexPageModalsProps {
  modalManager: ReturnType<typeof useModalManager>;
  chartManager: ReturnType<typeof useChartManager>;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  personToDelete: string | null;
  setPersonToDelete: (id: string | null) => void;
}

export const IndexPageModals: React.FC<IndexPageModalsProps> = ({
    modalManager,
    chartManager,
    isPasswordRecovery,
    clearPasswordRecovery,
    personToDelete,
    setPersonToDelete,
}) => {
    const {
        isPersonDialogOpen, setIsPersonDialogOpen, editingPerson, closePersonDialog,
        isProjectModalOpen, setIsProjectModalOpen,
        isClearDataModalOpen, setIsClearDataModalOpen,
        isAuthModalOpen, setIsAuthModalOpen,
        isRenameModalOpen, setIsRenameModalOpen,
    } = modalManager;

    const {
        nodes, edges, projectId, projectName, existingProjects,
        savePerson, deletePerson, clearProjectData, renameProject, createNewProject, selectProject,
        encryptionKey,
    } = chartManager;

    const handleConfirmDeletePerson = async () => {
      if (personToDelete) {
        await deletePerson(personToDelete);
        setPersonToDelete(null);
      }
    };

    const handleSavePerson = useCallback((personData: Partial<PersonData>) => {
      savePerson(personData, editingPerson);
      closePersonDialog();
    }, [savePerson, editingPerson, closePersonDialog]);

    const handleDeleteFromDialog = (personId: string) => {
      closePersonDialog();
      setPersonToDelete(personId);
    };
    
    const handlePaymentSignInRequest = () => { setIsAuthModalOpen(true); };
    
    const handleAuthModalOpenChange = (open: boolean) => {
      if (!open && isPasswordRecovery) {
        clearPasswordRecovery();
      }
      setIsAuthModalOpen(open);
    };

    const handleConfirmClearAllData = async () => {
      await clearProjectData();
      setIsClearDataModalOpen(false);
    };
    
    const handleConfirmRename = async (newName: string) => {
      await renameProject(newName);
      setIsRenameModalOpen(false);
    };

    const safeExistingProjects = Array.isArray(existingProjects) ? existingProjects : [];
    const isPermanent = safeExistingProjects.find(p => p.id === projectId)?.is_permanent || false;

    return (
        <>
            <BirthDataDialog
                open={isPersonDialogOpen}
                onOpenChange={setIsPersonDialogOpen}
                person={editingPerson}
                onSave={handleSavePerson}
            />
            <AuthModal
                open={isAuthModalOpen}
                onOpenChange={handleAuthModalOpenChange}
                initialView={isPasswordRecovery ? 'update_password' : 'sign_in'}
            />
            <ProjectManagementModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                currentProjectId={projectId}
                existingProjects={Array.isArray(existingProjects) ? existingProjects : []}
                onCreateProject={createNewProject}
                onSelectProject={selectProject}
                nodes={nodes}
                edges={edges}
                onImportFam={(treeData) => {
                    chartManager.replaceTreeData(treeData.nodes, treeData.edges);
                }}
                onUpgrade={chartManager.handleUpgrade}
                isPro={false}
                isLoading={false}
            />
            <RenameProjectModal
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                currentName={projectName}
                onRename={handleConfirmRename}
            />
            <AlertDialog open={!!personToDelete} onOpenChange={(open) => !open && setPersonToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this person?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this person and all associated unions from the tree.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPersonToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeletePerson} className="bg-red-600 hover:bg-red-700">
                    Yes, Delete Person
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isClearDataModalOpen} onOpenChange={setIsClearDataModalOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all
                    family tree data for the current project and reset it to a blank state.
                    Any remembered layout for this project in your browser will also be cleared.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClearAllData} className="bg-red-600 hover:bg-red-700">
                    Yes, Clear All Data
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* passwordModalComponent was removed from treeManager destructuring, so it's no longer available here */}
        </>
    );
}
