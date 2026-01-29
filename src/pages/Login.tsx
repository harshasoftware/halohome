import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth-context';
import { useToast } from '@/hooks/use-toast';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import {
    Sparkles,
    ShieldCheck,
    Globe,
    Zap,
    Home as HomeIcon,
    ArrowLeft
} from 'lucide-react';
import GoogleOneTap from '@/components/auth/GoogleOneTap';
import '@/pages/Landing.css'; // Reuse landing animations if possible

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    // Get current view from URL or default to 'sign_in'
    const view = (searchParams.get('view') as 'sign_in' | 'sign_up') || 'sign_in';

    // Get redirect path
    const fromLocation = (location.state as any)?.from;
    const from = fromLocation
        ? `${fromLocation.pathname}${fromLocation.search}`
        : '/app';

    React.useEffect(() => {
        if (user && !user.is_anonymous) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleViewChange = (newView: 'sign_in' | 'sign_up') => {
        setSearchParams({ view: newView }, { replace: true });
    };

    // Benefits list for left pane - simpler icons for light theme
    const benefits = [
        {
            icon: <Globe className="w-5 h-5 text-slate-700" />,
            title: "Global Property Scout",
            desc: "Analyze harmony in any ZIP code instantly."
        },
        {
            icon: <Sparkles className="w-5 h-5 text-slate-700" />,
            title: "AI Analysis",
            desc: "Get deep insights powered by ancient wisdom."
        },
        {
            icon: <ShieldCheck className="w-5 h-5 text-slate-700" />,
            title: "Remedies & Corrections",
            desc: "Actionable tips to improve your space."
        }
    ];

    return (
        <div className="h-screen max-h-screen w-full flex bg-white text-slate-900 overflow-hidden font-['Plus_Jakarta_Sans']">


            {/* LEFT PANE - Marketing / Benefits - Light Theme */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-100 bg-slate-50/50">
                {/* Background Image */}
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-[url('/images/hero-houses.png')] bg-center bg-contain bg-no-repeat"
                    aria-hidden="true"
                />

                {/* Logo - Fixed Top */}
                <div className="relative z-10 flex-none">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
                    >
                        <img src="/logo.png" alt="Halo Home" className="w-8 h-8 rounded-md" />
                        <span className="text-2xl font-bold tracking-tight text-slate-900">Halo Home</span>
                    </button>
                </div>

                {/* Centered Content - aligned top */}
                <div className="relative z-10 flex-1 flex flex-col justify-start pt-12 max-w-md">
                    <h1 className="text-4xl md:text-5xl font-bold leading-none mb-10 text-slate-900 uppercase tracking-tight">
                        Find harmony in <br />
                        <span className="text-slate-500">
                            every space.
                        </span>
                    </h1>

                    <div className="space-y-6 mb-10">
                        {benefits.map((benefit, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm transition-all duration-300">
                                <div className="p-2 rounded-lg bg-slate-100">
                                    {benefit.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                                    <p className="text-sm text-slate-500">{benefit.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-lg text-slate-600 leading-relaxed font-medium">
                        Join thousands of homeowners discovering the hidden energy of their properties.
                    </p>
                </div>

                <div className="relative z-10 flex-none text-sm text-slate-400">
                    © {new Date().getFullYear()} Halo Home. All rights reserved.
                </div>
            </div>

            {/* RIGHT PANE - Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col p-6 lg:p-12 relative bg-[#dccbb0]">
                {/* Mobile Header (only visible on mobile) */}
                <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
                    <img src="/logo.png" alt="Halo Home" className="w-8 h-8 rounded-md" />
                    <span className="text-xl font-bold text-slate-900">Halo Home</span>
                </div>

                {/* Spacer to match Left Pane Logo height (32px) + margin if needed, but flex-1 handles the rest */}
                {/* We need the content to start at the exact same vertical offset. 
                    Left pane has Logo (h-8) + pt-24 on content.
                    Right pane needs a matching spacer or identical structure.
                */}
                <div className="hidden lg:block flex-none h-8 mb-0" aria-hidden="true"></div>

                <div className="flex-1 flex flex-col justify-start items-center w-full pt-12">
                    <div className="w-full max-w-sm space-y-8">
                        <div className="space-y-2 text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-['Playfair_Display']">
                                {view === 'sign_up' ? 'Create an account' : 'Welcome back'}
                            </h2>
                            <p className="text-slate-500 font-['Plus_Jakarta_Sans']">
                                {view === 'sign_up' ? 'Enter your details to get started' : 'Enter your credentials to access your account'}
                            </p>
                        </div>

                        <div className="auth-container light-theme-auth">
                            <Auth
                                supabaseClient={supabase}
                                appearance={{
                                    theme: ThemeSupa,
                                    variables: {
                                        default: {
                                            colors: {
                                                brand: '#18181B', // Black primary button
                                                brandAccent: '#27272a',
                                                brandButtonText: 'white',
                                                defaultButtonBackground: 'white',
                                                defaultButtonText: '#18181B', // Dark text for Google button
                                                inputBackground: '#FFFFFF',
                                                inputText: '#18181B',
                                                inputBorder: '#E4E4E7', // zinc-200
                                                inputPlaceholder: '#A1A1AA', // zinc-400
                                            },
                                            radii: {
                                                borderRadiusButton: '12px',
                                                inputBorderRadius: '12px',
                                            },
                                            space: {
                                                inputPadding: '16px',
                                                buttonPadding: '14px',
                                            },
                                            fonts: {
                                                bodyFontFamily: `'Plus Jakarta Sans', sans-serif`,
                                                buttonFontFamily: `'Plus Jakarta Sans', sans-serif`,
                                            }
                                        },
                                    },
                                    className: {
                                        container: 'gap-4',
                                        button: 'w-full font-medium transition-all shadow-sm hover:shadow-md border border-slate-200',
                                        input: 'transition-all focus:ring-2 focus:ring-slate-900 focus:border-transparent',
                                        label: 'text-slate-700 text-sm font-medium mb-1.5',
                                        loader: 'text-slate-900',
                                        anchor: 'text-slate-600 hover:text-slate-900 transition-colors',
                                        divider: 'bg-slate-300 my-6',
                                    },
                                }}
                                providers={['google']}
                                redirectTo={`${window.location.origin}/app`}
                                onlyThirdPartyProviders={false}
                                view="magic_link"
                                magicLink={true}
                                showLinks={false} // Hide default links to control view state manually
                                localization={{
                                    variables: {
                                        magic_link: {
                                            email_input_label: 'Email address',
                                            button_label: view === 'sign_up' ? 'Create Account' : 'Sign In with Email',
                                            loading_button_label: 'Sending magic link...',
                                            link_text: 'Send magic link',
                                        },
                                        sign_in: {
                                            social_provider_text: 'Continue with {{provider}}',
                                        },
                                        sign_up: {
                                            social_provider_text: 'Continue with {{provider}}',
                                        }
                                    },
                                }}
                            />

                            {/* Custom View Toggle */}
                            <div className="mt-6 text-center text-sm">
                                {view === 'sign_in' ? (
                                    <p className="text-slate-600">
                                        Don't have an account?{' '}
                                        <button
                                            onClick={() => handleViewChange('sign_up')}
                                            className="font-medium text-slate-900 hover:underline"
                                        >
                                            Sign up
                                        </button>
                                    </p>
                                ) : (
                                    <p className="text-slate-600">
                                        Already have an account?{' '}
                                        <button
                                            onClick={() => handleViewChange('sign_in')}
                                            className="font-medium text-slate-900 hover:underline"
                                        >
                                            Sign in
                                        </button>
                                    </p>
                                )}
                            </div>
                        </div>

                        <p className="px-8 text-center text-xs text-slate-500">
                            By clicking continue, you agree to our{' '}
                            <a href="/terms" className="underline underline-offset-4 hover:text-slate-900">Terms of Service</a>{' '}
                            and{' '}
                            <a href="/privacy" className="underline underline-offset-4 hover:text-slate-900">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
