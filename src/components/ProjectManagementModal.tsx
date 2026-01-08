import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban, FileText, Download, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { downloadFile, nodesEdgesToGedcom } from '@/lib/utils/export';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Node, Edge } from '@stubs/xyflow';
import type { PersonData, FamilyEdgeData } from '@/types/familyTree';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string | null;
  existingProjects: { id: string; name: string; is_permanent?: boolean }[];
  onCreateProject: (newName: string) => void;
  onSelectProject: (projectId: string) => void;
  nodes: Node<PersonData>[];
  edges: Edge<FamilyEdgeData>[];
  onImportFam: (treeData: { nodes: Node<PersonData>[]; edges: Edge<FamilyEdgeData>[] }) => void;
  onUpgrade: () => void;
  isPro: boolean;
  isLoading: boolean;
}

export const ProjectManagementModal: React.FC<ProjectManagementModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  existingProjects,
  onCreateProject,
  onSelectProject,
  nodes,
  edges,
  onImportFam,
  onUpgrade,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);
  const famFileInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'select' | 'export'>('select');
  const [selectedProjectForExport, setSelectedProjectForExport] = useState(null);
  const [upgradeToastVisible, setUpgradeToastVisible] = useState(false);
  const isMobile = useIsMobile();
  const [tabValue, setTabValue] = useState<'select' | 'create' | 'import'>('select');

  useEffect(() => {
    if (isOpen) {
      setNewProjectName('');
      setSelectedProjectId(currentProjectId);
      setTabValue('select');
    }
  }, [isOpen, currentProjectId]);

  const handleModalClose = () => {
    setStep('select');
    setSelectedProjectForExport(null);
    onClose();
  };

  const handleCreate = () => {
    if (!newProjectName.trim()) {
      toast.error("Project name cannot be empty.");
      return;
    }
    if (existingProjects.some(p => p.name.trim() === newProjectName.trim())) {
      toast.error("A project with this name already exists.");
      return;
    }
    onCreateProject(newProjectName.trim());
    handleModalClose();
  };

  const handleSelect = () => {
    if (!selectedProjectId) {
        toast.error("No project selected.");
        return;
    }
    onSelectProject(selectedProjectId);
    handleModalClose();
  };

  const handleFamFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nodes && data.edges) {
          onImportFam({ nodes: data.nodes, edges: data.edges });
          toast.success('Family tree imported!');
          handleModalClose();
        } else {
          toast.error('Invalid .fam file format.');
        }
      } catch {
        toast.error('Failed to parse .fam file.');
      }
    };
    reader.readAsText(file);
  };

  const showUpgradeToast = (onUpgrade: () => void) => {
    setUpgradeToastVisible(true);
    toast(
      <span>
        Export is only available for permanent (paid) projects.{' '}
        <button
          onClick={() => {
            toast.dismiss();
            setUpgradeToastVisible(false);
            onUpgrade();
          }}
          style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Upgrade to Export
        </button>
      </span>,
      {
        duration: 6000,
        onAutoClose: () => setUpgradeToastVisible(false),
        onDismiss: () => setUpgradeToastVisible(false),
      }
    );
  };

  // Fix for Tabs onValueChange typing
  const handleTabValueChange = (value: string) => {
    setTabValue(value as 'select' | 'create' | 'import');
    if (value === 'select') setStep('select');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleModalClose(); }}>
      <DialogContent 
        className={isMobile ? 'flex flex-col h-full p-0 bg-white dark:bg-slate-900' : 'sm:max-w-md'}
        mobileFullScreen={isMobile}
      >
        <VisuallyHidden>
          <DialogTitle>Project Management</DialogTitle>
        </VisuallyHidden>
        {step === 'export' && selectedProjectForExport ? (
          <div className={isMobile ? 'flex flex-col gap-4 items-center justify-center w-full px-4 py-6 flex-1' : 'flex flex-col gap-4 items-center justify-center w-full'}>
            <div className="font-semibold text-lg text-center mt-2 mb-1">Export "{selectedProjectForExport.name}"</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-2 w-full justify-center text-base"
                    onClick={async () => {
                      if (!selectedProjectForExport.is_permanent) {
                        if (upgradeToastVisible) {
                          toast.dismiss();
                          setUpgradeToastVisible(false);
                          onUpgrade();
                          return;
                        }
                        showUpgradeToast(onUpgrade);
                        return;
                      }
                      let exportNodes = nodes;
                      let exportEdges = edges;
                      if (selectedProjectForExport.id !== currentProjectId) {
                        const local = localStorage.getItem(`guest_project_${selectedProjectForExport.id}`);
                        if (local) {
                          const parsed = JSON.parse(local);
                          exportNodes = parsed.nodes || [];
                          exportEdges = parsed.edges || [];
                        } else {
                          toast.error('Project data not found for export.');
                          return;
                        }
                      }
                      downloadFile(`${selectedProjectForExport.name || 'family-tree'}.fam`, JSON.stringify({ nodes: exportNodes, edges: exportEdges }, null, 2), 'application/json');
                      toast.success('Exported as .fam!');
                      setTimeout(() => {
                        handleModalClose();
                      }, 1000);
                    }}
                  >
                    <FileText className="w-4 h-4" /> Export as .fam (recommended)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Best format for AstroCart</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full justify-center text-base"
              onClick={async () => {
                if (!selectedProjectForExport.is_permanent) {
                  if (upgradeToastVisible) {
                    toast.dismiss();
                    setUpgradeToastVisible(false);
                    onUpgrade();
                    return;
                  }
                  showUpgradeToast(onUpgrade);
                  return;
                }
                let exportNodes = nodes;
                let exportEdges = edges;
                if (selectedProjectForExport.id !== currentProjectId) {
                  const local = localStorage.getItem(`guest_project_${selectedProjectForExport.id}`);
                  if (local) {
                    const parsed = JSON.parse(local);
                    exportNodes = parsed.nodes || [];
                    exportEdges = parsed.edges || [];
                  } else {
                    toast.error('Project data not found for export.');
                    return;
                  }
                }
                const gedcom = nodesEdgesToGedcom(exportNodes, exportEdges);
                downloadFile(`${selectedProjectForExport.name || 'family-tree'}.ged`, gedcom, 'text/plain');
                toast.success('Exported as GEDCOM!');
                setTimeout(() => {
                  handleModalClose();
                }, 1000);
              }}
            >
              <Download className="w-4 h-4" /> Export as GEDCOM
            </Button>
            <button
              className="mt-6 text-red-600 hover:text-red-800 text-base font-medium border-none bg-transparent shadow-none outline-none cursor-pointer"
              style={{ border: 'none', background: 'none' }}
              onClick={() => setStep('select')}
            >
              <span className="inline-flex items-center gap-1"><X className="w-4 h-4" /> Cancel</span>
            </button>
          </div>
        ) : (
          <>
            {/* Sticky header for mobile with close button and tabs */}
            {isMobile ? (
              <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                    <FolderKanban className="w-7 h-7" />
                    My Projects
                  </span>
                  <button
                    className="dialog-close-btn-outline ml-2 rounded-full p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ width: 40, height: 40 }}
                    onClick={handleModalClose}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <Tabs value={tabValue} onValueChange={handleTabValueChange} className="w-full">
                  <TabsList className="flex w-full justify-between bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-sm gap-2 mt-2 mb-2">
                    <TabsTrigger value="select" className="flex-1 text-lg font-semibold tracking-tight py-3 rounded-full transition-all duration-150 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 data-[state=active]:font-extrabold data-[state=active]:ring-2 data-[state=active]:ring-blue-200 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-300 dark:data-[state=active]:ring-blue-900">
                      Open Project
                    </TabsTrigger>
                    <TabsTrigger value="create" className="flex-1 text-lg font-semibold tracking-tight py-3 rounded-full transition-all duration-150 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-green-700 data-[state=active]:font-extrabold data-[state=active]:ring-2 data-[state=active]:ring-green-200 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-green-300 dark:data-[state=active]:ring-green-900">
                      Create New
                    </TabsTrigger>
                    <TabsTrigger value="import" className="flex-1 text-lg font-semibold tracking-tight py-3 rounded-full transition-all duration-150 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-slate-900 data-[state=active]:font-extrabold data-[state=active]:ring-2 data-[state=active]:ring-slate-200 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white dark:data-[state=active]:ring-slate-700">
                      Import
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            ) : (
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                  <FolderKanban className="w-7 h-7" />
                  My Projects
                </DialogTitle>
                <Tabs value={tabValue} onValueChange={handleTabValueChange} className="w-full mt-4">
                  <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-slate-100 dark:border-slate-800 bg-transparent">
                    <TabsTrigger value="select">Open Project</TabsTrigger>
                    <TabsTrigger value="create">Create New</TabsTrigger>
                    <TabsTrigger value="import">Import</TabsTrigger>
                  </TabsList>
                </Tabs>
              </DialogHeader>
            )}
            {/* Scrollable content area for mobile, fills available height */}
            <div className={isMobile ? 'flex-1 min-h-0 flex flex-col' : ''}>
              <Tabs value={tabValue} onValueChange={handleTabValueChange} className={isMobile ? 'w-full h-full' : 'w-full'}>
                <TabsContent value="select" className={isMobile ? 'pt-0 px-0' : ''}>
                  {step === 'select' ? (
                    isMobile ? (
                      <div className="flex-1 flex flex-col pt-0 px-0">
                        <div className="space-y-3 flex-1 flex flex-col">
                          {existingProjects.length > 0 ? (
                            <ScrollArea className="flex-1 min-h-0 w-full border-none bg-transparent p-2">
                              <div className="flex flex-col gap-4">
                                {existingProjects.map((proj) => (
                                  <div
                                    key={proj.id}
                                    className={`relative flex items-center w-full transition-all duration-150 rounded-2xl border bg-white dark:bg-slate-900 px-4 py-4 shadow-sm cursor-pointer group
                                      ${selectedProjectId === proj.id ? 'border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900' : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-md'}`}
                                    onClick={() => setSelectedProjectId(proj.id)}
                                    tabIndex={0}
                                    role="button"
                                    aria-pressed={selectedProjectId === proj.id}
                                  >
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className={`truncate text-lg font-bold ${selectedProjectId === proj.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>{proj.name}</span>
                                      <div className="flex items-center gap-2 mt-2">
                                        {proj.is_permanent && <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">Cloud</span>}
                                        {!proj.is_permanent && <span className="bg-gray-100 text-gray-800 text-sm font-semibold px-3 py-1 rounded-full">Local</span>}
                                        {proj.id === currentProjectId && <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-full">Current</span>}
                                      </div>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      title="Export project"
                                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border-slate-200 dark:border-slate-700 opacity-80 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProjectForExport(proj);
                                        setStep('export');
                                      }}
                                    >
                                      <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <p className="text-base text-muted-foreground">No other projects found.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-0 px-0">
                        <Label htmlFor="selectProject" className="px-2 pt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Select an existing project</Label>
                        {existingProjects.length > 0 ? (
                          <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                            {existingProjects.map((proj) => (
                              <div key={proj.id} className="flex items-center w-full mb-2 gap-2">
                                <Button
                                  variant={selectedProjectId === proj.id ? "default" : "outline"}
                                  className="flex-1 justify-start"
                                  onClick={() => setSelectedProjectId(proj.id)}
                                >
                                  {proj.name}
                                  <div className="ml-auto flex items-center gap-2">
                                    {proj.is_permanent && <Badge className="bg-blue-100 text-blue-800">Cloud</Badge>}
                                    {!proj.is_permanent && <Badge className="bg-gray-100 text-gray-800">Local</Badge>}
                                    {proj.id === currentProjectId && <span className="text-xs opacity-70">(Current)</span>}
                                  </div>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  title="Export project"
                                  onClick={() => {
                                    setSelectedProjectForExport(proj);
                                    setStep('export');
                                  }}
                                >
                                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </div>
                            ))}
                          </ScrollArea>
                        ) : (
                          <p className="text-sm text-muted-foreground">No other projects found.</p>
                        )}
                      </div>
                    )
                  ) : null}
                </TabsContent>
                <TabsContent value="create">
                  {isMobile ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto px-4 pt-0 pb-0">
                      {/* Hero/description section for create new project */}
                      <div className="flex flex-col items-center justify-center w-full pt-0 pb-4 flex-1">
                        <img src="/logo.png" alt="AstroCart Logo" style={{ width: 48, height: 48, display: 'block', margin: '0 auto' }} />
                        <div className="mt-4 text-xl font-extrabold text-center text-slate-900 dark:text-white leading-tight" style={{ letterSpacing: '-0.04em' }}>
                          Create a New Family Project
                        </div>
                        <ul className="mt-4 mb-2 space-y-3 text-left max-w-xs w-full">
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">✅</span> Add people, relationships, and locations
                          </li>
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">☁️</span> Save projects locally or in the cloud
                          </li>
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">🔒</span> Your data stays private and secure
                          </li>
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">🖼️</span> Visualize your family tree beautifully
                          </li>
                        </ul>
                      </div>
                      {/* Improved input field for project name */}
                      <div className="flex flex-col items-center w-full mt-2 mb-4">
                        <div className="relative w-full">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <FolderKanban className="w-6 h-6" />
                          </span>
                          <Input
                            id="newProjectName"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Project name..."
                            className="pl-14 pr-4 py-5 text-xl rounded-xl border border-blue-300 dark:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700 bg-white dark:bg-slate-900 shadow-md focus:shadow-xl text-slate-900 dark:text-white placeholder:text-slate-500 placeholder:font-bold font-bold transition-all duration-200 hover:border-blue-400 hover:shadow-xl outline-none w-full box-border"
                          />
                        </div>
                        <div className="w-full text-sm text-slate-500 dark:text-slate-400 mt-2 text-center mx-auto">This will be the name of your new project.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-6">
                      <Label htmlFor="newProjectName" className="pl-2 pt-2">New project name</Label>
                      <Input
                        id="newProjectName"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter new project name"
                        className="py-4 px-4 text-base rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-900 bg-white dark:bg-slate-900"
                      />
                      <div className="w-full text-sm text-slate-500 dark:text-slate-400 mt-2 text-center mx-auto">This will be the name of your new project.</div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="import">
                  {isMobile ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-auto px-4 pt-0 pb-0">
                      {/* Hero/description section for import project */}
                      <div className="flex flex-col items-center justify-center w-full pt-0 pb-4 flex-1">
                        <img src="/logo.png" alt="AstroCart Logo" style={{ width: 40, height: 40, display: 'block', margin: '0 auto' }} />
                        <div className="mt-4 text-xl font-extrabold text-center text-slate-900 dark:text-white leading-tight" style={{ letterSpacing: '-0.04em' }}>
                          Import a Family Project
                        </div>
                        <ul className="mt-4 mb-2 space-y-3 text-left max-w-xs w-full">
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">📂</span> Bring in your family tree from another app
                          </li>
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">⚡</span> Quick and easy import process
                          </li>
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">🔒</span> Your data stays private and secure
                          </li>
                          <li className="flex items-start gap-2 text-lg text-slate-700 dark:text-slate-200 font-medium">
                            <span className="mt-0.5">🖼️</span> Instantly visualize your imported tree
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full pt-8 pb-8">
                      <Card className="w-full max-w-md mx-auto">
                        <CardContent className="pt-8 pb-8 flex flex-col gap-4 items-center justify-center">
                          <Button
                            type="button"
                            className="w-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 font-semibold text-lg"
                            onClick={() => famFileInputRef.current?.click()}
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14m7-7H5"/></svg>
                            Import from .fam file
                          </Button>
                          <input
                            ref={famFileInputRef}
                            type="file"
                            accept=".fam,.json,application/json"
                            style={{ display: 'none' }}
                            onChange={handleFamFileChange}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            {/* Sticky footer for mobile and desktop for create/import/select tabs */}
            {isMobile && tabValue === 'select' && (
              <div className="sticky bottom-0 left-0 w-full z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-3 flex flex-row gap-2 shadow-sm">
                <button
                  type="button"
                  onClick={handleSelect}
                  className="w-full cta-button"
                  disabled={!selectedProjectId || existingProjects.length === 0}
                  style={{
                    height: '56px',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '18px',
                    background: '#2563eb',
                    color: '#fff',
                    boxShadow: '0 4px 24px rgba(37,99,235,0.18)'
                  }}
                >
                  Open Selected Project
                </button>
              </div>
            )}
            {!isMobile && tabValue === 'select' && (
              <Button type="button" onClick={handleSelect} className="w-full bg-blue-600 hover:bg-blue-700 mt-4 sticky bottom-0" disabled={!selectedProjectId || existingProjects.length === 0}>
                Open Selected Project
              </Button>
            )}
            {isMobile && tabValue === 'create' && (
              <div className="sticky bottom-0 left-0 w-full z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-3 flex flex-row gap-2 shadow-sm">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full cta-button"
                  disabled={!newProjectName.trim() || existingProjects.some(p => p.name.trim() === newProjectName.trim())}
                  style={{
                    height: '56px',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '18px',
                    background: '#22c55e',
                    color: '#fff',
                    boxShadow: '0 4px 24px rgba(34,197,94,0.18)'
                  }}
                >
                  Create Project
                </button>
              </div>
            )}
            {isMobile && tabValue === 'import' && (
              <div className="sticky bottom-0 left-0 w-full z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-3 flex flex-col gap-2 shadow-sm">
                        <button
                          type="button"
                          className="w-full py-4 text-lg font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-150 flex items-center justify-center gap-2"
                          onClick={() => famFileInputRef.current?.click()}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14m7-7H5"/></svg>
                          Import from .fam file
                        </button>
                        <input
                          ref={famFileInputRef}
                          type="file"
                          accept=".fam,.json,application/json"
                          style={{ display: 'none' }}
                          onChange={handleFamFileChange}
                        />
                      </div>
            )}
            {/* Desktop sticky footer for create/import tabs */}
            {!isMobile && tabValue === 'create' && (
              <Button type="button" onClick={handleCreate} className="w-full bg-green-600 hover:bg-green-700 mt-4 sticky bottom-0" disabled={!newProjectName.trim() || existingProjects.some(p => p.name.trim() === newProjectName.trim())}>
                Create Project
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
