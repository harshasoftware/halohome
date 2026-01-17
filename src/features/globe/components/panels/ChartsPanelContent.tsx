/**
 * ChartsPanelContent - Content for the charts/locations panel in the right panel stack
 *
 * Displays user's saved locations with tabs for:
 * - Addresses: Individual location searches
 * - Zip Scouts: Saved zip code scout results
 *
 * Features favorites toggle and filtering.
 *
 * Note: Reuses BirthChart types for backwards compatibility with database schema.
 * birth_date and birth_time are stored with dummy values for address-only entries.
 */

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Star,
  Trash2,
  Check,
  Pencil,
  Plus,
  MapPin,
  Loader2,
  ChevronLeft,
  Map,
  Heart,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BirthChart, BirthChartInput } from '@/hooks/useBirthCharts';
import usePlacesAutocomplete, { getGeocode, getLatLng } from '@/hooks/usePlacesAutocompleteNew';
import { useScoutOverallResults, useIsScoutComplete, useScoutPopulationTier } from '@/stores/scoutStore';
import type { OverallScoutLocation } from '@/features/globe/utils/scout-utils';

// Type aliases for clarity (uses BirthChart for DB compatibility)
type SavedLocation = BirthChart;
type SavedLocationInput = BirthChartInput;

interface ChartsPanelContentProps {
  charts: SavedLocation[];
  currentChart: SavedLocation | null;
  loading: boolean;
  onSelectChart: (id: string) => void;
  onDeleteChart: (id: string) => Promise<void>;
  onUpdateChart: (id: string, data: Partial<SavedLocationInput>) => Promise<void>;
  onSaveChart: (data: SavedLocationInput) => Promise<SavedLocation | null>;
  onSetDefault: (id: string) => Promise<void>;
  onClose: () => void;
  /** If true, automatically show the create form when panel opens */
  initialShowCreateForm?: boolean;
}

interface EditState {
  name: string;
  city_name: string;
  latitude: number;
  longitude: number;
  is_favorite?: boolean;
}

type TabValue = 'addresses' | 'scouts';

export const ChartsPanelContent: React.FC<ChartsPanelContentProps> = ({
  charts,
  currentChart,
  loading,
  onSelectChart,
  onDeleteChart,
  onUpdateChart,
  onSaveChart,
  onSetDefault,
  onClose,
  initialShowCreateForm = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabValue>('addresses');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Scout store state
  const scoutResults = useScoutOverallResults();
  const isScoutComplete = useIsScoutComplete();
  const populationTier = useScoutPopulationTier();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<SavedLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(initialShowCreateForm);
  const [createState, setCreateState] = useState<EditState | null>(initialShowCreateForm ? {
    name: '',
    city_name: '',
    latitude: 0,
    longitude: 0,
  } : null);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Places autocomplete for location editing
  const {
    value: locationValue,
    setValue: setLocationValue,
    suggestions,
    clearSuggestions,
  } = usePlacesAutocomplete({
    debounce: 300,
  });

  // Filter charts based on favorites toggle
  const filteredCharts = useMemo(() => {
    if (!showFavoritesOnly) return charts;
    return charts.filter(chart => chart.is_favorite);
  }, [charts, showFavoritesOnly]);

  // Count favorites
  const favoritesCount = useMemo(() => {
    return charts.filter(chart => chart.is_favorite).length;
  }, [charts]);

  const handleStartEdit = (location: SavedLocation) => {
    setEditingId(location.id);
    setEditState({
      name: location.name,
      city_name: location.city_name || '',
      latitude: location.latitude,
      longitude: location.longitude,
      is_favorite: location.is_favorite,
    });
    setLocationValue(location.city_name || '');
  };

  const handleSaveEdit = async () => {
    if (editingId && editState && editState.name.trim()) {
      setSaving(true);
      try {
        await onUpdateChart(editingId, {
          name: editState.name.trim(),
          city_name: editState.city_name || null,
          latitude: editState.latitude,
          longitude: editState.longitude,
        });
        setEditingId(null);
        setEditState(null);
        setLocationValue('');
        clearSuggestions();
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditState(null);
    setLocationValue('');
    clearSuggestions();
  };

  // === Create Location Handlers ===
  const handleStartCreate = () => {
    setIsCreating(true);
    setCreateState({
      name: '',
      city_name: '',
      latitude: 0,
      longitude: 0,
    });
    setLocationValue('');
  };

  const handleSaveCreate = async () => {
    if (!createState || !createState.name.trim() || !createState.city_name) {
      return;
    }

    setSaving(true);
    try {
      // Use dummy values for birth_date/birth_time (required by DB schema)
      const newLocation = await onSaveChart({
        name: createState.name.trim(),
        birth_date: '2000-01-01', // Dummy value for DB compatibility
        birth_time: '12:00', // Dummy value for DB compatibility
        city_name: createState.city_name,
        latitude: createState.latitude,
        longitude: createState.longitude,
      });

      if (newLocation) {
        // Select the new location and close create form
        onSelectChart(newLocation.id);
        setIsCreating(false);
        setCreateState(null);
        setLocationValue('');
        clearSuggestions();
        // Close the panel to navigate to the map with new location
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setCreateState(null);
    setLocationValue('');
    clearSuggestions();
  };

  const handleCreateLocationSelect = async (suggestion: { description: string; place_id: string }) => {
    setLocationValue(suggestion.description);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId: suggestion.place_id });
      const { lat, lng } = getLatLng(results[0]);
      setCreateState(prev => prev ? {
        ...prev,
        city_name: suggestion.description,
        latitude: lat,
        longitude: lng,
      } : null);
    } catch (error) {
      console.error('Error getting location coordinates:', error);
    }
  };

  const handleLocationSelect = async (suggestion: { description: string; place_id: string }) => {
    setLocationValue(suggestion.description);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId: suggestion.place_id });
      const { lat, lng } = getLatLng(results[0]);
      setEditState(prev => prev ? {
        ...prev,
        city_name: suggestion.description,
        latitude: lat,
        longitude: lng,
      } : null);
    } catch (error) {
      console.error('Error getting location coordinates:', error);
    }
  };

  const handleDeleteClick = (location: SavedLocation) => {
    setLocationToDelete(location);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;
    setDeletingId(locationToDelete.id);
    await onDeleteChart(locationToDelete.id);
    setDeletingId(null);
    setShowDeleteConfirm(false);
    setLocationToDelete(null);
  };

  const handleSelect = (id: string) => {
    onSelectChart(id);
  };

  const handleToggleFavorite = async (location: SavedLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingFavorite(location.id);
    try {
      await onUpdateChart(location.id, {
        is_favorite: !location.is_favorite,
      });
    } finally {
      setTogglingFavorite(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="ml-auto h-4 w-12" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        {/* List skeleton */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg border-slate-200 dark:border-white/10">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  const renderEmptyState = (type: 'addresses' | 'scouts') => (
    <div className="flex flex-col items-center justify-center p-8 flex-1 min-h-[300px] text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        {type === 'addresses' ? (
          <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        ) : (
          <Map className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        )}
      </div>
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
        {showFavoritesOnly
          ? 'No Favorites Yet'
          : type === 'addresses'
            ? 'No Saved Addresses'
            : 'No Scout History'
        }
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mb-4">
        {showFavoritesOnly
          ? 'Mark locations as favorites to see them here'
          : type === 'addresses'
            ? 'Search for addresses on the map to save them here'
            : 'Run a zip code scout to see results here'
        }
      </p>
      {type === 'addresses' && !showFavoritesOnly && (
        <Button onClick={handleStartCreate} className="gap-2 bg-[#d4a5a5] hover:bg-[#c49393]">
          <Plus className="h-4 w-4" />
          Add Address
        </Button>
      )}
    </div>
  );

  const renderLocationCard = (location: SavedLocation) => (
    <div
      key={location.id}
      className={cn(
        'group relative rounded-lg border p-3 transition-colors',
        'hover:bg-slate-50 dark:hover:bg-white/5',
        currentChart?.id === location.id && 'border-[#d4a5a5] dark:border-[#d4a5a5] bg-[#d4a5a5]/10'
      )}
    >
      {editingId === location.id && editState ? (
        <div className="space-y-3">
          {/* Header with back button */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleCancelEdit}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">Edit Location</span>
          </div>

          {/* Name field */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
            <Input
              value={editState.name}
              onChange={(e) => setEditState({ ...editState, name: e.target.value })}
              className="h-9"
              placeholder="Location name"
            />
          </div>

          {/* Location field */}
          <div className="space-y-1 relative">
            <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                ref={locationInputRef}
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                className="h-9 pl-8"
                placeholder="Search city..."
              />
            </div>
            {/* Location suggestions dropdown */}
            {suggestions.status === 'OK' && suggestions.data.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-md shadow-md max-h-48 overflow-y-auto">
                {suggestions.data.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    onClick={() => handleLocationSelect(suggestion)}
                  >
                    {suggestion.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current coordinates display */}
          {editState.latitude && editState.longitude && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Coordinates: {editState.latitude.toFixed(4)}, {editState.longitude.toFixed(4)}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving || !editState.name.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="cursor-pointer"
            onClick={() => handleSelect(location.id)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-slate-800 dark:text-white">{location.name}</span>
              {location.is_favorite && (
                <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
              )}
              {location.is_default && (
                <span className="rounded-full bg-[#d4a5a5]/20 px-2 py-0.5 text-xs font-medium text-[#d4a5a5]">
                  Default
                </span>
              )}
              {currentChart?.id === location.id && (
                <Check className="h-4 w-4 text-[#d4a5a5] ml-auto" />
              )}
            </div>

            {location.city_name && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.city_name}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7",
                location.is_favorite && "text-red-500"
              )}
              onClick={(e) => handleToggleFavorite(location, e)}
              disabled={togglingFavorite === location.id}
              title={location.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {togglingFavorite === location.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Heart className={cn("h-3.5 w-3.5", location.is_favorite && "fill-current")} />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(location);
              }}
              title="Edit location"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {!location.is_default && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault(location.id);
                }}
                title="Set as default"
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(location);
              }}
              disabled={deletingId === location.id}
              title="Delete location"
            >
              {deletingId === location.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#d4a5a5]" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            My Locations
          </h2>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            {filteredCharts.length} {filteredCharts.length === 1 ? 'location' : 'locations'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex flex-col flex-1 min-h-0">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="addresses" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="scouts" className="gap-1.5">
              <Map className="h-3.5 w-3.5" />
              Zip Scouts
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Favorites Filter */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            className={cn(
              "w-full gap-2",
              showFavoritesOnly && "bg-red-500 hover:bg-red-600"
            )}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Heart className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
            {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites Only'}
            {favoritesCount > 0 && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                showFavoritesOnly
                  ? "bg-white/20 text-white"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300"
              )}>
                {favoritesCount}
              </span>
            )}
          </Button>
        </div>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="flex-1 min-h-0 mt-0 flex flex-col">
          {/* New Address Button or Create Form */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
            {isCreating && createState ? (
              <div className="space-y-3">
                {/* Header with back button */}
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handleCancelCreate}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">New Address</span>
                </div>

                {/* Name field */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
                  <Input
                    value={createState.name}
                    onChange={(e) => setCreateState({ ...createState, name: e.target.value })}
                    className="h-9"
                    placeholder="Address name"
                    autoFocus
                  />
                </div>

                {/* Location field */}
                <div className="space-y-1 relative">
                  <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={locationValue}
                      onChange={(e) => setLocationValue(e.target.value)}
                      className="h-9 pl-8"
                      placeholder="Search city..."
                    />
                  </div>
                  {/* Location suggestions dropdown */}
                  {suggestions.status === 'OK' && suggestions.data.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-md shadow-md max-h-48 overflow-y-auto">
                      {suggestions.data.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          onClick={() => handleCreateLocationSelect(suggestion)}
                        >
                          {suggestion.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current coordinates display */}
                {createState.latitude !== 0 && createState.longitude !== 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Coordinates: {createState.latitude.toFixed(4)}, {createState.longitude.toFixed(4)}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelCreate}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveCreate}
                    disabled={saving || !createState.name.trim() || !createState.city_name}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Save Address
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleStartCreate} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                New Address
              </Button>
            )}
          </div>

          {/* Addresses List */}
          {filteredCharts.length === 0 ? (
            renderEmptyState('addresses')
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-2">
                {filteredCharts.map(renderLocationCard)}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Scouts Tab */}
        <TabsContent value="scouts" className="flex-1 min-h-0 mt-0 flex flex-col">
          {isScoutComplete && scoutResults && scoutResults.length > 0 ? (
            <>
              {/* Scout Info Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Population: <span className="font-medium text-slate-800 dark:text-white">{populationTier}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {scoutResults.length} cities found
                  </span>
                </div>
              </div>

              {/* Scout Results List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-2">
                  {scoutResults.slice(0, 50).map((result: OverallScoutLocation, index: number) => (
                    <div
                      key={`${result.city.name}-${result.city.country}-${index}`}
                      className={cn(
                        'group relative rounded-lg border p-3 transition-colors',
                        'hover:bg-slate-50 dark:hover:bg-white/5',
                        'border-slate-200 dark:border-white/10'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-800 dark:text-white">
                              {result.city.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {result.city.country}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Globe className="h-3 w-3" />
                            <span>{result.city.lat.toFixed(2)}, {result.city.lng.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            result.totalScore > 0
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : result.totalScore < 0
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}>
                            <TrendingUp className={cn("h-3 w-3", result.totalScore < 0 && "rotate-180")} />
                            {result.totalScore > 0 ? '+' : ''}{result.totalScore.toFixed(1)}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {result.beneficialCategories}+ / {result.challengingCategories}-
                          </span>
                        </div>
                      </div>

                      {/* Category breakdown */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {result.categoryScores.slice(0, 4).map((cat) => (
                          <span
                            key={cat.category}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium",
                              cat.nature === 'beneficial'
                                ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                                : cat.nature === 'challenging'
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-500"
                            )}
                          >
                            {cat.category}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            renderEmptyState('scouts')
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{locationToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This location will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deletingId !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId !== null ? 'Deleting...' : 'Delete Location'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChartsPanelContent;
