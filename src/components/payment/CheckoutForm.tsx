import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CheckoutFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    planName: string;
    trialDays: number;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ onSuccess, onCancel, planName, trialDays }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                // Return URL where the customer should be redirected after the PaymentIntent is confirmed.
                return_url: `${window.location.origin}/ai-subscription?subscription=success`,
            },
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || 'An unexpected error occurred.');
            setIsLoading(false);
        } else {
            // Success!
            onSuccess();
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-amber-500 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {trialDays}-Day Free Trial
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                    You won't be charged today. Cancel anytime before the trial ends.
                </p>
            </div>

            <PaymentElement />

            {errorMessage && (
                <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {errorMessage}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !stripe || !elements}
                    className="flex-1 bg-amber-500 text-black font-medium py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Start Trial
                </button>
            </div>
        </form>
    );
};
