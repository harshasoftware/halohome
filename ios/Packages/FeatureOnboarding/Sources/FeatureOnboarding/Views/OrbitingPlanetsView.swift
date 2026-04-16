import SwiftUI
import DesignSystem

// MARK: - Orbiting Planets View

/// Planets orbiting around a center point with visible orbit rings.
/// SwiftUI translation of web's OrbitingPlanets component.
///
/// Web config (desktop): radii 320-560px, sizes 42-58px, durations 50-125s
/// Mobile scaling: radii * 0.28, sizes * 0.55 for iPhone screens
///
/// CSS animation: `rotate(startAngle) translateX(radius) rotate(-startAngle)`
/// SwiftUI equivalent: `.offset(x: radius).rotationEffect(.degrees(angle + startAngle))`
struct OrbitingPlanetsView: View {

    @State private var isReady = false

    // Web's ORBITAL_PLANETS config scaled for mobile
    private static let planets: [OrbitalPlanetConfig] = [
        .init(
            name: "Venus", radius: 90, duration: 50, size: 22,
            startAngle: 0, color: .acPlanetVenus, secondaryColor: Color(red: 1, green: 0.6, blue: 0.8)
        ),
        .init(
            name: "Mars", radius: 108, duration: 65, size: 26,
            startAngle: 72, color: .acPlanetMars, secondaryColor: Color(red: 1, green: 0.4, blue: 0.2)
        ),
        .init(
            name: "Jupiter", radius: 126, duration: 85, size: 30,
            startAngle: 144, color: .acPlanetJupiter, secondaryColor: Color(red: 1, green: 0.75, blue: 0.3)
        ),
        .init(
            name: "Saturn", radius: 144, duration: 105, size: 28,
            startAngle: 216, color: .acPlanetSaturn, secondaryColor: Color(red: 0.92, green: 0.75, blue: 0.3)
        ),
        .init(
            name: "Neptune", radius: 162, duration: 125, size: 24,
            startAngle: 288, color: .acPlanetNeptune, secondaryColor: Color(red: 0.35, green: 0.5, blue: 0.95)
        ),
    ]

    var body: some View {
        ZStack {
            if isReady {
                // Orbit rings — subtle circular tracks
                // Web: .orbit-path { outline: 1px solid rgba(255,255,255,0.03) }
                ForEach(Self.planets) { planet in
                    Circle()
                        .stroke(Color.white.opacity(0.04), lineWidth: 1)
                        .frame(width: planet.radius * 2, height: planet.radius * 2)
                }

                // Orbiting planets
                ForEach(Self.planets) { planet in
                    OrbitalPlanetView(config: planet)
                }
            }
        }
        .frame(width: 340, height: 340)
        .opacity(isReady ? 1 : 0)
        .onAppear {
            // Defer rendering like web's requestIdleCallback
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.easeOut(duration: 1)) {
                    isReady = true
                }
            }
        }
    }
}

// MARK: - Orbital Planet Config

private struct OrbitalPlanetConfig: Identifiable {
    let id = UUID()
    let name: String
    let radius: CGFloat
    let duration: Double
    let size: CGFloat
    let startAngle: Double
    let color: Color
    let secondaryColor: Color
}

// MARK: - Orbital Planet View

/// Single orbiting planet with continuous rotation animation.
///
/// The orbit works by:
/// 1. Offset the planet from center by `radius` (horizontal)
/// 2. Rotate the offset around center using `.rotationEffect`
/// 3. The angle animates 0→360 linearly, creating circular motion
/// 4. Since the planet is a circle, its own rotation is invisible
private struct OrbitalPlanetView: View {
    let config: OrbitalPlanetConfig
    @State private var angle: Double = 0

    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [
                        config.color.opacity(0.95),
                        config.secondaryColor.opacity(0.5),
                    ],
                    center: .topLeading,
                    startRadius: 0,
                    endRadius: config.size
                )
            )
            .frame(width: config.size, height: config.size)
            .shadow(color: config.color.opacity(0.5), radius: 8)
            // Web CSS: opacity: 0.7
            .opacity(0.7)
            // Move planet out to orbit radius from center
            .offset(x: config.radius)
            // Rotate around center — creates circular orbit
            .rotationEffect(.degrees(angle + config.startAngle))
            .onAppear {
                withAnimation(
                    .linear(duration: config.duration)
                    .repeatForever(autoreverses: false)
                ) {
                    angle = 360
                }
            }
    }
}

// MARK: - Saturn Ring Overlay

/// Optional Saturn ring decoration for the Saturn planet
/// Not currently used — can be added to OrbitalPlanetView for Saturn specifically
private struct SaturnRingShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        path.addEllipse(in: CGRect(
            x: center.x - rect.width * 0.7,
            y: center.y - rect.height * 0.15,
            width: rect.width * 1.4,
            height: rect.height * 0.3
        ))
        return path
    }
}

// MARK: - Preview

#Preview("Orbiting Planets") {
    ZStack {
        Color(red: 0.02, green: 0.02, blue: 0.02)
            .ignoresSafeArea()

        OrbitingPlanetsView()
    }
    .preferredColorScheme(.dark)
}

#Preview("Orbiting Planets - With Globe") {
    ZStack {
        Color(red: 0.02, green: 0.02, blue: 0.02)
            .ignoresSafeArea()

        ZStack {
            OrbitingPlanetsView()

            Image(systemName: "globe.americas")
                .font(.system(size: 60, weight: .light))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color(red: 0.96, green: 0.62, blue: 0.05),
                            Color(red: 0.6, green: 0.4, blue: 1.0)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
    }
    .preferredColorScheme(.dark)
}
