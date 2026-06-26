/**
 * Fetches and validates orders from the external API.
 * @param access_token - The user's access token.
 * @throws {ApiError} If the request fails or validation fails.
 * @returns {Promise<Order[]>}
 */
import {
  OrderSchema,
  Order,
  OrdersHistoryResponseSchema,
  OrdersHistoryResponseWithPagination,
} from '../models/Order';
import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';
import {
  NewOrderSchema,
  ReturnOrderSchema,
  RenewalOrderSchema,
  PreviewOrderSchema,
  PreviewRenewalOrderSchema,
} from '../models/Order';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import { HTTP_METHOD } from '../utils/constants';

const baseUrl = process.env.PARTNER_API_BASE_URL;
const ordersUrl = (customerId: string) => `${baseUrl}/v3/customers/${customerId}/orders`;
const orderDetailUrl = (customerId: string, id: string) =>
  `${baseUrl}/v3/customers/${customerId}/orders/${id}`;

interface PaginatedResponse {
  totalCount: number;
  count: number;
  offset: number;
  limit: number;
  items: Order[];
  links: {
    self: { uri: string; method: string; headers: any[] };
    next?: { uri: string; method: string; headers: any[] };
    prev?: { uri: string; method: string; headers: any[] };
  };
}

export async function getOrders(
  customerId: string,
  orderId: string,
  accessToken: string
): Promise<{ data: PaginatedResponse; requestId?: string }> {
  const logger = createControllerLogger('orderController', 'getOrders');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for orderController - getOrders');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const result = await fetch(orderDetailUrl(customerId, orderId), {
    method: HTTP_METHOD.GET,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': uuidv4(),
      'X-Request-Id': uuidv4(),
      'x-api-key': apiKey,
    },
  });

  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
      customerId,
      orderId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      orderId,
    });
    throw new ApiError('Failed to fetch order', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    orderId,
  });

  return {
    data: data as PaginatedResponse,
    requestId,
  };
}

export async function createOrder(body: any, accessToken: string, queryParams?: any) {
  const logger = createControllerLogger('orderController', 'createOrder');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logRequest(logger, body);

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const headers = {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
    'X-Correlation-Id': uuidv4(),
    'X-Request-Id': uuidv4(),
    'x-api-key': apiKey,
  };

  let url = ordersUrl(body.customerId);

  if (queryParams) {
    const params = new URLSearchParams(queryParams).toString();
    url += `?${params}`;
  }

  const result = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers,
    body: JSON.stringify(body),
  });
  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
    });
    throw new ApiError('Non-JSON response from API', result.status, requestId);
  }
  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
    });
    throw new ApiError(JSON.stringify(data), result.status, requestId);
  }

  logResponse(logger, data, requestId, {});

  try {
    let parsedOrder = OrderSchema.parse(data);
    return {
      data: parsedOrder,
      requestId,
    };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      validationError: String(err),
    });
    throw new ApiError('Order data validation failed', 500, requestId);
  }
}

export async function updateOrder(
  customerId: string,
  orderId: string,
  externalReferenceId: string,
  accessToken: string
) {
  const logger = createControllerLogger('orderController', 'updateOrder');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logRequest(logger, { customerId, orderId, externalReferenceId });

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const result = await fetch(orderDetailUrl(customerId, orderId), {
    method: HTTP_METHOD.PATCH,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Correlation-Id': uuidv4(),
      'X-Request-Id': uuidv4(),
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ externalReferenceId }),
  });

  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
      customerId,
      orderId,
    });
    throw new ApiError('Non-JSON response from API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      orderId,
    });
    throw new ApiError(data.error || 'Failed to update order', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    orderId,
  });

  try {
    return OrderSchema.parse(data);
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      orderId,
      validationError: String(err),
    });
    throw new ApiError('Order data validation failed', 500, requestId);
  }
}

// 1. Create New Order
export async function createNewOrder(
  customerId: string,
  externalReferenceId: string,
  currencyCode: string,
  lineItems: any[],
  accessToken: string
) {
  const logger = createControllerLogger('orderController', 'createNewOrder');
  logger.info('Request Received for orderController - createNewOrder');

  const body = { customerId, orderType: 'NEW', externalReferenceId, currencyCode, lineItems };
  try {
    NewOrderSchema.parse(body);
  } catch (err: any) {
    logger.error({ err, errors: err?.errors }, 'Input validation failed');
    throw new ApiError('Input validation failed', 400);
  }
  return createOrder(body, accessToken);
}

// 2. Return or Cancel Order
export async function createReturnOrder(
  customerId: string,
  referenceOrderId: string,
  externalReferenceId: string,
  currencyCode: string,
  lineItems: any[],
  accessToken: string
) {
  const logger = createControllerLogger('orderController', 'createReturnOrder');
  logger.info('Request Received for orderController - createReturnOrder');

  const body = {
    customerId,
    orderType: 'RETURN',
    referenceOrderId,
    externalReferenceId,
    currencyCode,
    lineItems,
  };
  try {
    ReturnOrderSchema.parse(body);
  } catch (err) {
    logger.error({ err }, 'Input validation failed');
    throw new ApiError('Input validation failed', 400);
  }
  return createOrder(body, accessToken);
}

// 3. Preview an Order
export async function createPreviewOrder(
  customerId: string,
  externalReferenceId: string,
  currencyCode: string,
  lineItems: any[],
  accessToken: string,
  queryParams?: any
) {
  const logger = createControllerLogger('orderController', 'createPreviewOrder');
  logger.info('Request Received for orderController - createPreviewOrder');

  const body = { customerId, orderType: 'PREVIEW', externalReferenceId, currencyCode, lineItems };

  try {
    PreviewOrderSchema.parse(body);
  } catch (err) {
    logger.error({ err }, 'Input validation failed');
    throw new ApiError('Input validation failed', 400);
  }
  return createOrder(body, accessToken, queryParams);
}

// 4. Preview Renewal Order
export async function createPreviewRenewalOrder(
  customerId: string,
  currencyCode: string,
  accessToken: string,
  lineItems?: any[],
  queryParams?: any
) {
  const logger = createControllerLogger('orderController', 'createPreviewRenewalOrder');
  logger.info('Request Received for orderController - createPreviewRenewalOrder');

  const body: any = { customerId, orderType: 'PREVIEW_RENEWAL', currencyCode };
  if (lineItems) body.lineItems = lineItems;
  try {
    PreviewRenewalOrderSchema.parse(body);
  } catch (err) {
    logger.error({ err }, 'Input validation failed');
    throw new ApiError('Input validation failed', 400);
  }
  return createOrder(body, accessToken, queryParams);
}

// 5. Renewal Order
export async function createRenewalOrder(
  customerId: string,
  externalReferenceId: string,
  currencyCode: string,
  lineItems: any[],
  accessToken: string
) {
  const logger = createControllerLogger('orderController', 'createRenewalOrder');
  logger.info('Request Received for orderController - createRenewalOrder');

  const body = { customerId, orderType: 'RENEWAL', externalReferenceId, currencyCode, lineItems };
  try {
    RenewalOrderSchema.parse(body);
  } catch (err) {
    logger.error({ err }, 'Input validation failed');
    throw new ApiError('Input validation failed', 400);
  }
  return createOrder(body, accessToken);
}

/**
 * Fetches orders history for a customer with pagination support
 * @param customerId - The customer ID
 * @param offset - Pagination offset (default: 0)
 * @param limit - Number of items per page (default: 25)
 * @returns Promise<OrdersHistoryResponse> - Paginated orders history response
 */
export async function getOrdersHistoryForCustomer(
  customerId: string,
  offset: number = 0,
  limit: number = 25,
  accessToken: string
): Promise<{ data: OrdersHistoryResponseWithPagination; requestId?: string }> {
  const logger = createControllerLogger('orderController', 'getOrdersHistoryForCustomer');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for orderController - getOrdersHistoryForCustomer');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = `${ordersUrl(customerId)}?offset=${offset}&limit=${limit}`;

  const result = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/json',
      'X-Correlation-Id': uuidv4(),
      'X-Request-Id': uuidv4(),
      'x-api-key': apiKey,
    },
  });

  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
      customerId,
      offset,
      limit,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      offset,
      limit,
    });
    throw new ApiError('Failed to fetch orders history', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    totalCount: data.totalCount,
    itemsCount: data.items?.length,
  });

  try {
    const validatedData = OrdersHistoryResponseSchema.parse(data);
    const hasMore = offset + limit < validatedData.totalCount;

    return {
      data: {
        ...validatedData,
        hasMore,
      },
      requestId,
    };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      validationError: String(err),
    });
    throw new ApiError('Orders history data validation failed', 500, requestId);
  }
}
