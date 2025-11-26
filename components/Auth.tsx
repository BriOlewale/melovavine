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
        if (view === 'login') {
            const result = await StorageService.login(email, password);

            if (result.success && result.user) {
                onLogin(result.user);
                // No need to set loading to false as component unmounts
            } else {
                setError(result.message || 'Error logging in');
                setIsLoading(false);
            }
        } else if (view === 'register') {
            const result = await StorageService.register(email, password, name);

            if (result.success) {
                setView('sent');
                setError('');
            } else {
                setError(result.message || 'Registration failed.');
            }
            setIsLoading(false);
        }
      } catch (err: any) {
          console.error("Auth Flow Error:", err);
          setError("An unexpected error occurred. Please try again.");
          setIsLoading(false);
      }
  };

  if (view === 'sent') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-fade-in">
            <Card className="w-full max-w-md text-center">
                <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-4">✉️</div>
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Verification Sent</h2>
                <p className="text-slate-600 mb-6">
                    We've sent an email to <strong>{email}</strong>.
                    <br/><br/>
                    Please check your inbox (and spam folder) and click the verification link. You must verify your email before logging in.
                </p>
                <Button onClick={() => setView('login')} variant="secondary" className="mt-4 w-full">Back to Login</Button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-fade-in">
       <Card className="w-full max-w-md shadow-2xl shadow-brand-500/10 border-0">
          <div className="text-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30 mx-auto mb-4 transform hover:scale-105 transition-transform">
                VV
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800 tracking-tight">{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-slate-500 text-sm mt-1">{view === 'login' ? 'Sign in to continue translating' : 'Join our translation community'}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
             {view === 'register' && (
                <div className="animate-slide-up">
                    <Input label="Display Name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. John Doe" />
                </div>
             )}
             <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
             <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
             
             {error && (
                <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-2 animate-slide-up">
                    <span className="mt-0.5">⚠️</span>
                    <span>{error}</span>
                </div>
             )}
             
             <Button type="submit" className="w-full h-12 text-base shadow-brand-500/20" isLoading={isLoading}>
                {view === 'login' ? 'Sign In' : 'Create Account'}
             </Button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-100">
             <p className="text-slate-500 text-sm mb-2">{view === 'login' ? "Don't have an account?" : "Already have an account?"}</p>
             <button 
                onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }} 
                className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors hover:underline"
             >
                {view === 'login' ? 'Sign Up Now' : 'Sign In Here'}
             </button>
          </div>
       </Card>
    </div>
  );
};