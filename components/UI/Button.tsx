import React from 'react';

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
    primary: "text-white bg-gradient-to-br from-brand-400 to-brand-600 hover:from-brand-500 hover:to-brand-700 shadow-lg shadow-brand-500/30 focus:ring-brand-300 border border-transparent",
    secondary: "text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
    danger: "text-white bg-gradient-to-br from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 shadow-lg shadow-rose-500/30 focus:ring-rose-300 border border-transparent",
    ghost: "text-slate-600 hover:text-brand-600 hover:bg-brand-50 focus:ring-brand-100",
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