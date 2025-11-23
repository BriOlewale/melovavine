import React, { useState, useEffect } from 'react';

// --- TOAST SYSTEM ---
type ToastType = 'success' | 'error' | 'info';

interface ToastEventDetail {
  message: string;
  type: ToastType;
}

export const toast = {
  success: (message: string) => dispatchToast(message, 'success'),
  error: (message: string) => dispatchToast(message, 'error'),
  info: (message: string) => dispatchToast(message, 'info'),
};

const dispatchToast = (message: string, type: ToastType) => {
  const event = new CustomEvent<ToastEventDetail>('app-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<{id: number, message: string, type: ToastType}[]>([]);

  useEffect(() => {
    const handler = (e: CustomEvent<ToastEventDetail>) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => removeToast(id), 4000);
    };
    window.addEventListener('app-toast', handler as any);
    return () => window.removeEventListener('app-toast', handler as any);
  }, []);

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={`
            pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl transform transition-all duration-300 animate-slide-up min-w-[300px]
            ${t.type === 'success' ? 'bg-emerald-500 text-white' : ''}
            ${t.type === 'error' ? 'bg-rose-500 text-white' : ''}
            ${t.type === 'info' ? 'bg-slate-800 text-white' : ''}
          `}
        >
          <span className="text-xl">
            {t.type === 'success' && '🎉'}
            {t.type === 'error' && '⚠️'}
            {t.type === 'info' && '💡'}
          </span>
          <span className="font-medium">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-auto opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
};

// --- SKELETON LOADER ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`}></div>
);

// --- EMPTY STATE ---
export const EmptyState: React.FC<{ icon: React.ReactNode, title: string, description: string, action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
    <div className="text-slate-300 mb-4 scale-150">{icon}</div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

// --- BUTTON ---
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass', 
  isLoading?: boolean, 
  size?: 'sm' | 'md' | 'lg', 
  fullWidth?: boolean 
}> = ({ children, variant = 'primary', isLoading, className = '', disabled, size = 'md', fullWidth = false, ...props }) => {
  
  const base = "inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97] touch-manipulation select-none";
  
  const sizes = {
    sm: "px-4 py-2 text-xs rounded-lg",
    md: "px-6 py-3 text-sm rounded-xl",
    lg: "px-8 py-4 text-base rounded-2xl"
  };

  const vars = {
    // Ocean Gradient
    primary: "text-white bg-gradient-to-br from-brand-400 to-brand-600 hover:from-brand-500 hover:to-brand-700 shadow-lg shadow-brand-500/30 focus:ring-brand-300 border border-transparent",
    // Clean White
    secondary: "text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
    // Softened Error
    danger: "text-white bg-gradient-to-br from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 shadow-lg shadow-rose-500/30 focus:ring-rose-300 border border-transparent",
    // Minimal
    ghost: "text-slate-600 hover:text-brand-600 hover:bg-brand-50 focus:ring-brand-100",
    // Glass
    glass: "text-white bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 focus:ring-white/50"
  };

  return (
    <button 
      className={`${base} ${sizes[size]} ${vars[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </div>
      ) : children}
    </button>
  );
};

// --- CARD ---
export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  noPadding?: boolean;
}> = ({ children, className = '', onClick, noPadding = false }) => (
  <div 
    onClick={onClick}
    className={`
      bg-white rounded-3xl border border-slate-100 
      shadow-[0_8px_30px_-6px_rgba(0,0,0,0.04)] 
      ${noPadding ? '' : 'p-6 sm:p-8'}
      ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300' : ''} 
      ${className}
    `}
  >
    {children}
  </div>
);

// --- BADGE ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'gray' }) => {
  const colors: any = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    blue: "bg-cyan-100 text-cyan-800 border-cyan-200",
    red: "bg-rose-100 text-rose-800 border-rose-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    purple: "bg-violet-100 text-violet-800 border-violet-200"
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

// --- INPUT ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">{label}</label>}
    <input 
      className="
        block w-full px-5 py-4 
        bg-slate-50 border-2 border-slate-100 
        rounded-2xl
        text-slate-900 placeholder-slate-400 font-medium
        focus:bg-white focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none
        transition-all duration-200
      " 
      {...props} 
    />
  </div>
);

// --- MODAL ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose}></div>
      
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full sm:max-w-lg rounded-3xl border border-slate-100 animate-slide-up">
           <div className="p-8">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 font-display">{title}</h3>
                <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             {children}
           </div>
        </div>
      </div>
    </div>
  );
};