import React from 'react';
import { Slider } from '@/components/ui/slider';

interface TimelineScrubberProps {
  years: number[];
  onYearChange: (year: number) => void;
}

const TimelineScrubber: React.FC<TimelineScrubberProps> = ({ years, onYearChange }) => {
  if (years.length === 0) {
    return null;
  }

  const minYear = years[0];
  const maxYear = years[years.length - 1];

  return (
    <div className="w-full p-4 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">Timeline</span>
      </div>
      <Slider
        min={minYear}
        max={maxYear}
        step={1}
        onValueChange={(value) => onYearChange(value[0])}
        defaultValue={[maxYear]}
        className="[&>span:first-child]:h-1 [&>span:first-child]:bg-gray-600 [&>span:first-child>span]:bg-orange-500 [&_[role=slider]]:bg-orange-500 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white"
      />
      <div className="flex justify-between text-gray-400 text-xs mt-2">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  );
};

export default TimelineScrubber;
