/**
 * ChartPickerModal Component
 * Modal for viewing, selecting, and managing saved birth charts
 */

import React, { useState } from 'react';
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
import { BirthChart } from '@/hooks/useBirthCharts';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charts: BirthChart[];
  currentChart: BirthChart | null;
  loading: boolean;
  onSelectChart: (id: string) => void;
  onDeleteChart: (id: string) => Promise<void>;
  onUpdateChart: (id: string, data: { name?: string }) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onCreateNew: () => void;
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
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStartEdit = (chart: BirthChart) => {
    setEditingId(chart.id);
    setEditName(chart.name);
  };

  const handleSaveEdit = async () => {
    if (editingId && editName.trim()) {
      await onUpdateChart(editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
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
                    'group relative rounded-lg border p-3 transition-colors hover:bg-accent/50',
                    currentChart?.id === chart.id && 'border-primary bg-accent/30'
                  )}
                >
                  {editingId === chart.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
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
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Default
                            </span>
                          )}
                          {currentChart?.id === chart.id && (
                            <Check className="h-4 w-4 text-primary ml-auto" />
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
