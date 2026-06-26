import { z } from 'zod';

export const RecommendationRequestSchema = z.object({
  customerId: z.number(),
  recommendationContext: z.string().optional(),
});

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;

// Product schema for recommendations
export const RecommendationProductSchema = z.object({
  baseOfferId: z.string(),
  productName: z.string().optional(),
  productIcon: z.string().optional(),
  offerId: z.string().optional(),
});

// Individual recommendation item schema
export const RecommendationItemSchema = z.object({
  rank: z.number(),
  product: RecommendationProductSchema,
});

// Product recommendations response schema
export const RecommendationResponseSchema = z.object({
  productRecommendations: z.object({
    upsells: z.array(RecommendationItemSchema).optional().default([]),
    crossSells: z.array(RecommendationItemSchema).optional().default([]),
    addOns: z.array(RecommendationItemSchema).optional().default([]),
  }),
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;
export type RecommendationProduct = z.infer<typeof RecommendationProductSchema>;
