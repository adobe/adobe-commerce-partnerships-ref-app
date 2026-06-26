import {
  RecommendationRequestSchema,
  RecommendationResponseSchema,
} from '../models/recommendation';
import { ApiError } from '../utils/apiError';
import { v4 as uuidv4 } from 'uuid';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import type { BackendResult } from '../models/Result';
import { HTTP_METHOD } from '../utils/constants';

const baseUrl = process.env.PARTNER_API_BASE_URL;
const recommendationsUrl = `${baseUrl}/v3/recommendations`;

export async function getRecommendations(
  params: any,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('recommendationController', 'getRecommendations');
  const { access_token } = { access_token: accessToken };

  logger.info('Request Received for recommendationController');

  // Validate input - convert customerId to number if it's a string
  const validatedParams = {
    ...params,
    customerId:
      typeof params.customerId === 'string' ? parseInt(params.customerId) : params.customerId,
  };

  try {
    RecommendationRequestSchema.parse(validatedParams);
  } catch (e: any) {
    logger.error(
      {
        error: e.message || e,
        customerId: validatedParams.customerId,
      },
      'Input validation failed'
    );
    throw new ApiError('Recommendation input validation failed', 400);
  }

  // Prepare request body
  const requestBody: {
    customerId: number;
    recommendationContext?: string;
  } = {
    customerId: validatedParams.customerId,
  };

  if (params.recommendationContext) {
    requestBody.recommendationContext = params.recommendationContext;
  }

  logRequest(logger, requestBody, {
    customerId: validatedParams.customerId,
  });

  const url = recommendationsUrl;
  const result = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': process.env.PARTNER_CLIENT_ID || '',
      'X-Request-Id': uuidv4(),
      'X-Correlation-Id': uuidv4(),
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await result.text();
  const responseRequestId = extractRequestIdFromResponse(result);

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text: responseText }, responseRequestId, {
      status: result.status,
      customerId: validatedParams.customerId,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, responseRequestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, responseRequestId, {
      status: result.status,
      customerId: validatedParams.customerId,
    });
    throw new ApiError(
      data.error || 'Failed to fetch recommendations',
      result.status,
      responseRequestId
    );
  }

  logResponse(logger, data, responseRequestId, {
    customerId: validatedParams.customerId,
  });

  // Validate the response against our schema
  try {
    let parsedRecommendations = RecommendationResponseSchema.parse(data);
    return {
      data: parsedRecommendations,
      requestId: responseRequestId,
    };
  } catch (validationError) {
    logErrorResponse(logger, data, responseRequestId, {
      status: result.status,
      customerId: validatedParams.customerId,
      validationError: String(validationError),
    });
    // Return the raw data if validation fails
    return {
      data: data,
      requestId: responseRequestId,
    };
  }
}
