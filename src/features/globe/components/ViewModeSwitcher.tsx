import React from 'react';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';

const ViewModeSwitcher = () => {
  return (
    <Button variant="outline" className="flex items-center gap-2">
      <Map className="w-4 h-4" />
      <span>Map</span>
    </Button>
  );
};

export default ViewModeSwitcher;
