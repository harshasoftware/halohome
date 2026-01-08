import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { GenderIcon } from './GenderIcon';
import { StatusIcon } from './StatusIcon';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { createPortal } from 'react-dom';

interface FilterPaneProps {
  onFilterChange: (filter: string, value: string) => void;
  locationsCount: number;
  horizontal?: boolean;
  onMinimize?: () => void;
  showBorder?: boolean;
}

export const FilterPane: React.FC<FilterPaneProps> = ({ onFilterChange, locationsCount, horizontal = false, onMinimize }) => {
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const isMobile = useIsMobile();

  const handleGenderChange = (gender: string) => {
    setSelectedGender(gender);
    onFilterChange('gender', gender);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    onFilterChange('status', status);
  };

  const generateDescription = () => {
    let description = `Showing ${locationsCount}`;

    if (selectedGender !== 'all') {
      description += ` ${selectedGender}${locationsCount === 1 ? '' : 's'}`;
    } else {
      description += ` individual${locationsCount === 1 ? '' : 's'}`;
    }

    if (selectedStatus !== 'all') {
      description += ` who are ${selectedStatus}`;
    }

    return description;
  };

  // Layout classes
  const containerClass = horizontal ? 'flex flex-row gap-8 items-end' : 'flex flex-col gap-8 items-start';
  const groupClass = horizontal ? 'flex flex-col gap-2' : 'flex flex-col gap-2';
  const optionsClass = horizontal ? 'flex items-center space-x-2' : 'flex flex-row items-center gap-2';

  const cardClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-[10000] rounded-t-2xl shadow-2xl'
    : 'relative z-10 min-w-[320px] max-w-[400px] bg-white dark:bg-slate-900 rounded-lg shadow-lg';

  const cardContent = (
    <TooltipProvider>
      <Card className={cardClass}>
        <CardHeader className="flex flex-row items-start justify-between p-6 pb-2">
          <div>
            <CardTitle className="text-lg font-bold">Filters</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {generateDescription()}
            </div>
          </div>
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="ml-2 mt-1 p-1 rounded hover:bg-muted"
              aria-label="Minimize Filters"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <div className={containerClass}>
            <div className={groupClass}>
              <Label>Gender</Label>
              <div className={optionsClass}>
                <div
                  className={cn(
                    'cursor-pointer rounded-full p-1',
                    selectedGender === 'all' && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleGenderChange('all')}
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                    All
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        'cursor-pointer rounded-full p-1',
                        selectedGender === 'male' && 'border-2 border-blue-500'
                      )}
                      onClick={() => handleGenderChange('male')}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <GenderIcon gender="male" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Male</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        'cursor-pointer rounded-full p-1',
                        selectedGender === 'female' && 'border-2 border-pink-500'
                      )}
                      onClick={() => handleGenderChange('female')}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <GenderIcon gender="female" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Female</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className={groupClass}>
              <Label>Status</Label>
              <div className={optionsClass}>
                <div
                  className={cn(
                    'cursor-pointer rounded-full p-1',
                    selectedStatus === 'all' && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleStatusChange('all')}
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                    All
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        'cursor-pointer rounded-full p-1',
                        selectedStatus === 'alive' && 'border-2 border-green-500'
                      )}
                      onClick={() => handleStatusChange('alive')}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <StatusIcon status="alive" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Alive</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        'cursor-pointer rounded-full p-1',
                        selectedStatus === 'dead' && 'border-2 border-red-500'
                      )}
                      onClick={() => handleStatusChange('dead')}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <StatusIcon status="dead" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dead</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );

  if (isMobile) {
    return createPortal(cardContent, document.body);
  }
  return cardContent;
};
