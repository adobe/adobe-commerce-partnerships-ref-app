export class ApiError extends Error {
  status: number;
  requestId?: string;
  constructor(message: string, status: number = 500, requestId?: string) {
    super(message);
    this.status = status;
    this.requestId = requestId;
    this.name = 'ApiError';
  }
}

/**
 * Process Promise.allSettled results to extract success/failure counts and error messages
 * @param results - Array of PromiseSettledResult from Promise.allSettled
 * @returns Object containing successful count, failed count, total, and error messages array
 */
export function processSettledResults<T>(results: PromiseSettledResult<T>[]): {
  successful: number;
  failed: number;
  total: number;
  errors: string[];
} {
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const total = results.length;

  const errors: string[] = [];
  results.forEach(result => {
    if (result.status === 'rejected') {
      const errorMsg =
        result.reason instanceof Error ? result.reason.message : 'Internal error occurred.';
      errors.push(errorMsg);
    }
  });

  return {
    successful,
    failed,
    total,
    errors,
  };
}
