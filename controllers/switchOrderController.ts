import {
  PreviewSwitchOrderSchema,
  SwitchOrderSchema,
  SwitchOrderResponseSchema,
  OfferSwitchPathsResponseSchema,
  SwitchOrderResponse,
  OfferSwitchPathsResponse,
} from '../models/SwitchOrder';
import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import { HTTP_METHOD } from '../utils/constants';

const baseUrl = process.env.PARTNER_API_BASE_URL;
const ordersUrl = (customerId: string) => `${baseUrl}/v3/customers/${customerId}/orders`;
const offerSwitchPathsUrl = () => `${baseUrl}/v3/offer-switch-paths`;

async function postSwitchOrder(
  body: any,
  accessToken: string,
  queryParams?: Record<string, string>
): Promise<{ data: SwitchOrderResponse; requestId?: string }> {
  const logger = createControllerLogger('switchOrderController', 'postSwitchOrder');
  const apiKey = process.env.PARTNER_CLIENT_ID;

  if (!accessToken) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing PARTNER_CLIENT_ID', 500);

  let url = ordersUrl(body.customerId);
  if (queryParams && Object.keys(queryParams).length > 0) {
    url += `?${new URLSearchParams(queryParams).toString()}`;
  }

  const result = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': uuidv4(),
      'X-Request-Id': uuidv4(),
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, { status: result.status });
    throw new ApiError(JSON.stringify(data), result.status, requestId);
  }

  logResponse(logger, data, requestId);

  try {
    return { data: SwitchOrderResponseSchema.parse(data), requestId };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      validationError: String(err),
    });
    throw new ApiError('Switch order response validation failed', 500, requestId);
  }
}

export async function createPreviewSwitchOrder(
  customerId: string,
  currencyCode: string,
  lineItems: any[],
  cancellingItems?: any[],
  accessToken?: string,
  queryParams?: Record<string, string>,
  externalReferenceId?: string
) {
  const logger = createControllerLogger('switchOrderController', 'createPreviewSwitchOrder');
  logger.info('Request received');

  const body = {
    customerId,
    orderType: 'PREVIEW_SWITCH',
    ...(externalReferenceId && { externalReferenceId }),
    currencyCode,
    lineItems,
    cancellingItems,
  };
  try {
    PreviewSwitchOrderSchema.parse(body);
  } catch {
    throw new ApiError('Input validation failed', 400);
  }
  return postSwitchOrder(body, accessToken!, queryParams);
}

export async function createSwitchOrder(
  customerId: string,
  currencyCode: string,
  lineItems: any[],
  cancellingItems?: any[],
  accessToken?: string,
  queryParams?: Record<string, string>,
  externalReferenceId?: string
) {
  const logger = createControllerLogger('switchOrderController', 'createSwitchOrder');
  logger.info('Request received');

  const body = {
    customerId,
    orderType: 'SWITCH',
    ...(externalReferenceId && { externalReferenceId }),
    currencyCode,
    lineItems,
    cancellingItems,
  };
  try {
    SwitchOrderSchema.parse(body);
  } catch {
    throw new ApiError('Input validation failed', 400);
  }
  return postSwitchOrder(body, accessToken!, queryParams);
}

export async function getOfferSwitchPaths(
  accessToken: string,
  queryParams?: {
    marketSegment?: string;
    country?: string;
    language?: string;
    offerId?: string;
    subscriptionId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: OfferSwitchPathsResponse; requestId?: string }> {
  const logger = createControllerLogger('switchOrderController', 'getOfferSwitchPaths');
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logRequest(logger, { ...queryParams });

  if (!accessToken) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing PARTNER_CLIENT_ID', 500);

  const params = new URLSearchParams();
  if (queryParams?.marketSegment) params.set('market-segment', queryParams.marketSegment);
  if (queryParams?.country) params.set('country', queryParams.country);
  if (queryParams?.language) params.set('language', queryParams.language);
  if (queryParams?.offerId) params.set('offer-id', queryParams.offerId);
  if (queryParams?.subscriptionId) params.set('subscription-id', queryParams.subscriptionId);
  if (queryParams?.customerId) params.set('customer-id', queryParams.customerId);
  if (queryParams?.limit !== undefined) params.set('limit', String(queryParams.limit));
  if (queryParams?.offset !== undefined) params.set('offset', String(queryParams.offset));

  const result = await fetch(`${offerSwitchPathsUrl()}?${params.toString()}`, {
    method: HTTP_METHOD.GET,
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
  } catch {
    logErrorResponse(logger, { error: 'Parse failed', text }, requestId, {
      status: result.status,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, { status: result.status });
    throw new ApiError('Failed to fetch offer switch paths', result.status, requestId);
  }

  logResponse(logger, data, requestId, { totalCount: data.totalCount });

  try {
    return { data: OfferSwitchPathsResponseSchema.parse(data), requestId };
  } catch (err: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      validationError: String(err),
    });
    throw new ApiError('Offer switch paths response validation failed', 500, requestId);
  }
}
