import React, { useRef, useCallback, useState, useEffect } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { Button } from '@/components/ui/button';
import { MapPin, X, Check } from 'lucide-react';

interface MapPickerProps {
  onSelect: (lat: number, lng: number) => void;
  onCancel: () => void;
  initialLat?: number;
  initialLng?: number;
}

const MapPicker: React.FC<MapPickerProps> = ({
  onSelect,
  onCancel,
  initialLat = 0,
  initialLng = 0,
}) => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat !== 0 || initialLng !== 0 ? { lat: initialLat, lng: initialLng } : null
  );
  const [markerData, setMarkerData] = useState<{ lat: number; lng: number }[]>(
    initialLat !== 0 || initialLng !== 0 ? [{ lat: initialLat, lng: initialLng }] : []
  );

  useEffect(() => {
    if (globeEl.current) {
      const globe = globeEl.current;
      try {
        const controls = globe.controls?.();
        if (controls) {
          controls.autoRotate = false;
        }
        // Set initial view
        if (initialLat !== 0 || initialLng !== 0) {
          globe.pointOfView({ lat: initialLat, lng: initialLng, altitude: 2 }, 500);
        } else {
          globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 500);
        }
      } catch (e) {
        console.warn('Failed to access globe controls (WebGL may not be available):', e);
      }
    }
  }, [initialLat, initialLng]);

  const handleGlobeClick = useCallback((coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    setMarkerData([coords]);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedCoords) {
      onSelect(selectedCoords.lat, selectedCoords.lng);
    }
  }, [selectedCoords, onSelect]);

  const tileUrl = (x: number, y: number, z: number) =>
    `https://api.maptiler.com/maps/streets/${z}/${x}/${y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        <span>Click on the globe to select a location</span>
      </div>

      <div
        className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
        style={{ height: 250 }}
      >
        <Globe
          ref={globeEl}
          width={300}
          height={250}
          globeTileEngineUrl={tileUrl}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={true}
          atmosphereColor="lightblue"
          atmosphereAltitude={0.15}
          onGlobeClick={handleGlobeClick}
          // Marker for selected location
          pointsData={markerData}
          pointLat={(d: { lat: number }) => d.lat}
          pointLng={(d: { lng: number }) => d.lng}
          pointColor={() => '#ef4444'}
          pointAltitude={0.01}
          pointRadius={0.5}
        />
      </div>

      {selectedCoords && (
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Selected: {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={!selectedCoords}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-1" />
          Confirm
        </Button>
      </div>
    </div>
  );
};

export default MapPicker;
