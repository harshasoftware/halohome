import { WeatherData, AirQualityData, getAqiCategory, getAqiColor } from '@/types/cityInfo';
import { supabase } from '@/integrations/supabase/client';
import { monitoredEdgeFunction, monitoredFetch } from '@/lib/monitoring';

const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const AQI_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const weatherCache = new Map<string, CacheEntry<WeatherData>>();
const airQualityCache = new Map<string, CacheEntry<AirQualityData>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string, duration: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < duration) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Fetch weather data via edge function (uses OpenWeatherMap or fallback)
export async function getWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const cacheKey = `${lat.toFixed(2)}-${lng.toFixed(2)}`;
  const cached = getCached(weatherCache, cacheKey, WEATHER_CACHE_DURATION);
  if (cached) return cached;

  try {
    // Try edge function first (monitored)
    const data = await monitoredEdgeFunction<{
      temperature?: number;
      feelsLike?: number;
      humidity?: number;
      description?: string;
      icon?: string;
      windSpeed?: number;
      visibility?: number;
    }>('city-info/weather', () =>
      supabase.functions.invoke('city-info', {
        body: { action: 'weather', lat, lng },
      })
    );

    const weather: WeatherData = {
      temperature: data.temperature || 0,
      feelsLike: data.feelsLike || 0,
      humidity: data.humidity || 0,
      description: data.description || 'Unknown',
      icon: data.icon || '🌤️',
      windSpeed: data.windSpeed || 0,
      windDirection: 0,
      visibility: data.visibility || 10000,
      pressure: 0,
    };

    setCache(weatherCache, cacheKey, weather);
    return weather;
  } catch (error) {
    // Fallback to Open-Meteo (free, no CORS issues)
    console.warn('Edge function weather failed, using fallback:', error instanceof Error ? error.message : error);
    return getFallbackWeather(lat, lng);
  }
}

// Fallback weather using Open-Meteo (free, no API key required)
async function getFallbackWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) return null;

    const current = data.current;
    const weatherCode = current.weather_code || 0;

    const weather: WeatherData = {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      description: getWeatherDescription(weatherCode),
      icon: getWeatherIcon(weatherCode),
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      visibility: 10000, // Default
      pressure: current.surface_pressure,
    };

    setCache(weatherCache, `${lat.toFixed(2)}-${lng.toFixed(2)}`, weather);
    return weather;
  } catch (error) {
    console.error('Error fetching fallback weather:', error);
    return null;
  }
}

// Fetch air quality data via edge function
export async function getAirQuality(lat: number, lng: number): Promise<AirQualityData | null> {
  const cacheKey = `${lat.toFixed(2)}-${lng.toFixed(2)}`;
  const cached = getCached(airQualityCache, cacheKey, AQI_CACHE_DURATION);
  if (cached) return cached;

  try {
    // Try edge function first (monitored)
    const data = await monitoredEdgeFunction<{
      aqi?: number;
      category?: string;
      dominantPollutant?: string;
      healthRecommendation?: string;
      color?: string;
    }>('city-info/airQuality', () =>
      supabase.functions.invoke('city-info', {
        body: { action: 'airQuality', lat, lng },
      })
    );

    const airQuality: AirQualityData = {
      aqi: data.aqi || 0,
      category: data.category || getAqiCategory(data.aqi || 0),
      dominantPollutant: data.dominantPollutant || 'pm25',
      pollutants: [],
      healthRecommendation: data.healthRecommendation,
      color: data.color || getAqiColor(data.aqi || 0),
    };

    setCache(airQualityCache, cacheKey, airQuality);
    return airQuality;
  } catch (error) {
    console.warn('Edge function air quality failed, using fallback:', error instanceof Error ? error.message : error);
    return getFallbackAirQuality(lat, lng);
  }
}

// Fallback air quality using Open-Meteo (free)
async function getFallbackAirQuality(lat: number, lng: number): Promise<AirQualityData | null> {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) return null;

    const current = data.current;
    const aqi = current.us_aqi || 50;

    const airQuality: AirQualityData = {
      aqi,
      category: getAqiCategory(aqi),
      dominantPollutant: 'pm25',
      pollutants: [
        { name: 'PM2.5', concentration: current.pm2_5 || 0, unit: 'μg/m³' },
        { name: 'PM10', concentration: current.pm10 || 0, unit: 'μg/m³' },
        { name: 'O3', concentration: current.ozone || 0, unit: 'μg/m³' },
        { name: 'NO2', concentration: current.nitrogen_dioxide || 0, unit: 'μg/m³' },
      ],
      color: getAqiColor(aqi),
    };

    setCache(airQualityCache, `${lat.toFixed(2)}-${lng.toFixed(2)}`, airQuality);
    return airQuality;
  } catch (error) {
    console.error('Error fetching fallback air quality:', error);
    return null;
  }
}

// Map Google weather condition to icon
function mapWeatherIcon(type?: string): string {
  const iconMap: Record<string, string> = {
    CLEAR: '☀️',
    PARTLY_CLOUDY: '⛅',
    MOSTLY_CLOUDY: '🌥️',
    CLOUDY: '☁️',
    RAIN: '🌧️',
    HEAVY_RAIN: '🌧️',
    THUNDERSTORM: '⛈️',
    SNOW: '🌨️',
    FOG: '🌫️',
    WINDY: '💨',
  };
  return iconMap[type || ''] || '🌤️';
}

// Map WMO weather code to description
function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Severe thunderstorm',
  };
  return descriptions[code] || 'Unknown';
}

// Map WMO weather code to icon
function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

// Clear caches
export function clearWeatherCache(): void {
  weatherCache.clear();
  airQualityCache.clear();
}
