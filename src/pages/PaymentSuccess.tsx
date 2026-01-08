import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth-context';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

// Inline migration logic for guest-to-permanent project
function migrateGuestProjectToPermanent(newProjectId) {
  const oldProjectId = localStorage.getItem('guestFamilyTreeCurrentProjectId');
  if (oldProjectId && oldProjectId !== newProjectId) {
    // Move guest project data to new permanent id if needed
    const oldKey = `guest_project_${oldProjectId}`;
    const newKey = `guest_project_${newProjectId}`;
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data);
      localStorage.removeItem(oldKey);
    }
    localStorage.setItem('guestFamilyTreeCurrentProjectId', newProjectId);
  }
}

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const { user } = useAuth(); // We still need user to know if they are logged in or not
    const [status, setStatus] = useState('Verifying your payment...');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const orderId = searchParams.get('order_id');
        if (!orderId) {
            setError('No order ID found in the URL.');
            setStatus('Verification Failed');
            return;
        }

        const verify = async () => {
            try {
                const { data, error: funcError } = await supabase.functions.invoke('verify-payment', {
                    body: { orderId },
                });

                if (funcError) throw funcError;
                if (data.error) throw new Error(data.error);
                
                if (data.success) {
                    setStatus('Payment Successful!');
                    toast.success('Your project is now permanent.');

                    if (!user && data.projectId) {
                        // Migrate guest project to permanent
                        migrateGuestProjectToPermanent(data.projectId);
                        // Mark as permanent in localStorage
                        const projectKey = `guest_project_${data.projectId}`;
                        const projectData = localStorage.getItem(projectKey);
                        if (projectData) {
                            const parsedData = JSON.parse(projectData);
                            parsedData.is_permanent = true;
                            localStorage.setItem(projectKey, JSON.stringify(parsedData));
                        }
                    }
                    // Redirect to /project/:projectId for both guest and logged-in users
                    if (data.projectId) {
                        setTimeout(() => {
                          navigate(`/project/${data.projectId}`, { replace: true });
                        }, 1200); // Give a moment for toast/UI
                    }
                } else {
                    setStatus('Verification Failed');
                    setError(data.message || 'Could not verify payment.');
                }
            } catch (err: unknown) {
                setStatus('Verification Failed');
                if (err instanceof Error) {
                  setError(err.message || 'An unexpected error occurred.');
                  toast.error(err.message || 'Payment verification failed.');
                } else {
                  setError('An unexpected error occurred.');
                  toast.error('Payment verification failed.');
                }
            }
        };

        verify();

    }, [searchParams, user, navigate]);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-center p-4">
            <h1 className="text-3xl font-bold mb-4">{status}</h1>
            {error && <p className="text-red-500 mb-6">{error}</p>}
            {status === 'Payment Successful!' && (
                 <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">Your project has been saved permanently. Sign in to access it at any time.</p>
            )}
            <Button asChild>
              <Link to="/">
                  Go to Dashboard
              </Link>
            </Button>
        </div>
    );
};

export default PaymentSuccess;
