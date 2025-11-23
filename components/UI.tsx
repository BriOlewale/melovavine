import React from 'react';

// --- BUTTON COMPONENT ---
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass', 
  isLoading?: boolean, 
  size?: 'sm' | 'md' | 'lg', 
  fullWidth?: boolean 
}> = ({ children, variant = 'primary', isLoading, className = '', disabled, size = 'md', fullWidth = false, ...props }) => {
  
  const base = "inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.98] touch-manipulation";
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-2.5 text-sm sm:text-base rounded-xl", // Pill-ish rounded corners
    lg: "px-8 py-4 text-lg rounded-2xl"
  };

  const vars = {
    // Hula Ocean Gradient
    primary: "text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-lg shadow-cyan-500/30 border border-transparent",
    // Clean White
    secondary: "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    // Coral/Red Softened
    danger: "text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 border border-transparent",
    // Minimal
    ghost: "text-slate-600 hover:text-teal-600 hover:bg-teal-50/50",
    // Glassmorphism
    glass: "text-white bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30"
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
          <span>Loading</span>
        </div>
      ) : children}
    </button>
  );
};

// --- CARD COMPONENT ---
export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  noPadding?: boolean;
}> = ({ children, className = '', onClick, noPadding = false }) => (
  <div 
    onClick={onClick}
    className={`
      bg-white rounded-2xl border border-slate-100/80 
      shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] 
      ${noPadding ? '' : 'p-5 sm:p-8'}
      ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300' : ''} 
      ${className}
    `}
  >
    {children}
  </div>
);

// --- BADGE COMPONENT ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'gray' }) => {
  const colors: any = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-cyan-50 text-cyan-700 border-cyan-100",
    red: "bg-rose-50 text-rose-700 border-rose-100",
    yellow: "bg-amber-50 text-amber-700 border-amber-100",
    gray: "bg-slate-100 text-slate-600 border-slate-200",
    purple: "bg-violet-50 text-violet-700 border-violet-100"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

// --- INPUT COMPONENT ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">{label}</label>}
    <input 
      className="
        block w-full px-4 py-3 
        bg-slate-50 border border-slate-200 
        rounded-xl 
        text-slate-900 placeholder-slate-400
        focus:bg-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 
        transition-all duration-200
      " 
      {...props} 
    />
  </div>
);

// --- MODAL COMPONENT ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-slate-100">
           {/* Mobile Pull Bar */}
           <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden"></div>
           
           <div className="p-6 sm:p-8">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
                <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             {children}
           </div>
        </div>
      </div>
    </div>
  );
};