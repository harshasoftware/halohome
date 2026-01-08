import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Clock, Map, ChevronDown } from 'lucide-react';
import { ViewMode } from '@/pages/Workspace';

interface ViewModeSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({ viewMode, onViewModeChange }) => {
  const viewOptions: { mode: ViewMode; label: string; icon: React.ElementType }[] = [
    { mode: 'tree', label: 'Tree', icon: Users },
    { mode: 'timeline', label: 'Timeline', icon: Clock },
    { mode: 'map', label: 'Map', icon: Map },
  ];

  const currentView = viewOptions.find(v => v.mode === viewMode) || viewOptions[0];
  const CurrentViewIcon = currentView.icon;

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white dark:bg-slate-950/80 dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-200 w-36 justify-between">
            <div className="flex items-center gap-2">
              <CurrentViewIcon className="w-4 h-4" />
              <span className="capitalize">{currentView.label}</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-36 z-[10000]">
          {viewOptions.map(({ mode, label, icon: Icon }) => (
            <DropdownMenuItem key={mode} onClick={() => onViewModeChange(mode)}>
              <Icon className="w-4 h-4 mr-2" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
