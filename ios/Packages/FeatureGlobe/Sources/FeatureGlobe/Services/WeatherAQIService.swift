import Foundation

// MARK: - Weather & AQI Service

/// Fetches weather and air quality data for a location.
/// Uses Open-Meteo free API (no API key required).
public actor WeatherAQIService {

    // MARK: - Cache

    private struct CacheEntry<T> {
        let data: T
        let timestamp: Date
        let ttl: TimeInterval

        var isExpired: Bool {
            Date().timeIntervalSince(timestamp) > ttl
        }
    }

    private var weatherCache: [String: CacheEntry<WeatherData>] = [:]
    private var aqiCache: [String: CacheEntry<AirQualityData>] = [:]

    private let weatherTTL: TimeInterval = 30 * 60  // 30 minutes
    private let aqiTTL: TimeInterval = 60 * 60       // 60 minutes

    private let session: URLSession

    // MARK: - Init

    public init(session: URLSession = .shared) {
        self.session = session
    }

    // MARK: - Public API

    /// Fetch current weather for a location
    public func fetchWeather(lat: Double, lng: Double) async -> WeatherData? {
        let key = cacheKey(lat: lat, lng: lng)

        // Check cache
        if let cached = weatherCache[key], !cached.isExpired {
            return cached.data
        }

        // Fetch from Open-Meteo (free, no API key)
        do {
            let data = try await fetchOpenMeteoWeather(lat: lat, lng: lng)
            weatherCache[key] = CacheEntry(data: data, timestamp: Date(), ttl: weatherTTL)
            return data
        } catch {
            return nil
        }
    }

    /// Fetch air quality for a location
    public func fetchAirQuality(lat: Double, lng: Double) async -> AirQualityData? {
        let key = cacheKey(lat: lat, lng: lng)

        // Check cache
        if let cached = aqiCache[key], !cached.isExpired {
            return cached.data
        }

        // Fetch from Open-Meteo Air Quality API
        do {
            let data = try await fetchOpenMeteoAQI(lat: lat, lng: lng)
            aqiCache[key] = CacheEntry(data: data, timestamp: Date(), ttl: aqiTTL)
            return data
        } catch {
            return nil
        }
    }

    // MARK: - Open-Meteo Fetchers

    private func fetchOpenMeteoWeather(lat: Double, lng: Double) async throws -> WeatherData {
        let urlString = "https://api.open-meteo.com/v1/forecast?latitude=\(lat)&longitude=\(lng)&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure"

        guard let url = URL(string: urlString) else {
            throw WeatherError.invalidURL
        }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw WeatherError.networkError
        }

        let decoded = try JSONDecoder().decode(OpenMeteoWeatherResponse.self, from: data)

        guard let current = decoded.current else {
            throw WeatherError.noData
        }

        let weatherCode = current.weather_code ?? 0
        let (description, icon) = weatherDescription(for: weatherCode)

        return WeatherData(
            temperature: current.temperature_2m ?? 0,
            feelsLike: current.apparent_temperature ?? 0,
            humidity: current.relative_humidity_2m ?? 0,
            description: description,
            icon: icon,
            windSpeed: current.wind_speed_10m ?? 0,
            visibility: 10000, // Open-Meteo doesn't provide visibility in free tier
            pressure: Int(current.surface_pressure ?? 1013)
        )
    }

    private func fetchOpenMeteoAQI(lat: Double, lng: Double) async throws -> AirQualityData {
        let urlString = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=\(lat)&longitude=\(lng)&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide"

        guard let url = URL(string: urlString) else {
            throw WeatherError.invalidURL
        }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw WeatherError.networkError
        }

        let decoded = try JSONDecoder().decode(OpenMeteoAQIResponse.self, from: data)

        guard let current = decoded.current else {
            throw WeatherError.noData
        }

        let aqi = current.us_aqi ?? 0

        // Determine dominant pollutant
        let pollutants: [(String, Double)] = [
            ("PM2.5", current.pm2_5 ?? 0),
            ("PM10", current.pm10 ?? 0),
            ("O₃", current.ozone ?? 0),
            ("NO₂", current.nitrogen_dioxide ?? 0),
        ]
        let dominant = pollutants.max(by: { $0.1 < $1.1 })?.0 ?? "PM2.5"

        return AirQualityData(
            aqi: aqi,
            category: AirQualityData.aqiCategory(for: aqi),
            dominantPollutant: dominant,
            color: AirQualityData.aqiColor(for: aqi)
        )
    }

    // MARK: - Helpers

    private func cacheKey(lat: Double, lng: Double) -> String {
        let roundedLat = (lat * 100).rounded() / 100
        let roundedLng = (lng * 100).rounded() / 100
        return "\(roundedLat)-\(roundedLng)"
    }

    /// Map WMO weather code to description and emoji
    private func weatherDescription(for code: Int) -> (String, String) {
        switch code {
        case 0: return ("Clear sky", "☀️")
        case 1: return ("Mainly clear", "🌤️")
        case 2: return ("Partly cloudy", "⛅")
        case 3: return ("Overcast", "☁️")
        case 45, 48: return ("Foggy", "🌫️")
        case 51, 53, 55: return ("Drizzle", "🌦️")
        case 56, 57: return ("Freezing drizzle", "🌧️")
        case 61, 63, 65: return ("Rain", "🌧️")
        case 66, 67: return ("Freezing rain", "🌧️")
        case 71, 73, 75: return ("Snowfall", "🌨️")
        case 77: return ("Snow grains", "🌨️")
        case 80, 81, 82: return ("Rain showers", "🌦️")
        case 85, 86: return ("Snow showers", "🌨️")
        case 95: return ("Thunderstorm", "⛈️")
        case 96, 99: return ("Thunderstorm with hail", "⛈️")
        default: return ("Unknown", "🌤️")
        }
    }
}

// MARK: - Errors

enum WeatherError: Error {
    case invalidURL
    case networkError
    case noData
}
