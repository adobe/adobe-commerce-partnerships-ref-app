import { NextApiRequest, NextApiResponse } from 'next';
import { getResellerDetails, findResellerByName } from '../../controllers/resellerController';
import { getCustomer, findCustomerByName } from '../../controllers/customerController';
import { ApiError } from '../../utils/apiError';
import { handlePrerequisites, forwardRequestIdHeader } from '../../utils/commonUtils';
import { createAPILogger } from '../../utils/logger';

function isNumericSearch(query: string): boolean {
  return /^\d{3,}$/.test(query.trim());
}

async function searchResellers(
  query: string,
  accessToken: string,
  offset: number = 0,
  limit: number = 50
): Promise<{
  resellers: any[];
  totalCount: number;
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}> {
  const nameSearchPromise = findResellerByName(`*${query}*`, accessToken, offset, limit);

  const searchPromises: Promise<any>[] = [nameSearchPromise];
  if (isNumericSearch(query)) {
    searchPromises.push(getResellerDetails(query, accessToken));
  }

  const results = await Promise.allSettled(searchPromises);

  const nameSearchResult = results[0].status === 'fulfilled' ? results[0].value.data : null;
  const nameSearchData =
    nameSearchResult?.resellers ?? (Array.isArray(nameSearchResult) ? nameSearchResult : []);
  const nameSearchTotalCount = nameSearchResult?.totalCount ?? nameSearchData.length;
  const nameSearchHasMore = nameSearchResult?.hasMore ?? false;

  const numericResult =
    results.length > 1 && results[1].status === 'fulfilled' ? results[1].value.data : null;

  const existingIds = new Set(nameSearchData.map((r: any) => r.resellerId));
  const combinedResults = [...nameSearchData];

  const isNumericUnique = numericResult && !existingIds.has(numericResult.resellerId);
  if (isNumericUnique) {
    if (combinedResults.length < limit) {
      combinedResults.push(numericResult);
    }
  }

  const totalCount = nameSearchTotalCount + (isNumericUnique ? 1 : 0);
  const count = combinedResults.length;
  const hasMore = nameSearchHasMore || (isNumericUnique && combinedResults.length >= limit);

  return {
    resellers: combinedResults,
    totalCount,
    count,
    offset,
    limit,
    hasMore,
  };
}

async function searchCustomers(
  resellerId: string,
  query: string,
  accessToken: string,
  offset: number = 0,
  limit: number = 50
): Promise<{
  customers: any[];
  totalCount: number;
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}> {
  const nameSearchPromise = findCustomerByName(
    resellerId,
    `*${query}*`,
    accessToken,
    offset,
    limit
  );

  const searchPromises: Promise<any>[] = [nameSearchPromise];
  if (isNumericSearch(query)) {
    searchPromises.push(getCustomer(query, accessToken));
  }

  const results = await Promise.allSettled(searchPromises);

  const nameSearchResult = results[0].status === 'fulfilled' ? results[0].value.data : null;
  const nameSearchData =
    nameSearchResult?.customers ?? (Array.isArray(nameSearchResult) ? nameSearchResult : []);
  const nameSearchTotalCount = nameSearchResult?.totalCount ?? nameSearchData.length;
  const nameSearchHasMore = nameSearchResult?.hasMore ?? false;

  const numericResult =
    results.length > 1 && results[1].status === 'fulfilled' ? results[1].value.data : null;

  const existingIds = new Set(nameSearchData.map((c: any) => c.customerId));
  const combinedResults = [...nameSearchData];

  const isNumericUnique = numericResult && !existingIds.has(numericResult.customerId);
  if (isNumericUnique) {
    if (combinedResults.length < limit) {
      combinedResults.push(numericResult);
    }
  }

  const totalCount = nameSearchTotalCount + (isNumericUnique ? 1 : 0);
  const count = combinedResults.length;
  const hasMore = nameSearchHasMore || (isNumericUnique && combinedResults.length >= limit);

  return {
    customers: combinedResults,
    totalCount,
    count,
    offset,
    limit,
    hasMore,
  };
}

/**
 * API Route Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, query, resellerId, offset, limit } = req.query;

  // Validate required parameters
  if (!type || !query) {
    return res.status(400).json({ error: 'Missing required parameters: type and query' });
  }

  if (typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }

  // Parse pagination parameters
  const offsetNum = offset ? parseInt(offset as string, 10) : 0;
  const limitNum = limit ? parseInt(limit as string, 10) : 50;

  if (isNaN(offsetNum) || offsetNum < 0) {
    return res.status(400).json({ error: 'Invalid offset parameter' });
  }

  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid limit parameter' });
  }

  try {
    const { accessToken } = await handlePrerequisites(req);
    let results;

    switch (type) {
      case 'reseller':
        results = await searchResellers(query, accessToken, offsetNum, limitNum);
        break;

      case 'customer':
        if (!resellerId) {
          return res.status(400).json({ error: 'resellerId required for customer search' });
        }
        results = await searchCustomers(
          resellerId as string,
          query,
          accessToken,
          offsetNum,
          limitNum
        );
        break;

      default:
        return res
          .status(400)
          .json({ error: 'Invalid search type. Must be "reseller" or "customer"' });
    }

    return res.status(200).json(results);
  } catch (error: any) {
    logger.error({ err: error, type, queryPrefix: query.substring(0, 20) }, 'Search API error');

    if (error instanceof ApiError) {
      if (error.requestId) {
        forwardRequestIdHeader(res, error.requestId);
      }
      return res.status(error.status).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: error.message || 'Search failed',
    });
  }
}
