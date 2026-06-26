import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Heading } from '@react-spectrum/s2';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import { useProductNamesFromPricelist } from '../../hooks/useProductPricing';
import { getPriceListType } from '../../utils/customerDetailsUtils';
import { getIconWithFallback } from '../../utils/iconUtils';
import { usePartnerDetails } from '../../contexts/PartnerContext';
import { useCart } from '../../contexts/CartContext';
import { modifyOfferIdForDiscountLevel } from '../../utils/productsPanelUtils';
import {
  formatPrice,
  getDiscountLevelFromOfferId,
  isAtRenewalDisabled,
  getSKUFromOfferId,
} from '../../utils/commonUtils';
import BuyRecommendedProduct from './BuyRecommendedProduct';
import { SuccessToast } from '../../utils/ToastMessageUtils';
import styles from '../../styles/customerdetails/PersonalizedRecommendations.module.css';
import ChevronUp from '@react-spectrum/s2/icons/ChevronUp';
import AddAndEditCustomerRenewalOrderDialog from '../renewal/AddAndEditCustomerRenewalOrderDialog';

interface PersonalizedRecommendationsProps {
  customerId?: string;
  customerName?: string;
  resellerId?: string;
  anniversaryDate?: string;
  customerDiscounts?: any[];
  marketSegment?: string;
  customerBenefits?: any[];
}

interface SelectedProduct {
  offerId: string;
  productName: string;
  partnerPrice: number;
  currency: string;
  productIcon: string;
}

interface RecommendationProduct {
  baseOfferId: string;
}

interface RecommendationItem {
  rank: number;
  product: RecommendationProduct;
}

interface GroupedRecommendations {
  upsells: RecommendationItem[];
  crossSells: RecommendationItem[];
  addOns: RecommendationItem[];
}

// Fetch recommendations function
const fetchCustomerRecommendations = async (
  customerId: string
): Promise<GroupedRecommendations> => {
  const url = `/api/recommendation?recommendationContext=GENERIC&customerId=${customerId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations: ${response.status}`);
  }
  const data = await response.json();
  const recommendations = data.productRecommendations;
  return {
    upsells: recommendations?.upsells || [],
    crossSells: recommendations?.crossSells || [],
    addOns: recommendations?.addOns || [],
  };
};

export default function PersonalizedRecommendations({
  customerId,
  customerName,
  resellerId,
  anniversaryDate,
  customerDiscounts,
  marketSegment,
  customerBenefits,
}: PersonalizedRecommendationsProps) {
  const [isRecommendationsExpanded, setIsRecommendationsExpanded] = useState(true);
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [isAtRenewalDialogOpen, setIsAtRenewalDialogOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const queryClient = useQueryClient();
  const { region, regionCurrencies } = usePartnerDetails();
  const { addToCart, setShowCartModal, setCustomerInfoInCart, cartItemIdToQuantityMap } = useCart();

  // Fetch recommendations data
  const {
    data: groupedRecommendations = { upsells: [], crossSells: [], addOns: [] },
    isLoading: recommendationsLoading,
  } = useQuery({
    queryKey: ['recommendations', customerId],
    queryFn: () => fetchCustomerRecommendations(customerId!),
    enabled: !!customerId,
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: 1500,
  });

  // Combine all recommendations for pricing lookup
  const allRecommendations = [
    ...groupedRecommendations.upsells,
    ...groupedRecommendations.crossSells,
    ...groupedRecommendations.addOns,
  ];

  // Create recommendations with modified offer IDs for customer-specific pricing
  const recommendationsWithModifiedIds = allRecommendations.map(rec => ({
    ...rec,
    modifiedOfferId: rec.product.baseOfferId
      ? modifyOfferIdForDiscountLevel(rec.product.baseOfferId, customerDiscounts)
      : rec.product.baseOfferId,
  }));

  const priceListType = getPriceListType(customerBenefits);
  const recommendationContexts = recommendationsWithModifiedIds
    .filter(rec => rec.modifiedOfferId) // Filter out recommendations without modified offer ID
    .map(rec => ({
      offerId: rec.modifiedOfferId!,
      currencyCode: regionCurrencies.length > 0 ? regionCurrencies[0].currency : '',
      region,
      priceListType,
    }));

  // Get product names and pricing from pricelist API for recommendations
  const { getProductName, getPartnerPrice } = useProductNamesFromPricelist(recommendationContexts);

  // Check if "Add to renewal" option should be available (not disabled)
  const shouldShowRenewalOption = !isAtRenewalDisabled(anniversaryDate || null);

  // Handler for "Buy Now" action
  const handleBuyNow = (
    offerId: string,
    productName: string,
    partnerPrice: number,
    currency: string
  ) => {
    // Save customer info to localStorage when buying from recommended offers
    if (customerId && customerName && resellerId) {
      setCustomerInfoInCart({
        customerId,
        customerName,
        resellerId,
      });
    }

    addToCart(offerId, productName, partnerPrice, currency, marketSegment, productName, 1);

    // Show cart modal after adding item
    setShowCartModal(true);
  };

  // Handler for "Add to Renewal" action
  const handleAddToRenewal = (
    offerId: string,
    productName: string,
    partnerPrice: number,
    currency: string
  ) => {
    // Save customer info to localStorage
    if (customerId && customerName && resellerId) {
      setCustomerInfoInCart({
        customerId,
        customerName,
        resellerId,
      });
    }

    addToCart(offerId, productName, partnerPrice, currency, marketSegment, productName, 1);
    setIsBuyDialogOpen(false);
    setSelectedProduct(null);
    setIsAtRenewalDialogOpen(true);
  };

  // Handler for successful renewal save
  const handleRenewalSuccess = () => {
    // Show success toast
    setShowSuccessToast(true);

    // Invalidate subscriptions query to refresh data
    if (customerId) {
      queryClient.invalidateQueries({
        queryKey: ['customerDetails', 'subscriptions', customerId],
      });
    }
  };

  // Helper function to render a recommendation card
  const renderRecommendationCard = (recommendation: any, index: number) => {
    const modifiedOfferId = recommendation.modifiedOfferId;
    const productName = (modifiedOfferId ? getProductName(modifiedOfferId) : null) || 'Product';
    const productIcon = getIconWithFallback(productName, '48x48');
    const partnerPrice = modifiedOfferId ? getPartnerPrice(modifiedOfferId) : undefined;
    const discountLevel = modifiedOfferId ? getDiscountLevelFromOfferId(modifiedOfferId) : '01';
    const discountLevelText = `Level ${discountLevel}`;
    const partnerCurrency = regionCurrencies.length > 0 ? regionCurrencies[0].currency : '';

    // Check if this product is in the cart by matching SKU
    const productSku = modifiedOfferId ? getSKUFromOfferId(modifiedOfferId) : '';
    const cartEntry = Object.entries(cartItemIdToQuantityMap).find(([cartOfferId]) => {
      return getSKUFromOfferId(cartOfferId) === productSku;
    });
    const isInCart = !!cartEntry;
    const cartQuantity = cartEntry ? cartEntry[1] : 0;

    return (
      <div
        key={`recommendation-${recommendation.rank}-${index}`}
        className={styles.recommendationCard}
      >
        {/* Left side with gradient background - full height, no gaps */}
        <div className={styles.gradientSidebar}></div>

        {/* Right side content */}
        <div className={styles.cardContent}>
          <div className={styles.productHeader}>
            <img src={productIcon} alt={`${productName} icon`} className={styles.productIcon} />
            <div className={styles.productName}>{productName}</div>
          </div>

          <div className={styles.pricingSection}>
            <div className={styles.pricingInfo}>
              <div className={styles.pricingTier}>Partner price, {discountLevelText}</div>
              <div className={styles.pricingAmount}>
                {partnerPrice
                  ? `${formatPrice(parseFloat(partnerPrice), partnerCurrency || 'N/A')}/yr per license`
                  : ''}
              </div>
            </div>
            {isInCart ? (
              <div className={styles.cartQuantityDisplay}>
                <span className={styles.cartQuantityText}>{cartQuantity} in cart</span>
              </div>
            ) : (
              <Button
                variant="accent"
                fillStyle={'fill'}
                onPress={() => {
                  const currency = regionCurrencies[0].currency;
                  const partnerPriceValue = partnerPrice ? parseFloat(partnerPrice) : 0;

                  // If renewal option is available, show dialog
                  if (shouldShowRenewalOption) {
                    setSelectedProduct({
                      offerId: modifiedOfferId,
                      productName,
                      partnerPrice: partnerPriceValue,
                      currency,
                      productIcon,
                    });
                    setIsBuyDialogOpen(true);
                  } else {
                    // Directly add to cart if renewal option is not available
                    handleBuyNow(modifiedOfferId, productName, partnerPriceValue, currency);
                  }
                }}
              >
                Buy
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles.container}>
        {/* Personalized Recommendations Header */}
        <div
          className={styles.header}
          onClick={() => setIsRecommendationsExpanded(!isRecommendationsExpanded)}
        >
          {isRecommendationsExpanded ? <ChevronUp /> : <ChevronDown />}
          <Heading level={2}>Personalized recommendations</Heading>
        </div>

        {/* Personalized Recommendations Content - Collapsible */}
        {isRecommendationsExpanded && (
          <>
            {recommendationsLoading ? (
              <div className={styles.emptyState}>Loading recommendations...</div>
            ) : recommendationsWithModifiedIds.length > 0 ? (
              <div className={styles.grid}>
                {recommendationsWithModifiedIds.map((recommendation, index) =>
                  renderRecommendationCard(recommendation, index)
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>No recommendations available</div>
            )}
          </>
        )}
      </div>

      {/* Buy Recommended Product Dialog */}
      {selectedProduct && (
        <BuyRecommendedProduct
          open={isBuyDialogOpen}
          onClose={() => {
            setIsBuyDialogOpen(false);
            setSelectedProduct(null);
          }}
          productName={selectedProduct.productName}
          productIcon={selectedProduct.productIcon}
          price={formatPrice(selectedProduct.partnerPrice, selectedProduct.currency)}
          customerName={customerName || 'Customer'}
          anniversaryDate={anniversaryDate}
          onBuyNow={() => {
            handleBuyNow(
              selectedProduct.offerId,
              selectedProduct.productName,
              selectedProduct.partnerPrice,
              selectedProduct.currency
            );
          }}
          onAddToRenewal={() => {
            handleAddToRenewal(
              selectedProduct.offerId,
              selectedProduct.productName,
              selectedProduct.partnerPrice,
              selectedProduct.currency
            );
          }}
        />
      )}

      {/* At Renewal Dialog */}
      <AddAndEditCustomerRenewalOrderDialog
        isOpen={isAtRenewalDialogOpen}
        onClose={() => setIsAtRenewalDialogOpen(false)}
        anniversaryDate={anniversaryDate || ''}
        onSuccess={handleRenewalSuccess}
        customerId={customerId}
      />

      {/* Success Toast */}
      <SuccessToast
        show={showSuccessToast}
        message="Added to renewal successfully!"
        onClose={() => setShowSuccessToast(false)}
        autoHideDelay={5000}
      />
    </>
  );
}
