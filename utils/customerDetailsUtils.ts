// Data processing utilities for customer details

import type { Subscription } from '../models/Subscription';
import type { CustomerDetails } from '../models/CustomerDetails';
import { SUBSCRIPTION_API_TYPE } from './constants';

/**
 * Fetch customer subscriptions from API
 * @param customerId - Customer ID to fetch subscriptions for
 * @returns Promise resolving to array of subscriptions
 */
export const fetchCustomerSubscriptions = async (customerId: string): Promise<Subscription[]> => {
  const url = `/api/subscriptions?type=${SUBSCRIPTION_API_TYPE.GET_CUSTOMER_SUBSCRIPTIONS}&customerId=${customerId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch subscriptions: ${response.status}`);
  }

  return response.json();
};

/**
 * Filter subscriptions that are eligible for renewal updates
 * Only subscriptions with status '1000' (Active) or '1009' (Suspended) can be updated
 * @param subscriptions - Array of customer subscriptions
 * @returns Filtered array of subscriptions eligible for renewal updates
 */
export const computeSubscriptionsEligibleForRenewalUpdate = (
  subscriptions: Subscription[]
): Subscription[] => {
  return subscriptions.filter(sub => sub.status === '1000' || sub.status === '1009');
};

/**
 * Formats an address object into a readable string
 * @param address - Address object with optional fields
 * @returns Formatted address string or 'N/A' if no address
 */
export const formatAddress = (address: any): string => {
  if (!address) return 'N/A';

  return (
    [
      [address.addressLine1, address.addressLine2].filter(Boolean).join(', '),
      [address.city, address.region].filter(Boolean).join(', ') +
        (address.country ? `, ${address.country}` : '') +
        (address.postalCode ? ` - ${address.postalCode}` : ''),
    ]
      .filter(Boolean)
      .join('\n') || 'N/A'
  );
};

/**
 * Formats an anniversary date with days to renewal calculation
 * @param cotermDate - The coterm date string
 * @returns Formatted date string with days to renewal or 'N/A'/'Invalid Date'
 */
export const formatAnniversaryDate = (cotermDate: string): string => {
  if (!cotermDate) return 'N/A';

  const date = new Date(cotermDate);
  if (isNaN(date.getTime())) return '';

  const targetDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const daysLeft = Math.round((targetDate.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));

  return `${date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })} (${daysLeft} days to renewal)`;
};

/**
 * Formats discount levels into readable strings
 * @param discounts - Array of discount objects
 * @returns Formatted discount level string or 'N/A' if no discounts
 */
export const formatDiscountLevel = (discounts: any[]): string => {
  if (!discounts || discounts.length === 0) return 'N/A';

  return discounts
    .map(discount => {
      const offerType = discount.offerType?.toUpperCase();
      const level = discount.level || '';

      const typeMapping: { [key: string]: string } = {
        LICENSE: `Licenses - Level ${level}`,
        TRANSACTION: `Transactions - Tier ${level}`,
      };

      return typeMapping[offerType] || `${discount.offerType} - Level ${level}`;
    })
    .join('\n');
};

/**
 * Formats customer discount levels for display in the customer header
 * @param discounts - Array of discount objects with offerType and level
 * @returns Formatted discount string with comma separation (e.g., "Level 01 discount, Tier T1 discount")
 */
export const formatCustomerDiscountsForHeader = (discounts: any[]): string => {
  if (!discounts || discounts.length === 0) return '';

  return discounts
    .map(discount => {
      const offerType = discount.offerType?.toUpperCase();
      const level = discount.level || '';

      const typeMapping: { [key: string]: string } = {
        LICENSE: `Level ${level} discount`,
        CONSUMABLES: `Tier ${level} discount`,
      };

      return typeMapping[offerType] || `${discount.offerType} - Level ${level}`;
    })
    .join(', ');
};

/**
 * Formats admin contacts into a simplified array
 * @param contacts - Array of contact objects
 * @returns Array of admin objects with email and optional name
 */
export const formatAdmins = (contacts: any[]): Array<{ email: string; name?: string }> => {
  if (!contacts || contacts.length === 0) return [];

  return contacts.map(contact => ({
    email: contact.email,
    name:
      contact.firstName && contact.lastName
        ? `${contact.firstName} ${contact.lastName}`
        : undefined,
  }));
};
/**
 * Formats anniversary date for modal display (extracts date part without days calculation)
 * @param dateString - The anniversary date string
 * @returns Formatted date string without days to renewal or 'renewal' as fallback
 */
export const formatAnniversaryDateForModal = (dateString: string | undefined): string => {
  if (!dateString) return 'renewal';
  try {
    // Use the existing utility and extract just the date part (before the days calculation)
    const formatted = formatAnniversaryDate(dateString);
    // Extract date part before " (X days to renewal)"
    return formatted.split(' (')[0];
  } catch {
    return 'renewal';
  }
};

/**
 * Formats a date string to a readable format (e.g., "Jan 15, 2024")
 * @param dateString - The date string to format
 * @returns Formatted date string or original string if formatting fails
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Checks if customer has a pending 3YC commitment request
 * Returns true if customer has a THREE_YEAR_COMMIT benefit with REQUESTED status
 * @param customerBenefits - Array of customer benefit objects
 * @returns Boolean indicating whether 3YC commitment is pending
 */
export const has3YCCommitmentPending = (
  customerBenefits:
    | Array<{
        type: string;
        status: string;
        commitmentRequest?: { status: string };
      }>
    | null
    | undefined
): boolean => {
  if (!customerBenefits || customerBenefits.length === 0) return false;

  return customerBenefits.some(
    benefit =>
      benefit.type === 'THREE_YEAR_COMMIT' && benefit.commitmentRequest?.status === 'REQUESTED'
  );
};

/**
 * Checks if customer should see the 3YC enrollment banner
 * Returns true if:
 * - Customer is not an LGA customer
 * - Customer is not in a linked membership
 * - Customer is not yet enrolled in 3YC
 * @param customer - Customer object with benefits and linkedMembership properties
 * @returns Boolean indicating whether to show 3YC enrollment banner
 */
export const shouldShow3YCEnrollmentBanner = (customer?: CustomerDetails | null): boolean => {
  const customerBenefits = customer?.benefits as
    | Array<{ type: string; status: string }>
    | null
    | undefined;

  // Not an LGA customer
  if (isLGACustomer(customerBenefits)) {
    return false;
  }

  // Not in linked membership
  if (isCustomerInLinkedMembership(customer || {})) {
    return false;
  }

  // Not yet enrolled in 3YC
  return (
    !customerBenefits ||
    customerBenefits.length === 0 ||
    !customerBenefits.some(benefit => benefit.type === 'THREE_YEAR_COMMIT')
  );
};

/**
 * Checks if customer is a Large Government Agency (LGA) customer
 * Returns true if customer has a LARGE_GOVERNMENT_AGENCY benefit with ACTIVE status
 * @param customerBenefits - Array of customer benefit objects
 * @returns Boolean indicating whether customer is an LGA customer
 */
export const isLGACustomer = (
  customerBenefits:
    | Array<{
        type: string;
        status: string;
      }>
    | null
    | undefined
): boolean => {
  if (!customerBenefits || customerBenefits.length === 0) return false;

  return customerBenefits.some(
    benefit => benefit.type === 'LARGE_GOVERNMENT_AGENCY' && benefit.status === 'ACTIVE'
  );
};

/**
 * Gets the appropriate price list type based on customer benefits
 * Returns 'STD-LGA' for LGA customers, 'STANDARD' otherwise
 * @param customerBenefits - Array of customer benefit objects
 * @returns Price list type string ('STD-LGA' or 'STANDARD')
 */
export const getPriceListType = (
  customerBenefits:
    | Array<{
        type: string;
        status: string;
      }>
    | null
    | undefined
): string => {
  return isLGACustomer(customerBenefits) ? 'STD-LGA' : 'STANDARD';
};

/**
 * Checks if customer has a linked membership with an ID
 * Returns true if linkedMembership exists and has an id property
 * @param customer - Customer object with optional linkedMembership property
 * @returns Boolean indicating whether customer has a linked membership with an ID
 */
export const isCustomerInLinkedMembership = (customer: {
  linkedMembership?: {
    id?: string;
    name?: string;
    type?: string;
    linkedMembershipType?: string;
    creationDate?: string;
  } | null;
}): boolean => {
  return !!customer?.linkedMembership?.id;
};
