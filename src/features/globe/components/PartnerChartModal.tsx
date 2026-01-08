/**
 * PartnerChartModal Component
 * Multi-step modal for entering partner birth data for compatibility mode
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Heart,
  X,
  Search,
  Loader2,
  Users,
  Check
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import usePlacesAutocomplete, { getGeocode, getLatLng } from '@/hooks/usePlacesAutocompleteNew';
import type { PartnerChartData } from '../hooks/useCompatibilityMode';
import type { BirthChart } from '@/hooks/useBirthCharts';

interface PartnerChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: PartnerChartData) => void;
  savedCharts?: BirthChart[]; // Saved partner charts to select from
  existingPartner?: PartnerChartData | null; // Existing partner data for editing
  isMobile?: boolean;
}

type Step = 'select' | 'name' | 'date' | 'time' | 'location' | 'confirm';

export const PartnerChartModal: React.FC<PartnerChartModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  savedCharts = [],
  existingPartner,
  isMobile = false,
}) => {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [cityName, setCityName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Places autocomplete for city search
  const {
    ready,
    value: searchValue,
    suggestions: { status, data, loading },
    setValue: setSearchValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { types: ['(cities)'] },
    debounce: 300,
  });

  // Reset or populate form when modal opens
  useEffect(() => {
    if (open) {
      // If editing an existing partner, pre-populate the form
      if (existingPartner) {
        setStep('name'); // Start at name step for editing
        setName(existingPartner.name);
        setBirthDate(existingPartner.birthDate);
        setBirthTime(existingPartner.birthTime);
        setCityName(existingPartner.cityName || '');
        setCoords({ lat: existingPartner.latitude, lng: existingPartner.longitude });
        setSearchValue(existingPartner.cityName || '', false);
      } else {
        // Reset form for new entry
        setStep(savedCharts.length > 0 ? 'select' : 'name');
        setName('');
        setBirthDate('');
        setBirthTime('');
        setCityName('');
        setCoords(null);
        setSearchValue('');
      }
      clearSuggestions();
    }
  }, [open, savedCharts.length, existingPartner, setSearchValue, clearSuggestions]);

  // Focus search input when on location step
  useEffect(() => {
    if (step === 'location' && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [step]);

  const handleCitySelect = (suggestion: typeof data[0]) => {
    const { description } = suggestion;
    setSearchValue(description, false);
    clearSuggestions();
    setCityName(description);

    getGeocode({ address: description })
      .then((results) => getLatLng(results[0]))
      .then(({ lat, lng }) => {
        setCoords({ lat, lng });
      })
      .catch((error) => {
        console.error('Geocoding error:', error);
      });
  };

  const handleSavedChartSelect = (chart: BirthChart) => {
    onConfirm({
      id: chart.id,
      name: chart.name,
      birthDate: chart.birth_date,
      birthTime: chart.birth_time,
      latitude: chart.latitude,
      longitude: chart.longitude,
      cityName: chart.city_name || undefined,
      isSaved: true,
    });
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (name && birthDate && birthTime && coords) {
      onConfirm({
        name,
        birthDate,
        birthTime,
        latitude: coords.lat,
        longitude: coords.lng,
        cityName: cityName || undefined,
        isSaved: false,
      });
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'name':
        if (savedCharts.length > 0) setStep('select');
        break;
      case 'date':
        setStep('name');
        break;
      case 'time':
        setStep('date');
        break;
      case 'location':
        setStep('time');
        break;
      case 'confirm':
        setStep('location');
        break;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'select':
        setStep('name');
        break;
      case 'name':
        if (name.trim()) setStep('date');
        break;
      case 'date':
        if (birthDate) setStep('time');
        break;
      case 'time':
        if (birthTime) setStep('location');
        break;
      case 'location':
        if (coords) setStep('confirm');
        break;
    }
  };

  const getStepIndex = () => {
    const steps: Step[] = savedCharts.length > 0
      ? ['select', 'name', 'date', 'time', 'location', 'confirm']
      : ['name', 'date', 'time', 'location', 'confirm'];
    return steps.indexOf(step);
  };

  const totalSteps = savedCharts.length > 0 ? 6 : 5;

  // Render content for each step
  const renderContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Partner</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select a saved chart or enter new data
              </p>
            </div>

            {/* Saved charts */}
            {savedCharts.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedCharts.map((chart) => (
                  <button
                    key={chart.id}
                    onClick={() => handleSavedChartSelect(chart)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {chart.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {chart.city_name || `${chart.latitude.toFixed(2)}°, ${chart.longitude.toFixed(2)}°`}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#0a0a0a] px-2 text-slate-500 dark:text-slate-400">
                  or enter new
                </span>
              </div>
            </div>

            <Button
              onClick={() => setStep('name')}
              variant="outline"
              className="w-full h-11 rounded-lg"
            >
              <User className="w-4 h-4 mr-2" />
              Enter New Partner Data
            </Button>
          </div>
        );

      case 'name':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Partner's Name</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Who are you exploring with?
              </p>
            </div>

            <Input
              type="text"
              placeholder="Enter their name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-base h-12 rounded-lg"
              autoFocus
            />

            <div className="flex gap-3">
              {savedCharts.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-11 rounded-lg"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!name.trim()}
                className={`h-11 rounded-lg ${savedCharts.length > 0 ? 'flex-1' : 'w-full'}`}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {name}'s Birth Date
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                When were they born?
              </p>
            </div>

            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="text-center text-base h-12 rounded-lg"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11 rounded-lg"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!birthDate}
                className="flex-1 h-11 rounded-lg"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {name}'s Birth Time
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Exact time matters for accuracy
              </p>
            </div>

            <Input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="text-center text-base h-12 rounded-lg"
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11 rounded-lg"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!birthTime}
                className="flex-1 h-11 rounded-lg"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {name}'s Birth Location
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Search for their birth city
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search for a city..."
                  disabled={!ready}
                  className="pl-10 h-12 rounded-lg"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>

              {/* City suggestions */}
              {status === 'OK' && data.length > 0 && (
                <ul className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {data.map((suggestion) => {
                    const { place_id, structured_formatting: { main_text, secondary_text } } = suggestion;
                    return (
                      <li
                        key={place_id}
                        onClick={() => handleCitySelect(suggestion)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-b-0"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{main_text}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{secondary_text}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Selected city display */}
              {cityName && coords && (
                <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-pink-600 dark:text-pink-400">Selected City</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cityName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11 rounded-lg"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!coords}
                className="flex-1 h-11 rounded-lg"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Ready to Explore Together!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Find your perfect destinations
              </p>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-200 dark:bg-pink-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-pink-600 dark:text-pink-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Partner</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Birth Date</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {new Date(birthDate + 'T00:00').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Birth Time</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{birthTime}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {cityName || `${coords?.lat.toFixed(4)}°, ${coords?.lng.toFixed(4)}°`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11 rounded-lg"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 h-11 rounded-lg bg-pink-500 hover:bg-pink-600"
              >
                <Heart className="w-4 h-4 mr-2" />
                Find Spots
              </Button>
            </div>
          </div>
        );
    }
  };

  // Mobile: render as bottom sheet
  if (isMobile && open) {
    return (
      <div className="fixed inset-0 z-[11000]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        />

        {/* Bottom sheet */}
        <div className="fixed inset-x-0 bottom-0 z-[11000] animate-in slide-in-from-bottom duration-300">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col border-t border-slate-200 dark:border-white/10">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-pink-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Duo Mode</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Add partner's birth data
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Progress indicator */}
              <div className="flex gap-2 mt-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= getStepIndex() ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: render as dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm mx-auto rounded-2xl overflow-hidden p-0 gap-0 shadow-lg bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="bg-pink-50 dark:bg-pink-900/20 px-6 pt-5 pb-6 relative border-b border-pink-200 dark:border-pink-800">
          <DialogPrimitive.Close asChild>
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-pink-300 dark:border-pink-700 hover:bg-pink-100 dark:hover:bg-pink-900/30 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-pink-500 dark:text-pink-400" />
            </button>
          </DialogPrimitive.Close>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-pink-200 dark:bg-pink-800 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-600 dark:text-pink-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">Duo Mode</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Find compatible destinations
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= getStepIndex() ? 'bg-pink-500' : 'bg-pink-200 dark:bg-pink-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerChartModal;
