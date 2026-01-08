/**
 * MobileChartsSheet - Bottom sheet for saved birth charts on mobile
 *
 * Displays user's saved charts with ability to select, edit, delete,
 * and set as default. Optimized for touch interactions with virtualized list.
 */

import React, { useState, useCallback } from 'react';
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
  CircleUserRound,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { VirtualList } from '@/lib/patterns';
import type { BirthChart } from '@/hooks/useBirthCharts';
import { cn } from '@/lib/utils';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface MobileChartsSheetProps {
  charts: BirthChart[];
  currentChart: BirthChart | null;
  loading: boolean;
  onSelectChart: (id: string) => void;
  onDeleteChart: (id: string) => Promise<void>;
  onUpdateChart: (id: string, data: { name?: string }) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onCreateNew: () => void;
  onClose: () => void;
}

export const MobileChartsSheet: React.FC<MobileChartsSheetProps> = ({
  charts,
  currentChart,
  loading,
  onSelectChart,
  onDeleteChart,
  onUpdateChart,
  onSetDefault,
  onCreateNew,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

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
    onClose();
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

  const icon = (
    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
      <CircleUserRound className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title="My Charts"
      subtitle={`${charts.length} saved chart${charts.length !== 1 ? 's' : ''}`}
      icon={icon}
      maxHeight="70vh"
      showBackdrop={true}
      onBackdropClick={handleClose}
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <div className="flex flex-col h-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : charts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
              <Star className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2">
              No Saved Charts
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
              Enter your birth data on the globe to create and save a chart
            </p>
          </div>
        ) : (
          <div className="flex-1 px-4 py-3">
            <VirtualList
              items={charts}
              itemHeight={160} // Approximate height of each chart card
              containerHeight={Math.min(charts.length * 160, 400)}
              overscan={2}
              className="overflow-y-auto"
              renderItem={(chart, index, style) => (
                <div key={chart.id} style={{ ...style, paddingBottom: 8 }}>
                  <div
                    className={cn(
                      'relative rounded-xl border p-4 transition-all',
                      'bg-white dark:bg-white/[0.02]',
                      currentChart?.id === chart.id
                        ? 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-500/10'
                        : 'border-slate-200 dark:border-white/10 active:bg-slate-50 dark:active:bg-white/5'
                    )}
                  >
                    {editingId === chart.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div onClick={() => handleSelect(chart.id)}>
                        {/* Header row */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-slate-800 dark:text-white flex-1 truncate">
                            {chart.name}
                          </span>
                          {chart.is_default && (
                            <span className="flex-shrink-0 rounded-full bg-purple-100 dark:bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                              Default
                            </span>
                          )}
                          {currentChart?.id === chart.id && (
                            <Check className="h-5 w-5 text-purple-500 flex-shrink-0" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(chart);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            <Pencil className="h-3 w-3" />
                            Rename
                          </button>
                          {!chart.is_default && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetDefault(chart.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-xs font-medium text-slate-600 dark:text-slate-400"
                            >
                              <Star className="h-3 w-3" />
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(chart.id);
                            }}
                            disabled={deletingId === chart.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 text-xs font-medium text-red-600 dark:text-red-400 ml-auto"
                          >
                            {deletingId === chart.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* Footer with New Chart button */}
        <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Chart
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};

export default MobileChartsSheet;
