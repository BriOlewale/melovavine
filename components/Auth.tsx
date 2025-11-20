import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { Button, Card, Input } from './UI';
import { User } from '../types';

export const Auth: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (view === 'login') {
          const res = await StorageService.login(email, password);
          if (res.success && res.user) onLogin(res.user);
          else setError(res.message || 'Error');
      } else {
          const res = await StorageService.register(email, password, name);
          if (res.success) alert('Registered! Check simulated email.');
          else setError(res.message || 'Error');
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-teal-300 via-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">VV</div>
            <h2 className="mt-2 text-2xl font-bold">{view === 'login' ? 'Sign In' : 'Sign Up'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             {view === 'register' && <Input label="Name" value={name} onChange={e => setName(e.target.value)} />}
             <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
             <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
             {error && <p className="text-red-500 text-sm">{error}</p>}
             <Button type="submit" className="w-full">{view === 'login' ? 'Login' : 'Register'}</Button>
          </form>
          <div className="mt-4 text-center">
             <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm text-brand-600">
                {view === 'login' ? 'Need an account?' : 'Have an account?'}
             </button>
          </div>
       </Card>
    </div>
  );
};