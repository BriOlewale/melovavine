import React, { useState, useEffect } from 'react';
import { StorageService } from '@/services/storageService';
import { Button, Card, Input, toast } from '@/components/UI';
import { User } from '@/types';

import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';

// Social providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export const Auth: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for unverified users (email/password flow)
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Check if redirect came from successful verification
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      toast.success('🎉 Your email is verified! Please log in.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRequiresVerification(false);
    setIsLoading(true);

    try {
      if (view === 'login') {
        const result = await StorageService.login(email, password);

        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          setError(result.message || 'Error logging in');
          if (result.requiresVerification) {
            setRequiresVerification(true);
          }
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
      console.error('Auth Flow Error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    const res = await StorageService.resendVerificationEmail();
    if (res.success) {
      toast.success('Verification email sent! Check your inbox.');
    } else {
      toast.error(res.message || 'Failed to resend email.');
    }
    setIsResending(false);
  };

  // Generic social login handler used by Google + Facebook
  const socialLogin = async (
    provider: GoogleAuthProvider | FacebookAuthProvider,
    providerName: 'Google' | 'Facebook'
  ) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const now = Date.now();
      const isVerified = fbUser.emailVerified ?? true;

      const formattedUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || `${providerName} User`,
        email: fbUser.email || '',
        role: 'user' as any, // adjust if your Role type uses different values

        // Relationships
        groupIds: [],

        // Permissions
        permissions: [],
        effectivePermissions: [],

        // Auth & Status
        createdAt: now,
        lastLoginAt: now,
        isDisabled: false,
        isActive: true,
        emailVerified: isVerified,
        isVerified: isVerified,
      };

      onLogin(formattedUser);
    } catch (err: any) {
      console.error(`${providerName} login error:`, err);
      toast.error(`${providerName} Sign-In failed. Please try again.`);
    }
  };

  const handleGoogleLogin = () => socialLogin(googleProvider, 'Google');
  const handleFacebookLogin = () => socialLogin(facebookProvider, 'Facebook');

  // ---------- Verification Sent View ----------
  if (view === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-fade-in">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-4">
            ✉️
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Verification Sent</h2>
          <p className="text-slate-600 mb-6">
            We&apos;ve sent an email to <strong>{email}</strong>.
            <br />
            <br />
            Please check your inbox (and spam folder) and click the verification link.
            You must verify your email before logging in.
          </p>
          <Button
            onClick={() => setView('login')}
            variant="secondary"
            className="mt-4 w-full"
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  // ---------- Main Auth View ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl shadow-brand-500/10 border-0">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30 mx-auto mb-4 transform hover:scale-105 transition-transform">
            VV
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-800 tracking-tight">
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {view === 'login'
              ? 'Sign in to continue translating'
              : 'Join our translation community'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {view === 'register' && (
            <div className="animate-slide-up">
              <Input
                label="Display Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. John Doe"
              />
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
          />

          {error && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-slide-up">
              <div className="flex items-start gap-2 text-red-600 text-sm mb-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
              {requiresVerification && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={handleResendVerification}
                  isLoading={isResending}
                  className="bg-white border-red-200 text-red-700 hover:bg-red-50"
                >
                  Resend Verification Email
                </Button>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base shadow-brand-500/20"
            isLoading={isLoading}
          >
            {view === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {view === 'login' && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-12 flex items-center justify-center gap-3 border rounded-xl bg-white hover:bg-gray-50 transition shadow-sm"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="h-5 w-5"
              />
              <span className="text-sm font-semibold text-slate-700">
                Sign in with Google
              </span>
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              className="w-full h-12 flex items-center justify-center gap-3 border rounded-xl bg-[#1877F2] hover:bg-[#145fc0] text-white transition shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-current"
              >
                <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07C2 17.1 5.66 21.24 10.44 22v-6.99H7.9v-2.94h2.54V9.83c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.94h-2.34V22C18.34 21.24 22 17.1 22 12.07z" />
              </svg>
              <span className="text-sm font-semibold">
                Sign in with Facebook
              </span>
            </button>
          </div>
        )}

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-slate-500 text-sm mb-2">
            {view === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}
          </p>
          <button
            onClick={() => {
              setView(view === 'login' ? 'register' : 'login');
              setError('');
              setRequiresVerification(false);
            }}
            className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors hover:underline"
          >
            {view === 'login' ? 'Sign Up Now' : 'Sign In Here'}
          </button>
        </div>
      </Card>
    </div>
  );
};
