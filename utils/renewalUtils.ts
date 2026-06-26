/**
 * Utilities for renewal order operations
 */

import type { RenewalProduct } from '../types/AddAndEditCustomerRenewalOrder';
import type { Subscription } from '../models/Subscription';
import type { DiscountLevelsMap } from '../types/discountLevel';
import { CartItem } from '../contexts/CartContext';
import { SUBSCRIPTION_API_TYPE, HTTP_METHOD, ORDER_API_TYPE } from './constants';
import { Order } from '../models/Order';
import { updateCartItemsWithSkuMapping } from './cartUtils';
import {
  getDiscountLevelsFromOfferIdsAndQuantities,
  getBaseOfferIdForLicense,
} from './commonUtils';
import { createClientLogger } from './logger';

const logger = createClientLogger('renewalUtils');

/**
 * Convert cart items to NEW renewal products
 * Products from cart are always type='NEW' and autoRenewalEnabled=true
 *
 * @param cartItems - Object mapping offerId to quantity
 * @param cartItemDetailsMap - Object mapping offerId to cart item details
 * @returns Array of RenewalProducts with type='NEW'
 */
export function convertCartToAddToRenewalProducts(
  cartItemIdToQuantityMap: { [offerId: string]: number },
  cartItemIdToCartItemDetailsMap: { [offerId: string]: Omit<CartItem, 'quantity'> }
): RenewalProduct[] {
  return Object.entries(cartItemIdToQuantityMap).map(([offerId, quantity]) => {
    const details = cartItemIdToCartItemDetailsMap[offerId];
    return {
      offerId,
      productName: details?.productName || offerId,
      pricePerUnit: details?.pricePerUnit || 0,
      quantity,
      lineItemTotal: details?.lineItemTotal,
      productFamily: details?.productFamily,
      id: offerId,
      currency: details?.currency || '',
      marketSegment: details?.marketSegment,
      autoRenewalEnabled: true, // Always true for NEW (add to renewal) products
      type: 'NEW' as const,
      subscriptionId: undefined,
      discountCode: details?.discountCode || '',
    };
  });
}

/**
 * Convert subscriptions to EXISTING renewal products
 * Filters subscriptions and creates products with change tracking fields
 *
 * @param subscriptions - Array of customer subscriptions
 * @returns Array of RenewalProducts with type='EXISTING'
 */
export function convertSubscriptionsToExistingRenewalProducts(
  subscriptions: Subscription[]
): RenewalProduct[] {
  return subscriptions
    .filter(sub => sub.subscriptionId && sub.offerId && sub.currencyCode)
    .map(sub => ({
      offerId: sub.offerId!,
      productName: sub.offerId!,
      pricePerUnit: 0, // Will be filled by preview API
      quantity: sub.autoRenewal?.renewalQuantity || 0,
      productFamily: undefined,
      lineItemTotal: 0,
      id: sub.subscriptionId!,
      currency: sub.currencyCode!,
      marketSegment: undefined,
      autoRenewalEnabled: sub.autoRenewal?.enabled || false,
      type: 'EXISTING' as const,
      subscriptionId: sub.subscriptionId!,
      discountCode: sub.autoRenewal?.flexDiscountCodes?.[0],
    }));
}

export function prepareDataForDiscountLevelMapComputation(
  products: RenewalProduct[]
): Array<{ offerId: string; quantity: number }> {
  return products
    .filter(p => p.autoRenewalEnabled && p.offerId)
    .map(p => ({ offerId: p.offerId as string, quantity: p.quantity }));
}

export function computeDiscountLevelsMap(
  discountLevelsMap: DiscountLevelsMap,
  products: RenewalProduct[]
): DiscountLevelsMap {
  if (Object.keys(discountLevelsMap).length > 0) return discountLevelsMap;
  return getDiscountLevelsFromOfferIdsAndQuantities(
    prepareDataForDiscountLevelMapComputation(products)
  );
}

export function toggleAutoRenewal(
  products: RenewalProduct[],
  matchValue: string,
  matchKey: 'offerId' | 'subscriptionId'
): RenewalProduct[] {
  return products.map(p => {
    const isMatch = p[matchKey] === matchValue;
    if (isMatch) {
      const newAutoRenewalEnabled = !p.autoRenewalEnabled;
      return {
        ...p,
        autoRenewalEnabled: newAutoRenewalEnabled,
        quantity: newAutoRenewalEnabled && p.quantity === 0 ? 1 : p.quantity,
        pricePerUnit: 0,
        lineItemTotal: 0,
      };
    }
    return { ...p, pricePerUnit: 0, lineItemTotal: 0 };
  });
}

export function updateProductQuantity(
  products: RenewalProduct[],
  matchValue: string,
  quantity: number,
  matchKey: 'offerId' | 'subscriptionId'
): RenewalProduct[] {
  return products.map(p =>
    p[matchKey] === matchValue
      ? { ...p, quantity, pricePerUnit: 0, lineItemTotal: 0 }
      : { ...p, pricePerUnit: 0, lineItemTotal: 0 }
  );
}

export function applyPromoCode(
  products: RenewalProduct[],
  offerId: string,
  code: string
): RenewalProduct[] {
  return products.map(p =>
    p.offerId === offerId ? { ...p, discountCode: code, pricePerUnit: 0, lineItemTotal: 0 } : p
  );
}

export function removePromoCode(products: RenewalProduct[], offerId: string): RenewalProduct[] {
  return products.map(p =>
    p.offerId === offerId ? { ...p, discountCode: undefined, pricePerUnit: 0, lineItemTotal: 0 } : p
  );
}

export function shouldResetFlexDiscount(product: RenewalProduct, original: Subscription): boolean {
  return !product.discountCode && (original.autoRenewal?.flexDiscountCodes?.length ?? 0) > 0;
}

export const hasExistingProductChanged = (product: any, original: Subscription) => {
  const autoRenewalChanged =
    product.autoRenewalEnabled !== (original.autoRenewal?.enabled ?? false);

  const quantityChanged = product.quantity !== (original.autoRenewal?.renewalQuantity ?? 0);

  const originalDiscountCodes = original.autoRenewal?.flexDiscountCodes ?? [];
  const discountCodeChanged = product.discountCode
    ? !originalDiscountCodes.includes(product.discountCode)
    : originalDiscountCodes.length > 0;

  return autoRenewalChanged || quantityChanged || discountCodeChanged;
};

/**
 * Create a new renewal subscription (POST)
 * @param customerId - Customer ID
 * @param offerId - Offer ID (will be modified to base offer ID for license)
 * @param quantity - Renewal quantity
 * @param getBaseOfferId - Function to convert offerId to base offer ID
 * @returns Promise that resolves to the created subscription
 */
export const createRenewalSubscription = async (
  product: RenewalProduct,
  customerId: string
): Promise<any> => {
  const url = `/api/subscriptions?type=${SUBSCRIPTION_API_TYPE.CREATE_SUBSCRIPTION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
      offerId: getBaseOfferIdForLicense(product.offerId),
      autoRenewal: {
        enabled: true,
        renewalQuantity: product.quantity,
        ...(product.discountCode && { flexDiscountCodes: [product.discountCode] }),
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create subscription for ${product.offerId}`);
  }

  return await response.json();
};

/**
 * Update an existing renewal subscription (PATCH)
 * @param customerId - Customer ID
 * @param subscriptionId - Subscription ID to update
 * @param autoRenewalEnabled - Whether auto-renewal is enabled
 * @param renewalQuantity - Renewal quantity
 * @param flexDiscountCodes - Optional discount codes for the subscription
 * @returns Promise that resolves to the updated subscription
 */
export const updateRenewalSubscription = async (
  product: RenewalProduct,
  customerId: string,
  resetFlexDiscount?: boolean
): Promise<any> => {
  const params = new URLSearchParams();
  if (resetFlexDiscount) params.set('reset-flex-discount-codes', 'true');
  const qs = params.toString();
  const url = qs ? `/api/subscriptions?${qs}` : `/api/subscriptions`;

  const response = await fetch(url, {
    method: HTTP_METHOD.PATCH,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
      subscriptionId: product.subscriptionId,
      autoRenewal: {
        enabled: product.autoRenewalEnabled,
        renewalQuantity: product.quantity,
        ...(product.discountCode &&
          !resetFlexDiscount && { flexDiscountCodes: [product.discountCode] }),
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update subscription ${product.subscriptionId}`);
  }

  return await response.json();
};

/**
 * Calls renewal order preview API with only customerId (no lineItems)
 * Used for EditRenewalDialog to get pricing for all eligible renewal subscriptions
 * @param customerId - Customer ID for the renewal preview
 * @returns Order preview response data
 */
export async function fetchRenewalOrderPreview(customerId: string): Promise<Order> {
  const url = `/api/orders?type=${ORDER_API_TYPE.PREVIEW_RENEWAL}&fetch-price=true`;

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: customerId,
      orderType: 'PREVIEW_RENEWAL',
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
      logger.warn({ err: parseError }, 'Could not parse error response');
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.lineItems || data.lineItems.length === 0) {
    throw new Error('No line items returned from renewal order preview API');
  }

  return data;
}

/**
 * Fetches order preview and updates products with SKU-based mapping
 * Combines fetchOrderPreview/fetchRenewalOrderPreview + updateCartItemsWithSkuMapping for convenience
 *
 * @param products - Array of products to preview
 * @param customerId - Customer ID for the preview
 * @param useRenewalPreview - If true, calls fetchRenewalOrderPreview (no lineItems needed)
 * @returns Object containing updated products and pricing summaries with currency codes from response
 */
export async function fetchRenewalPreviewAndUpdateProducts<T extends CartItem>(
  products: T[],
  customerId: string
): Promise<{
  updatedProducts: T[];
  pricingSummaries: Array<{ totalLineItemPartnerPrice: number; currencyCode: string }>;
}> {
  let previewData: Order;

  previewData = await fetchRenewalOrderPreview(customerId);

  if (!previewData.lineItems || previewData.lineItems.length === 0) {
    throw new Error('No line items returned from preview API');
  }

  const updatedProducts = updateCartItemsWithSkuMapping(products, previewData.lineItems);

  const pricingSummaries =
    previewData.pricingSummary?.map(summary => ({
      totalLineItemPartnerPrice: summary.totalLineItemPartnerPrice,
      currencyCode: summary.currencyCode,
    })) || [];

  return {
    updatedProducts,
    pricingSummaries,
  };
}
