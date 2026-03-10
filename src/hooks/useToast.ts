import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/Toast/Toast';

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${++toastIdCounter}`;
    // Replace any existing toast so only one is ever visible at a time
    setToasts([{ id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return { toasts, showToast, dismissToast, clearToasts };
};