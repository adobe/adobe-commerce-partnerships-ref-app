/**
 * Type definitions for unified renewal dialog
 * Combines functionality from AddToRenewalDialog and EditRenewalDialog
 */

import type { CartItem } from '../contexts/CartContext';

export interface RenewalProduct extends CartItem {
  autoRenewalEnabled: boolean;
  type: 'NEW' | 'EXISTING';
  subscriptionId?: string;
}

export interface AddAndEditCustomerRenewalOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  anniversaryDate?: string;
  onSuccess?: () => void;
}
/**
 * State for the dialog component
 */
export interface DialogState {
  products: RenewalProduct[];
  isSaving: boolean;
  isUpdatingPrices: boolean;
  pricesCleared: boolean;
  pricingSummaries: Array<{ totalLineItemPartnerPrice: number; currencyCode: string }>;
  showSuccessToast: boolean;
  showErrorToast: boolean;
  showWarningToast: boolean;
  errorMessage: string;
  successMessage: string;
  warningMessage: string;
}

/**
 * Type guard to check if a product is NEW type
 */
export function isNewProduct(product: RenewalProduct): product is RenewalProduct & { type: 'NEW' } {
  return product.type === 'NEW';
}

/**
 * Type guard to check if a product is EXISTING type
 */
export function isExistingProduct(
  product: RenewalProduct
): product is RenewalProduct & { type: 'EXISTING'; subscriptionId: string } {
  return product.type === 'EXISTING' && !!product.subscriptionId;
}
