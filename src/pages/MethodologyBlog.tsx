/**
 * MethodologyBlog - Vastu methodology and process explanation
 *
 * Explains the two main processes:
 * 1. Scouting - Property/ZIP code analysis workflow
 * 2. Scan App - LiDAR mobile scanning and 3D layout generation
 */

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Building2, Compass, Target, Sparkles,
  ArrowRight, Check, Smartphone, Scan, Box, Grid3X3,
  Navigation, TrendingUp, Home, Zap, Globe, Layers
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import './MethodologyBlog.css';
import './Landing.css';

// ============================================================================
// Process Steps Data
// ============================================================================

const SCOUTING_STEPS = [
  {
    step: 1,
    title: 'Search by Address or ZIP Code',
    icon: <Search className="w-6 h-6" />,
    description: 'Enter a property address or ZIP code to begin analysis. Our system uses satellite imagery and building footprint data to identify properties.',
    details: [
      'ZIP code searches analyze all properties in the area',
      'Address searches focus on a specific property',
      'Automatic boundary detection from satellite data',
    ],
  },
  {
    step: 2,
    title: 'Boundary Detection & Orientation',
    icon: <Compass className="w-6 h-6" />,
    description: 'We detect the property boundary and calculate its orientation relative to true north. This is critical for accurate Vastu zone mapping.',
    details: [
      'Satellite imagery analysis for boundary detection',
      'Orientation calculation in degrees from north',
      'Shape analysis (rectangular, irregular, etc.)',
    ],
  },
  {
    step: 3,
    title: '8 Direction Zone Analysis',
    icon: <Grid3X3 className="w-6 h-6" />,
    description: 'Each property is divided into 8 Vastu zones (N, NE, E, SE, S, SW, W, NW) plus the center. Each zone is analyzed for its element, deity, and ideal uses.',
    details: [
      'Zone scoring based on orientation alignment',
      'Element balance calculation (Water, Fire, Earth, Air, Space)',
      'Ideal use recommendations per zone',
    ],
  },
  {
    step: 4,
    title: 'Entrance Detection',
    icon: <Navigation className="w-6 h-6" />,
    description: 'We automatically detect the main entrance direction using building footprint analysis and road access patterns.',
    details: [
      'AI-powered entrance detection from satellite data',
      'Entrance direction scoring (Northeast is most auspicious)',
      'Pada (sub-zone) analysis within entrance direction',
    ],
  },
  {
    step: 5,
    title: 'Harmony Score Calculation',
    icon: <TrendingUp className="w-6 h-6" />,
    description: 'A comprehensive harmony score (0-100) is calculated based on zone alignment, entrance direction, property shape, and element balance.',
    details: [
      'Weighted scoring across multiple factors',
      'Comparison with nearby properties',
      'Detailed breakdown by category',
    ],
  },
  {
    step: 6,
    title: 'Remedies & Recommendations',
    icon: <Sparkles className="w-6 h-6" />,
    description: 'Personalized remedies and recommendations are generated to enhance the property\'s harmony score.',
    details: [
      'Prioritized action items',
      'Zone-specific recommendations',
      'Element balancing suggestions',
    ],
  },
];

const SCAN_APP_STEPS = [
  {
    step: 1,
    title: 'LiDAR Scanning',
    icon: <Scan className="w-6 h-6" />,
    description: 'Use your iPhone Pro\'s LiDAR sensor to scan your interior space. Walk around the room while the app captures 3D point cloud data.',
    details: [
      'Real-time point cloud generation',
      'Progress tracking during scan',
      'Automatic room boundary detection',
    ],
  },
  {
    step: 2,
    title: '3D Model Processing',
    icon: <Box className="w-6 h-6" />,
    description: 'Our AI processes the LiDAR scan data to create an accurate 3D model of your interior with precise measurements and room layout.',
    details: [
      'Point cloud to mesh conversion',
      'Wall, floor, and ceiling detection',
      'Furniture and fixture identification',
    ],
  },
  {
    step: 3,
    title: 'Vastu Zone Mapping',
    icon: <Grid3X3 className="w-6 h-6" />,
    description: 'The 3D model is overlaid with Vastu zones, showing which areas of your room correspond to each of the 8 directions.',
    details: [
      'Room orientation detection',
      'Zone boundaries visualization',
      'Element mapping per zone',
    ],
  },
  {
    step: 4,
    title: 'Interior Analysis',
    icon: <Home className="w-6 h-6" />,
    description: 'Each room is analyzed for furniture placement, color schemes, and spatial arrangement according to Vastu principles.',
    details: [
      'Furniture placement recommendations',
      'Color scheme suggestions by zone',
      'Spatial flow analysis',
    ],
  },
  {
    step: 5,
    title: 'Personalized Remedies',
    icon: <Sparkles className="w-6 h-6" />,
    description: 'Get specific interior design remedies tailored to your room\'s layout, including placement suggestions and decorative elements.',
    details: [
      'Room-specific recommendations',
      'Visual placement guides',
      'Remedy priority ranking',
    ],
  },
];

// ============================================================================
// Main Component
// ============================================================================
const MethodologyBlog: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleWaitlistClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate('/');
    // Wait for navigation to complete, then scroll to waitlist section
    setTimeout(() => {
      const waitlistSection = document.querySelector('.waitlist-section');
      if (waitlistSection) {
        const navHeight = 80; // Approximate navbar height
        const elementPosition = waitlistSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navHeight;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 300); // Increased timeout to ensure page has loaded
  };

  return (
    <div className="page-root">
      <div className="bg-noise" />

      {/* Navigation - Matching Landing Page */}
      <nav className="nav-fixed">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <FontAwesomeIcon icon={faHouse} className="mr-2" />
            Halo Home
          </Link>

          <div className="nav-links hidden md:flex items-center">
            <a href="/#features" className="nav-link">Features</a>
            <a href="/#pricing" className="nav-link">Pricing</a>
            <a href="/sample-report" className="nav-link">Sample Report</a>
            <a href="/blog/methodology" className="nav-link">Methodology</a>
            <a href="/guest" className="nav-link nav-link-install flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-sm hover:shadow-md transition-all" style={{ textDecoration: 'none' }}>
              Launch App
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <div className="bg-section-beige section-block">
          <div className="section-wrapper">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-600 text-xs font-semibold uppercase tracking-wider mb-4">
                  Methodology
                </span>
                <h1 className="text-4xl md:text-6xl font-serif mb-6" style={{ color: 'var(--text-primary, #18181B)' }}>
                  How Halo Home Works
                </h1>
                <p className="text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                  Two powerful processes for property harmony analysis: Scouting for property search and ZIP code analysis, and Scan App for detailed interior analysis using LiDAR technology.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Scouting Process Section */}
        <div className="bg-section-white section-block">
          <div className="section-wrapper">
            <ScrollReveal>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Search className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif" style={{ color: 'var(--text-primary, #18181B)' }}>
                    Scouting Process
                  </h2>
                </div>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                  Property and ZIP code analysis using satellite imagery, boundary detection, and Vastu principles
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-8 max-w-4xl mx-auto">
              {SCOUTING_STEPS.map((step, index) => (
                <ScrollReveal key={step.step} delay={index * 100}>
                  <SpotlightCard className="process-step-card p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: '#D97706' }}>
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-orange-600">{step.icon}</div>
                          <h3 className="text-2xl font-serif" style={{ color: 'var(--text-primary, #18181B)' }}>
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary, #52525B)' }}>
                          {step.description}
                        </p>
                        <ul className="space-y-2">
                          {step.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span style={{ color: 'var(--text-secondary, #52525B)' }}>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </SpotlightCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>

        {/* Scan App Process Section */}
        <div className="bg-section-beige section-block">
          <div className="section-wrapper">
            <ScrollReveal>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif" style={{ color: 'var(--text-primary, #18181B)' }}>
                    Scan App Process
                  </h2>
                </div>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                  iPhone LiDAR scanning for detailed interior analysis and 3D layout generation
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-8 max-w-4xl mx-auto">
              {SCAN_APP_STEPS.map((step, index) => (
                <ScrollReveal key={step.step} delay={index * 100}>
                  <SpotlightCard className="process-step-card p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: '#D97706' }}>
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-orange-600">{step.icon}</div>
                          <h3 className="text-2xl font-serif" style={{ color: 'var(--text-primary, #18181B)' }}>
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary, #52525B)' }}>
                          {step.description}
                        </p>
                        <ul className="space-y-2">
                          {step.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span style={{ color: 'var(--text-secondary, #52525B)' }}>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </SpotlightCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>

        {/* Key Features Section */}
        <div className="bg-section-white section-block">
          <div className="section-wrapper">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>
                  Key Technologies
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                  The advanced technologies powering our Vastu analysis
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <SpotlightCard className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                    Satellite Imagery
                  </h3>
                  <p style={{ color: 'var(--text-secondary, #52525B)' }}>
                    High-resolution satellite data for accurate boundary detection and property analysis
                  </p>
                </SpotlightCard>

                <SpotlightCard className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                    AI Processing
                  </h3>
                  <p style={{ color: 'var(--text-secondary, #52525B)' }}>
                    Machine learning algorithms for entrance detection, shape analysis, and zone mapping
                  </p>
                </SpotlightCard>

                <SpotlightCard className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>
                    LiDAR Technology
                  </h3>
                  <p style={{ color: 'var(--text-secondary, #52525B)' }}>
                    iPhone Pro LiDAR sensors for precise 3D interior scanning and layout generation
                  </p>
                </SpotlightCard>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-section-beige section-block">
          <div className="section-wrapper">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>
                  Experience Vastu Analysis
                </h2>
                <p className="text-lg mb-8" style={{ color: 'var(--text-secondary, #52525B)' }}>
                  Try our property scouting feature or join the waitlist for the Scan App to analyze your interior space.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/guest"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: 'var(--text-primary, #18181B)', color: '#FFFFFF' }}
                  >
                    <Sparkles className="w-5 h-5" />
                    Try Scouting
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="/"
                    onClick={handleWaitlistClick}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all border-2"
                    style={{ 
                      borderColor: 'var(--text-primary, #18181B)', 
                      color: 'var(--text-primary, #18181B)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Smartphone className="w-5 h-5" />
                    Join Scan App Waitlist
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </main>

      <Footer showInstallButton={false} />
    </div>
  );
};

export default MethodologyBlog;
