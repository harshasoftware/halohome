import SwiftUI
import DesignSystem

// MARK: - Weather Widget

/// Compact weather widget for the globe view, similar to Apple Maps.
/// Shows current temperature and conditions for the selected/viewed location.
@available(iOS 17.0, *)
public struct WeatherWidget: View {

    let weatherData: WeatherData?
    let airQualityData: AirQualityData?
    let isLoading: Bool
    let onTap: (() -> Void)?

    public init(
        weatherData: WeatherData?,
        airQualityData: AirQualityData?,
        isLoading: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.weatherData = weatherData
        self.airQualityData = airQualityData
        self.isLoading = isLoading
        self.onTap = onTap
    }

    public var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: 6) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                        .frame(width: 20, height: 20)
                } else if let weather = weatherData {
                    // Weather icon
                    Text(weather.icon)
                        .font(.system(size: 16))

                    // Temperature
                    Text("\(Int(weather.temperature.rounded()))°")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color.acGlassTextPrimary)

                    // AQI with number and colored indicator
                    if let aqi = airQualityData {
                        HStack(spacing: 3) {
                            Circle()
                                .fill(aqiColor(aqi.aqi))
                                .frame(width: 6, height: 6)
                            Text("\(aqi.aqi)")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(aqiColor(aqi.aqi))
                        }
                    }
                } else {
                    // No data state
                    Image(systemName: "cloud.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.acGlassTextSecondary)

                    Text("--°")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color.acGlassTextSecondary)
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 44) // Match FloatingIconButton height for symmetry
            .acDarkGlassCapsule()
            .shadow(color: .black.opacity(0.2), radius: 8, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint("Double tap for weather details")
    }

    private func aqiColor(_ aqi: Int) -> Color {
        switch aqi {
        case 0...50: return .green
        case 51...100: return .yellow
        case 101...150: return .orange
        case 151...200: return .red
        case 201...300: return .purple
        default: return Color(red: 0.5, green: 0.1, blue: 0.1)
        }
    }

    private var accessibilityLabel: String {
        guard let weather = weatherData else { return "Weather data unavailable" }
        var label = "\(Int(weather.temperature.rounded())) degrees, \(weather.description)"
        if let aqi = airQualityData {
            label += ", air quality \(aqi.category)"
        }
        return label
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Weather Widget") {
    ZStack {
        Color.acBackground.ignoresSafeArea()

        VStack(spacing: 20) {
            // With data
            WeatherWidget(
                weatherData: WeatherData(
                    temperature: 22,
                    humidity: 65,
                    windSpeed: 12,
                    description: "Partly cloudy",
                    icon: "⛅️"
                ),
                airQualityData: AirQualityData(
                    aqi: 45,
                    category: "Good",
                    dominantPollutant: "PM2.5"
                )
            )

            // Loading
            WeatherWidget(
                weatherData: nil,
                airQualityData: nil,
                isLoading: true
            )

            // No data
            WeatherWidget(
                weatherData: nil,
                airQualityData: nil
            )
        }
    }
    .preferredColorScheme(.dark)
}
#endif
