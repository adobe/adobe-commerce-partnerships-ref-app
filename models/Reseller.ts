import { z } from 'zod';

// Address schema for company profile
const AddressSchema = z.object({
  country: z.string(),
  region: z.string(),
  city: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  postalCode: z.string(),
  phoneNumber: z.string().optional(),
});

// Contact schema for company profile
const ContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional(),
});

// Company profile schema
const CompanyProfileSchema = z.object({
  companyName: z.string(),
  preferredLanguage: z.string(),
  marketSegments: z.array(z.string()),
  address: AddressSchema,
  contacts: z.array(ContactSchema),
});

// Main reseller schema matching the actual API response
export const ResellerSchema = z.object({
  externalReferenceId: z.string(),
  resellerId: z.string(),
  distributorId: z.string(),
  status: z.string(),
  companyProfile: CompanyProfileSchema,
  creationDate: z.string(),
});

export const ResellerMinimalSchema = z.object({
  resellerId: z.string(),
  companyProfile: z.object({
    companyName: z.string(),
  }),
});

export type ResellerMinimal = z.infer<typeof ResellerMinimalSchema>;

export type Reseller = z.infer<typeof ResellerSchema>;
