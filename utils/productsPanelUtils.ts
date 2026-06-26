import { getMarketSegmentDisplayName, getDiscountLevelFromOfferId } from './commonUtils';
import { getIconWithFallback } from './iconUtils';
import { OfferType } from './constants';
import { formatAnniversaryDate } from './customerDetailsUtils';

export interface ProductToDisplay {
  id: string;
  name: string;
  icon?: string;
  currentQuantity: number;
  usedQuantity: number;
  autoRenewal?: {
    enabled: boolean;
    renewalQuantity?: number;
  };
  renewalDate?: string;
  status: string;
  offerId?: string;
  partnerPrice?: string;
  discountLevelText?: string;
  currencyCode: string;
}
/**
 * Check if anniversary date is valid
 */
export const isValidAnniversaryDate = (anniversaryDate: string | undefined): boolean => {
  if (!anniversaryDate || anniversaryDate.trim() === '') return false;
  try {
    const cotermDate = new Date(anniversaryDate);
    return !isNaN(cotermDate.getTime());
  } catch {
    return false;
  }
};

/**
 * Transform raw subscription data into Product format
 */
export const transformSubscriptionToProductDisplay = (
  subscription: any,
  getProductName: (offerId: string) => string,
  getPartnerPrice?: (offerId: string) => string
): ProductToDisplay => {
  const lookupOfferId = subscription.modifiedOfferId || subscription.offerId;
  const productName = getProductName(lookupOfferId) || subscription.offerId;
  const discountLevel = getDiscountLevelFromOfferId(lookupOfferId);
  const discountLevelText = `Level ${discountLevel}`;

  return {
    id: subscription.subscriptionId,
    name: productName,
    icon: getIconWithFallback(productName, '48x48'),
    currentQuantity: subscription.currentQuantity || 0,
    usedQuantity: subscription.usedQuantity || 0,
    status: subscription.status,
    offerId: subscription.offerId, // Keep original offer ID for reference
    partnerPrice: getPartnerPrice ? getPartnerPrice(lookupOfferId) : undefined,
    discountLevelText,
    autoRenewal: subscription.autoRenewal
      ? {
          enabled: subscription.autoRenewal.enabled || false,
          renewalQuantity: subscription.autoRenewal.renewalQuantity || subscription.quantity,
        }
      : undefined,
    renewalDate: subscription.renewalDate || subscription.cotermDate,
    currencyCode: subscription.currencyCode,
  };
};
/**
 * Determine offer type from offerId by examining characters 10-11 (discount level position)
 * @param offerId - The offer ID to analyze
 * @returns OfferType enum value
 */
export const getOfferTypeFromId = (offerId: string): OfferType => {
  if (!offerId || offerId.length < 12) {
    return OfferType.UNKNOWN;
  }
  const levelChars = offerId.substring(10, 12);

  if (levelChars.startsWith('T')) {
    return OfferType.CONSUMABLES;
  } else {
    return OfferType.LICENSE;
  }
};

/**
 * Get the appropriate discount level for a specific offer type from customer discounts
 * @param customerDiscounts - Array of customer discount objects
 * @param offerType - The offer type to find discount for
 * @returns Discount level string or null if not found
 */
export const getDiscountLevelForOfferType = (
  customerDiscounts: any[],
  offerType: OfferType
): string | null => {
  if (!customerDiscounts || customerDiscounts.length === 0) {
    return null;
  }

  const discount = customerDiscounts.find(d => d.offerType === offerType);
  return discount?.level || null;
};
/**
 * Modify offerId by setting the 10th and 11th characters to the customer's discount level
 * Automatically determines offer type and applies the appropriate discount level
 * @param offerId - The offer ID to modify
 * @param customerDiscounts - Array of customer discount objects with offerType and level
 * @returns Modified offer ID, or original if no valid discount found
 */
export const modifyOfferIdForDiscountLevel = (
  offerId: string,
  customerDiscounts?: any[]
): string => {
  if (!offerId || offerId.length < 12 || !customerDiscounts || customerDiscounts.length === 0) {
    return offerId;
  }

  // Determine what type of offer this is
  const offerType = getOfferTypeFromId(offerId);

  if (offerType === OfferType.UNKNOWN) {
    return offerId;
  }

  const discountLevel = getDiscountLevelForOfferType(customerDiscounts, offerType);

  if (!discountLevel) {
    return offerId;
  }

  const paddedLevel = discountLevel.length === 1 ? discountLevel.padStart(2, '0') : discountLevel;
  const modifiedOfferId = offerId.substring(0, 10) + paddedLevel + offerId.substring(12);
  return modifiedOfferId;
};
