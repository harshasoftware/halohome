import React, { useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useTheme } from 'next-themes';

// Use public key from env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeWrapperProps {
    clientSecret: string;
    children: React.ReactNode;
}

export const StripeWrapper: React.FC<StripeWrapperProps> = ({ clientSecret, children }) => {
    const { theme } = useTheme();

    const options = useMemo(() => ({
        clientSecret,
        appearance: {
            theme: theme === 'dark' ? 'night' as const : 'stripe' as const,
            variables: {
                colorPrimary: '#F59E0B', // Amber-500
                colorBackground: theme === 'dark' ? '#18181b' : '#ffffff',
                colorText: theme === 'dark' ? '#ffffff' : '#1f2937',
            },
        },
    }), [clientSecret, theme]);

    if (!clientSecret) return null;

    return (
        <Elements stripe={stripePromise} options={options}>
            {children}
        </Elements>
    );
};
