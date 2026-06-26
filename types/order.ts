/**
 * Type definitions for order operations
 */

export interface OrderLineItem {
  offerId: string;
  quantity: number;
  extLineItemNumber: number;
}

export interface CreateOrderRequest {
  customerId: string;
  externalReferenceId: string;
  currencyCode: string;
  lineItems: OrderLineItem[];
}

export interface OrderPreviewRequest {
  customerId: string;
  externalReferenceId: string;
  currencyCode: string;
  lineItems: OrderLineItem[];
}

export interface OrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  lineItems: OrderLineItem[];
  createdAt: string;
}

export interface OrderPreviewResponse {
  subtotal: number;
  tax: number;
  total: number;
  lineItems: Array<{
    offerId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface FlexDiscount {
  id: string;
  code: string;
  result: string;
}

export interface PreviewLineItem {
  offerId: string;
  quantity: number;
  price?: number;
  extLineItemNumber?: number;
  currencyCode?: string;
  flexDiscounts?: FlexDiscount[];
  pricing?: {
    partnerPrice: number;
    discountedPartnerPrice: number;
    netPartnerPrice: number;
    lineItemPartnerPrice: number;
  };
}
