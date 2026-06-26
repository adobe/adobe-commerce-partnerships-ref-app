import { z } from 'zod';

export const CatalogProductSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  offerName: z.string().optional(),
  productFamily: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  priceUnit: z.string().optional(),
  category: z.string().optional(),
  marketSegment: z.string().optional(),
  name: z.string().optional(),
  subtitle: z.string().optional(),
  type: z.string().optional(),
  additionalDetail: z.any().optional(),
});

export const CatalogFiltersSchema = z.object({
  marketSegment: z.array(z.string()),
  categories: z.array(z.string()),
  type: z.array(z.string()),
  currency: z.string(),
});

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
export type CatalogFilters = z.infer<typeof CatalogFiltersSchema>;
