import { z } from 'zod';
import { LineItemSchema, PricingSummarySchema, LinkSchema } from './Order';

const CancellingItemSchema = z
  .object({
    extLineItemNumber: z.number(),
    referenceLineItemNumber: z.number(),
    subscriptionId: z.string(),
    quantity: z.number(),
    status: z.string().optional(),
    proratedDays: z.number().optional(),
    pricing: z
      .object({
        partnerPrice: z.number(),
        discountedPartnerPrice: z.number(),
        netPartnerPrice: z.number(),
        lineItemPartnerPrice: z.number(),
      })
      .optional(),
  })
  .passthrough();

// --- Request Schemas ---

export const PreviewSwitchOrderSchema = z.object({
  customerId: z.string().optional(),
  orderType: z.literal('PREVIEW_SWITCH'),
  externalReferenceId: z.string().optional(),
  currencyCode: z.string(),
  lineItems: z.array(LineItemSchema),
  cancellingItems: z.array(CancellingItemSchema).optional(),
});

export const SwitchOrderSchema = z.object({
  customerId: z.string().optional(),
  orderType: z.literal('SWITCH'),
  externalReferenceId: z.string().optional(),
  currencyCode: z.string(),
  lineItems: z.array(LineItemSchema),
  cancellingItems: z.array(CancellingItemSchema).optional(),
});

// --- Response Schema ---

export const SwitchOrderResponseSchema = z
  .object({
    referenceOrderId: z.string().optional(),
    externalReferenceId: z.string().optional(),
    orderId: z.string().optional(),
    customerId: z.string(),
    currencyCode: z.string().optional(),
    orderType: z.string(),
    status: z.string(),
    lineItems: z.array(LineItemSchema),
    cancellingItems: z.array(CancellingItemSchema).optional(),
    pricingSummary: z.array(PricingSummarySchema).optional(),
    creationDate: z.string().optional(),
    links: z
      .object({
        self: LinkSchema.optional(),
        next: LinkSchema.optional(),
        prev: LinkSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

// --- Offer Switch Paths ---

const TargetOfferSchema = z
  .object({
    targetBaseOfferId: z.string(),
    sequence: z.number(),
    switchType: z.string(),
  })
  .passthrough();

const ProductUpgradeSchema = z
  .object({
    sourceBaseOfferId: z.string(),
    targetList: z.array(TargetOfferSchema),
  })
  .passthrough();

export const OfferSwitchPathsResponseSchema = z
  .object({
    totalCount: z.number(),
    count: z.number(),
    offset: z.number(),
    limit: z.number(),
    productUpgrades: z.array(ProductUpgradeSchema),
  })
  .passthrough();

// Type exports
export type SwitchOrderResponse = z.infer<typeof SwitchOrderResponseSchema>;
export type OfferSwitchPathsResponse = z.infer<typeof OfferSwitchPathsResponseSchema>;
