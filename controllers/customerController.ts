/**
 * Fetches and validates customers from the external API.
 * @param access_token - The user's access token.
 * @throws {ApiError} If the request fails or validation fails.
 * @returns {Promise<Customer[]>}
 */
import {
  CustomerDetailsSchema,
  CreateCustomerSchema,
  CreateCustomer,
  UpdateCustomerSchema,
  UpdateCustomer,
} from '../models/CustomerDetails';
import { CustomerMinimalSchema, CustomerMinimal } from '../models/Customer';
import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import type { BackendResult } from '../models/Result';
import { HTTP_METHOD } from '../utils/constants';

const baseUrl = process.env.PARTNER_API_BASE_URL;
const customersUrl = `${baseUrl}/v3/customers`;
const customerUrl = (id: string) => `${baseUrl}/v3/customers/${id}`;

export async function getCustomer(
  customerId: string,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('customerController', 'getCustomer');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for customerController - getCustomer');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const result = await fetch(customerUrl(customerId), {
    method: HTTP_METHOD.GET,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'X-Correlation-Id': uuidv4(),
    },
  });

  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
      customerId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
    });
    throw new ApiError('Failed to fetch customers', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
  });

  try {
    const validatedData = CustomerDetailsSchema.parse(data);
    return {
      data: validatedData,
      requestId,
    };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      validationError: String(err),
    });
    throw new ApiError('Customer data validation failed', 500, requestId);
  }
}

export async function createCustomer(
  body: CreateCustomer,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('customerController', 'createCustomer');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for customerController - createCustomer');

  try {
    CreateCustomerSchema.parse(body);
  } catch (err: any) {
    logger.error(
      {
        error: err.message || err,
      },
      'Input validation failed'
    );
    throw new ApiError('Input validation failed', 400);
  }

  logRequest(logger, body);

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);
  if (!baseUrl) throw new ApiError('Missing PARTNER_API_BASE_URL', 500);

  const result = await fetch(customersUrl, {
    method: HTTP_METHOD.POST,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'X-Correlation-Id': uuidv4(),
    },
    body: JSON.stringify(body),
  });
  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
    });
    throw new ApiError(
      data.message || data.error || 'Failed to create customer',
      result.status,
      requestId
    );
  }

  logResponse(logger, data, requestId, {
    customerId: data.customerId,
  });

  try {
    const validatedData = CustomerDetailsSchema.parse(data);
    return {
      data: validatedData,
      requestId,
    };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      validationError: String(err),
    });
    throw new ApiError('Customer data validation failed', 500, requestId);
  }
}

export async function updateCustomer(
  customerId: string,
  body: UpdateCustomer,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('customerController', 'updateCustomer');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for customerController - updateCustomer');

  try {
    UpdateCustomerSchema.parse(body);
  } catch (err: any) {
    logger.error(
      {
        error: err.message || err,
      },
      'Input validation failed'
    );
    throw new ApiError('Input validation failed', 400);
  }

  logRequest(logger, body, { customerId });

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);
  if (!baseUrl) throw new ApiError('Missing PARTNER_API_BASE_URL', 500);

  const customersUrl = `${baseUrl}/v3/customers/${customerId}`;

  const result = await fetch(customersUrl, {
    method: HTTP_METHOD.PATCH,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'X-Correlation-Id': uuidv4(),
    },
    body: JSON.stringify(body),
  });

  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
      customerId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
    });
    throw new ApiError(
      data.message || data.error || 'Failed to update customer',
      result.status,
      requestId
    );
  }

  logResponse(logger, data, requestId, {
    customerId,
  });

  try {
    const validatedData = CustomerDetailsSchema.parse(data);
    return {
      data: validatedData,
      requestId,
    };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      validationError: String(err),
    });
    throw new ApiError('Customer data validation failed', 500, requestId);
  }
}

// Interface for paginated customers response
export interface PaginatedCustomersResponse {
  customers: CustomerMinimal[];
  totalCount: number;
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export async function getAllCustomers(
  id: string,
  offset: number = 0,
  limit: number = 25,
  accessToken: string
): Promise<BackendResult<PaginatedCustomersResponse>> {
  const logger = createControllerLogger('customerController', 'getAllCustomers');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for customerController - getAllCustomers');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing API_KEY', 500);

  const url = `${baseUrl}/v3/resellers/${id}/customers?offset=${offset}&limit=${limit}`;

  const result = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers: {
      Accept: 'application/json',
      'x-api-key': apiKey,
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    } as Record<string, string>,
  });
  const responseText = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  let accounts;
  let totalCount;
  let count;
  try {
    data = JSON.parse(responseText);
    accounts = data.accounts;
    totalCount = data.totalCount || 0;
    count = data.count || 0;
  } catch (e: any) {
    logErrorResponse(logger, { error: 'Parse failed', text: responseText }, requestId, {
      status: result.status,
      resellerId: id,
      offset,
      limit,
    });
    throw new ApiError('Invalid JSON response', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      resellerId: id,
      offset,
      limit,
    });
    throw new ApiError('Failed to fetch customers', result.status, requestId);
  }

  if (!Array.isArray(accounts)) {
    logger.info(
      {
        offset,
        requestId,
      },
      'Data is not an array for offset'
    );
    return {
      data: {
        customers: [],
        totalCount: 0,
        count: 0,
        offset,
        limit,
        hasMore: false,
      },
      requestId,
    };
  }

  const parsedCustomers = accounts
    .map(customer => {
      try {
        return CustomerMinimalSchema.parse(customer);
      } catch (e) {
        logger.warn({ customerId: customer?.customerId }, 'Skipping invalid customer');
        return null;
      }
    })
    .filter(Boolean) as CustomerMinimal[];

  logger.info(
    {
      fetchedCount: parsedCustomers.length,
      offset,
      limit,
      totalCount,
      requestId,
    },
    'Fetched customers for reseller'
  );

  const hasMore = offset + limit < totalCount;

  return {
    data: {
      customers: parsedCustomers,
      totalCount,
      count,
      offset,
      limit,
      hasMore,
    },
    requestId,
  };
}

export async function findCustomerByName(
  resellerId: string,
  name: string,
  accessToken: string,
  offset: number = 0,
  limit: number = 50
): Promise<BackendResult<PaginatedCustomersResponse>> {
  const logger = createControllerLogger('customerController', 'findCustomerByName');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for customerController - findCustomerByName');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = `${baseUrl}/v3/resellers/${resellerId}/customers?company-name=${encodeURIComponent(name)}&offset=${offset}&limit=${limit}`;

  const result = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers: {
      Accept: 'application/json',
      'x-api-key': apiKey,
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'X-Correlation-Id': uuidv4(),
    } as Record<string, string>,
  });

  const responseText = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  let accounts;
  let totalCount;
  let count;
  try {
    data = JSON.parse(responseText);
    accounts = data.accounts || data;
    totalCount = data.totalCount || 0;
    count = data.count || 0;
  } catch (e: any) {
    logErrorResponse(logger, { error: 'Parse failed', text: responseText }, requestId, {
      status: result.status,
      resellerId,
      searchName: name,
      offset,
      limit,
    });
    throw new ApiError('Invalid JSON response', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      resellerId,
      searchName: name,
      offset,
      limit,
    });
    throw new ApiError('Failed to search customers by name', result.status, requestId);
  }

  if (!Array.isArray(accounts)) {
    logger.info(
      {
        resellerId,
        name,
        requestId,
        offset,
        limit,
      },
      'No customers found for name search'
    );
    return {
      data: {
        customers: [],
        totalCount: 0,
        count: 0,
        offset,
        limit,
        hasMore: false,
      },
      requestId,
    };
  }

  const parsedCustomers = accounts
    .map(customer => {
      try {
        return CustomerMinimalSchema.parse(customer);
      } catch (e) {
        logger.warn(
          { customerId: customer?.customerId, requestId },
          'Skipping invalid customer in name search'
        );
        return null;
      }
    })
    .filter(Boolean) as CustomerMinimal[];

  const finalTotalCount = totalCount || parsedCustomers.length;
  const finalCount = count || parsedCustomers.length;
  const hasMore = offset + limit < finalTotalCount;

  logger.info(
    {
      foundCount: parsedCustomers.length,
      totalCount: finalTotalCount,
      searchName: name,
      resellerId,
      requestId,
      offset,
      limit,
    },
    'Successfully found customers by name'
  );

  return {
    data: {
      customers: parsedCustomers,
      totalCount: finalTotalCount,
      count: finalCount,
      offset,
      limit,
      hasMore,
    },
    requestId,
  };
}
