import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Button, Text } from '@react-spectrum/s2';
import { Layout } from '../../components/Layout';
import NavigationPanel from '../../components/NavigationPanel';
import UpgradeReviewDetails from '../../components/checkout/upgrade/UpgradeReviewDetails';
import CheckoutProductCard from '../../components/checkout/CheckoutProductCard';
import { CartItem } from '../../contexts/CartContext';
import { usePreviewSwitchOrder, usePlaceSwitchOrder } from '../../hooks/useOrderOperations';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import {
  cartItemsToSwitchOrderLineItems,
  updateCartItemsWithSkuMapping,
} from '../../utils/cartUtils';
import { fetchCustomerDetails, getResellerDetails } from '../../utils/AccountApis';
import { SwitchType } from '../../utils/constants';
import {
  formatPrice,
  generateExternalReferenceId,
  getDiscountLevelsFromOfferIdsAndQuantities,
} from '../../utils/commonUtils';
import checkoutStyles from '../../components/checkout/Checkout.module.css';
import styles from '../../styles/checkout/UpgradeReview.module.css';

export default function UpgradeCheckoutPage() {
  const router = useRouter();
  const { partnerName, region } = usePartnerDetails();

  const {
    customerId,
    resellerId,
    sourceOfferId,
    sourceSubscriptionId,
    sourceCurrency,
    targetOfferId,
    switchType,
    quantity,
  } = router.query as Record<string, string>;

  const { data: customerData } = useQuery({
    queryKey: ['customerDetails', customerId],
    queryFn: () => fetchCustomerDetails(customerId),
    enabled: !!customerId,
  });

  const { data: resellerData } = useQuery({
    queryKey: ['resellerDetails', resellerId],
    queryFn: () => getResellerDetails(resellerId),
    enabled: !!resellerId,
  });

  const customerName = customerData?.companyProfile?.companyName || '';
  const resellerName = resellerData?.companyProfile?.companyName || '';

  const isFullOnly = switchType === SwitchType.FULL_ONLY;
  const maxQuantity = parseInt(quantity) || 0;

  const [item, setItem] = useState<CartItem | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);
  const [needsRecalculation, setNeedsRecalculation] = useState(false);

  const switchOrderPreview = usePreviewSwitchOrder();
  const switchOrderSubmit = usePlaceSwitchOrder();

  const { getProductName } = useProductNamesFromPricelist([
    { offerId: sourceOfferId, currencyCode: sourceCurrency, region },
    { offerId: targetOfferId, currencyCode: sourceCurrency, region },
  ]);

  const sourceProductName = getProductName(sourceOfferId) || sourceOfferId;
  const targetProductName = getProductName(targetOfferId) || targetOfferId;

  const buildBody = (overrideItem?: CartItem | null) => {
    const currentItem = overrideItem ?? item;
    return {
      customerId,
      externalReferenceId: generateExternalReferenceId(),
      currencyCode: sourceCurrency,
      ...cartItemsToSwitchOrderLineItems(
        currentItem ?? ({ offerId: targetOfferId, quantity: maxQuantity } as any),
        sourceSubscriptionId
      ),
    };
  };

  const runPreview = (overrideItem?: CartItem | null) => {
    switchOrderPreview.mutate(buildBody(overrideItem), {
      onSuccess: data => {
        const lineItemPricing = data?.lineItems?.[0]?.pricing;
        const pricingSummary = data?.pricingSummary?.[0];
        setItem(prev => {
          if (!prev) return prev;
          const [skuMapped] = updateCartItemsWithSkuMapping([prev], data.lineItems ?? []);
          return {
            ...skuMapped,
            pricePerUnit: lineItemPricing?.partnerPrice ?? 0,
            lineItemTotal: lineItemPricing?.lineItemPartnerPrice,
            currency: pricingSummary?.currencyCode || sourceCurrency,
          };
        });
        setEstimatedTotal(pricingSummary?.totalLineItemPartnerPrice ?? null);
        setNeedsRecalculation(false);
      },
    });
  };

  useEffect(() => {
    if (!customerId || !targetOfferId || !sourceCurrency || !quantity) return;
    setItem({
      id: targetOfferId,
      offerId: targetOfferId,
      productName: targetProductName,
      quantity: maxQuantity,
      pricePerUnit: 0,
      currency: sourceCurrency,
      productFamily: targetProductName,
    });
    runPreview();
  }, [customerId, targetOfferId, sourceCurrency, quantity]);

  const displayCurrency = item?.currency || sourceCurrency || '';

  const discountLevelsMap = item
    ? getDiscountLevelsFromOfferIdsAndQuantities([
        { offerId: item.offerId, quantity: item.quantity },
      ])
    : {};

  const handlePromoCodeApply = (offerId: string, code: string) => {
    const updatedItem = item?.offerId === offerId ? { ...item, discountCode: code } : item;
    setItem(updatedItem);
    runPreview(updatedItem);
  };

  const handlePromoCodeRemove = (offerId: string) => {
    const updatedItem = item?.offerId === offerId ? { ...item, discountCode: undefined } : item;
    setItem(updatedItem);
    runPreview(updatedItem);
  };

  const handlePlaceOrder = () => {
    switchOrderSubmit.mutate(buildBody(), {
      onSuccess: () => {
        const queryParams = new URLSearchParams({
          customerId: customerId || '',
          currencyCode: item?.currency || '',
          totalAmount: String(estimatedTotal ?? 0),
          customerName,
          resellerId: resellerId || '',
          products: JSON.stringify([
            { productFamily: targetProductName, quantity: item?.quantity ?? 1 },
          ]),
        });
        router.push(`/orderConfirmation?${queryParams.toString()}`);
      },
    });
  };

  const navigationItems = [
    { label: 'Resellers', href: '/resellers' },
    { label: 'Reseller', href: `/customers?resellerId=${resellerId}` },
    {
      label: 'Customer',
      href: `/customerdetails?resellerId=${resellerId}&customerId=${customerId}`,
    },
    { label: 'Review upgrade', href: undefined },
  ];

  return (
    <Layout activePage="checkout" partnerName={partnerName}>
      <div className={checkoutStyles.navigationWrapper}>
        <NavigationPanel items={navigationItems} />
      </div>

      <div className={checkoutStyles.checkoutPage}>
        <div className={checkoutStyles.checkoutContainer}>
          {/* Left column */}
          <div className={checkoutStyles.leftColumn}>
            <UpgradeReviewDetails
              customerName={customerName || customerId}
              resellerName={resellerName || resellerId}
              sourceProductName={sourceProductName}
              targetProductName={targetProductName}
            />
          </div>

          {/* Right column: order summary */}
          <div className={checkoutStyles.rightColumn}>
            <div className={checkoutStyles.summaryCard}>
              <div className={checkoutStyles.summaryTitle}>Order summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {(discountLevelsMap.LICENSE || discountLevelsMap.TRANSACTION) && (
                  <div className={checkoutStyles.partnerPricingText}>
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
                <p className={styles.summarySubMeta}>Reflecting partner pricing for customer.</p>
              </div>

              {item && (
                <CheckoutProductCard
                  product={item}
                  onQuantityChange={
                    isFullOnly
                      ? undefined
                      : (_, qty) => {
                          setItem(prev => (prev ? { ...prev, quantity: qty } : prev));
                          setNeedsRecalculation(true);
                        }
                  }
                  maxQuantity={maxQuantity || undefined}
                  isQuantityReadOnly={isFullOnly}
                  onPromoCodeApply={handlePromoCodeApply}
                  onPromoCodeRemove={handlePromoCodeRemove}
                />
              )}

              <div style={{ marginTop: 32 }}>
                <Button
                  variant="secondary"
                  onPress={() => runPreview()}
                  isPending={switchOrderPreview.isPending}
                  isDisabled={!needsRecalculation || switchOrderPreview.isPending}
                >
                  <Text>Update price</Text>
                </Button>
              </div>

              {switchOrderPreview.isError && (
                <p className={styles.errorText}>
                  {switchOrderPreview.error?.message ||
                    'Failed to load pricing. Click "Update price" to retry.'}
                </p>
              )}

              <div className={checkoutStyles.summaryTotals} style={{ marginTop: 32 }}>
                <div className={checkoutStyles.summaryTotalRow}>
                  <span>Estimated Total</span>
                  <div className={checkoutStyles.priceContainer}>
                    <span>
                      {estimatedTotal !== null ? formatPrice(estimatedTotal, displayCurrency) : '—'}
                    </span>
                    {estimatedTotal !== null && (
                      <span className={checkoutStyles.taxText}>+local taxes apply</span>
                    )}
                  </div>
                </div>
              </div>

              <p className={checkoutStyles.termsText} style={{ marginTop: 32 }}>
                By clicking &ldquo;Place order&rdquo;, you will agree to pay Adobe for these
                licenses pursuant to Adobe&apos;s APC Agreement with you.
              </p>

              <div style={{ marginTop: 32 }}>
                <Button
                  variant="accent"
                  onPress={handlePlaceOrder}
                  isPending={switchOrderSubmit.isPending}
                  isDisabled={
                    !item ||
                    estimatedTotal === null ||
                    needsRecalculation ||
                    switchOrderPreview.isPending
                  }
                  UNSAFE_className={checkoutStyles.placeOrderBtn}
                >
                  <Text>Place order</Text>
                </Button>
              </div>

              {switchOrderSubmit.isError && (
                <p className={styles.errorText}>Failed to place order. Please try again.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
