/**
 * API route handler for customers resource.
 * Handles GET (fetch customers) and proxies other methods.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getCustomer,
  createCustomer,
  getAllCustomers,
  updateCustomer,
} from '../../controllers/customerController';
import { ApiError } from '../../utils/apiError';
import { createAPILogger } from '../../utils/logger';
import { forwardRequestIdHeader, handlePrerequisites } from '../../utils/commonUtils';
import { HTTP_METHOD, CUSTOMER_API_TYPE } from '../../utils/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);

  const { type, customerId, resellerId, offset, limit } = req.query;
  let result: any;
  let statusCode = 200;
  let responseData: any;

  try {
    const { accessToken } = await handlePrerequisites(req);

    logger.info({ type, customerId, resellerId, offset, limit }, 'API Request received');

    if (req.method === HTTP_METHOD.GET) {
      if (type === CUSTOMER_API_TYPE.GET_CUSTOMER) {
        if (!customerId || Array.isArray(customerId)) {
          throw new ApiError('customerId is required for type=getCustomer', 400);
        }
        result = await getCustomer(customerId, accessToken);
        statusCode = 200;
        responseData = result.data;
      } else if (type === CUSTOMER_API_TYPE.GET_ALL_CUSTOMERS) {
        if (!resellerId || Array.isArray(resellerId)) {
          throw new ApiError(
            'resellerId is required for type=getAllCustomers and must be a single value',
            400
          );
        }

        const offsetNum = offset ? parseInt(Array.isArray(offset) ? offset[0] : offset, 10) : 0;
        const limitNum = limit ? parseInt(Array.isArray(limit) ? limit[0] : limit, 10) : 50;

        logger.info({ resellerId, offset: offsetNum, limit: limitNum }, 'Calling getAllCustomers');
        result = await getAllCustomers(resellerId, offsetNum, limitNum, accessToken);
        logger.info(
          { customerCount: result.data.customers.length, hasMore: result.data.hasMore },
          'getAllCustomers completed'
        );
        statusCode = 200;
        responseData = result.data;
      } else {
        throw new ApiError(
          'Invalid or missing type parameter. Use type=getCustomer, type=getAllCustomers',
          400
        );
      }
    } else if (req.method === HTTP_METHOD.POST) {
      if (type === CUSTOMER_API_TYPE.CREATE_CUSTOMER) {
        result = await createCustomer(req.body, accessToken);
        statusCode = 201;
        responseData = result.data;
      } else {
        throw new ApiError('Invalid or missing type parameter. Use type=createCustomer', 400);
      }
    } else if (req.method === HTTP_METHOD.PATCH) {
      if (type === CUSTOMER_API_TYPE.UPDATE_CUSTOMER) {
        if (!customerId || Array.isArray(customerId)) {
          throw new ApiError('customerId is required for type=updateCustomer', 400);
        }
        result = await updateCustomer(customerId, req.body, accessToken);
        statusCode = 200;
        responseData = result.data;
      } else {
        throw new ApiError('Invalid or missing type parameter. Use type=updateCustomer', 400);
      }
    } else {
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    forwardRequestIdHeader(res, result?.requestId);

    return res.status(statusCode).json(responseData);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'API Error');
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
