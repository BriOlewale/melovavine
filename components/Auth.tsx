import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { Button, Card, Input } from './UI';
import { User } from '../types';

export const Auth: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        // Define the timeout promise that rejects after 15s
        const timeoutPromise = new Promise<{success: boolean, message?: string}>((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 15000)
        );

        let result: any;

        if (view === 'login') {
            // Race the login against the timeout
            result = await Promise.race([
                StorageService.login(email, password),
                timeoutPromise
            ]);

            if (result.success && result.user) {
                onLogin(result.user);
                // Note: Loading stays true as App.tsx takes over, but unmounting cleans up
            } else {
                setError(result.message || 'Error logging in');
                setIsLoading(false);
            }
        } else if (view === 'register') {
            // Race the register against the timeout
            result = await Promise.race([
                StorageService.register(email, password, name),
                timeoutPromise
            ]);

            if (result.success) {
                setView('sent');
                setIsLoading(false);
            } else {
                setError(result.message || 'Registration failed.');
                setIsLoading(false);
            }
        }
      } catch (err: any) {
          console.error("Auth Flow Error:", err);
          
          let displayMsg = "An unexpected error occurred.";
          if (err.message === "Request timed out") {
             displayMsg = "System is busy (Database Quota Exceeded). Please try again tomorrow.";
          } else if (err.message) {
             displayMsg = err.message;
          }
          
          setError(displayMsg);
          setIsLoading(false);
      }
  };

  if (view === 'sent') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md text-center">
                <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-4">✉️</div>
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Check your Inbox</h2>
                <p className="text-slate-600 mb-6">
                    We have sent a verification email to <strong>{email}</strong>. 
                    Please click the link in that email to activate your account before signing in.
                </p>
                <Button onClick={() => setView('login')} variant="secondary" className="mt-4">Back to Login</Button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
       <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-500/25 mx-auto mb-4">
                VV
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">{view === 'login' ? 'Sign In' : 'Sign Up'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             {view === 'register' && <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />}
             <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
             <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
             {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
             <Button type="submit" className="w-full" isLoading={isLoading}>{view === 'login' ? 'Login' : 'Register'}</Button>
          </form>
          <div className="mt-6 text-center pt-4 border-t border-slate-100">
             <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                {view === 'login' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
             </button>
          </div>
       </Card>
    </div>
  );
};