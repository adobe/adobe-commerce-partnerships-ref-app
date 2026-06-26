/**
 * Toast notification state used across dialogs and pages.
 * Consolidates show flags and messages for error, warning, and success toasts.
 */
export interface ToastState {
  error: { show: boolean; message: string };
  warning: { show: boolean; message: string };
  success: { show: boolean; message: string };
}

export const INITIAL_TOAST_STATE: ToastState = {
  error: { show: false, message: '' },
  warning: { show: false, message: '' },
  success: { show: false, message: '' },
};
