import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabList, Tab, TabPanel, Button } from '@react-spectrum/s2';
import ShoppingCart from '@react-spectrum/s2/icons/ShoppingCart';
import AccountDetailsPanel, {
  AccountDetailsSkeleton,
} from '../components/customerdetails/AccountDetailsPanel';
import CustomerProductsOverviewPanel from '../components/customerdetails/CustomerProductsOverviewPanel';
import PurchaseHistoryPanel from '../components/customerdetails/PurchaseHistoryPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';
import NavigationPanel from '../components/NavigationPanel';
import { SuccessToast } from '../utils/ToastMessageUtils';
import CartDetails from '../components/catalogCart/CartDetails';
import ThreeYearCommit from '../components/ThreeYearCommit/ThreeYearCommit';
import { ClearCartConfirmationDialog } from '../components/customerdetails/ClearCartConfirmationDialog';
import { useCartRouteGuard } from '../hooks/useCartRouteGuard';
import { Layout } from '../components/Layout';
import { useCart } from '../contexts/CartContext';
import { usePartnerDetails } from '../contexts/PartnerContext';
import {
  formatCustomerDiscountsForHeader,
  fetchCustomerSubscriptions,
} from '../utils/customerDetailsUtils';
import { fetchCustomerDetails, getResellerDetails } from '../utils/AccountApis';
import { customerDetailKeys } from '../utils/queryUtils';
import styles from '../styles/customerdetails/CustomerDetails.module.css';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const { resellerId, customerId } = router.query;
  const queryClient = useQueryClient();
  const partnerName = '';
  const { regionCurrencies } = usePartnerDetails();
  const {
    cartItemIdToQuantityMap,
    cartItemIdToCartItemDetailsMap,
    customerInfoInCart,
    getTotalItems,
    showCartModal,
    setShowCartModal,
    updateQuantity,
    removeFromCart,
    updateCartItemsFromAPI,
    clearCart,
  } = useCart();

  const primaryCurrency = regionCurrencies.length > 0 ? regionCurrencies[0].currency : 'N/A';
  const customerIdString = typeof customerId === 'string' ? customerId : customerId?.[0] || '';
  const resellerIdString = typeof resellerId === 'string' ? resellerId : resellerId?.[0] || '';

  const [selectedTab, setSelectedTab] = useState('products');
  const [showToast, setShowToast] = useState(false);
  const [isThreeYearCommitOpen, setIsThreeYearCommitOpen] = useState(false);
  const prevSelectedTabRef = useRef<string | null>(null);

  const cartRouteGuard = useCartRouteGuard({
    router,
    getTotalItems,
    clearCart,
    shouldAllowNavigation: (url: string) => url.includes('/checkout'),
  });

  const {
    data: subscriptions,
    isLoading: subscriptionsLoading,
    error: subscriptionsError,
    refetch,
  } = useQuery({
    queryKey: customerDetailKeys.subscriptions(customerIdString),
    queryFn: () => fetchCustomerSubscriptions(customerIdString),
    enabled: !!customerIdString && router.isReady,
    staleTime: 0,
    gcTime: 0,
    retry: 3,
    retryDelay: 1000,
  });

  // 2. CUSTOMER DETAILS - Load in parallel with subscriptions
  const {
    data: customer,
    isLoading: customerLoading,
    error: customerError,
  } = useQuery({
    queryKey: customerDetailKeys.customer(customerIdString),
    queryFn: () => fetchCustomerDetails(customerIdString),
    enabled: !!customerIdString && router.isReady,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    retryDelay: 2000,
  });

  const { data: reseller } = useQuery({
    queryKey: customerDetailKeys.reseller(resellerIdString),
    queryFn: () => getResellerDetails(resellerIdString),
    enabled: !!resellerIdString && router.isReady,
    staleTime: 2 * 60 * 1000, // 2 minutes cache for reseller details
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: 2,
    retryDelay: 2000,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 8_000);

    return () => clearTimeout(timer);
  }, [refetch]);

  // Refetch subscriptions when Products tab is activated
  useEffect(() => {
    // Skip on initial mount
    if (prevSelectedTabRef.current === null) {
      prevSelectedTabRef.current = selectedTab;
      return;
    }

    if (selectedTab === 'products' && prevSelectedTabRef.current !== 'products') {
      refetch();
    }
    prevSelectedTabRef.current = selectedTab;
  }, [selectedTab, refetch]);

  useEffect(() => {
    const hasCustomerInfo = customerInfoInCart && Object.keys(customerInfoInCart).length > 0;
    if (getTotalItems() > 0 && !hasCustomerInfo) {
      clearCart();
    }
  }, [customerInfoInCart, getTotalItems, clearCart]);

  // Error handling - separate errors for better UX
  const productsError = subscriptionsError?.message || null;
  const accountError = customerError?.message || null;

  const getDisplayName = () => {
    return customer?.companyProfile?.companyName || 'Customer';
  };

  const getResellerDisplayName = () => {
    return reseller?.companyProfile?.companyName || 'Reseller';
  };

  // Show loading state while query parameters are being loaded
  if (!router.isReady) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <Layout activePage="customers" partnerName={partnerName}>
      <div className={styles.customerDetailsPageWrapper}>
        {/* Navigation Panel / Breadcrumbs */}
        <NavigationPanel
          items={[
            { label: 'Resellers', href: '/resellers' },
            {
              label: getResellerDisplayName(),
              href: `/customers?resellerId=${resellerId}`,
            },
            { label: getDisplayName(), href: undefined },
          ]}
        />

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <div className={styles.customerInfo}>
              <h1 className={styles.customerName}>{getDisplayName()}</h1>
              {customer?.customerId && (
                <div className={styles.customerId}>
                  <span className={styles.customerIdLabel}>Customer ID:</span>{' '}
                  <span className={styles.customerIdValue}>{customer.customerId}</span>
                </div>
              )}
              {customer?.discounts && customer.discounts.length > 0 && (
                <div className={styles.discountLevel}>
                  {formatCustomerDiscountsForHeader(customer.discounts)}
                </div>
              )}
            </div>

            {/* Cart Button */}
            <div className={styles.cartButtonWrapper}>
              <Button
                variant="accent"
                onPress={() => setShowCartModal(true)}
                isDisabled={getTotalItems() === 0}
              >
                <ShoppingCart />
                <span className={styles.cartText}>Cart ({getTotalItems()})</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Spectrum Tabs Navigation */}
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={key => {
            setSelectedTab(key as string);
          }}
          aria-label="Customer details sections"
        >
          <TabList>
            <Tab id="products">Products</Tab>
            <Tab id="account-details">Account Details</Tab>
            <Tab id="purchase-history">Purchase History</Tab>
          </TabList>

          <TabPanel id="products">
            <div className={styles.contentContainer}>
              {/* Products Error */}
              {productsError && (
                <div className={styles.productsError}>
                  <div className={styles.productsErrorText}>{productsError}</div>
                </div>
              )}

              {/* Products Panel - Shows immediately when subscriptions are available */}
              <div className={styles.productsPanelWrapper}>
                {subscriptionsLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <CustomerProductsOverviewPanel
                    subscriptions={subscriptions || []}
                    customer={customer}
                    isLoading={customerLoading}
                    onEnrollClick={() => setIsThreeYearCommitOpen(true)}
                  />
                )}
              </div>

              {/* Browse Product Catalog Link - Centered in Products tab only */}
              <div className={styles.browseCatalogSection}>
                <Link href="/catalog" className={styles.browseCatalogLink}>
                  Browse the product catalog
                </Link>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="account-details">
            <div className={styles.accountDetailsWrapper}>
              {accountError ? (
                <div className={styles.errorMessageContainer}>{accountError}</div>
              ) : !customer && customerLoading ? (
                <AccountDetailsSkeleton />
              ) : (
                <AccountDetailsPanel
                  customer={customer}
                  resellerId={resellerId as string}
                  isLoading={customerLoading}
                />
              )}
            </div>
          </TabPanel>

          <TabPanel id="purchase-history">
            <div className={styles.contentContainer}>
              <PurchaseHistoryPanel
                customerId={customerIdString}
                customerName={getDisplayName() || 'Customer'}
              />
            </div>
          </TabPanel>
        </Tabs>

        {/* Cart Modal */}
        {showCartModal && (
          <>
            {/* Overlay for closing modal when clicking outside */}
            <div className={styles.cartDropdownOverlay} onClick={() => setShowCartModal(false)} />
            <div className={styles.cartDropdown} onClick={e => e.stopPropagation()}>
              <CartDetails
                cartItems={Object.entries(cartItemIdToQuantityMap).map(([offerId, quantity]) => {
                  const details = cartItemIdToCartItemDetailsMap[offerId];
                  return {
                    id: offerId,
                    offerId: offerId,
                    productName: details ? details.productName : 'Product',
                    pricePerUnit: details ? details.pricePerUnit : 0,
                    quantity: quantity,
                    currency: details ? details.currency : 'N/A',
                    productFamily: details ? details.productFamily : undefined,
                    lineItemTotal: details?.lineItemTotal,
                  };
                })}
                customerId={customerIdString}
                currency={primaryCurrency}
                onQuantityChange={(offerId, newQuantity) => updateQuantity(offerId, newQuantity)}
                onRemoveItem={offerId => removeFromCart(offerId)}
                onKeepShopping={() => setShowCartModal(false)}
                onContinueToCustomerDetails={() => {
                  setShowCartModal(false);
                  router.push('/checkout');
                }}
                onCartItemsUpdate={updatedItems => {
                  updateCartItemsFromAPI(updatedItems);
                }}
                partnerPriceText="Reflecting Partner pricing."
                continueButtonText="Review Order"
              />
            </div>
          </>
        )}
      </div>

      {/* Success Toast */}
      <SuccessToast
        show={showToast}
        message="Invitation sent for 3-year commit. Customer must accept terms to complete enrollment."
        onClose={() => setShowToast(false)}
        autoHideDelay={10000}
      />

      {/* Three Year Commit Popup */}
      <ThreeYearCommit
        isOpen={isThreeYearCommitOpen}
        onClose={() => setIsThreeYearCommitOpen(false)}
        onBack={() => setIsThreeYearCommitOpen(false)}
        customerData={customer}
        onEnrollSuccess={() => {
          setShowToast(true);
          queryClient.invalidateQueries({
            queryKey: customerDetailKeys.customer(customerIdString),
          });
        }}
      />

      <ClearCartConfirmationDialog
        isOpen={cartRouteGuard.showClearCartDialog}
        onClose={cartRouteGuard.handleClose}
        onLeaveWithoutSaving={cartRouteGuard.handleLeaveWithoutSaving}
        onViewCart={() => {
          cartRouteGuard.handleViewCart();
          setShowCartModal(true);
        }}
        customerName={getDisplayName()}
      />
    </Layout>
  );
}
