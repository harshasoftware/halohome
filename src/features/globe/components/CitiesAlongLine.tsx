/**
 * CitiesAlongLine Component
 * Displays cities near a planetary line with influence scores
 * Uses Google Places API for city lookup
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Sparkles, Star, Circle, Sun, ExternalLink, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  findCitiesAlongLineAsync,
  getInfluenceLevelColor,
  type CityInfluence,
  type ZenithPointData,
} from '@/lib/city-line-utils';

interface CitiesAlongLineProps {
  lineCoords: [number, number][];
  planetColor?: string;
  maxCities?: number;
  zenithPoint?: ZenithPointData | null;
  onCityClick?: (lat: number, lng: number, cityName: string) => void;
}

const InfluenceIcon: React.FC<{ level: CityInfluence['influenceLevel'] }> = ({ level }) => {
  switch (level) {
    case 'zenith':
      return <Sparkles className="w-4 h-4 text-rose-500" />;
    case 'gold':
      return <Sun className="w-4 h-4 text-yellow-500" />;
    case 'strong':
      return <Star className="w-4 h-4 text-green-500" />;
    case 'moderate':
      return <Circle className="w-4 h-4 text-blue-500" />;
    case 'weak':
      return <Circle className="w-4 h-4 text-slate-400" />;
  }
};

const InfluenceBadge: React.FC<{ level: CityInfluence['influenceLevel'] }> = ({ level }) => {
  const styles: Record<CityInfluence['influenceLevel'], string> = {
    zenith: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    strong: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    moderate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    weak: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };

  const labels: Record<CityInfluence['influenceLevel'], string> = {
    zenith: 'Zenith',
    gold: 'Gold',
    strong: 'Strong',
    moderate: 'Moderate',
    weak: 'Mild',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
};

export const CitiesAlongLine: React.FC<CitiesAlongLineProps> = ({
  lineCoords,
  planetColor = '#888',
  maxCities = 15,
  zenithPoint,
  onCityClick,
}) => {
  const [cities, setCities] = useState<CityInfluence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log component mount and props
  useEffect(() => {
    console.log('[CitiesAlongLine] Component mounted, lineCoords:', lineCoords?.length, 'points');
  }, []);

  // Fetch cities along line using Google Places API
  useEffect(() => {
    let mounted = true;

    const fetchCities = async () => {
      if (!lineCoords || lineCoords.length < 2) {
        console.log('[CitiesAlongLine] Not enough coords:', lineCoords?.length);
        setIsLoading(false);
        return;
      }

      console.log('[CitiesAlongLine] Fetching cities for', lineCoords.length, 'coords');
      setIsLoading(true);
      setError(null);

      try {
        const result = await findCitiesAlongLineAsync(lineCoords, zenithPoint, maxCities);
        console.log('[CitiesAlongLine] Got', result.length, 'cities');

        if (mounted) {
          setCities(result);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[CitiesAlongLine] Failed to fetch cities:', err);
        if (mounted) {
          setError('Failed to load cities');
          setIsLoading(false);
        }
      }
    };

    fetchCities();

    return () => {
      mounted = false;
    };
  }, [lineCoords, zenithPoint, maxCities]);

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
        <p>Finding cities along line...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <MapPin className="w-5 h-5 mx-auto mb-2 opacity-50" />
        <p>{error}</p>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <MapPin className="w-5 h-5 mx-auto mb-2 opacity-50" />
        <p>No major cities along this line</p>
      </div>
    );
  }

  // Group cities by influence level
  const zenithCities = cities.filter(c => c.influenceLevel === 'zenith');
  const goldCities = cities.filter(c => c.influenceLevel === 'gold');
  const strongCities = cities.filter(c => c.influenceLevel === 'strong');
  const otherCities = cities.filter(c => c.influenceLevel === 'moderate' || c.influenceLevel === 'weak');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          {cities.length} found
        </span>
      </div>

      <ScrollArea className="h-[280px] pr-2">
        <div className="space-y-1">
          {/* Zenith cities - within 200km of the actual zenith point */}
          {zenithCities.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-rose-500" />
                <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                  Zenith Point (Planet Overhead)
                </span>
              </div>
              {zenithCities.map((item, idx) => (
                <CityRow key={`zenith-${idx}`} item={item} planetColor={planetColor} showZenithDistance onCityClick={onCityClick} />
              ))}
            </div>
          )}

          {/* Gold cities - within 200km of the line */}
          {goldCities.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                <Sun className="w-3 h-3 text-yellow-500" />
                <span className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
                  Power Zone (200km)
                </span>
              </div>
              {goldCities.map((item, idx) => (
                <CityRow key={`gold-${idx}`} item={item} planetColor={planetColor} onCityClick={onCityClick} />
              ))}
            </div>
          )}

          {/* Strong influence cities */}
          {strongCities.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3 h-3 text-green-500" />
                <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                  Strong Influence
                </span>
              </div>
              {strongCities.map((item, idx) => (
                <CityRow key={`strong-${idx}`} item={item} planetColor={planetColor} onCityClick={onCityClick} />
              ))}
            </div>
          )}

          {/* Other cities */}
          {otherCities.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Circle className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Other Nearby Cities
                </span>
              </div>
              {otherCities.map((item, idx) => (
                <CityRow key={`other-${idx}`} item={item} planetColor={planetColor} onCityClick={onCityClick} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          <strong className="text-rose-600 dark:text-rose-400">Zenith:</strong> Within 200km of zenith point &bull; <strong className="text-yellow-600 dark:text-yellow-400">Gold:</strong> Within 200km of line &bull; <strong>Strong:</strong> 200-350km
        </p>
      </div>
    </div>
  );
};

interface CityRowProps {
  item: CityInfluence;
  planetColor: string;
  showZenithDistance?: boolean;
  onCityClick?: (lat: number, lng: number, cityName: string) => void;
}

const CityRow: React.FC<CityRowProps> = ({ item, planetColor, showZenithDistance, onCityClick }) => {
  const googleMapsUrl = `https://www.google.com/maps?q=${item.city.lat},${item.city.lng}`;

  const handleRowClick = () => {
    if (onCityClick) {
      onCityClick(item.city.lat, item.city.lng, item.city.name);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${onCityClick ? 'cursor-pointer' : ''}`}
      onClick={handleRowClick}
    >
      <InfluenceIcon level={item.influenceLevel} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{item.city.name}</span>
          <InfluenceBadge level={item.influenceLevel} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {item.city.country}
          </span>
          {showZenithDistance && item.distanceFromZenith !== undefined ? (
            <span className="text-[10px] text-rose-500 dark:text-rose-400">
              {item.distanceFromZenith}km from zenith
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">
              {item.distance}km from line
            </span>
          )}
        </div>
        {/* Influence bar */}
        <div className="mt-1">
          <Progress
            value={item.influenceScore}
            className="h-1"
            indicatorColor={getInfluenceLevelColor(item.influenceLevel)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold"
          style={{ color: item.influenceLevel === 'zenith' ? planetColor : getInfluenceLevelColor(item.influenceLevel) }}
        >
          {item.influenceScore}
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Open in Google Maps"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
        </a>
      </div>
    </div>
  );
};

export default CitiesAlongLine;
