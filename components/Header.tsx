import React, { useState } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const canReview = StorageService.hasPermission(user, 'translation.review');
  const canAdmin = StorageService.hasPermission(user, 'user.read');

  const handleNav = (page: string) => {
      onNavigate(page);
      setIsMenuOpen(false);
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => handleNav('dashboard')}>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-300 via-cyan-400 to-blue-500 flex items-center justify-center mr-2 text-white font-bold text-xs shadow-sm">VV</div>
                <span className="font-bold text-xl text-gray-900">Va Vanagi</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
                <button onClick={() => handleNav('dashboard')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Dashboard</button>
                <button onClick={() => handleNav('community')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Community</button>
                
                {user?.role !== 'guest' && <button onClick={() => handleNav('translate')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Translate</button>}
                
                <button onClick={() => handleNav('corpus')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Browse</button>
                <button onClick={() => handleNav('dictionary')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Dictionary</button>
                <button onClick={() => handleNav('leaderboard')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Leaderboard</button>
                
                {canReview && <button onClick={() => handleNav('review')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Review {pendingReviewCount > 0 && <span className="ml-1 bg-amber-100 text-amber-800 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingReviewCount}</span>}</button>}
                {canAdmin && <button onClick={() => handleNav('admin')} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors">Admin</button>}
                
                <div className="pl-2 ml-2 border-l border-gray-200">
                    <Button onClick={onSwitchRole} variant="secondary" size="sm">Sign Out</Button>
                </div>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none">
                    {isMenuOpen ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
            </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg">
              <div className="px-2 pt-2 pb-3 space-y-1">
                  <MobileNavLink onClick={() => handleNav('dashboard')}>Dashboard</MobileNavLink>
                  <MobileNavLink onClick={() => handleNav('community')}>Community</MobileNavLink>
                  {user?.role !== 'guest' && <MobileNavLink onClick={() => handleNav('translate')}>Translate</MobileNavLink>}
                  <MobileNavLink onClick={() => handleNav('corpus')}>Browse</MobileNavLink>
                  <MobileNavLink onClick={() => handleNav('dictionary')}>Dictionary</MobileNavLink>
                  <MobileNavLink onClick={() => handleNav('leaderboard')}>Leaderboard</MobileNavLink>
                  {canReview && <MobileNavLink onClick={() => handleNav('review')}>Review {pendingReviewCount > 0 && `(${pendingReviewCount})`}</MobileNavLink>}
                  {canAdmin && <MobileNavLink onClick={() => handleNav('admin')}>Admin</MobileNavLink>}
                  <div className="pt-4 pb-2 px-3">
                    <Button onClick={onSwitchRole} variant="secondary" fullWidth>Sign Out</Button>
                  </div>
              </div>
          </div>
      )}
    </nav>
  );
};

const MobileNavLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button onClick={onClick} className="block w-full text-left px-3 py-4 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 active:bg-brand-50 transition-colors">
        {children}
    </button>
);