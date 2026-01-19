import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Node, Edge, Connection, ReactFlowProvider, useReactFlow } from '@stubs/xyflow';
import { Toolbar } from '@/components/Toolbar';
import { useAuth } from '@/hooks/useAuth-context';
import { PersonData } from '@/types/familyTree';
import { toast } from 'sonner';
import { useModalManager } from '@/hooks/useModalManager';
import { useChartManager } from '@/hooks/useChartManager';
import { useUIStore } from '@/stores/uiStore';
import { useBirthCharts } from '@/hooks/useBirthCharts';
import { supabase } from '@/integrations/supabase/client';
import { IndexPageModals } from '@/components/IndexPageModals';
import { ChartPickerModal } from '@/components/ChartPickerModal';
import { HelpCircle, MessageSquare, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import GlobePage from '@/features/globe/GlobePage';
import { v4 as uuidv4 } from 'uuid';

import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

export type ViewMode = 'map';

// Utility to get or create a guest projectId in localStorage
function getOrCreateGuestProjectId() {
  let projectId = localStorage.getItem('guestFamilyTreeCurrentProjectId');
  if (!projectId) {
    // Try to find any guest project
    const guestKeys = Object.keys(localStorage).filter(k => k.startsWith('guest_project_'));
    if (guestKeys.length > 0) {
      projectId = guestKeys[0].replace('guest_project_', '');
      localStorage.setItem('guestFamilyTreeCurrentProjectId', projectId);
    } else {
      projectId = uuidv4();
      // Create a blank project for the guest
      const newProject = {
        id: projectId,
        name: 'My Birth Chart',
        nodes: [],
        edges: [],
        is_permanent: false,
      };
      localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(newProject));
      localStorage.setItem('guestFamilyTreeCurrentProjectId', projectId);
    }
  }
  return projectId;
}

const WorkspaceContent = ({ defaultView = 'map' }) => {
  const { projectId: projectIdFromUrl, '*': wildcard } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  // Install banner is completely disabled - install only via navbar button or drawer
  const isBannerShowing = false;
  // AI chat state for hiding help/feedback buttons when open
  const isAIChatOpen = useUIStore((state) => state.isAIChatOpen);
  // Globe/map is now the only view mode
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const navigate = useNavigate();
  const { user, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);
  const userRef = useRef<boolean>(!!user);

  const modalManager = useModalManager();
  const {
    openPersonDialog,
    setIsAuthModalOpen,
    setIsProjectModalOpen,
    setIsRenameModalOpen,
    isPersonDialogOpen, // Get person dialog state
    isRelationshipModalOpen,
    isClearDataModalOpen,
    isWelcomeDialogOpen
  } = modalManager;

  // Landing page prefill - passed to GlobePage to trigger the same birth data flow
  const [landingPagePrefill, setLandingPagePrefill] = useState<{
    lat: number;
    lng: number;
    place: string;
  } | null>(null);

  // Landing page unified search prefill - passed to GlobePage to trigger the same unified search flow
  const [landingSearchPrefill, setLandingSearchPrefill] = useState<{
    lat: number;
    lng: number;
    place: string;
    kind: 'zip' | 'property' | 'area';
    bounds?: { north: number; south: number; east: number; west: number };
  } | null>(null);

  // Birth charts management
  const birthCharts = useBirthCharts();
  const [showChartPicker, setShowChartPicker] = useState(false);
  // Track the chart we're currently editing (null = creating new)
  const [editingChartId, setEditingChartId] = useState<string | null>(null);

  const { screenToFlowPosition, getNodes } = useReactFlow(); // Add getNodes

  // Move handleUpgrade definition above useFamilyTreeManager
  const handleUpgrade = async () => {
    const { data, error } = await supabase.functions.invoke('create-single-payment', {
      body: {
        projectId: chartManager.projectId,
        treeData: { nodes, edges },
        projectName: projectName,
        priceId: 'price_1ReoUwCZ5pZyvwXIOMgdNtvO' // Replace with dynamic priceId
      }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data?.url) {
      if (!user && data.accessToken) {
        localStorage.setItem(`guest_access_token_${chartManager.projectId}`, data.accessToken);
      }
      window.location.href = data.url;
    }
  };

  const chartManager = useChartManager(
    projectIdFromUrl,
    screenToFlowPosition,
    undefined, // accessToken, if needed, otherwise undefined
    handleUpgrade,
    modalManager
  );
  const {
    nodes, edges, isDataLoaded, projectName, onNodesChange, onEdgesChange,
    handleSaveToCloud, isProjectPermanent,
    deletePerson,
    projectId,
    filters,
    setFilters,
    setNodes,
  } = chartManager;

  // Handle initialization from landing page search (must be after chartManager destructuring)
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const place = searchParams.get('place');
    const action = searchParams.get('action');

    if (lat && lng && place && action === 'birth' && isDataLoaded) {
      // Clear params to avoid re-triggering
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('lat');
      newParams.delete('lng');
      newParams.delete('place');
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });

      // Set landing page prefill - GlobePage will trigger the birth data flow
      setLandingPagePrefill({
        place,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
    }

    if (lat && lng && place && action === 'search' && isDataLoaded) {
      const kindParam = searchParams.get('kind');
      const kind =
        kindParam === 'zip' || kindParam === 'property' || kindParam === 'area'
          ? kindParam
          : 'area';

      const north = searchParams.get('north');
      const south = searchParams.get('south');
      const east = searchParams.get('east');
      const west = searchParams.get('west');
      const bounds =
        north && south && east && west
          ? {
              north: parseFloat(north),
              south: parseFloat(south),
              east: parseFloat(east),
              west: parseFloat(west),
            }
          : undefined;

      // Clear params to avoid re-triggering
      const newParams = new URLSearchParams(searchParams);
      ['lat', 'lng', 'place', 'action', 'kind', 'north', 'south', 'east', 'west'].forEach((k) =>
        newParams.delete(k)
      );
      setSearchParams(newParams, { replace: true });

      setLandingSearchPrefill({
        place,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        kind,
        bounds,
      });
    }
  }, [searchParams, isDataLoaded, setSearchParams]);

  // Sync editingChartId with currentChart on initial load
  useEffect(() => {
    if (birthCharts.currentChart && !editingChartId) {
      setEditingChartId(birthCharts.currentChart.id);
    }
  }, [birthCharts.currentChart, editingChartId]);

  // Handle selecting a saved chart from ChartPickerModal (must be after chartManager destructuring)
  const handleSelectSavedChart = useCallback((chartId: string) => {
    const chart = birthCharts.charts.find(c => c.id === chartId);
    if (!chart) return;

    birthCharts.selectChart(chartId);
    // Track that we're now editing this chart
    setEditingChartId(chartId);

    // Load the chart data into the person node
    const personNodes = nodes.filter(n => n.type === 'person');
    const placeName = chart.city_name || `${chart.latitude.toFixed(4)}, ${chart.longitude.toFixed(4)}`;

    if (personNodes.length > 0) {
      // Update existing person
      const personNode = personNodes[0];
      const personData = personNode.data as PersonData;

      const locations = personData.locations || [];
      const birthLocationIndex = locations.findIndex(loc => loc.type === 'birth');

      let updatedLocations;
      if (birthLocationIndex >= 0) {
        updatedLocations = [...locations];
        updatedLocations[birthLocationIndex] = {
          ...updatedLocations[birthLocationIndex],
          lat: chart.latitude,
          lng: chart.longitude,
          place: placeName,
        };
      } else {
        updatedLocations = [
          ...locations,
          {
            type: 'birth' as const,
            place: placeName,
            lat: chart.latitude,
            lng: chart.longitude,
          },
        ];
      }

      const updatedData = {
        ...personData,
        birthDate: chart.birth_date,
        birthTime: chart.birth_time,
        locations: updatedLocations,
      };

      setNodes((prevNodes: Node<PersonData>[]) =>
        prevNodes.map((n) =>
          n.id === personNode.id
            ? { ...n, data: updatedData }
            : n
        )
      );
    } else {
      // Create new person with saved chart data
      const newPersonId = uuidv4();
      const newPersonData: PersonData = {
        id: newPersonId,
        name: chart.name,
        gender: 'other',
        status: 'alive',
        birthDate: chart.birth_date,
        birthTime: chart.birth_time,
        locations: [
          {
            type: 'birth',
            place: placeName,
            lat: chart.latitude,
            lng: chart.longitude,
          },
        ],
      };

      const newNode: Node<PersonData> = {
        id: newPersonId,
        type: 'person',
        position: { x: 0, y: 0 },
        data: newPersonData,
      };

      setNodes((prevNodes: Node<PersonData>[]) => [...prevNodes, newNode]);
    }

    toast.success(`Loaded chart: ${chart.name}`);
  }, [birthCharts.charts, birthCharts.selectChart, nodes, setNodes]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterMinimized, setFilterMinimized] = useState(true);

  // --- Custom Feedback Modal State ---
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    // Update selectedNodeId when node selection changes
    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter(node => node.selected);
    if (selectedNodes.length === 1) {
      setSelectedNodeId(selectedNodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, [nodes, getNodes]); // Re-run when nodes change (which includes selection changes)


  useEffect(() => {
    // Redirect to guest page on sign out
    if (userRef.current && !user) {
      localStorage.removeItem('familyTreeCurrentProjectId');
      sessionStorage.removeItem('reconciledPayments');
      navigate('/guest');
    }
    userRef.current = !!user;
  }, [user, navigate]);

  useEffect(() => {
    if (isPasswordRecovery) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, setIsAuthModalOpen]);

  useEffect(() => {
    const hasReconciled = sessionStorage.getItem('reconciledPayments');
    if (user && !hasReconciled) {
      const reconcile = async () => {
        const { data, error } = await supabase.functions.invoke('reconcile-payments');

        sessionStorage.setItem('reconciledPayments', 'true');

        if (error) {
          toast.error(`Failed to check for previous payments: ${error.message}`);
        } else if (data?.reconciled > 0) {
          toast.success(`${data.reconciled} previously purchased project(s) have been linked to your account! The page will now reload.`);
          setTimeout(() => window.location.reload(), 2000);
        }
      };
      reconcile();
    }
  }, [user]);

  // Listen for edge edit events
  useEffect(() => {
    const handleEditEdge = (event: CustomEvent) => {
      const { connectionParams, sourceNode, targetNode } = event.detail;
      modalManager.openRelationshipModal(connectionParams, sourceNode, targetNode);
    };

    window.addEventListener('editEdge', handleEditEdge as EventListener);
    return () => {
      window.removeEventListener('editEdge', handleEditEdge as EventListener);
    };
  }, [modalManager]);

  const onConnect = useCallback((params: Edge | Connection) => {
    const sNode = nodes.find(n => n.id === params.source);
    const tNode = nodes.find(n => n.id === params.target);
    if (!sNode || !tNode) {
      toast.error("Node not found for connection.");
      return;
    }
    // Determine relationship type (for UI, you may need to infer or ask user)
    // For now, assume modalManager.openRelationshipModal will set the type
    // But block if the user tries to connect with the wrong handles
    const isUnionConnection = sNode.type === 'union' || tNode.type === 'union';
    const isPartnerConnection = sNode.type === 'person' && tNode.type === 'person';
    if (isPartnerConnection) {
      if (params.sourceHandle !== 'marriage-right' || params.targetHandle !== 'marriage-left') {
        toast.error('Partner relationships must use lateral handles (side-to-side).');
        return;
      }
    }
    if (isUnionConnection) {
      if (params.sourceHandle !== 'child' || params.targetHandle !== 'parent') {
        toast.error('Union parent-child relationships must use top/bottom handles.');
        return;
      }
    }
    modalManager.openRelationshipModal(params, sNode, tNode);
  }, [nodes, modalManager]);

  // For astrocartography: only one person per chart
  // If person exists, edit them; otherwise create new
  const handleAddPerson = () => {
    const personNodes = nodes.filter(n => n.type === 'person');
    if (personNodes.length > 0) {
      // Edit existing person
      openPersonDialog(personNodes[0].data as PersonData);
    } else {
      // Create new person
      openPersonDialog(null);
    }
  };
  const handleEditPerson = (person: PersonData) => openPersonDialog(person);

  // Handle clearing birth data
  const handleClearBirthData = useCallback(() => {
    const personNodes = nodes.filter(n => n.type === 'person');
    if (personNodes.length === 0) {
      return;
    }

    const personNode = personNodes[0];
    const personData = personNode.data as PersonData;

    // Clear birth-related data
    const updatedData = {
      ...personData,
      birthDate: undefined,
      birthTime: undefined,
      locations: personData.locations?.filter(loc => loc.type !== 'birth') || [],
    };

    setNodes((prevNodes: Node<PersonData>[]) =>
      prevNodes.map((n) =>
        n.id === personNode.id
          ? { ...n, data: updatedData }
          : n
      )
    );

    // Save to localStorage for guest projects
    if (!isProjectPermanent && projectId) {
      const projectData = JSON.parse(localStorage.getItem(`guest_project_${projectId}`) || '{}');
      const updatedNodes = projectData.nodes?.map((n: Node<PersonData>) =>
        n.id === personNode.id ? { ...n, data: updatedData } : n
      ) || [];
      projectData.nodes = updatedNodes;
      localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(projectData));
    }

    // Clear editing state so next entry creates new chart
    setEditingChartId(null);

    toast.success('Birth data cleared. Double-tap on the globe to set new birth data.');
  }, [nodes, setNodes, isProjectPermanent, projectId]);

  // Handle birth data creation from globe double-tap (creates new person or updates existing)
  const handleBirthDataCreate = useCallback(async (data: { lat: number; lng: number; date: string; time: string; cityName?: string }) => {
    const personNodes = nodes.filter(n => n.type === 'person');
    const placeName = data.cityName || `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`;
    const chartName = data.cityName ? `${data.cityName} Chart` : 'My Birth Chart';

    // Prepare chart data
    const chartData = {
      name: chartName,
      birth_date: data.date,
      birth_time: data.time,
      latitude: data.lat,
      longitude: data.lng,
      city_name: data.cityName,
    };

    if (personNodes.length > 0) {
      // Update existing person with full birth data
      const personNode = personNodes[0];
      const personData = personNode.data as PersonData;

      const locations = personData.locations || [];
      const birthLocationIndex = locations.findIndex(loc => loc.type === 'birth');

      let updatedLocations;
      if (birthLocationIndex >= 0) {
        updatedLocations = [...locations];
        updatedLocations[birthLocationIndex] = {
          ...updatedLocations[birthLocationIndex],
          lat: data.lat,
          lng: data.lng,
          place: placeName,
        };
      } else {
        updatedLocations = [
          ...locations,
          {
            type: 'birth' as const,
            place: placeName,
            lat: data.lat,
            lng: data.lng,
          },
        ];
      }

      const updatedData = {
        ...personData,
        birthDate: data.date,
        birthTime: data.time,
        locations: updatedLocations,
      };

      setNodes((prevNodes: Node<PersonData>[]) =>
        prevNodes.map((n) =>
          n.id === personNode.id
            ? { ...n, data: updatedData }
            : n
        )
      );

      // Save to localStorage for guest projects
      if (!isProjectPermanent && projectId) {
        const projectData = JSON.parse(localStorage.getItem(`guest_project_${projectId}`) || '{}');
        const updatedNodes = projectData.nodes?.map((n: Node<PersonData>) =>
          n.id === personNode.id ? { ...n, data: updatedData } : n
        ) || [];
        projectData.nodes = updatedNodes;
        localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(projectData));
      }

      // Update or create chart based on whether we're editing
      if (editingChartId) {
        // Update existing chart
        await birthCharts.updateChart(editingChartId, chartData);
        toast.success('Chart updated! Calculating planetary lines...');
      } else {
        // Create new chart
        const newChart = await birthCharts.saveChart(chartData);
        if (newChart) {
          setEditingChartId(newChart.id);
          toast.success('New chart saved! Calculating planetary lines...');
        }
      }
    } else {
      // Create new person with birth data
      const newPersonId = uuidv4();
      const newPersonData: PersonData = {
        id: newPersonId,
        name: '',
        gender: 'other',
        status: 'alive',
        birthDate: data.date,
        birthTime: data.time,
        locations: [
          {
            type: 'birth',
            place: placeName,
            lat: data.lat,
            lng: data.lng,
          },
        ],
      };

      const newNode: Node<PersonData> = {
        id: newPersonId,
        type: 'person',
        position: { x: 0, y: 0 },
        data: newPersonData,
      };

      setNodes((prevNodes: Node<PersonData>[]) => [...prevNodes, newNode]);

      // Save to localStorage for guest projects
      if (!isProjectPermanent && projectId) {
        const projectData = JSON.parse(localStorage.getItem(`guest_project_${projectId}`) || '{}');
        projectData.nodes = [...(projectData.nodes || []), newNode];
        localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(projectData));
      }

      // Always create a new chart when there's no person yet
      const newChart = await birthCharts.saveChart(chartData);
      if (newChart) {
        setEditingChartId(newChart.id);
        toast.success('Chart created! Calculating planetary lines...');
      }
    }
  }, [nodes, setNodes, isProjectPermanent, projectId, birthCharts, editingChartId]);

  // Clear landing page prefill after GlobePage consumes it
  const clearLandingPagePrefill = useCallback(() => {
    setLandingPagePrefill(null);
  }, []);

  // Clear landing search prefill after GlobePage consumes it
  const clearLandingSearchPrefill = useCallback(() => {
    setLandingSearchPrefill(null);
  }, []);

  const handleDeletePersonRequest = useCallback((personId: string) => {
    setPersonToDelete(personId);
  }, []);

  const handleSignIn = () => setIsAuthModalOpen(true);
  const handleNewProject = () => setIsProjectModalOpen(true);
  // Modified handleClearAllDataRequest to call clearProjectData directly
  const handleClearAllDataRequest = () => {
    if (chartManager.clearProjectData) {
      chartManager.clearProjectData();
      toast.success("Project data has been cleared.");
    } else {
      toast.error("Failed to clear project data. Function not available.");
    }
  };
  const handleRenameRequest = () => setIsRenameModalOpen(true);

  useEffect(() => {
    // Redirect authenticated users from /guest to their permanent project
    if (
      user &&
      projectIdFromUrl === undefined && // /guest route has no :projectId param
      isDataLoaded &&
      projectId &&
      projectId !== 'guest' // avoid redirect loop if projectId is literally 'guest'
    ) {
      navigate(`/project/${projectId}`, { replace: true });
    }
  }, [user, projectIdFromUrl, isDataLoaded, projectId, navigate]);

  // --- UNDEFINED ROUTE FIX FOR GUESTS ---
  // Track if we've already redirected to prevent loops
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!user && !hasRedirectedRef.current) {
      // If no projectId in URL or it's literally 'undefined', redirect to a valid guest project route
      if (!projectIdFromUrl || projectIdFromUrl === 'undefined') {
        hasRedirectedRef.current = true;
        const guestProjectId = getOrCreateGuestProjectId();
        // Default to map view
        navigate(`/project/${guestProjectId}/map`, { replace: true });
      }
    }
  }, [user, projectIdFromUrl, navigate]);

  // --- MIGRATION LOGIC: Call this after upgrading guest project to permanent ---
  // Usage: migrateGuestProjectToPermanent(newProjectId)
  function migrateGuestProjectToPermanent(newProjectId: string) {
    const oldProjectId = localStorage.getItem('guestFamilyTreeCurrentProjectId');
    if (oldProjectId && oldProjectId !== newProjectId) {
      // Move guest project data to new permanent id if needed
      const oldKey = `guest_project_${oldProjectId}`;
      const newKey = `guest_project_${newProjectId}`;
      const data = localStorage.getItem(oldKey);
      if (data) {
        localStorage.setItem(newKey, data);
        localStorage.removeItem(oldKey);
      }
      localStorage.setItem('guestFamilyTreeCurrentProjectId', newProjectId);
    }
    // Redirect to new permanent project route
    navigate(`/project/${newProjectId}/map`, { replace: true });
  }

  // View mode change handler (only map view now)
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    navigate(`/project/${projectIdFromUrl}/map`);
  };

  // When a filter changes, update both state and URL
  const handleFilterChange = (filter, value) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
    const newParams = new URLSearchParams(searchParams);
    newParams.set(filter, value);
    setSearchParams(newParams, { replace: true });
  };

  // Track toolbar modal open state
  const [toolbarModalOpen, setToolbarModalOpen] = useState(false);

  // Determine if any modal is open
  const anyModalOpen =
    toolbarModalOpen ||
    modalManager.isProjectModalOpen ||
    modalManager.isRenameModalOpen ||
    modalManager.isAuthModalOpen ||
    modalManager.isPersonDialogOpen ||
    modalManager.isRelationshipModalOpen ||
    modalManager.isClearDataModalOpen ||
    modalManager.isWelcomeDialogOpen;

  // 1. Add showMobileControls state to WorkspaceContent and pass it to FamilyTreeCanvas as a prop.
  const [showMobileControls, setShowMobileControls] = useState(false);

  // Bottom sheet, export panel, legend, AI chat states now managed by uiStore - no longer lifted here

  // Check if birth data exists (for Toolbar mobile button behavior)
  const hasBirthData = useMemo(() => {
    const personNodes = nodes.filter(n => n.type === 'person');
    if (personNodes.length === 0) return false;
    const personData = personNodes[0].data as PersonData;
    const hasBirthLocation = personData.locations?.some(loc => loc.type === 'birth');
    return !!(personData.birthDate && personData.birthTime && hasBirthLocation);
  }, [nodes]);

  // Pending birth location state now managed by globeInteractionStore - no longer lifted here
  // Zone drawing state now managed by globeInteractionStore - no longer lifted here

  // AI Chat state now managed by uiStore - no longer lifted here

  // Local Space mode state now managed by astroStore - no longer lifted here

  // Compatibility state now managed by compatibilityStore - no longer lifted here

  // Natal chart state now managed by natalChartStore - no longer lifted here

  // External city selection state - for favorites menu integration
  const [externalCitySelect, setExternalCitySelect] = useState<{
    lat: number;
    lng: number;
    name: string;
    key: number;
  } | null>(null);

  const handleFavoriteSelect = useCallback((lat: number, lng: number, name: string) => {
    setExternalCitySelect({
      lat,
      lng,
      name,
      key: Date.now(), // Unique key to trigger effect even for same city
    });
  }, []);

  // Welcome toast for new users without birth data (desktop only - mobile uses persistent banner)
  useEffect(() => {
    if (!isDataLoaded) return;

    // Check if we've already shown the welcome message this session
    const hasShownWelcome = sessionStorage.getItem('astro-welcome-shown');
    if (hasShownWelcome) return;

    // Show welcome message after a short delay for better UX (desktop only)
    const timer = setTimeout(() => {
      if (!isMobile) {
        if (!hasBirthData) {
          toast.info(
            '👋 Welcome to Astrocartography! Double-click anywhere on the globe to set your birth location and enter your birth details.',
            {
              duration: 6000,
              id: 'welcome-toast'
            }
          );
        } else {
          toast.success(
            '🌟 Welcome back! Your astrocartography map is ready.',
            {
              duration: 3000,
              id: 'welcome-toast'
            }
          );
        }
      }
      sessionStorage.setItem('astro-welcome-shown', 'true');
    }, 1000);

    return () => clearTimeout(timer);
  }, [isDataLoaded, hasBirthData, isMobile]);

  if (!isDataLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <p className="ml-2 text-slate-500">Mapping your stars...</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-black flex flex-col overflow-hidden"
        style={isMobile ? {
          paddingTop: isBannerShowing
            ? 'calc(112px + env(safe-area-inset-top, 0px))'
            : 'calc(56px + env(safe-area-inset-top, 0px))'
        } : undefined}
      >
        <Toolbar
            // === Project Data ===
            treeName={projectName}
            familyTreeId={projectId}
            isProjectPermanent={isProjectPermanent}
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            isPersonDialogOpen={isPersonDialogOpen}
            // === Action Callbacks ===
            onAddPerson={handleAddPerson}
            onUpgrade={handleUpgrade}
            onSignIn={handleSignIn}
            onRenameRequest={handleRenameRequest}
            onNewProject={handleNewProject}
            onClearAllDataRequest={handleClearAllDataRequest}
            onDeleteNodeConfirmed={(nodeId) => {
              if (deletePerson) {
                deletePerson(nodeId);
                toast.success("Node deleted successfully.");
              } else {
                toast.error("Failed to delete node. Function not available.");
              }
            }}
            onImportFamilyTree={(treeData) => {
              if (chartManager && chartManager.replaceTreeData) {
                chartManager.replaceTreeData(treeData.nodes, treeData.edges);
                toast.success("Chart data imported successfully.");
              } else {
                toast.error("Failed to import chart data. Function not available.");
              }
            }}
            onClearBirthData={handleClearBirthData}
            onOpenChartPicker={() => setShowChartPicker(true)}
            onFavoriteSelect={handleFavoriteSelect}
            // === Charts quick access ===
            charts={birthCharts.charts}
            currentChartId={birthCharts.currentChart?.id ?? null}
            onSelectChart={handleSelectSavedChart}
            // === Optional prop (store has it too, but parent can override) ===
            hasBirthData={hasBirthData}
          />
        <div className="flex-1 relative min-h-0">
          <GlobePage
            // === Data Props ===
            filters={filters}
            nodes={nodes.filter(n => n.type === 'person') as Node<PersonData>[]}
            edges={edges}
            viewMode={viewMode}
            externalCitySelect={externalCitySelect}
            // === Landing Page Flow ===
            landingPagePrefill={landingPagePrefill}
            onLandingPagePrefillConsumed={clearLandingPagePrefill}
            landingSearchPrefill={landingSearchPrefill}
            onLandingSearchPrefillConsumed={clearLandingSearchPrefill}
            // === Action Callbacks (modify parent data) ===
            onFilterChange={handleFilterChange}
            onViewModeChange={handleViewModeChange}
            onBirthDataCreate={handleBirthDataCreate}
            onClearBirthData={handleClearBirthData}
            onSelectChart={handleSelectSavedChart}
            // Note: Most UI state callbacks removed - GlobePage now reads/writes stores directly
            // - isLegendMinimized, showExportPanel → uiStore
            // - zone state → globeInteractionStore
            // - isAIChatOpen → uiStore
            // - mode state → astroStore
            // - compatibility state → compatibilityStore
            // - natal chart state → natalChartStore
          />
        </div>
        <IndexPageModals
          modalManager={modalManager}
          chartManager={chartManager}
          isPasswordRecovery={isPasswordRecovery}
          clearPasswordRecovery={clearPasswordRecovery}
          personToDelete={personToDelete}
          setPersonToDelete={setPersonToDelete}
        />
        {/* Chart Picker Modal for authenticated users */}
        <ChartPickerModal
          open={showChartPicker}
          onOpenChange={setShowChartPicker}
          charts={birthCharts.charts}
          currentChart={birthCharts.currentChart}
          loading={birthCharts.loading}
          onSelectChart={handleSelectSavedChart}
          onDeleteChart={birthCharts.deleteChart}
          onUpdateChart={birthCharts.updateChart}
          onSetDefault={birthCharts.setDefaultChart}
          onCreateNew={() => {
            setShowChartPicker(false);
            setEditingChartId(null); // Clear so next entry creates new chart
            handleClearBirthData(); // Clear current person data for fresh start
            toast.info('Double-tap on the globe to set birth data for a new chart');
          }}
        />
        {/* 2. In the help/feedback button area, render:
            - On desktop: both help and feedback buttons as before.
            - On mobile: only the help button, and only if showMobileControls is true. */}
        {!isMobile && (
          <TooltipProvider>
            <div style={{
              position: 'fixed',
              top: '50%',
              right: 0,
              transform: 'translateY(-50%)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsHelpOpen(true)}
                    className="flex items-center justify-center h-12 px-2 rounded-l bg-neutral-200 text-neutral-600 hover:bg-green-600 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-label="Help"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">Help</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className="flex items-center justify-center h-12 px-2 rounded-l bg-neutral-200 text-neutral-600 hover:bg-blue-600 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Send Feedback"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">Send Feedback</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
        {isMobile && !isAIChatOpen && (
          <div style={{
            position: 'fixed',
            top: isBannerShowing
              ? 'calc(128px + env(safe-area-inset-top, 0px))'
              : 'calc(72px + env(safe-area-inset-top, 0px))',
            right: 0,
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center justify-center h-10 px-2 rounded-l bg-neutral-200 text-neutral-600 active:bg-green-600 active:text-white transition focus:outline-none"
              aria-label="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="flex items-center justify-center h-10 px-2 rounded-l bg-neutral-200 text-neutral-600 active:bg-blue-600 active:text-white transition focus:outline-none"
              aria-label="Send Feedback"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Help Modal */}
        {isHelpOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="dark:bg-black/60"
            onClick={e => {
              if (e.target === e.currentTarget) setIsHelpOpen(false);
            }}
          >
            <div
              style={{
                borderRadius: 12,
                boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                width: '90vw',
                maxWidth: 800,
                height: '80vh',
                maxHeight: 600,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
              className="bg-white dark:bg-slate-900"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header with close and open-in-new-tab buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0 16px', minHeight: 40 }}>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                  aria-label="Close Help Modal"
                >
                  ×
                </button>
                <button
                  onClick={() => window.open('https://astrocartography.featurebase.app/help', '_blank')}
                  className="bg-gray-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-none rounded-md px-3 py-1 text-sm cursor-pointer z-2 hover:bg-green-600 hover:text-white dark:hover:bg-green-700 dark:hover:text-white transition"
                  aria-label="Open Help in New Tab"
                >
                  Open in new tab
                </button>
              </div>
              <iframe
                src="https://astrocartography.featurebase.app/help"
                title="Help Center"
                style={{ flex: 1, border: 'none', borderRadius: 8, width: '100%', height: '100%' }}
                allow="clipboard-write"
              />
            </div>
          </div>
        )}
        {/* Feedback Modal */}
        {isFeedbackOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="dark:bg-black/60"
            onClick={e => {
              if (e.target === e.currentTarget) setIsFeedbackOpen(false);
            }}
          >
            <div
              style={{
                borderRadius: 12,
                boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                width: '90vw',
                maxWidth: 800,
                height: '80vh',
                maxHeight: 600,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
              className="bg-white dark:bg-slate-900"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setIsFeedbackOpen(false)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 16,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  zIndex: 2,
                }}
                aria-label="Close Feedback Modal"
              >
                ×
              </button>
              <iframe
                src="https://astrocartography.featurebase.app/"
                title="Feedback Board"
                style={{ flex: 1, border: 'none', borderRadius: 8, width: '100%', height: '100%' }}
                allow="clipboard-write"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const Workspace = (props) => {
  return (
    <ReactFlowProvider>
      <WorkspaceContent {...props} />
    </ReactFlowProvider>
  )
}

export default Workspace; 