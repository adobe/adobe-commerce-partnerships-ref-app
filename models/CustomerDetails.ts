import { z } from 'zod';

// Common schemas
const AddressSchema = z.object({
  country: z.string(),
  region: z.string(),
  city: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string(),
  postalCode: z.string(),
  phoneNumber: z.string().optional(),
});

const ContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
});

const CompanyProfileSchema = z.object({
  companyName: z.string(),
  preferredLanguage: z.string(),
  marketSegment: z.string().optional(),
  marketSubSegments: z.array(z.string()).optional(),
  address: AddressSchema,
  contacts: z.array(ContactSchema),
});

const LinkSchema = z.object({
  uri: z.string(),
  method: z.string(),
  headers: z.array(z.unknown()),
});

const LinksSchema = z.object({
  self: LinkSchema,
});

const DiscountSchema = z.object({
  offerType: z.string(),
  level: z.string(),
});

const LinkedMembershipSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  linkedMembershipType: z.string(),
  creationDate: z.string(),
});

// Schema for 3YC commitment request
const MinimumQuantitySchema = z.object({
  offerType: z.enum(['LICENSE', 'CONSUMABLES']),
  quantity: z.number().min(1),
});

const CommitmentRequestSchema = z.object({
  minimumQuantities: z.array(MinimumQuantitySchema).min(1),
});

const BenefitSchema = z.object({
  type: z.literal('THREE_YEAR_COMMIT'),
  commitmentRequest: CommitmentRequestSchema,
});

// Customer Schema (for creation)
export const CreateCustomerSchema = z.object({
  resellerId: z.string(),
  externalReferenceId: z.string().optional(),
  companyProfile: CompanyProfileSchema,
});

// Customer Schema (for update/PATCH)
export const UpdateCustomerSchema = z.object({
  benefits: z.array(BenefitSchema).min(1),
  companyProfile: CompanyProfileSchema,
  globalSalesEnabled: z.boolean().optional(),
});

// Customer Schema (for response)
export const CustomerDetailsSchema = z.object({
  externalReferenceId: z.string(),
  customerId: z.string(),
  resellerId: z.string(),
  globalSalesEnabled: z.boolean(),
  companyProfile: CompanyProfileSchema,
  discounts: z.array(DiscountSchema),
  tags: z.array(z.string()).optional(),
  benefits: z.array(z.unknown()).optional(),
  cotermDate: z.string(),
  creationDate: z.string(),
  status: z.string(),
  links: LinksSchema,
  linkedMembership: LinkedMembershipSchema.optional(),
});

export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
