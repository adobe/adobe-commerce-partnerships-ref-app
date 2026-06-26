import type { DiscountLevelsMap } from '../types/discountLevel';
import { logger as baseLogger } from './logger';

const logger = baseLogger.child({ module: 'commonUtils' });

export const getMarketSegmentDisplayName = (segment: string) => {
  const segmentMap: { [key: string]: string } = {
    EDU: 'Education',
    COM: 'Commercial',
    GOV: 'Government',
  };
  return segmentMap[segment] || segment;
};

/**
 * Convert UI market segment values to API codes
 */
export const getMarketSegmentCode = (uiValue: string): string => {
  switch (uiValue) {
    case 'Commercial':
      return 'COM';
    case 'Education':
      return 'EDU';
    case 'Government':
      return 'GOV';
    default:
      return 'COM';
  }
};

/**
 * Extract market segment from offerId based on 10th character
 * A = COM (Commercial), B = EDU (Education), C = GOV (Government)
 */
export const getMarketSegmentFromOfferId = (offerId: string): string => {
  if (!offerId || offerId.length < 10) {
    return 'COM'; // Default to Commercial
  }

  const tenthChar = offerId.charAt(9).toUpperCase(); // 10th character (0-indexed)

  switch (tenthChar) {
    case 'A':
      return 'COM';
    case 'B':
      return 'EDU';
    case 'C':
      return 'GOV';
    default:
      return 'COM';
  }
};

/**
 * Extract discount level from offerId
 * The discount level is stored at positions 10-11 (0-indexed) in the offer ID
 * Example: 65304840CA01A12 -> "01"
 * Example: 65304840CAT1A12 -> "T1"
 */
export const getDiscountLevelFromOfferId = (offerId: string): string => {
  if (!offerId || offerId.length < 12) return '01';
  return offerId.substring(10, 12);
};
/**
 * Extract quantity and discount levels from offerIds and quantities, separated by type
 * @param items - Array of objects with offerId and quantity properties
 * @returns Map with LICENSE and TRANSACTION keys, each containing quantity and discount level
 */
export const getDiscountLevelsFromOfferIdsAndQuantities = (
  items: Array<{ offerId: string; quantity?: number }>
): DiscountLevelsMap => {
  const result: DiscountLevelsMap = {};

  if (!items || items.length === 0) {
    return result;
  }

  const licenseOfferIds: string[] = [];
  const transactionOfferIds: string[] = [];
  let licenseQty = 0;
  let transactionQty = 0;

  items.forEach(item => {
    if (!item.offerId) return;
    const level = getDiscountLevelFromOfferId(item.offerId);
    const quantity = item.quantity || 0;

    if (level.startsWith('T')) {
      transactionOfferIds.push(item.offerId);
      transactionQty += quantity;
    } else {
      licenseOfferIds.push(item.offerId);
      licenseQty += quantity;
    }
  });

  if (licenseQty > 0 && licenseOfferIds.length > 0) {
    const level = getDiscountLevelFromOfferId(licenseOfferIds[0]);
    result.LICENSE = {
      quantity: licenseQty,
      discountLevel: `Level ${level} discount`,
    };
  }

  if (transactionQty > 0 && transactionOfferIds.length > 0) {
    const level = getDiscountLevelFromOfferId(transactionOfferIds[0]);
    result.TRANSACTION = {
      quantity: transactionQty,
      discountLevel: `Tier ${level} discount`,
    };
  }

  return result;
};

/**
 * Calculate discount levels map with cleared discount level strings (quantities only)
 * Used when quantities change and discount levels need to be cleared until prices are updated
 * @param items - Array of objects with offerId and quantity properties
 * @returns Map with LICENSE and TRANSACTION keys, each containing quantity and empty discount level string
 */
export const getDiscountLevelsMapWithClearedLevels = (
  items: Array<{ offerId: string; quantity?: number }>
): DiscountLevelsMap => {
  const updatedMap = getDiscountLevelsFromOfferIdsAndQuantities(items);
  return {
    LICENSE: updatedMap.LICENSE
      ? { quantity: updatedMap.LICENSE.quantity, discountLevel: '' }
      : undefined,
    TRANSACTION: updatedMap.TRANSACTION
      ? { quantity: updatedMap.TRANSACTION.quantity, discountLevel: '' }
      : undefined,
  };
};

/**
 * Get formatted discount level label from offerId
 * Returns "Level X" where X is the discount level extracted from the offer ID
 * Defaults to "Level 1" if offerId is invalid or not provided
 */
export const getDiscountLevelLabel = (offerId?: string): string => {
  if (!offerId) return 'Level 1';
  const level = getDiscountLevelFromOfferId(offerId);
  return level ? `Level ${level}` : 'Level 1';
};

/**
 * Determine product type based on productFamily
 */
export const getProductType = (productFamily: string | undefined): 'Teams' | 'Enterprise' => {
  if (!productFamily) return 'Teams';
  return productFamily.toLowerCase().includes('enterprise') ? 'Enterprise' : 'Teams';
};

/**
 * Extract X-Request-Id from backend response headers (case-insensitive)
 */
export function extractRequestIdFromResponse(response: Response): string | undefined {
  return (
    response.headers.get('X-Request-Id') ||
    response.headers.get('x-request-id') ||
    response.headers.get('X-REQUEST-ID') ||
    undefined
  );
}

/**
 * Forward X-Request-Id to API route response if available
 */
export function forwardRequestIdHeader(res: any, requestId?: string): void {
  const { HTTP_HEADER } = require('./constants');
  if (requestId) {
    res.setHeader(HTTP_HEADER.X_REQUEST_ID, requestId);
  }
}

/**
 * Get the current price month in YYYYMM format
 * @returns String representation of current year and month (e.g., "202509")
 */
export const getCurrentPriceMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}${month}`;
};

/**
 * Format price using Intl.NumberFormat with currency support
 * @param price - The numeric price value
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param locale - The locale string for formatting (defaults to 'en-US')
 * @returns Formatted price string with currency symbol
 */
export const formatPrice = (price: number, currency: string, locale: string = 'en-US'): string => {
  if (!currency) return price.toFixed(2);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * Format total count - show 10000+ if exactly 10000
 * @param count - The count to format
 * @returns Formatted count string
 */
export const formatTotalCount = (count: number): string => {
  return count === 10000 ? '10000+' : count.toString();
};

/**
 * Get customer ID based on market segment for order preview API calls
 * @param marketSegment - The market segment (COMMERCIAL, GOV, EDU)
 * @returns The appropriate customer ID for the market segment
 */
export const getCustomerIdForMarketSegment = (marketSegment?: string): string => {
  if (!marketSegment) return '1234567890'; // Default to COMMERCIAL

  const segment = marketSegment.toUpperCase();
  switch (segment) {
    case 'GOV':
    case 'GOVERNMENT':
      return '1234567890GOV';
    case 'EDU':
    case 'EDUCATION':
      return '1234567890EDU';
    case 'COMMERCIAL':
    default:
      return '1234567890COM';
  }
};

/**
 * Extracts the SKU from an offerId
 * SKU is the first 8 characters of the offerId
 * @param offerId - The offer ID to extract SKU from
 * @returns The SKU (first 8 characters)
 */
export const getSKUFromOfferId = (offerId: string): string => {
  return offerId.substring(0, 8);
};

/**
 * Generate a unique external reference ID for orders from Bridge
 * Format: bridge-{short-timestamp}{random} (e.g., bridge-3k9m2p7x4q)
 * @returns A compact unique reference ID string
 */
export const generateExternalReferenceId = (): string => {
  // Use base36 encoding for compact format
  const timestamp = Date.now().toString(36); // Converts to base36 (shorter)
  const random = Math.random().toString(36).substring(2, 8); // 6 random chars
  return `bridge-${timestamp}${random}`;
};
/**
 * Convert subscription status codes to readable labels
 * @param statusCode - The subscription status code
 * @returns Readable status label
 */
export const getSubscriptionStatusLabel = (statusCode: string): string => {
  const statusMap: { [key: string]: string } = {
    '1000': 'Active',
    '1002': 'Pending',
    '1004': 'Inactive',
    '1009': 'Scheduled',
  };
  return statusMap[statusCode] || statusCode;
};

/**
 * Format date string to US format (MM/DD/YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string in US format
 */
export const formatDateToUS = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Check if "At Renewal" option should be disabled based on anniversary date
 * Enabled only when current date is between 30 days before and 3 days before anniversary date
 * @param anniversaryDate - Anniversary date string in US format (MM/DD/YYYY) or null
 * @returns true if "At Renewal" should be disabled, false otherwise
 */
export const isAtRenewalDisabled = (anniversaryDate: string | null): boolean => {
  // If no anniversary date, disable "At Renewal"
  if (!anniversaryDate) {
    return true;
  }
  try {
    const today = new Date();
    const anniversary = new Date(anniversaryDate);

    const thirtyDaysBefore = new Date(anniversary);
    thirtyDaysBefore.setDate(anniversary.getDate() - 30);

    const threeDaysBefore = new Date(anniversary);
    threeDaysBefore.setDate(anniversary.getDate() - 3);

    if (today >= thirtyDaysBefore && today <= threeDaysBefore) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ err: error }, 'Error calculating renewal availability');
    return true;
  }
};

/**
 * Format date string to localized short format (e.g., "Jan 15, 2024")
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
/**
 * Get order status text from status code
 * @param status - The order status code
 * @returns Human-readable status text
 */
export const getOrderStatusText = (status: string): string => {
  switch (status) {
    case '1000':
      return 'Fulfilled';
    case '1002':
      return 'Open';
    case '1004':
      return 'Failed';
    case '1008':
      return 'Cancelled';
    default:
      return status;
  }
};

/**
 * Get order type text from order type code
 * @param orderType - The order type code
 * @returns Human-readable order type text
 */
export const getOrderTypeText = (orderType: string): string => {
  switch (orderType) {
    case 'NEW':
      return 'Add items';
    case 'RENEWAL':
      return 'Renewal order';
    case 'RETURN':
      return 'Return items';
    default:
      return orderType;
  }
};

export const handlePrerequisites = async (_req: any): Promise<{ accessToken: string }> => {
  const { getAccessToken } = require('./imsTokenService');

  const accessToken = await getAccessToken();

  return { accessToken };
};
export const getBaseOfferIdForLicense = (offerId: string): string => {
  return offerId.substring(0, 10) + '01' + offerId.substring(12);
};
