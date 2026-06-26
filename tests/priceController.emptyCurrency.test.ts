/**
 * Test 1.2 — Server-side currency guard + Zod schema
 *
 * Verifies:
 *  - getPriceList throws HTTP 400 with "Currency is required" when currency is whitespace-only
 *    (whitespace passes Zod .min(1) but fails the explicit .trim() === '' guard)
 *  - No fetch call is made before the rejection
 *  - PriceListRequestSchema rejects empty and missing currency fields
 *
 * NOTE: An empty string fails Zod's .min(1) constraint before reaching the explicit guard,
 * so the error message is "Input validation failed" rather than "Currency is required". To
 * reach the guard that produces "Currency is required", a whitespace-only value (`'   '`) is
 * used here — it satisfies .min(1) (length 3) but is trimmed to '' by the explicit check.
 */
import { getPriceList } from '../controllers/priceController';
import { PriceListRequestSchema } from '../models/PriceList';
import { ApiError } from '../utils/apiError';

// ─── Logger mock ─────────────────────────────────────────────────────────────
// Variable must start with 'mock' so jest.mock hoisting can access it.

// Variable must start with 'mock' so jest.mock hoisting can access it.
const mockCapturedLogs: Array<Record<string, any>> = [];

jest.mock('../utils/logger', () => {
  const capturedLogger = {
    info: (data: Record<string, any>, msg: string) =>
      mockCapturedLogs.push({
        ...(typeof data === 'object' && data !== null ? data : {}),
        msg,
        level: 'info',
      }),
    error: (data: Record<string, any>, msg: string) =>
      mockCapturedLogs.push({
        ...(typeof data === 'object' && data !== null ? data : {}),
        msg,
        level: 'error',
      }),
  };
  return {
    createControllerLogger: () => capturedLogger,
    logRequest: (log: any, body: any, meta: any) =>
      log.info({ ...meta, requestBody: JSON.stringify(body) }, 'Request'),
    logResponse: (log: any, _d: any, reqId: any, meta: any) =>
      log.info({ ...meta, requestId: reqId }, 'Response'),
    logErrorResponse: (log: any, _d: any, reqId: any, meta: any) =>
      log.error({ ...meta, requestId: reqId }, 'Error'),
    logger: { child: () => capturedLogger },
    default: { child: () => capturedLogger },
  };
});

// ─── Environment isolation ────────────────────────────────────────────────────

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  process.env.PARTNER_API_BASE_URL = 'https://api.test';
  process.env.PARTNER_CLIENT_ID = 'test-partner-client-id';
  mockCapturedLogs.length = 0;
  (global.fetch as jest.Mock).mockClear();
});

afterEach(() => {
  process.env = savedEnv;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('priceController — empty / missing currency', () => {
  it('rejects whitespace-only currency with 400 before calling the upstream API', async () => {
    // Whitespace-only currency: passes Zod .min(1) but triggers the explicit trim guard
    const body = {
      region: 'NA',
      marketSegment: 'COM',
      priceListType: 'STANDARD',
      priceListMonth: '202404',
      currency: '   ',
    };

    const err = await getPriceList(body, 'test-access-token').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toMatch(/currency is required/i);

    // No upstream network call should be made
    expect(global.fetch).toHaveBeenCalledTimes(0);

    // At least one log entry is captured (the request-received and error entries)
    expect(mockCapturedLogs.length).toBeGreaterThan(0);
  });

  it('Zod schema rejects empty-string currency', () => {
    const result = PriceListRequestSchema.safeParse({ marketSegment: 'COM', currency: '' });
    expect(result.success).toBe(false);
  });

  it('Zod schema rejects missing currency field', () => {
    const result = PriceListRequestSchema.safeParse({ marketSegment: 'COM' });
    expect(result.success).toBe(false);
  });
});
