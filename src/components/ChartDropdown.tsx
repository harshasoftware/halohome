/**
 * ChartDropdown Component
 * Dropdown for quickly switching between saved charts or creating a new one
 */

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useBirthCharts } from '@/hooks/useBirthCharts';
import { useHasBirthData } from '@/stores/astroStore';
import {
  Star,
  ChevronDown,
  Plus,
  Check,
  MapPin,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartDropdownProps {
  onOpenChartPicker: () => void;
  onCreateNew: () => void;
}

export const ChartDropdown: React.FC<ChartDropdownProps> = ({
  onOpenChartPicker,
  onCreateNew,
}) => {
  const { charts, currentChart, loading, selectChart } = useBirthCharts();
  const hasBirthData = useHasBirthData();

  const handleSelectChart = (id: string) => {
    selectChart(id);
  };

  // If no birth data and no charts, show "Add Chart" button
  if (!hasBirthData && charts.length === 0) {
    return (
      <Button
        onClick={onCreateNew}
        variant="default"
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Add Chart
      </Button>
    );
  }

  // Get current chart name or default text
  const currentChartName = currentChart?.name || (hasBirthData ? 'Current Chart' : 'My Charts');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Star className="w-4 h-4" />
          <span className="max-w-[120px] truncate">{currentChartName}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>My Charts</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {charts.length === 0 ? (
          <div className="px-2 py-3 text-center">
            <p className="text-sm text-muted-foreground">No saved charts</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Your current chart will appear here once saved
            </p>
          </div>
        ) : (
          <>
            {charts.slice(0, 5).map((chart) => (
              <DropdownMenuItem
                key={chart.id}
                onClick={() => handleSelectChart(chart.id)}
                className={cn(
                  'flex items-start gap-2 cursor-pointer',
                  currentChart?.id === chart.id && 'bg-accent'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{chart.name}</span>
                    {chart.is_default && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  {chart.city_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{chart.city_name}</span>
                    </div>
                  )}
                </div>
                {currentChart?.id === chart.id && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            {charts.length > 5 && (
              <DropdownMenuItem
                onClick={onOpenChartPicker}
                className="text-muted-foreground"
              >
                <span className="text-sm">View all {charts.length} charts...</span>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>New Chart</span>
        </DropdownMenuItem>
        {charts.length > 0 && (
          <DropdownMenuItem onClick={onOpenChartPicker} className="gap-2 text-muted-foreground">
            <Star className="w-4 h-4" />
            <span>Manage Charts...</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChartDropdown;
