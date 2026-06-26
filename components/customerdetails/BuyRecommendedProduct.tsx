import React, { useState } from 'react';
import { Button } from '@react-spectrum/s2';
import Close from '@react-spectrum/s2/icons/Close';
import { formatAnniversaryDateForModal } from '../../utils/customerDetailsUtils';
import { getIconWithFallback } from '../../utils/iconUtils';
import styles from '../../styles/customerdetails/BuyRecommendedProduct.module.css';

interface BuyRecommendedProductProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productIcon?: string;
  price: string;
  customerName: string;
  anniversaryDate?: string;
  onBuyNow: () => void;
  onAddToRenewal: () => void;
}

const BuyRecommendedProduct: React.FC<BuyRecommendedProductProps> = ({
  open,
  onClose,
  productName,
  productIcon,
  customerName,
  anniversaryDate,
  onBuyNow,
  onAddToRenewal,
}) => {
  const [selectedOption, setSelectedOption] = useState<'buy' | 'renewal'>('buy');

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      {/* Modal Dialog */}
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <img
              src={productIcon || getIconWithFallback(null, '48x48')}
              alt={productName}
              className={styles.productIcon}
            />
            <h2 className={styles.modalTitle}>Add {productName}</h2>
          </div>

          {/* Customer info */}
          <div className={styles.customerInfo}>
            <span className={styles.customerName}>{customerName}</span>
          </div>

          {/* Close button */}
          <button onClick={onClose} className={styles.closeButton}>
            <Close />
          </button>
        </div>

        {/* Content Options */}
        <div className={styles.optionsContainer}>
          {/* Buy Now Option */}
          <div
            onClick={() => setSelectedOption('buy')}
            className={selectedOption === 'buy' ? styles.optionCardSelected : styles.optionCard}
          >
            <h3 className={styles.optionTitle}>Buy now</h3>
            <p className={styles.optionDescription}>
              Make licenses immediately available to the customer
            </p>
          </div>

          {/* Add to Renewal Option */}
          <div
            onClick={() => setSelectedOption('renewal')}
            className={selectedOption === 'renewal' ? styles.optionCardSelected : styles.optionCard}
          >
            <h3 className={styles.optionTitle}>Add to renewal</h3>
            <p className={styles.optionDescription}>
              Include additional licenses in {formatAnniversaryDateForModal(anniversaryDate)}{' '}
              renewal
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Button variant="secondary" fillStyle={'outline'} onPress={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onPress={() => {
              if (selectedOption === 'buy') {
                onBuyNow();
              } else {
                onAddToRenewal();
              }
              onClose();
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyRecommendedProduct;
