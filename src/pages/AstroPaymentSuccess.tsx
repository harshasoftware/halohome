import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, Loader2, AlertCircle, FileDown } from 'lucide-react';

const AstroPaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const [tier, setTier] = useState<number | null>(null);

  useEffect(() => {
    const purchaseId = searchParams.get('purchase_id');
    if (!purchaseId) {
      setError('No purchase ID found in the URL.');
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        const { data, error: funcError } = await supabase.functions.invoke('verify-astro-payment', {
          body: { purchaseId },
        });

        if (funcError) throw funcError;
        if (data.error) throw new Error(data.error);

        if (data.success) {
          setStatus('success');
          setTier(data.tier);

          // Store the premium unlock in localStorage
          // The birthHash from the purchase should match what was used when creating
          if (data.tier && data.birthHash) {
            localStorage.setItem('astro_premium_unlock', JSON.stringify({
              birthHash: data.birthHash,
              tier: data.tier,
              purchaseId: purchaseId,
              verifiedAt: new Date().toISOString(),
            }));
          }

          toast.success(`Premium ${data.tier}-city report unlocked!`);
        } else {
          setStatus('error');
          setError(data.message || 'Could not verify payment.');
        }
      } catch (err: unknown) {
        setStatus('error');
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
  }, [searchParams]);

  const handleGoToApp = () => {
    // Navigate back to the main app - user will be able to generate their report
    navigate('/guest');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Verifying Payment...
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Please wait while we confirm your purchase.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Payment Successful!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your premium {tier}-city report has been unlocked.
              You can now generate detailed reports with up to {tier} cities per planetary line.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-3 text-green-600 dark:text-green-400">
                <FileDown className="w-5 h-5" />
                <span className="font-medium">Top {tier} City List - Unlocked</span>
              </div>
            </div>
            <Button onClick={handleGoToApp} size="lg" className="w-full">
              Go to App & Download Report
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Verification Failed
            </h1>
            <p className="text-red-600 dark:text-red-400 mb-6">
              {error}
            </p>
            <Button onClick={() => navigate('/guest')} variant="outline" className="w-full">
              Return to App
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AstroPaymentSuccess;
