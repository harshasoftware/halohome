/**
 * ChartsPanelContent - Content for the charts panel in the right panel stack
 *
 * Displays user's saved birth charts with actions to select, edit, or delete.
 * Supports inline editing of chart details including name, date, time, and location.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  Calendar,
  Clock,
  Loader2,
  Search,
  ChevronLeft,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BirthChart, BirthChartInput } from '@/hooks/useBirthCharts';
import usePlacesAutocomplete, { getGeocode, getLatLng } from '@/hooks/usePlacesAutocompleteNew';

interface ChartsPanelContentProps {
  charts: BirthChart[];
  currentChart: BirthChart | null;
  loading: boolean;
  onSelectChart: (id: string) => void;
  onDeleteChart: (id: string) => Promise<void>;
  onUpdateChart: (id: string, data: Partial<BirthChartInput>) => Promise<void>;
  onSaveChart: (data: BirthChartInput) => Promise<BirthChart | null>;
  onSetDefault: (id: string) => Promise<void>;
  onClose: () => void;
  /** If true, automatically show the create form when panel opens */
  initialShowCreateForm?: boolean;
}

interface EditState {
  name: string;
  birth_date: string;
  birth_time: string;
  city_name: string;
  latitude: number;
  longitude: number;
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<BirthChart | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(initialShowCreateForm);
  const [createState, setCreateState] = useState<EditState | null>(initialShowCreateForm ? {
    name: '',
    birth_date: '',
    birth_time: '12:00',
    city_name: '',
    latitude: 0,
    longitude: 0,
  } : null);
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

  const handleStartEdit = (chart: BirthChart) => {
    setEditingId(chart.id);
    setEditState({
      name: chart.name,
      birth_date: chart.birth_date,
      birth_time: chart.birth_time,
      city_name: chart.city_name || '',
      latitude: chart.latitude,
      longitude: chart.longitude,
    });
    setLocationValue(chart.city_name || '');
  };

  const handleSaveEdit = async () => {
    if (editingId && editState && editState.name.trim()) {
      setSaving(true);
      try {
        await onUpdateChart(editingId, {
          name: editState.name.trim(),
          birth_date: editState.birth_date,
          birth_time: editState.birth_time,
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

  // === Create Chart Handlers ===
  const handleStartCreate = () => {
    setIsCreating(true);
    setCreateState({
      name: '',
      birth_date: '',
      birth_time: '12:00',
      city_name: '',
      latitude: 0,
      longitude: 0,
    });
    setLocationValue('');
  };

  const handleSaveCreate = async () => {
    if (!createState || !createState.name.trim() || !createState.birth_date || !createState.city_name) {
      return;
    }

    setSaving(true);
    try {
      const newChart = await onSaveChart({
        name: createState.name.trim(),
        birth_date: createState.birth_date,
        birth_time: createState.birth_time,
        city_name: createState.city_name,
        latitude: createState.latitude,
        longitude: createState.longitude,
      });

      if (newChart) {
        // Select the new chart and close create form
        onSelectChart(newChart.id);
        setIsCreating(false);
        setCreateState(null);
        setLocationValue('');
        clearSuggestions();
        // Close the panel to navigate to the globe with new chart
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
      const { lat, lng } = await getLatLng(results[0]);
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
      const { lat, lng } = await getLatLng(results[0]);
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

  const handleDeleteClick = (chart: BirthChart) => {
    setChartToDelete(chart);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!chartToDelete) return;
    setDeletingId(chartToDelete.id);
    await onDeleteChart(chartToDelete.id);
    setDeletingId(null);
    setShowDeleteConfirm(false);
    setChartToDelete(null);
  };

  const handleSelect = (id: string) => {
    onSelectChart(id);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
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

        {/* Charts list skeleton */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg border-slate-200 dark:border-white/10">
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              My Charts
            </h2>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 flex-1 min-h-[300px] text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
            No Charts Yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mb-4">
            Set your birth data on the globe to save a chart
          </p>
          <Button onClick={handleStartCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Chart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            My Charts
          </h2>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            {charts.length} {charts.length === 1 ? 'chart' : 'charts'}
          </span>
        </div>
      </div>

      {/* New Chart Button or Create Form */}
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
              <span className="text-sm font-medium">New Chart</span>
            </div>

            {/* Name field */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
              <Input
                value={createState.name}
                onChange={(e) => setCreateState({ ...createState, name: e.target.value })}
                className="h-9"
                placeholder="Chart name"
                autoFocus
              />
            </div>

            {/* Date and Time row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Birth Date
                </label>
                <Input
                  type="date"
                  value={createState.birth_date}
                  onChange={(e) => setCreateState({ ...createState, birth_date: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Birth Time
                </label>
                <Input
                  type="time"
                  value={createState.birth_time}
                  onChange={(e) => setCreateState({ ...createState, birth_time: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Location field */}
            <div className="space-y-1 relative">
              <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Birth Location
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
                disabled={saving || !createState.name.trim() || !createState.birth_date || !createState.city_name}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Create Chart
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={handleStartCreate} variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Chart
          </Button>
        )}
      </div>

      {/* Charts List - scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className={cn(
                'group relative rounded-lg border p-3 transition-colors',
                'hover:bg-slate-50 dark:hover:bg-white/5',
                currentChart?.id === chart.id && 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              )}
            >
              {editingId === chart.id && editState ? (
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
                    <span className="text-sm font-medium">Edit Chart</span>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
                    <Input
                      value={editState.name}
                      onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                      className="h-9"
                      placeholder="Chart name"
                    />
                  </div>

                  {/* Date and Time row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Birth Date
                      </label>
                      <Input
                        type="date"
                        value={editState.birth_date}
                        onChange={(e) => setEditState({ ...editState, birth_date: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Birth Time
                      </label>
                      <Input
                        type="time"
                        value={editState.birth_time}
                        onChange={(e) => setEditState({ ...editState, birth_time: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Location field */}
                  <div className="space-y-1 relative">
                    <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Birth Location
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
                    onClick={() => handleSelect(chart.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800 dark:text-white">{chart.name}</span>
                      {chart.is_default && (
                        <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                          Default
                        </span>
                      )}
                      {currentChart?.id === chart.id && (
                        <Check className="h-4 w-4 text-indigo-500 ml-auto" />
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {chart.city_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {chart.city_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(chart.birth_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(chart.birth_time)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(chart);
                      }}
                      title="Edit chart"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!chart.is_default && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefault(chart.id);
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
                        handleDeleteClick(chart);
                      }}
                      disabled={deletingId === chart.id}
                      title="Delete chart"
                    >
                      {deletingId === chart.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{chartToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This birth chart will be permanently removed.
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
              {deletingId !== null ? 'Deleting...' : 'Delete Chart'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChartsPanelContent;
