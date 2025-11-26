import React from 'react';

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