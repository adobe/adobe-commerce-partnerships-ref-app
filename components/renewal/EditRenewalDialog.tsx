import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heading, NumberField, Switch, Text, ProgressCircle } from '@react-spectrum/s2';
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle';
import { useQueryClient } from '@tanstack/react-query';
import {
  formatPrice,
  getDiscountLevelsFromOfferIdsAndQuantities,
  getDiscountLevelsMapWithClearedLevels,
} from '../../utils/commonUtils';
import type { DiscountLevelsMap } from '../../types/discountLevel';
import { customerDetailKeys } from '../../utils/queryUtils';
import { computeSubscriptionsEligibleForRenewalUpdate } from '../../utils/customerDetailsUtils';
import {
  convertSubscriptionsToExistingRenewalProducts,
  fetchRenewalPreviewAndUpdateProducts,
  hasExistingProductChanged,
  prepareDataForDiscountLevelMapComputation,
  applyPromoCode,
  removePromoCode,
  updateRenewalSubscription,
  toggleAutoRenewal,
  updateProductQuantity,
  computeDiscountLevelsMap,
  shouldResetFlexDiscount,
} from '../../utils/renewalUtils';
import { RenewalDialogHeader } from './RenewalDialogHeader';
import { EstimatedTotal } from '../common/EstimatedTotal';
import { LicenseInfoSection } from '../common/LicenseInfoSection';
import { PromoCodeButton } from '../common/PromoCodeButton';
import type { RenewalProduct } from '../../types/AddAndEditCustomerRenewalOrder';
import type { Subscription } from '../../models/Subscription';
import styles from '../../styles/renewal/Renewal.module.css';
import { ErrorToast, SuccessToast, WarningToast } from '../../utils/ToastMessageUtils';
import { processSettledResults } from '../../utils/apiError';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import { useToastState } from '../../hooks/useToastState';

interface EditRenewalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  customerId?: string;
  anniversaryDate?: string;
}

const EditRenewalDialog: React.FC<EditRenewalDialogProps> = ({
  isOpen,
  onClose,
  subscriptions,
  customerId,
  anniversaryDate,
}) => {
  const eligibleSubscriptions = useMemo(
    () => computeSubscriptionsEligibleForRenewalUpdate(subscriptions),
    [subscriptions]
  );
  const [products, setProducts] = useState<RenewalProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const {
    toastState,
    showError,
    showWarning,
    showSuccess,
    clearError,
    clearWarning,
    clearSuccess,
  } = useToastState();
  const [pricingSummaries, setPricingSummaries] = useState<
    Array<{ totalLineItemPartnerPrice: number; currencyCode: string }>
  >([]);
  const [initialPriceUpdateDone, setInitialPriceUpdateDone] = useState(false);
  const [discountLevelsMap, setDiscountLevelsMap] = useState<DiscountLevelsMap>({});

  const queryClient = useQueryClient();
  const { region } = usePartnerDetails();

  const abortControllerRef = useRef<AbortController | null>(null);

  const productContexts = useMemo(
    () =>
      products
        .filter(product => product.offerId && product.currency)
        .map(product => ({
          offerId: product.offerId,
          currencyCode: product.currency!,
          region,
        })),
    [products, region]
  );
  const { getProductName } = useProductNamesFromPricelist(productContexts);

  const handleUpdatePrice = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const productsToPreview = products.filter(p => p.autoRenewalEnabled);
    if (productsToPreview.length === 0) {
      setPricingSummaries([]);
      return;
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsUpdatingPrices(true);

      const { updatedProducts, pricingSummaries: responsePricingSummaries } =
        await fetchRenewalPreviewAndUpdateProducts(productsToPreview, customerId || '');

      setProducts(prev => {
        const finalProducts = prev.map(product => {
          const updated = updatedProducts.find(up => up.subscriptionId === product.subscriptionId);
          // Preserve autoRenewalEnabled from current state when merging
          return updated ? { ...updated, autoRenewalEnabled: product.autoRenewalEnabled } : product;
        });

        setDiscountLevelsMap(
          getDiscountLevelsFromOfferIdsAndQuantities(
            prepareDataForDiscountLevelMapComputation(finalProducts)
          )
        );

        return finalProducts;
      });
      setPricingSummaries(responsePricingSummaries);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      let errorMsg = 'An error occurred while updating prices.';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      showError(errorMsg);
    } finally {
      abortControllerRef.current = null;
      setIsUpdatingPrices(false);
    }
  }, [products, customerId, showError]);

  // Initialize products when dialog opens
  useEffect(() => {
    if (isOpen) {
      setProducts(convertSubscriptionsToExistingRenewalProducts(eligibleSubscriptions));
      setPricingSummaries([]);
      setInitialPriceUpdateDone(false);
      setDiscountLevelsMap({});
    } else {
      setProducts([]);
      setInitialPriceUpdateDone(false);
      setDiscountLevelsMap({});
    }
  }, [isOpen, eligibleSubscriptions]);

  // Call handleUpdatePrice once when dialog opens
  useEffect(() => {
    if (isOpen && products.length > 0 && !isUpdatingPrices && !initialPriceUpdateDone) {
      handleUpdatePrice();
      setInitialPriceUpdateDone(true);
    }
  }, [isOpen, products.length, initialPriceUpdateDone, isUpdatingPrices, handleUpdatePrice]);

  const clearPricesAndDiscountLevels = useCallback((updatedProducts: RenewalProduct[]) => {
    setDiscountLevelsMap(
      getDiscountLevelsMapWithClearedLevels(
        prepareDataForDiscountLevelMapComputation(updatedProducts)
      )
    );
    setPricingSummaries([]);
  }, []);

  const handleAutoRenewalToggle = (subscriptionId: string) => {
    setProducts(prev => {
      const updatedProducts = toggleAutoRenewal(prev, subscriptionId, 'subscriptionId');
      clearPricesAndDiscountLevels(updatedProducts);
      return updatedProducts;
    });
  };

  const handleQuantityChange = useCallback(
    (subscriptionId: string, quantity: number) => {
      setProducts(prev => {
        const updatedProducts = updateProductQuantity(
          prev,
          subscriptionId,
          quantity,
          'subscriptionId'
        );
        clearPricesAndDiscountLevels(updatedProducts);
        return updatedProducts;
      });
    },
    [clearPricesAndDiscountLevels]
  );

  const handleResults = useCallback(
    async (results: PromiseSettledResult<any>[]) => {
      const { successful, total, errors } = processSettledResults(results);

      if (successful > 0) {
        if (customerId) {
          await queryClient.invalidateQueries({
            queryKey: customerDetailKeys.subscriptions(customerId),
          });
        }

        if (successful < total) {
          const errorSummary = errors.length > 0 ? `Errors: ${errors.join('; ')}` : '';
          showWarning(
            `Saved ${successful} of ${total} renewal preference changes.${errorSummary ? '\n\n' + errorSummary : ''}`
          );
        } else {
          showSuccess('All renewal preferences updated successfully');
        }
        await handleUpdatePrice();
        return;
      }

      const errorMsg =
        errors.length > 0
          ? `Failed to save renewal preference: ${errors.join('; ')}`
          : 'Failed to save renewal preference. Please try again.';
      showError(errorMsg);
      await handleUpdatePrice();
    },
    [customerId, queryClient, handleUpdatePrice, showError, showWarning, showSuccess]
  );

  const handleSaveChanges = async () => {
    if (!customerId) {
      showError('Missing customer information');
      return;
    }

    try {
      setIsSaving(true);
      // Find products that have changes
      const updatePromises = products.flatMap(product => {
        const originalSub = eligibleSubscriptions.find(
          s => s.subscriptionId === product.subscriptionId
        );
        if (!originalSub || !hasExistingProductChanged(product, originalSub)) return [];
        return [
          updateRenewalSubscription(
            product,
            customerId,
            shouldResetFlexDiscount(product, originalSub)
          ),
        ];
      });

      if (updatePromises.length === 0) {
        onClose();
        return;
      }
      const results = await Promise.allSettled(updatePromises);
      await handleResults(results);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update subscriptions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handlePromoCodeApply = (offerId: string, code: string) => {
    setProducts(prev => {
      const updatedProducts = applyPromoCode(prev, offerId, code);
      clearPricesAndDiscountLevels(updatedProducts);
      return updatedProducts;
    });
  };

  const handlePromoCodeRemove = (offerId: string) => {
    setProducts(prev => {
      const updatedProducts = removePromoCode(prev, offerId);
      clearPricesAndDiscountLevels(updatedProducts);
      return updatedProducts;
    });
  };

  const getDiscountLevelsMap = () => computeDiscountLevelsMap(discountLevelsMap, products);

  // Check if there are any changes compared to original subscriptions
  const hasChanges = useMemo(() => {
    if (products.length === 0) return false;

    return products.some(product => {
      const originalSub = eligibleSubscriptions.find(
        s => s.subscriptionId === product.subscriptionId
      );
      return originalSub && hasExistingProductChanged(product, originalSub);
    });
  }, [products, eligibleSubscriptions]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={handleCancel} />

      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <RenewalDialogHeader
            title="Edit renewal order"
            onCancel={handleCancel}
            onSave={handleSaveChanges}
            isSaving={isSaving}
            isSaveDisabled={!hasChanges}
            anniversaryDate={anniversaryDate}
          />
          {/* Dialog Content */}
          <div className={styles.dialogContent}>
            <div className={styles.infoBanner}>
              <div className={styles.infoBannerIcon}>
                <InfoCircle />
              </div>
              <div className={styles.infoBannerText}>
                <Text>
                  Preview includes pricing information. When editing, save changes to view pricing
                  and total.
                </Text>
              </div>
            </div>

            {/* License Info Section */}
            {products.some(p => p.autoRenewalEnabled) && (
              <div className={styles.headerSection}>
                <LicenseInfoSection discountLevelsMap={getDiscountLevelsMap()} />
              </div>
            )}

            {/* Subscriptions List */}
            <div className={styles.productsList}>
              {products.map(product => {
                if (!product.subscriptionId) return null;

                const productName = getProductName(product.offerId);
                const pricePerLicense = product.pricePerUnit || 0;
                return (
                  <div key={product.subscriptionId} className={styles.productCard}>
                    <div className={styles.productHeaderWithMargin}>
                      <Heading level={3}>{productName}</Heading>
                      <div className={styles.switchContainer}>
                        <Switch
                          isSelected={product.autoRenewalEnabled}
                          onChange={() => handleAutoRenewalToggle(product.subscriptionId || '')}
                          isDisabled={isSaving}
                        >
                          <Text>Auto-renewal {product.autoRenewalEnabled ? 'on' : 'off'}</Text>
                        </Switch>
                      </div>
                    </div>

                    {product.autoRenewalEnabled && (
                      <>
                        {/* Licenses Section */}
                        <div className={styles.licensesRow}>
                          <Text>Licenses</Text>
                          <NumberField
                            id={`edit-renewal-quantity-${product.subscriptionId}`}
                            value={product.quantity}
                            onChange={value =>
                              handleQuantityChange(product.subscriptionId || '', value)
                            }
                            minValue={1}
                            isDisabled={isSaving}
                            size={'S'}
                            aria-label={`Number of licenses for ${productName}`}
                          />
                        </div>

                        {/* Price Information */}
                        <div className={styles.priceInfo}>
                          <div className={styles.priceRow}>
                            <Text>
                              {pricePerLicense > 0
                                ? `${formatPrice(pricePerLicense, product.currency || '')} per license`
                                : '-- per license'}
                            </Text>
                            <span className={styles.totalPrice}>
                              {product.lineItemTotal && product.lineItemTotal > 0
                                ? formatPrice(product.lineItemTotal, product.currency || '')
                                : '--'}
                            </span>
                          </div>
                          <span className={styles.offerId}>{product.offerId}</span>
                        </div>
                        <div className={styles.promoCodeButtonWrapper}>
                          <PromoCodeButton
                            offerId={product.offerId}
                            productName={productName}
                            appliedCode={product.discountCode}
                            onApply={handlePromoCodeApply}
                            onRemove={handlePromoCodeRemove}
                            isLoading={isUpdatingPrices}
                            disabled={isSaving}
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {eligibleSubscriptions.length === 0 && (
              <Heading level={3}>No active subscriptions found</Heading>
            )}

            {/* Estimated Totals - One for each currency */}
            {pricingSummaries.length > 0 ? (
              pricingSummaries.map((summary, index) => (
                <EstimatedTotal
                  key={`${summary.currencyCode}-${index}`}
                  total={summary.totalLineItemPartnerPrice}
                  currency={summary.currencyCode}
                />
              ))
            ) : (
              <EstimatedTotal total={0} currency={products[0]?.currency || ''} />
            )}
          </div>
        </div>
      </div>
      <SuccessToast
        show={toastState.success.show}
        message={toastState.success.message}
        onClose={clearSuccess}
      />
      <WarningToast
        show={toastState.warning.show}
        message={toastState.warning.message}
        onClose={clearWarning}
      />
      <ErrorToast
        show={toastState.error.show}
        message={toastState.error.message}
        onClose={clearError}
      />
      {isSaving && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <ProgressCircle aria-label="Saving renewal order" isIndeterminate />
            <Text>Saving renewal order</Text>
          </div>
        </div>
      )}
    </>
  );
};
export default EditRenewalDialog;
