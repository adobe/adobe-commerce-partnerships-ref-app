/**
 * Utility functions for renewal order preview and submission, shared by the
 * Late Renewal and Early Renewal order dialogs.
 */

import { LineItem, Order } from '../models/Order';
import { MANUAL_RENEWAL_WINDOW_DAYS, ORDER_API_TYPE, HTTP_METHOD } from './constants';
import { SubscriptionToRenew, RenewalDataToSubmit } from '../types/lateRenewal';

/**
 * Initialize quantities from subscriptions
 */
export const initializeQuantities = (
  subscriptions: SubscriptionToRenew[]
): { [key: string]: number } => {
  const quantities: { [key: string]: number } = {};
  subscriptions.forEach(sub => {
    if (sub.subscriptionId) {
      quantities[sub.subscriptionId] = sub.currentQuantity || 0;
    }
  });
  return quantities;
};

/**
 * Initialize renewal states (default to true for all)
 */
export const initializeRenewalStates = (
  subscriptions: SubscriptionToRenew[]
): { [key: string]: boolean } => {
  const renewalStates: { [key: string]: boolean } = {};
  subscriptions.forEach(sub => {
    if (sub.subscriptionId) {
      renewalStates[sub.subscriptionId] = true;
    }
  });
  return renewalStates;
};

/**
 * Calculate total licenses for subscriptions marked for renewal
 */
export const calculateTotalLicenses = (
  subscriptions: SubscriptionToRenew[],
  quantities: { [key: string]: number },
  renewalStates: { [key: string]: boolean }
): number => {
  return subscriptions.reduce((sum, sub) => {
    if (!sub.subscriptionId || !renewalStates[sub.subscriptionId]) return sum;
    return sum + (quantities[sub.subscriptionId] || 0);
  }, 0);
};

/**
 * Calculate days until renewal window closes
 */
export const calculateDaysUntilClose = (subscriptions: SubscriptionToRenew[]): number => {
  const manualRenewalSub = subscriptions.find(
    sub => sub.allowedActions && sub.allowedActions.includes('MANUAL_RENEWAL')
  );

  if (!manualRenewalSub?.renewalDate) return 0;

  const renewalDate = new Date(manualRenewalSub.renewalDate);
  const today = new Date();

  // Calculate the end of the manual renewal window
  const windowEndDate = new Date(renewalDate);
  windowEndDate.setDate(windowEndDate.getDate() + MANUAL_RENEWAL_WINDOW_DAYS);

  // Calculate days remaining
  const timeDiff = windowEndDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
};

/**
 * Format renewal window close date
 */
export const formatRenewalWindowCloseDate = (subscriptions: SubscriptionToRenew[]): string => {
  const manualRenewalSub = subscriptions.find(
    sub => sub.allowedActions && sub.allowedActions.includes('MANUAL_RENEWAL')
  );

  if (!manualRenewalSub?.renewalDate) return '';

  const renewalDate = new Date(manualRenewalSub.renewalDate);
  const windowEndDate = new Date(renewalDate);
  windowEndDate.setDate(windowEndDate.getDate() + MANUAL_RENEWAL_WINDOW_DAYS);

  return windowEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Prepare renewal data for API submission
 */
export const prepareRenewalData = (
  subscriptions: SubscriptionToRenew[],
  renewalStates: { [key: string]: boolean },
  quantities: { [key: string]: number }
): RenewalDataToSubmit[] => {
  return subscriptions
    .filter(sub => sub.subscriptionId && renewalStates[sub.subscriptionId])
    .map(sub => ({
      subscriptionId: sub.subscriptionId!,
      offerId: sub.offerId || '', // Use original offer ID for API submission
      quantity: quantities[sub.subscriptionId!] || 0,
      currencyCode: sub.currencyCode!,
      ...(sub.autoRenewal?.flexDiscountCodes?.[0] && {
        discountCode: sub.autoRenewal.flexDiscountCodes[0],
      }),
    }));
};

/**
 * Convert renewal items to line items format for API calls
 * @param renewalItems - Array of renewal items with subscriptionId, offerId and quantity
 * @returns Array of line items formatted for API submission
 */
export const renewalItemsToLineItems = (renewalItems: RenewalDataToSubmit[]): LineItem[] => {
  return renewalItems.map((item, index) => ({
    extLineItemNumber: index + 1,
    offerId: item.offerId,
    quantity: item.quantity,
    subscriptionId: item.subscriptionId,
    ...(item.discountCode && { flexDiscountCodes: [item.discountCode] }),
  }));
};
/**
 * Fetch renewal order preview API
 * @param customerId - Customer ID
 * @param lineItems - Line items with subscription details
 * @param currencyCode - Currency code
 * @returns Order preview response
 */
export const fetchRenewalOrderPreview = async (
  customerId: string,
  lineItems: LineItem[],
  currencyCode: string
): Promise<Order> => {
  const url = `/api/orders?type=${ORDER_API_TYPE.PREVIEW_RENEWAL}&fetch-price=true`;

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: customerId,
      orderType: 'PREVIEW_RENEWAL',
      lineItems,
      currencyCode: currencyCode,
    }),
  });

  if (!response.ok) {
    let errorMessage = `Renewal order preview API failed: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
        if (errorData.additionalDetails && errorData.additionalDetails.length > 0) {
          errorMessage += ` - ${errorData.additionalDetails.join(', ')}`;
        }
      }
    } catch (parseError) {
      errorMessage = 'Could not parse error data';
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.lineItems || data.lineItems.length === 0) {
    throw new Error('No line items returned from renewal order preview API');
  }

  return data;
};

/**
 * Place/create a renewal order
 * @param customerId - Customer ID
 * @param externalReferenceId - External reference ID for the order
 * @param currencyCode - Currency code
 * @param lineItems - Line items with subscription details
 * @returns Renewal order response
 */
export const placeRenewalOrder = async (
  customerId: string,
  externalReferenceId: string,
  currencyCode: string,
  lineItems: LineItem[]
): Promise<Order> => {
  const url = `/api/orders?type=${ORDER_API_TYPE.RENEWAL_ORDER}`;

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      externalReferenceId,
      currencyCode,
      lineItems,
      orderType: 'RENEWAL',
    }),
  });

  if (!response.ok) {
    let errorMessage = `Renewal order API failed: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();

      if (errorData.message) {
        errorMessage = errorData.message;
        if (errorData.additionalDetails && errorData.additionalDetails.length > 0) {
          errorMessage += ` - ${errorData.additionalDetails.join(', ')}`;
        }
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (parseError) {
      // Could not parse error response, will use default error message
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
};

/**
 * Update subscriptions with new offer IDs and prices from preview API
 * @param subscriptions - Original subscriptions
 * @param previewLineItems - Line items from preview API response with pricing
 * @returns Updated subscriptions with new offer IDs and prices
 */
export const updateSubscriptionsWithPreview = (
  subscriptions: SubscriptionToRenew[],
  previewLineItems: LineItem[]
): SubscriptionToRenew[] => {
  return subscriptions.map(sub => {
    // Find matching preview item by subscriptionId
    const previewItem = previewLineItems.find(item => item.subscriptionId === sub.subscriptionId);

    if (!previewItem) {
      return sub;
    }

    const pricePerLicense = (previewItem as any).pricing?.netPartnerPrice;
    const lineItemPartnerPrice = (previewItem as any).pricing?.lineItemPartnerPrice;
    const successDiscountCode = (previewItem as any).flexDiscounts?.find(
      (fd: any) => fd.result === 'SUCCESS'
    )?.code;

    return {
      ...sub,
      offerId: previewItem.offerId,
      pricePerLicense: pricePerLicense,
      lineItemPartnerPrice: lineItemPartnerPrice,
      autoRenewal: {
        ...sub.autoRenewal,
        flexDiscountCodes: successDiscountCode ? [successDiscountCode] : undefined,
      },
    };
  });
};
