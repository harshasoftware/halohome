import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2, MapPin, Sparkles, Globe, ArrowRight,
    Home, Compass, Target, TrendingUp, Check, AlertTriangle,
    Navigation, Grid3X3, Scale, Star, Zap
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import Footer from '@/components/Footer';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import './SampleReport.css';
import './Landing.css';

// Sample Vastu property analysis data
const SAMPLE_DATA = {
    propertyAddress: '123 Oak Street, Austin, TX 78701',
    zipCode: '78701',
    reportId: 'VHR-7842',
    analyzedDate: 'January 15, 2024',
    coordinates: { lat: 30.2672, lng: -97.7431 },

    // Overall harmony score
    overallScore: 87,
    harmonyLevel: 'Excellent',

    // Property details
    propertyDetails: {
        orientation: 12, // degrees from north
        shape: 'Rectangle',
        area: '2,450 sq ft',
        entranceDirection: 'Northeast',
        buildingType: 'Residential',
    },

    // 8 Vastu zones analysis
    vastuZones: [
        {
            direction: 'N',
            name: 'North',
            element: 'Water',
            deity: 'Kubera',
            score: 92,
            idealUses: ['Treasury', 'Water Storage', 'Entrance'],
            currentUse: 'Living Room',
            status: 'excellent',
            insights: 'North zone is well-aligned. Ideal for financial prosperity and water elements.',
        },
        {
            direction: 'NE',
            name: 'Northeast',
            element: 'Water',
            deity: 'Ishanya (Shiva)',
            score: 95,
            idealUses: ['Prayer Room', 'Meditation', 'Open Space'],
            currentUse: 'Entrance',
            status: 'excellent',
            insights: 'Perfect entrance direction. Brings spiritual energy and positive vibrations.',
        },
        {
            direction: 'E',
            name: 'East',
            element: 'Air',
            deity: 'Indra',
            score: 88,
            idealUses: ['Study', 'Living Room', 'Bathroom'],
            currentUse: 'Kitchen',
            status: 'good',
            insights: 'East zone supports morning energy. Consider moving kitchen to Southeast.',
        },
        {
            direction: 'SE',
            name: 'Southeast',
            element: 'Fire',
            deity: 'Agni',
            score: 85,
            idealUses: ['Kitchen', 'Electrical Room'],
            currentUse: 'Bedroom',
            status: 'good',
            insights: 'Southeast is ideal for kitchen. Current bedroom placement is acceptable.',
        },
        {
            direction: 'S',
            name: 'South',
            element: 'Fire',
            deity: 'Yama',
            score: 78,
            idealUses: ['Bedroom', 'Storage', 'Heavy Items'],
            currentUse: 'Master Bedroom',
            status: 'moderate',
            insights: 'South zone is suitable for master bedroom. Ensure proper ventilation.',
        },
        {
            direction: 'SW',
            name: 'Southwest',
            element: 'Earth',
            deity: 'Nairuti',
            score: 82,
            idealUses: ['Master Bedroom', 'Storage', 'Heavy Furniture'],
            currentUse: 'Storage',
            status: 'good',
            insights: 'Southwest zone is well-utilized. Keep heavy items here for stability.',
        },
        {
            direction: 'W',
            name: 'West',
            element: 'Space',
            deity: 'Varuna',
            score: 80,
            idealUses: ['Dining', 'Children Room', 'Study'],
            currentUse: 'Dining Room',
            status: 'good',
            insights: 'West zone supports dining activities. Good placement for family meals.',
        },
        {
            direction: 'NW',
            name: 'Northwest',
            element: 'Air',
            deity: 'Vayu',
            score: 75,
            idealUses: ['Guest Room', 'Garage', 'Storage'],
            currentUse: 'Guest Room',
            status: 'moderate',
            insights: 'Northwest is suitable for guests. Ensure good air circulation.',
        },
    ],

    // Key remedies
    remedies: [
        {
            id: 'r1',
            priority: 'high',
            zone: 'East',
            issue: 'Kitchen in East zone',
            remedy: 'Consider relocating kitchen to Southeast or add fire element symbols in current location.',
            impact: 'Improves morning energy flow and supports proper element placement.',
        },
        {
            id: 'r2',
            priority: 'medium',
            zone: 'Northwest',
            issue: 'Air circulation could be improved',
            remedy: 'Add air-purifying plants and ensure windows are open regularly.',
            impact: 'Enhances Vayu (air) element energy in Northwest zone.',
        },
        {
            id: 'r3',
            priority: 'low',
            zone: 'Center',
            issue: 'Center area should remain open',
            remedy: 'Keep Brahmasthan (center) area clutter-free and open.',
            impact: 'Maintains balance and allows energy to flow freely.',
        },
    ],

    // Element balance
    elementBalance: {
        Water: 24,
        Fire: 22,
        Earth: 18,
        Air: 20,
        Space: 16,
    },

    // Property shape analysis
    shapeAnalysis: {
        shape: 'Rectangle',
        score: 90,
        description: 'Rectangular shape is highly favorable in Vastu. Provides stability and balance.',
        recommendations: [
            'Maintain rectangular boundaries',
            'Avoid cutting corners or irregular extensions',
            'Keep all corners at 90 degrees',
        ],
    },

    // Entrance analysis
    entranceAnalysis: {
        direction: 'Northeast',
        score: 95,
        isAuspicious: true,
        pada: 1,
        deity: 'Ishanya (Shiva)',
        effects: [
            'Brings spiritual energy',
            'Attracts positive vibrations',
            'Supports financial prosperity',
            'Enhances overall harmony',
        ],
    },

    // Comparison with nearby properties
    nearbyProperties: [
        { address: '125 Oak Street', score: 82, rank: 2 },
        { address: '121 Oak Street', score: 79, rank: 3 },
        { address: '127 Oak Street', score: 75, rank: 4 },
        { address: '119 Oak Street', score: 71, rank: 5 },
    ],
};

export default function SampleReport() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const getScoreColor = (score: number) => {
        if (score >= 90) return '#10b981'; // emerald
        if (score >= 80) return '#D97706'; // orange
        if (score >= 70) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            excellent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            good: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        };
        return styles[status as keyof typeof styles] || styles.moderate;
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
                            <div className="report-header-content text-center mb-12">
                                <span className="inline-block px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-600 text-xs font-semibold uppercase tracking-wider mb-4">
                                    Sample Report
                                </span>
                                <h1 className="text-4xl md:text-5xl font-serif mb-3" style={{ color: 'var(--text-primary, #18181B)' }}>
                                    Vastu Property Analysis
                                </h1>
                                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                                    Complete harmony assessment using ancient Vastu Shastra principles
                                </p>
                            </div>

                            {/* Property Information Card */}
                            <SpotlightCard className="report-property-card p-8 mb-8">
                                <div className="flex items-start gap-6">
                                    <div className="w-1 h-full bg-orange-500 rounded-full self-stretch" />
                                    <div className="flex-1">
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#D97706' }}>Property Details</span>
                                        <h2 className="text-2xl font-serif mt-3 mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.propertyAddress}</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>ZIP Code</span>
                                                <span className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.zipCode}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Orientation</span>
                                                <span className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.propertyDetails.orientation}°</span>
                                            </div>
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Area</span>
                                                <span className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.propertyDetails.area}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Entrance</span>
                                                <span className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.propertyDetails.entranceDirection}</span>
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle, #F3F4F6)' }}>
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Overall Harmony Score</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-4xl font-bold" style={{ color: getScoreColor(SAMPLE_DATA.overallScore) }}>
                                                            {SAMPLE_DATA.overallScore}
                                                        </span>
                                                        <span style={{ color: 'var(--text-secondary, #52525B)' }}>/100</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle, #F3F4F6)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-1000"
                                                            style={{
                                                                width: `${SAMPLE_DATA.overallScore}%`,
                                                                background: `linear-gradient(90deg, ${getScoreColor(SAMPLE_DATA.overallScore)}, ${getScoreColor(SAMPLE_DATA.overallScore)}dd)`,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary, #52525B)' }}>{SAMPLE_DATA.harmonyLevel} Harmony</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </ScrollReveal>
                    </div>
                </div>

                {/* 8 Direction Analysis Section */}
                <div className="bg-section-white section-block">
                    <div className="section-wrapper">
                        <ScrollReveal>
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-4xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>
                                    8 Direction Analysis
                                </h2>
                                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary, #52525B)' }}>
                                    Complete Vastu zone assessment for all eight directions
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {SAMPLE_DATA.vastuZones.map((zone) => (
                                    <ScrollReveal key={zone.direction} delay={100}>
                                        <SpotlightCard className="zone-card p-6 h-full">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                                        style={{ backgroundColor: getScoreColor(zone.score) }}
                                                    >
                                                        {zone.direction}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{zone.name}</h3>
                                                        <p className="text-xs" style={{ color: 'var(--text-secondary, #52525B)' }}>{zone.element}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold" style={{ color: getScoreColor(zone.score) }}>
                                                        {zone.score}
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded border ${getStatusBadge(zone.status)}`}>
                                                        {zone.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Deity</p>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary, #18181B)' }}>{zone.deity}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Current Use</p>
                                                    <p className="text-sm" style={{ color: 'var(--text-primary, #18181B)' }}>{zone.currentUse}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Ideal Uses</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {zone.idealUses.slice(0, 2).map((use) => (
                                                            <span key={use} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-glow, rgba(0, 0, 0, 0.03))' }}>
                                                                {use}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle, #F3F4F6)' }}>
                                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary, #52525B)' }}>{zone.insights}</p>
                                                </div>
                                            </div>
                                        </SpotlightCard>
                                    </ScrollReveal>
                                ))}
                            </div>
                        </ScrollReveal>
                    </div>
                </div>

                {/* Element Balance Section */}
                <div className="bg-section-beige section-block">
                    <div className="section-wrapper">
                        <ScrollReveal>
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>Element Balance</h2>
                                <p style={{ color: 'var(--text-secondary, #52525B)' }}>Distribution of five elements across your property</p>
                            </div>

                            <SpotlightCard className="p-8">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    {Object.entries(SAMPLE_DATA.elementBalance).map(([element, percentage]) => (
                                        <div key={element} className="text-center">
                                            <div className="mb-4">
                                                <div className="relative w-24 h-24 mx-auto">
                                                    <svg className="transform -rotate-90 w-24 h-24">
                                                        <circle
                                                            cx="48"
                                                            cy="48"
                                                            r="40"
                                                            stroke="currentColor"
                                                            strokeWidth="8"
                                                            fill="none"
                                                            className="text-border-subtle"
                                                        />
                                                        <circle
                                                            cx="48"
                                                            cy="48"
                                                            r="40"
                                                            stroke="currentColor"
                                                            strokeWidth="8"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 40}`}
                                                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                                                            className="text-orange-500"
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-2xl font-bold" style={{ color: 'var(--text-primary, #18181B)' }}>{percentage}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{element}</h3>
                                        </div>
                                    ))}
                                </div>
                            </SpotlightCard>
                        </ScrollReveal>
                    </div>
                </div>

                {/* Remedies Section */}
                <div className="bg-section-white section-block">
                    <div className="section-wrapper">
                        <ScrollReveal>
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>Recommended Remedies</h2>
                                <p style={{ color: 'var(--text-secondary, #52525B)' }}>Actionable steps to enhance your property's harmony</p>
                            </div>

                            <div className="space-y-4">
                                {SAMPLE_DATA.remedies.map((remedy) => (
                                    <ScrollReveal key={remedy.id} delay={100}>
                                        <SpotlightCard className="remedy-card p-6">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    remedy.priority === 'high' ? 'bg-red-500/20 text-red-600' :
                                                    remedy.priority === 'medium' ? 'bg-orange-500/20 text-orange-600' :
                                                    'bg-amber-500/20 text-amber-600'
                                                }`}>
                                                    {remedy.priority === 'high' ? <AlertTriangle className="w-6 h-6" /> :
                                                     remedy.priority === 'medium' ? <Target className="w-6 h-6" /> :
                                                     <Check className="w-6 h-6" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary, #52525B)' }}>{remedy.zone} Zone</span>
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            remedy.priority === 'high' ? 'bg-red-500/20 text-red-600' :
                                                            remedy.priority === 'medium' ? 'bg-orange-500/20 text-orange-600' :
                                                            'bg-amber-500/20 text-amber-600'
                                                        }`}>
                                                            {remedy.priority} Priority
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary, #18181B)' }}>{remedy.issue}</h3>
                                                    <p className="mb-3" style={{ color: 'var(--text-secondary, #52525B)' }}>{remedy.remedy}</p>
                                                    <p className="text-sm italic" style={{ color: 'var(--text-secondary, #52525B)' }}>{remedy.impact}</p>
                                                </div>
                                            </div>
                                        </SpotlightCard>
                                    </ScrollReveal>
                                ))}
                            </div>
                        </ScrollReveal>
                    </div>
                </div>

                {/* Entrance Analysis Section */}
                <div className="bg-section-beige section-block">
                    <div className="section-wrapper">
                        <ScrollReveal>
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>Entrance Analysis</h2>
                                <p style={{ color: 'var(--text-secondary, #52525B)' }}>Your property's entrance direction and its Vastu significance</p>
                            </div>

                            <SpotlightCard className="p-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Compass className="w-8 h-8 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-serif" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.entranceAnalysis.direction}</h3>
                                                <p style={{ color: 'var(--text-secondary, #52525B)' }}>Entrance Direction</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Score</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-bold text-emerald-600">{SAMPLE_DATA.entranceAnalysis.score}</span>
                                                    <span style={{ color: 'var(--text-secondary, #52525B)' }}>/100</span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Status</span>
                                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-600 rounded-full text-sm font-semibold">
                                                    <Check className="w-4 h-4" />
                                                    Highly Auspicious
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Deity</span>
                                                <p className="font-medium" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.entranceAnalysis.deity}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Pada</span>
                                                <p className="font-medium" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.entranceAnalysis.pada}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>Positive Effects</h4>
                                        <div className="space-y-3">
                                            {SAMPLE_DATA.entranceAnalysis.effects.map((effect, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                                    <p style={{ color: 'var(--text-secondary, #52525B)' }}>{effect}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </ScrollReveal>
                    </div>
                </div>

                {/* Property Comparison Section */}
                <div className="bg-section-white section-block">
                    <div className="section-wrapper">
                        <ScrollReveal>
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>Neighborhood Comparison</h2>
                                <p style={{ color: 'var(--text-secondary, #52525B)' }}>See how your property compares to nearby addresses</p>
                            </div>

                            <SpotlightCard className="p-0 overflow-hidden">
                                <div className="p-6" style={{ borderBottom: '1px solid var(--border-subtle, #F3F4F6)', backgroundColor: 'var(--accent-glow, rgba(0, 0, 0, 0.03))' }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs block mb-1" style={{ color: 'var(--text-secondary, #52525B)' }}>Your Property</span>
                                            <p className="font-semibold" style={{ color: 'var(--text-primary, #18181B)' }}>{SAMPLE_DATA.propertyAddress}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-emerald-600">{SAMPLE_DATA.overallScore}</div>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary, #52525B)' }}>Rank #1</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-subtle, #F3F4F6)' }}>
                                    {SAMPLE_DATA.nearbyProperties.map((property, i) => (
                                        <div key={property.address} className={`p-6 flex items-center justify-between transition-colors ${i < SAMPLE_DATA.nearbyProperties.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border-subtle, #F3F4F6)' }}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center font-bold">
                                                    #{property.rank}
                                                </div>
                                                <div>
                                                    <p className="font-medium" style={{ color: 'var(--text-primary, #18181B)' }}>{property.address}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold" style={{ color: getScoreColor(property.score) }}>
                                                    {property.score}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SpotlightCard>
                        </ScrollReveal>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-section-beige section-block">
                    <div className="section-wrapper">
                        <ScrollReveal>
                            <div className="text-center max-w-2xl mx-auto">
                                <h2 className="text-3xl md:text-4xl font-serif mb-4" style={{ color: 'var(--text-primary, #18181B)' }}>
                                    Get Your Property Analysis
                                </h2>
                                <p className="text-lg mb-8" style={{ color: 'var(--text-secondary, #52525B)' }}>
                                    Discover the harmony score of any property using authentic Vastu Shastra principles.
                                </p>
                                <Link
                                    to="/guest"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
                                    style={{ backgroundColor: 'var(--text-primary, #18181B)', color: '#FFFFFF' }}
                                >
                                    <Sparkles className="w-5 h-5" />
                                    Analyze Your Property
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </main>

            <Footer showInstallButton={false} />
        </div>
    );
}
