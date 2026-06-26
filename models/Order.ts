import { z } from 'zod';
import { RecommendationItemSchema } from './recommendation';

// Link Schema
export const LinkSchema = z.object({
  uri: z.string(),
  method: z.string(),
  headers: z.array(z.unknown()),
});

const LinksSchema = z.object({
  self: LinkSchema.optional(),
  next: LinkSchema.optional(),
  prev: LinkSchema.optional(),
});

// Pricing Schema for Line Items
const PricingSchema = z.object({
  partnerPrice: z.number(),
  discountedPartnerPrice: z.number(),
  netPartnerPrice: z.number(),
  lineItemPartnerPrice: z.number(),
});

// Line Item Schema
export const LineItemSchema = z
  .object({
    extLineItemNumber: z.number(),
    offerId: z.string(),
    quantity: z.number(),
    subscriptionId: z.string().optional(),
    status: z.string().optional(),
    currencyCode: z.string().optional(),
    deploymentId: z.string().optional(),
    discountCode: z.string().optional(),
    proratedDays: z.number().optional(),
    pricing: PricingSchema.optional(),
    flexDiscountCodes: z.array(z.string()).optional(),
    flexDiscounts: z
      .array(
        z.object({
          id: z.string(),
          code: z.string(),
          result: z.string(),
        })
      )
      .optional(),
  })
  .passthrough();

// Pricing Summary Schema
export const PricingSummarySchema = z
  .object({
    totalLineItemPartnerPrice: z.number(),
    currencyCode: z.string(),
  })
  .passthrough();

// Order Type Enum
const OrderTypeEnum = z.enum(['NEW', 'RETURN', 'PREVIEW', 'PREVIEW_RENEWAL', 'RENEWAL']);

// 1. New Order Schema
export const NewOrderSchema = z.object({
  customerId: z.string().optional(),
  orderType: z.literal('NEW'),
  externalReferenceId: z.string(),
  currencyCode: z.string(),
  lineItems: z.array(LineItemSchema),
});

// 2. Return or Cancellation Order Schema
export const ReturnOrderSchema = z.object({
  customerId: z.string(),
  orderType: z.literal('RETURN'),
  referenceOrderId: z.string(),
  externalReferenceId: z.string(),
  currencyCode: z.string(),
  lineItems: z.array(LineItemSchema),
});

// 3. Renewal Order Schema
export const RenewalOrderSchema = z.object({
  customerId: z.string(),
  orderType: z.literal('RENEWAL'),
  externalReferenceId: z.string(),
  currencyCode: z.string(),
  lineItems: z.array(LineItemSchema),
});

// 4. Preview Order Schema
export const PreviewOrderSchema = z.object({
  customerId: z.string(),
  orderType: z.literal('PREVIEW'),
  externalReferenceId: z.string(),
  currencyCode: z.string(),
  lineItems: z.array(LineItemSchema),
  pricingSummary: z.array(PricingSummarySchema).optional(),
});

// 5. Preview Renewal Order Schema
export const PreviewRenewalOrderSchema = z.object({
  currencyCode: z.string().optional(),
  customerId: z.string(),
  orderType: z.literal('PREVIEW_RENEWAL'),
  lineItems: z.array(LineItemSchema).optional(),
  pricingSummary: z.array(PricingSummarySchema).optional(),
});

// Eligible Offer Schema
const EligibilityCriteriaSchema = z.object({
  minQuantity: z.number(),
  additionalCriteria: z.array(z.string()).optional(),
  deploymentId: z.string().optional(),
});

const EligibleOfferSchema = z.object({
  offerId: z.string(),
  renewalCode: z.string(),
  eligibilityCriteria: EligibilityCriteriaSchema,
});

// Order Schema (for response)
export const OrderSchema = z
  .object({
    referenceOrderId: z.string().optional(),
    orderType: OrderTypeEnum,
    externalReferenceId: z.string().optional(),
    orderId: z.string().optional(),
    customerId: z.string(),
    currencyCode: z.string().optional(),
    creationDate: z.string().optional(),
    status: z.string(),
    source: z.string().optional(),
    lineItems: z.array(LineItemSchema),
    pricingSummary: z.array(PricingSummarySchema).optional(),
    lastModifiedDate: z.string().optional(),
    eligibleOffers: z.array(EligibleOfferSchema).optional(),
    links: LinksSchema.optional(),
    recommendations: z
      .object({
        productRecommendations: z.object({
          upsells: z.array(RecommendationItemSchema).optional().default([]),
          crossSells: z.array(RecommendationItemSchema).optional().default([]),
          addOns: z.array(RecommendationItemSchema).optional().default([]),
        }),
      })
      .optional(),
  })
  .passthrough();

// Orders History Schemas (for orders history API)
z.object({
  extLineItemNumber: z.number(),
  offerId: z.string(),
  quantity: z.number(),
  subscriptionId: z.string().optional(),
  status: z.string().optional(),
  currencyCode: z.string().optional(),
});
const OrdersHistoryOrderSchema = z
  .object({
    referenceOrderId: z.string().optional(),
    externalReferenceId: z.string().optional(),
    orderId: z.string().optional(),
    customerId: z.string(),
    currencyCode: z.string().optional(),
    orderType: z.string(),
    status: z.string(),
    source: z.string().optional(),
    lineItems: z.array(LineItemSchema),
    creationDate: z.string().optional(),
    links: z
      .object({
        self: LinkSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

export const OrdersHistoryResponseSchema = z
  .object({
    totalCount: z.number(),
    count: z.number(),
    offset: z.number(),
    limit: z.number(),
    items: z.array(OrdersHistoryOrderSchema),
    links: z
      .object({
        self: LinkSchema.optional(),
        next: LinkSchema.optional(),
        prev: LinkSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

// Type exports
export type Order = z.infer<typeof OrderSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type Pricing = z.infer<typeof PricingSchema>;
export type OrdersHistoryResponse = z.infer<typeof OrdersHistoryResponseSchema>;
export type OrdersHistoryOrder = z.infer<typeof OrdersHistoryOrderSchema>;
// Extended type with hasMore field for pagination
export type OrdersHistoryResponseWithPagination = OrdersHistoryResponse & {
  hasMore: boolean;
};
