import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/Toast/Toast';

interface UseToastReturn {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = ToastType.SUCCESS) => {
    const id = crypto.randomUUID();
    const toast: ToastMessage = { id, message, type };
    
    // Replace any existing toast with the new one
    setToasts([toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
  };
}