import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NumberField, Card, Switch } from '@react-spectrum/s2';
import { useProductNamesFromPricelist } from '../../../hooks/useProductPricing';
import {
  initializeQuantities,
  initializeRenewalStates,
  calculateTotalLicenses,
  prepareRenewalData,
  lateRenewalItemsToLineItems,
  fetchLateRenewalOrderPreview,
  updateSubscriptionsWithPreview,
  placeRenewalOrder,
  formatRenewalWindowCloseDate,
} from '../../../utils/lateRenewalUtils';
import {
  generateExternalReferenceId,
  getDiscountLevelsFromOfferIdsAndQuantities,
  getDiscountLevelsMapWithClearedLevels,
} from '../../../utils/commonUtils';
import type { DiscountLevelsMap } from '../../../types/discountLevel';
import type { SubscriptionToRenew } from '../../../types/lateRenewal';
import styles from '../../../styles/lateRenewal/LateRenewalOrderDialog.module.css';
import { EstimatedTotal } from '../../common/EstimatedTotal';
import { UpdatePriceButton } from '../../common/UpdatePriceButton';
import { RenewalDialogHeader } from '../RenewalDialogHeader';
import { ErrorToast } from '../../../utils/ToastMessageUtils';
import { useToastState } from '../../../hooks/useToastState';
import { usePartnerDetails } from '../../../contexts/PartnerContext';
import { PromoCodeButton } from '../../common/PromoCodeButton';
import { createClientLogger } from '../../../utils/logger';

const logger = createClientLogger('LateRenewalOrderDialog');

interface LateRenewalOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  onError: (errorMessage: string) => void;
  subscriptions: SubscriptionToRenew[];
  customerId?: string;
}

const LateRenewalOrderDialog: React.FC<LateRenewalOrderDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  subscriptions,
  customerId,
}) => {
  const windowCloseDate = useMemo(
    () => formatRenewalWindowCloseDate(subscriptions),
    [subscriptions]
  );
  const manualRenewalSubscriptions = useMemo(
    () => subscriptions.filter(sub => sub.allowedActions?.includes('MANUAL_RENEWAL')),
    [subscriptions]
  );

  const [localSubscriptionState, setLocalSubscriptionState] = useState<SubscriptionToRenew[]>(
    manualRenewalSubscriptions
  );
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [renewalStates, setRenewalStates] = useState<{ [key: string]: boolean }>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [hasInitialPreview, setHasInitialPreview] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [discountLevelsMap, setDiscountLevelsMap] = useState<DiscountLevelsMap>({});
  const [needsRecalculation, setNeedsRecalculation] = useState(false);
  const [pricingSummaries, setPricingSummaries] = useState<
    Array<{ totalLineItemPartnerPrice: number; currencyCode: string }>
  >([]);
  const { toastState, showError, clearError } = useToastState();
  const { region } = usePartnerDetails();

  // Track previous isOpen state to detect dialog open transitions
  const prevIsOpenRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Initialize all state when dialog transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setLocalSubscriptionState(manualRenewalSubscriptions);
      setQuantities(initializeQuantities(manualRenewalSubscriptions));
      setRenewalStates(initializeRenewalStates(manualRenewalSubscriptions));
      setHasInitialPreview(false);
      setPricingSummaries([]);
      setDiscountLevelsMap({});
      clearError();
      isProcessingRef.current = false;
    }

    if (!isOpen && prevIsOpenRef.current) {
      isProcessingRef.current = false;
      clearError();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, manualRenewalSubscriptions]);

  const subscriptionContexts = useMemo(
    () =>
      localSubscriptionState
        .filter(sub => sub.offerId && sub.currencyCode)
        .map(sub => ({
          offerId: sub.offerId!,
          currencyCode: sub.currencyCode!,
          region,
        })),
    [localSubscriptionState, region]
  );

  const { getProductName } = useProductNamesFromPricelist(subscriptionContexts);

  const totalLicenses = useMemo(
    () => calculateTotalLicenses(localSubscriptionState, quantities, renewalStates),
    [localSubscriptionState, quantities, renewalStates]
  );
  const currency = useMemo(
    () =>
      localSubscriptionState[0]?.currencyCode ||
      manualRenewalSubscriptions[0]?.currencyCode ||
      'N/A',
    [localSubscriptionState, manualRenewalSubscriptions]
  );

  const updatePricesFromPreview = useCallback(
    async (subsOverride?: SubscriptionToRenew[]) => {
      const subsToUse = subsOverride ?? localSubscriptionState;
      if (!customerId || subsToUse.length === 0) {
        return;
      }

      try {
        setIsLoadingPrices(true);

        const allRenewalData = subsToUse
          .filter(
            sub =>
              sub.subscriptionId &&
              sub.offerId &&
              sub.currencyCode &&
              renewalStates[sub.subscriptionId]
          )
          .map(sub => ({
            subscriptionId: sub.subscriptionId!,
            offerId: sub.offerId!,
            quantity: quantities[sub.subscriptionId!],
            currencyCode: sub.currencyCode!,
            ...(sub.autoRenewal?.flexDiscountCodes?.[0] && {
              discountCode: sub.autoRenewal.flexDiscountCodes[0],
            }),
          }));

        if (allRenewalData.length === 0) {
          setIsLoadingPrices(false);
          return;
        }

        // Validate all quantities are greater than 0
        const hasInvalidQuantity = allRenewalData.some(item => item.quantity <= 0);
        if (hasInvalidQuantity) {
          setIsLoadingPrices(false);
          return;
        }

        const lineItems = lateRenewalItemsToLineItems(allRenewalData);

        const previewData = await fetchLateRenewalOrderPreview(customerId, lineItems, currency);

        if (previewData.lineItems && previewData.lineItems.length > 0) {
          const itemsForDiscountCalculation = previewData.lineItems.map(item => ({
            offerId: item.offerId,
            quantity: item.quantity,
          }));
          const calculatedDiscountLevels = getDiscountLevelsFromOfferIdsAndQuantities(
            itemsForDiscountCalculation
          );
          setDiscountLevelsMap(calculatedDiscountLevels);
        }

        const updatedSubs = updateSubscriptionsWithPreview(subsToUse, previewData.lineItems);

        setLocalSubscriptionState(updatedSubs);

        if (previewData.pricingSummary && previewData.pricingSummary.length > 0) {
          setPricingSummaries(
            previewData.pricingSummary.map(summary => ({
              totalLineItemPartnerPrice: summary.totalLineItemPartnerPrice || 0,
              currencyCode: summary.currencyCode || '',
            }))
          );
        }
        setNeedsRecalculation(false);
      } catch (error) {
        logger.error({ err: error }, 'Error updating prices from preview');
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'Failed to preview renewal order. Please try again.';
        showError(errorMsg);
        setNeedsRecalculation(false);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    [customerId, localSubscriptionState, renewalStates, quantities, currency]
  );

  const clearPricesAndDiscounts = useCallback(() => {
    setPricingSummaries([]);
    setDiscountLevelsMap({});
  }, []);

  const handleQuantityChange = useCallback(
    (subscriptionId: string, newQuantity: number) => {
      const updatedQuantity = Math.max(1, newQuantity);

      setQuantities(prev => {
        const updatedQuantities = {
          ...prev,
          [subscriptionId]: updatedQuantity,
        };

        // Update quantities and clear discount levels immediately
        const items = localSubscriptionState
          .filter(sub => renewalStates[sub.subscriptionId!] && sub.offerId)
          .map(sub => ({
            offerId: sub.offerId!,
            quantity: updatedQuantities[sub.subscriptionId!] || 0,
          }));
        setDiscountLevelsMap(getDiscountLevelsMapWithClearedLevels(items));

        return updatedQuantities;
      });

      setLocalSubscriptionState(prev =>
        prev.map(sub => ({
          ...sub,
          pricePerLicense: undefined,
          lineItemPartnerPrice: undefined,
        }))
      );
      setPricingSummaries([]);
    },
    [localSubscriptionState, renewalStates]
  );

  const handleRenewalToggle = useCallback(
    (subscriptionId: string) => {
      setRenewalStates(prev => ({
        ...prev,
        [subscriptionId]: !prev[subscriptionId],
      }));
      clearPricesAndDiscounts();
      setNeedsRecalculation(true);
    },
    [clearPricesAndDiscounts]
  );

  const handlePromoCodeApply = useCallback(
    async (offerId: string, code: string) => {
      const updatedSubs = localSubscriptionState.map(s =>
        s.offerId === offerId
          ? { ...s, autoRenewal: { ...s.autoRenewal, flexDiscountCodes: [code] } }
          : s
      );
      setPricingSummaries([]);
      await updatePricesFromPreview(updatedSubs);
    },
    [localSubscriptionState, updatePricesFromPreview]
  );

  const handlePromoCodeRemove = useCallback(
    async (offerId: string) => {
      const updatedSubs = localSubscriptionState.map(s =>
        s.offerId === offerId
          ? { ...s, autoRenewal: { ...s.autoRenewal, flexDiscountCodes: undefined } }
          : s
      );
      setPricingSummaries([]);
      await updatePricesFromPreview(updatedSubs);
    },
    [localSubscriptionState, updatePricesFromPreview]
  );

  const handleRenewNow = useCallback(async () => {
    // Prevent duplicate calls if already processing
    if (isProcessingRef.current || isRenewing) {
      return;
    }

    if (!customerId) {
      onError('Customer ID is missing');
      return;
    }

    isProcessingRef.current = true;

    const renewalData = prepareRenewalData(localSubscriptionState, renewalStates, quantities);

    if (!renewalData || renewalData.length === 0) {
      onError('Please select at least one subscription to renew');
      isProcessingRef.current = false;
      return;
    }

    try {
      setIsRenewing(true);

      const lineItems = lateRenewalItemsToLineItems(renewalData);

      const currencyCode = renewalData[0]?.currencyCode || '';

      const externalReferenceId = generateExternalReferenceId();

      const response = await placeRenewalOrder(
        customerId,
        externalReferenceId,
        currencyCode,
        lineItems
      );
      onClose();
      const orderId = response.orderId || response.referenceOrderId || 'N/A';
      onSuccess(orderId);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to create renewal order. Please try again.'
      );
    } finally {
      setIsRenewing(false);
      isProcessingRef.current = false;
    }
  }, [
    customerId,
    localSubscriptionState,
    renewalStates,
    quantities,
    onError,
    onSuccess,
    onClose,
    isRenewing,
  ]);

  // Auto-call preview API when dialog opens (only once)
  useEffect(() => {
    if (
      isOpen &&
      !hasInitialPreview &&
      localSubscriptionState.length > 0 &&
      customerId &&
      !isLoadingPrices &&
      Object.keys(renewalStates).length > 0
    ) {
      updatePricesFromPreview();
      setHasInitialPreview(true);
    }
  }, [
    isOpen,
    hasInitialPreview,
    localSubscriptionState.length,
    customerId,
    isLoadingPrices,
    renewalStates,
    updatePricesFromPreview,
  ]);

  // Auto-update prices when toggle changes
  useEffect(() => {
    if (needsRecalculation && !isLoadingPrices) {
      updatePricesFromPreview();
    }
  }, [needsRecalculation, isLoadingPrices, updatePricesFromPreview]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.dialog}>
        <RenewalDialogHeader
          title="Late renewal order"
          onCancel={onClose}
          onSave={handleRenewNow}
          isSaving={isRenewing}
          isSaveDisabled={totalLicenses === 0}
          saveButtonLabel="Renew now"
        />

        {/* Content */}
        <div className={styles.content}>
          {windowCloseDate && (
            <div className={styles.deadline}>Submit late renewal before {windowCloseDate}</div>
          )}

          {/* Total licenses and Update Price Button */}
          <div className={styles.licensesInfo}>
            <span className={styles.licensesCount}>
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
              {!discountLevelsMap.LICENSE && !discountLevelsMap.TRANSACTION && (
                <span>{totalLicenses} Licenses</span>
              )}
            </span>
            <UpdatePriceButton
              onPress={updatePricesFromPreview}
              isDisabled={isLoadingPrices}
            ></UpdatePriceButton>
          </div>

          {/* Product list */}
          <div className={styles.productList}>
            {localSubscriptionState
              .filter(sub => sub.subscriptionId)
              .map(sub => {
                const productName = getProductName(sub.offerId || '') || 'Unknown Product';
                const price = sub.pricePerLicense;
                const quantity = quantities[sub.subscriptionId!] || 0;
                const isSubscriptionRenewing = renewalStates[sub.subscriptionId!];
                const totalProductPrice = sub.lineItemPartnerPrice;
                const maxQuantity = sub.currentQuantity || 0;
                return (
                  <Card key={sub.subscriptionId!} UNSAFE_className={styles.productCard}>
                    <div className={styles.productHeader}>
                      <div className={styles.productInfo}>
                        <div className={styles.productDetails}>
                          <h3 className={styles.productName}>{productName}</h3>
                        </div>
                      </div>

                      <div className={styles.renewToggle}>
                        <Switch
                          isSelected={isSubscriptionRenewing}
                          onChange={() => handleRenewalToggle(sub.subscriptionId!)}
                        >
                          {isSubscriptionRenewing ? 'Renew' : 'Do not renew'}
                        </Switch>
                      </div>
                    </div>

                    {isSubscriptionRenewing && (
                      <>
                        <div className={styles.productBody}>
                          <div className={styles.quantityControls}>
                            <NumberField
                              label={'Licenses'}
                              value={quantity}
                              onChange={value =>
                                handleQuantityChange(sub.subscriptionId!, value || 1)
                              }
                              hideStepper={false}
                              minValue={1}
                              size={'S'}
                              maxValue={maxQuantity}
                              aria-label="Quantity"
                            />
                          </div>

                          <div className={styles.rightSection}>
                            <div className={styles.totalPrice}>
                              {totalProductPrice !== undefined
                                ? `$${totalProductPrice.toFixed(2)}`
                                : '--'}
                            </div>
                          </div>
                        </div>

                        <div className={styles.pricePerLicense}>
                          {price !== undefined
                            ? `$${price.toFixed(2)} per license`
                            : '-- per license'}
                        </div>
                        <div className={styles.offerIdBox}>{sub.offerId}</div>
                        <div className={styles.promoCodeButtonWrapper}>
                          <PromoCodeButton
                            offerId={sub.offerId || ''}
                            productName={productName}
                            appliedCode={sub.autoRenewal?.flexDiscountCodes?.[0]}
                            onApply={handlePromoCodeApply}
                            onRemove={handlePromoCodeRemove}
                            isLoading={isLoadingPrices}
                          />
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
          </div>
          {pricingSummaries.length > 0 ? (
            pricingSummaries.map((summary, index) => (
              <EstimatedTotal
                key={`${summary.currencyCode}-${index}`}
                total={summary.totalLineItemPartnerPrice}
                currency={summary.currencyCode}
              />
            ))
          ) : (
            <EstimatedTotal total={0} currency={currency} />
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isRenewing && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner}></div>
            <div className={styles.loadingText}>Submitting renewal order</div>
          </div>
        </div>
      )}
      <ErrorToast
        show={toastState.error.show}
        message={toastState.error.message}
        onClose={clearError}
      />
    </>
  );
};
export default LateRenewalOrderDialog;
