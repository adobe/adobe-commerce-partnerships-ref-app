import { useCallback, useState } from 'react';
import type { ToastState } from '../types/toast';
import { INITIAL_TOAST_STATE } from '../types/toast';

export interface UseToastStateResponse {
  toastState: ToastState;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
  clearError: () => void;
  clearWarning: () => void;
  clearSuccess: () => void;
}

export function useToastState(): UseToastStateResponse {
  const [toastState, setToastState] = useState<ToastState>(INITIAL_TOAST_STATE);

  const showError = useCallback((message: string) => {
    setToastState(prev => ({
      ...prev,
      error: { show: true, message },
      warning: { ...prev.warning, show: false },
      success: { ...prev.success, show: false },
    }));
  }, []);

  const showWarning = useCallback((message: string) => {
    setToastState(prev => ({
      ...prev,
      warning: { show: true, message },
      error: { ...prev.error, show: false },
      success: { ...prev.success, show: false },
    }));
  }, []);

  const showSuccess = useCallback((message: string) => {
    setToastState(prev => ({
      ...prev,
      success: { show: true, message },
      error: { ...prev.error, show: false },
      warning: { ...prev.warning, show: false },
    }));
  }, []);

  const clearError = useCallback(() => {
    setToastState(prev => ({ ...prev, error: { ...prev.error, show: false } }));
  }, []);

  const clearWarning = useCallback(() => {
    setToastState(prev => ({ ...prev, warning: { ...prev.warning, show: false } }));
  }, []);

  const clearSuccess = useCallback(() => {
    setToastState(prev => ({ ...prev, success: { ...prev.success, show: false } }));
  }, []);

  return {
    toastState,
    showError,
    showWarning,
    showSuccess,
    clearError,
    clearWarning,
    clearSuccess,
  };
}
