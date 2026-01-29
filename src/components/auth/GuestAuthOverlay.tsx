import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth-context';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronLeft, ChevronRight, Sparkles, Zap } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

export const GuestAuthOverlay = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });
    const [visible, setVisible] = React.useState(true);

    // If loading, don't show yet
    if (loading) return null;

    // If authenticated and real user, don't show
    if (user && !user.is_anonymous) return null;

    const handleLogin = () => {
        navigate('/login', {
            state: {
                from: {
                    pathname: '/ai-subscription',
                    search: '?start_trial=true'
                }
            }
        });
    };

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    // Comparison Data
    const featureLabels = [
        "Property Search",
        "Vastu Analytics",
        "Building Footprints",
        "Solar & Energy",
        "Saved Projects",
        "Export Reports"
    ];

    const plans = [
        {
            name: "Free",
            price: "$0",
            period: "7 days",
            color: "text-zinc-600",
            highlight: false,
            values: [
                "Limited",
                "Basic",
                <X className="w-4 h-4 text-zinc-400" key="free-fp" />,
                <X className="w-4 h-4 text-zinc-400" key="free-solar" />,
                "1 Project",
                <X className="w-4 h-4 text-zinc-400" key="free-export" />
            ]
        },
        {
            name: "Explorer",
            price: "$49",
            period: "/mo",
            color: "text-[#EA580C]",
            highlight: false,
            values: [
                "5 / mo",
                "Standard",
                <Check className="w-4 h-4 text-[#EA580C]" key="exp-fp" />,
                <Check className="w-4 h-4 text-[#EA580C]" key="exp-solar" />,
                "10 Projects",
                <Check className="w-4 h-4 text-[#EA580C]" key="exp-export" />
            ]
        },
        {
            name: "Pioneer",
            price: "$89",
            period: "/mo",
            color: "text-[#18181B]",
            highlight: true,
            values: [
                "25 / mo",
                "Advanced",
                <Check className="w-4 h-4 text-[#18181B]" key="pio-fp" />,
                <Check className="w-4 h-4 text-[#18181B]" key="pio-solar" />,
                "Unlimited",
                <Check className="w-4 h-4 text-[#18181B]" key="pio-export" />
            ]
        },
        {
            name: "Broker",
            price: "$179",
            period: "/mo",
            color: "text-[#18181B]",
            highlight: false,
            values: [
                "Unlimited",
                "Pro Suite",
                <Check className="w-4 h-4 text-[#18181B]" key="bro-fp" />,
                <Check className="w-4 h-4 text-[#18181B]" key="bro-solar" />,
                "Unlimited",
                <Check className="w-4 h-4 text-[#18181B]" key="bro-export" />
            ]
        }
    ];

    if (!visible) {
        // Transparent layer to capture clicks and re-show modal
        // Positioned below the Navbar (approx 64px/4rem) to allow Navbar interaction
        // Using z-40 to sit above map/UI but potentially below high-level modals (usually 50+)
        return (
            <div
                className="fixed inset-0 top-16 z-40 bg-transparent cursor-default"
                onClick={() => setVisible(true)}
                aria-hidden="true"
            />
        );
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-[1px] transition-all duration-500 p-4">
            <div className="relative bg-[#DBCBB0] border border-[#C5B49A] shadow-2xl rounded-3xl p-6 md:p-8 max-w-5xl w-full mx-auto animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-8 items-stretch font-sans overflow-hidden">

                {/* Close Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setVisible(false);
                    }}
                    className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/5 hover:bg-black/10 text-zinc-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Panel: Copy & CTA */}
                <div className="flex-[0_0_35%] flex flex-col justify-center min-w-[280px]">
                    <div className="mb-6">
                        <div className="inline-flex items-center gap-2 mb-6 select-none bg-white px-3.5 py-2 rounded-full shadow-sm border border-[#C5B49A]/30">
                            <img src="/logo.png" alt="Halo Home" className="w-5 h-5 rounded object-contain shrink-0" />
                            <span className="font-sans font-bold text-[13px] text-[#18181B] tracking-tight whitespace-nowrap">Halo Home</span>
                        </div>
                        <h2 className="text-4xl font-bold text-[#18181B] mb-4 leading-[1.1] font-[Playfair_Display]">
                            Unlock Full Insights
                        </h2>
                        <h3 className="text-xl text-[#18181B] font-medium mb-2">
                            Start your <span className="text-[#EA580C] font-bold">7-day free trial</span>
                        </h3>
                        <p className="text-[#52525B] text-sm leading-relaxed max-w-sm">
                            Compare plans and choose the perfect toolkit for your Vastu & Property needs.
                        </p>
                    </div>

                    <div className="mt-auto hidden md:block">
                        <div className="flex items-center gap-4 text-xs font-medium text-[#52525B] mb-4">
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#EA580C]" /> Instant Access</span>
                            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#EA580C]" /> Cancel Anytime</span>
                        </div>
                        <Button
                            onClick={handleLogin}
                            className="w-full h-12 text-base font-medium bg-[#18181B] hover:bg-[#27272A] text-white shadow-lg shadow-black/5 rounded-xl transition-all"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>

                {/* Right Panel: Scrollable Comparison Table */}
                <div className="flex-1 bg-[#FDFAF6] rounded-2xl border border-[#C5B49A]/30 shadow-sm flex flex-col overflow-hidden relative">

                    {/* Table Header: Nav & Headings */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-white/50 backdrop-blur-sm z-10 h-16">
                        <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider w-32 shrink-0">Features</span>

                        <div className="flex-1 flex justify-end gap-2 pr-8">
                            <button onClick={scrollPrev} className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-[#EA580C] hover:border-[#EA580C] transition-all shadow-sm">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={scrollNext} className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-[#EA580C] hover:border-[#EA580C] transition-all shadow-sm">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden relative">
                        {/* Fixed Feature Names Column */}
                        <div className="w-32 shrink-0 border-r border-zinc-100 bg-zinc-50/50 flex flex-col pt-14 pb-4">
                            {featureLabels.map((label, i) => (
                                <div key={i} className="h-10 flex items-center px-4 text-xs font-semibold text-[#52525B]">
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* Scrollable Plan Columns */}
                        <div className="flex-1 overflow-hidden" ref={emblaRef}>
                            <div className="flex h-full">
                                {plans.map((plan, i) => (
                                    <div key={i} className={`flex-[0_0_33.33%] min-w-[100px] flex flex-col border-r border-zinc-50 ${plan.highlight ? 'bg-white' : ''} h-full`}>
                                        {/* Plan Header */}
                                        <div className={`h-14 flex flex-col items-center justify-center border-b border-zinc-100 ${plan.highlight ? 'bg-[#EA580C]/5' : ''}`}>
                                            <div className="flex items-center gap-1.5 ">
                                                <span className={`text-sm font-bold ${plan.highlight ? 'text-[#EA580C]' : 'text-[#18181B]'}`}>{plan.name}</span>
                                                {plan.highlight && <Sparkles className="w-3 h-3 text-[#EA580C] fill-current" />}
                                            </div>
                                            <span className="text-[10px] text-[#A1A1AA] font-medium">{plan.price} {plan.period}</span>
                                        </div>

                                        {/* Values */}
                                        <div className="flex-1 flex flex-col pt-0">
                                            {plan.values.map((val, idx) => (
                                                <div key={idx} className="h-10 flex items-center justify-center border-b border-zinc-50 text-xs font-medium text-[#18181B]">
                                                    {val}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mobile CTA */}
                    <div className="p-3 md:hidden border-t border-zinc-100 bg-white/50">
                        <Button
                            onClick={handleLogin}
                            className="w-full h-10 text-sm font-medium bg-[#18181B] hover:bg-[#27272A] text-white shadow-lg shadow-black/5 rounded-xl transition-all"
                        >
                            Get Started
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};
