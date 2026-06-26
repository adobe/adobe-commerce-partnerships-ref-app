import { useQueries } from '@tanstack/react-query';
import { getMarketSegmentFromOfferId, getCurrentPriceMonth } from '../utils/commonUtils';
import { PriceListResponse } from '../models/PriceList';

interface PricingResponseData {
  offerId: string;
  productFamily?: string;
  partnerPrice?: string;
  isLoading: boolean;
  error: Error | null;
}

interface PriceListRequestData {
  offerId: string;
  currencyCode: string;
  region?: string;
  priceListType?: string;
}

const fetchProductPricing = async (
  offerId: string,
  region: string,
  currency: string,
  priceListType: string = 'STANDARD'
): Promise<PriceListResponse> => {
  const marketSegment = getMarketSegmentFromOfferId(offerId);
  const priceListMonth = getCurrentPriceMonth();

  const requestBody = {
    region,
    marketSegment,
    priceListType,
    priceListMonth,
    currency,
    filters: { offerId },
  };

  const url = '/api/pricelist';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch pricing for ${offerId}: ${errorData.error || response.statusText}`
    );
  }

  return response.json();
};

/**
 * Hook for fetching pricing data for multiple subscriptions
 */
export const useProductPricing = (
  priceListRequestData: PriceListRequestData[]
): PricingResponseData[] => {
  const queries = useQueries({
    queries: priceListRequestData.map(request => {
      const region = request.region;
      const priceListType = request.priceListType || 'STANDARD';
      return {
        queryKey: [
          'subscriptionPricing',
          request.offerId,
          region,
          request.currencyCode,
          priceListType,
        ],
        queryFn: () =>
          fetchProductPricing(request.offerId, region!, request.currencyCode, priceListType),
        enabled: !!request.offerId && !!region && !!request.currencyCode,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        retryDelay: 1500,
      };
    }),
  });

  return priceListRequestData.map((sub, index) => {
    const query = queries[index];
    const offer = query.data?.offers?.[0];

    return {
      offerId: sub.offerId,
      productFamily: offer?.productFamily,
      partnerPrice: offer?.partnerPrice,
      isLoading: query.isLoading,
      error: query.error,
    };
  });
};

export const useProductNamesFromPricelist = (priceListRequestData: PriceListRequestData[]) => {
  const pricingResponseData = useProductPricing(priceListRequestData);

  const productNames: Record<string, string> = {};
  const partnerPrices: Record<string, string> = {};
  const isLoading = pricingResponseData.some(item => item.isLoading);
  const hasErrors = pricingResponseData.some(item => item.error);

  pricingResponseData.forEach(item => {
    if (item.productFamily) {
      productNames[item.offerId] = item.productFamily;
    } else if (!item.isLoading) {
      productNames[item.offerId] = item.offerId;
    }
    if (item.partnerPrice) {
      partnerPrices[item.offerId] = item.partnerPrice;
    }
  });

  return {
    productNames,
    partnerPrices,
    pricingResponseData,
    isLoading,
    hasErrors,
    getProductName: (offerId: string) => productNames[offerId],
    getPartnerPrice: (offerId: string) => partnerPrices[offerId],
  };
};
