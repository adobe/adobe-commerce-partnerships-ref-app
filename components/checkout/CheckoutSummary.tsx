import React, { useMemo } from 'react';
import CheckoutProductCard from './CheckoutProductCard';
import { Button, Text, Heading, ProgressCircle } from '@react-spectrum/s2';
import {
  formatPrice,
  getDiscountLevelsFromOfferIdsAndQuantities,
  getDiscountLevelsMapWithClearedLevels,
} from '../../utils/commonUtils';
import styles from './Checkout.module.css';
import { useCart } from '../../contexts/CartContext';
import type { CartItem } from '../../contexts/CartContext';

interface CheckoutSummaryProps {
  finalCheckoutProducts: CartItem[];
  total: number;
  currency: string;
  onQuantityChange?: (id: string, newQuantity: number) => void;
  needsRecalculation?: boolean;
  onRecalculate?: () => Promise<void>;
  isRecalculating: boolean;
  onPlaceOrder: () => Promise<void>;
  isPlacingOrder?: boolean;
  onItemRemoved?: () => void;
  onPromoCodeApply?: (offerId: string, code: string) => void;
  onPromoCodeRemove?: (offerId: string) => void;
}
const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  finalCheckoutProducts,
  total,
  currency,
  onQuantityChange,
  needsRecalculation,
  onRecalculate,
  isRecalculating,
  onPlaceOrder,
  isPlacingOrder = false,
  onItemRemoved,
  onPromoCodeApply,
  onPromoCodeRemove,
}) => {
  const { removeFromCart } = useCart();

  const discountLevelsMap = useMemo(() => {
    const items = finalCheckoutProducts.map(product => ({
      offerId: product.offerId,
      quantity: product.quantity,
    }));

    if (needsRecalculation) {
      return getDiscountLevelsMapWithClearedLevels(items);
    }

    return getDiscountLevelsFromOfferIdsAndQuantities(items);
  }, [finalCheckoutProducts, needsRecalculation]);

  const handleRemoveItem = (id: string) => {
    const product = finalCheckoutProducts.find(item => item.id === id);
    if (product && product.offerId) {
      removeFromCart(product.offerId);
      if (onItemRemoved) {
        onItemRemoved();
      }
    }
  };

  return (
    <aside className={styles.summaryCard}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Heading level={2}>Order Summary</Heading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(discountLevelsMap.LICENSE || discountLevelsMap.TRANSACTION) && (
            <div className={styles.partnerPricingText}>
              <Text>
                {discountLevelsMap.LICENSE && (
                  <span>
                    {discountLevelsMap.LICENSE.quantity} Licenses
                    {discountLevelsMap.LICENSE.discountLevel &&
                      ` (${discountLevelsMap.LICENSE.discountLevel})`}
                  </span>
                )}
                {discountLevelsMap.LICENSE && discountLevelsMap.TRANSACTION && <br />}
                {discountLevelsMap.TRANSACTION && (
                  <span>
                    {discountLevelsMap.TRANSACTION.quantity} Transactions
                    {discountLevelsMap.TRANSACTION.discountLevel &&
                      ` (${discountLevelsMap.TRANSACTION.discountLevel})`}
                  </span>
                )}
              </Text>
            </div>
          )}
          <div className={styles.partnerPricingText}>
            <Text>Reflecting partner pricing.</Text>
          </div>
        </div>
        <div className={styles.summaryProducts}>
          {finalCheckoutProducts.map(product => (
            <CheckoutProductCard
              key={product.id}
              product={product}
              onQuantityChange={onQuantityChange}
              onRemoveItem={handleRemoveItem}
              onPromoCodeApply={onPromoCodeApply}
              onPromoCodeRemove={onPromoCodeRemove}
              isRecalculating={isRecalculating}
            />
          ))}
        </div>
        <div className={styles.recalculateButtonWrapper}>
          <Button
            variant="primary"
            isDisabled={!needsRecalculation || isRecalculating}
            onPress={() => {
              if (onRecalculate) onRecalculate();
            }}
            UNSAFE_className={`${styles.updatePriceBtn} ${needsRecalculation && !isRecalculating ? styles.enabled : styles.disabled}`}
          >
            {isRecalculating && <ProgressCircle size="S" isIndeterminate />}
            Update price
          </Button>
        </div>
        <div className={styles.summaryTotalsWithMargin}>
          <div className={styles.summaryTotals}>
            <div className={styles.summaryTotalRow}>
              <Text>Estimated Total</Text>
              <div className={styles.priceContainer}>
                <Text>{needsRecalculation ? '' : formatPrice(total, currency)}</Text>
                {!needsRecalculation && <span className={styles.taxText}>+local taxes apply</span>}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.termsText}>
          By clicking "Place order", you will agree to pay Adobe for these licenses pursuant to
          Adobe's APC Agreement with you.
        </div>
        <Button
          variant="primary"
          isDisabled={needsRecalculation || isPlacingOrder}
          onPress={onPlaceOrder}
          UNSAFE_className={`${styles.placeOrderBtn} ${!needsRecalculation && !isPlacingOrder ? styles.enabled : styles.disabled}`}
        >
          {isPlacingOrder && <ProgressCircle size="S" isIndeterminate />}
          Place Order
        </Button>
      </div>
    </aside>
  );
};
export default CheckoutSummary;
