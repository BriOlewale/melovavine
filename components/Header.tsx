import React from 'react';
import { User } from '../types';
import { Button } from './UI';
import { StorageService } from '../services/storageService';

interface HeaderProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onSwitchRole: () => void;
  pendingReviewCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ user, onNavigate, onSwitchRole, pendingReviewCount = 0 }) => {
  const canReview = StorageService.hasPermission(user, 'translation.review');
  const canAdmin = StorageService.hasPermission(user, 'user.read');

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex justify-between h-16">
        <div className="flex items-center cursor-pointer" onClick={() => onNavigate('dashboard')}>
           <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-300 via-cyan-400 to-blue-500 flex items-center justify-center mr-2 text-white font-bold text-xs">VV</div>
           <span className="font-bold text-xl text-gray-900 hidden sm:block">Va Vanagi</span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
           <button onClick={() => onNavigate('dashboard')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Dashboard</button>
           <button onClick={() => onNavigate('community')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Community</button>
           
           {user?.role !== 'guest' && <button onClick={() => onNavigate('translate')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Translate</button>}
           
           <button onClick={() => onNavigate('dictionary')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Dictionary</button>
           <button onClick={() => onNavigate('leaderboard')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Leaderboard</button>
           
           {canReview && <button onClick={() => onNavigate('review')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Review {pendingReviewCount > 0 && `(${pendingReviewCount})`}</button>}
           {canAdmin && <button onClick={() => onNavigate('admin')} className="text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap">Admin</button>}
           
           <Button onClick={onSwitchRole} variant="secondary" className="text-xs whitespace-nowrap ml-2">Sign Out</Button>
        </div>
      </div>
    </nav>
  );
};