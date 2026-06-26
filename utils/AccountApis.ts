import { CustomerMinimal } from '../models/Customer';
import { CustomerDetails } from '../models/CustomerDetails';
import { Reseller, ResellerMinimal } from '../models/Reseller';
import { CUSTOMER_API_TYPE, RESELLER_API_TYPE } from './constants';

export const searchCustomers = async (
  resellerId: string,
  searchQuery: string,
  page: number,
  itemsPerPage: number
): Promise<import('../controllers/customerController').PaginatedCustomersResponse> => {
  const offset = (page - 1) * itemsPerPage;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = `/api/search?type=customer&resellerId=${encodeURIComponent(resellerId)}&query=${encodeURIComponent(searchQuery)}&offset=${offset}&limit=${itemsPerPage}`;

    const response = await fetch(url, { signal: controller.signal });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to search customers: ${response.status} ${responseText}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid API response format');
    }

    if (!data || typeof data !== 'object' || !Array.isArray((data as any).customers)) {
      throw new Error('Invalid response format: expected paginated customers response');
    }

    return data as import('../controllers/customerController').PaginatedCustomersResponse;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchCustomersPage = async (
  resellerId: string,
  page: number,
  itemsPerPage: number
): Promise<import('../controllers/customerController').PaginatedCustomersResponse> => {
  const offset = (page - 1) * itemsPerPage;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = `/api/customers?type=${CUSTOMER_API_TYPE.GET_ALL_CUSTOMERS}&resellerId=${resellerId}&offset=${offset}&limit=${itemsPerPage}`;

    const response = await fetch(url, { signal: controller.signal });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to fetch customers: ${response.status} ${responseText}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid API response format');
    }

    if (!data || typeof data !== 'object' || !Array.isArray((data as any).customers)) {
      throw new Error('Invalid response format: expected paginated customers response');
    }

    return data as import('../controllers/customerController').PaginatedCustomersResponse;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchCustomerDetails = async (customerId: string): Promise<CustomerDetails> => {
  const url = `/api/customers?type=${CUSTOMER_API_TYPE.GET_CUSTOMER}&customerId=${encodeURIComponent(customerId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to fetch customer details' }));
    const errorMessage =
      errorData?.error || errorData?.message || 'Failed to fetch customer details';
    throw new Error(errorMessage);
  }

  return response.json();
};

export const getResellerDetails = async (resellerId: string): Promise<Reseller> => {
  const url = `/api/resellers?type=${RESELLER_API_TYPE.GET_RESELLER_DETAILS}&id=${encodeURIComponent(resellerId)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to fetch reseller details' }));
    const errorMessage =
      errorData?.error || errorData?.message || 'Failed to fetch reseller details';
    throw new Error(errorMessage);
  }

  return response.json();
};

export interface PaginatedResellersResponse {
  resellers: ResellerMinimal[];
  totalCount: number;
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export const fetchResellersPage = async (
  page: number,
  itemsPerPage: number
): Promise<PaginatedResellersResponse> => {
  const offset = (page - 1) * itemsPerPage;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = `/api/resellers?type=${RESELLER_API_TYPE.GET_ALL_RESELLERS}&offset=${offset}&limit=${itemsPerPage}`;

    const response = await fetch(url, { signal: controller.signal });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to fetch resellers: ${response.status} ${responseText}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid API response format');
    }

    if (!data || typeof data !== 'object' || !Array.isArray((data as any).resellers)) {
      throw new Error('Invalid response format: expected paginated resellers response');
    }

    return data as PaginatedResellersResponse;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const searchResellers = async (
  searchQuery: string,
  page: number,
  itemsPerPage: number
): Promise<PaginatedResellersResponse> => {
  const offset = (page - 1) * itemsPerPage;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = `/api/search?type=reseller&query=${encodeURIComponent(searchQuery)}&offset=${offset}&limit=${itemsPerPage}`;

    const response = await fetch(url, { signal: controller.signal });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to search resellers: ${response.status} ${responseText}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid API response format');
    }

    if (!data || typeof data !== 'object' || !Array.isArray((data as any).resellers)) {
      throw new Error('Invalid response format: expected paginated resellers response');
    }

    return data as PaginatedResellersResponse;
  } finally {
    clearTimeout(timeoutId);
  }
};
