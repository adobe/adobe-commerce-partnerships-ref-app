import { z } from 'zod';

export const ResellerDetailsSchema = z.object({
  distributorId: z.string(),
  externalReferenceId: z.string(),
  resellerId: z.string().optional(),
  companyProfile: z.object({
    companyName: z.string(),
    preferredLanguage: z.string(),
    marketSegments: z.array(z.string()),
    address: z.object({
      country: z.string(),
      region: z.string(),
      city: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string(),
      postalCode: z.string(),
      phoneNumber: z.string().optional(),
    }),
    contacts: z.array(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phoneNumber: z.string(),
      })
    ),
  }),
  creationDate: z.string().optional(),
  status: z.string().optional(),
  links: z
    .object({
      self: z.object({
        uri: z.string(),
        method: z.string(),
        headers: z.array(z.unknown()),
      }),
    })
    .optional(),
  tags: z.array(z.unknown()).optional(),
  benefits: z.array(z.unknown()).optional(),
  globalSalesEnabled: z.boolean().optional(),
});

export type ResellerDetails = z.infer<typeof ResellerDetailsSchema>;
