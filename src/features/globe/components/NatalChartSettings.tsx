/**
 * NatalChartSettings Component
 * Settings panel for natal chart configuration
 * Supports house system selection and tropical/sidereal zodiac toggle
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2, Home, Moon } from 'lucide-react';
import type { HouseSystem, ZodiacType, NatalChartSettings as NatalSettings } from '@/lib/astro-types';

interface NatalChartSettingsProps {
  settings: NatalSettings;
  onSettingsChange: (settings: NatalSettings) => void;
  compact?: boolean;
}

const HOUSE_SYSTEMS: { value: HouseSystem; label: string; description: string }[] = [
  { value: 'placidus', label: 'Placidus', description: 'Most popular Western system' },
  { value: 'whole_sign', label: 'Whole Sign', description: 'Traditional/Vedic style' },
  { value: 'equal', label: 'Equal', description: 'Equal 30° houses from ASC' },
  { value: 'koch', label: 'Koch', description: 'Alternative time-based system' },
  { value: 'campanus', label: 'Campanus', description: 'Space-based system' },
  { value: 'regiomontanus', label: 'Regiomontanus', description: 'Medieval system' },
];

export const NatalChartSettings: React.FC<NatalChartSettingsProps> = ({
  settings,
  onSettingsChange,
  compact = false,
}) => {
  const handleHouseSystemChange = (value: HouseSystem) => {
    onSettingsChange({
      ...settings,
      houseSystem: value,
    });
  };

  const handleZodiacToggle = (useSidereal: boolean) => {
    onSettingsChange({
      ...settings,
      zodiacType: useSidereal ? 'sidereal' : 'tropical',
    });
  };

  const handleShowHousesToggle = (show: boolean) => {
    onSettingsChange({
      ...settings,
      showHouses: show,
    });
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* House System Select - Compact */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Houses</span>
          </div>
          <Select value={settings.houseSystem} onValueChange={handleHouseSystemChange}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOUSE_SYSTEMS.map((system) => (
                <SelectItem key={system.value} value={system.value} className="text-xs">
                  {system.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vedic Toggle - Compact */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Vedic (Sidereal)</span>
          </div>
          <Switch
            checked={settings.zodiacType === 'sidereal'}
            onCheckedChange={handleZodiacToggle}
            className="scale-75"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
        <Settings2 className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Chart Settings</span>
      </div>

      {/* House System Select */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5" />
          House System
        </Label>
        <Select value={settings.houseSystem} onValueChange={handleHouseSystemChange}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOUSE_SYSTEMS.map((system) => (
              <SelectItem key={system.value} value={system.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{system.label}</span>
                  <span className="text-xs text-slate-500">{system.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zodiac Type Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5" />
          <div>
            <span>Vedic / Sidereal</span>
            <p className="text-[10px] text-slate-400 font-normal">
              Uses Lahiri ayanamsa
            </p>
          </div>
        </Label>
        <Switch
          checked={settings.zodiacType === 'sidereal'}
          onCheckedChange={handleZodiacToggle}
        />
      </div>

      {/* Show Houses Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Show House Lines
        </Label>
        <Switch
          checked={settings.showHouses}
          onCheckedChange={handleShowHousesToggle}
        />
      </div>

      {/* Zodiac Info */}
      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
        {settings.zodiacType === 'sidereal' ? (
          <>
            <strong className="text-amber-600 dark:text-amber-400">Sidereal Zodiac</strong>
            <p className="mt-1">
              Uses fixed star positions (Vedic/Jyotish astrology). Signs are aligned with their constellation namesakes.
            </p>
          </>
        ) : (
          <>
            <strong className="text-blue-600 dark:text-blue-400">Tropical Zodiac</strong>
            <p className="mt-1">
              Uses seasonal positions (Western astrology). 0° Aries = Spring equinox.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default NatalChartSettings;
