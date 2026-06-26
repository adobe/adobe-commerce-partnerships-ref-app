/**
 * API route handler for subscriptions resource.
 * Uses 'type' query parameter to determine which operation to perform.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createSubscription,
  getSubscriptionDetails,
  getCustomerSubscriptions,
  updateSubscription,
} from '../../controllers/subscriptionController';
import { ApiError } from '../../utils/apiError';
import { ZodError } from 'zod';
import { handlePrerequisites, forwardRequestIdHeader } from '../../utils/commonUtils';
import { HTTP_METHOD, SUBSCRIPTION_API_TYPE } from '../../utils/constants';
import { createAPILogger } from '../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const logger = createAPILogger(req);
  const { type, customerId, subscriptionId } = req.query;
  let result: any;
  let statusCode = 200;
  try {
    const { accessToken } = await handlePrerequisites(req);

    if (req.method === HTTP_METHOD.GET) {
      if (type === SUBSCRIPTION_API_TYPE.GET_SUBSCRIPTION_DETAILS) {
        if (!customerId || !subscriptionId) {
          throw new ApiError(
            'customerId and subscriptionId are required for type=getSubscriptionDetails',
            400
          );
        }
        result = await getSubscriptionDetails(
          customerId as string,
          subscriptionId as string,
          accessToken
        );
        statusCode = 200;
      } else if (type === SUBSCRIPTION_API_TYPE.GET_CUSTOMER_SUBSCRIPTIONS) {
        if (!customerId) {
          throw new ApiError('customerId is required for type=getCustomerSubscriptions', 400);
        }
        result = await getCustomerSubscriptions(customerId as string, accessToken);
        statusCode = 200;
      } else {
        throw new ApiError(
          'Invalid or missing type parameter. Use type=getSubscriptionDetails or type=getCustomerSubscriptions',
          400
        );
      }
    } else if (req.method === HTTP_METHOD.POST) {
      const { type: bodyType } = req.query;
      if (bodyType === SUBSCRIPTION_API_TYPE.CREATE_SUBSCRIPTION || !bodyType) {
        const { customerId: bodyCustomerId } = req.body;
        if (!bodyCustomerId) {
          throw new ApiError('customerId is required in request body', 400);
        }
        result = await createSubscription(bodyCustomerId, req.body, accessToken);
        statusCode = 201;
      } else {
        throw new ApiError('Invalid type parameter for POST. Use type=createSubscription', 400);
      }
    } else if (req.method === HTTP_METHOD.PATCH) {
      const {
        customerId: bodyCustomerId,
        subscriptionId: bodySubscriptionId,
        autoRenewal,
      } = req.body;
      if (!bodyCustomerId || !bodySubscriptionId) {
        throw new ApiError('customerId and subscriptionId are required in request body', 400);
      }
      const resetFlexDiscount = req.query['reset-flex-discount-codes'] === 'true';
      result = await updateSubscription(
        bodyCustomerId,
        bodySubscriptionId,
        autoRenewal,
        accessToken,
        resetFlexDiscount
      );
      statusCode = 200;
    } else {
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    forwardRequestIdHeader(res, result?.requestId);

    return res.status(statusCode).json(result.data);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof ApiError) {
      if (error.requestId) {
        forwardRequestIdHeader(res, error.requestId);
      }
      res.status(error.status).json({ error: error.message });
    } else {
      logger.error({ err: error }, 'API Error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
