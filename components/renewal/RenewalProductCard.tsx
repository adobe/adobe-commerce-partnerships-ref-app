import React from 'react';
import { Badge, Heading, NumberField, Switch, Text } from '@react-spectrum/s2';
import { formatPrice } from '../../utils/commonUtils';
import type { RenewalProduct } from '../../types/AddAndEditCustomerRenewalOrder';
import styles from '../../styles/renewal/Renewal.module.css';
import { PromoCodeButton, PromoBadgeVariantType } from '../common/PromoCodeButton';

interface RenewalProductCardProps {
  product: RenewalProduct;
  productName: string;
  onAutoRenewalToggle: (offerId: string) => void;
  onQuantityChange: (offerId: string, value: number | 0) => void;
  isSaving: boolean;
  onPromoCodeApply: (offerId: string, code: string) => void;
  onPromoCodeRemove: (offerId: string) => void;
  badgeVariant?: PromoBadgeVariantType;
}

export const RenewalProductCard: React.FC<RenewalProductCardProps> = ({
  product,
  productName,
  onAutoRenewalToggle,
  onQuantityChange,
  isSaving,
  onPromoCodeApply,
  onPromoCodeRemove,
  badgeVariant,
}) => {
  const pricePerLicense = product.pricePerUnit || 0;
  const productCurrency = product.currency || '';

  return (
    <div key={product.id} className={styles.productCard}>
      {/* Product Header */}
      <div className={styles.productHeaderWithMargin}>
        {product.type === 'NEW' ? (
          <>
            <Heading level={4}>{productName}</Heading>
            <Badge fillStyle={'outline'} variant="informative">
              New subscription
            </Badge>
          </>
        ) : (
          <>
            <Heading level={4}>{productName}</Heading>
            <div className={styles.switchContainer}>
              <Switch
                isSelected={product.autoRenewalEnabled}
                onChange={() => onAutoRenewalToggle(product.offerId)}
                isDisabled={isSaving}
              >
                <Text>Auto-renewal {product.autoRenewalEnabled ? 'on' : 'off'}</Text>
              </Switch>
            </div>
          </>
        )}
      </div>

      {/* Show quantity and pricing only if enabled */}
      {product.autoRenewalEnabled && (
        <>
          {/* Licenses Section */}
          <div className={styles.licensesRow}>
            <NumberField
              size={'S'}
              label={'Licenses'}
              id={`renewal-quantity-${product.id}`}
              value={product.quantity}
              onChange={value => onQuantityChange(product.offerId, value)}
              minValue={1}
              isDisabled={isSaving}
            />
          </div>

          {/* Price Information */}
          <div className={styles.priceInfo}>
            <div className={styles.priceRow}>
              <span className={styles.pricePerLicense}>
                {pricePerLicense > 0
                  ? `${formatPrice(pricePerLicense, productCurrency)} per license`
                  : '-- per license'}
              </span>
              <Text>
                {' '}
                <strong>
                  {product.lineItemTotal && product.lineItemTotal > 0
                    ? formatPrice(product.lineItemTotal, productCurrency)
                    : '--'}
                </strong>
              </Text>
            </div>
            <span className={styles.offerId}>{product.offerId}</span>
          </div>
          <div className={styles.promoCodeButtonWrapper}>
            <PromoCodeButton
              offerId={product.offerId}
              productName={productName || product.offerId}
              appliedCode={product.discountCode}
              onApply={onPromoCodeApply}
              onRemove={onPromoCodeRemove}
              disabled={isSaving}
              badgeVariant={badgeVariant}
            />
          </div>
        </>
      )}
    </div>
  );
};
