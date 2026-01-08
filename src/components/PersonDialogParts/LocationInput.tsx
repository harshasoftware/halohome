import React, { useState, lazy, Suspense } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from '@/hooks/usePlacesAutocompleteNew';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LocationEvent } from '@/types/familyTree';
import { Loader2, MapPin, Type } from 'lucide-react';

// Lazy load the MapPicker to avoid loading globe.gl unless needed
const MapPicker = lazy(() => import('./MapPicker'));

interface LocationInputProps {
  value: string;
  onChange: (location: Partial<LocationEvent>) => void;
  className?: string;
  // Optional: pass existing coordinates for editing
  lat?: number;
  lng?: number;
}

const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  className,
  lat,
  lng,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'map'>('text');

  const {
    ready,
    value: autocompleteValue,
    suggestions: { status, data, loading },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
  });

  const handleMapSelect = (selectedLat: number, selectedLng: number) => {
    const coordsDisplay = `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`;
    setValue(coordsDisplay, false);
    onChange({ place: coordsDisplay, lat: selectedLat, lng: selectedLng });
    setInputMode('text');
  };

  const handleCancelMapPicker = () => {
    setInputMode('text');
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange({ place: e.target.value });
  };

  const handleSelect =
    ({ description }: { description: string }) =>
    () => {
      setValue(description, false);
      clearSuggestions();

      getGeocode({ address: description })
        .then((results) => getLatLng(results[0]))
        .then(({ lat, lng }) => {
          onChange({ place: description, lat, lng });
        })
        .catch((error) => {
          console.log('Error: ', error);
        });
    };

  const renderSuggestions = () =>
    data.map((suggestion) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
      } = suggestion;

      return (
        <li
          key={place_id}
          onClick={handleSelect(suggestion)}
          className="p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
        >
          <strong>{main_text}</strong>
          <small className="ml-2 text-slate-500 dark:text-slate-400">
            {secondary_text}
          </small>
        </li>
      );
    });

  // Show map picker mode
  if (inputMode === 'map') {
    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        }
      >
        <MapPicker
          onSelect={handleMapSelect}
          onCancel={handleCancelMapPicker}
          initialLat={lat}
          initialLng={lng}
        />
      </Suspense>
    );
  }

  // Text input mode
  return (
    <div className="relative">
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Enter a location"
          className={`flex-1 ${className || ''}`}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setInputMode('map')}
          title="Select on map"
          className="shrink-0"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>
      {loading && <Loader2 className="absolute right-12 top-2.5 h-4 w-4 animate-spin" />}
      {status === 'OK' && (
        <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md mt-1 shadow-lg">
          {renderSuggestions()}
        </ul>
      )}
      {status === 'ZERO_RESULTS' && (
        <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md mt-1 p-2 text-sm text-slate-500 dark:text-slate-400">
          No results found. Try selecting on map.
        </div>
      )}
    </div>
  );
};

export default LocationInput;
