/**
 * API route handler for resellers resource.
 * Uses 'type' query parameter to determine which operation to perform.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAllResellers,
  getResellerDetails,
  createReseller,
} from '../../controllers/resellerController';
import { ApiError } from '../../utils/apiError';
import { ZodError } from 'zod';
import { createAPILogger } from '../../utils/logger';
import { forwardRequestIdHeader, handlePrerequisites } from '../../utils/commonUtils';
import { HTTP_METHOD, RESELLER_API_TYPE } from '../../utils/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);

  // Handle preflight request
  if (req.method === HTTP_METHOD.OPTIONS) {
    res.status(200).end();
    return;
  }

  const { type, id, companyName } = req.query;
  let result: any;
  let statusCode = 200;
  let responseData: any;

  try {
    const { accessToken } = await handlePrerequisites(req);

    if (req.method === HTTP_METHOD.GET) {
      logger.info({ type, id, companyName }, 'Resellers GET request received');
      // Get specific reseller details
      if (type === RESELLER_API_TYPE.GET_RESELLER_DETAILS) {
        if (!id) {
          throw new ApiError('resellerId is required for type=getResellerDetails', 400);
        }
        result = await getResellerDetails(id as string, accessToken);
        statusCode = 200;
        responseData = result.data;
      }
      // Get all resellers
      else if (type === RESELLER_API_TYPE.GET_ALL_RESELLERS) {
        // Parse pagination parameters from query
        const offset = parseInt(req.query.offset as string) || 0;
        const limit = parseInt(req.query.limit as string) || 50;

        result = await getAllResellers(offset, limit, accessToken);
        statusCode = 200;
        responseData = result.data;
      } else {
        throw new ApiError(
          'Invalid or missing type parameter. Use type=getResellerDetails or type=getAllResellers',
          400
        );
      }
    } else if (req.method === HTTP_METHOD.POST) {
      const { type: bodyType } = req.query;
      // Create a new reseller
      if (bodyType === RESELLER_API_TYPE.CREATE_RESELLER || !bodyType) {
        // Allow both explicit type=createReseller and no type for backward compatibility
        result = await createReseller(req.body, accessToken);
        statusCode = 201;
        responseData = result.data;
      } else {
        throw new ApiError('Invalid type parameter for POST. Use type=createReseller', 400);
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    forwardRequestIdHeader(res, result?.requestId);

    return res.status(statusCode).json(responseData);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error({ error: error.message || error, stack: error.stack }, 'API Error');
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
