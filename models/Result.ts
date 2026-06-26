/**
 * Result type that includes request ID from backend
 */
export interface BackendResult<T> {
  data: T;
  requestId?: string;
}
