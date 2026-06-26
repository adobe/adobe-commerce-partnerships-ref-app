/**
 * Type definitions for late renewal operations
 */

import { Subscription } from '../models/Subscription';

/**
 * Subscription with additional pricing fields for late renewal flow
 */
export interface SubscriptionToRenew extends Subscription {
  pricePerLicense?: number;
  lineItemPartnerPrice?: number;
}

/**
 * Renewal data format for API submission (before converting to LineItem)
 */
export interface RenewalDataToSubmit {
  subscriptionId: string;
  offerId: string;
  quantity: number;
  currencyCode: string;
  discountCode?: string;
}
