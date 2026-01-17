import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const libraries: (
  | 'core'
  | 'maps'
  | 'places'
  | 'geocoding'
  | 'routes'
  | 'marker'
  | 'geometry'
  | 'elevation'
  | 'streetView'
  | 'journeySharing'
  | 'drawing'
  | 'visualization'
)[] = ['places', 'drawing', 'geometry'];

interface GoogleMapsWrapperProps {
  children: React.ReactNode;
}

const GoogleMapsWrapper: React.FC<GoogleMapsWrapperProps> = ({
  children,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#050505]">
        <p className="text-red-600 dark:text-red-400">Error loading maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#050505]">
        <div className="text-center">
          <div
            className="w-6 h-6 mx-auto border-2 rounded-full animate-spin mb-3 border-slate-200 dark:border-white/10 border-t-slate-500 dark:border-t-white/60"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GoogleMapsWrapper;
