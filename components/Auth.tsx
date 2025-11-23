import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { Button, Card, Input } from './UI';
import { User } from '../types';
import emailjs from '@emailjs/browser';
import { auth } from '../services/firebaseConfig'; 
import { sendEmailVerification } from 'firebase/auth';

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
            const res = await StorageService.login(email, password);
            if (res.success && res.user) {
                // Optional: Enforce email verification before login
                // const fbUser = auth.currentUser;
                // if (fbUser && !fbUser.emailVerified) {
                //    setError("Please verify your email first.");
                //    return;
                // }
                onLogin(res.user);
            } else {
                setError(res.message || 'Error');
            }
        } else if (view === 'register') {
            const res = await StorageService.register(email, password, name);
            if (res.success) {
                // Attempt to send real email if configured
                const settings = await StorageService.getSystemSettings();
                let emailSent = false;

                if (settings.emailJsServiceId && settings.emailJsTemplateId && settings.emailJsPublicKey) {
                    const templateParams = {
                        to_name: name,
                        to_email: email,
                        verification_link: `${window.location.origin}/?verify=${res.token}`,
                        message: "Welcome to Va Vanagi! Please verify your email to start translating."
                    };

                    try {
                        await emailjs.send(
                            settings.emailJsServiceId, 
                            settings.emailJsTemplateId, 
                            templateParams, 
                            settings.emailJsPublicKey
                        );
                        console.log("Email Sent Successfully via EmailJS");
                        emailSent = true;
                    } catch (emailErr) {
                        console.error("Failed to send email via EmailJS", emailErr);
                    }
                }
                
                // Fallback: Send standard Firebase verification email if EmailJS fails or isn't configured
                if (!emailSent && auth.currentUser) {
                    try {
                        await sendEmailVerification(auth.currentUser);
                        console.log("Sent standard Firebase verification email");
                    } catch (fbErr) {
                        console.error("Failed to send Firebase verification", fbErr);
                    }
                }

                // Switch to 'sent' view instead of auto-login
                setView('sent');
            } else {
                setError(res.message || 'Error');
            }
        }
      } catch (err: any) {
          setError(err.message || "An unexpected error occurred.");
      } finally {
          setIsLoading(false);
      }
  };

  if (view === 'sent') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md text-center">
                <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-4">✉️</div>
                <h2 className="text-2xl font-bold mb-2">Check your Inbox</h2>
                <p className="text-gray-600 mb-6">
                    We have sent a verification link to <strong>{email}</strong>. 
                    Please click the link in the email to activate your account.
                </p>
                <Button onClick={() => setView('login')} variant="secondary">Back to Login</Button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
       <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <img 
                src="https://i.postimg.cc/zvjJsmdg/9f6d5225-d82a-4eae-a71f-737baf3c894f.png" 
                alt="Va Vanagi Logo" 
                className="mx-auto h-32 w-auto mb-4 object-contain"
            />
            <h2 className="mt-2 text-2xl font-bold">{view === 'login' ? 'Sign In' : 'Sign Up'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             {view === 'register' && <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />}
             <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
             <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
             {error && <p className="text-red-500 text-sm">{error}</p>}
             <Button type="submit" className="w-full" isLoading={isLoading}>{view === 'login' ? 'Login' : 'Register'}</Button>
          </form>
          <div className="mt-4 text-center">
             <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm text-brand-600 hover:underline">
                {view === 'login' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
             </button>
          </div>
       </Card>
    </div>
  );
};