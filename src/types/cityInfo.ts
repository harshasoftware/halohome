// City Information Types

export interface CityInfo {
  placeId: string;
  name: string;
  country: string;
  formattedAddress: string;
  coordinates: { lat: number; lng: number };
  photos: CityPhoto[];
  description?: string;
  population?: number;
  timezone?: string;
  localTime?: string;
}

export interface CityPhoto {
  photoReference: string;
  width: number;
  height: number;
  attributions: string[];
  url?: string;
}

export interface PlaceOfInterest {
  placeId: string;
  name: string;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  photos?: CityPhoto[];
  vicinity?: string;
  openNow?: boolean;
  distance?: number;
  icon?: string;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  pressure: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
}

export interface AirQualityData {
  aqi: number;
  category: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  dominantPollutant: string;
  pollutants: {
    name: string;
    concentration: number;
    unit: string;
  }[];
  healthRecommendation?: string;
  color: string;
}

export interface FlightInfo {
  id: string;
  carrier: string;
  carrierLogo?: string;
  flightNumber?: string;
  departure: {
    airport: string;
    iataCode: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    iataCode: string;
    time: string;
    date: string;
  };
  duration: string;
  durationMinutes: number;
  stops: number;
  stopLocations?: string[];
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };
  deepLink?: string;
  cabinClass?: string;
}

export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
}

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  nearestAirport?: Airport;
  timestamp?: number;
}

export interface StreetViewData {
  available: boolean;
  imageUrl?: string;
  heading?: number;
  pitch?: number;
  fov?: number;
}

export interface AerialViewData {
  available: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  state?: 'PROCESSING' | 'ACTIVE' | 'NOT_AVAILABLE';
}

export interface CityInfoPanelData {
  city: CityInfo | null;
  places: PlaceOfInterest[];
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  streetView: StreetViewData | null;
  aerialView: AerialViewData | null;
  flights: FlightInfo[];
  loading: {
    city: boolean;
    places: boolean;
    weather: boolean;
    airQuality: boolean;
    streetView: boolean;
    aerialView: boolean;
    flights: boolean;
  };
  error: {
    city?: string;
    places?: string;
    weather?: string;
    airQuality?: string;
    streetView?: string;
    aerialView?: string;
    flights?: string;
  };
}

// Place category types for filtering
export type PlaceCategory =
  | 'tourist_attraction'
  | 'museum'
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'park'
  | 'shopping_mall'
  | 'landmark'
  | 'natural_feature'
  | 'point_of_interest';

export const PLACE_CATEGORIES: { value: PlaceCategory; label: string; icon: string }[] = [
  { value: 'tourist_attraction', label: 'Attractions', icon: '🏛️' },
  { value: 'museum', label: 'Museums', icon: '🎨' },
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'cafe', label: 'Cafes', icon: '☕' },
  { value: 'park', label: 'Parks', icon: '🌳' },
  { value: 'shopping_mall', label: 'Shopping', icon: '🛍️' },
];

// AQI color mapping
export const AQI_COLORS: Record<string, string> = {
  'Good': '#00E400',
  'Moderate': '#FFFF00',
  'Unhealthy for Sensitive Groups': '#FF7E00',
  'Unhealthy': '#FF0000',
  'Very Unhealthy': '#8F3F97',
  'Hazardous': '#7E0023',
};

export function getAqiCategory(aqi: number): AirQualityData['category'] {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function getAqiColor(aqi: number): string {
  return AQI_COLORS[getAqiCategory(aqi)];
}
