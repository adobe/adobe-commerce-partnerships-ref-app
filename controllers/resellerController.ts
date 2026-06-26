import { ApiError } from '../utils/apiError';
import { ResellerMinimalSchema, ResellerSchema } from '../models/Reseller';
import { v4 as uuidv4 } from 'uuid';
import { ResellerDetailsSchema } from '../models/ResellerDetails';
import { createControllerLogger, logRequest, logResponse, logErrorResponse } from '../utils/logger';
import { extractRequestIdFromResponse } from '../utils/commonUtils';
import type { BackendResult } from '../models/Result';
import { HTTP_METHOD } from '../utils/constants';

const baseUrl = process.env.PARTNER_API_BASE_URL;
const resellersUrl = `${baseUrl}/v3/resellers`;
const resellerUrl = (id: string) => `${baseUrl}/v3/resellers/${id}`;

export async function getAllResellers(
  offset: number = 0,
  limit: number = 25,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('resellerController', 'getAllResellers');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for resellerController - getAllResellers');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = `${resellersUrl}?offset=${offset}&limit=${limit}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-api-key': apiKey,
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  };

  const result = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers,
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
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text: responseText }, requestId, {
      status: result.status,
      offset,
      limit,
    });
    throw new ApiError('Invalid JSON response', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      offset,
      limit,
    });
    throw new ApiError('Failed to fetch resellers', result.status, requestId);
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
        resellers: [],
        totalCount: 0,
        count: 0,
        offset,
        limit,
        hasMore: false,
      },
      requestId,
    };
  }

  const parsedResellers = accounts.map(reseller => ResellerMinimalSchema.parse(reseller));

  logger.info(
    {
      fetchedCount: parsedResellers.length,
      offset,
      limit,
      totalCount,
      requestId,
    },
    'Fetched resellers from Adobe API'
  );

  const hasMore = offset + limit < totalCount;

  return {
    data: {
      resellers: parsedResellers,
      totalCount,
      count,
      offset,
      limit,
      hasMore,
    },
    requestId,
  };
}

export async function getResellerDetails(
  id: string,
  accessToken: string
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('resellerController', 'getResellerDetails');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for resellerController - getResellerDetails');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = resellerUrl(id);

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

  const responseText = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text: responseText }, requestId, {
      status: result.status,
      resellerId: id,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      resellerId: id,
    });
    throw new ApiError(
      (data && data.error) || 'Failed to fetch reseller details',
      result.status,
      requestId
    );
  }

  logResponse(logger, data, requestId, {
    resellerId: id,
  });

  try {
    data = ResellerDetailsSchema.parse(data);
    return {
      data,
      requestId,
    };
  } catch (e: any) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      resellerId: id,
      validationError: String(e),
    });
    throw new ApiError('Reseller data validation failed', 500, requestId);
  }
}

export async function createReseller(body: any, accessToken: string): Promise<BackendResult<any>> {
  const logger = createControllerLogger('resellerController', 'createReseller');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for resellerController - createReseller');

  try {
    ResellerSchema.parse(body);
  } catch (e: any) {
    logger.error(
      {
        error: e.message || e,
      },
      'Input validation failed'
    );
    throw new ApiError('Invalid reseller data', 400);
  }

  logRequest(logger, body);

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const result = await fetch(resellersUrl, {
    method: HTTP_METHOD.POST,
    headers: {
      Authorization: `Bearer ${access_token}`,
      'x-api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-Id': uuidv4(),
      'x-correlation-id': uuidv4(),
    } as Record<string, string>,
    body: JSON.stringify(body),
  });

  const responseText = await result.text();
  const requestId = extractRequestIdFromResponse(result);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    logErrorResponse(logger, { error: 'Parse failed', text: responseText }, requestId, {
      status: result.status,
    });
    throw new ApiError('Non-JSON response from Adobe API', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
    });
    throw new ApiError(responseText || 'Failed to create reseller', result.status, requestId);
  }

  logResponse(logger, data, requestId, {
    resellerId: data.resellerId,
  });

  return {
    data,
    requestId,
  };
}

export async function findResellerByName(
  companyName: string,
  accessToken: string,
  offset: number = 0,
  limit: number = 50
): Promise<BackendResult<any>> {
  const logger = createControllerLogger('resellerController', 'findResellerByName');
  const { access_token } = { access_token: accessToken };
  const apiKey = process.env.PARTNER_CLIENT_ID;

  logger.info('Request Received for resellerController - findResellerByName');

  if (!access_token) throw new ApiError('Missing ACCESS_TOKEN', 500);
  if (!apiKey) throw new ApiError('Missing ADOBE_API_KEY', 500);

  const url = `${baseUrl}/v3/resellers?company-name=${encodeURIComponent(companyName)}&offset=${offset}&limit=${limit}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-api-key': apiKey,
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
    'X-Request-Id': uuidv4(),
    'X-Correlation-Id': uuidv4(),
  };

  const result = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers,
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
      searchName: companyName,
      offset,
      limit,
    });
    throw new ApiError('Invalid JSON response', result.status, requestId);
  }

  if (!result.ok) {
    logErrorResponse(logger, data, requestId, {
      status: result.status,
      searchName: companyName,
      offset,
      limit,
    });
    throw new ApiError('Failed to search resellers by name', result.status, requestId);
  }

  if (!Array.isArray(accounts)) {
    logger.info(
      {
        companyName,
        requestId,
        offset,
        limit,
      },
      'No resellers found for name search'
    );
    return {
      data: {
        resellers: [],
        totalCount: 0,
        count: 0,
        offset,
        limit,
        hasMore: false,
      },
      requestId,
    };
  }

  const parsedResellers = accounts
    .map(reseller => {
      try {
        return ResellerMinimalSchema.parse(reseller);
      } catch (e) {
        logger.warn(
          { resellerId: reseller?.resellerId, requestId },
          'Skipping invalid reseller in name search'
        );
        return null;
      }
    })
    .filter(Boolean);

  const finalTotalCount = totalCount || parsedResellers.length;
  const finalCount = count || parsedResellers.length;
  const hasMore = offset + limit < finalTotalCount;

  logger.info(
    {
      foundCount: parsedResellers.length,
      totalCount: finalTotalCount,
      searchName: companyName,
      requestId,
      offset,
      limit,
    },
    'Successfully found resellers by name'
  );

  return {
    data: {
      resellers: parsedResellers,
      totalCount: finalTotalCount,
      count: finalCount,
      offset,
      limit,
      hasMore,
    },
    requestId,
  };
}
