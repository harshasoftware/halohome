import React, { useEffect, useState } from 'react';
import { Plane, MapPin, Search, ExternalLink, Loader2, Calendar, Clock, AlertCircle, ChevronDown, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFlightSearch } from '../../../hooks/useFlightSearch';
import { FlightInfo, Airport } from '@/types/cityInfo';

// Major airports for selection
const MAJOR_AIRPORTS: Airport[] = [
  { iataCode: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', coordinates: { lat: 28.5562, lng: 77.1000 } },
  { iataCode: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India', coordinates: { lat: 19.0896, lng: 72.8656 } },
  { iataCode: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'India', coordinates: { lat: 12.9941, lng: 80.1709 } },
  { iataCode: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'India', coordinates: { lat: 13.1986, lng: 77.7066 } },
  { iataCode: 'CCU', name: 'Netaji Subhas Chandra Bose', city: 'Kolkata', country: 'India', coordinates: { lat: 22.6520, lng: 88.4463 } },
  { iataCode: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'India', coordinates: { lat: 17.2403, lng: 78.4294 } },
  { iataCode: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', coordinates: { lat: 51.4700, lng: -0.4543 } },
  { iataCode: 'LGW', name: 'Gatwick', city: 'London', country: 'UK', coordinates: { lat: 51.1537, lng: -0.1821 } },
  { iataCode: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA', coordinates: { lat: 40.6413, lng: -73.7781 } },
  { iataCode: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', coordinates: { lat: 33.9425, lng: -118.4081 } },
  { iataCode: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'USA', coordinates: { lat: 41.9742, lng: -87.9073 } },
  { iataCode: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'USA', coordinates: { lat: 37.6213, lng: -122.3790 } },
  { iataCode: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', coordinates: { lat: 25.2532, lng: 55.3657 } },
  { iataCode: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', coordinates: { lat: 1.3644, lng: 103.9915 } },
  { iataCode: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'China', coordinates: { lat: 22.3080, lng: 113.9185 } },
  { iataCode: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', coordinates: { lat: 49.0097, lng: 2.5479 } },
  { iataCode: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', coordinates: { lat: 50.0379, lng: 8.5622 } },
  { iataCode: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', coordinates: { lat: 52.3105, lng: 4.7683 } },
  { iataCode: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', coordinates: { lat: 35.7647, lng: 140.3864 } },
  { iataCode: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', coordinates: { lat: 37.4602, lng: 126.4407 } },
  { iataCode: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', coordinates: { lat: -33.9399, lng: 151.1753 } },
  { iataCode: 'MEL', name: 'Melbourne', city: 'Melbourne', country: 'Australia', coordinates: { lat: -37.6690, lng: 144.8410 } },
  { iataCode: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', coordinates: { lat: 25.2731, lng: 51.6081 } },
  { iataCode: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', coordinates: { lat: 41.2619, lng: 28.7419 } },
];

interface FlightsTabProps {
  destinationLat: number;
  destinationLng: number;
  destinationName: string;
  userLocation: {
    location: { lat: number; lng: number; city?: string; nearestAirport?: { iataCode: string; name: string } } | null;
    loading: boolean;
    error: string | null;
    requestLocation: () => void;
  };
}

export const FlightsTab: React.FC<FlightsTabProps> = ({
  destinationLat,
  destinationLng,
  destinationName,
  userLocation,
}) => {
  const [showAirportPicker, setShowAirportPicker] = useState(false);
  const [airportSearch, setAirportSearch] = useState('');

  const {
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
  } = useFlightSearch({
    destinationLat,
    destinationLng,
    userLocation: userLocation.location,
  });

  // Auto-search when user location becomes available (only if no custom origin set)
  useEffect(() => {
    if (userLocation.location && destinationAirport && !loading && flights.length === 0 && !customOrigin) {
      search();
    }
  }, [userLocation.location]);

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Filter airports based on search
  const filteredAirports = MAJOR_AIRPORTS.filter(airport => {
    const searchLower = airportSearch.toLowerCase();
    return (
      airport.city.toLowerCase().includes(searchLower) ||
      airport.name.toLowerCase().includes(searchLower) ||
      airport.iataCode.toLowerCase().includes(searchLower) ||
      airport.country.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAirport = (airport: Airport) => {
    setCustomOrigin(airport);
    setShowAirportPicker(false);
    setAirportSearch('');
  };

  const handleUseCurrentLocation = () => {
    setCustomOrigin(null);
    setShowAirportPicker(false);
    setAirportSearch('');
  };

  const hasOrigin = originAirport || userLocation.location || customOrigin;

  return (
    <div className="flex flex-col">
      {/* Search Form - Sticky Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
        {/* Origin */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">From</label>
          {hasOrigin ? (
            <button
              onClick={() => setShowAirportPicker(true)}
              className="w-full flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {originAirport?.city || userLocation.location?.city || 'Your Location'}
                  {customOrigin && <span className="text-xs text-blue-500 ml-1">(Custom)</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {originAirport?.iataCode} - {originAirport?.name}
                </p>
              </div>
              <Edit2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={userLocation.requestLocation}
                disabled={userLocation.loading}
              >
                {userLocation.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Use my current location
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-600"
                onClick={() => setShowAirportPicker(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Or select an airport
              </Button>
            </div>
          )}
          {userLocation.error && (
            <p className="text-xs text-red-500 mt-1">{userLocation.error}</p>
          )}
        </div>

        {/* Destination */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">To</label>
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <Plane className="w-4 h-4 text-purple-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{destinationName}</p>
              <p className="text-xs text-slate-500">
                {destinationAirport?.iataCode} - {destinationAirport?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
            <Calendar className="w-3 h-3 inline mr-1" />
            Departure Date
          </label>
          <Input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            min={getMinDate()}
            className="h-9"
          />
        </div>

        {/* Search Button */}
        <Button
          onClick={search}
          disabled={!hasOrigin || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Flights
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <div className="">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">{error}</p>
            <Button variant="outline" size="sm" onClick={search} className="mt-2">
              Try Again
            </Button>
          </div>
        ) : flights.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <Plane className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">
              {hasOrigin
                ? 'Search for flights to see options'
                : 'Select origin to find flights'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-500">
              {flights.length} flight{flights.length !== 1 ? 's' : ''} found
            </p>
            {flights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        )}
      </div>

      {/* Airport Picker Modal */}
      {showAirportPicker && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setShowAirportPicker(false);
                setAirportSearch('');
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-semibold">Select Departure Airport</h3>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search city or airport..."
                value={airportSearch}
                onChange={(e) => setAirportSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Use Current Location Option */}
          {userLocation.location && (
            <button
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-blue-600 dark:text-blue-400">Use Current Location</p>
                <p className="text-xs text-slate-500">
                  {userLocation.location.city || 'Your detected location'}
                </p>
              </div>
            </button>
          )}

          {/* Airport List */}
          <div className="flex-1 overflow-y-auto">
            {filteredAirports.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <p className="text-sm">No airports found</p>
              </div>
            ) : (
              filteredAirports.map((airport) => (
                <button
                  key={airport.iataCode}
                  onClick={() => handleSelectAirport(airport)}
                  className={`flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 w-full text-left ${
                    customOrigin?.iataCode === airport.iataCode ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {airport.iataCode}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{airport.city}</p>
                    <p className="text-xs text-slate-500 truncate">{airport.name}</p>
                  </div>
                  <span className="text-xs text-slate-400">{airport.country}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface FlightCardProps {
  flight: FlightInfo;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md transition-shadow">
      {/* Carrier & Price Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {flight.carrierLogo ? (
            <img src={flight.carrierLogo} alt={flight.carrier} className="w-6 h-6 object-contain" />
          ) : (
            <Plane className="w-5 h-5 text-slate-400" />
          )}
          <span className="text-sm font-medium">{flight.carrier}</span>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-green-600 dark:text-green-400">
            {flight.price.formatted}
          </p>
          <p className="text-xs text-slate-500">per person</p>
        </div>
      </div>

      {/* Flight Details Row */}
      <div className="flex items-center justify-between">
        {/* Departure */}
        <div className="text-center">
          <p className="text-lg font-semibold">{flight.departure.time}</p>
          <p className="text-xs text-slate-500">{flight.departure.iataCode}</p>
        </div>

        {/* Duration & Stops */}
        <div className="flex-1 px-3">
          <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
            <Clock className="w-3 h-3" />
            {flight.duration}
          </div>
          <div className="relative">
            <div className="h-0.5 bg-slate-200 dark:bg-slate-700 w-full" />
            <div className="absolute top-1/2 left-0 w-2 h-2 -mt-1 rounded-full bg-slate-400" />
            <div className="absolute top-1/2 right-0 w-2 h-2 -mt-1 rounded-full bg-slate-400" />
            {flight.stops > 0 && (
              <div className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-orange-400" />
            )}
          </div>
          <p className="text-xs text-center mt-1 text-slate-500">
            {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Arrival */}
        <div className="text-center">
          <p className="text-lg font-semibold">{flight.arrival.time}</p>
          <p className="text-xs text-slate-500">{flight.arrival.iataCode}</p>
        </div>
      </div>

      {/* Book Button */}
      {flight.deepLink && (
        <a
          href={flight.deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Book Now
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};

export default FlightsTab;
