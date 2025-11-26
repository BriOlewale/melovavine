import React from 'react';

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