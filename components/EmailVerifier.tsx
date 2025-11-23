import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { Card, Button } from './UI';

export const EmailVerifier: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [msg, setMsg] = useState('Verifying your email...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify');

    if (!token) {
      setStatus('error');
      setMsg("Invalid verification link.");
      return;
    }

    const verify = async () => {
      const res = await StorageService.verifyEmail(token);
      if (res.success) {
        setStatus('success');
        setMsg(res.message);
        // Clear the query param
        window.history.replaceState({}, document.title, window.location.pathname);
        // Auto-redirect or allow manual
        setTimeout(onVerified, 3000);
      } else {
        setStatus('error');
        setMsg(res.message);
      }
    };

    verify();
  }, [onVerified]);

  if (status === 'verifying') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <Card className="max-w-sm w-full text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-slate-800">Verifying Email</h3>
          <p className="text-slate-500 mt-2">Please wait a moment...</p>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <Card className="max-w-sm w-full text-center p-8">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-bold text-slate-800">Verified!</h3>
          <p className="text-slate-500 mt-2">{msg}</p>
          <Button className="mt-6 w-full" onClick={onVerified}>Continue to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <Card className="max-w-sm w-full text-center p-8">
        <div className="text-5xl mb-4">❌</div>
        <h3 className="text-lg font-bold text-slate-800">Verification Failed</h3>
        <p className="text-slate-500 mt-2">{msg}</p>
        <Button variant="secondary" className="mt-6 w-full" onClick={onVerified}>Close</Button>
      </Card>
    </div>
  );
};