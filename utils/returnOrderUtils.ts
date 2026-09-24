/**
 * Utilities for the Return Order Dialog's error handling.
 */

export const RETURN_ERROR_MESSAGES: Record<string, string> = {
  SWITCH_ORDER_CANCELLATION_NOT_ALLOWED:
    'The referenced order is a SWITCH order — REVERT_SWITCH must be used instead.',
  THREE_YEAR_COMMIT:
    "The return would reduce a Three-Year Commit product family's quantity below its minimum commit quantity.",
};

interface ReturnErrorLike {
  message?: string;
  additionalDetails?: string[];
}

/**
 * Builds the partner-facing toast message for a rejected return submission.
 *
 * Mirrors the order-preview error pattern (utils/cartUtils.ts::fetchOrderPreview): falls back to
 * `message` with `additionalDetails` appended, unless a known return error code is found as a
 * substring within one of the `additionalDetails` entries.
 */
export function buildReturnErrorMessage(error: ReturnErrorLike): string {
  const matchedCode = Object.keys(RETURN_ERROR_MESSAGES).find(code =>
    error.additionalDetails?.some(detail => detail.includes(code))
  );

  if (matchedCode) {
    return RETURN_ERROR_MESSAGES[matchedCode];
  }

  const base = error.message || 'Failed to create return order';

  return error.additionalDetails && error.additionalDetails.length > 0
    ? `${base} - ${error.additionalDetails.join(', ')}`
    : base;
}