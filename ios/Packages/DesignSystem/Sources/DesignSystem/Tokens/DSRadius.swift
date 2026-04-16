import SwiftUI

/// Signature Design System corner radius tokens
///
/// Provides a premium, consistent radius scale for rounded corners.
/// Default card radius is 24pt (.lg) for signature look.
public enum DSRadius {
    /// Extra small radius (8pt)
    public static let xs: CGFloat = 8
    
    /// Small radius (12pt)
    public static let sm: CGFloat = 12
    
    /// Medium radius (16pt)
    public static let md: CGFloat = 16
    
    /// Large radius (24pt) - default for cards
    public static let lg: CGFloat = 24
    
    /// Extra large radius (32pt)
    public static let xl: CGFloat = 32
    
    /// Default card radius
    public static let card: CGFloat = lg
}

