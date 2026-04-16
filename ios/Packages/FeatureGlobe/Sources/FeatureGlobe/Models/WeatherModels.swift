import Foundation

// MARK: - Weather Data

/// Current weather conditions for a location
public struct WeatherData: Codable, Sendable {
    public let temperature: Double       // Celsius
    public let feelsLike: Double
    public let humidity: Int             // 0-100%
    public let description: String
    public let icon: String              // Emoji
    public let windSpeed: Double         // km/h
    public let visibility: Int           // meters
    public let pressure: Int             // hPa

    public init(
        temperature: Double,
        feelsLike: Double,
        humidity: Int,
        description: String,
        icon: String,
        windSpeed: Double,
        visibility: Int,
        pressure: Int
    ) {
        self.temperature = temperature
        self.feelsLike = feelsLike
        self.humidity = humidity
        self.description = description
        self.icon = icon
        self.windSpeed = windSpeed
        self.visibility = visibility
        self.pressure = pressure
    }

    /// Convenience initializer with defaults for optional fields
    public init(
        temperature: Double,
        humidity: Int,
        windSpeed: Double,
        description: String,
        icon: String
    ) {
        self.temperature = temperature
        self.feelsLike = temperature
        self.humidity = humidity
        self.description = description
        self.icon = icon
        self.windSpeed = windSpeed
        self.visibility = 10000
        self.pressure = 1013
    }
}

// MARK: - Air Quality Data

/// Air quality index data for a location
public struct AirQualityData: Codable, Sendable {
    public let aqi: Int                  // US EPA 0-500
    public let category: String          // Good/Moderate/Unhealthy etc.
    public let dominantPollutant: String
    public let color: String             // Hex color

    public init(aqi: Int, category: String, dominantPollutant: String, color: String) {
        self.aqi = aqi
        self.category = category
        self.dominantPollutant = dominantPollutant
        self.color = color
    }

    /// Convenience initializer that auto-generates color from AQI value
    public init(aqi: Int, category: String, dominantPollutant: String) {
        self.aqi = aqi
        self.category = category
        self.dominantPollutant = dominantPollutant
        self.color = Self.aqiColor(for: aqi)
    }

    /// Color based on AQI category
    public static func aqiColor(for aqi: Int) -> String {
        switch aqi {
        case 0...50: return "#22C55E"    // Good - green
        case 51...100: return "#EAB308"  // Moderate - yellow
        case 101...150: return "#F97316" // Unhealthy for sensitive - orange
        case 151...200: return "#EF4444" // Unhealthy - red
        case 201...300: return "#A855F7" // Very unhealthy - purple
        default: return "#7F1D1D"        // Hazardous - maroon
        }
    }

    /// Category name based on AQI value
    public static func aqiCategory(for aqi: Int) -> String {
        switch aqi {
        case 0...50: return "Good"
        case 51...100: return "Moderate"
        case 101...150: return "Unhealthy for Sensitive"
        case 151...200: return "Unhealthy"
        case 201...300: return "Very Unhealthy"
        default: return "Hazardous"
        }
    }
}

// MARK: - Open-Meteo Response Models (Fallback API)

/// Open-Meteo weather response
struct OpenMeteoWeatherResponse: Codable {
    let current: OpenMeteoCurrent?

    struct OpenMeteoCurrent: Codable {
        let temperature_2m: Double?
        let apparent_temperature: Double?
        let relative_humidity_2m: Int?
        let weather_code: Int?
        let wind_speed_10m: Double?
        let surface_pressure: Double?
    }
}

/// Open-Meteo air quality response
struct OpenMeteoAQIResponse: Codable {
    let current: OpenMeteoAQICurrent?

    struct OpenMeteoAQICurrent: Codable {
        let us_aqi: Int?
        let pm2_5: Double?
        let pm10: Double?
        let ozone: Double?
        let nitrogen_dioxide: Double?
    }
}
