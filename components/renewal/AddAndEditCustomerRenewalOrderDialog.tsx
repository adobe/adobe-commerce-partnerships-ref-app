import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heading, ProgressCircle, Text } from '@react-spectrum/s2';
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../contexts/CartContext';
import {
  formatDate,
  getSKUFromOfferId,
  getDiscountLevelsFromOfferIdsAndQuantities,
  getDiscountLevelsMapWithClearedLevels,
} from '../../utils/commonUtils';
import type { DiscountLevelsMap } from '../../types/discountLevel';
import { customerDetailKeys } from '../../utils/queryUtils';
import {
  fetchCustomerSubscriptions,
  computeSubscriptionsEligibleForRenewalUpdate,
} from '../../utils/customerDetailsUtils';
import {
  convertCartToAddToRenewalProducts,
  convertSubscriptionsToExistingRenewalProducts,
  hasExistingProductChanged,
  createRenewalSubscription,
  updateRenewalSubscription,
  fetchRenewalPreviewAndUpdateProducts,
  applyPromoCode,
  removePromoCode,
  prepareDataForDiscountLevelMapComputation,
  toggleAutoRenewal,
  updateProductQuantity,
  computeDiscountLevelsMap,
  shouldResetFlexDiscount,
} from '../../utils/renewalUtils';
import { ErrorToast, SuccessToast, WarningToast } from '../../utils/ToastMessageUtils';
import { processSettledResults } from '../../utils/apiError';
import { RenewalDialogHeader } from './RenewalDialogHeader';
import { RenewalProductCard } from './RenewalProductCard';
import { EstimatedTotal } from '../common/EstimatedTotal';
import { LicenseInfoSection } from '../common/LicenseInfoSection';
import type {
  AddAndEditCustomerRenewalOrderDialogProps,
  DialogState,
} from '../../types/AddAndEditCustomerRenewalOrder';
import styles from '../../styles/renewal/Renewal.module.css';
import { Subscription } from '../../models/Subscription';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { usePartnerDetails } from '../../contexts/PartnerContext';

const INITIAL_DIALOG_STATE: DialogState = {
  products: [],
  isSaving: false,
  isUpdatingPrices: false,
  pricesCleared: false,
  pricingSummaries: [],
  showSuccessToast: false,
  showErrorToast: false,
  showWarningToast: false,
  errorMessage: '',
  successMessage: '',
  warningMessage: '',
};

const EMPTY_SUBSCRIPTIONS: Subscription[] = [];

const AddAndEditCustomerRenewalOrderDialog: React.FC<AddAndEditCustomerRenewalOrderDialogProps> = ({
  isOpen,
  onClose,
  customerId: propCustomerId,
  anniversaryDate,
}) => {
  const { cartItemIdToQuantityMap, cartItemIdToCartItemDetailsMap, customerInfoInCart, clearCart } =
    useCart();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [shouldUpdatePriceAfterReload, setShouldUpdatePriceAfterReload] = useState(false);
  const [state, setState] = useState<DialogState>(INITIAL_DIALOG_STATE);
  const [discountLevelsMap, setDiscountLevelsMap] = useState<DiscountLevelsMap>({});

  const { region } = usePartnerDetails();

  const {
    data: subscriptions = EMPTY_SUBSCRIPTIONS,
    isLoading: subscriptionsLoading,
    error: subscriptionsError,
    refetch: refetchSubscriptions,
  } = useQuery({
    queryKey: customerDetailKeys.subscriptions(propCustomerId || ''),
    queryFn: () => fetchCustomerSubscriptions(propCustomerId!),
    enabled: !!propCustomerId && isOpen,
    staleTime: 0,
    gcTime: 0,
  });

  const eligibleSubscriptionsForUpdate = useMemo(
    () => computeSubscriptionsEligibleForRenewalUpdate(subscriptions),
    [subscriptions]
  );

  const productContexts = useMemo(
    () =>
      state.products
        .filter(product => product.offerId && product.currency)
        .map(product => ({
          offerId: product.offerId,
          currencyCode: product.currency!,
          region,
        })),
    [state.products, region]
  );
  const { getProductName } = useProductNamesFromPricelist(productContexts);

  const handleAutoRenewalToggle = useCallback((offerId: string) => {
    setState(prev => ({
      ...prev,
      products: toggleAutoRenewal(prev.products, offerId, 'offerId'),
      pricesCleared: true,
      pricingSummaries: [],
    }));
  }, []);

  const handleQuantityChange = useCallback((offerId: string, quantity: number) => {
    setState(prev => {
      const updatedProducts = updateProductQuantity(prev.products, offerId, quantity, 'offerId');
      setDiscountLevelsMap(
        getDiscountLevelsMapWithClearedLevels(
          prepareDataForDiscountLevelMapComputation(updatedProducts)
        )
      );
      return { ...prev, products: updatedProducts, pricesCleared: true, pricingSummaries: [] };
    });
  }, []);

  const handleUpdatePrice = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const productsToPreview = state.products.filter(p => p.autoRenewalEnabled);

    if (productsToPreview.length === 0 || !propCustomerId) {
      setState(prev => ({
        ...prev,
        pricingSummaries: [],
      }));
      return;
    }
    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({ ...prev, isUpdatingPrices: true }));

      const result = await fetchRenewalPreviewAndUpdateProducts(productsToPreview, propCustomerId);

      setState(prev => ({
        ...prev,
        products: prev.products.map(product => {
          const updated = result.updatedProducts.find(
            up => getSKUFromOfferId(up.offerId) === getSKUFromOfferId(product.offerId)
          );
          return updated ? { ...updated, autoRenewalEnabled: product.autoRenewalEnabled } : product;
        }),
        pricingSummaries: result.pricingSummaries,
        pricesCleared: false,
        isUpdatingPrices: false,
      }));

      // Update discount levels from preview data
      if (result.updatedProducts && result.updatedProducts.length > 0) {
        setDiscountLevelsMap(
          getDiscountLevelsFromOfferIdsAndQuantities(
            prepareDataForDiscountLevelMapComputation(result.updatedProducts)
          )
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      let errorMsg = 'An error occurred while updating prices';
      if (error instanceof Error) {
        errorMsg = errorMsg + ':' + error.message;
      }
      setState(prev => ({
        ...prev,
        errorMessage: errorMsg,
        showErrorToast: true,
        isUpdatingPrices: false,
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.products, propCustomerId]);

  const handleResults = useCallback(
    async (results: PromiseSettledResult<any>[]) => {
      const { successful, failed, total, errors } = processSettledResults(results);

      if (successful > 0) {
        const isPartial = successful < total;
        setShouldUpdatePriceAfterReload(true);

        if (isPartial) {
          const errorSummary = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
          setState(prev => ({
            ...prev,
            warningMessage: `${successful} of ${total} changes saved to renewal order. ${failed} failed.  Error Summary :  ${errorSummary}`,
            showWarningToast: true,
          }));
        } else {
          setState(prev => ({
            ...prev,
            successMessage: 'Changes saved to renewal order. Pricing preview available',
            showSuccessToast: true,
          }));
        }
        clearCart();
        await refetchSubscriptions();

        return;
      }

      const errorMessage =
        errors.length > 0
          ? `Failed to save renewal order: ${errors.join('; ')}`
          : 'Failed to save renewal order. Please try again.';
      setState(prev => ({
        ...prev,
        errorMessage,
        showErrorToast: true,
      }));
    },
    [clearCart, refetchSubscriptions]
  );

  const handleSaveChanges = async () => {
    if (!propCustomerId) {
      setState(prev => ({
        ...prev,
        errorMessage: 'Missing customer information',
        showErrorToast: true,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isSaving: true }));

      const requests: Promise<any>[] = [];

      /* ------------------ ADD NEW PRODUCTS → POST ------------------ */
      const newProducts = state.products.filter(p => p.type === 'NEW');
      newProducts.forEach(product => {
        requests.push(createRenewalSubscription(product, propCustomerId));
      });

      /* ------------- EXISTING PRODUCTS → PATCH (only changes) ------------- */
      const existingProducts = state.products.filter(p => p.type === 'EXISTING');
      existingProducts.forEach(product => {
        const original = eligibleSubscriptionsForUpdate.find(
          s => s.subscriptionId === product.subscriptionId
        );

        if (!original || !hasExistingProductChanged(product, original)) {
          return;
        }
        requests.push(
          updateRenewalSubscription(
            product,
            propCustomerId,
            shouldResetFlexDiscount(product, original)
          )
        );
      });

      if (requests.length === 0) {
        onClose();
        return;
      }
      const results = await Promise.allSettled(requests);
      await handleResults(results);
    } catch (error) {
      setState(prev => ({
        ...prev,
        errorMessage: error instanceof Error ? error.message : 'Failed to save renewal order',
        showErrorToast: true,
      }));
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleCancel = () => {
    onClose();
    clearCart();
  };

  const handlePromoCodeApply = (offerId: string, code: string) => {
    setState(prev => ({
      ...prev,
      products: applyPromoCode(prev.products, offerId, code),
      pricesCleared: true,
      pricingSummaries: [],
    }));
  };

  const handlePromoCodeRemove = (offerId: string) => {
    setState(prev => ({
      ...prev,
      products: removePromoCode(prev.products, offerId),
      pricesCleared: true,
      pricingSummaries: [],
    }));
  };

  const getDiscountLevelsMap = () => computeDiscountLevelsMap(discountLevelsMap, state.products);

  // Check if there are any changes compared to original subscriptions
  const hasChanges = useMemo(() => {
    if (state.products.length === 0) return false;

    const hasNewProducts = state.products.some(p => p.type === 'NEW');
    if (hasNewProducts) return true;

    return state.products.some(product => {
      const original = eligibleSubscriptionsForUpdate.find(
        s => s.subscriptionId === product.subscriptionId
      );
      return original && hasExistingProductChanged(product, original);
    });
  }, [state.products, eligibleSubscriptionsForUpdate]);

  useEffect(() => {
    if (isOpen) {
      const productsTobeAddedToRenewal =
        Object.keys(cartItemIdToQuantityMap || {}).length > 0
          ? convertCartToAddToRenewalProducts(
              cartItemIdToQuantityMap,
              cartItemIdToCartItemDetailsMap
            )
          : [];

      const productsForRenewalPreferenceUpdate =
        eligibleSubscriptionsForUpdate.length > 0
          ? convertSubscriptionsToExistingRenewalProducts(eligibleSubscriptionsForUpdate)
          : [];

      const existingSubscriptionSKUs = new Set(
        productsForRenewalPreferenceUpdate.map(p => getSKUFromOfferId(p.offerId))
      );

      const filteredCartProducts = productsTobeAddedToRenewal
        .filter(cartProduct => {
          const cartSKU = getSKUFromOfferId(cartProduct.offerId);
          return !existingSubscriptionSKUs.has(cartSKU);
        })
        .map(product => ({
          ...product,
          pricePerUnit: 0,
          lineItemTotal: 0,
        }));

      const initialProducts = [...filteredCartProducts, ...productsForRenewalPreferenceUpdate];

      setState(prev => {
        // If we are currently showing a toast from a recent save, KEEP IT.
        const isToastActive = prev.showSuccessToast || prev.showWarningToast || prev.showErrorToast;

        return {
          ...INITIAL_DIALOG_STATE,
          products: initialProducts,
          pricesCleared: true,
          // Carry over toast state if we are reloading or if a toast is already visible
          showSuccessToast: isToastActive ? prev.showSuccessToast : false,
          showWarningToast: isToastActive ? prev.showWarningToast : false,
          showErrorToast: isToastActive ? prev.showErrorToast : false,
          successMessage: isToastActive ? prev.successMessage : '',
          warningMessage: isToastActive ? prev.warningMessage : '',
          errorMessage: isToastActive ? prev.errorMessage : '',
        };
      });

      // Clear discount levels initially
      setDiscountLevelsMap(
        getDiscountLevelsMapWithClearedLevels(
          prepareDataForDiscountLevelMapComputation(initialProducts)
        )
      );
    } else {
      setState(INITIAL_DIALOG_STATE);
      setDiscountLevelsMap({});
      setShouldUpdatePriceAfterReload(false);
    }
  }, [
    isOpen,
    eligibleSubscriptionsForUpdate,
    cartItemIdToQuantityMap,
    cartItemIdToCartItemDetailsMap,
  ]);

  // Call handleUpdatePrice after products are reloaded following a save
  // This effect watches for when subscriptions are refetched and products are updated after a save operation
  useEffect(() => {
    const runPriceUpdate = async () => {
      if (
        isOpen &&
        !subscriptionsLoading &&
        shouldUpdatePriceAfterReload &&
        state.products.length > 0 &&
        !state.isUpdatingPrices
      ) {
        await handleUpdatePrice();
        // DO NOT reset the flag until the prices are actually in.
        setShouldUpdatePriceAfterReload(false);
      }
    };
    runPriceUpdate();
  }, [
    isOpen,
    subscriptionsLoading,
    shouldUpdatePriceAfterReload,
    state.products.length,
    handleUpdatePrice,
  ]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={handleCancel} />
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <RenewalDialogHeader
            title={`Renewal for ${customerInfoInCart.customerName || propCustomerId}`}
            onCancel={handleCancel}
            onSave={handleSaveChanges}
            isSaving={state.isSaving}
            isSaveDisabled={!hasChanges || subscriptionsLoading || state.products.length === 0}
            anniversaryDate={anniversaryDate}
            formatDate={formatDate}
            saveButtonLabel="Save renewal order"
          />

          <div className={styles.dialogContent}>
            {subscriptionsLoading && (
              <ProgressCircle aria-label="Loading subscriptions" isIndeterminate />
            )}
            {subscriptionsError && (
              <div className={styles.errorStateContainer}>
                <Text>Failed to load subscriptions. Please try again.</Text>
              </div>
            )}
            {!subscriptionsLoading && !subscriptionsError && (
              <>
                {/* Info Banner */}
                <div className={styles.infoBanner}>
                  <div className={styles.infoBannerIcon}>
                    <InfoCircle />
                  </div>
                  <div className={styles.infoBannerText}>
                    <Text>
                      You can make additional changes to this renewal order. Pricing will show when
                      changes are saved.
                    </Text>
                  </div>
                </div>

                {state.products.some(p => p.autoRenewalEnabled) && (
                  <div className={styles.headerSection}>
                    <LicenseInfoSection discountLevelsMap={getDiscountLevelsMap()} />
                  </div>
                )}

                <div className={styles.productsList}>
                  {state.products.map(product => {
                    const productName =
                      product.type === 'EXISTING'
                        ? getProductName(product.offerId)
                        : product.productFamily || product.productName;

                    return (
                      <RenewalProductCard
                        key={product.offerId}
                        product={product}
                        productName={productName}
                        onAutoRenewalToggle={handleAutoRenewalToggle}
                        onQuantityChange={handleQuantityChange}
                        isSaving={state.isSaving}
                        onPromoCodeApply={handlePromoCodeApply}
                        onPromoCodeRemove={handlePromoCodeRemove}
                      />
                    );
                  })}
                </div>

                {state.products.length === 0 && (
                  <div className={styles.emptyStateContainer}>
                    <Heading level={3}>No products to renew</Heading>
                  </div>
                )}
                {/* Estimated Totals - One for each currency */}
                {state.pricingSummaries.length > 0 ? (
                  state.pricingSummaries.map((summary, index) => (
                    <EstimatedTotal
                      key={`${summary.currencyCode}-${index}`}
                      total={summary.totalLineItemPartnerPrice}
                      currency={summary.currencyCode}
                    />
                  ))
                ) : (
                  <EstimatedTotal total={0} currency={state.products[0]?.currency || ''} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <SuccessToast
        show={state.showSuccessToast}
        message={state.successMessage || 'Renewal preferences updated successfully'}
        onClose={() => setState(prev => ({ ...prev, showSuccessToast: false }))}
      />
      <WarningToast
        show={state.showWarningToast}
        message={state.warningMessage}
        onClose={() => setState(prev => ({ ...prev, showWarningToast: false }))}
      />
      <ErrorToast
        show={state.showErrorToast}
        message={state.errorMessage}
        onClose={() => setState(prev => ({ ...prev, showErrorToast: false }))}
      />
      {state.isSaving && (
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
export default AddAndEditCustomerRenewalOrderDialog;
