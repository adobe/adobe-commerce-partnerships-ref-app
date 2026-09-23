/**
 * TanStack Query hooks for order operations - Checkout focused
 */

import { useMutation } from '@tanstack/react-query';
import type { CreateOrderRequest, OrderPreviewRequest, ReturnOrderRequest } from '../types/order';
import { ORDER_API_TYPE } from '../utils/constants';

/**
 * Hook for creating new orders
 */
export function useCreateOrder() {
  return useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => {
      const url = '/api/orders?type=NEW';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = JSON.stringify(errorData);
        } catch {
          errorMessage = errorText || errorMessage;
        }

        const error = new Error(errorMessage) as any;
        error.status = response.status;
        throw error;
      }

      return response.json();
    },
    retry: (failureCount, error: any) => {
      if (failureCount >= 3) return false;
      if (error.status >= 500) return true;
      if (error.message?.includes('fetch') || error.message?.includes('network')) return true;
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook for creating return orders (full order return - all eligible line items
 * at their full ordered quantity).
 */
export function useReturnOrder() {
  return useMutation({
    mutationFn: async (returnData: ReturnOrderRequest) => {
      const url = `/api/orders?type=${ORDER_API_TYPE.RETURN}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        const error = new Error(errorMessage) as any;
        error.status = response.status;
        throw error;
      }

      return response.json();
    },
  });
}

/**
 * Hook for creating order previews
 */
export function useCreateOrderPreview() {
  return useMutation({
    mutationFn: async (previewData: OrderPreviewRequest) => {
      const url = '/api/orders?type=Preview';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        const error = new Error(errorMessage) as any;
        error.status = response.status;
        throw error;
      }

      return response.json();
    },
    retry: (failureCount, error: any) => {
      if (failureCount >= 3) return false;
      if (error.status >= 500) return true;
      if (error.message?.includes('fetch') || error.message?.includes('network')) return true;
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
