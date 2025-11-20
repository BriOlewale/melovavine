import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost', isLoading?: boolean }> = ({ children, variant = 'primary', isLoading, className = '', disabled, ...props }) => {
  const base = "inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  const vars = {
    primary: "border-transparent text-white bg-brand-600 hover:bg-brand-700",
    secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-700",
    ghost: "border-transparent text-gray-600 hover:bg-gray-100"
  };
  return <button className={`${base} ${vars[variant]} ${className} ${isLoading || disabled ? 'opacity-50' : ''}`} disabled={isLoading || disabled} {...props}>{isLoading ? '...' : children}</button>;
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white shadow rounded-lg border border-gray-100 p-4 ${className}`}>{children}</div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'gray' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>{children}</span>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm" {...props} />
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
         <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium">{title}</h3><button onClick={onClose}>&times;</button></div>
         {children}
      </div>
    </div>
  );
};