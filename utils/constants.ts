/**
 * Application Constants
 * Centralized location for constants used across the application
 */

// ============================================
// HTTP METHODS
// ============================================

/**
 * HTTP methods used in API routes
 */
export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  PUT: 'PUT',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
} as const;

/**
 * Custom HTTP headers used in API requests/responses
 */
export const HTTP_HEADER = {
  AUTHORIZATION: 'authorization',
  X_REQUEST_ID: 'x-request-id',
  CONTENT_TYPE: 'content-type',
} as const;

/**
 * Authorization header prefix
 */
export const AUTH_BEARER_PREFIX = 'Bearer ';

// ============================================
// API OPERATION TYPES
// ============================================

/**
 * Customer API operation types
 */
export const CUSTOMER_API_TYPE = {
  GET_CUSTOMER: 'getCustomer',
  GET_ALL_CUSTOMERS: 'getAllCustomers',
  CREATE_CUSTOMER: 'createCustomer',
  UPDATE_CUSTOMER: 'updateCustomer',
} as const;

/**
 * Reseller API operation types
 */
export const RESELLER_API_TYPE = {
  GET_RESELLER_DETAILS: 'getResellerDetails',
  GET_ALL_RESELLERS: 'getAllResellers',
  CREATE_RESELLER: 'createReseller',
} as const;

/**
 * Order API operation types
 */
export const ORDER_API_TYPE = {
  GET_ORDERS: 'getOrders',
  GET_ORDERS_HISTORY: 'getOrdersHistory',
  NEW: 'NEW',
  RETURN: 'Return',
  PREVIEW: 'Preview',
  PREVIEW_RENEWAL: 'PreviewRenewal',
  RENEWAL_ORDER: 'RenewalOrder',
} as const;

/**
 * Subscription API operation types
 */
export const SUBSCRIPTION_API_TYPE = {
  GET_SUBSCRIPTION_DETAILS: 'getSubscriptionDetails',
  GET_CUSTOMER_SUBSCRIPTIONS: 'getCustomerSubscriptions',
  CREATE_SUBSCRIPTION: 'createSubscription',
} as const;

// ============================================
// PRICING / DISCOUNT LEVELS
// ============================================

/**
 * Offer types for discount level mapping
 * LICENSE: Numeric discount levels (01, 02, 03, 04)
 * CONSUMABLES: Tier-based discount levels (T1, T2, etc.)
 * UNKNOWN: Cannot determine offer type from offerId
 */
export enum OfferType {
  LICENSE = 'LICENSE',
  CONSUMABLES = 'CONSUMABLES',
  UNKNOWN = 'UNKNOWN',
}
// ============================================
// ROUTES / URLs
// ============================================

/**
 * Application route paths
 */
export const ROUTES = {
  CUSTOMER_DETAILS: '/customerdetails',
} as const;

/**
 * Build customer details page URL with required parameters
 * @param customerId - Customer ID
 * @returns Full URL with query parameters
 */
export const buildCustomerDetailsUrl = (customerId: string, resellerId: string): string => {
  return `${ROUTES.CUSTOMER_DETAILS}?customerId=${customerId}&resellerId=${resellerId}`;
};
// ============================================
// RENEWAL
// ============================================

/**
 * Manual renewal window duration in days
 * Subscriptions with MANUAL_RENEWAL action have a 14-day window after the renewal date
 */
export const MANUAL_RENEWAL_WINDOW_DAYS = 14;

/**
 * License availability options for new orders
 */
export const LICENSE_AVAILABILITY = {
  NOW: 'now',
  AT_RENEWAL: 'atRenewal',
} as const;

export type LicenseAvailability = (typeof LICENSE_AVAILABILITY)[keyof typeof LICENSE_AVAILABILITY];

/**
 * Customer type tabs in the customer selection modal
 */
export const CUSTOMER_TAB = {
  EXISTING: 'existing',
  NEW: 'new',
} as const;

export type CustomerTab = (typeof CUSTOMER_TAB)[keyof typeof CUSTOMER_TAB];

// ============================================
// CUSTOMER VALIDATION
// ============================================

/**
 * Required fields for creating a new customer
 * These fields must be provided and non-empty when creating a new customer
 */
export const REQUIRED_CUSTOMER_FIELDS = [
  'companyName',
  'addressLine1',
  'city',
  'country',
  'region',
  'postalCode',
  'adminEmail',
  'adminFirstName',
  'adminLastName',
  'resellerId',
] as const;
