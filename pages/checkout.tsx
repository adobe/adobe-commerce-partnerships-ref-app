import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CheckoutReviewDetails from '../components/checkout/CheckoutReviewDetails';
import CheckoutSummary from '../components/checkout/CheckoutSummary';
import NavigationPanel from '../components/NavigationPanel';
import { Layout } from '../components/Layout';
import { useCart } from '../contexts/CartContext';
import { generateExternalReferenceId } from '../utils/commonUtils';
import {
  updateCartItemsWithSkuMapping,
  fetchOrderPreview,
  cartItemsToLineItems,
} from '../utils/cartUtils';
import { useCreateOrder } from '../hooks/useOrderOperations';
import { ErrorToast } from '../utils/ToastMessageUtils';
import styles from '../components/checkout/Checkout.module.css';
import { useRouter } from 'next/router';
import { getResellerDetails } from '../utils/AccountApis';
import type { CartItem } from '../contexts/CartContext';
import { ClearCartConfirmationDialog } from '../components/customerdetails/ClearCartConfirmationDialog';
import { useCartRouteGuard } from '../hooks/useCartRouteGuard';
import { createClientLogger } from '../utils/logger';

const logger = createClientLogger('checkout');

export default function CheckoutPage() {
  const {
    cartItemIdToQuantityMap,
    cartItemIdToCartItemDetailsMap,
    customerInfoInCart,
    updateCartItemsFromAPI,
    updateQuantity,
    clearCart,
    getTotalItems,
  } = useCart();

  const partnerName = '';
  const [items, setItems] = useState<CartItem[]>([]);
  const [needsRecalculation, setNeedsRecalculation] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);
  const initialRecalculationDone = useRef(false);
  const router = useRouter();

  const shouldAllowNavigation = useCallback(
    (url: string) => {
      if (url.includes('/orderConfirmation')) return true;
      if (!customerInfoInCart.customerId) return false;
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const targetCustomerId = urlParams.get('customerId');
      return targetCustomerId === customerInfoInCart.customerId && url.includes('/customerdetails');
    },
    [customerInfoInCart.customerId]
  );

  const cartRouteGuard = useCartRouteGuard({
    router,
    getTotalItems,
    clearCart,
    shouldAllowNavigation,
  });

  const createOrder = useCreateOrder();

  const { data: resellerData } = useQuery({
    queryKey: ['reseller', customerInfoInCart.resellerId],
    queryFn: () => getResellerDetails(customerInfoInCart.resellerId!),
    enabled: !!customerInfoInCart.resellerId,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    const checkoutItems: CartItem[] = Object.entries(cartItemIdToQuantityMap).map(
      ([offerId, quantity], index) => {
        const details = cartItemIdToCartItemDetailsMap[offerId];
        return {
          id: (index + 1).toString(),
          offerId: offerId,
          productName: details?.productName || offerId,
          quantity: quantity,
          pricePerUnit: details?.pricePerUnit || 0,
          currency: details?.currency || '',
          productFamily: details?.productFamily,
          discountCode: details?.discountCode,
        };
      }
    );

    setItems(checkoutItems);
  }, [cartItemIdToQuantityMap, cartItemIdToCartItemDetailsMap]);

  //useEffect to handle initial recalculation
  useEffect(() => {
    if (!initialRecalculationDone.current && customerInfoInCart.customerId && items.length > 0) {
      handleRecalculate();
      initialRecalculationDone.current = true;
    }
  }, [items]);

  const updateCartItems = (newItems: CartItem[]) => {
    setItems(newItems);
    const updatedCartItems = newItems.map(item => ({
      id: item.offerId,
      offerId: item.offerId,
      productName: item.productName,
      pricePerUnit: item.pricePerUnit,
      quantity: item.quantity,
      currency: item.currency,
      productFamily: item.productFamily,
      discountCode: item.discountCode,
    }));
    updateCartItemsFromAPI(updatedCartItems);
  };

  const handleSummaryQuantityChange = (id: string, newQuantity: number) => {
    const item = items.find(item => item.id === id);
    if (item) {
      updateQuantity(item.offerId, newQuantity);
      setNeedsRecalculation(true);
    }
  };

  const getOrderCurrency = () => (items.length > 0 ? items[0].currency : 'N/A');
  const customerName = customerInfoInCart?.customerName || '';
  const customerId = customerInfoInCart.customerId;
  const resellerId = customerInfoInCart.resellerId;
  const resellerName = resellerData?.companyProfile?.companyName || '';

  const handleRecalculate = async (itemsToRecalculate?: CartItem[]) => {
    const itemsForRecalc = itemsToRecalculate ?? items;
    if (!customerInfoInCart.customerId || itemsForRecalc.length === 0) {
      return;
    }
    try {
      setIsRecalculating(true);
      const lineItems = cartItemsToLineItems(itemsForRecalc);

      const data = await fetchOrderPreview(
        customerInfoInCart.customerId,
        lineItems,
        getOrderCurrency()
      );

      if (data.lineItems) {
        const updatedItems = updateCartItemsWithSkuMapping(itemsForRecalc, data.lineItems);
        updateCartItems(updatedItems);
      }

      if (data.pricingSummary && data.pricingSummary.length > 0) {
        setEstimatedTotal(data.pricingSummary[0].totalLineItemPartnerPrice);
      }

      setNeedsRecalculation(false);
    } catch (error: any) {
      const apiErrorMessage = error?.message || 'Failed to recalculate prices. Please try again.';
      setErrorMessage(apiErrorMessage);
      setShowErrorToast(true);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handlePromoCodeApply = async (offerId: string, code: string) => {
    const updatedItems = items.map(item =>
      item.offerId === offerId ? { ...item, discountCode: code } : item
    );
    setNeedsRecalculation(true);
    await handleRecalculate(updatedItems);
  };

  const handlePromoCodeRemove = async (offerId: string) => {
    const updatedItems = items.map(item =>
      item.offerId === offerId ? { ...item, discountCode: undefined } : item
    );
    setNeedsRecalculation(true);
    await handleRecalculate(updatedItems);
  };

  const placeOrder = async () => {
    if (!customerInfoInCart.customerId || items.length === 0) {
      logger.error('No customerId found or empty cart - cannot place order');
      return;
    }

    const lineItems = cartItemsToLineItems(items);

    createOrder.mutate(
      {
        customerId: customerInfoInCart.customerId,
        externalReferenceId: generateExternalReferenceId(),
        currencyCode: getOrderCurrency(),
        lineItems,
      },
      {
        onSuccess: () => {
          clearCart();
          // Prepare products array for order confirmation
          const orderProducts = items.map(item => ({
            productFamily: item.productFamily || item.productName || '',
            quantity: item.quantity,
          }));

          const queryParams = new URLSearchParams({
            customerId: customerInfoInCart.customerId || '',
            currencyCode: getOrderCurrency() || '',
            totalAmount: estimatedTotal?.toString() || '0',
            customerName: customerInfoInCart.customerName || '',
            resellerId: customerInfoInCart.resellerId || '',
            products: JSON.stringify(orderProducts),
          });
          router.push(`/orderConfirmation?${queryParams.toString()}`);
        },
        onError: (error: any) => {
          const apiErrorMessage = error?.message || 'Failed to create order. Please try again.';
          setErrorMessage(apiErrorMessage);
          setShowErrorToast(true);
          createOrder.reset(); // Reset the mutation state
        },
      }
    );
  };

  const navigationItems = useMemo(
    () => [
      { label: 'Resellers', href: '/resellers' },
      {
        label: resellerName || 'Reseller',
        href: `/customers?resellerId=${resellerId}`,
      },
      {
        label: customerName || 'Customer',
        href: `/customerdetails?resellerId=${resellerId}&customerId=${customerId}`,
      },
      { label: 'Checkout', href: undefined },
    ],
    [resellerName, resellerId, customerName, customerId]
  );

  return (
    <Layout activePage="checkout" partnerName={partnerName}>
      <div className={styles.navigationWrapper}>
        <NavigationPanel items={navigationItems} />
      </div>

      <div className={styles.checkoutPage}>
        {items.length === 0 ? (
          <div className={styles.emptyCartContainer}>No items in cart.</div>
        ) : (
          <div className={styles.checkoutContainer}>
            <div className={styles.leftColumn}>
              <CheckoutReviewDetails customerName={customerName} resellerName={resellerName} />
            </div>
            <div className={styles.rightColumn}>
              <CheckoutSummary
                finalCheckoutProducts={items}
                total={estimatedTotal || 0}
                currency={getOrderCurrency()}
                onQuantityChange={handleSummaryQuantityChange}
                needsRecalculation={needsRecalculation}
                onRecalculate={() => handleRecalculate()}
                isRecalculating={isRecalculating}
                onPlaceOrder={placeOrder}
                isPlacingOrder={createOrder.isPending}
                onItemRemoved={() => setNeedsRecalculation(true)}
                onPromoCodeApply={handlePromoCodeApply}
                onPromoCodeRemove={handlePromoCodeRemove}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Toast */}
      <ErrorToast
        show={showErrorToast}
        message={errorMessage}
        onClose={() => setShowErrorToast(false)}
      />

      {/* Clear Cart Confirmation Dialog */}
      <ClearCartConfirmationDialog
        isOpen={cartRouteGuard.showClearCartDialog}
        onClose={cartRouteGuard.handleClose}
        onLeaveWithoutSaving={cartRouteGuard.handleLeaveWithoutSaving}
        onViewCart={cartRouteGuard.handleViewCart}
        customerName={customerName}
      />
    </Layout>
  );
}
