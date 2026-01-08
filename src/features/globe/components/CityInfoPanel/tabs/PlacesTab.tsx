import React, { useState, useRef } from 'react';
import { Star, MapPin, Clock, ChevronRight } from 'lucide-react';
import { PlaceOfInterest, PlaceCategory, PLACE_CATEGORIES } from '@/types/cityInfo';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVirtualList } from '@/hooks/useVirtualList';
import { VirtualListContainer } from '@/components/ui/virtual-list-container';
import {
  PLACE_CARD_ITEM_HEIGHT,
  PLACES_LIST_VIRTUALIZATION_CONFIG,
  PLACES_LIST_PADDING,
} from './places-tab-heights';

interface PlacesTabProps {
  places: PlaceOfInterest[];
  loading: boolean;
  error?: string;
  onCategoryChange: (types: PlaceCategory[]) => Promise<void>;
}

export const PlacesTab: React.FC<PlacesTabProps> = ({
  places,
  loading,
  error,
  onCategoryChange,
}) => {
  const [activeCategories, setActiveCategories] = useState<PlaceCategory[]>([
    'tourist_attraction',
    'museum',
  ]);

  // Scroll container ref for virtualization
  const placesScrollRef = useRef<HTMLDivElement>(null);

  // Virtual list setup for places
  const {
    virtualItems: placesVirtualItems,
    totalHeight: placesTotalHeight,
  } = useVirtualList({
    items: places,
    itemHeight: PLACE_CARD_ITEM_HEIGHT,
    containerRef: placesScrollRef,
    ...PLACES_LIST_VIRTUALIZATION_CONFIG,
    // Reset scroll when category changes cause places list to update
    resetScrollOnItemsChange: true,
  });

  const handleCategoryToggle = (category: PlaceCategory) => {
    let newCategories: PlaceCategory[];
    if (activeCategories.includes(category)) {
      newCategories = activeCategories.filter((c) => c !== category);
      if (newCategories.length === 0) {
        newCategories = [category]; // Keep at least one
      }
    } else {
      newCategories = [...activeCategories, category];
    }
    setActiveCategories(newCategories);
    onCategoryChange(newCategories);
  };

  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const getPriceLevel = (level?: number): string => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  return (
    <div className="flex flex-col">
      {/* Category Filters */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="flex flex-wrap gap-2">
          {PLACE_CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={activeCategories.includes(cat.value) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryToggle(cat.value)}
              className="h-7 text-xs"
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Places List */}
      <div
        ref={placesScrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange(activeCategories)}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : places.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <p className="text-sm">No places found in this area</p>
            <p className="text-xs mt-1">Try selecting different categories</p>
          </div>
        ) : (
          <div className="p-4">
            <VirtualListContainer
              totalHeight={placesTotalHeight + PLACES_LIST_PADDING}
            >
              {placesVirtualItems.map(({ item, index, style }) => (
                <div
                  key={item.placeId}
                  style={{
                    ...style,
                    // Adjust for container padding - first item has no top padding
                    top: (style.top as number),
                    // Exclude gap from last item height for rendering
                    paddingBottom: index < places.length - 1 ? 12 : 0,
                  }}
                >
                  <PlaceCard
                    place={item}
                    formatDistance={formatDistance}
                    getPriceLevel={getPriceLevel}
                  />
                </div>
              ))}
            </VirtualListContainer>
          </div>
        )}
      </div>
    </div>
  );
};

interface PlaceCardProps {
  place: PlaceOfInterest;
  formatDistance: (km?: number) => string;
  getPriceLevel: (level?: number) => string;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, formatDistance, getPriceLevel }) => {
  const photoUrl = place.photos?.[0]?.url;
  const primaryType = place.types?.[0]?.replace(/_/g, ' ');

  return (
    <div className="flex gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
      {/* Photo */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={place.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            📍
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {place.name}
        </h4>

        <div className="flex items-center gap-2 mt-1">
          {place.rating && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-medium">{place.rating.toFixed(1)}</span>
              {place.userRatingsTotal && (
                <span className="text-xs text-slate-400">
                  ({place.userRatingsTotal > 1000
                    ? `${(place.userRatingsTotal / 1000).toFixed(1)}k`
                    : place.userRatingsTotal})
                </span>
              )}
            </div>
          )}
          {place.priceLevel && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              {getPriceLevel(place.priceLevel)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
          {place.distance && (
            <div className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              <span>{formatDistance(place.distance)}</span>
            </div>
          )}
          {place.openNow !== undefined && (
            <div className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              <span className={place.openNow ? 'text-green-600' : 'text-red-500'}>
                {place.openNow ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>

        {primaryType && (
          <Badge variant="secondary" className="mt-1.5 text-xs h-5 capitalize">
            {primaryType}
          </Badge>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-slate-400 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default PlacesTab;
