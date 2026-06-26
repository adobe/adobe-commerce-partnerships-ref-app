import type { NextApiRequest, NextApiResponse } from 'next';
import { getOfferSwitchPaths } from '../../controllers/switchOrderController';
import { ApiError } from '../../utils/apiError';
import { forwardRequestIdHeader, handlePrerequisites } from '../../utils/commonUtils';
import { HTTP_METHOD } from '../../utils/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { accessToken } = await handlePrerequisites(req);

    if (req.method !== HTTP_METHOD.GET) {
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const {
      'market-segment': marketSegment,
      country,
      language,
      'offer-id': offerId,
      'subscription-id': subscriptionId,
      'customer-id': customerId,
      limit,
      offset,
    } = req.query;

    const result = await getOfferSwitchPaths(accessToken, {
      marketSegment: marketSegment as string | undefined,
      country: country as string | undefined,
      language: language as string | undefined,
      offerId: offerId as string | undefined,
      subscriptionId: subscriptionId as string | undefined,
      customerId: customerId as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    forwardRequestIdHeader(res, result.requestId);
    return res.status(200).json(result.data);
  } catch (error: any) {
    if (error instanceof ApiError) {
      if (error.requestId) forwardRequestIdHeader(res, error.requestId);
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
