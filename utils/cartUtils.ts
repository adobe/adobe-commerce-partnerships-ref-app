import { generateExternalReferenceId, getSKUFromOfferId } from './commonUtils';
import type { CartItem } from '../contexts/CartContext';
import { HTTP_METHOD, ORDER_API_TYPE } from './constants';
import { Order } from '../models/Order';
import { PreviewLineItem } from '../types/order';
import { createClientLogger } from './logger';

const logger = createClientLogger('cartUtils');

/**
 * Converts cart items to line items format for order preview API
 * @param cartItems - Array of cart items with offerId and quantity
 * @returns Array of line items ready for preview API
 */
export const cartItemsToLineItems = (cartItems: any[]): any[] => {
  return cartItems.map((item, index) => ({
    extLineItemNumber: index + 1,
    offerId: item.offerId,
    quantity: item.quantity,
    ...(item.discountCode && { flexDiscountCodes: [item.discountCode] }),
  }));
};

/**
 * Calls order preview API for given line items
 * @param customerId - Customer ID for the order
 * @param lineItems - Line items for the order
 * @param currencyCode - Currency code for the order
 * @returns Order preview response data
 */
export async function fetchOrderPreview(
  customerId: string,
  lineItems: any[],
  currencyCode: string
): Promise<Order> {
  const url = `/api/orders?type=${ORDER_API_TYPE.PREVIEW}&fetch-price=true`;

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: customerId,
      externalReferenceId: generateExternalReferenceId(),
      currencyCode: currencyCode,
      lineItems,
    }),
  });

  if (!response.ok) {
    let errorMessage = `Order preview API failed: ${response.status} ${response.statusText}`;

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
    throw new Error('No line items returned from Order preview API');
  }

  return data;
}

/**
 * Updates cart items using SKU-based mapping from order preview API
 * Uses pricing data directly from the API response:
 * - pricePerUnit: netPartnerPrice
 * - lineItemTotal: lineItemPartnerPrice
 */
export function updateCartItemsWithSkuMapping<T extends CartItem>(
  cartItems: T[],
  previewLineItems: PreviewLineItem[]
): T[] {
  return cartItems.map(cartItem => {
    const cartSku = getSKUFromOfferId(cartItem.offerId);
    const previewItem = previewLineItems.find(item => getSKUFromOfferId(item.offerId) === cartSku);

    if (!previewItem) {
      logger.warn({ cartSku }, 'No preview item found for cart item');
      return cartItem;
    }

    return {
      ...cartItem,
      offerId: previewItem.offerId,
      pricePerUnit: previewItem.pricing?.netPartnerPrice,
      quantity: previewItem.quantity,
      lineItemTotal: previewItem.pricing?.lineItemPartnerPrice,
      id: previewItem.extLineItemNumber?.toString() || cartItem.id,
      currency: previewItem.currencyCode,
      discountCode: previewItem.flexDiscounts?.find(fd => fd.result === 'SUCCESS')?.code,
    } as T;
  });
}
