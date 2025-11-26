import React, { useEffect, useState } from 'react';
import { Card, Button } from '@/components/UI';
import { StorageService } from '@/services/storageService';

export const VerificationSuccess: React.FC<{ actionCode: string | null }> = ({ actionCode }) => {
  // ... rest of the component (no logic changes)
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verify = async () => {
        if (!actionCode) {
            setStatus('error');
            setMessage("Invalid link. No verification code found.");
            return;
        }

        const result = await StorageService.verifyEmailWithCode(actionCode);
        if (result.success) {
            setStatus('success');
        } else {
            setStatus('error');
            setMessage(result.message || "Verification failed.");
        }
    };
    
    verify();
  }, [actionCode]);

  const handleProceed = () => {
      // Hard redirect to clear query params and reset app state
      window.location.href = '/?verified=true';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
       <Card className="w-full max-w-md text-center shadow-xl">
          {status === 'verifying' && (
              <div className="py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
                  <h2 className="text-xl font-bold text-slate-800">Verifying...</h2>
              </div>
          )}

          {status === 'success' && (
              <div className="py-6 animate-slide-up">
                  <div className="mx-auto h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-green-100 shadow-lg">
                      ✅
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
                  <p className="text-slate-600 mb-8">Thank you for verifying your email address. You can now access all features.</p>
                  <Button fullWidth size="lg" onClick={handleProceed}>Proceed to Login</Button>
              </div>
          )}

          {status === 'error' && (
              <div className="py-6 animate-slide-up">
                  <div className="mx-auto h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mb-6">
                      ⚠️
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
                  <p className="text-slate-600 mb-8">{message}</p>
                  <Button fullWidth variant="secondary" onClick={() => window.location.href = '/'}>Back to Home</Button>
              </div>
          )}
       </Card>
    </div>
  );
};