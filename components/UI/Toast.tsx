import React, { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastEventDetail {
  message: string;
  type: ToastType;
}

const dispatchToast = (message: string, type: ToastType) => {
  const event = new CustomEvent<ToastEventDetail>('app-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

export const toast = {
  success: (message: string) => dispatchToast(message, 'success'),
  error: (message: string) => dispatchToast(message, 'error'),
  info: (message: string) => dispatchToast(message, 'info'),
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