import { useState, useCallback, useEffect } from 'react';
import { FlightInfo, UserLocation, Airport } from '@/types/cityInfo';
import { searchFlights, findNearestAirport } from '../services/skyscannerService';

interface UseFlightSearchProps {
  destinationLat: number | null;
  destinationLng: number | null;
  userLocation: UserLocation | null;
}

interface UseFlightSearchResult {
  flights: FlightInfo[];
  loading: boolean;
  error: string | null;
  originAirport: Airport | null;
  destinationAirport: Airport | null;
  departureDate: string;
  setDepartureDate: (date: string) => void;
  setCustomOrigin: (airport: Airport | null) => void;
  customOrigin: Airport | null;
  search: () => Promise<void>;
}

// Get tomorrow's date in YYYY-MM-DD format
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export function useFlightSearch({
  destinationLat,
  destinationLng,
  userLocation,
}: UseFlightSearchProps): UseFlightSearchResult {
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departureDate, setDepartureDate] = useState(getTomorrowDate());
  const [serverOriginAirport, setServerOriginAirport] = useState<Airport | null>(null);
  const [serverDestinationAirport, setServerDestinationAirport] = useState<Airport | null>(null);
  const [customOrigin, setCustomOrigin] = useState<Airport | null>(null);

  // Determine the effective origin airport
  const detectedOriginAirport = userLocation
    ? userLocation.nearestAirport || findNearestAirport(userLocation.lat, userLocation.lng)
    : null;

  // Use custom origin if set, otherwise use detected/server origin
  const originAirport = customOrigin || serverOriginAirport || detectedOriginAirport;

  const destinationAirport =
    serverDestinationAirport ||
    (destinationLat !== null && destinationLng !== null
      ? findNearestAirport(destinationLat, destinationLng)
      : null);

  // Reset custom origin when user location changes (optional behavior)
  useEffect(() => {
    // Don't reset if user explicitly set a custom origin
  }, [userLocation]);

  const search = useCallback(async () => {
    // Use custom origin coordinates if set, otherwise user location
    const originLat = customOrigin?.coordinates?.lat ?? userLocation?.lat;
    const originLng = customOrigin?.coordinates?.lng ?? userLocation?.lng;

    if (originLat === undefined || originLng === undefined || destinationLat === null || destinationLng === null) {
      setError('Please select or enable location to search for flights');
      return;
    }

    const originIata = originAirport?.iataCode;
    const destIata = destinationAirport?.iataCode;

    if (originIata && destIata && originIata === destIata) {
      setError('Origin and destination airports are the same');
      return;
    }

    setLoading(true);
    setError(null);
    setFlights([]);

    try {
      // Call edge function with coordinates
      const result = await searchFlights(
        originLat,
        originLng,
        destinationLat,
        destinationLng,
        departureDate
      );

      // Update airport info from server response (only if not using custom origin)
      if (result.originAirport && !customOrigin) {
        setServerOriginAirport(result.originAirport);
      }
      if (result.destinationAirport) {
        setServerDestinationAirport(result.destinationAirport);
      }

      if (result.flights.length === 0) {
        setError('No flights found for this route');
      } else {
        setFlights(result.flights);
      }
    } catch (e) {
      console.error('Flight search error:', e);
      setError('Failed to search for flights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userLocation, customOrigin, destinationLat, destinationLng, departureDate, originAirport, destinationAirport]);

  return {
    flights,
    loading,
    error,
    originAirport,
    destinationAirport,
    departureDate,
    setDepartureDate,
    setCustomOrigin,
    customOrigin,
    search,
  };
}

export default useFlightSearch;
