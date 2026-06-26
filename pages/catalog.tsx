import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchDebounce } from '../hooks/useDebounce';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { SearchField, ProgressCircle } from '@react-spectrum/s2';
import ShoppingCart from '@react-spectrum/s2/icons/ShoppingCart';
import NavigationPanel from '../components/NavigationPanel';
import CatalogFiltersComponent from '../components/CatalogFilters';
import CatalogProductCard from '../components/CatalogProductCard';
import CartDetails from '../components/catalogCart/CartDetails';
import FindOrCreateCustomer from '../components/catalogCart/FindOrCreateCustomer';
import { Layout } from '../components/Layout';
import {
  getMarketSegmentCode,
  getMarketSegmentDisplayName,
  getProductType,
  getCustomerIdForMarketSegment,
  getSKUFromOfferId,
} from '../utils/commonUtils';
import { getProductCloudCategory } from '../utils/iconUtils';
import { ErrorToast } from '../utils/ToastMessageUtils';
import {
  prefetchAllMarketSegments,
  prefetchOtherMarketSegments,
  invalidateMarketSegmentsForCurrency,
  getPricelistQueryKey,
  fetchPricelistPage as fetchPricelistPageUtil,
  MARKET_SEGMENTS,
} from '../utils/prefetchProducts';
import { iconPreloader } from '../utils/iconPreloader';
import { PriceListOffer } from '../models/PriceList';
import { CatalogFilters } from '../models/Catalog';
import { usePartnerDetails } from '../contexts/PartnerContext';
import { useCart, CartItem } from '../contexts/CartContext';
import styles from '../styles/CatalogPage.module.css';
import commonStyles from '../styles/CommonCard.module.css';

export default function CatalogPage() {
  const partnerName = '';
  const {
    availableCurrencies,
    region,
    regionCurrencies,
    isLoading: isPartnerDetailsLoading,
  } = usePartnerDetails();
  const {
    cartItemIdToQuantityMap,
    cartItemIdToCartItemDetailsMap,
    getTotalItems,
    showCartModal,
    setShowCartModal,
    updateQuantity,
    removeFromCart,
    updateCartItemsFromAPI,
    addToCart,
    clearCustomerInfoInCart,
  } = useCart();

  const [search, setSearch] = useState('');
  const { debouncedSearch, isSearching } = useSearchDebounce(search, 300);
  const [showFindOrCreateCustomer, setShowFindOrCreateCustomer] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Initialize filters with default values, will be updated when contract data loads
  const [filters, setFilters] = useState<CatalogFilters>({
    marketSegment: ['Commercial'],
    categories: ['All'],
    type: ['All'],
    currency: '',
  });

  const addProductToCart = (offerId: string, productName: string, price: number) => {
    const currentMarketSegment = filters.marketSegment[0];
    const marketSegmentCode = getMarketSegmentCode(currentMarketSegment);

    // Check if cart has items from different market segment
    const existingCartItems = Object.keys(cartItemIdToCartItemDetailsMap);
    if (existingCartItems.length > 0) {
      const existingMarketSegmentCode =
        cartItemIdToCartItemDetailsMap[existingCartItems[0]]?.marketSegment;

      if (existingMarketSegmentCode && existingMarketSegmentCode !== marketSegmentCode) {
        setErrorMessage(
          `Cannot mix products from different market segments. Your cart contains ${getMarketSegmentDisplayName(existingMarketSegmentCode)} products, but you're trying to add a ${currentMarketSegment} product. Please clear your cart or switch to the ${getMarketSegmentDisplayName(existingMarketSegmentCode)} market segment.`
        );
        setShowErrorToast(true);
        return;
      }
    }

    addToCart(
      offerId,
      productName,
      price,
      filters.currency,
      marketSegmentCode, // Store market segment code (COM, EDU, GOV)
      productName, // Use productName for productFamily as well
      1
    );
    setShowCartModal(true);
  };

  // Check if partner contract is fully loaded with currencies
  const isPartnerDetailsReady = useMemo(() => {
    return !isPartnerDetailsLoading && availableCurrencies.length > 0;
  }, [isPartnerDetailsLoading, availableCurrencies.length]);

  // Set default currency ONLY on initial load, when filters.currency is still empty.
  // The !filters.currency guard is critical: without it, this effect re-runs on every
  // currency change and overwrites the user's selection back to regionCurrencies[0].
  useEffect(() => {
    if (regionCurrencies.length > 0 && !filters.currency) {
      const defaultCurrency = regionCurrencies[0].currency;
      setFilters(prev => ({
        ...prev,
        currency: defaultCurrency,
      }));
    }
  }, [regionCurrencies, filters.currency]);

  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Create combined filters with region for API calls
  const filtersWithRegion = useMemo(
    () => ({
      ...filters,
      region,
    }),
    [filters, region]
  );

  // Prefetch on mount and when currency changes - only when partner contract is ready
  useEffect(() => {
    if (!isPartnerDetailsReady) return;

    const prefetchTimer = setTimeout(() => {
      prefetchAllMarketSegments(queryClient, filtersWithRegion, undefined);
    }, 1000); // Delay to avoid interfering with initial load

    return () => clearTimeout(prefetchTimer);
  }, [isPartnerDetailsReady, filtersWithRegion, queryClient]); // Re-prefetch when contract ready or filters change

  // Fetch pricelist data with infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } =
    useInfiniteQuery({
      queryKey: getPricelistQueryKey(filters.marketSegment[0], filters.currency),
      queryFn: ({ pageParam }: { pageParam: number }) =>
        fetchPricelistPageUtil({
          pageParam,
          filters: filtersWithRegion,
        }),
      initialPageParam: 0,
      getNextPageParam: (lastPage: any, allPages: any[]) => {
        return lastPage.hasMore ? allPages.length : undefined;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      enabled: isPartnerDetailsReady && !!region && !!filters.currency, // Only run when all required data is available
    });

  // Flatten all pages into a single array of products
  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page: any) => page.offers || []);
  }, [data]);

  const filteredProducts = useMemo(() => {
    const offersWithLowestdiscountLevel = allProducts.filter((offer: PriceListOffer) => {
      const discountLevel = offer.offerId.substring(10, 12);
      return discountLevel === '04' || discountLevel === 'T7';
    });

    // Second filter: Apply type filter (Teams/Enterprise)
    let typeFilteredOffers = offersWithLowestdiscountLevel;
    if (filters.type[0] && filters.type[0] !== 'All') {
      typeFilteredOffers = offersWithLowestdiscountLevel.filter((offer: PriceListOffer) => {
        const productType = getProductType(offer.productFamily);
        return productType === filters.type[0];
      });
    }

    // Third filter: Apply cloud category filter (Creative Cloud/Document Cloud)
    let categoryFilteredOffers = typeFilteredOffers;
    if (filters.categories[0] && filters.categories[0] !== 'All') {
      categoryFilteredOffers = typeFilteredOffers.filter((offer: PriceListOffer) => {
        const cloudCategory = getProductCloudCategory(offer.productFamily || '');
        return cloudCategory === filters.categories[0];
      });
    }

    // Fourth filter: Apply debounced search if provided
    if (!debouncedSearch.trim()) return categoryFilteredOffers;

    const searchLower = debouncedSearch.toLowerCase();
    return categoryFilteredOffers.filter((offer: PriceListOffer) => {
      // Enhanced search: Check multiple fields for better results
      const matchesOfferId = offer.offerId?.toLowerCase().includes(searchLower);
      const matchesProductFamily = offer.productFamily?.toLowerCase().includes(searchLower);

      // Also search in derived product name if available
      const derivedName = (offer.productFamily || offer.offerId).toLowerCase();
      const matchesName = derivedName.includes(searchLower);

      return matchesOfferId || matchesProductFamily || matchesName;
    });
  }, [allProducts, debouncedSearch, filters.type, filters.categories]);

  // Preload icons for visible products (performance optimization)
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const productFamilies = filteredProducts
        .slice(0, 20) // Preload first 20 visible items
        .map((product: PriceListOffer) => product.productFamily)
        .filter((family): family is string => !!family);

      if (productFamilies.length > 0) {
        iconPreloader.preloadProductFamilyIcons(productFamilies, '48x48');
      }
    }
  }, [filteredProducts]);

  const handleCartButtonClick = () => {
    setShowCartModal(true);
  };

  const handleCloseCartModal = () => {
    setShowCartModal(false);
  };

  const handleContinueToFindOrCreateCustomer = () => {
    setShowCartModal(false);
    setShowFindOrCreateCustomer(true);
  };

  const handleKeepShopping = () => {
    setShowCartModal(false);
  };

  const handleBackFromFindOrCreateCustomer = () => {
    setShowFindOrCreateCustomer(false);
    setShowCartModal(true);
  };

  const handleCloseFindOrCreateCustomer = () => {
    setShowFindOrCreateCustomer(false);
  };

  useEffect(() => {
    clearCustomerInfoInCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle filter changes - invalidate only when currency changes
  useEffect(() => {
    invalidateMarketSegmentsForCurrency(queryClient, filters.currency);
  }, [filters.currency, queryClient]);

  // When market segment changes, prefetch other segments in background - only when partner contract is ready
  useEffect(() => {
    if (!isPartnerDetailsReady) return;

    const currentSegment = filters.marketSegment[0] as (typeof MARKET_SEGMENTS)[number];
    prefetchOtherMarketSegments(queryClient, currentSegment, filtersWithRegion);
  }, [isPartnerDetailsReady, filtersWithRegion, queryClient]);

  return (
    <Layout activePage="catalog" partnerName={partnerName}>
      {/* Navigation Panel / Breadcrumbs */}
      <NavigationPanel items={[]} />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.title}>{partnerName}</div>
        <h1 className={styles.catalogTitle}>Adobe catalog</h1>
      </div>

      {/* Search and Cart Row */}
      <div className={styles.searchRow}>
        {/* Search Field */}
        <div className={styles.searchFieldWrapper}>
          <SearchField
            {...({ placeholder: `Search ${filters.marketSegment[0]} catalog` } as any)}
            id="catalog-search"
            value={search}
            onChange={setSearch}
            size="L"
            aria-label="Search catalog"
          />
          {isSearching && (
            <div className={styles.searchSpinner}>
              <ProgressCircle aria-label="Searching" isIndeterminate size="S" />
            </div>
          )}
        </div>

        {/* Shopping Cart */}
        <div className={styles.cartButton} onClick={handleCartButtonClick}>
          <ShoppingCart />
          <span className={styles.cartText}>Cart ({getTotalItems()})</span>
        </div>
      </div>

      {/* Pricing Disclaimer */}
      <div className={styles.pricingDisclaimer}>
        Reflecting Partner prices for a new customer. Final price determined by discount level and
        existing customer contract, if applicable.
      </div>

      {/* Search Results Info */}
      {debouncedSearch.trim() && (
        <div className={styles.searchResultsInfo}>
          {isSearching
            ? 'Searching...'
            : `Found ${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${debouncedSearch}"`}
        </div>
      )}

      {/* Content Layout: Filters + Products */}
      <div className={styles.contentLayout}>
        {/* Filters Sidebar */}
        <CatalogFiltersComponent filters={filters} onFiltersChange={setFilters} />

        {/* Products Grid */}
        <div className={styles.productsGrid}>
          {isPartnerDetailsLoading ? (
            <div className={styles.emptyMessage}>
              <h3>Loading partner information...</h3>
            </div>
          ) : !isPartnerDetailsReady ? (
            <div className={styles.emptyMessage}>
              <h3>Unable to load partner information. Please try refreshing the page.</h3>
            </div>
          ) : isLoading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className={`${styles.catalogSkeletonCard} ${commonStyles.skeleton}`}>
                <div className={styles.catalogSkeletonIcon} />
                <div className={styles.catalogSkeletonTitle} />
                <div className={styles.catalogSkeletonSubtitle} />
                <div className={styles.catalogSkeletonPrice} />
                <div className={styles.catalogSkeletonButton} />
              </div>
            ))
          ) : isError ? (
            <div className={styles.emptyMessage}>
              <h3>Error loading catalog</h3>
              <p>{error?.message || 'Failed to load products. Please try again.'}</p>
            </div>
          ) : filteredProducts.length === 0 && allProducts.length === 0 ? (
            <div className={styles.emptyMessage}>
              <h3>No offers found</h3>
            </div>
          ) : (
            <>
              {filteredProducts.map((offer: PriceListOffer) => (
                <CatalogProductCard
                  key={offer.offerId}
                  product={{
                    id: offer.offerId,
                    offerId: offer.offerId,
                    name: offer.productFamily,
                    productFamily: offer.productFamily,
                    price: parseFloat(offer.partnerPrice || '0'),
                    currency: filters.currency,
                    priceUnit: ' per license',
                    type: getProductType(offer.productFamily),
                    additionalDetail: offer.additionalDetail,
                  }}
                  onAddToCart={() =>
                    addProductToCart(
                      offer.offerId,
                      offer.productFamily || 'Unknown Product',
                      parseFloat(offer.partnerPrice || '0')
                    )
                  }
                  cartItems={Object.entries(cartItemIdToQuantityMap)
                    .map(([cartOfferId, quantity]) => {
                      const details = cartItemIdToCartItemDetailsMap[cartOfferId];
                      // Match by SKU (first 8 characters) instead of exact offerId
                      // This handles cases where offerId changes after order preview
                      const cartSku = getSKUFromOfferId(cartOfferId);
                      const offerSku = getSKUFromOfferId(offer.offerId);
                      if (cartSku === offerSku) {
                        return {
                          id: cartOfferId,
                          offerId: cartOfferId,
                          productName: details?.productName || offer?.productFamily || cartOfferId,
                          pricePerUnit:
                            details?.pricePerUnit || parseFloat(offer?.partnerPrice || '0'),
                          quantity: quantity,
                          currency: details?.currency || filters.currency,
                          productFamily: details?.productFamily || offer?.productFamily || '',
                        } as CartItem;
                      }
                      return null;
                    })
                    .filter((item): item is NonNullable<typeof item> => item !== null)}
                />
              ))}

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className={styles.loadMoreTrigger} />

              {/* Loading more indicator */}
              {isFetchingNextPage &&
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`loading-more-${index}`}
                    className={`${styles.catalogSkeletonCard} ${commonStyles.skeleton}`}
                  >
                    <div className={styles.catalogSkeletonIcon} />
                    <div className={styles.catalogSkeletonTitle} />
                    <div className={styles.catalogSkeletonSubtitle} />
                    <div className={styles.catalogSkeletonPrice} />
                    <div className={styles.catalogSkeletonButton} />
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Status Info */}
      {!isLoading && !isError && filteredProducts.length > 0 && (
        <div className={`${commonStyles.paginationInfo} ${styles.statusInfo}`}>
          <span className={commonStyles.pageInfo}>
            {isFetchingNextPage
              ? 'Loading more offers...'
              : hasNextPage
                ? `Showing ${filteredProducts.length} offers with lowest partner prices. Scroll for more.`
                : `Showing all ${filteredProducts.length} offers with lowest partner prices.`}
          </span>
        </div>
      )}

      {/* Cart Modal */}
      {showCartModal && (
        <div className={styles.cartModalOverlay} onClick={handleCloseCartModal}>
          <div className={styles.cartModalContent} onClick={e => e.stopPropagation()}>
            <CartDetails
              cartItems={Object.entries(cartItemIdToQuantityMap).map(([offerId, quantity]) => {
                const details = cartItemIdToCartItemDetailsMap[offerId];
                const offer =
                  filteredProducts.find(p => p.offerId === offerId) ||
                  allProducts.find(p => p.offerId === offerId);
                return {
                  id: offerId,
                  offerId: offerId,
                  productName: details?.productName || offer?.productFamily || 'Unknown Product',
                  pricePerUnit: details?.pricePerUnit || parseFloat(offer?.partnerPrice || '0'),
                  quantity: quantity,
                  currency: details?.currency || filters.currency,
                  productFamily: details?.productFamily || offer?.productFamily || '',
                  lineItemTotal: details?.lineItemTotal,
                  marketSegment: details?.marketSegment,
                } as CartItem;
              })}
              customerId={(() => {
                // Use market segment from cart items if available, otherwise use current filter
                const cartItemIds = Object.keys(cartItemIdToCartItemDetailsMap);
                const cartMarketSegment =
                  cartItemIds.length > 0
                    ? cartItemIdToCartItemDetailsMap[cartItemIds[0]]?.marketSegment
                    : filters.marketSegment[0];
                return getCustomerIdForMarketSegment(cartMarketSegment || filters.marketSegment[0]);
              })()}
              currency={filters.currency}
              onQuantityChange={(offerId, newQuantity) => updateQuantity(offerId, newQuantity)}
              onRemoveItem={offerId => removeFromCart(offerId)}
              onKeepShopping={handleKeepShopping}
              onContinueToCustomerDetails={handleContinueToFindOrCreateCustomer}
              onCartItemsUpdate={updatedItems => {
                updateCartItemsFromAPI(updatedItems);
              }}
            />
          </div>
        </div>
      )}

      {/* Find or Create Customer Modal */}
      {showFindOrCreateCustomer && (
        <FindOrCreateCustomer
          onBack={handleBackFromFindOrCreateCustomer}
          onClose={handleCloseFindOrCreateCustomer}
        />
      )}

      {/* Error Toast for market segment conflicts */}
      <ErrorToast
        show={showErrorToast}
        message={errorMessage}
        onClose={() => setShowErrorToast(false)}
        autoHideDelay={10000}
      />
    </Layout>
  );
}
