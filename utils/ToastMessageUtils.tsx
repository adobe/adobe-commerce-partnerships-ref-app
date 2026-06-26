import React, { useEffect } from 'react';
import AlertTriangle from '@react-spectrum/s2/icons/AlertTriangle';
import CheckmarkCircle from '@react-spectrum/s2/icons/CheckmarkCircle';
import Close from '@react-spectrum/s2/icons/Close';
import styles from '../styles/ToastMessageUtils.module.css';

interface ErrorToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  autoHideDelay?: number; // in milliseconds, default 10000
}

interface SuccessToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  autoHideDelay?: number; // in milliseconds, default 15000
}

interface WarningToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  autoHideDelay?: number; // in milliseconds, default 12000
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  show,
  message,
  onClose,
  autoHideDelay = 10000,
}) => {
  useEffect(() => {
    if (show && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDelay, onClose]);

  if (!show) return null;

  return (
    <div className={styles.errorToastOverlay}>
      <div className={styles.errorToast} role="alert" aria-live="assertive">
        <div className={styles.errorToastIcon}>
          <AlertTriangle />
        </div>
        <div className={styles.errorToastContent}>
          <div className={styles.errorToastMessage}>{message}</div>
        </div>
        <button
          className={styles.errorToastClose}
          onClick={onClose}
          aria-label="Close error message"
        >
          <Close />
        </button>
      </div>
    </div>
  );
};

const SuccessToast: React.FC<SuccessToastProps> = ({
  show,
  message,
  onClose,
  autoHideDelay = 15000,
}) => {
  useEffect(() => {
    if (show && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDelay, onClose]);

  if (!show) return null;

  return (
    <div className={styles.successToastOverlay}>
      <div className={styles.successToast} role="status" aria-live="polite">
        <div className={styles.successToastIcon}>
          <CheckmarkCircle />
        </div>
        <div className={styles.successToastContent}>
          <div className={styles.successToastMessage}>{message}</div>
        </div>
        <button
          className={styles.successToastClose}
          onClick={onClose}
          aria-label="Close success message"
        >
          <Close />
        </button>
      </div>
    </div>
  );
};

const WarningToast: React.FC<WarningToastProps> = ({
  show,
  message,
  onClose,
  autoHideDelay = 12000,
}) => {
  useEffect(() => {
    if (show && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDelay, onClose]);

  if (!show) return null;

  return (
    <div className={styles.warningToastOverlay}>
      <div className={styles.warningToast} role="alert" aria-live="polite">
        <div className={styles.warningToastIcon}>
          <AlertTriangle />
        </div>
        <div className={styles.warningToastContent}>
          <div className={styles.warningToastMessage}>{message}</div>
        </div>
        <button
          className={styles.warningToastClose}
          onClick={onClose}
          aria-label="Close warning message"
        >
          <Close />
        </button>
      </div>
    </div>
  );
};

export { ErrorToast, SuccessToast, WarningToast };
export default ErrorToast;
