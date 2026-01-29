import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const GoogleOneTap = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Only run if not authenticated
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) return;

            // Load Google Script
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);

            script.onload = () => {
                if (!window.google) return;

                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: async (response: any) => {
                        try {
                            const { data, error } = await supabase.auth.signInWithIdToken({
                                provider: 'google',
                                token: response.credential,
                            });

                            if (error) throw error;

                            if (data.session) {
                                // Determine redirect path (similar to Login logic)
                                // Just redirect to app for now, or reload to let auth state take over
                                navigate('/app');
                            }
                        } catch (error) {
                            console.error('Error signing in with Google One Tap:', error);
                        }
                    },
                    auto_select: true, // Optional: auto select if only one account and approved
                    cancel_on_tap_outside: false,
                });

                // Display the One Tap prompt
                window.google.accounts.id.prompt((notification: any) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.log('One Tap skipped or not displayed:', notification.getNotDisplayedReason());
                    }
                });
            };

            return () => {
                document.body.removeChild(script);
            };
        };

        checkSession();
    }, [navigate]);

    return null; // This component handles its own UI (the popup)
};

export default GoogleOneTap;
