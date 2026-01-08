/**
 * QuickBirthDataModal Component
 * A streamlined, app-like modal for setting birth data after dropping a pin on the globe.
 * Shows coordinates from triple-click and asks only for date/time.
 * Now includes city search functionality for birth location.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Calendar, Clock, Sparkles, X, Search, Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import usePlacesAutocomplete, { getGeocode, getLatLng } from '@/hooks/usePlacesAutocompleteNew';

interface QuickBirthDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: { lat: number; lng: number } | null;
  onConfirm: (data: { lat: number; lng: number; date: string; time: string; cityName?: string }) => void;
  isMobile?: boolean;
}

export const QuickBirthDataModal: React.FC<QuickBirthDataModalProps> = ({
  open,
  onOpenChange,
  coordinates,
  onConfirm,
  isMobile = false,
}) => {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [step, setStep] = useState<'location' | 'date' | 'time' | 'confirm'>('location');
  const [locationMode, setLocationMode] = useState<'pin' | 'search'>('pin');
  const [cityName, setCityName] = useState<string | null>(null);
  const [searchedCoords, setSearchedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoize requestOptions to prevent setValue from changing on every render,
  // which would trigger the form reset useEffect
  const requestOptions = useMemo(() => ({ types: ['(cities)'] }), []);

  // Places autocomplete for city search
  const {
    ready,
    value: searchValue,
    suggestions: { status, data, loading },
    setValue: setSearchValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions,
    debounce: 300,
  });

  // Get effective coordinates (from search or pin)
  const effectiveCoords = locationMode === 'search' && searchedCoords ? searchedCoords : coordinates;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setBirthDate('');
      setBirthTime('');
      setStep('location');
      setLocationMode('pin');
      setCityName(null);
      setSearchedCoords(null);
      setSearchValue('');
      clearSuggestions();
    }
  }, [open, setSearchValue, clearSuggestions]);

  // Focus search input when switching to search mode
  useEffect(() => {
    if (locationMode === 'search' && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [locationMode]);

  const handleCitySelect = (suggestion: typeof data[0]) => {
    const { description } = suggestion;
    setSearchValue(description, false);
    clearSuggestions();
    setCityName(description);

    getGeocode({ address: description })
      .then((results) => getLatLng(results[0]))
      .then(({ lat, lng }) => {
        setSearchedCoords({ lat, lng });
      })
      .catch((error) => {
        console.error('Geocoding error:', error);
      });
  };

  const handleLocationNext = () => {
    if (effectiveCoords) {
      setStep('date');
    }
  };

  const handleDateNext = () => {
    if (birthDate) {
      setStep('time');
    }
  };

  const handleTimeNext = () => {
    if (birthTime) {
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    if (effectiveCoords && birthDate && birthTime) {
      onConfirm({
        lat: effectiveCoords.lat,
        lng: effectiveCoords.lng,
        date: birthDate,
        time: birthTime,
        cityName: cityName || undefined,
      });
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (step === 'date') setStep('location');
    if (step === 'time') setStep('date');
    if (step === 'confirm') setStep('time');
  };

  if (!coordinates) return null;

  // Shared content for both mobile and desktop
  const renderContent = () => (
    <>
      {step === 'location' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-7 h-7 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Birth Location</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Use selected pin or search for a city
            </p>
          </div>

          {/* Toggle between pin and search */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setLocationMode('pin')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                locationMode === 'pin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Use Pin
            </button>
            <button
              onClick={() => setLocationMode('search')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                locationMode === 'search'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Search City
            </button>
          </div>

          {locationMode === 'pin' ? (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Selected Location</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}°
                  </p>
                </div>
              </div>
            </div>
          ) : (
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
                <ul className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {data.map((suggestion) => {
                    const { place_id, structured_formatting: { main_text, secondary_text } } = suggestion;
                    return (
                      <li
                        key={place_id}
                        onClick={() => handleCitySelect(suggestion)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
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
              {cityName && searchedCoords && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Selected City</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cityName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleLocationNext}
            disabled={!effectiveCoords}
            className="w-full h-11 rounded-lg"
          >
            Continue
          </Button>
        </div>
      )}

      {step === 'date' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">When were you born?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select your birth date
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
              onClick={handleDateNext}
              disabled={!birthDate}
              className="flex-1 h-11 rounded-lg"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'time' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">What time?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Exact time is crucial for accuracy
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
              onClick={handleTimeNext}
              disabled={!birthTime}
              className="flex-1 h-11 rounded-lg"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ready to explore!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your birth data is set
            </p>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                {cityName ? (
                  <>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cityName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {effectiveCoords?.lat.toFixed(4)}°, {effectiveCoords?.lng.toFixed(4)}°
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {effectiveCoords?.lat.toFixed(4)}°, {effectiveCoords?.lng.toFixed(4)}°
                  </p>
                )}
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
                    weekday: 'long',
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
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {birthTime}
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
              className="flex-1 h-11 rounded-lg"
            >
              Generate Map
            </Button>
          </div>
        </div>
      )}
    </>
  );

  // Mobile: render as bottom sheet
  if (isMobile && open) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        />

        {/* Bottom sheet */}
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col border-t border-slate-200 dark:border-slate-800">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Set Birth Data</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}°
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Progress indicator */}
              <div className="flex gap-2 mt-4">
                <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'location' || step === 'date' || step === 'time' || step === 'confirm' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'date' || step === 'time' || step === 'confirm' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'time' || step === 'confirm' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'confirm' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
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
        className="max-w-sm mx-auto rounded-2xl overflow-hidden p-0 gap-0 shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 pt-5 pb-6 relative border-b border-slate-200 dark:border-slate-700">
          <DialogPrimitive.Close asChild>
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </DialogPrimitive.Close>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Birth Location Set</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}°
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'location' || step === 'date' || step === 'time' || step === 'confirm' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'date' || step === 'time' || step === 'confirm' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'time' || step === 'confirm' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'confirm' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
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

export default QuickBirthDataModal;
