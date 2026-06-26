/**
 * Integration-style unit tests for orderController — createReturnOrder
 *
 * Verifies:
 *  - A valid return request is accepted and returns the parsed order response.
 *  - An invalid payload (missing required fields) is rejected by Zod before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 */
import { createReturnOrder } from '../controllers/orderController';
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
const REFERENCE_ORDER_ID = 'ORDER-TEST-0001';
const ACCESS_TOKEN = 'test-access-token';

const LINE_ITEMS = [
  {
    extLineItemNumber: 1,
    offerId: 'OFFER-TEST-0001',
    quantity: 5,
  },
];

const RETURN_ORDER_FIXTURE = {
  orderId: 'ORDER-RETURN-0001',
  customerId: CUSTOMER_ID,
  orderType: 'RETURN',
  status: 'COMPLETED',
  referenceOrderId: REFERENCE_ORDER_ID,
  externalReferenceId: 'return-ext-ref-001',
  currencyCode: 'USD',
  lineItems: LINE_ITEMS,
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

describe('orderController — createReturnOrder', () => {
  it('returns the return order on a successful upstream response', async () => {
    mockFetchOk(RETURN_ORDER_FIXTURE);

    const result = await createReturnOrder(
      CUSTOMER_ID,
      REFERENCE_ORDER_ID,
      'return-ext-ref-001',
      'USD',
      LINE_ITEMS,
      ACCESS_TOKEN
    );

    expect(result.data).toMatchObject({ customerId: CUSTOMER_ID, orderType: 'RETURN' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);

    const sentBody = JSON.parse(options.body);
    expect(sentBody.orderType).toBe('RETURN');
    expect(sentBody.referenceOrderId).toBe(REFERENCE_ORDER_ID);
  });

  it('throws ApiError 400 for invalid line items without making a network call', async () => {
    const invalidLineItems = [{ offerId: 'OFFER-TEST-0001' }] as any;

    const err = await createReturnOrder(
      CUSTOMER_ID,
      REFERENCE_ORDER_ID,
      'return-ext-ref-001',
      'USD',
      invalidLineItems,
      ACCESS_TOKEN
    ).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(422, { error: 'Return window expired' });

    const err = await createReturnOrder(
      CUSTOMER_ID,
      REFERENCE_ORDER_ID,
      'return-ext-ref-001',
      'USD',
      LINE_ITEMS,
      ACCESS_TOKEN
    ).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });
});
