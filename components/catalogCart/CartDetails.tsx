import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Heading, NumberField } from '@react-spectrum/s2';
import Close from '@react-spectrum/s2/icons/Close';
import {
  formatPrice,
  getDiscountLevelsFromOfferIdsAndQuantities,
  getDiscountLevelsMapWithClearedLevels,
} from '../../utils/commonUtils';
import type { DiscountLevelsMap } from '../../types/discountLevel';
import {
  updateCartItemsWithSkuMapping,
  fetchOrderPreview,
  cartItemsToLineItems,
} from '../../utils/cartUtils';
import { CartItem } from '../../contexts/CartContext';
import { ErrorToast } from '../../utils/ToastMessageUtils';
import { UpdatePriceButton } from '../common/UpdatePriceButton';
import styles from './CartDetails.module.css';
import { createClientLogger } from '../../utils/logger';

const logger = createClientLogger('CartDetails');

interface CartDetailsProps {
  cartItems: CartItem[];
  customerId?: string;
  currency?: string;
  onQuantityChange?: (offerId: string, newQuantity: number) => void;
  onUpdatePrice?: () => void;
  onContinueToCustomerDetails?: () => void;
  onKeepShopping?: () => void;
  onRemoveItem?: (offerId: string) => void;
  onCartItemsUpdate?: (updatedItems: CartItem[]) => void;
  partnerPriceText?: string;
  continueButtonText?: string;
}

const CartDetails: React.FC<CartDetailsProps> = ({
  cartItems,
  customerId,
  currency,
  onQuantityChange,
  onUpdatePrice,
  onContinueToCustomerDetails,
  onKeepShopping,
  onRemoveItem,
  onCartItemsUpdate,
  partnerPriceText = 'Reflecting Partner prices for a new customer.',
  continueButtonText = 'Add customer details',
}) => {
  // State for managing preview process
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [hasInitialPreview, setHasInitialPreview] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);
  const [discountLevelsMap, setDiscountLevelsMap] = useState<DiscountLevelsMap>({});

  // Function to call order preview API and update prices
  const updatePricesFromPreview = useCallback(async () => {
    if (!customerId || cartItems.length === 0) {
      return;
    }

    try {
      setIsLoadingPrices(true);

      const lineItems = cartItemsToLineItems(cartItems);

      const previewData = await fetchOrderPreview(customerId || '', lineItems, currency || 'N/A');

      const updatedCartItems = updateCartItemsWithSkuMapping(cartItems, previewData.lineItems);

      if (previewData.pricingSummary && previewData.pricingSummary.length > 0) {
        const total = previewData.pricingSummary[0].totalLineItemPartnerPrice;
        setEstimatedTotal(total);
      }

      const lineItemsWithOfferIdAndQunatity = (previewData.lineItems || []).map(item => ({
        offerId: item.offerId,
        quantity: item.quantity,
      }));
      const discountLevels = getDiscountLevelsFromOfferIdsAndQuantities(
        lineItemsWithOfferIdAndQunatity
      );
      setDiscountLevelsMap(discountLevels);

      if (onCartItemsUpdate) {
        onCartItemsUpdate(updatedCartItems);
      }
    } catch (error) {
      logger.error({ err: error }, 'Error updating prices from preview');
      let errorMsg = 'Failed to update prices. Please try again.';

      if (error instanceof Error) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
      setShowErrorToast(true);
    } finally {
      setIsLoadingPrices(false);
    }
  }, [cartItems, customerId, currency, onCartItemsUpdate]);

  // Effect to call preview API when cart opens (only once)
  useEffect(() => {
    if (cartItems.length > 0 && customerId && !hasInitialPreview && !isLoadingPrices) {
      updatePricesFromPreview();
      setHasInitialPreview(true);
    }
  }, [cartItems.length, customerId, hasInitialPreview, isLoadingPrices, updatePricesFromPreview]);

  // Update the onUpdatePrice handler to use the preview function
  const handleUpdatePrice = () => {
    if (onUpdatePrice) {
      onUpdatePrice();
    } else {
      updatePricesFromPreview();
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className={styles.emptyCartContainer}>
        <h3 className={styles.emptyCartTitle}>Your cart is empty</h3>
        <Button variant="accent" onPress={onKeepShopping}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  const handleQuantityChange = (offerId: string, newQuantity: number) => {
    if (newQuantity >= 1 && onQuantityChange) {
      onQuantityChange(offerId, newQuantity);

      const items = cartItems.map(item => ({
        offerId: item.offerId,
        quantity: item.offerId === offerId ? newQuantity : item.quantity,
      }));
      setDiscountLevelsMap(getDiscountLevelsMapWithClearedLevels(items));
    }
  };

  return (
    <div className={styles.cartModalScroll}>
      <Heading level={3}>New order</Heading>

      {/* License Info Section */}
      <div className={styles.licenseInfoContainer}>
        <div className={styles.licenseInfoText}>
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
        </div>
      </div>

      {/* Partner Info Section */}
      <div className={styles.partnerInfoContainer}>
        <span className={styles.partnerInfoText}>{partnerPriceText}</span>
      </div>

      {/* Scrollable Product Cards Container */}
      <div className={styles.productCardsContainer}>
        {/* Product Cards */}
        {cartItems.map((item, index) => {
          return (
            <div
              key={item.offerId}
              className={index < cartItems.length - 1 ? styles.cardWrapper : styles.cardWrapperLast}
            >
              <Card>
                <div className={styles.closeButtonSection}>
                  <Button
                    variant="secondary"
                    size="S"
                    fillStyle={'outline'}
                    onPress={() => {
                      if (onRemoveItem) {
                        onRemoveItem(item.offerId);
                      }
                    }}
                  >
                    <Close />
                  </Button>
                </div>

                <div className={styles.productNameContainer}>
                  <span className={styles.productName}>{item.productName}</span>
                </div>

                {/* Licenses Section */}
                <div className={styles.licensesSection}>
                  {/* Number field and Update price button row */}
                  <div className={styles.quantityRow}>
                    {/* Number field */}
                    <div className={styles.numberFieldWrapper}>
                      <NumberField
                        id={`cart-quantity-${item.offerId}`}
                        value={item.quantity}
                        onChange={value => handleQuantityChange(item.offerId, value || 1)}
                        label="Licenses"
                        hideStepper={false}
                        size={'M'}
                      />
                    </div>
                  </div>

                  {/* Pricing information row */}
                  <div className={styles.pricingRow}>
                    {/* Left side - Price per license */}
                    <p className={styles.pricePerLicense}>
                      {formatPrice(item.pricePerUnit, currency || 'N/A')} per license
                    </p>

                    {/* Right side - Total amount per year */}
                    <span className={styles.totalPrice}>
                      {item.lineItemTotal !== undefined
                        ? `${formatPrice(item.lineItemTotal, currency || 'N/A')}`
                        : '-'}
                    </span>
                  </div>

                  {/* Offer ID section */}
                  <div className={styles.offerIdContainer}>
                    <p className={styles.offerId}>{item.offerId}</p>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Update Price Button Section */}
      <div className={styles.updatePriceSection}>
        <UpdatePriceButton isDisabled={isLoadingPrices} onPress={handleUpdatePrice} />
      </div>

      <div className={styles.estimatedTotalSection}>
        {/* Estimated Total Row */}
        <div className={styles.estimatedTotalRow}>
          <span className={styles.estimatedTotalLabel}>Estimated total</span>
          <div className={styles.priceContainer}>
            <span className={styles.totalPriceValue}>
              {estimatedTotal !== null ? `${formatPrice(estimatedTotal, currency || 'N/A')}` : '-'}
            </span>
            <span className={styles.taxText}>+local taxes apply</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtonsContainer}>
          <Button variant="accent" onPress={onContinueToCustomerDetails}>
            {continueButtonText}
          </Button>
          <Button variant="secondary" onPress={onKeepShopping}>
            Keep shopping
          </Button>
        </div>
      </div>

      {/* Error Toast - Only for Order Preview API failures */}
      <ErrorToast
        show={showErrorToast}
        message={errorMessage}
        onClose={() => setShowErrorToast(false)}
      />
    </div>
  );
};
export default CartDetails;
