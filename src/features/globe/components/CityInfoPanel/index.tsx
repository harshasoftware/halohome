import React, { useState } from 'react';
import { X, MapPin, Cloud, TreePine, Plane, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCityInfo } from '../../hooks/useCityInfo';
import { useUserLocation } from '../../hooks/useUserLocation';
import { OverviewTab } from './tabs/OverviewTab';
import { PlacesTab } from './tabs/PlacesTab';
import { FlightsTab } from './tabs/FlightsTab';
import { AstrologyTab } from './tabs/AstrologyTab';
import type { LocationAnalysis } from '@/lib/location-line-utils';

interface CityInfoPanelProps {
  city: {
    lat: number;
    lng: number;
    name: string;
  } | null;
  onClose: () => void;
  isMobile?: boolean;
  isBottomSheet?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (lat: number, lng: number, name: string, country?: string) => void;
  // Astrology analysis
  locationAnalysis?: LocationAnalysis | null;
  analysisLoading?: boolean;
}

const CityInfoPanelComponent: React.FC<CityInfoPanelProps> = ({
  city,
  onClose,
  isMobile = false,
  isBottomSheet = false,
  isFavorite = false,
  onToggleFavorite,
  locationAnalysis,
  analysisLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'astrology' | 'overview' | 'places' | 'flights'>('astrology');
  const userLocation = useUserLocation();

  const { data, fetchPlaces } = useCityInfo({
    lat: city?.lat ?? null,
    lng: city?.lng ?? null,
    cityName: city?.name,
    enabled: city !== null,
  });

  if (!city) return null;

  const isLoading = data.loading.city || data.loading.weather;

  // Mobile bottom sheet layout
  if (isMobile && isBottomSheet) {
    return (
      <div className="flex flex-col w-full bg-white dark:bg-slate-900 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{city.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data.loading.city ? 'Loading...' : (data.city?.country || 'Unknown location')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite(city.lat, city.lng, city.name, data.city?.country || undefined)}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0 rounded-none border-b border-slate-200 dark:border-slate-800 bg-transparent h-12">
            <TabsTrigger value="astrology" className="flex items-center gap-1 data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">Astro</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
              <Cloud className="w-4 h-4" />
              <span className="text-xs">Weather</span>
            </TabsTrigger>
            <TabsTrigger value="places" className="flex items-center gap-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
              <TreePine className="w-4 h-4" />
              <span className="text-xs">Places</span>
            </TabsTrigger>
            <TabsTrigger value="flights" className="flex items-center gap-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
              <Plane className="w-4 h-4" />
              <span className="text-xs">Flights</span>
            </TabsTrigger>
          </TabsList>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <TabsContent value="astrology" className="mt-0 p-0 data-[state=active]:block data-[state=inactive]:hidden">
              <AstrologyTab
                analysis={locationAnalysis}
                loading={analysisLoading}
              />
            </TabsContent>
            <TabsContent value="overview" className="mt-0 p-0 data-[state=active]:block data-[state=inactive]:hidden">
              <OverviewTab data={data} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="places" className="mt-0 p-0 data-[state=active]:block data-[state=inactive]:hidden">
              <PlacesTab
                places={data.places}
                loading={data.loading.places}
                error={data.error.places}
                onCategoryChange={fetchPlaces}
              />
            </TabsContent>
            <TabsContent value="flights" className="mt-0 p-0 data-[state=active]:block data-[state=inactive]:hidden">
              <FlightsTab
                destinationLat={city.lat}
                destinationLng={city.lng}
                destinationName={city.name}
                userLocation={userLocation}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  }

  // Desktop right panel layout - h-0 flex-1 trick prevents overflow
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{city.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {data.loading.city ? 'Loading...' : (data.city?.country || 'Unknown location')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(city.lat, city.lng, city.name, data.city?.country || undefined)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="h-8 w-8"
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <TabsList className="flex-none grid w-full grid-cols-4 rounded-none border-b border-slate-200 dark:border-slate-800 bg-transparent h-11">
          <TabsTrigger value="astrology" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 rounded-none">
            <Sparkles className="w-4 h-4" />
            Astro
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-none">
            <Cloud className="w-4 h-4" />
            Weather
          </TabsTrigger>
          <TabsTrigger value="places" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-none">
            <TreePine className="w-4 h-4" />
            Places
          </TabsTrigger>
          <TabsTrigger value="flights" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-none">
            <Plane className="w-4 h-4" />
            Flights
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0 w-full relative">
          <TabsContent value="astrology" className="absolute inset-0 overflow-y-auto mt-0 border-0 p-0 outline-none data-[state=inactive]:hidden">
            <AstrologyTab
              analysis={locationAnalysis}
              loading={analysisLoading}
            />
          </TabsContent>
          <TabsContent value="overview" className="absolute inset-0 overflow-y-auto mt-0 border-0 p-0 outline-none data-[state=inactive]:hidden">
            <OverviewTab data={data} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="places" className="absolute inset-0 overflow-y-auto mt-0 border-0 p-0 outline-none data-[state=inactive]:hidden">
            <PlacesTab
              places={data.places}
              loading={data.loading.places}
              error={data.error.places}
              onCategoryChange={fetchPlaces}
            />
          </TabsContent>
          <TabsContent value="flights" className="absolute inset-0 overflow-y-auto mt-0 border-0 p-0 outline-none data-[state=inactive]:hidden">
            <FlightsTab
              destinationLat={city.lat}
              destinationLng={city.lng}
              destinationName={city.name}
              userLocation={userLocation}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export const CityInfoPanel = React.memo(CityInfoPanelComponent);

export default CityInfoPanel;
