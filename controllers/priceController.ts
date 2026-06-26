import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';
import {
  PriceListRequestSchema,
  PriceListResponseSchema,
  PriceListRequest,
} from '../models/PriceList';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import type { BackendResult } from '../models/Result';
import { HTTP_METHOD } from '../utils/constants';

const baseUrl = `${process.env.PARTNER_API_BASE_URL}/v3/pricelist`;

export async function getPriceList(
  body: unknown,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('priceController', 'getPriceList');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for priceController');

  // Validate input
  let parsedRequest: PriceListRequest;
  try {
    parsedRequest = PriceListRequestSchema.parse(body);
  } catch (err) {
    logger.error(
      {
        error: String(err),
      },
      'Input validation failed'
    );
    throw new ApiError('Input validation failed', 400);
  }

  if (!parsedRequest.currency || parsedRequest.currency.trim() === '') {
    logger.error('Currency is required but was empty — rejecting before upstream call');
    throw new ApiError('Currency is required', 400);
  }

  // Extract pagination params and body params
  const { offset, limit, ...bodyParams } = parsedRequest;

  logRequest(logger, bodyParams, { offset, limit });

  // Build URL - only add pagination params if they were explicitly provided
  const url = new URL(baseUrl);
  const originalBody = body as any;
  if (originalBody && typeof originalBody.offset !== 'undefined') {
    url.searchParams.append('offset', offset.toString());
  }
  if (originalBody && typeof originalBody.limit !== 'undefined') {
    url.searchParams.append('limit', limit.toString());
  }

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing API_KEY', 500);

  const result = await fetch(url.toString(), {
    method: HTTP_METHOD.POST,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-correlation-id': uuidv4(),
      'x-request-id': uuidv4(),
    },
    body: JSON.stringify(bodyParams),
  });

  const text = await result.text();
  const responseRequestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text }, responseRequestId, {
      status: result.status,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, responseRequestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, responseRequestId, {
      status: result.status,
    });
    throw new ApiError(
      data.error || 'Failed to fetch price list',
      result.status,
      responseRequestId
    );
  }

  const response = {
    ...data,
    offset,
    limit,
    hasMore: data.items && data.items.length === limit,
  };

  logResponse(logger, response, responseRequestId, {
    itemCount: data.items?.length || 0,
  });

  try {
    const validatedResponse = PriceListResponseSchema.parse(response);
    return {
      data: validatedResponse,
      requestId: responseRequestId,
    };
  } catch (err: any) {
    logErrorResponse(logger, data, responseRequestId, {
      status: result.status,
      validationError: String(err),
    });
    throw new ApiError('Price list data validation failed', 500, responseRequestId);
  }
}
