import { useState, useEffect, useCallback } from 'react';
import {
  CityInfo,
  PlaceOfInterest,
  WeatherData,
  AirQualityData,
  CityInfoPanelData,
  PlaceCategory,
} from '@/types/cityInfo';
import { getCityFromCoordinates, getNearbyPlaces } from '../services/googlePlacesService';
import { getWeather, getAirQuality } from '../services/googleWeatherService';
import { checkStreetViewAvailability, getAerialView } from '../services/googleMediaService';

interface UseCityInfoProps {
  lat: number | null;
  lng: number | null;
  cityName?: string;
  enabled?: boolean;
}

interface UseCityInfoResult {
  data: CityInfoPanelData;
  refetch: () => void;
  fetchPlaces: (types: PlaceCategory[]) => Promise<void>;
}

const initialData: CityInfoPanelData = {
  city: null,
  places: [],
  weather: null,
  airQuality: null,
  streetView: null,
  aerialView: null,
  flights: [],
  loading: {
    city: false,
    places: false,
    weather: false,
    airQuality: false,
    streetView: false,
    aerialView: false,
    flights: false,
  },
  error: {},
};

export function useCityInfo({ lat, lng, cityName, enabled = true }: UseCityInfoProps): UseCityInfoResult {
  const [data, setData] = useState<CityInfoPanelData>(initialData);

  const updateLoading = useCallback((key: keyof CityInfoPanelData['loading'], value: boolean) => {
    setData((prev) => ({
      ...prev,
      loading: { ...prev.loading, [key]: value },
    }));
  }, []);

  const updateError = useCallback((key: keyof CityInfoPanelData['error'], value: string | undefined) => {
    setData((prev) => ({
      ...prev,
      error: { ...prev.error, [key]: value },
    }));
  }, []);

  const fetchCityInfo = useCallback(async () => {
    if (lat === null || lng === null) return;

    // Fetch city details
    updateLoading('city', true);
    updateError('city', undefined);
    try {
      const cityInfo = await getCityFromCoordinates(lat, lng);
      if (cityInfo) {
        // Override name if provided
        if (cityName) {
          cityInfo.name = cityName;
        }
        setData((prev) => ({ ...prev, city: cityInfo }));
      }
    } catch (error) {
      updateError('city', 'Failed to load city information');
      console.error('Error fetching city info:', error);
    } finally {
      updateLoading('city', false);
    }
  }, [lat, lng, cityName, updateLoading, updateError]);

  const fetchWeatherData = useCallback(async () => {
    if (lat === null || lng === null) return;

    // Fetch weather
    updateLoading('weather', true);
    updateError('weather', undefined);
    try {
      const weather = await getWeather(lat, lng);
      setData((prev) => ({ ...prev, weather }));
    } catch (error) {
      updateError('weather', 'Failed to load weather');
      console.error('Error fetching weather:', error);
    } finally {
      updateLoading('weather', false);
    }
  }, [lat, lng, updateLoading, updateError]);

  const fetchAirQualityData = useCallback(async () => {
    if (lat === null || lng === null) return;

    // Fetch air quality
    updateLoading('airQuality', true);
    updateError('airQuality', undefined);
    try {
      const airQuality = await getAirQuality(lat, lng);
      setData((prev) => ({ ...prev, airQuality }));
    } catch (error) {
      updateError('airQuality', 'Failed to load air quality');
      console.error('Error fetching air quality:', error);
    } finally {
      updateLoading('airQuality', false);
    }
  }, [lat, lng, updateLoading, updateError]);

  const fetchPlaces = useCallback(async (types: PlaceCategory[] = ['tourist_attraction', 'museum']) => {
    if (lat === null || lng === null) return;

    updateLoading('places', true);
    updateError('places', undefined);
    try {
      const places = await getNearbyPlaces(lat, lng, types);
      setData((prev) => ({ ...prev, places }));
    } catch (error) {
      updateError('places', 'Failed to load places');
      console.error('Error fetching places:', error);
    } finally {
      updateLoading('places', false);
    }
  }, [lat, lng, updateLoading, updateError]);

  const fetchStreetView = useCallback(async () => {
    if (lat === null || lng === null) return;

    updateLoading('streetView', true);
    updateError('streetView', undefined);
    try {
      const streetView = await checkStreetViewAvailability(lat, lng);
      setData((prev) => ({ ...prev, streetView }));
    } catch (error) {
      updateError('streetView', 'Failed to load Street View');
      console.error('Error fetching Street View:', error);
    } finally {
      updateLoading('streetView', false);
    }
  }, [lat, lng, updateLoading, updateError]);

  const fetchAerialView = useCallback(async () => {
    if (lat === null || lng === null) return;

    updateLoading('aerialView', true);
    updateError('aerialView', undefined);
    try {
      const aerialView = await getAerialView(lat, lng, cityName);
      setData((prev) => ({ ...prev, aerialView }));
    } catch (error) {
      updateError('aerialView', 'Failed to load Aerial View');
      console.error('Error fetching Aerial View:', error);
    } finally {
      updateLoading('aerialView', false);
    }
  }, [lat, lng, cityName, updateLoading, updateError]);

  const refetch = useCallback(() => {
    if (lat !== null && lng !== null) {
      fetchCityInfo();
      fetchWeatherData();
      fetchAirQualityData();
      fetchPlaces(['tourist_attraction', 'museum']);
      fetchStreetView();
      fetchAerialView();
    }
  }, [lat, lng, fetchCityInfo, fetchWeatherData, fetchAirQualityData, fetchPlaces, fetchStreetView, fetchAerialView]);

  // Initial fetch when coordinates change
  useEffect(() => {
    if (enabled && lat !== null && lng !== null) {
      // Reset data
      setData(initialData);

      // Fetch all data in parallel
      fetchCityInfo();
      fetchWeatherData();
      fetchAirQualityData();
      fetchPlaces(['tourist_attraction', 'museum']);
      // Lazy load media (fetch after a slight delay to prioritize essential data)
      setTimeout(() => {
        fetchStreetView();
        fetchAerialView();
      }, 500);
    }
  }, [lat, lng, enabled]); // Only re-run when coordinates or enabled changes

  return { data, refetch, fetchPlaces };
}

export default useCityInfo;
