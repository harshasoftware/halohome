import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Sun, Moon, Star, Flame, Droplets, Wind, Mountain,
    TrendingUp, Heart, MapPin, Sparkles, Globe, ArrowRight,
    Briefcase, Home, Activity, Wallet, Check, AlertTriangle
} from 'lucide-react';
import Footer from '@/components/Footer';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { MysticalParticles } from '@/components/landing/MysticalParticles';
import './SampleReport.css';

// Sample report data matching PDF structure
const SAMPLE_DATA = {
    name: 'Maya Chen',
    reportId: 'ACR-7842',
    birthDate: 'March 22, 1995',
    birthTime: '7:15 PM',
    birthLocation: 'Los Angeles, California, USA',

    // Natal placements table
    placements: [
        { planet: 'Sun', symbol: '☉', sign: 'Aries', degree: '02°18\'', house: 7 },
        { planet: 'Moon', symbol: '☽', sign: 'Pisces', degree: '19°33\'', house: 6 },
        { planet: 'Mercury', symbol: '☿', sign: 'Pisces', degree: '08°12\'', house: 6 },
        { planet: 'Venus', symbol: '♀', sign: 'Taurus', degree: '14°55\'', house: 8 },
        { planet: 'Mars', symbol: '♂', sign: 'Leo', degree: '27°08\'', house: 11 },
        { planet: 'Jupiter', symbol: '♃', sign: 'Sagittarius', degree: '05°42\'', house: 3 },
        { planet: 'Saturn', symbol: '♄', sign: 'Pisces', degree: '22°17\'', house: 6 },
        { planet: 'Ascendant', symbol: '↑', sign: 'Virgo', degree: '22°45\'', house: 1 },
    ],

    // Planetary lines analyzed (matching PDF format)
    linesAnalyzed: [
        { planet: 'Sun', lineTypes: ['MC', 'IC', 'ASC', 'DSC'], color: '#fbbf24' },
        { planet: 'Moon', lineTypes: ['MC', 'ASC'], color: '#e2e8f0' },
        { planet: 'Venus', lineTypes: ['MC', 'DSC'], color: '#f472b6' },
        { planet: 'Jupiter', lineTypes: ['MC', 'ASC'], color: '#f97316' },
    ],

    // Line interpretations with cities (matching PDF structure)
    lineDetails: [
        {
            planet: 'Venus',
            lineType: 'MC',
            color: '#f472b6',
            interpretation: 'Artistic success and social popularity. Beauty, harmony, and pleasure in career pursuits.',
            cities: [
                { name: 'Lisbon', country: 'Portugal', distance: '45 km', influence: 'POWER ZONE' },
                { name: 'Casablanca', country: 'Morocco', distance: '78 km', influence: 'Strong Influence' },
                { name: 'Porto', country: 'Portugal', distance: '92 km', influence: 'Strong Influence' },
            ],
        },
        {
            planet: 'Jupiter',
            lineType: 'ASC',
            color: '#f97316',
            interpretation: 'Optimism and personal growth. Opportunities seem to find you. Expanded worldview.',
            cities: [
                { name: 'Melbourne', country: 'Australia', distance: '32 km', influence: 'POWER ZONE' },
                { name: 'Adelaide', country: 'Australia', distance: '156 km', influence: 'Moderate' },
                { name: 'Hobart', country: 'Australia', distance: '289 km', influence: 'Subtle' },
            ],
        },
    ],

    // Scout analysis by category (matching PDF scout section)
    scoutCategories: [
        {
            category: 'Career',
            icon: Briefcase,
            color: '#4F46E5',
            beneficial: [
                { city: 'Lisbon, Portugal', planet: 'Venus', lineType: 'MC', insight: 'Creative recognition and artistic opportunities flourish' },
                { city: 'Melbourne, Australia', planet: 'Jupiter', lineType: 'ASC', insight: 'Expansion and luck in professional endeavors' },
            ],
            challenging: [
                { city: 'Moscow, Russia', planet: 'Saturn', lineType: 'MC', insight: 'Heavy responsibilities, slower progress' },
            ],
        },
        {
            category: 'Love',
            icon: Heart,
            color: '#EC4899',
            beneficial: [
                { city: 'Paris, France', planet: 'Venus', lineType: 'DSC', insight: 'Magnetic attraction for romantic relationships' },
                { city: 'Barcelona, Spain', planet: 'Moon', lineType: 'DSC', insight: 'Deep emotional connections form naturally' },
            ],
            challenging: [
                { city: 'Berlin, Germany', planet: 'Saturn', lineType: 'DSC', insight: 'Committed but demanding partnerships' },
            ],
        },
        {
            category: 'Health',
            icon: Activity,
            color: '#10B981',
            beneficial: [
                { city: 'Vancouver, Canada', planet: 'Sun', lineType: 'ASC', insight: 'Enhanced vitality and physical well-being' },
                { city: 'Sydney, Australia', planet: 'Mars', lineType: 'ASC', insight: 'Increased energy and motivation' },
            ],
            challenging: [
                { city: 'London, UK', planet: 'Neptune', lineType: 'ASC', insight: 'Sensitivity requires extra self-care' },
            ],
        },
        {
            category: 'Home',
            icon: Home,
            color: '#F59E0B',
            beneficial: [
                { city: 'Auckland, New Zealand', planet: 'Moon', lineType: 'IC', insight: 'Profound emotional security and comfort' },
                { city: 'Cape Town, South Africa', planet: 'Venus', lineType: 'IC', insight: 'Beautiful, harmonious domestic life' },
            ],
            challenging: [
                { city: 'Cairo, Egypt', planet: 'Uranus', lineType: 'IC', insight: 'Unexpected changes to living situation' },
            ],
        },
        {
            category: 'Wealth',
            icon: Wallet,
            color: '#22C55E',
            beneficial: [
                { city: 'Singapore', planet: 'Jupiter', lineType: 'MC', insight: 'Expansion and abundance in finances' },
                { city: 'Dubai, UAE', planet: 'Sun', lineType: 'MC', insight: 'Recognition leads to financial success' },
            ],
            challenging: [
                { city: 'Tokyo, Japan', planet: 'Saturn', lineType: 'MC', insight: 'Wealth through discipline, slower gains' },
            ],
        },
    ],

    // Top locations summary
    topLocations: [
        { rank: 1, city: 'Lisbon', country: 'Portugal', lines: ['Venus MC', 'Jupiter ASC'], score: 94 },
        { rank: 2, city: 'Melbourne', country: 'Australia', lines: ['Jupiter ASC', 'Sun IC'], score: 91 },
        { rank: 3, city: 'Vancouver', country: 'Canada', lines: ['Moon ASC', 'Venus DC'], score: 89 },
        { rank: 4, city: 'Cape Town', country: 'South Africa', lines: ['Mars MC', 'Jupiter IC'], score: 86 },
        { rank: 5, city: 'Barcelona', country: 'Spain', lines: ['Venus DSC', 'Moon MC'], score: 84 },
    ],
};

export default function SampleReport() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="sample-report-page min-h-screen bg-[#050505] text-white">
            <div className="bg-noise" />
            <MysticalParticles />

            {/* Navigation */}
            <nav className="report-nav fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
                <Link to="/" className="report-nav-logo font-serif text-xl font-semibold tracking-wider text-white hover:opacity-80 transition-opacity">Astrocarto</Link>
                <Link to="/guest" className="report-nav-cta flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors">
                    Get Your Report <ArrowRight className="w-4 h-4" />
                </Link>
            </nav>

            {/* ===== TITLE PAGE ===== */}
            <header className="report-header pt-32 pb-16 px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal>
                        {/* Cosmic header bar */}
                        <div className="report-title-bar bg-purple-500/10 border border-purple-500/20 rounded-xl p-8 mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-medium">Sample Report</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-serif text-white mb-2">Astrocartography</h1>
                            <p className="text-zinc-400 text-lg">Personal Location Report</p>
                            <p className="text-purple-400 text-sm mt-2">astrocarto.app</p>
                        </div>

                        {/* Birth Information Card */}
                        <SpotlightCard className="report-birth-card p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-1 h-full bg-purple-500 rounded-full self-stretch" />
                                <div className="flex-1">
                                    <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Birth Details</span>
                                    <h2 className="text-2xl font-serif text-white mt-2 mb-1">{SAMPLE_DATA.name}</h2>
                                    <p className="text-zinc-300">
                                        <span className="font-semibold">{SAMPLE_DATA.birthDate}</span>
                                        <span className="text-zinc-500"> at </span>
                                        <span>{SAMPLE_DATA.birthTime}</span>
                                    </p>
                                    <p className="text-zinc-400 text-sm mt-1">{SAMPLE_DATA.birthLocation}</p>
                                    <p className="text-purple-400 text-xs font-bold mt-4">
                                        {SAMPLE_DATA.linesAnalyzed.reduce((acc, l) => acc + l.lineTypes.length, 0)} LINES ANALYZED
                                    </p>
                                </div>
                            </div>
                        </SpotlightCard>
                    </ScrollReveal>
                </div>
            </header>

            <main className="report-content max-w-4xl mx-auto px-6 pb-24 relative z-10 space-y-16">

                {/* ===== PLANETARY LINES INCLUDED ===== */}
                <section>
                    <ScrollReveal>
                        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">Planetary Lines Included</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {SAMPLE_DATA.linesAnalyzed.map((line) => (
                                <div key={line.planet} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: line.color }}
                                    />
                                    <div>
                                        <span className="text-white font-semibold text-sm block">{line.planet}</span>
                                        <span className="text-zinc-500 text-xs">{line.lineTypes.join(', ')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </section>

                {/* ===== NATAL PLACEMENTS TABLE ===== */}
                <section>
                    <ScrollReveal>
                        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">Natal Chart Placements</h3>
                        <SpotlightCard className="p-0 overflow-hidden">
                            <table className="placements-table w-full">
                                <thead>
                                    <tr className="bg-purple-500/10 border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-xs text-purple-300 uppercase tracking-wider font-semibold">Planet</th>
                                        <th className="text-left py-3 px-4 text-xs text-purple-300 uppercase tracking-wider font-semibold">Sign</th>
                                        <th className="text-left py-3 px-4 text-xs text-purple-300 uppercase tracking-wider font-semibold">Degree</th>
                                        <th className="text-right py-3 px-4 text-xs text-purple-300 uppercase tracking-wider font-semibold">House</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SAMPLE_DATA.placements.map((p, i) => (
                                        <tr key={p.planet} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                                            <td className="py-3 px-4">
                                                <span className="text-purple-400 mr-2">{p.symbol}</span>
                                                <span className="text-white font-medium">{p.planet}</span>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-300">{p.sign}</td>
                                            <td className="py-3 px-4 text-zinc-400 font-mono text-sm">{p.degree}</td>
                                            <td className="py-3 px-4 text-right text-zinc-500">{p.house}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SpotlightCard>
                    </ScrollReveal>
                </section>

                {/* ===== LINE DETAIL PAGES ===== */}
                {SAMPLE_DATA.lineDetails.map((line) => (
                    <section key={`${line.planet}-${line.lineType}`}>
                        <ScrollReveal>
                            {/* Line header */}
                            <div
                                className="line-header rounded-t-xl p-6"
                                style={{ backgroundColor: `${line.color}20`, borderLeft: `4px solid ${line.color}` }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-5 h-5 rounded-full"
                                        style={{ backgroundColor: line.color }}
                                    />
                                    <h3 className="text-2xl font-serif text-white">
                                        {line.planet} <span className="text-zinc-400 font-normal">{line.lineType} Line</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Interpretation */}
                            <div className="bg-white/5 border border-white/10 border-t-0 p-6">
                                <p className="text-zinc-300 italic leading-relaxed">{line.interpretation}</p>
                            </div>

                            {/* Cities table */}
                            <div className="mt-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: line.color }}>
                                    Top Locations
                                </h4>
                                <SpotlightCard className="p-0 overflow-hidden">
                                    <table className="cities-table w-full">
                                        <thead>
                                            <tr style={{ backgroundColor: `${line.color}30` }}>
                                                <th className="text-left py-2 px-4 text-xs text-white uppercase tracking-wider font-semibold">#</th>
                                                <th className="text-left py-2 px-4 text-xs text-white uppercase tracking-wider font-semibold">City</th>
                                                <th className="text-left py-2 px-4 text-xs text-white uppercase tracking-wider font-semibold">Country</th>
                                                <th className="text-right py-2 px-4 text-xs text-white uppercase tracking-wider font-semibold">Distance</th>
                                                <th className="text-left py-2 px-4 text-xs text-white uppercase tracking-wider font-semibold">Influence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {line.cities.map((city, i) => (
                                                <tr key={city.name} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                                                    <td className="py-3 px-4 font-bold" style={{ color: line.color }}>{i + 1}</td>
                                                    <td className="py-3 px-4 text-white font-medium">{city.name}</td>
                                                    <td className="py-3 px-4 text-zinc-400">{city.country}</td>
                                                    <td className="py-3 px-4 text-right text-zinc-500">{city.distance}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            city.influence === 'POWER ZONE'
                                                                ? 'bg-purple-500/20 text-purple-300'
                                                                : city.influence === 'Strong Influence'
                                                                    ? 'bg-blue-500/20 text-blue-300'
                                                                    : 'bg-zinc-500/20 text-zinc-400'
                                                        }`}>
                                                            {city.influence}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </SpotlightCard>
                            </div>
                        </ScrollReveal>
                    </section>
                ))}

                {/* ===== SCOUT SECTION ===== */}
                <section>
                    <ScrollReveal>
                        <div className="scout-header text-center mb-8">
                            <h2 className="text-3xl font-serif text-white mb-2">Location Scout</h2>
                            <p className="text-zinc-400">Optimal & Challenging Locations by Life Category</p>
                        </div>
                    </ScrollReveal>

                    <div className="space-y-8">
                        {SAMPLE_DATA.scoutCategories.map((cat) => {
                            const IconComponent = cat.icon;
                            return (
                                <ScrollReveal key={cat.category}>
                                    <SpotlightCard className="scout-category-card p-6">
                                        {/* Category header */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: `${cat.color}20` }}
                                            >
                                                <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                                            </div>
                                            <h3 className="text-xl font-serif text-white">{cat.category}</h3>
                                        </div>

                                        {/* Stats bar */}
                                        <div className="flex gap-6 mb-6 p-3 bg-white/5 rounded-lg">
                                            <span className="text-emerald-400 font-semibold text-sm">
                                                {cat.beneficial.length} Beneficial
                                            </span>
                                            <span className="text-amber-400 font-semibold text-sm">
                                                {cat.challenging.length} Challenging
                                            </span>
                                        </div>

                                        {/* Beneficial locations */}
                                        <div className="mb-6">
                                            <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Check className="w-4 h-4" /> Beneficial Locations
                                            </h4>
                                            <div className="space-y-3">
                                                {cat.beneficial.map((loc) => (
                                                    <div
                                                        key={loc.city}
                                                        className="p-4 bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-lg"
                                                    >
                                                        <span className="text-white font-semibold block">{loc.city}</span>
                                                        <span className="text-zinc-500 text-sm">{loc.planet} {loc.lineType}: </span>
                                                        <span className="text-zinc-400 text-sm">{loc.insight}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Challenging locations */}
                                        <div>
                                            <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" /> Locations Requiring Awareness
                                            </h4>
                                            <div className="space-y-3">
                                                {cat.challenging.map((loc) => (
                                                    <div
                                                        key={loc.city}
                                                        className="p-4 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-lg"
                                                    >
                                                        <span className="text-white font-semibold block">{loc.city}</span>
                                                        <span className="text-zinc-500 text-sm">{loc.planet} {loc.lineType}: </span>
                                                        <span className="text-zinc-400 text-sm">{loc.insight}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </SpotlightCard>
                                </ScrollReveal>
                            );
                        })}
                    </div>
                </section>

                {/* ===== TOP LOCATIONS SUMMARY ===== */}
                <section>
                    <ScrollReveal>
                        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Top Power Places
                        </h3>
                        <SpotlightCard className="p-6">
                            <div className="space-y-4">
                                {SAMPLE_DATA.topLocations.map((loc) => (
                                    <div key={loc.city} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm">
                                            #{loc.rank}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-white font-medium block">{loc.city}, {loc.country}</span>
                                            <div className="flex gap-2 mt-1">
                                                {loc.lines.map((line) => (
                                                    <span key={line} className="text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded">{line}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-emerald-400">{loc.score}</span>
                                            <span className="text-xs text-zinc-500">/100</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SpotlightCard>
                    </ScrollReveal>
                </section>
            </main>

            {/* CTA Section */}
            <section className="report-cta-section py-20 px-6 relative z-10 border-t border-white/10">
                <div className="max-w-3xl mx-auto text-center">
                    <ScrollReveal>
                        <h2 className="text-3xl font-serif text-white mb-4">Get Your Personalized Report</h2>
                        <p className="text-zinc-400 text-lg mb-8">Unlock your cosmic blueprint with precision astrocartography.</p>
                        <Link to="/guest" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-all">
                            <Sparkles className="w-5 h-5" />
                            Generate My Report
                        </Link>
                    </ScrollReveal>
                </div>
            </section>

            <Footer showInstallButton={false} />
        </div>
    );
}
