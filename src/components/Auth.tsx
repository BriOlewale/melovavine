import React, { useState, useEffect } from 'react';
import { StorageService } from '@/services/storageService';
import { Button, Card, Input, toast } from '@/components/UI';
import { User, Role } from '@/types';

import {
  FacebookAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth } from '@/services/firebaseConfig';

// Social provider for Facebook only (Google login is handled via StorageService)
const facebookProvider = new FacebookAuthProvider();

export const Auth: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // For email/password flow
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Social login loading states
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  useEffect(() => {
    // If you ever redirect back with ?verified=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      toast.success('🎉 Your email is verified! Please log in.');
    }
  }, []);

  // ---------------- Email / Password Auth Flow ----------------

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
        }
      } else if (view === 'register') {
        const result = await StorageService.register(email, password, name);

        if (result.success) {
          setView('sent');
          setError('');
        } else {
          setError(result.message || 'Registration failed.');
        }
      }
    } catch (err: any) {
      console.error('Auth Flow Error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
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

  // ---------------- Google Login via StorageService ----------------

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError('');
      setRequiresVerification(false);

      const result = await StorageService.loginWithGoogle();

      if (!result.success || !result.user) {
        setError(result.message || 'Could not sign in with Google.');
        return;
      }

      onLogin(result.user);
    } catch (err) {
      console.error('Google login error:', err);
      setError('Could not sign in with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ---------------- Facebook Login (direct here) ----------------

  const socialLoginFacebook = async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const fbUser = result.user;

      const now = Date.now();
      const isVerified = fbUser.emailVerified ?? true;

      const formattedUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Facebook User',
        email: fbUser.email || '',
        role: 'user' as Role,
        groupIds: [],
        permissions: [],
        effectivePermissions: [],
        createdAt: now,
        lastLoginAt: now,
        isDisabled: false,
        isActive: true,
        emailVerified: isVerified,
        isVerified: isVerified,
      };

      console.log('Facebook login success', formattedUser);
      onLogin(formattedUser);
    } catch (err: any) {
      console.error('Facebook login error:', err);

      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email;

        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          const first = methods[0];

          const methodText =
            first === 'google.com'
              ? 'Google'
              : first === 'password'
              ? 'email and password'
              : methods.join(', ');

          toast.error(
            `This email is already registered using ${methodText}. Please sign in with that method first.`
          );
        } else {
          toast.error(
            'This email is already registered with another login method. Please use your existing login.'
          );
        }
      } else {
        toast.error('Facebook Sign-In failed. Please try again.');
      }
    }
  };

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true);
    try {
      await socialLoginFacebook();
    } finally {
      setIsFacebookLoading(false);
    }
  };

  // ---------------- "Verification Sent" Screen ----------------

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

  // ---------------- Main Auth Screen ----------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl shadow-brand-500/10 border-0">
        {/* Header */}
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

        {/* Email/password form */}
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

        {/* Social logins (only on login view) */}
        {view === 'login' && (
          <div className="mt-4 space-y-3">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-12 flex items-center justify-center gap-3 border rounded-xl bg-white hover:bg-gray-50 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="h-5 w-5"
              />
              <span className="text-sm font-semibold text-slate-700">
                {isGoogleLoading ? 'Signing in…' : 'Sign in with Google'}
              </span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isFacebookLoading || isLoading}
              className="w-full h-12 flex items-center justify-center gap-3 border rounded-xl bg-[#1877F2] hover:bg-[#145fc0] text-white transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-current"
              >
                <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07C2 17.1 5.66 21.24 10.44 22v-6.99H7.9v-2.94h2.54V9.83c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.94h-2.34V22C18.34 21.24 22 17.1 22 12.07z" />
              </svg>
              <span className="text-sm font-semibold">
                {isFacebookLoading ? 'Signing in…' : 'Sign in with Facebook'}
              </span>
            </button>
          </div>
        )}

        {/* Footer toggle login/register */}
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
