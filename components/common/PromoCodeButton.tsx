import React, { useState } from 'react';
import { Badge } from '@react-spectrum/s2';
import Delete from '@react-spectrum/s2/icons/Delete';
import styles from '../../styles/PromoCode.module.css';
import { PromoCodeDialog } from './PromoCodeDialog';

export const PromoBadgeVariant = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
} as const;

export type PromoBadgeVariantType = (typeof PromoBadgeVariant)[keyof typeof PromoBadgeVariant];

export interface PromoCodeButtonProps {
  offerId: string;
  productName: string;
  appliedCode?: string;
  onApply: (offerId: string, code: string) => void;
  onRemove?: (offerId: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  badgeVariant?: PromoBadgeVariantType;
}

export const PromoCodeButton: React.FC<PromoCodeButtonProps> = ({
  offerId,
  productName,
  appliedCode,
  onApply,
  onRemove,
  disabled = false,
  isLoading = false,
  badgeVariant = PromoBadgeVariant.POSITIVE,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleButtonClick = () => {
    if (!disabled) {
      setIsDialogOpen(true);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  const handleApply = (id: string, code: string) => {
    onApply(id, code);
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className={styles.promoCodeButtonRow}>
        {appliedCode ? (
          <>
            <span className={styles.appliedCode}>
              <span className={styles.appliedCodeLabel}>Discount code:</span>
              <span className={styles.badgeWrapper}>
                <Badge fillStyle={'bold'} variant={badgeVariant}>
                  {appliedCode}
                </Badge>
              </span>
            </span>
            {onRemove && (
              <button
                type="button"
                className={styles.deleteIconButton}
                onClick={e => {
                  e.stopPropagation();
                  onRemove(offerId);
                }}
                disabled={disabled}
                aria-label="Remove discount code"
              >
                <Delete />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={styles.promoCodeButton}
            onClick={handleButtonClick}
            disabled={disabled}
          >
            Apply discount code
          </button>
        )}
      </div>
      <PromoCodeDialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        offerId={offerId}
        productName={productName}
        currentDiscountCode={appliedCode}
        onApply={handleApply}
        isLoading={isLoading}
      />
    </>
  );
};
