// Pricing utility functions

export interface PricingInfo {
  price: string;
  period: string;
  level: string;
}

/**
 * Get pricing information for a product based on its offer ID
 * @param offerId - The product's offer ID
 * @param getPartnerPricesByOfferIds - Function to get partner prices by offer IDs
 * @returns Pricing information object
 */
export function getPricingInfo(
  offerId: string | undefined,
  getPartnerPricesByOfferIds: (offerIds: string[]) => string[]
): PricingInfo {
  if (offerId) {
    const prices = getPartnerPricesByOfferIds([offerId]);
    const actualPrice = prices.length > 0 ? prices[0] : null;

    if (actualPrice) {
      return {
        price: `$${actualPrice}`,
        period: '/yr per license',
        level: 'Level 3',
      };
    }
  }

  // Fallback to N/A if no offerId or price found
  return {
    price: 'N/A',
    period: '',
    level: 'Level 3',
  };
}

/**
 * Get pricing information for a recommendation item
 * @param baseOfferId - The product's base offer ID (preferred)
 * @param offerId - The product's offer ID (fallback)
 * @param getPartnerPricesByOfferIds - Function to get partner prices by offer IDs
 * @returns Pricing information object
 */
export function getRecommendationPricingInfo(
  baseOfferId: string | undefined,
  offerId: string | undefined,
  getPartnerPricesByOfferIds: (offerIds: string[]) => string[]
): PricingInfo {
  // Use baseOfferId for pricing (matches active products format)
  const pricingOfferId = baseOfferId || offerId;
  return getPricingInfo(pricingOfferId, getPartnerPricesByOfferIds);
}
