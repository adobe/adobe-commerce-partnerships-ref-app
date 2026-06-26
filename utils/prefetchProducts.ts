import { QueryClient } from '@tanstack/react-query';
import { CatalogFilters } from '../models/Catalog';
import { getMarketSegmentCode, getCurrentPriceMonth } from './commonUtils';
import { HTTP_METHOD } from './constants';
import { createClientLogger } from './logger';

const logger = createClientLogger('prefetchProducts');

export const MARKET_SEGMENTS = ['Commercial', 'Education', 'Government'] as const;
export type MarketSegment = (typeof MARKET_SEGMENTS)[number];
// Constants
const PRICE_LIST_TYPE_STANDARD = 'STANDARD';

interface PrefetchOptions {
  priority: 'high' | 'low';
  skipIfCached?: boolean;
}

interface PricelistFilters extends CatalogFilters {
  region?: string;
}

/**
 * Fetch function for pricelist data - moved here to avoid circular dependencies
 */
export const fetchPricelistPage = async ({
  pageParam,
  filters,
}: {
  pageParam: number;
  filters: PricelistFilters;
}) => {
  const offset = pageParam * 100;
  const limit = 100;

  const url = '/api/pricelist';

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: filters.region,
      marketSegment: getMarketSegmentCode(filters.marketSegment[0]),
      priceListType: PRICE_LIST_TYPE_STANDARD,
      priceListMonth: getCurrentPriceMonth(),
      currency: filters.currency,
      offset,
      limit,
      includeOfferAttributes: ['additionalDetail'],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch pricelist');
  }

  const data = await response.json();
  return {
    ...data,
    page: pageParam,
    hasMore: data.offers && data.offers.length === limit,
  };
};

/**
 * Generate query key for pricelist infinite query
 */
export const getPricelistQueryKey = (marketSegment: string, currency: string) => [
  'pricelist-infinite',
  getMarketSegmentCode(marketSegment),
  currency,
];

/**
 * Prefetch pricelist data for a specific market segment
 */
export const prefetchMarketSegment = async (
  queryClient: QueryClient,
  segment: MarketSegment,
  baseFilters: PricelistFilters,
  options: PrefetchOptions = { priority: 'low', skipIfCached: true }
) => {
  const queryKey = getPricelistQueryKey(segment, baseFilters.currency);

  // Check if data already exists and skip if requested
  if (options.skipIfCached && queryClient.getQueryData(queryKey)) {
    logger.debug({ segment }, 'Cache hit, skipping prefetch');
    return;
  }

  const filters = { ...baseFilters, marketSegment: [segment] };

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }: { pageParam: number }) => fetchPricelistPage({ pageParam, filters }),
      initialPageParam: 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });
  } catch (error) {
    logger.warn({ err: error, segment }, 'Failed to prefetch market segment');
  }
};

/**
 * Prefetch all market segments in the background
 */
export const prefetchAllMarketSegments = async (
  queryClient: QueryClient,
  currentFilters: PricelistFilters,
  options: PrefetchOptions = { priority: 'low', skipIfCached: true }
) => {
  const prefetchPromises = MARKET_SEGMENTS.map(segment =>
    prefetchMarketSegment(queryClient, segment, currentFilters, options)
  );

  try {
    await Promise.allSettled(prefetchPromises);
  } catch (error) {
    logger.warn({ err: error }, 'Error during background prefetch');
  }
};

/**
 * Prefetch other market segments (excluding current one)
 */
export const prefetchOtherMarketSegments = async (
  queryClient: QueryClient,
  currentSegment: MarketSegment,
  currentFilters: PricelistFilters
) => {
  const otherSegments = MARKET_SEGMENTS.filter(segment => segment !== currentSegment);

  const prefetchPromises = otherSegments.map(segment =>
    prefetchMarketSegment(queryClient, segment, currentFilters, {
      priority: 'high',
      skipIfCached: true,
    })
  );

  Promise.allSettled(prefetchPromises);
};

/**
 * Clear cache for market segments with different currency
 */
export const invalidateMarketSegmentsForCurrency = (
  queryClient: QueryClient,
  newCurrency: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['pricelist-infinite'],
    predicate: query => {
      const [, , currency] = query.queryKey as [string, string, string];
      return currency !== newCurrency;
    },
  });
};
