/**
 * API route handler for orders resource.
 * Handles GET (fetch orders) and proxies other methods.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getOrders,
  getOrdersHistoryForCustomer,
  createNewOrder,
  createReturnOrder,
  createPreviewOrder,
  createPreviewRenewalOrder,
  createRenewalOrder,
} from '../../controllers/orderController';
import { ApiError } from '../../utils/apiError';
import { forwardRequestIdHeader, handlePrerequisites } from '../../utils/commonUtils';
import { HTTP_METHOD, ORDER_API_TYPE } from '../../utils/constants';
import { createAPILogger } from '../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);
  let result: any;
  let statusCode = 200;
  let responseData: any;

  try {
    const { accessToken } = await handlePrerequisites(req);

    if (req.method === HTTP_METHOD.GET) {
      const { type, customerId, orderId } = req.query;

      if (type === ORDER_API_TYPE.GET_ORDERS) {
        if (!customerId || !orderId) {
          throw new ApiError('customerId and orderId are required for type=getOrders', 400);
        }
        result = await getOrders(customerId as string, orderId as string, accessToken);
        statusCode = 200;
        responseData = result.data;
      } else if (type === ORDER_API_TYPE.GET_ORDERS_HISTORY) {
        if (!customerId) {
          throw new ApiError('customerId is required for type=getOrdersHistory', 400);
        }
        const offset = parseInt(req.query.offset as string) || 0;
        const limit = parseInt(req.query.limit as string) || 25;
        result = await getOrdersHistoryForCustomer(
          customerId as string,
          offset,
          limit,
          accessToken
        );
        statusCode = 200;
        responseData = result.data;
      } else {
        throw new ApiError(
          'Invalid or missing type parameter. Use type=getOrders or type=getOrdersHistory',
          400
        );
      }
    } else if (req.method === HTTP_METHOD.POST) {
      const { type } = req.query;
      const orderData = req.body;

      if (type === ORDER_API_TYPE.NEW) {
        const { customerId, externalReferenceId, currencyCode, lineItems } = orderData;
        result = await createNewOrder(
          customerId,
          externalReferenceId,
          currencyCode,
          lineItems,
          accessToken
        );
        statusCode = 201;
        responseData = result.data;
      } else if (type === ORDER_API_TYPE.RETURN) {
        const { customerId, referenceOrderId, externalReferenceId, currencyCode, lineItems } =
          orderData;
        result = await createReturnOrder(
          customerId,
          referenceOrderId,
          externalReferenceId,
          currencyCode,
          lineItems,
          accessToken
        );
        statusCode = 201;
        responseData = result.data;
      } else if (type === ORDER_API_TYPE.PREVIEW) {
        const { customerId, externalReferenceId, currencyCode, lineItems } = orderData;
        const { type: _type, ...restQuery } = req.query;
        result = await createPreviewOrder(
          customerId,
          externalReferenceId,
          currencyCode,
          lineItems,
          accessToken,
          restQuery
        );
        statusCode = 201;
        responseData = result.data;
      } else if (type === ORDER_API_TYPE.PREVIEW_RENEWAL) {
        const { customerId, currencyCode, lineItems } = orderData;
        const { type: _type, ...restQuery } = req.query;
        result = await createPreviewRenewalOrder(
          customerId,
          currencyCode,
          accessToken,
          lineItems,
          restQuery
        );
        statusCode = 201;
        responseData = result.data;
      } else if (type === ORDER_API_TYPE.RENEWAL_ORDER) {
        const { customerId, externalReferenceId, currencyCode, lineItems } = orderData;
        result = await createRenewalOrder(
          customerId,
          externalReferenceId,
          currencyCode,
          lineItems,
          accessToken
        );
        statusCode = 201;
        responseData = result.data;
      } else {
        throw new ApiError(
          'Invalid or missing type parameter. Use a valid order creation type.',
          400
        );
      }
    } else {
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    forwardRequestIdHeader(res, result?.requestId);

    return res.status(statusCode).json(responseData);
  } catch (error: any) {
    if (error instanceof ApiError) {
      if (error.requestId) {
        forwardRequestIdHeader(res, error.requestId);
      }
      try {
        const backendError = JSON.parse(error.message);
        res.status(error.status).json(backendError);
      } catch (parseError) {
        // If not JSON, send as regular error
        res.status(error.status).json({ error: error.message });
      }
    } else {
      logger.error({ err: error }, 'Orders API unexpected error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
