import SwiftUI

/// A reusable cosmic background component that replicates the web landing page aesthetic.
/// Features:
/// - Deep space black background
/// - Animated nebula clouds (Purple, Blue, Pink)
/// - Twinkling star field
/// - Optional constellation overlays
@available(iOS 17.0, *)
struct CosmicBackground: View {
    
    // MARK: - Properties
    
    var body: some View {
        ZStack {
            // 1. Deep space base
            Color(hex: "050505").ignoresSafeArea()
            
            // 2. Star Field
            StarField()
            
            // 3. Constellations
            ConstellationLayer()
        }
    }
}

// MARK: - Constellations

@available(iOS 17.0, *)
struct ConstellationLayer: View {
    
    // Simple constellation patterns (normalized coordinates 0-1)
    struct Pattern {
        let stars: [CGPoint]
        let connections: [(Int, Int)]
    }
    
    // Orion-like
    private let orion = Pattern(
        stars: [
            CGPoint(x: 0.2, y: 0.1), CGPoint(x: 0.8, y: 0.15), // Shoulders
            CGPoint(x: 0.45, y: 0.4), CGPoint(x: 0.5, y: 0.4), CGPoint(x: 0.55, y: 0.4), // Belt
            CGPoint(x: 0.25, y: 0.7), CGPoint(x: 0.75, y: 0.65) // Knees
        ],
        connections: [(0,2), (1,4), (2,3), (3,4), (2,5), (4,6)]
    )
    
    // Big Dipper-like
    private let bigDipper = Pattern(
        stars: [
            CGPoint(x: 0.1, y: 0.2), CGPoint(x: 0.3, y: 0.15), CGPoint(x: 0.45, y: 0.25), // Handle
            CGPoint(x: 0.6, y: 0.4), CGPoint(x: 0.8, y: 0.45), CGPoint(x: 0.85, y: 0.65), CGPoint(x: 0.65, y: 0.6) // Bowl
        ],
        connections: [(0,1), (1,2), (2,3), (3,4), (4,5), (5,6), (6,3)]
    )
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Render Orion (Top Right, rotated)
                ConstellationView(pattern: orion)
                    .frame(width: 150, height: 200)
                    .position(x: geometry.size.width * 0.8, y: geometry.size.height * 0.2)
                    .opacity(0.4)
                    .rotationEffect(.degrees(15))
                
                // Render Big Dipper (Bottom Left, rotated)
                ConstellationView(pattern: bigDipper)
                    .frame(width: 180, height: 120)
                    .position(x: geometry.size.width * 0.2, y: geometry.size.height * 0.8)
                    .opacity(0.3)
                    .rotationEffect(.degrees(-10))
                
                // Render Small Cassiopeia (Top Left)
                ConstellationView(pattern: Pattern(
                    stars: [
                        CGPoint(x: 0.1, y: 0.8), CGPoint(x: 0.3, y: 0.5), CGPoint(x: 0.5, y: 0.6), CGPoint(x: 0.7, y: 0.4), CGPoint(x: 0.9, y: 0.7)
                    ],
                    connections: [(0,1), (1,2), (2,3), (3,4)]
                ))
                    .frame(width: 120, height: 80)
                    .position(x: geometry.size.width * 0.15, y: geometry.size.height * 0.15)
                    .opacity(0.25)
            }
        }
        .allowsHitTesting(false)
    }
}

@available(iOS 17.0, *)
struct ConstellationView: View {
    let pattern: ConstellationLayer.Pattern
    
    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Lines
                Path { path in
                    for (start, end) in pattern.connections {
                        if start < pattern.stars.count && end < pattern.stars.count {
                            let p1 = CGPoint(x: pattern.stars[start].x * geo.size.width, y: pattern.stars[start].y * geo.size.height)
                            let p2 = CGPoint(x: pattern.stars[end].x * geo.size.width, y: pattern.stars[end].y * geo.size.height)
                            path.move(to: p1)
                            path.addLine(to: p2)
                        }
                    }
                }
                .stroke(Color.white.opacity(0.3), lineWidth: 0.5)
                
                // Stars
                ForEach(0..<pattern.stars.count, id: \.self) { index in
                    let point = pattern.stars[index]
                    Circle()
                        .fill(Color.white)
                        .frame(width: 2, height: 2)
                        .position(x: point.x * geo.size.width, y: point.y * geo.size.height)
                        .shadow(color: .white, radius: 2)
                }
            }
        }
    }
}

// MARK: - Star Field

@available(iOS 17.0, *)
struct StarField: View {
    
    // Particle model for the canvas
    struct StarParticle {
        var x: Double
        var y: Double
        let size: Double
        let speed: Double // Vertical speed
        var opacity: Double
        let maxOpacity: Double
        var flickerSpeed: Double
    }
    
    @State private var particles: [StarParticle] = {
        var p = [StarParticle]()
        for _ in 0..<120 { // Increased count for better density
            p.append(StarParticle(
                x: Double.random(in: 0...1),
                y: Double.random(in: 0...1),
                size: Double.random(in: 1...3.0),
                speed: Double.random(in: 0.005...0.02), // Slowed down from 0.02...0.08
                opacity: Double.random(in: 0.2...0.8),
                maxOpacity: Double.random(in: 0.5...1.0),
                flickerSpeed: Double.random(in: 0.5...2.0)
            ))
        }
        return p
    }()
    
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate
                
                for index in particles.indices {
                    let particle = particles[index]
                    
                    // 1. Update Position (Move up)
                    // We use the time delta to calculate consistent movement, 
                    // but for simplicity in this stateless canvas loop, we can calculate y based on time
                    // However, to keep it wrapping nicely with random speeds, we can use a modulo based on time * speed
                    
                    // y = initialY - (time * speed)
                    // We want it to loop 0...1.
                    let movement = time * particle.speed
                    let currentY = (particle.y - movement).truncatingRemainder(dividingBy: 1.0)
                    
                    // Handle negative modulo result in Swift
                    let normalizedY = currentY < 0 ? currentY + 1.0 : currentY
                    
                    // 2. Calculate Flicker/Blink
                    // Sine wave based on time for smooth twinkling
                    let flicker = sin(time * particle.flickerSpeed * 5)
                    let currentOpacity = particle.opacity + (flicker * 0.2) // +/- 0.2 fluctuation
                    
                    // 3. Draw
                    let rect = CGRect(
                        x: particle.x * size.width,
                        y: normalizedY * size.height,
                        width: particle.size,
                        height: particle.size
                    )
                    
                    context.opacity = max(0.1, min(particle.maxOpacity, currentOpacity))
                    context.fill(Path(ellipseIn: rect), with: .color(.white))
                }
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Helper Views

@available(iOS 17.0, *)
struct BlinkingViewModifier: ViewModifier {
    let duration: Double
    @State private var isFaded = false
    
    func body(content: Content) -> some View {
        content
            .opacity(isFaded ? 0.3 : 1.0)
            .onAppear {
                withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
                    isFaded.toggle()
                }
            }
    }
}

@available(iOS 17.0, *)
extension View {
    func blinking(duration: Double = 1) -> some View {
        modifier(BlinkingViewModifier(duration: duration))
    }
}

// MARK: - Color Extensions

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    CosmicBackground()
}
