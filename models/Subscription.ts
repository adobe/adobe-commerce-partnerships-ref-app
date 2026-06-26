import { z } from 'zod';

export const SubscriptionSchema = z
  .object({
    subscriptionId: z.string().optional(),
    currentQuantity: z.number().optional(),
    usedQuantity: z.number().optional(),
    renewalDate: z.string().optional(),
    creationDate: z.string().optional(),
    status: z.string().optional(),
    allowedActions: z.array(z.string()).optional(),
    links: z
      .object({
        self: z.object({
          uri: z.string(),
          method: z.string(),
          headers: z.array(z.unknown()),
        }),
      })
      .optional(),

    offerId: z.string().optional(),
    autoRenewal: z.object({
      enabled: z.boolean(),
      renewalQuantity: z.number(),
      renewalCode: z.string().optional(),
      flexDiscountCodes: z.array(z.string()).optional(),
    }),
    currencyCode: z.string().optional(),
  })
  .passthrough();
z.object({
  totalCount: z.number(),
  items: z.array(SubscriptionSchema),
  links: z.object({
    self: z.object({
      uri: z.string(),
      method: z.string(),
      headers: z.array(z.unknown()),
    }),
  }),
});
export const CreateSubscriptionRequestSchema = z.object({
  customerId: z.string(),
  offerId: z.string(),
  autoRenewal: z.object({
    enabled: z.boolean(),
    renewalQuantity: z.number().positive(),
    flexDiscountCodes: z.array(z.string()).optional(),
  }),
});

export const UpdateSubscriptionRequestSchema = z.object({
  autoRenewal: z.boolean().optional(),
  renewalQuantity: z.number().optional(),
  flexDiscountCodes: z.array(z.string()).optional(),
});
z.object({
  subscriptionId: z.string(),
  currentQuantity: z.number(),
  autoRenewal: z.object({
    enabled: z.boolean(),
    renewalQuantity: z.number(),
  }),
  creationDate: z.string().datetime().optional(),
  renewalDate: z.string(),
  status: z.string(),
  currencyCode: z.string().optional(),
  links: z
    .object({
      self: z.object({
        uri: z.string(),
        method: z.string(),
        headers: z.array(z.unknown()),
      }),
    })
    .optional(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;
