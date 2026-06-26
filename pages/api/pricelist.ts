import type { NextApiRequest, NextApiResponse } from 'next';
import { getPriceList } from '../../controllers/priceController';
import { ApiError } from '../../utils/apiError';
import { forwardRequestIdHeader, handlePrerequisites } from '../../utils/commonUtils';
import { HTTP_METHOD } from '../../utils/constants';
import { createAPILogger } from '../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);
  if (req.method !== HTTP_METHOD.POST) {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { accessToken } = await handlePrerequisites(req);

    const result = await getPriceList(req.body, accessToken);

    forwardRequestIdHeader(res, result.requestId);

    res.status(200).json(result.data);
  } catch (err: any) {
    if (err instanceof ApiError) {
      if (err.requestId) {
        forwardRequestIdHeader(res, err.requestId);
      }
      res.status(err.status).json({ error: err.message });
    } else {
      logger.error({ err }, 'Pricelist API unexpected error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
