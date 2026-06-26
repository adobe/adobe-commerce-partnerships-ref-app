/**
 * Integration-style unit tests for orderController — createNewOrder
 *
 * Verifies:
 *  - A valid request creates an order and returns the parsed response.
 *  - An invalid line-item payload is rejected by Zod before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 */
import { createNewOrder } from '../controllers/orderController';
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
const ACCESS_TOKEN = 'test-access-token';

const LINE_ITEMS = [{ extLineItemNumber: 1, offerId: 'OFFER-TEST-0001', quantity: 10 }];

const CREATED_ORDER_FIXTURE = {
  orderId: 'ORDER-CREATED-0001',
  customerId: CUSTOMER_ID,
  orderType: 'NEW',
  status: 'PENDING',
  externalReferenceId: 'ext-ref-001',
  currencyCode: 'USD',
  creationDate: '2024-01-01',
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

describe('orderController — createNewOrder', () => {
  it('returns created order data on a successful upstream response', async () => {
    mockFetchOk(CREATED_ORDER_FIXTURE);

    const result = await createNewOrder(
      CUSTOMER_ID,
      'ext-ref-001',
      'USD',
      LINE_ITEMS,
      ACCESS_TOKEN
    );

    expect(result.data).toMatchObject({ customerId: CUSTOMER_ID, orderType: 'NEW' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);

    const sentBody = JSON.parse(options.body);
    expect(sentBody.orderType).toBe('NEW');
    expect(sentBody.currencyCode).toBe('USD');
  });

  it('throws ApiError 400 for invalid line items without making a network call', async () => {
    const invalidLineItems = [{ offerId: 'OFFER-TEST-0001' }] as any;

    const err = await createNewOrder(
      CUSTOMER_ID,
      'ext-ref-001',
      'USD',
      invalidLineItems,
      ACCESS_TOKEN
    ).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(400, { error: 'Invalid offer ID' });

    const err = await createNewOrder(
      CUSTOMER_ID,
      'ext-ref-001',
      'USD',
      LINE_ITEMS,
      ACCESS_TOKEN
    ).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
  });
});
