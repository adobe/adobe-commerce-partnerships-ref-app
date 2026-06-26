/**
 * Integration-style unit tests for orderController — updateOrder
 *
 * Verifies:
 *  - A successful PATCH request returns the updated order.
 *  - Missing access token throws ApiError 500 before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 *  - The request body contains only the externalReferenceId (PATCH semantics).
 */
import { updateOrder } from '../controllers/orderController';
import { ApiError } from '../utils/apiError';

jest.mock('../utils/logger', () => {
  const noopLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
  return {
    createControllerLogger: () => noopLogger,
    logRequest: jest.fn(),
    logResponse: jest.fn(),
    logErrorResponse: jest.fn(),
    logger: { child: jest.fn().mockReturnValue(noopLogger) },
    default: { child: jest.fn().mockReturnValue(noopLogger) },
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CUSTOMER_ID = 'CUSTOMER-TEST-0001';
const ORDER_ID = 'ORDER-TEST-0001';
const NEW_EXTERNAL_REF = '00000000-0000-0000-0000-000000000002';
const ACCESS_TOKEN = 'test-access-token';

const UPDATED_ORDER_FIXTURE = {
  orderId: ORDER_ID,
  customerId: CUSTOMER_ID,
  orderType: 'NEW',
  status: 'COMPLETED',
  externalReferenceId: NEW_EXTERNAL_REF,
  currencyCode: 'USD',
  lineItems: [],
};

function mockFetchOk(body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  });
}

function mockFetchError(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  });
}

// ─── Environment isolation ────────────────────────────────────────────────────

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  process.env.PARTNER_API_BASE_URL = 'https://api.test';
  process.env.PARTNER_CLIENT_ID = 'test-client-id';
  (global.fetch as jest.Mock).mockClear();
});

afterEach(() => {
  process.env = savedEnv;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('orderController — updateOrder', () => {
  it('returns the updated order on a successful upstream response', async () => {
    mockFetchOk(UPDATED_ORDER_FIXTURE);

    const result = await updateOrder(CUSTOMER_ID, ORDER_ID, NEW_EXTERNAL_REF, ACCESS_TOKEN);

    expect(result).toMatchObject({ externalReferenceId: NEW_EXTERNAL_REF });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(url).toContain(ORDER_ID);
    expect(options.method).toBe('PATCH');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);

    const sentBody = JSON.parse(options.body);
    expect(sentBody).toEqual({ externalReferenceId: NEW_EXTERNAL_REF });
  });

  it('throws ApiError 500 when access token is missing, without making a network call', async () => {
    const err = await updateOrder(CUSTOMER_ID, ORDER_ID, NEW_EXTERNAL_REF, '').catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(404, { error: 'Order not found' });

    const err = await updateOrder(CUSTOMER_ID, ORDER_ID, NEW_EXTERNAL_REF, ACCESS_TOKEN).catch(
      e => e
    );

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
  });
});
