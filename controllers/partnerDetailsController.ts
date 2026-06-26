import { ApiError } from '../utils/apiError';
import { createControllerLogger } from '../utils/logger';
import type { BackendResult } from '../models/Result';
import { PartnerDetailsSchema, type PartnerDetails, type Currency } from '../models/PartnerDetails';

function parseEnvArray(value: string | undefined, varName: string): string[] {
  if (!value) {
    throw new ApiError(`Missing ${varName} environment variable`, 500);
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed as string[];
  } catch {
    throw new ApiError(`${varName} must be a valid JSON array (e.g. ["COM","EDU"])`, 500);
  }
}

export async function getPartnerDetails(): Promise<BackendResult<PartnerDetails>> {
  const logger = createControllerLogger('partnerDetailsController', 'getPartnerDetails');

  logger.info('Request Received for partnerDetailsController');

  try {
    const partnerName = process.env.PARTNER_NAME ?? '';
    const marketSegmentCodes = parseEnvArray(process.env.MARKET_SEGMENTS, 'MARKET_SEGMENTS');
    const currencyCodes = parseEnvArray(process.env.CURRENCIES, 'CURRENCIES');
    const region = process.env.REGION;

    if (!region) {
      throw new ApiError('Missing REGION environment variable', 500);
    }

    const marketSegments = marketSegmentCodes.map(marketSegment => ({
      programType: 'VIPMP',
      marketSegment,
    }));

    const currencies: Currency[] = currencyCodes.map(currency => ({
      priceRegion: region,
      currency,
    }));

    const partnerData = {
      partnerName,
      marketSegments,
      currencies,
    };

    const validatedPartnerData = PartnerDetailsSchema.parse(partnerData);

    logger.info(
      {
        marketSegments: marketSegmentCodes,
        currenciesCount: currencies.length,
        region,
      },
      'Partner contract built from environment variables'
    );

    return {
      data: validatedPartnerData,
      requestId: '',
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error({ error }, 'Unexpected error in getPartnerDetails');
    throw new ApiError('Internal server error', 500);
  }
}

export async function getPartnerDetailsMarketSegments(): Promise<BackendResult<string[]>> {
  const logger = createControllerLogger(
    'partnerDetailsController',
    'getPartnerDetailsMarketSegments'
  );

  logger.info('Request Received for partnerDetailsController');

  try {
    const contractResult = await getPartnerDetails();

    if (!contractResult.data) {
      throw new ApiError('Failed to fetch partner contract', 500);
    }

    const marketSegments = [
      ...new Set(contractResult.data.marketSegments.map(program => program.marketSegment)),
    ];

    logger.info(
      {
        marketSegments,
        backendRequestId: contractResult.requestId,
      },
      'Market segments extracted from partner contract'
    );

    return {
      data: marketSegments,
      requestId: contractResult.requestId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error({ error }, 'Unexpected error in getPartnerDetailsMarketSegments');
    throw new ApiError('Internal server error', 500);
  }
}

export async function getPartnerDetailsCurrencies(): Promise<BackendResult<Currency[]>> {
  const logger = createControllerLogger('partnerDetailsController', 'getPartnerDetailsCurrencies');

  logger.info('Request Received for partnerDetailsController');

  try {
    const contractResult = await getPartnerDetails();

    if (!contractResult.data) {
      throw new ApiError('Failed to fetch partner contract', 500);
    }

    logger.info(
      {
        currenciesCount: contractResult.data.currencies.length,
        backendRequestId: contractResult.requestId,
      },
      'Currencies extracted from partner contract'
    );

    return {
      data: contractResult.data.currencies,
      requestId: contractResult.requestId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error({ error }, 'Unexpected error in getPartnerDetailsCurrencies');
    throw new ApiError('Internal server error', 500);
  }
}
