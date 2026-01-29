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
  Navigation, TrendingUp, Home, Zap, Globe, Layers,
  Sun, Droplets, Car, Waves, Trees, Maximize, Building,
  LogOut, ShieldAlert, Thermometer, Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
// Animated Visualizers
// ============================================================================

const OrientVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-1/2 left-0 w-full h-px bg-slate-400" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-slate-400" />
    </div>
    <motion.div
      animate={{
        x: [-40, 0, 40],
        y: [20, -10, 20],
        opacity: [0, 1, 0]
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative z-10"
    >
      <Sun className="w-8 h-8 text-orange-500 fill-orange-200" />
    </motion.div>
    <div className="absolute bottom-4 w-12 h-8 border-t-2 border-x-2 border-slate-300 rounded-t-lg bg-white" />
  </div>
);

const SlopeVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <div className="absolute w-[120%] h-px bg-slate-200 rotate-12 -translate-y-2" />
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{
          x: [-60, 60],
          y: [-12, 12],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "linear" }}
        className="absolute"
      >
        <Droplets className="w-4 h-4 text-blue-500" />
      </motion.div>
    ))}
  </div>
);

const TrafficVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <div className="absolute w-full h-4 bg-slate-200" />
    <div className="absolute h-full w-4 bg-slate-200" />
    <motion.div
      animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute w-12 h-12 bg-red-400 rounded-full"
    />
    <motion.div
      animate={{ x: [-80, 80] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      className="absolute"
    >
      <Car className="w-5 h-5 text-slate-600" />
    </motion.div>
  </div>
);

const WaterVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
        className="absolute w-8 h-8 border-2 border-blue-400 rounded-full"
      />
    ))}
    <div className="relative z-10 w-4 h-4 bg-blue-500 rounded-full shadow-lg" />
  </div>
);

const BioVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <div className="absolute bottom-2 flex gap-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [-10, -50],
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.8]
          }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
          className="w-4 h-4 bg-emerald-400/30 rounded-full blur-sm"
        />
      ))}
    </div>
    <Trees className="w-10 h-10 text-emerald-600 relative z-10" />
  </div>
);

const StructureVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <motion.div
      animate={{
        width: [40, 60, 40],
        height: [40, 25, 40],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="border-2 border-slate-400 rounded-md flex items-center justify-center"
    >
      <div className="w-full h-full border border-slate-200/50 flex flex-wrap opacity-40">
        {[0, 1, 2, 3].map(i => <div key={i} className="w-1/2 h-1/2 border border-slate-200" />)}
      </div>
    </motion.div>
    <motion.div
      animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
      transition={{ duration: 5, repeat: Infinity }}
      className="absolute w-20 h-20 border border-emerald-400/20 rounded-full"
    />
  </div>
);

const ShadowVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    <div className="w-12 h-12 bg-slate-300 rounded shadow-sm relative z-10" />
    <motion.div
      animate={{
        width: [20, 60, 20],
        skewX: [-20, 20, -20],
        opacity: [0.2, 0.5, 0.2]
      }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bg-slate-900/40 h-8 left-1/2 origin-left"
    />
    <motion.div
      animate={{ x: [-30, 30] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-2 w-4 h-4 bg-orange-400 rounded-full blur-[2px]"
    />
  </div>
);

const EntranceVisualizer = () => (
  <div className="relative w-full h-24 mb-6 bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
    {[0, 1].map(i => (
      <motion.div
        key={i}
        animate={{
          scale: [1, 1.8],
          opacity: [0.5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 1 }}
        className="absolute w-12 h-12 border-2 border-emerald-400 rounded-full"
      />
    ))}
    <div className="w-10 h-10 bg-white shadow-md border-2 border-emerald-500 rounded-lg flex items-center justify-center relative z-10">
      <LogOut className="w-5 h-5 text-emerald-600 rotate-180" />
    </div>
  </div>
);

const SCIENTIFIC_FOUNDATION = [
  {
    title: "Orientation & Daylight Access",
    icon: <Sun className="w-6 h-6" />,
    vastu: "N, E, NE are \"lighter\" and life‑supporting; S/SW are \"heavier\" and receive harsh sun.",
    science: [
      {
        sub: "Daylight Access Index",
        text: "Annual daylight hours on N/E facades. Morning light (Indra/Ishana zone) synchronizes circadian rhythms."
      },
      {
        sub: "Solar Heat Gain Index",
        text: "Direct energy (kWh/m²) from sun. High W/SW exposure drives overheating and metabolic fatigue."
      },
      {
        sub: "Overheating Risk Index",
        text: "Calculates hours above comfort temp in S/W rooms vs cooling load contribution."
      }
    ],
    effect: "Orientation determines the balance of life-supporting light and stress-inducing thermal loads.",
    demo: <OrientVisualizer />
  },
  {
    title: "Slope, Drainage & Topography",
    icon: <Droplets className="w-6 h-6" />,
    vastu: "Natural flow toward N/E (Kuber/Ishana); Higher S/W (Nirriti) for structural grounding.",
    science: [
      {
        sub: "Surface Runoff Direction",
        text: "The vector of natural drainage. Water collecting in S/W correlates with damp and mold risk."
      },
      {
        sub: "Ponding Risk Score",
        text: "Probability of standing water. Affects Foundation Moisture Risk and long-term structural health."
      },
      {
        sub: "Relative Elevation Difference",
        text: "Comparing NE vs SW corners to ensure hydrological stability and preventing soil saturation."
      }
    ],
    effect: "Site levels shape water behavior and foundational health, impacting respiratory health and stress.",
    demo: <SlopeVisualizer />
  },
  {
    title: "Roads, Access & Acoustics",
    icon: <Car className="w-6 h-6" />,
    vastu: "Approach from N/E is gentle (Agni/Vayu); avoid T-junction 'stings' (Shoola).",
    science: [
      {
        sub: "Average Road Noise (dB)",
        text: "Facade exposure to traffic noise, linked to sleep disturbance and cardiovascular stress."
      },
      {
        sub: "Pollution Exposure Index",
        text: "Modeled concentrations of NO₂ and PM₂.₅ near facades based on traffic proximity."
      },
      {
        sub: "Crash Risk Factor",
        text: "Geometric safety analysis of T-junctions or curves 'hitting' the site, reducing perceived danger."
      }
    ],
    effect: "Road configuration shapes noise, air quality, and safety, determining baseline nervous system stress.",
    demo: <TrafficVisualizer />
  },
  {
    title: "Water Bodies & Hydrology",
    icon: <Waves className="w-6 h-6" />,
    vastu: "Water in N/E (Varuna influence) moderates; avoid S/SW water bodies.",
    science: [
      {
        sub: "Hydrological Proximity Index",
        text: "Distance and direction to water. N/E water moderates microclimate; S/W water risks humidity peaks."
      },
      {
        sub: "Mosquito Breeding Risk",
        text: "Stagnant water probability within 200m based on drainage class and topographical depressions."
      },
      {
        sub: "Soil Drainage Class",
        text: "Differentiating well-drained vs poorly-drained soils to manage damp and foundational settlement."
      }
    ],
    effect: "Hydrology influences disease exposure pathways, thermal comfort, and building reliability.",
    demo: <WaterVisualizer />
  },
  {
    title: "Vegetation & Eco-Buffers",
    icon: <Trees className="w-6 h-6" />,
    vastu: "Open/Green N/E; Dense S/W shield. (Lighter NE vs Heavier SW canopy).",
    science: [
      {
        sub: "Green View Index",
        text: "Percentage of greenery visible from main living areas, directly linked to mental restoration."
      },
      {
        sub: "Canopy Cover Percentage",
        text: "Directional tree cover. S/W canopy provides Surface Temperature Reduction and western shading."
      },
      {
        sub: "Pollution Buffer Potential",
        text: "Vegetation traps dust and particulate matter, improving indoor air quality through filtration."
      }
    ],
    effect: "Greenery placement determines local air quality, heat island effects, and cognitive recovery rates.",
    demo: <BioVisualizer />
  },
  {
    title: "Massing & Building Placement",
    icon: <Maximize className="w-6 h-6" />,
    vastu: "Built mass pushed toward S/W; larger open setback in the N/E corridor.",
    science: [
      {
        sub: "Directional Open-Space Ratio",
        text: "Calculates open area in NE vs SW. Maximizes ventilation potential and daylight entry."
      },
      {
        sub: "Ventilation Potential Index",
        text: "Upwind open area length vs built mass density. Influences the 'box-in' feeling and airflow."
      },
      {
        sub: "Facade Sky-View Factor",
        text: "Portion of sky visible from N/E windows. Determines psychological openness and light quality."
      }
    ],
    effect: "Placement determines the ratio of light to shelter, shaping how protective the home feels.",
    demo: <StructureVisualizer />
  },
  {
    title: "Urban Pressure & Shadows",
    icon: <Building className="w-6 h-6" />,
    vastu: "External 'mass' shield in S/W; avoid being shadowed or pressed from the N/E.",
    science: [
      {
        sub: "Daylight Obstruction Index",
        text: "Hours of direct sun blocked on N/E facade by neighbors, increasing artificial light reliance."
      },
      {
        sub: "View Out Quality Score",
        text: "Distance to first major obstruction. Nearby tall N/E walls increase perceived crowding."
      },
      {
        sub: "Wind Turbulence Index",
        text: "Large structures funneling uncomfortable gusts or creating stagnant air pockets."
      }
    ],
    effect: "Neighbor buildings shape the site's micro-vibrations, airflow, and visual boundaries.",
    demo: <ShadowVisualizer />
  },
  {
    title: "Wayfinding & Entrance Rituals",
    icon: <LogOut className="w-6 h-6" />,
    vastu: "Orientation of entry (Entrance Padas) shapes the daily emotional homecoming.",
    science: [
      {
        sub: "Cognitive Wayfinding Load",
        text: "Clear vs awkward approaches. Northeast entry typically aligns with logical, stress-free access."
      },
      {
        sub: "Approach Ritual Quality",
        text: "Emotional association with home based on the view, noise, and light during the arrival sequence."
      }
    ],
    effect: "The point of entry determines the felt quality of arrival and transitions to rest.",
    demo: <EntranceVisualizer />
  }
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
          <Link to="/" className="nav-logo flex items-center gap-2">
            <img src="/logo.png" alt="Halo Home" className="w-6 h-6 rounded-md" />
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

        {/* Scientific Foundation Section */}
        <div className="bg-section-beige section-block">
          <div className="section-wrapper">
            <ScrollReveal>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif" style={{ color: 'var(--text-primary, #18181B)' }}>
                    Scientific Rationale
                  </h2>
                </div>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                  Bridging ancient wisdom with environmental psychology, building physics, and urban health research.
                </p>
              </div>
            </ScrollReveal>

            <div className="flex flex-col gap-10 max-w-5xl mx-auto">
              {SCIENTIFIC_FOUNDATION.map((item, index) => (
                <ScrollReveal key={index} delay={index * 50}>
                  <SpotlightCard className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                      {/* Left: Title and Traditional View */}
                      <div className="md:w-1/3 flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-4 rounded-2xl bg-white shadow-sm text-orange-600 border border-orange-100 shrink-0">
                            {item.icon}
                          </div>
                          <h3 className="text-2xl font-bold font-serif leading-tight" style={{ color: 'var(--text-primary, #18181B)' }}>
                            {item.title}
                          </h3>
                        </div>

                        {/* Animated Demo Component */}
                        <div className="flex-1 min-h-[120px] mb-6">
                          {item.demo}
                        </div>

                        <div className="p-5 rounded-2xl bg-[#FFF7ED] border border-orange-200/60 italic text-sm text-[#18181B] relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
                          <span className="font-bold uppercase text-[10px] text-orange-900 block mb-2 tracking-widest">Ancient Archetype</span>
                          <p className="relative z-10 font-bold text-base">"{item.vastu}"</p>
                        </div>
                      </div>

                      {/* Right: Scientific Mechanisms */}
                      <div className="md:w-2/3 flex flex-col justify-between">
                        <div className="space-y-6">
                          {item.science.map((sci, i) => (
                            <div key={i} className="flex gap-4 group">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-700 transition-colors shadow-md">
                                <Check className="w-4 h-4" style={{ color: 'white' }} strokeWidth={4} />
                              </div>
                              <div>
                                <span className="font-bold text-sm uppercase tracking-tight block mb-0.5" style={{ color: '#064E3B' }}>{sci.sub}</span>
                                <p className="text-sm leading-relaxed font-medium text-[#404040]">{sci.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-10 p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-start gap-4 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]">
                          <div className="w-12 h-12 rounded-xl bg-emerald-600 shadow-sm flex items-center justify-center shrink-0 border border-emerald-500">
                            <Zap className="w-6 h-6" style={{ color: 'white' }} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 block mb-1">Human Impact</span>
                            <p className="text-base font-bold leading-snug" style={{ color: '#064E3B' }}>
                              {item.effect}
                            </p>
                          </div>
                        </div>
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
