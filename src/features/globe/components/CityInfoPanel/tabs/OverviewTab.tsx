import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Thermometer, Droplets, Wind, Eye, Camera, Video, ExternalLink, MapPin } from 'lucide-react';
import { CityInfoPanelData } from '@/types/cityInfo';
import { Skeleton } from '@/components/ui/skeleton';
import { getStreetViewUrl, getGoogleMapsLink } from '../../../services/googleMediaService';

interface OverviewTabProps {
  data: CityInfoPanelData;
  isLoading: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data, isLoading }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photos = data.city?.photos || [];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="p-4 pb-8 space-y-4">
      {/* Photo Carousel */}
      <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video">
        {isLoading || data.loading.city ? (
          <Skeleton className="w-full h-full" />
        ) : photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhotoIndex]?.url}
              alt={data.city?.name || 'City'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Photo indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.slice(0, 5).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No photos available
          </div>
        )}
      </div>

      {/* Weather & Air Quality */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weather Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{data.weather?.icon || '🌤️'}</span>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Weather</p>
              {data.loading.weather ? (
                <Skeleton className="w-16 h-5" />
              ) : (
                <p className="font-semibold text-lg">
                  {data.weather ? `${Math.round(data.weather.temperature)}°C` : '--'}
                </p>
              )}
            </div>
          </div>
          {data.weather && (
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                <span>{data.weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                <span>{Math.round(data.weather.windSpeed)} km/h</span>
              </div>
            </div>
          )}
          {data.weather?.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
              {data.weather.description}
            </p>
          )}
        </div>

        {/* Air Quality Card */}
        <div
          className="rounded-lg p-3"
          style={{
            background: data.airQuality
              ? `linear-gradient(135deg, ${data.airQuality.color}15, ${data.airQuality.color}30)`
              : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: data.airQuality?.color || '#22c55e' }}
            >
              {data.airQuality?.aqi || '--'}
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Air Quality</p>
              {data.loading.airQuality ? (
                <Skeleton className="w-16 h-5" />
              ) : (
                <p className="font-semibold text-sm">
                  {data.airQuality?.category || 'Unknown'}
                </p>
              )}
            </div>
          </div>
          {data.airQuality?.dominantPollutant && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Main: {data.airQuality.dominantPollutant.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {/* Additional Weather Details */}
      {data.weather && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Weather Details
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs text-slate-500">Feels like</p>
                <p className="font-medium">{Math.round(data.weather.feelsLike)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Visibility</p>
                <p className="font-medium">
                  {data.weather.visibility >= 1000
                    ? `${(data.weather.visibility / 1000).toFixed(1)} km`
                    : `${data.weather.visibility} m`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Street View & Aerial View */}
      <div className="grid grid-cols-2 gap-3">
        {/* Street View */}
        <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
          {data.loading.streetView ? (
            <Skeleton className="w-full aspect-[4/3]" />
          ) : data.streetView?.available && data.city?.coordinates ? (
            <a
              href={getGoogleMapsLink(data.city.coordinates.lat, data.city.coordinates.lng, data.city.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group"
            >
              <img
                src={getStreetViewUrl(data.city.coordinates.lat, data.city.coordinates.lng, { width: 300, height: 200 })}
                alt="Street View"
                className="w-full aspect-[4/3] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium">
                  <Camera className="w-4 h-4" />
                  Street View
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Street View
              </div>
            </a>
          ) : (
            <div className="w-full aspect-[4/3] flex flex-col items-center justify-center text-slate-400 p-4">
              <Camera className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs text-center">Street View not available</p>
            </div>
          )}
        </div>

        {/* Aerial View */}
        <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
          {data.loading.aerialView ? (
            <Skeleton className="w-full aspect-[4/3]" />
          ) : data.aerialView?.available && data.aerialView.videoUrl ? (
            <a
              href={data.aerialView.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group"
            >
              {data.aerialView.thumbnailUrl ? (
                <img
                  src={data.aerialView.thumbnailUrl}
                  alt="Aerial View"
                  className="w-full aspect-[4/3] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Video className="w-12 h-12 text-white/80" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium">
                  <Video className="w-4 h-4" />
                  Watch Flyover
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Video className="w-3 h-3" />
                Aerial View
              </div>
            </a>
          ) : (
            <div className="w-full aspect-[4/3] flex flex-col items-center justify-center text-slate-400 p-4">
              <Video className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs text-center">Aerial View not available</p>
            </div>
          )}
        </div>
      </div>

      {/* View in Maps Button */}
      {data.city?.coordinates && (
        <a
          href={getGoogleMapsLink(data.city.coordinates.lat, data.city.coordinates.lng, data.city.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
        >
          <MapPin className="w-4 h-4" />
          View in Google Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Health Recommendation */}
      {data.airQuality?.healthRecommendation && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {data.airQuality.healthRecommendation}
          </p>
        </div>
      )}

      {/* Location Info */}
      <div className="text-xs text-slate-400 dark:text-slate-500 text-center pt-2">
        {data.city?.coordinates?.lat.toFixed(4)}°, {data.city?.coordinates?.lng.toFixed(4)}°
      </div>
    </div>
  );
};

export default OverviewTab;
