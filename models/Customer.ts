import { z } from 'zod';

export const CustomerSchema = z.object({
  accountId: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
});

// AllCustomer Schema (for customer list)
z.object({
  accountId: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
});
export const CustomerMinimalSchema = z.object({
  customerId: z.string(),
  companyProfile: z.object({
    companyName: z.string(),
  }),
});

export type CustomerMinimal = z.infer<typeof CustomerMinimalSchema>;

export type Customer = z.infer<typeof CustomerSchema>;
// export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
