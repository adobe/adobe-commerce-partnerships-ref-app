export const QUERY_KEYS = {
  CUSTOMERS: ['customers'],
  RESELLERS: ['resellers'],
  SUBSCRIPTIONS: ['subscriptions'],
  PRICELIST: ['pricelist'],
} as const;

// Fast query key generators - direct array creation
export const getCustomerListKey = (resellerId: string, page: number, limit: number) =>
  ['customers', 'list', resellerId, page, limit] as const;

export const getCustomerSearchKey = (
  resellerId: string,
  searchTerm: string,
  page: number,
  limit: number
) => ['customers', 'search', resellerId, searchTerm, page, limit] as const;

export const getResellerListKey = (page: number, limit: number) =>
  ['resellers', 'list', page, limit] as const;

export const getResellerSearchKey = (searchTerm: string, page: number, limit: number) =>
  ['resellers', 'search', searchTerm, page, limit] as const;

// Customer detail query keys
export const customerDetailKeys = {
  all: ['customerDetails'] as const,
  customer: (customerId: string) => [...customerDetailKeys.all, 'customer', customerId] as const,
  subscriptions: (customerId: string) =>
    [...customerDetailKeys.all, 'subscriptions', customerId] as const,
  reseller: (resellerId: string) => [...customerDetailKeys.all, 'reseller', resellerId] as const,
};
// Query invalidation helpers
export const invalidateCustomers = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
};

export const invalidateResellers = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RESELLERS });
};
