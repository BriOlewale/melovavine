import React from 'react';

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