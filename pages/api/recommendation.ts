import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecommendations } from '../../controllers/recommendationController';
import { ApiError } from '../../utils/apiError';
import { forwardRequestIdHeader, handlePrerequisites } from '../../utils/commonUtils';
import { HTTP_METHOD } from '../../utils/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { accessToken } = await handlePrerequisites(req);

    let result: any;

    if (req.method === HTTP_METHOD.GET) {
      const params = {
        recommendationContext: req.query.recommendationContext as string,
        customerId: req.query.customerId as string,
        country: req.query.country as string,
        language: req.query.language as string,
      };
      result = await getRecommendations(params, accessToken);
    } else {
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    forwardRequestIdHeader(res, result.requestId);

    return res.status(200).json(result.data);
  } catch (error: any) {
    if (error instanceof ApiError) {
      if (error.requestId) {
        forwardRequestIdHeader(res, error.requestId);
      }
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
