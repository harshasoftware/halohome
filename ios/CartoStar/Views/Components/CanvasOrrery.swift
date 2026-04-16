import SwiftUI

// MARK: - Canvas Orrery

@available(iOS 17.0, *)
struct CanvasOrrery: View {
    
    // Configurable properties
    // (planetName, orbitRadiusRatio, orbitDuration, color, imageName)
    // (planetName, orbitRadiusRatio, orbitDuration, color, imageName)
    // (planetName, orbitRadiusRatio, orbitDuration, coreColor, glowColor, imageName)
    // Colors matched from Landing.css (Purple, Blue, Pink cycling)
    let planets: [(String, Double, Double, Color, Color, String?)] = [
        // Venus (Purple-ish)
        ("venus", 0.45, 12, 
         Color(red: 147/255, green: 112/255, blue: 219/255), // MediumPurple
         Color(red: 147/255, green: 112/255, blue: 219/255).opacity(0.5), 
         "planet-venus"),
        
        // Earth (Blue-ish)
        ("earth", 0.55, 15, 
         Color(red: 100/255, green: 149/255, blue: 237/255), // CornflowerBlue
         Color(red: 100/255, green: 149/255, blue: 237/255).opacity(0.5), 
         "planet-earth"),
        
        // Mars (Red/Pink-ish)
        ("mars", 0.65, 18, 
         Color(red: 255/255, green: 182/255, blue: 193/255), // LightPink (from CSS)
         Color(red: 255/255, green: 182/255, blue: 193/255).opacity(0.5), 
         "planet-mars"),
        
        // Jupiter (Purple cycle)
        ("jupiter", 0.80, 25, 
         Color(red: 147/255, green: 112/255, blue: 219/255), 
         Color(red: 147/255, green: 112/255, blue: 219/255).opacity(0.5), 
         "planet-jupiter"),
        
        // Saturn (Blue cycle)
        ("saturn", 0.95, 30, 
         Color(red: 100/255, green: 149/255, blue: 237/255), 
         Color(red: 100/255, green: 149/255, blue: 237/255).opacity(0.5), 
         "planet-saturn")
    ]
    
    @State private var selectedPlanetIndex: Int? = nil
    
    var body: some View {
        GeometryReader { geometry in
            let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
            let maxRadius = min(geometry.size.width, geometry.size.height) / 2
            
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let time = timeline.date.timeIntervalSinceReferenceDate
                    
                    // SUN REMOVED
                    
                    for (index, planet) in planets.enumerated() {
                        let orbitRadius = maxRadius * planet.1
                        let isSelected = selectedPlanetIndex == index
                        
                        // Default state: Very faint white/gray (uniform look)
                        // Active state: Vibrant color + Glow
                        let strokeColor = isSelected ? planet.4 : Color.white.opacity(0.1)
                        let lineWidth = isSelected ? 2.0 : 1.0 // Thicker when active
                        
                        let orbitPath = Path(ellipseIn: CGRect(
                            x: center.x - orbitRadius,
                            y: center.y - orbitRadius,
                            width: orbitRadius * 2,
                            height: orbitRadius * 2
                        ))
                        
                        // 1. Draw Glow (Only active) - ORBIT
                        if isSelected {
                            var glowContext = context
                            glowContext.addFilter(.blur(radius: 2))
                            glowContext.stroke(
                                orbitPath,
                                with: .color(planet.4.opacity(0.6)), // Strong glow
                                lineWidth: 2.5
                            )
                            
                            var outerGlowContext = context
                            outerGlowContext.addFilter(.blur(radius: 4)) // Softer outer blur
                            outerGlowContext.stroke(
                                orbitPath,
                                with: .color(planet.4.opacity(0.4)),
                                lineWidth: 5.0
                            )
                        }
                        
                        // 2. Draw Main Ring
                        context.stroke(
                            orbitPath,
                            with: .color(strokeColor),
                            lineWidth: lineWidth
                        )
                        
                        // Calculate Planet Position
                        let speedFactor = 0.20
                        let angle = (time / planet.2) * 2 * .pi * speedFactor
                        let x = center.x + cos(angle) * orbitRadius
                        let y = center.y + sin(angle) * orbitRadius
                        
                        // Draw Planet
                        let baseSize = 14.0 + (Double(index) * 0.5)
                        // Scale up if selected
                        let scale = isSelected ? 1.5 : 1.0
                        let finalSize = baseSize * scale
                        
                        let planetRect = CGRect(
                            x: x - finalSize / 2,
                            y: y - finalSize / 2,
                            width: finalSize,
                            height: finalSize
                        )

                        // 3. Draw Planet Glow (BEHIND planet)
                        if isSelected {
                            var planetGlowContext = context
                            planetGlowContext.addFilter(.blur(radius: 8))
                            planetGlowContext.fill(
                                Path(ellipseIn: planetRect),
                                with: .color(planet.4.opacity(0.8))
                            )
                        }
                        
                        // 4. Draw Planet Image (Sharp, on top)
                        var drawn = false
                        if let imageName = planet.5 {
                            let resolved = context.resolve(Image(imageName))
                            let imageSize = finalSize * 1.8 
                            let imageRect = CGRect(
                                x: x - imageSize / 2,
                                y: y - imageSize / 2,
                                width: imageSize,
                                height: imageSize
                            )
                            context.draw(resolved, in: imageRect)
                            drawn = true
                        }
                        
                        if !drawn {
                            context.fill(Path(ellipseIn: planetRect), with: .color(planet.3))
                        }
                    }
                }
            }
            // Gesture for interaction
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onEnded { value in
                        let tapLocation = value.location
                        let distance = hypot(tapLocation.x - center.x, tapLocation.y - center.y)
                        
                        // Find closest ring
                        var closestIndex: Int? = nil
                        var minDiff: CGFloat = 40.0 // Touch target threshold (20pt radius around ring)
                        
                        for (index, planet) in planets.enumerated() {
                            let radius = maxRadius * planet.1
                            let diff = abs(distance - radius)
                            if diff < minDiff {
                                minDiff = diff
                                closestIndex = index
                            }
                        }
                        
                            // Toggle selection
                            if let found = closestIndex {
                                if selectedPlanetIndex == found {
                                    withAnimation {
                                        selectedPlanetIndex = nil // Deselect if tapping same
                                    }
                                } else {
                                    withAnimation {
                                        selectedPlanetIndex = found
                                    }
                                    
                                    // Auto-fade out after 2 seconds
                                    Task {
                                        let currentSelection = found
                                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                                        if selectedPlanetIndex == currentSelection {
                                            withAnimation(.easeInOut(duration: 1.0)) {
                                                selectedPlanetIndex = nil
                                            }
                                        }
                                    }
                                }
                            } else {
                                withAnimation {
                                    selectedPlanetIndex = nil // Deselect if tapping empty space
                                }
                            }
                    }
            )
        }
    }
}
