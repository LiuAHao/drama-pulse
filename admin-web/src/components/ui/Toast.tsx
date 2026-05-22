import { useState, useCallback, useEffect } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;
let addToastFn: ((msg: string, type: 'success' | 'error') => void) | null = null;

export function toast(message: string, type: 'success' | 'error' = 'success') {
  addToastFn?.(message, type);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-md text-sm text-white shadow-md ${
            t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
