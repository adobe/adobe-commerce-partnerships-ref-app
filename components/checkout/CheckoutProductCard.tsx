import React from 'react';
import { NumberField, Text, Button, Heading } from '@react-spectrum/s2';
import Close from '@react-spectrum/s2/icons/Close';
import { formatPrice } from '../../utils/commonUtils';
import { PromoCodeButton } from '../common/PromoCodeButton';
import { getIconWithFallback } from '../../utils/iconUtils';
import styles from './Checkout.module.css';
import type { CartItem } from '../../contexts/CartContext';

interface CheckoutProductCardProps {
  product: CartItem;
  onQuantityChange?: (id: string, newQuantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onPromoCodeApply?: (offerId: string, code: string) => void;
  onPromoCodeRemove?: (offerId: string) => void;
  isRecalculating?: boolean;
  maxQuantity?: number;
  isQuantityReadOnly?: boolean;
}

const CheckoutProductCard: React.FC<CheckoutProductCardProps> = ({
  product,
  onQuantityChange,
  onRemoveItem,
  onPromoCodeApply,
  onPromoCodeRemove,
  isRecalculating = false,
  maxQuantity,
  isQuantityReadOnly = false,
}) => {
  const handleQuantityChange = (value: number) => {
    if (!onQuantityChange) return;
    const newQuantity = Math.max(1, value);
    onQuantityChange(product.id, newQuantity);
  };

  return (
    <div className={styles.productCard}>
      <div className={styles.productCardIconCol}>
        <img
          src={getIconWithFallback(product.productFamily || product.productName || '', '48x48')}
          alt={product.productName}
          className={styles.productIcon}
        />
      </div>
      <div className={styles.productCardInfoCol}>
        <Heading level={3}>{product.productName}</Heading>
        {product.offerId && <Text>Offer ID: {product.offerId}</Text>}
        <div className={styles.productCardBottomRow}>
          <div className={styles.checkoutNumberFieldWrapper}>
            <NumberField
              label={'Licenses'}
              id={`checkout-quantity-${product.offerId}`}
              value={product.quantity}
              onChange={handleQuantityChange}
              minValue={1}
              maxValue={maxQuantity}
              isReadOnly={isQuantityReadOnly}
              hideStepper={false}
              size="M"
            />
          </div>
          <div className={styles.priceAndPromoCol}>
            {typeof product.pricePerUnit === 'number' && !isNaN(product.pricePerUnit) ? (
              <Text>
                {formatPrice(product.pricePerUnit, product.currency || '')} <Text>per license</Text>
              </Text>
            ) : null}
            {onPromoCodeApply && (
              <div className={styles.promoCodeButtonWrapper}>
                <PromoCodeButton
                  offerId={product.offerId}
                  productName={product.productName}
                  appliedCode={product.discountCode}
                  onApply={onPromoCodeApply}
                  onRemove={onPromoCodeRemove}
                  isLoading={isRecalculating}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {onRemoveItem && (
        <Button
          variant="secondary"
          size="S"
          onPress={() => onRemoveItem(product.id)}
          fillStyle={'outline'}
        >
          <Close />
        </Button>
      )}
    </div>
  );
};

export default CheckoutProductCard;
