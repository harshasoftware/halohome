import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonData, LocationEvent } from '@/types/familyTree';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MapPin, Calendar, Clock } from 'lucide-react';
import LocationInput from './PersonDialogParts/LocationInput';

interface BirthLocationPrefill {
  place: string;
  lat: number;
  lng: number;
}

interface BirthDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: PersonData | null;
  onSave: (personData: Partial<PersonData>) => void;
  prefill?: BirthLocationPrefill | null;
}

export const BirthDataDialog: React.FC<BirthDataDialogProps> = ({
  open,
  onOpenChange,
  person,
  onSave,
  prefill,
}) => {
  const isMobile = useIsMobile();

  const [formData, setFormData] = useState<Partial<PersonData>>({
    name: '',
    birthDate: '',
    birthTime: '',
    gender: 'other',
    status: 'alive',
    locations: [],
  });

  const [birthLocation, setBirthLocation] = useState<Partial<LocationEvent>>({
    type: 'birth',
    place: '',
    lat: undefined,
    lng: undefined,
  });

  // Initialize form with existing person data or prefill
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        birthDate: person.birthDate || '',
        birthTime: person.birthTime || '',
        gender: person.gender || 'other',
        status: person.status || 'alive',
        locations: person.locations || [],
      });

      // Find existing birth location
      const existingBirthLocation = person.locations?.find(loc => loc.type === 'birth');
      if (existingBirthLocation) {
        setBirthLocation(existingBirthLocation);
      }
    } else {
      // Reset form for new entry
      setFormData({
        name: '',
        birthDate: '',
        birthTime: '',
        gender: 'other',
        status: 'alive',
        locations: [],
      });

      // Use prefill data if available (from landing page)
      if (prefill) {
        setBirthLocation({
          type: 'birth',
          place: prefill.place,
          lat: prefill.lat,
          lng: prefill.lng,
        });
      } else {
        setBirthLocation({
          type: 'birth',
          place: '',
          lat: undefined,
          lng: undefined,
        });
      }
    }
  }, [person, open, prefill]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.birthDate) {
      toast.error('Birth date is required for astrocartography.');
      return;
    }

    if (!formData.birthTime) {
      toast.error('Birth time is required for accurate planetary positions.');
      return;
    }

    if (!birthLocation.place || !birthLocation.lat || !birthLocation.lng) {
      toast.error('Birth location with coordinates is required.');
      return;
    }

    // Create the locations array with birth location
    const locations: LocationEvent[] = [
      {
        type: 'birth',
        place: birthLocation.place,
        lat: birthLocation.lat,
        lng: birthLocation.lng,
        date: formData.birthDate,
      }
    ];

    const dataToSave: Partial<PersonData> = {
      ...formData,
      name: formData.name || 'My Home',
      locations,
    };

    onSave(dataToSave);
    toast.success(person ? 'Birth data updated!' : 'Birth data saved!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile
            ? 'flex-1 flex flex-col h-full'
            : 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full flex flex-col'
        }
        style={isMobile ? { padding: 0 } : {}}
        mobileFullScreen={isMobile}
        showCloseButton={false}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 ${isMobile ? 'pt-6 pb-4' : 'pt-4 pb-2'} border-b border-slate-200 dark:border-slate-800`}>
          <div style={{ width: 44 }} />
          <DialogTitle className={`flex-1 text-center select-none font-semibold ${isMobile ? 'text-xl' : 'text-lg'}`}>
            {person ? 'Edit Birth Data' : 'Enter Birth Data'}
          </DialogTitle>
          <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DialogPrimitive.Close asChild>
              <button
                className="border border-slate-300 dark:border-slate-700 bg-transparent rounded-full p-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none active:bg-slate-200 dark:active:bg-slate-700"
                aria-label="Close"
                style={{ width: 44, height: 44 }}
                type="button"
              >
                <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l8 8M6 14L14 6" />
                </svg>
              </button>
            </DialogPrimitive.Close>
          </div>
        </div>

        {/* Form */}
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-5 py-6' : 'px-4 py-4'}`}>
          <form onSubmit={handleSubmit} id="birth-data-form" className={`${isMobile ? 'space-y-8' : 'space-y-6'}`}>
            {/* Intro text */}
            <p className={`text-slate-600 dark:text-slate-400 text-center ${isMobile ? 'text-base' : 'text-sm'}`}>
              Enter your birth details to generate your personalized astrocartography map.
            </p>

            {/* Birth Date */}
            <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
              <Label htmlFor="birthDate" className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <Calendar className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                Birth Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate || ''}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                required
                className={`block w-full ${isMobile ? 'h-14 text-lg' : ''}`}
              />
            </div>

            {/* Birth Time */}
            <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
              <Label htmlFor="birthTime" className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <Clock className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                Birth Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthTime"
                type="time"
                value={formData.birthTime || ''}
                onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                required
                className={`block w-full ${isMobile ? 'h-14 text-lg' : ''}`}
              />
              <p className={`text-slate-500 dark:text-slate-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                Exact birth time is crucial for accurate planetary line positions.
              </p>
            </div>

            {/* Birth Location */}
            <div className={`${isMobile ? 'space-y-3' : 'space-y-2'}`}>
              <Label className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <MapPin className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                Birth Location <span className="text-red-500">*</span>
              </Label>
              <LocationInput
                value={birthLocation.place || ''}
                onChange={(location) => {
                  setBirthLocation({
                    ...birthLocation,
                    place: location.place || '',
                    lat: location.lat,
                    lng: location.lng,
                  });
                }}
              />
              {birthLocation.lat && birthLocation.lng && (
                <p className={`text-green-600 dark:text-green-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                  Coordinates: {birthLocation.lat.toFixed(4)}, {birthLocation.lng.toFixed(4)}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={`w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-3 ${isMobile ? 'px-5 py-4 pb-8' : 'px-4 py-3'}`}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={`flex-1 ${isMobile ? 'h-14 text-lg' : ''}`}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="birth-data-form"
            className={`flex-1 ${isMobile ? 'h-14 text-lg' : ''}`}
          >
            {person ? 'Update' : 'Generate Map'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
