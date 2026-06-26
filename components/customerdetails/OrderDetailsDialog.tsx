import React, { useEffect } from 'react';
import { Badge, Button, Card, Heading } from '@react-spectrum/s2';
import promoStyles from '../../styles/PromoCode.module.css';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import { OrdersHistoryOrder, LineItem } from '../../models/Order';
import styles from '../../styles/customerdetails/OrderDetailsDialog.module.css';

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrdersHistoryOrder | null;
}

/**
 * Dialog component that displays detailed information about a single order
 * Receives order data from the parent component (no API call needed)
 * @component
 */
const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ isOpen, onClose, orderData }) => {
  // Handle keyboard events and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const { region } = usePartnerDetails();

  // Get product names for all line items
  const subscriptionContexts =
    orderData?.lineItems
      ?.filter((item: LineItem) => item.offerId && orderData.currencyCode)
      .map((item: LineItem) => ({
        offerId: item.offerId!,
        currencyCode: orderData.currencyCode!,
        region,
      })) || [];

  const { getProductName } = useProductNamesFromPricelist(subscriptionContexts);

  if (!isOpen) return null;

  // Calculate total licenses
  const totalLicenses =
    orderData?.lineItems?.reduce((sum: number, item: LineItem) => sum + item.quantity, 0) || 0;

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-dialog-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <Heading level={2} id="order-dialog-title">
            {`Order details- ${orderData?.orderId || ''}`}
          </Heading>
          <Button variant="secondary" fillStyle={'outline'} onPress={onClose}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {orderData ? (
            <>
              {/* Date */}
              <div className={styles.date}>{formatDate(orderData.creationDate)}</div>

              {/* License count */}
              <div className={styles.licenseSummary}>
                <span className={styles.licenseCount}>{totalLicenses} Licenses</span>
              </div>

              {/* Product List */}
              <div className={styles.productList}>
                {orderData.lineItems.map((item: LineItem, index: number) => {
                  const productName = getProductName(item.offerId) || item.offerId;

                  return (
                    <Card
                      key={item.offerId || `item-${index}`}
                      UNSAFE_className={styles.productCard}
                    >
                      <Heading level={3}>{productName}</Heading>
                      <div className={styles.productDetails}>
                        <div className={styles.productInfo}>
                          <span className={styles.quantity}>{item.quantity} licenses</span>
                        </div>
                      </div>
                      <div className={styles.offerId}>{item.offerId}</div>
                      {item.flexDiscounts && item.flexDiscounts.length > 0 && (
                        <div>
                          {item.flexDiscounts.map(discount => (
                            <div key={discount.id} className={promoStyles.promoCodeButtonRow}>
                              <span className={promoStyles.appliedCode}>
                                <span className={promoStyles.appliedCodeLabel}>Discount code:</span>
                                <span className={promoStyles.badgeWrapper}>
                                  <Badge
                                    fillStyle="bold"
                                    variant={
                                      discount.result === 'SUCCESS' ? 'positive' : 'negative'
                                    }
                                  >
                                    {discount.code}
                                  </Badge>
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={styles.errorContainer}>
              <p>No order data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsDialog;
