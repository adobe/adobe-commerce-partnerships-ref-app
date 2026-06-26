/**
 * Fetches and validates subscriptions from the external API.
 * @param access_token - The user's access token.
 * @throws {ApiError} If the request fails or validation fails.
 * @returns {Promise<Subscription[]>}
 */
import {
  SubscriptionSchema,
  CreateSubscriptionRequestSchema,
  UpdateSubscriptionRequestSchema,
} from '../models/Subscription';
import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import { HTTP_METHOD } from '../utils/constants';
import { BackendResult } from '../models/Result';

const baseUrl = process.env.PARTNER_API_BASE_URL;
const customerSubscriptionsUrl = (customerId: string) =>
  `${baseUrl}/v3/customers/${customerId}/subscriptions`;

export async function createSubscription(
  customerId: string,
  body: any,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('subscriptionController', 'createSubscription');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for subscriptionController - createSubscription');

  try {
    CreateSubscriptionRequestSchema.parse(body);
  } catch (e) {
    logger.error(
      {
        error: String(e),
        customerId,
      },
      'Input validation failed'
    );
    throw new ApiError('Subscription input validation failed', 400);
  }

  logRequest(logger, body, { customerId });

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const result = await fetch(customerSubscriptionsUrl(customerId), {
    method: HTTP_METHOD.POST,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'X-Correlation-Id': uuidv4(),
    } as Record<string, string>,
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
      customerId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
    });
    throw new ApiError(text || 'Failed to create subscription', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    subscriptionId: data.subscriptionId,
  });

  return {
    data,
    requestId: requestId,
  };
}

export async function updateSubscription(
  customerId: string,
  subscriptionId: string,
  autoRenewalBody: any,
  accessToken: string,
  resetFlexDiscount?: boolean
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('subscriptionController', 'updateSubscription');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for subscriptionController - updateSubscription');

  try {
    UpdateSubscriptionRequestSchema.parse(autoRenewalBody);
  } catch (e) {
    logger.error(
      {
        error: String(e),
        customerId,
        subscriptionId,
      },
      'Input validation failed'
    );
    throw new ApiError('Subscription input validation failed', 400);
  }

  const formattedBody = { autoRenewal: autoRenewalBody };

  logRequest(logger, formattedBody, { customerId, subscriptionId });

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const baseSubscriptionUrl = customerSubscriptionsUrl(customerId) + '/' + subscriptionId;
  const url = resetFlexDiscount
    ? `${baseSubscriptionUrl}?reset-flex-discount-codes=true`
    : baseSubscriptionUrl;

  const result = await fetch(url, {
    method: HTTP_METHOD.PATCH,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'X-Correlation-Id': uuidv4(),
    } as Record<string, string>,
    body: JSON.stringify(formattedBody),
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
      subscriptionId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      subscriptionId,
    });
    throw new ApiError(text || 'Failed to update subscription', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    subscriptionId,
  });

  return {
    data,
    requestId: requestId,
  };
}

export async function getSubscriptionDetails(
  customerId: string,
  subscriptionId: string,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('subscriptionController', 'getSubscriptionDetails');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for subscriptionController - getSubscriptionDetails');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = `${baseUrl}/customers/${customerId}/subscriptions/${subscriptionId}`;
  const result = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'X-Correlation-Id': uuidv4(),
    } as Record<string, string>,
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
      subscriptionId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      subscriptionId,
    });
    throw new ApiError(text || 'Failed to fetch subscription details', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    subscriptionId,
  });

  try {
    data = SubscriptionSchema.parse(data);
    return {
      data,
      requestId: requestId,
    };
  } catch (e) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      subscriptionId,
      validationError: String(e),
    });
    throw new ApiError('Subscription data validation failed', 500, requestId);
  }
}

export async function getCustomerSubscriptions(customerId: string, accessToken: string) {
  const logger = createControllerLogger('subscriptionController', 'getCustomerSubscriptions');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for subscriptionController - getCustomerSubscriptions');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = `${baseUrl}/v3/customers/${customerId}/subscriptions`;
  const result = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'X-Correlation-Id': uuidv4(),
    } as Record<string, string>,
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
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
    });
    throw new ApiError(text || 'Failed to fetch customer subscriptions', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    customerId,
    subscriptionCount: data.items?.length || 0,
  });

  try {
    if (!data || !data.items || !Array.isArray(data.items)) {
      throw new Error('Expected response with items array');
    }
    let subscriptions = data.items.map((sub: any) => SubscriptionSchema.parse(sub));
    return {
      data: subscriptions,
      requestId: requestId,
    };
  } catch (e) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      customerId,
      validationError: String(e),
    });
    throw new ApiError('Subscription data validation failed', 500, requestId);
  }
}
