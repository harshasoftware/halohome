/**
 * ChartPickerModal Component
 * Modal for viewing, selecting, and managing saved birth charts
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BirthChart, BirthChartInput } from '@/hooks/useBirthCharts';
import {
  Star,
  Trash2,
  Check,
  Pencil,
  X,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Loader2,
  Search,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import usePlacesAutocomplete, { getGeocode, getLatLng } from '@/hooks/usePlacesAutocompleteNew';

interface ChartPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charts: BirthChart[];
  currentChart: BirthChart | null;
  loading: boolean;
  onSelectChart: (id: string) => void;
  onDeleteChart: (id: string) => Promise<void>;
  onUpdateChart: (id: string, data: Partial<BirthChartInput>) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onCreateNew: () => void;
}

interface EditState {
  name: string;
  birth_date: string;
  birth_time: string;
  city_name: string;
  latitude: number;
  longitude: number;
}

export const ChartPickerModal: React.FC<ChartPickerModalProps> = ({
  open,
  onOpenChange,
  charts,
  currentChart,
  loading,
  onSelectChart,
  onDeleteChart,
  onUpdateChart,
  onSetDefault,
  onCreateNew,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDeleteChart(id);
    setDeletingId(null);
  };

  const handleSelect = (id: string) => {
    onSelectChart(id);
    onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            My Birth Charts
          </DialogTitle>
          <DialogDescription>
            Select a saved chart or create a new one
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : charts.length === 0 ? (
          <div className="py-8 text-center">
            <Star className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              No saved charts yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Set your birth data on the globe to save a chart
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {charts.map((chart) => (
                <div
                  key={chart.id}
                  className={cn(
                    'group relative rounded-lg border p-3 transition-colors',
                    'hover:bg-slate-100 dark:hover:bg-white/5',
                    currentChart?.id === chart.id && 'border-slate-400 dark:border-white/20 bg-slate-100 dark:bg-white/5'
                  )}
                >
                  {editingId === chart.id && editState ? (
                    <div className="space-y-3">
                      {/* Header with back button */}
                      <div className="flex items-center gap-2 pb-2 border-b">
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
                        <label className="text-xs text-muted-foreground">Name</label>
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
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
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
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
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
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Birth Location
                        </label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md shadow-md max-h-48 overflow-y-auto">
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
                        <p className="text-xs text-muted-foreground">
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
                              Save Changes
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
                          <span className="font-medium text-sm">{chart.name}</span>
                          {chart.is_default && (
                            <span className="rounded-full bg-slate-200 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-zinc-300">
                              Default
                            </span>
                          )}
                          {currentChart?.id === chart.id && (
                            <Check className="h-4 w-4 text-slate-600 dark:text-zinc-400 ml-auto" />
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(chart.id);
                          }}
                          disabled={deletingId === chart.id}
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
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Chart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartPickerModal;
