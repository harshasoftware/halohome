/**
 * AndroidLanding
 *
 * Full marketing page for Android visitors using the same light theme as Landing.tsx.
 * Uses the Aceternity UI Iphone component in the hero section.
 * Mirrors the iOS landing page structure but replaces App Store CTAs
 * with an email waitlist form and a nudge to use the web app.
 */

import React, { useEffect, useState, useRef, memo, lazy, Suspense, Component, ReactNode } from 'react';
import {
  Check, MapPin, Sparkles, Globe, Hexagon,
  Building2, ScrollText, Navigation, Heart, Repeat,
  Quote, Compass, Briefcase,
  Sun, Moon, Home, Smartphone,
  Mail, Loader2, Monitor, Menu, X, Download,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAndroid } from '@fortawesome/free-brands-svg-icons';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Iphone } from '@/components/ui/iphone';
import HeroScanDemo from '@/components/HeroScanDemo';
import { AppStoreBadge } from '@/components/ui/AppStoreBadge';
import { GooglePlayBadge } from '@/components/ui/GooglePlayBadge';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import './Landing.css';
import './IOSLanding.css';

// --- Error Boundary for Demo Components ---
class DemoErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(_: Error) { return { hasError: true }; }
  componentDidCatch(error: Error) { console.warn('Demo component failed to load:', error.message); }
  render() { return this.state.hasError ? null : this.props.children; }
}

// Lazy load demo components
const LandingZipDemo = lazy(() => import('./components/LandingZipDemo').catch(() => ({ default: () => null as any })));
const LandingAIDemo = lazy(() => import('./components/LandingAIDemo').catch(() => ({ default: () => null as any })));
const LandingDuoDemo = lazy(() => import('./components/LandingDuoDemo').catch(() => ({ default: () => null as any })));
const LandingPlanetaryDemo = lazy(() => import('./components/LandingPlanetaryDemo').catch(() => ({ default: () => null as any })));
const LandingScoutDemo = lazy(() => import('./components/LandingScoutDemo').catch(() => ({ default: () => null as any })));
const LandingScanDemo = lazy(() => import('./components/LandingScanDemo').catch(() => ({ default: () => null as any })));

// ─── Mobile-friendly demo sections ──────

const MOBILE_DEMO_SECTIONS = [
  {
    label: 'Harmony Score',
    title: 'Discover Your\nHome\'s Energy',
    desc: 'Every property has a unique energy signature. Our AI-powered Vastu analysis gives you a clear Harmony Score so you can make informed decisions.',
    highlights: [
      { icon: <Home className="w-4 h-4" />, color: 'text-[#F0A6B3]', text: 'Instant property harmony assessment' },
      { icon: <Sun className="w-4 h-4" />, color: 'text-amber-500', text: 'Entrance direction analysis' },
      { icon: <Moon className="w-4 h-4" />, color: 'text-blue-400', text: 'Room-by-room energy insights' },
    ],
    cta: { text: 'Analyze Your Home Free', href: '/guest' },
  },
  {
    label: 'AI Analysis',
    title: 'Simple Answers\nFor Your Space',
    desc: 'No Vastu expertise needed. Ask any question about your home\'s energy and get practical, actionable guidance.',
    highlights: [
      { icon: <Home className="w-4 h-4" />, color: 'text-[#F0A6B3]', text: '"Which room is best for my office?"' },
      { icon: <Briefcase className="w-4 h-4" />, color: 'text-amber-500', text: '"How can I improve my entrance?"' },
      { icon: <Heart className="w-4 h-4" />, color: 'text-blue-400', text: '"What remedies does my home need?"' },
    ],
    cta: { text: 'Ask Your First Question', href: '/guest' },
  },
  {
    label: 'ZIP Code Scout',
    title: 'Scout Any\nNeighborhood',
    desc: 'Enter any ZIP code and instantly rank properties by their Harmony Score. Find the most Vastu-aligned homes in any area.',
    highlights: [
      { icon: <MapPin className="w-4 h-4" />, color: 'text-[#F0A6B3]', text: 'Scan entire neighborhoods at once' },
      { icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-500', text: 'AI-ranked harmony results' },
      { icon: <Globe className="w-4 h-4" />, color: 'text-sky-500', text: 'Available for all U.S. ZIP codes' },
    ],
    cta: { text: 'Scout a ZIP Code Now', href: '/guest' },
  },
];

const HERO_HEADLINES = [
  "Start Living\nin Harmony",
  "Find Your\nPerfect Home",
  "Scout Any\nZIP Code",
  "Balance Your\nLiving Space",
];

const HERO_SUBHEADLINES = [
  "AI-powered Vastu analysis for every property.",
  "Harmony scores and actionable remedies instantly.",
  "Scan neighborhoods and compare properties.",
  "Discover properties aligned with nature's energy.",
];

// --- Bento demos ---
const DemoGlobe = memo(() => (<div className="bento-demo"><div className="demo-globe" /></div>));
const DemoAIChat = memo(() => (<div className="bento-demo"><div className="demo-ai-chat"><div className="chat-bubble user">Best room for my office?</div><div className="chat-bubble ai"><span className="sparkle">&#10024;</span> Based on your North direction...</div></div></div>));
const DemoZone = memo(() => (<div className="bento-demo"><div className="demo-zone"><div className="hex-zone" /></div></div>));
const DemoCity = memo(() => (<div className="bento-demo"><div className="demo-city"><div className="city-bar"><div className="city-bar-fill weather" style={{ '--fill-width': '85%' } as React.CSSProperties} /></div><div className="city-bar"><div className="city-bar-fill flights" style={{ '--fill-width': '60%' } as React.CSSProperties} /></div><div className="city-bar"><div className="city-bar-fill culture" style={{ '--fill-width': '75%' } as React.CSSProperties} /></div></div></div>));
const DemoLocalSpace = memo(() => {
  const lines = [{ deg: 0, color: '#fbbf24' }, { deg: 45, color: '#60a5fa' }, { deg: 90, color: '#f97316' }, { deg: 135, color: '#a78bfa' }, { deg: 180, color: '#ef4444' }, { deg: 225, color: '#22c55e' }, { deg: 270, color: '#06b6d4' }, { deg: 315, color: '#ec4899' }];
  return (<div className="bento-demo"><div className="demo-local-space"><div className="local-center" />{lines.map(({ deg, color }, i) => (<div key={deg} className="local-line" style={{ transform: `translate(-50%, -100%) rotate(${deg}deg)`, background: color, animationDelay: `${i * 0.1}s` } as React.CSSProperties} />))}</div></div>);
});
const DemoRemedies = memo(() => (<div className="bento-demo"><div className="demo-remedies"><div className="remedy-card"><div className="remedy-title">Remedies</div><div className="remedy-row"><span className="remedy-dot" /><span className="remedy-line" style={{ '--w': '72%' } as React.CSSProperties} /></div><div className="remedy-row"><span className="remedy-dot" /><span className="remedy-line" style={{ '--w': '58%' } as React.CSSProperties} /></div><div className="remedy-row"><span className="remedy-dot" /><span className="remedy-line" style={{ '--w': '66%' } as React.CSSProperties} /></div></div><div className="remedy-badge">&#10003;</div></div></div>));
const DemoRoomPlacement = memo(() => (<div className="bento-demo"><div className="demo-room-placement"><div className="room-grid">{Array.from({ length: 9 }).map((_, i) => (<div key={i} className={`room-cell room-cell-${i}`} aria-hidden="true" />))}<div className="room-highlight room-highlight-a" /><div className="room-highlight room-highlight-b" /></div><div className="room-label">Ideal</div></div></div>));
const DemoEntrance = memo(() => (<div className="bento-demo"><div className="demo-entrance"><div className="entrance-card"><div className="entrance-door" /><div className="entrance-path" /><div className="entrance-pin" /></div><div className="entrance-flow" /></div></div>));
const DemoFindPlaces = memo(() => (<div className="bento-demo"><div className="demo-find-places"><div className="place-pin" /><div className="place-pin" /><div className="place-pin" /><div className="place-pin" /></div></div>));

const FEATURES = [
  { title: "Scout Any Location", desc: "Enter any ZIP code to instantly check the harmony of properties in any area.", icon: <Globe />, col: "bento-col-8", demo: <DemoGlobe /> },
  { title: "AI Harmony Analysis", desc: "Get detailed harmony scores with practical tips. Our AI makes Vastu simple.", icon: <Sparkles />, col: "bento-col-4", demo: <DemoAIChat /> },
  { title: "8 Direction Analysis", desc: "Full analysis of all eight Vastu directions and their energies.", icon: <Navigation />, col: "bento-col-4", demo: <DemoLocalSpace /> },
  { title: "Property Boundaries", desc: "Analyze parcel shape, orientation, and Vastu compliance.", icon: <Hexagon />, col: "bento-col-4", demo: <DemoZone /> },
  { title: "Neighborhood Intel", desc: "Detailed breakdown of surrounding area and energy patterns.", icon: <Building2 />, col: "bento-col-4", demo: <DemoCity /> },
  { title: "Room Placement", desc: "AI suggestions for optimal room placement based on Vastu.", icon: <Building2 />, col: "bento-col-6", demo: <DemoRoomPlacement /> },
  { title: "Actionable Remedies", desc: "Get practical remedies and corrections for spatial harmony.", icon: <Repeat />, col: "bento-col-6", demo: <DemoRemedies /> },
  { title: "Entrance Analysis", desc: "Determine the best entry points for positive energy flow.", icon: <ScrollText />, col: "bento-col-4", demo: <DemoEntrance /> },
  { title: "ZIP Code Scout", desc: "Scan neighborhoods to find the best Vastu-aligned properties.", icon: <MapPin />, col: "bento-col-4", demo: <DemoFindPlaces /> },
];

const TESTIMONIALS = [
  { id: 32, name: 'Michael T.', role: 'Homeowner', location: 'Austin, TX', quote: "The Halo Home App is fantastic. The harmony score was incredibly accurate, and the remedies were practical." },
  { id: 52, name: 'James R.', role: 'First-time Buyer', location: 'San Francisco', quote: "Halo Home changed the way I look at homes. Getting a detailed harmony score with practical tips was so easy." },
  { id: 25, name: 'Aarav P.', role: 'Real Estate Investor', location: 'New York', quote: "Halo Home has transformed how I evaluate properties. The detailed harmony scores are a game-changer." },
];

const FAQ_ITEMS = [
  { question: 'What is a Harmony Score?', answer: "The Harmony Score evaluates properties based on Vastu Shastra principles \u2014 analyzing orientation, room placement, entrance direction, and energy flow." },
  { question: 'How does ZIP code scanning work?', answer: "Enter a ZIP code and Halo Home analyzes available properties, ranking them by Harmony Scores. Currently available for U.S. ZIP codes." },
  { question: 'Is there an Android app?', answer: "Halo Home is coming to Android! Join the waitlist to be notified at launch. In the meantime, the full ZIP Code Scout experience is available on the web." },
  { question: 'Do I need Vastu expertise?', answer: "Not at all. Halo Home makes Vastu simple and accessible. Enter any address and get easy-to-understand insights with practical remedies." },
];

// --- Shared Components (light theme, matching Landing.tsx) ---

const scrollRevealCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;
const getSharedObserver = () => {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cb = scrollRevealCallbacks.get(entry.target);
          if (cb) { cb(); sharedObserver?.unobserve(entry.target); scrollRevealCallbacks.delete(entry.target); }
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  }
  return sharedObserver;
};

const ScrollReveal = memo(({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getSharedObserver();
    scrollRevealCallbacks.set(el, () => setIsVisible(true));
    obs.observe(el);
    return () => { obs.unobserve(el); scrollRevealCallbacks.delete(el); };
  }, []);
  return (<div ref={ref} className={`reveal ${isVisible ? 'visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>);
});

const SpotlightCard = ({ children, className = "", badge }: { children: React.ReactNode; className?: string; badge?: React.ReactNode }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  return (
    <div ref={divRef} className={`glass-card relative overflow-hidden ${className}`}
      onMouseMove={(e) => { if (!divRef.current) return; const r = divRef.current.getBoundingClientRect(); setPosition({ x: e.clientX - r.left, y: e.clientY - r.top }); setOpacity(1); }}
      onMouseLeave={() => setOpacity(0)}>
      <div className="pointer-events-none absolute -inset-px transition duration-300" style={{ opacity, background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(240,166,179,0.1), transparent 40%)` }} />
      {badge && <div className="absolute top-4 right-4 z-20">{badge}</div>}
      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  );
};

// --- Waitlist Form (light-themed) ---
const WaitlistForm: React.FC<{ size?: 'compact' | 'full' }> = ({ size = 'full' }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) { setErrorMsg('Please enter a valid email'); setStatus('error'); return; }
    setStatus('loading');
    try {
      const { error } = await supabase.from('mobile_waitlist').insert({ email: email.toLowerCase().trim() });
      if (error && (error as any).code !== '23505') throw error;
      setStatus('success'); setErrorMsg(''); setEmail('');
    } catch { setErrorMsg('Something went wrong. Please try again.'); setStatus('error'); }
  };

  if (status === 'success') return (
    <div className="flex items-center gap-2 text-emerald-600 py-3 text-sm font-medium">
      <Check className="w-4 h-4 flex-shrink-0" />
      You're on the list! We'll notify you when Android launches.
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={`flex ${size === 'compact' ? 'flex-row' : 'flex-col'} gap-2 w-full`}>
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="email" value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          placeholder="Enter your email" required
          className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white border ${status === 'error' ? 'border-red-400' : 'border-[#F0A6B3]/30'} text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#F0A6B3]/60 transition-all text-sm`}
        />
      </div>
      <button type="submit" disabled={status === 'loading'}
        className="px-5 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0">
        {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</> : 'Notify Me'}
      </button>
      {status === 'error' && size !== 'compact' && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
    </form>
  );
};

// --- Navbar (same as Landing.tsx) ---
const Navbar = () => {
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
        <a href="/" className="nav-logo flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <img src="/logo.png" alt="Halo Home" className="w-6 h-6 rounded-md" />
          Halo Home
        </a>
        <div className="nav-links hidden md:flex items-center">
          <a href="/#features" className="nav-link">Features</a>
          <a href="/#pricing" className="nav-link">Pricing</a>
          <a href="/sample-report" className="nav-link">Sample Report</a>
          <a href="/blog/methodology" className="nav-link">Methodology</a>
          <a href="/guest" className="nav-link nav-link-install flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-sm hover:shadow-md transition-all" style={{ textDecoration: 'none' }}>Launch App</a>
        </div>
        <div className="md:hidden flex items-center gap-3">
          <button onClick={() => {
            document.getElementById('android-waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }} className="p-2 text-black hover:bg-black/10 rounded-full transition-colors" aria-label="Join Waitlist">
            <Download size={20} />
          </button>
          <button className="text-black" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white/95 backdrop-blur-md border-b border-black/10 p-6 flex flex-col gap-6 md:hidden shadow-lg">
          <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Features</a>
          <a href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Pricing</a>
          <a href="/sample-report" onClick={() => setMobileMenuOpen(false)} className="nav-link text-lg text-black hover:bg-black/5">Sample Report</a>
          <a href="/guest" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-center font-medium text-white bg-black hover:bg-[#F0A6B3] rounded-full transition-colors">Launch App</a>
        </div>
      )}
    </nav>
  );
};

const scrollToWaitlist = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById('android-waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- Page Component ---

const AndroidLanding: React.FC = () => {
  const [index, setIndex] = useState(0);
  const textRef = useRef<HTMLSpanElement>(null);
  const subTextRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    if (!textRef.current || !subTextRef.current) return;
    gsap.killTweensOf([textRef.current, subTextRef.current]);
    const tl = gsap.timeline();
    gsap.set([textRef.current, subTextRef.current], { opacity: 0, y: 20, filter: 'blur(10px)' });
    tl.to([textRef.current, subTextRef.current], { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: 0.1 })
      .to([textRef.current, subTextRef.current], { opacity: 0, y: -20, filter: 'blur(10px)', duration: 0.8, ease: 'power3.in', delay: 3, onComplete: () => setIndex((p) => (p + 1) % HERO_HEADLINES.length) });
  }, [index]);

  return (
    <div className="page-root">
      <SEO
        title="Halo Home for Android - Coming Soon"
        description="Halo Home is coming to Android. Join the waitlist and be the first to know. Explore Vastu harmony scores on Web & Desktop now."
        canonical="/android"
      />

      <div className="bg-noise" />
      <Navbar />

      <main>
        {/* ── HERO ── */}
        <div className="bg-section-hero relative overflow-hidden">
          {/* LiDAR grid animation behind hero */}
          <div className="lidar-grid-bg lidar-grid-hero" aria-hidden="true">
            <div className="lidar-ring lidar-ring-1" />
            <div className="lidar-ring lidar-ring-2" />
            <div className="lidar-ring lidar-ring-3" />
            <div className="lidar-grid-lines" />
            <div className="lidar-scan-sweep" />
          </div>
          <section className="ios-hero-section relative z-[1]">
            <div className="ios-hero-container">
              <div className="ios-hero-content">
                <div className="ios-pill-badge">
                  <FontAwesomeIcon icon={faAndroid} className="w-3 h-3 text-[#18181B]" />
                  <span style={{ color: '#18181B', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Coming Soon</span>
                  <span className="text-[#18181B]">Halo Home for Android</span>
                </div>
                <h1 className="ios-hero-title" style={{ height: 'clamp(120px, 15vw, 160px)' }}>
                  <span ref={textRef} className="block whitespace-pre-wrap">{HERO_HEADLINES[index]}</span>
                </h1>
                <p ref={subTextRef} className="ios-hero-subtitle" style={{ height: '60px' }}>{HERO_SUBHEADLINES[index]}</p>

                <div className="ios-hero-actions">
                  <WaitlistForm size="compact" />
                  <div className="mt-3 flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-[#F0A6B3] shrink-0" />
                    <span className="text-zinc-500 text-xs">
                      Available now on Web &mdash;{' '}
                      <a href="/guest" className="text-[#F0A6B3] font-semibold no-underline hover:text-[#e8939f]">Open Halo Home &rarr;</a>
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone mockup with rotating Scan demo stages */}
              <div className="relative w-full max-w-[260px] md:max-w-[300px] mx-auto flex items-center justify-center ios-hero-3d-container">
                <div className="relative z-10 w-full transform-gpu ios-hero-iphone-wrapper">
                  <Iphone className="w-full shadow-2xl rounded-[45px]">
                    <HeroScanDemo />
                  </Iphone>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── DEMO SECTIONS ── */}
        <div className="bg-section-beige section-block"><DemoErrorBoundary><Suspense fallback={null}><LandingZipDemo /></Suspense></DemoErrorBoundary></div>
        <div className="bg-section-white section-block"><DemoErrorBoundary><Suspense fallback={null}><LandingDuoDemo /></Suspense></DemoErrorBoundary></div>
        <div className="bg-section-beige section-block"><DemoErrorBoundary><Suspense fallback={null}><LandingPlanetaryDemo /></Suspense></DemoErrorBoundary></div>
        <div className="bg-section-white section-block"><DemoErrorBoundary><Suspense fallback={null}><LandingScoutDemo /></Suspense></DemoErrorBoundary></div>
        <div className="bg-section-beige section-block"><DemoErrorBoundary><Suspense fallback={null}><LandingAIDemo /></Suspense></DemoErrorBoundary></div>
        <div className="bg-section-white section-block"><DemoErrorBoundary><Suspense fallback={null}><LandingScanDemo /></Suspense></DemoErrorBoundary></div>

        {/* ── MOBILE DEMO SECTIONS ── */}
        <div className="lg:hidden">
          {MOBILE_DEMO_SECTIONS.map((section, i) => (
            <ScrollReveal key={i}>
              <section className="px-6 py-14 max-w-lg mx-auto">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#F0A6B3] mb-3">{section.label}</p>
                <h2 className="text-[28px] font-bold text-zinc-900 leading-[1.15] whitespace-pre-line mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{section.title}</h2>
                <p className="text-zinc-500 text-[15px] leading-relaxed mb-6">{section.desc}</p>
                <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-5 mb-6 space-y-4">
                  {section.highlights.map((h, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className={`shrink-0 w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center ${h.color}`}>{h.icon}</div>
                      <span className="text-zinc-600 text-sm leading-snug">{h.text}</span>
                    </div>
                  ))}
                </div>
                <a href={section.cta.href}
                  className="block w-full text-center py-3.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 font-medium text-sm hover:bg-zinc-200 transition-colors no-underline">
                  {section.cta.text} <span className="text-zinc-400">&rarr;</span>
                </a>
              </section>
            </ScrollReveal>
          ))}
        </div>

        {/* ── FEATURES ── */}
        <div className="bg-section-white section-block">
          <section id="features" className="section-wrapper ios-features-section">
            <ScrollReveal>
              <div className="section-header">
                <h2 className="section-title">Actionable Insights & Remedies</h2>
                <p className="text-zinc-400 text-lg">Everything you need to find harmony in your living space.</p>
              </div>
            </ScrollReveal>
            <div className="bento-grid">
              {FEATURES.map((f, i) => (
                <ScrollReveal key={i} className={f.col} delay={i * 100}>
                  <SpotlightCard className="bento-item h-full">
                    <div className="bento-icon">{f.icon}</div>
                    <div><h3 className="bento-title leading-tight">{f.title}</h3><p className="bento-desc">{f.desc}</p></div>
                    {f.demo}
                  </SpotlightCard>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </div>

        {/* ── PRICING ── */}
        <div className="bg-section-white section-block">
          <section id="pricing" className="section-wrapper ios-pricing-section">
            <ScrollReveal>
              <div className="section-header">
                <h2 className="section-title">Start Living in Harmony</h2>
                <p className="text-zinc-400 text-lg">Lock in your plan now &mdash; pricing guaranteed at launch.</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ScrollReveal delay={0} className="h-full">
                <div className="pricing-card glass-card h-full">
                  <h3 className="text-xl font-medium text-white flex items-center gap-2"><Compass size={18} className="text-[#F0A6B3]" /> Explorer</h3>
                  <div className="price-amount">$49<span className="price-period">/mo</span></div>
                  <p className="text-emerald-400 text-sm font-medium mb-1">7-day free trial included</p>
                  <p className="text-zinc-400 text-sm mb-4">Serious homeowner / small investor</p>
                  <button onClick={scrollToWaitlist} className="plan-btn flex items-center justify-center gap-2 mt-auto">Get Early Access</button>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={150} className="h-full">
                <SpotlightCard className="pricing-card border-[#F0A6B3]/30 bg-white/5 h-full"
                  badge={<span className="bg-[#F0A6B3] text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">Popular</span>}>
                  <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2"><MapPin size={18} className="text-[#F0A6B3]" /> Pioneer</h3>
                  <div className="price-amount">$89<span className="price-period">/mo</span></div>
                  <p className="text-emerald-400 text-sm font-medium mb-1">7-day free trial included</p>
                  <p className="text-zinc-400 text-sm mb-4">Architects & Designers</p>
                  <button onClick={scrollToWaitlist} className="plan-btn primary flex items-center justify-center gap-2 mt-auto !bg-zinc-900 hover:!bg-zinc-800 !border-zinc-900">Get Early Access</button>
                </SpotlightCard>
              </ScrollReveal>
              <ScrollReveal delay={300} className="h-full">
                <div className="pricing-card glass-card h-full">
                  <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2"><Briefcase size={18} className="text-[#F0A6B3]" /> Broker</h3>
                  <div className="price-amount">$179<span className="price-period">/mo</span></div>
                  <p className="text-emerald-400 text-sm font-medium mb-1">7-day free trial included</p>
                  <p className="text-zinc-400 text-sm mb-4">Developers & Consultants</p>
                  <button onClick={scrollToWaitlist} className="plan-btn flex items-center justify-center gap-2 mt-auto">Get Early Access</button>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </div>

        {/* ── TESTIMONIALS ── */}
        <div className="bg-section-orange section-block">
          <section className="section-wrapper">
            <ScrollReveal>
              <div className="section-header">
                <h2 className="section-title">Loved by Homeowners</h2>
                <p className="text-zinc-400 text-lg">See what people are saying about finding harmony in their spaces.</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {TESTIMONIALS.map((t, i) => (
                <ScrollReveal key={t.id} delay={i * 100}>
                  <SpotlightCard className="p-6 rounded-xl h-full flex flex-col">
                    <Quote className="w-8 h-8 text-white/20 mb-4" />
                    <p className="text-zinc-300 leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                    <div className="h-px bg-white/10 mb-4" />
                    <div className="flex items-center gap-3">
                      <img src={`https://i.pravatar.cc/80?img=${t.id}`} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                      <div className="flex-1">
                        <span className="text-white font-medium block">{t.name}</span>
                        <span className="text-sm text-zinc-500">{t.role}, {t.location}</span>
                      </div>
                    </div>
                  </SpotlightCard>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </div>

        {/* ── FAQ ── */}
        <div className="bg-section-white section-block">
          <section className="ios-faq-section section-wrapper max-w-3xl mx-auto">
            <ScrollReveal><div className="section-header"><h2 className="section-title text-3xl">Common Questions</h2></div></ScrollReveal>
            <div className="flex flex-col gap-4">
              {FAQ_ITEMS.map((item, i) => (
                <ScrollReveal key={i} delay={i * 100}>
                  <SpotlightCard className="p-6 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                    <h4 className="text-lg font-medium mb-2 text-white">{item.question}</h4>
                    <p className="text-zinc-400 leading-relaxed">{item.answer}</p>
                  </SpotlightCard>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </div>

        {/* ── FINAL CTA / WAITLIST ── */}
        <div className="bg-section-black section-block">
          <section id="android-waitlist" className="section-wrapper max-w-4xl">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-normal text-white leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Be the First on Android
                </h2>
                <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                  Join the waitlist and get notified the moment Halo Home launches on Android.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-14">
                {/* Left — Form & badges */}
                <div className="flex-1 w-full max-w-md space-y-6">
                  <div className="space-y-3">
                    <WaitlistForm />
                  </div>

                  {/* App badges */}
                  <div className="flex items-center gap-3">
                    <a href="/ios" className="transition-transform hover:-translate-y-0.5 opacity-90 hover:opacity-100" aria-label="Download on the App Store">
                      <AppStoreBadge width={135} />
                    </a>
                    <div className="transition-transform hover:-translate-y-0.5 opacity-90 hover:opacity-100">
                      <GooglePlayBadge width={150} onClick={() => {
                        document.getElementById('android-waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }} />
                    </div>
                  </div>

                  <p className="text-sm text-zinc-500">
                    Want ZIP code analysis now? Scout works on any browser &mdash;{' '}
                    <a href="/guest" className="text-[#F0A6B3] font-semibold no-underline hover:text-[#e8939f]">try it now &rarr;</a>
                  </p>
                </div>

                {/* Right — Feature checklist */}
                <div className="flex-shrink-0">
                  <ul className="space-y-3 text-sm text-zinc-300">
                    {['Harmony Score Analysis', 'AI-Powered Vastu Insights', 'ZIP Code Scout', 'Actionable Remedies'].map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#F0A6B3]/20 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-[#F0A6B3]" />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AndroidLanding;
