import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getPartnerDetails,
  getPartnerDetailsMarketSegments,
  getPartnerDetailsCurrencies,
} from '../../controllers/partnerDetailsController';
import { ApiError } from '../../utils/apiError';
import { forwardRequestIdHeader } from '../../utils/commonUtils';
import { HTTP_METHOD } from '../../utils/constants';
import { createAPILogger } from '../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);
  if (req.method === HTTP_METHOD.GET) {
    try {
      const { type } = req.query;

      switch (type) {
        case 'marketSegments':
          const marketSegmentsResult = await getPartnerDetailsMarketSegments();
          return res.status(200).json(marketSegmentsResult);

        case 'currencies':
          const currenciesResult = await getPartnerDetailsCurrencies();
          return res.status(200).json(currenciesResult);

        default:
          const contractResult = await getPartnerDetails();
          return res.status(200).json(contractResult);
      }
    } catch (error) {
      logger.error({ err: error }, 'Partner Contract API error');

      if (error instanceof ApiError) {
        if (error.requestId) {
          forwardRequestIdHeader(res, error.requestId);
        }
        return res.status(error.status).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  } else {
    // Method not allowed
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}
