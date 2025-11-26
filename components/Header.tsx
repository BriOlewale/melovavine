import React, { useState } from 'react';
import { User } from '../types';
import { Button } from './UI';
import { hasPermission } from '../services/permissionService';

interface HeaderProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onSwitchRole: () => void;
  pendingReviewCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ user, onNavigate, onSwitchRole, pendingReviewCount = 0 }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // RBAC Checks
  const canReview = hasPermission(user, 'translation.review');
  const canAdmin = hasPermission(user, 'user.read'); // Admin panel generally requires user.read or role=admin

  const handleNav = (page: string) => {
      onNavigate(page);
      setIsMenuOpen(false);
  }

  const NavItem = ({ label, page, badge }: { label: string, page: string, badge?: number }) => (
      <button 
        onClick={() => handleNav(page)} 
        className="relative px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-all duration-200 group"
      >
        {label}
        {badge ? (
           <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-coral-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-coral-500/30 border-2 border-white">{badge}</span>
        ) : null}
      </button>
  );

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
            
            {/* LOGO */}
            <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={() => handleNav('dashboard')}>
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-500/25 transform group-hover:scale-105 transition-transform duration-300">
                    VV
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-slate-800 group-hover:text-brand-600 transition-colors">Va Vanagi</span>
            </div>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center gap-1">
                <NavItem label="Dashboard" page="dashboard" />
                <NavItem label="Community" page="community" />
                
                {user?.role !== 'guest' && <NavItem label="Translate" page="translate" />}
                
                <NavItem label="Browse" page="corpus" />
                <NavItem label="Dictionary" page="dictionary" />
                <NavItem label="Leaderboard" page="leaderboard" />
                
                {canReview && <NavItem label="Review" page="review" badge={pendingReviewCount > 0 ? pendingReviewCount : undefined} />}
                {canAdmin && <NavItem label="Admin" page="admin" />}
                
                <div className="pl-4 ml-2 border-l border-slate-200">
                    <Button onClick={onSwitchRole} variant="ghost" size="sm" className="!text-slate-400 hover:!text-coral-500 hover:!bg-transparent">
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* MOBILE MENU BUTTON */}
            <div className="flex items-center md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors">
                    {isMenuOpen ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
            </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {isMenuOpen && (
          <div className="md:hidden absolute w-full bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-2xl animate-slide-up">
              <div className="px-4 pt-2 pb-8 space-y-2">
                  <MobileNavLink onClick={() => handleNav('dashboard')}>Dashboard</MobileNavLink>
                  <MobileNavLink onClick={() => handleNav('community')}>Community</MobileNavLink>
                  {user?.role !== 'guest' && <MobileNavLink onClick={() => handleNav('translate')}>Translate</MobileNavLink>}
                  <MobileNavLink onClick={() => handleNav('corpus')}>Browse</MobileNavLink>
                  <MobileNavLink onClick={() => handleNav('dictionary')}>Dictionary</MobileNavLink>
                  <MobileNavLink onClick={() => handleNav('leaderboard')}>Leaderboard</MobileNavLink>
                  {canReview && <MobileNavLink onClick={() => handleNav('review')}>Review {pendingReviewCount > 0 && `(${pendingReviewCount})`}</MobileNavLink>}
                  {canAdmin && <MobileNavLink onClick={() => handleNav('admin')}>Admin</MobileNavLink>}
                  <div className="pt-6 mt-4 border-t border-slate-100">
                    <Button onClick={onSwitchRole} variant="secondary" fullWidth>Sign Out</Button>
                  </div>
              </div>
          </div>
      )}
    </nav>
  );
};

const MobileNavLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button onClick={onClick} className="block w-full text-left px-4 py-4 rounded-2xl text-base font-bold text-slate-600 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] transition-all">
        {children}
    </button>
);