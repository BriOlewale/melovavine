import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient', isLoading?: boolean, size?: 'sm' | 'md' | 'lg' }> = ({ children, variant = 'primary', isLoading, className = '', disabled, size = 'md', ...props }) => {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3.5 text-base rounded-xl"
  };

  const vars = {
    primary: "border border-transparent text-white bg-brand-600 hover:bg-brand-700 focus:ring-brand-500 shadow-sm hover:shadow-md",
    gradient: "border border-transparent text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-md hover:shadow-lg",
    secondary: "border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 focus:ring-brand-500 shadow-sm",
    danger: "border border-transparent text-white bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-sm",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  };

  return (
    <button 
      className={`${base} ${sizes[size]} ${vars[variant]} ${className}`} 
      disabled={isLoading || disabled} 
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </div>
      ) : children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 ${onClick ? 'cursor-pointer hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'gray' }) => {
  const colors: any = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    red: "bg-red-100 text-red-800 border-red-200",
    yellow: "bg-amber-100 text-amber-800 border-amber-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">{label}</label>
    <input className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm" {...props} />
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/20 transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all scale-100 border border-gray-100">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         </div>
         {children}
      </div>
    </div>
  );
};