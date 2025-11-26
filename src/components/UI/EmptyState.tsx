import React from 'react';

export const EmptyState: React.FC<{ icon: React.ReactNode, title: string, description: string, action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
    <div className="text-slate-300 mb-4 scale-150">{icon}</div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);