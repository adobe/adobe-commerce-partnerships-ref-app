import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, TextField, Text } from '@react-spectrum/s2';
import Close from '@react-spectrum/s2/icons/Close';
import styles from '../../styles/PromoCode.module.css';

export interface PromoCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  productName: string;
  currentDiscountCode?: string;
  onApply: (offerId: string, code: string) => void;
  isLoading?: boolean;
  errorMessage?: string;
}

export const PromoCodeDialog: React.FC<PromoCodeDialogProps> = ({
  isOpen,
  onClose,
  offerId,
  productName,
  currentDiscountCode,
  onApply,
  isLoading = false,
  errorMessage,
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPromoInput(currentDiscountCode || '');
      setError(null);
    }
  }, [isOpen, currentDiscountCode]);

  const handleApply = () => {
    const trimmedCode = promoInput.trim();
    if (!trimmedCode) {
      setError('Please enter a discount code');
      return;
    }
    setError(null);
    onApply(offerId, trimmedCode);
  };

  const handleClose = () => {
    setPromoInput('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const displayError = errorMessage || error;

  const dialog = (
    <div className={styles.dialogOverlay} onClick={handleClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-code-dialog-title"
      >
        <div className={styles.dialogHeader}>
          <h2 id="promo-code-dialog-title" className={styles.dialogTitle}>
            Enter discount code
          </h2>
          <Button
            variant="secondary"
            fillStyle="outline"
            size="S"
            onPress={handleClose}
            aria-label="Close"
          >
            <Close />
          </Button>
        </div>

        <div className={styles.dialogContent}>
          <div className={styles.productContext}>
            <span className={styles.productName}>{productName}</span>
            <span className={styles.offerId}>{offerId}</span>
          </div>

          <div className={styles.codeInput}>
            <TextField
              label="Discount code"
              value={promoInput}
              onChange={setPromoInput}
              isDisabled={isLoading}
              aria-label="Coupon code"
            />
          </div>

          {displayError && (
            <div className={styles.errorText}>
              <Text>{displayError}</Text>
            </div>
          )}
        </div>

        <div className={styles.dialogActions}>
          <Button variant="accent" onPress={handleApply} isDisabled={isLoading}>
            {isLoading ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(dialog, document.body);
};
