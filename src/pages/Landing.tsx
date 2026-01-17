import React, { useEffect, useState, useRef, memo, useMemo, useCallback, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
    Download, Globe, Sparkles, MapPin, MessageCircle, ScrollText,
    Navigation, Repeat, Star, Hexagon, Building2, Crown, Loader2,
    ArrowRight, Check, Menu, X, Heart, Smartphone, Mail, Quote,
    Share, Plus, Search
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAndroid, faApple } from '@fortawesome/free-brands-svg-icons';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { LandingConstellations } from './components/Constellations';

// Error boundary for lazy-loaded demo components
class DemoErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('Demo component failed to load:', error.message);
    }

    render() {
        if (this.state.hasError) {
            // Silently fail - don't show anything if demo fails to load
            return null;
        }
        return this.props.children;
    }
}

// Lazy load heavy demo components (desktop only) with error handling
const LandingZipDemo = lazy(() =>
    import('./components/LandingZipDemo').catch(() => ({ default: () => null }))
);
const LandingPlanetaryDemo = lazy(() =>
    import('./components/LandingPlanetaryDemo').catch(() => ({ default: () => null }))
);
const LandingAIDemo = lazy(() =>
    import('./components/LandingAIDemo').catch(() => ({ default: () => null }))
);
const LandingDuoDemo = lazy(() =>
    import('./components/LandingDuoDemo').catch(() => ({ default: () => null }))
);
const LandingScoutDemo = lazy(() =>
    import('./components/LandingScoutDemo').catch(() => ({ default: () => null }))
);
import { supabase } from '@/integrations/supabase/client';
import { monitoredEdgeFunction } from '@/lib/monitoring';
import Footer from '@/components/Footer';
import './Landing.css';


// --- Components ---

const Navbar = ({ onInstall }: { onInstall: () => void }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`nav-fixed ${isScrolled ? 'nav-scrolled' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo">
                    <FontAwesomeIcon icon={faHouse} className="mr-2" />
                    Halo Home
                </div>

                {/* Desktop Nav */}
                <div className="nav-links hidden md:flex items-center">
                    <a href="#features" className="nav-link">Features</a>
                    <a href="#pricing" className="nav-link">Pricing</a>
                    <a href="/sample-report" className="nav-link">Sample Report</a>
                    <a href="/blog/methodology" className="nav-link">Methodology</a>
                    <a href="/guest" className="nav-link nav-link-install flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-sm hover:shadow-md transition-all" style={{ textDecoration: 'none' }}>
                        Launch App
                    </a>
                </div>

                {/* Mobile Nav Actions */}
                <div className="md:hidden flex items-center gap-3">
                    <button
                        onClick={onInstall}
                        className="p-2 text-black hover:bg-black/10 rounded-full transition-colors"
                        aria-label="Install App"
                    >
                        <Download size={20} />
                    </button>
                    <button className="text-black" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="absolute top-16 left-0 w-full bg-white/95 backdrop-blur-md border-b border-black/10 p-6 flex flex-col gap-6 md:hidden shadow-lg">
                    <a href="#features" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Features</a>
                    <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Pricing</a>
                    <a href="/sample-report" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Sample Report</a>
                    <a href="/blog/methodology" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Methodology</a>
                    <a href="/guest" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-center font-medium text-white bg-black hover:bg-[#F0A6B3] rounded-full transition-colors">
                        Launch App
                    </a>
                </div>
            )}
        </nav>
    );
};

// Shared IntersectionObserver for all ScrollReveal components (performance optimization)
const scrollRevealCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

const getSharedObserver = () => {
    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const callback = scrollRevealCallbacks.get(entry.target);
                        if (callback) {
                            callback();
                            sharedObserver?.unobserve(entry.target);
                            scrollRevealCallbacks.delete(entry.target);
                        }
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );
    }
    return sharedObserver;
};

const ScrollReveal = memo(({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = getSharedObserver();
        scrollRevealCallbacks.set(element, () => setIsVisible(true));
        observer.observe(element);

        return () => {
            observer.unobserve(element);
            scrollRevealCallbacks.delete(element);
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal ${isVisible ? 'visible' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
});

const SpotlightCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            className={`glass-card relative overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`
                }}
            />
            <div className="relative z-10 h-full flex flex-col">
                {children}
            </div>
        </div>
    );
};

// Mystical particle/star positions - generated once, memoized
const PARTICLES = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 5,
    large: Math.random() > 0.8,
    drifting: Math.random() > 0.7,
    driftDuration: 15 + Math.random() * 20,
}));

// Deferred particles - only render after initial paint
const MysticalParticles = memo(() => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Defer particle rendering until after first paint
        const id = requestIdleCallback?.(() => setIsReady(true)) ??
            setTimeout(() => setIsReady(true), 100);
        return () => {
            if (typeof id === 'number') {
                cancelIdleCallback?.(id) ?? clearTimeout(id);
            }
        };
    }, []);

    if (!isReady) return null;

    return (
        <div className="particles-container" style={{ contain: 'layout style' }}>
            {/* Twinkling stars */}
            {PARTICLES.map((p) => (
                <div
                    key={p.id}
                    className={`particle ${p.large ? 'large' : ''} ${p.drifting ? 'drifting' : ''}`}
                    style={{
                        left: p.left,
                        top: p.top,
                        '--duration': `${p.duration}s`,
                        '--delay': `${p.delay}s`,
                        '--drift-duration': `${p.driftDuration}s`,
                    } as React.CSSProperties}
                />
            ))}
            {/* Nebula glows */}
            <div className="nebula-glow" style={{ top: '20%', left: '10%', width: 300, height: 300, background: 'rgba(147, 112, 219, 0.3)' }} />
            <div className="nebula-glow" style={{ top: '60%', right: '5%', width: 250, height: 250, background: 'rgba(100, 149, 237, 0.25)', animationDelay: '4s' }} />
            <div className="nebula-glow" style={{ bottom: '10%', left: '30%', width: 200, height: 200, background: 'rgba(255, 182, 193, 0.2)', animationDelay: '2s' }} />
        </div>
    );
});

// Orbital planet configuration - planets orbit AROUND the hero text (outer orbits)
const ORBITAL_PLANETS = [
    { src: '/venus-planet-96.png', orbitRadius: 320, duration: 50, size: 42, startAngle: 0 },
    { src: '/mars-planet-96.png', orbitRadius: 380, duration: 65, size: 50, startAngle: 72 },
    { src: '/jupiter-planet-96.png', orbitRadius: 440, duration: 85, size: 58, startAngle: 144 },
    { src: '/saturn-96.png', orbitRadius: 500, duration: 105, size: 54, startAngle: 216 },
    { src: '/neptune-96.png', orbitRadius: 560, duration: 125, size: 46, startAngle: 288 },
];

// Lazy loaded orbiting planets component
const OrbitingPlanets = memo(() => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Defer planet rendering until after first paint for performance
        const id = requestIdleCallback?.(() => setIsReady(true)) ??
            setTimeout(() => setIsReady(true), 150);
        return () => {
            if (typeof id === 'number') {
                cancelIdleCallback?.(id) ?? clearTimeout(id);
            }
        };
    }, []);

    if (!isReady) return null;

    return (
        <div className="orbiting-planets-container">
            {/* Each planet grouped with its orbit ring for hover effects */}
            {ORBITAL_PLANETS.map((planet, i) => (
                <div
                    key={i}
                    className="orbit-group"
                    style={{
                        '--orbit-radius': `${planet.orbitRadius}px`,
                        '--orbit-radius-mobile': `${planet.orbitRadius * 0.5}px`,
                        '--orbit-duration': `${planet.duration}s`,
                        '--start-angle': `${planet.startAngle}deg`,
                        '--planet-size': `${planet.size}px`,
                        '--planet-size-mobile': `${planet.size * 0.65}px`,
                    } as React.CSSProperties}
                >
                    {/* Orbit ring */}
                    <div className="orbit-path" />

                    {/* Planet */}
                    <div className="orbiting-planet">
                        <img
                            src={planet.src}
                            loading="lazy"
                            decoding="async"
                            alt=""
                            className="orbiting-planet-img"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
});

const HERO_HEADLINES = [
    "Start Living\nin Harmony.",
    "Find Your\nPerfect Home.",
    "Scout Any\nZIP Code.",
    "Balance Your\nSpace.",
];

const HERO_SUBHEADLINES = [
    "Apply ancient sciences of creating harmonious spaces.",
    "AI-powered Vastu analysis for every ZIP code.",
    "Get harmony scores and actionable remedies instantly.",
    "Discover properties aligned with nature's energy."
];

import LandingHeroSearch from './components/LandingHeroSearch';

const Hero = memo(() => {
    const [index, setIndex] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const textRef = useRef<HTMLSpanElement>(null);
    const subTextRef = useRef<HTMLParagraphElement>(null);

    const handleSearchFocusChange = useCallback((focused: boolean) => {
        setIsSearchFocused(focused);
    }, []);

    useGSAP(() => {
        if (!textRef.current || !subTextRef.current) return;

        // Clear existing tweens to prevent conflicts
        gsap.killTweensOf([textRef.current, subTextRef.current]);

        const tl = gsap.timeline();

        // Initial state set
        gsap.set([textRef.current, subTextRef.current], { opacity: 0, y: 20, filter: "blur(10px)" });

        // Animate both elements in synchronization
        tl.to([textRef.current, subTextRef.current], {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.1 // Slight stagger for visual hierarchy
        })
        .to([textRef.current, subTextRef.current], {
            opacity: 0,
            y: -20,
            filter: "blur(10px)",
            duration: 0.8,
            ease: "power3.in",
            delay: 3, 
            onComplete: () => {
                setIndex((prev) => (prev + 1) % HERO_HEADLINES.length);
            }
        });

    }, [index]);

    return (
        <section className={`hero-wrapper ${isSearchFocused ? 'search-focused' : ''}`}>
            <div className="hero-split-container">
                {/* Left side - Content */}
                <div className="hero-left">
                    <div className="hero-content-stack">
                        <div className={`hero-text-content ${isSearchFocused ? 'hero-text-hidden' : ''}`}>
                            <h1 className="hero-title text-stone-900 relative z-10">
                                <span ref={textRef} className="block whitespace-pre-wrap">
                                    {HERO_HEADLINES[index]}
                                </span>
                            </h1>

                            <p ref={subTextRef} className="hero-subtitle text-gradient text-xl md:text-2xl font-light leading-relaxed">
                                {HERO_SUBHEADLINES[index]}
                            </p>
                        </div>

                        <div className="hero-search-container relative z-10">
                            <LandingHeroSearch onFocusChange={handleSearchFocusChange} />
                        </div>
                    </div>
                </div>

                {/* Right side - 3D Spline embed (placeholder until scene is ready) */}
                <div className="hero-right">
                    {/* <div className="hero-spline-wrapper">
                        <Spline scene="https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode" />
                    </div> */}
                </div>
            </div>
        </section>
    );
});

// Demo animation components for bento cards - memoized for performance
const DemoGlobe = memo(() => (
    <div className="bento-demo">
        <div className="demo-globe" />
    </div>
));

const DemoAIChat = memo(() => (
    <div className="bento-demo">
        <div className="demo-ai-chat">
            <div className="chat-bubble user">Best room for my office?</div>
            <div className="chat-bubble ai"><span className="sparkle">✨</span> Based on your North direction...</div>
        </div>
    </div>
));

const DemoPlanets = memo(() => (
    <div className="bento-demo">
        <div className="demo-planets">
            <div className="orbit orbit-1" />
            <div className="orbit orbit-2" />
            <div className="orbit orbit-3" />
            <div className="planet-dot sun" />
            <div className="planet-dot p1" />
            <div className="planet-dot p2" />
            <div className="planet-dot p3" />
        </div>
    </div>
));

const DemoZone = memo(() => (
    <div className="bento-demo">
        <div className="demo-zone">
            <div className="hex-zone" />
        </div>
    </div>
));

const DemoCity = memo(() => (
    <div className="bento-demo">
        <div className="demo-city">
            <div className="city-bar"><div className="city-bar-fill weather" style={{ '--fill-width': '85%' } as React.CSSProperties} /></div>
            <div className="city-bar"><div className="city-bar-fill flights" style={{ '--fill-width': '60%' } as React.CSSProperties} /></div>
            <div className="city-bar"><div className="city-bar-fill culture" style={{ '--fill-width': '75%' } as React.CSSProperties} /></div>
            <div className="city-icons">
                <div className="city-icon" />
                <div className="city-icon" />
                <div className="city-icon" />
            </div>
        </div>
    </div>
));

// Memoized natal wheel segments
const NATAL_SEGMENTS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

const DemoNatal = memo(() => (
    <div className="bento-demo">
        <div className="demo-natal">
            <div className="natal-wheel">
                {NATAL_SEGMENTS.map((deg) => (
                    <div key={deg} className="natal-segment" style={{ transform: `translateX(-50%) rotate(${deg}deg)` }} />
                ))}
            </div>
        </div>
    </div>
));

// Memoized local space data
const LOCAL_SPACE_DATA = [
    { deg: 0, color: '#fbbf24' },
    { deg: 45, color: '#60a5fa' },
    { deg: 90, color: '#f97316' },
    { deg: 135, color: '#a78bfa' },
    { deg: 180, color: '#ef4444' },
    { deg: 225, color: '#22c55e' },
    { deg: 270, color: '#06b6d4' },
    { deg: 315, color: '#ec4899' },
];

const DemoLocalSpace = memo(() => (
    <div className="bento-demo">
        <div className="demo-local-space">
            <div className="local-center" />
            {LOCAL_SPACE_DATA.map(({ deg, color }, i) => (
                <div
                    key={deg}
                    className="local-line"
                    style={{
                        transform: `translate(-50%, -100%) rotate(${deg}deg)`,
                        background: color,
                        animationDelay: `${i * 0.1}s`
                    } as React.CSSProperties}
                />
            ))}
        </div>
    </div>
));

const DemoRelocation = memo(() => (
    <div className="bento-demo">
        <div className="demo-relocation">
            <div className="reloc-dot start" />
            <div className="reloc-dot end" />
            <div className="reloc-arc" />
            <div className="reloc-plane">✈️</div>
        </div>
    </div>
));

const DemoFindPlaces = memo(() => (
    <div className="bento-demo">
        <div className="demo-find-places">
            <div className="place-pin" />
            <div className="place-pin" />
            <div className="place-pin" />
            <div className="place-pin" />
        </div>
    </div>
));

const DemoDuo = memo(() => (
    <div className="bento-demo">
        <div className="demo-duo">
            {/* Two overlapping chart circles */}
            <div className="duo-circle duo-circle-1" />
            <div className="duo-circle duo-circle-2" />
            {/* Heart in the overlap zone */}
            <div className="duo-heart">
                <Heart className="w-6 h-6 text-pink-500" fill="currentColor" />
            </div>
            {/* Animated connection line */}
            <div className="duo-line" />
        </div>
    </div>
));

// Memoize features array outside component to prevent recreation
const FEATURES = [
        {
            title: "Scout Any Location",
            desc: "Just enter any ZIP code to instantly check the harmony of properties in any area. No consultants needed.",
            icon: <Globe />,
            col: "bento-col-8",
            demo: <DemoGlobe />
        },
        {
            title: "AI Harmony Analysis",
            desc: "Get detailed harmony scores with practical tips. Our AI makes Vastu simple and accessible.",
            icon: <Sparkles />,
            col: "bento-col-4",
            demo: <DemoAIChat />
        },
        {
            title: "Harmony Score",
            desc: "See and compare the harmony score of different spaces you're considering. Make informed decisions.",
            icon: <Star />,
            col: "bento-col-4",
            demo: <DemoPlanets />
        },
        {
            title: "8 Direction Analysis",
            desc: "Full analysis of all eight Vastu directions and their energies for complete spatial understanding.",
            icon: <Navigation />,
            col: "bento-col-4",
            demo: <DemoLocalSpace />
        },
        {
            title: "Property Boundaries",
            desc: "Analyze parcel shape, orientation, and Vastu compliance with accurate boundary data.",
            icon: <Hexagon />,
            col: "bento-col-4",
            demo: <DemoZone />
        },
        {
            title: "Room Placement",
            desc: "AI suggestions for optimal room placement based on ancient Vastu principles.",
            icon: <Building2 />,
            col: "bento-col-6",
            demo: <DemoCity />
        },
        {
            title: "Actionable Remedies",
            desc: "Get practical remedies and corrections according to the ancient science of interior harmony.",
            icon: <Repeat />,
            col: "bento-col-6",
            demo: <DemoRelocation />
        },
        {
            title: "Compare Properties",
            desc: "Side-by-side comparison of multiple homes to find the one with the best harmony score.",
            icon: <Heart />,
            col: "bento-col-4",
            demo: <DemoDuo />
        },
        {
            title: "Entrance Analysis",
            desc: "Determine the best entry points for positive energy flow into your home.",
            icon: <ScrollText />,
            col: "bento-col-4",
            demo: <DemoNatal />
        },
        {
            title: "ZIP Code Scout",
            desc: "Scan entire neighborhoods to find the best Vastu-aligned properties in any area.",
            icon: <MapPin />,
            col: "bento-col-4",
            demo: <DemoFindPlaces />
        }
];

const Features = memo(() => (
    <section id="features" className="section-wrapper">
        <ScrollReveal>
            <div className="section-header">
                <h2 className="section-title">Actionable Insights & Remedies</h2>
                <p className="text-zinc-400 text-lg">Our platform gives you remedies and actionable insights according to the ancient science of interior harmony.</p>
            </div>
        </ScrollReveal>

        <div className="bento-grid">
            {FEATURES.map((f, i) => (
                <ScrollReveal key={i} className={f.col} delay={i * 100}>
                    <SpotlightCard className="bento-item h-full">
                        <div className="bento-icon">{f.icon}</div>
                        <div>
                            <h3 className="bento-title">{f.title}</h3>
                            <p className="bento-desc">{f.desc}</p>
                        </div>
                        {f.demo}
                    </SpotlightCard>
                </ScrollReveal>
            ))}
        </div>
    </section>
));

const Pricing = ({ onPurchase }: { onPurchase: (type: string, id: string) => Promise<void> }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const handleBuy = async (id: string, type: 'subscription' | 'report') => {
        setLoading(id);
        await onPurchase(type, id);
        setLoading(null);
    };

    return (
        <section id="pricing" className="section-wrapper">
            <ScrollReveal>
                <div className="section-header">
                    <h2 className="section-title">Start Living in Harmony.</h2>
                    <p className="text-zinc-400 text-lg">Choose the perfect plan to find your harmonious home.</p>
                </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Free Tier */}
                <ScrollReveal delay={0} className="h-full">
                    <div className="pricing-card glass-card h-full">
                        <h3 className="text-xl font-medium text-zinc-300">Free</h3>
                        <div className="price-amount">$0</div>
                        <ul className="feature-list flex-1">
                            <li className="feature-item"><Check className="check-icon" /> 1 property only</li>
                            <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                            <li className="feature-item"><Check className="check-icon" /> Basic insights</li>
                        </ul>
                        <a href="/guest" className="plan-btn text-center block mt-auto" style={{ textDecoration: 'none' }}>Get Started</a>
                    </div>
                </ScrollReveal>

                {/* Seeker Tier */}
                <ScrollReveal delay={150} className="h-full">
                    <SpotlightCard className="pricing-card border-[#F0A6B3]/30 bg-white/5 h-full">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="bg-[#F0A6B3] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Popular</span>
                        </div>
                        <h3 className="text-xl font-medium text-white flex items-center gap-2"><Search size={18} className="text-[#F0A6B3]" /> Seeker</h3>
                        <div className="price-amount">$19<span className="price-period">/mo</span></div>
                        <ul className="feature-list flex-1">
                            <li className="feature-item"><Check className="check-icon" /> 3 locations</li>
                            <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                            <li className="feature-item"><Check className="check-icon" /> Insights & Remedies</li>
                        </ul>
                        <button
                            onClick={() => handleBuy('seeker', 'subscription')}
                            disabled={!!loading}
                            className="plan-btn primary flex items-center justify-center gap-2 mt-auto !bg-zinc-900 hover:!bg-zinc-800 !border-zinc-900"
                        >
                            {loading === 'seeker' ? <Loader2 className="animate-spin" /> : 'Get Started'}
                        </button>
                    </SpotlightCard>
                </ScrollReveal>

                {/* Pioneer Tier */}
                <ScrollReveal delay={300} className="h-full">
                    <div className="pricing-card glass-card h-full">
                        <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2"><MapPin size={18} className="text-[#F0A6B3]" /> Pioneer</h3>
                        <div className="price-amount">$49<span className="price-period">/mo</span></div>
                        <ul className="feature-list flex-1">
                            <li className="feature-item"><Check className="check-icon" /> 10 locations</li>
                            <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                            <li className="feature-item"><Check className="check-icon" /> Insights & Remedies</li>
                            <li className="feature-item"><Check className="check-icon" /> Compare properties</li>
                        </ul>
                        <button
                            onClick={() => handleBuy('pioneer', 'subscription')}
                            disabled={!!loading}
                            className="plan-btn flex items-center justify-center gap-2 mt-auto"
                        >
                            {loading === 'pioneer' ? <Loader2 className="animate-spin" /> : 'Get Started'}
                        </button>
                    </div>
                </ScrollReveal>

                {/* Sage Tier */}
                <ScrollReveal delay={450} className="h-full">
                    <div className="pricing-card glass-card h-full">
                        <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2"><Crown size={18} className="text-[#F0A6B3]" /> Sage</h3>
                        <div className="price-amount">$99<span className="price-period">/mo</span></div>
                        <ul className="feature-list flex-1">
                            <li className="feature-item"><Check className="check-icon" /> Unlimited properties</li>
                            <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                            <li className="feature-item"><Check className="check-icon" /> Insights & Remedies</li>
                            <li className="feature-item"><Check className="check-icon" /> Priority processing</li>
                        </ul>
                        <button
                            onClick={() => handleBuy('sage', 'subscription')}
                            disabled={!!loading}
                            className="plan-btn flex items-center justify-center gap-2 mt-auto"
                        >
                            {loading === 'sage' ? <Loader2 className="animate-spin" /> : 'Get Started'}
                        </button>
                    </div>
                </ScrollReveal>
            </div>

            {/* Add-on pricing */}
            <div className="mt-8 text-center">
                <p className="text-zinc-500 text-sm">
                    Need more? Add-on scans available for <span className="text-[#F0A6B3] font-medium">$8 each</span>
                </p>
            </div>
        </section>
    );
};

const FAQ = () => {
    const faqs = [
        { q: "What is a Harmony Score?", a: "The Harmony Score is our proprietary rating system that evaluates properties based on Vastu Shastra principles. It analyzes orientation, room placement, entrance direction, and energy flow to give you a clear picture of a property's spatial harmony." },
        { q: "How does ZIP code scanning work?", a: "When you scan a ZIP code, our AI analyzes all available properties in that area, ranking them by their harmony scores. This helps you quickly identify the best Vastu-aligned homes without visiting each one individually." },
        { q: "Do I need to be a Vastu expert to use this?", a: "Not at all! We've made the ancient science of Vastu simple and accessible. Just enter any address and get instant, easy-to-understand insights with practical remedies you can implement right away." },
        { q: "Can I use this for my current home?", a: "Yes! Even if your home wasn't built with Vastu in mind, our AI provides actionable remedies and adjustments to improve energy flow and create more harmony without major renovations." },
        { q: "How accurate is the analysis?", a: "Our AI combines authentic Vastu principles with precise parcel boundary data and directional analysis. The harmony scores are based on thousands of property evaluations and traditional Vastu guidelines." },
    ];

    return (
        <section id="faq" className="section-wrapper max-w-3xl">
            <ScrollReveal>
                <div className="section-header">
                    <h2 className="section-title text-3xl">Common Questions</h2>
                </div>
            </ScrollReveal>
            <div className="flex flex-col gap-4">
                {faqs.map((item, i) => (
                    <ScrollReveal key={i} delay={i * 100}>
                        <SpotlightCard className="p-6 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                            <h4 className="text-lg font-medium mb-2 text-white">{item.q}</h4>
                            <p className="text-zinc-400 leading-relaxed">
                                {item.a}
                                {item.link && (
                                    <a href={item.link} className="ml-2 text-purple-400 hover:text-purple-300 underline underline-offset-2">
                                        Learn more →
                                    </a>
                                )}
                            </p>
                        </SpotlightCard>
                    </ScrollReveal>
                ))}
            </div>
        </section>
    );
};

// Testimonials data - memoized outside component
const TESTIMONIALS = [
    {
        id: 32,
        name: 'Michael T.',
        role: 'Homeowner',
        location: 'Austin, TX',
        quote: "The Harmony app is fantastic. I was impressed by how accurate the harmony score was, and the remedies provided were perfect. My home feels more balanced now."
    },
    {
        id: 52,
        name: 'James R.',
        role: 'First-time Buyer',
        location: 'San Francisco',
        quote: "Harmony has changed the way I look at homes. Getting a detailed harmony score with practical tips was so easy. No need for a consultant anymore!"
    },
    {
        id: 25,
        name: 'Aarav P.',
        role: 'Real Estate Investor',
        location: 'New York',
        quote: "Harmony has transformed how I evaluate properties. Receiving a detailed harmony score and practical tips was incredibly easy. Game-changer for my business."
    },
    {
        id: 44,
        name: 'Jessica S.',
        role: 'Interior Designer',
        location: 'Los Angeles',
        quote: "Harmony has made traditional consultations unnecessary for me. The app's detailed analysis and suggestions were incredibly helpful and easy to implement."
    },
    {
        id: 18,
        name: 'John D.',
        role: 'Homeowner',
        location: 'Chicago',
        quote: "Using Harmony was effortless. The app gave me a clear harmony score and actionable remedies to improve my home's energy. I already feel a noticeable difference."
    },
    {
        id: 63,
        name: 'Sarah L.',
        role: 'Home Buyer',
        location: 'Seattle',
        quote: "I've always been curious about home harmony but found it complicated. Harmony made it simple and accessible. The insights were invaluable for my search."
    }
];

const Testimonials = memo(() => (
    <section className="section-wrapper">
        <ScrollReveal>
            <div className="section-header">
                <h2 className="section-title">Loved by Homeowners</h2>
                <p className="text-zinc-400 text-lg">See what people are saying about finding harmony in their spaces.</p>
            </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {TESTIMONIALS.map((testimonial, i) => (
                <ScrollReveal key={testimonial.id} delay={i * 150}>
                    <SpotlightCard className="p-6 rounded-xl h-full flex flex-col">
                        {/* Quote icon */}
                        <Quote className="w-8 h-8 text-white/20 mb-4" />

                        {/* Testimonial text */}
                        <p className="text-zinc-300 leading-relaxed flex-1 mb-6">
                            "{testimonial.quote}"
                        </p>

                        {/* Divider */}
                        <div className="h-px bg-white/10 mb-4" />

                        {/* User info */}
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <img
                                src={`https://i.pravatar.cc/80?img=${testimonial.id}`}
                                alt={testimonial.name}
                                className="w-10 h-10 rounded-full object-cover"
                            />

                            {/* Name and role */}
                            <div className="flex-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-white font-medium">{testimonial.name}</span>
                                </div>
                                <span className="text-sm text-zinc-500">{testimonial.role}, {testimonial.location}</span>
                            </div>
                        </div>
                    </SpotlightCard>
                </ScrollReveal>
            ))}
        </div>
    </section>
));

// iOS Scan App Waitlist Section
const MobileAppWaitlist = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setErrorMsg('Please enter a valid email');
            setStatus('error');
            return;
        }

        setStatus('loading');
        try {
            const { error } = await supabase
                .from('mobile_waitlist')
                .insert({ email: email.toLowerCase().trim() });

            if (error) {
                if (error.code === '23505') {
                    // Unique constraint violation - email already exists
                    setStatus('success');
                } else {
                    throw error;
                }
            } else {
                setStatus('success');
            }
            setEmail('');
        } catch (err) {
            console.error('Waitlist signup error:', err);
            setErrorMsg('Something went wrong. Please try again.');
            setStatus('error');
        }
    };

    return (
        <section className="section-wrapper max-w-3xl">
            <ScrollReveal>
                <div className="section-header">
                    <h2 className="section-title text-3xl">Scan: Interior 3D Analysis</h2>
                    <p className="text-zinc-400 text-lg">
                        Coming to iPhone Pro. Use LiDAR to create a 3D model of your interior and get room-by-room harmony insights.
                    </p>
                </div>
            </ScrollReveal>

            {/* Kitchen 3D animation - desktop only (placeholder until Spline scene is ready) */}
            {/* <div className="hidden md:block w-full max-w-lg mx-auto -mb-8 translate-y-8 h-80 rounded-2xl overflow-hidden">
                <Spline scene="https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode" />
            </div> */}

            <ScrollReveal delay={100}>
                <SpotlightCard className="p-8 rounded-xl text-center relative z-10">
                    {/* Platform badge - iOS only */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                            <FontAwesomeIcon icon={faApple} className="w-5 h-5 text-zinc-300" />
                            <span className="text-sm text-zinc-300">iPhone Pro with LiDAR</span>
                        </div>
                    </div>

                    <p className="text-zinc-400 mb-6">
                        Join the waitlist for Scan — our iOS app that uses Apple's LiDAR to create 3D interior models and analyze room harmony.
                    </p>

                    {/* Email form */}
                    {status === 'success' ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-400">
                            <Check className="w-5 h-5" />
                            <span>You're on the list! We'll notify you at launch.</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (status === 'error') setStatus('idle');
                                    }}
                                    placeholder="Enter your email"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-[#F0A6B3]/30 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F0A6B3]/60 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="px-6 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Notify Me
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {status === 'error' && (
                        <p className="mt-3 text-sm text-red-400">{errorMsg}</p>
                    )}

                    <p className="mt-6 text-sm text-zinc-500">
                        Want ZIP code analysis now? Scout works on any browser—
                        <a href="/guest" className="text-[#F0A6B3] hover:text-[#e8939f] underline underline-offset-2 ml-1 transition-colors">
                            try it now
                        </a>
                    </p>
                </SpotlightCard>
            </ScrollReveal>
        </section>
    );
};

export default function Landing() {
    const { isInstalled, isIOS, promptInstall } = usePWAInstall();
    const [isInstallOpen, setIsInstallOpen] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    const handleInstall = useCallback(() => {
        if (isInstalled) {
            setIsInstallOpen(true);
            return;
        }
        if (isIOS) {
            setShowIOSInstructions(true);
        } else {
            setIsInstallOpen(true);
        }
    }, [isInstalled, isIOS]);

    const handlePurchase = useCallback(async (type: 'subscription' | 'report', planOrTier: string) => {
        try {
            const func = type === 'report' ? 'create-astro-report-payment' : 'ai-subscription';
            const body = type === 'report'
                ? { tier: parseInt(planOrTier), birthHash: 'anonymous', successUrl: `${window.location.origin}/success`, cancelUrl: window.location.href }
                : { action: 'subscribeAnonymous', plan: planOrTier, successUrl: `${window.location.origin}/success`, cancelUrl: window.location.href };

            // Use monitored edge function for payment tracking
            const data = await monitoredEdgeFunction<{ url?: string }>(
                `payment/${func}`,
                () => supabase.functions.invoke(func, { body })
            );

            if (data?.url) window.location.href = data.url;
        } catch (err) {
            console.error(err);
            alert("Error starting checkout. Please try again.");
        }
    }, []);

    // Prewarm scout resources (WASM + cities data) in background when browser is idle
    // This ensures resources are ready by the time user navigates to globe/project pages
    useEffect(() => {
        const prewarm = () => {
            import('@/lib/astro-wasm').then(m => {
                m.prewarmScoutResources().then(({ wasm, cities, worker }) => {
                    console.log(`[Landing] Scout resources prewarmed - WASM: ${wasm}, Cities: ${cities}, Worker: ${worker}`);
                });
            }).catch(() => {
                // Silently fail - prewarming is optional optimization
            });
        };

        // Use requestIdleCallback for non-blocking background loading
        if ('requestIdleCallback' in window) {
            const idleId = requestIdleCallback(prewarm, { timeout: 5000 });
            return () => cancelIdleCallback(idleId);
        } else {
            // Fallback for Safari - delay 2 seconds after page load
            const timeoutId = setTimeout(prewarm, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, []);

    return (
        <div className="page-root">
            <div className="bg-noise" />
            {/* <MysticalParticles /> */}
            {/* <LandingConstellations /> */}

            {/* <Navbar onInstall={handleInstall} /> */}
            <Navbar onInstall={handleInstall} />

            <main>
                <div className="bg-section-hero">
                    <Hero />
                </div>

                {/* 1. Globe Demo - Lead with the WOW factor */}
                <div className="bg-section-pink section-block">
                    <DemoErrorBoundary>
                        <Suspense fallback={null}>
                            <LandingZipDemo />
                        </Suspense>
                    </DemoErrorBoundary>
                </div>

                {/* 2. AI Demo - Personal value proposition */}
                <div className="bg-section-beige section-block">
                    <DemoErrorBoundary>
                        <Suspense fallback={null}>
                            <LandingAIDemo />
                        </Suspense>
                    </DemoErrorBoundary>
                </div>

                {/* 3. Duo Demo - Emotional hook */}
                <div className="bg-section-green section-block">
                    <DemoErrorBoundary>
                        <Suspense fallback={null}>
                            <LandingDuoDemo />
                        </Suspense>
                    </DemoErrorBoundary>
                </div>

                {/* 4. Planetary Demo - Depth & credibility */}
                <div className="bg-section-pink section-block">
                    <DemoErrorBoundary>
                        <Suspense fallback={null}>
                            <LandingPlanetaryDemo />
                        </Suspense>
                    </DemoErrorBoundary>
                </div>

                {/* 5. Scout Algorithm Demo - Precision & accuracy showcase */}
                <div className="bg-section-green section-block">
                    <DemoErrorBoundary>
                        <Suspense fallback={null}>
                            <LandingScoutDemo />
                        </Suspense>
                    </DemoErrorBoundary>
                </div>

                {/* 6. Features Summary - Quick overview for skimmers */}
                <div className="bg-section-white section-block">
                    <Features />
                </div>

                <div className="bg-section-white section-block">
                    <Pricing onPurchase={handlePurchase} />
                </div>

                {/* Testimonials - Social proof after pricing */}
                <div className="bg-section-orange section-block">
                    <Testimonials />
                </div>

                <div className="bg-section-white section-block">
                    <FAQ />
                </div>

                <div className="bg-section-white section-block">
                    <MobileAppWaitlist />
                </div>
            </main>

            <Footer onInstall={handleInstall} />

            <Dialog open={isInstallOpen} onOpenChange={setIsInstallOpen}>
                <DialogContent className="bg-[#0a0a0a] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download size={20} /> {isIOS && !isInstalled ? 'Install on iPhone/iPad' : 'Install Application'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {isInstalled ? "App is already installed!" : isIOS ? "Follow these steps to add the app to your home screen:" : "Install our app for the best experience on your device."}
                        </DialogDescription>
                    </DialogHeader>
                    {!isInstalled && isIOS ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-400 font-bold text-sm">1</span>
                                </div>
                                <div>
                                    <p className="font-medium text-white text-sm">Tap the Share button</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Look for the <Share className="w-3 h-3 inline mx-1" /> icon at the bottom of Safari
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-400 font-bold text-sm">2</span>
                                </div>
                                <div>
                                    <p className="font-medium text-white text-sm">Tap "Add to Home Screen"</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Look for the <Plus className="w-3 h-3 inline mx-1" /> icon in the menu
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-400 font-bold text-sm">3</span>
                                </div>
                                <div>
                                    <p className="font-medium text-white text-sm">Tap "Add" to install</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">The app will appear on your home screen</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsInstallOpen(false)}
                                className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200"
                            >
                                Got it!
                            </button>
                        </div>
                    ) : !isInstalled && (
                        <button
                            onClick={promptInstall}
                            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200"
                        >
                            Install Now
                        </button>
                    )}
                </DialogContent>
            </Dialog>

            {/* iOS Instructions Modal */}
            {showIOSInstructions && (
                <div
                    className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4"
                    onClick={() => setShowIOSInstructions(false)}
                >
                    <div
                        className="bg-[#0a0a0a] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Install on iPhone/iPad</h3>
                                <button
                                    onClick={() => setShowIOSInstructions(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-400 font-bold">1</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Tap the Share button</p>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Look for the <Share className="w-4 h-4 inline mx-1" /> icon at the bottom of Safari
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-400 font-bold">2</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Scroll and tap "Add to Home Screen"</p>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Look for the <Plus className="w-4 h-4 inline mx-1" /> Add to Home Screen option
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-400 font-bold">3</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Tap "Add" to install</p>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            The app will appear on your home screen
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="w-full mt-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                onClick={() => setShowIOSInstructions(false)}
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
