import { z } from 'zod';

export const MarketSegmentSchema = z.object({
  programType: z.string(),
  marketSegment: z.string(),
});

export const CurrencySchema = z.object({
  priceRegion: z.string(),
  currency: z.string(),
});

export const PartnerDetailsSchema = z
  .object({
    partnerName: z.string(),
    marketSegments: z.array(MarketSegmentSchema),
    currencies: z.array(CurrencySchema),
  })
  .passthrough();
export type Currency = z.infer<typeof CurrencySchema>;
export type PartnerDetails = z.infer<typeof PartnerDetailsSchema>;
