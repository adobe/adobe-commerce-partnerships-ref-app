import { z } from 'zod';

export const PriceListRequestSchema = z.object({
  region: z.string(),
  marketSegment: z.string(),
  priceListType: z.string(),
  priceListMonth: z.string(),
  currency: z.string().min(1, 'Currency cannot be empty'),
  offset: z.number().default(0),
  limit: z.number().default(100),
  filters: z
    .object({
      offerId: z.string().optional(),
    })
    .optional(),
  useMock: z.boolean().optional(),
  includeOfferAttributes: z.array(z.string()).optional(),
});

export const PriceListOfferSchema = z
  .object({
    offerId: z.string(),
    productFamily: z.string().optional(),
    partnerPrice: z.string().optional(),
    additionalDetail: z.any().optional(),
    // Add more fields as needed based on actual API response
  })
  .passthrough();

export const PriceListResponseSchema = z
  .object({
    priceListMonth: z.string().optional(),
    marketSegment: z.string().optional(),
    region: z.string().optional(),
    currency: z.string().optional(),
    priceListType: z.string().optional(),
    totalCount: z.number().optional(),
    count: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    offers: z.array(PriceListOfferSchema).optional(),
    hasMore: z.boolean().optional(), // This we compute ourselves
    // Add more fields as needed based on actual API response
  })
  .passthrough();

export type PriceListRequest = z.infer<typeof PriceListRequestSchema>;
export type PriceListResponse = z.infer<typeof PriceListResponseSchema>;
export type PriceListOffer = z.infer<typeof PriceListOfferSchema>;
