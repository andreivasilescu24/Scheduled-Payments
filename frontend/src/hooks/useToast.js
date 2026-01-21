import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = useCallback((message, type = '') => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  return { toast, showToast, hideToast };
}
