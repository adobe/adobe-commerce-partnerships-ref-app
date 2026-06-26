/**
 * Integration-style unit tests for subscriptionController — getCustomerSubscriptions
 *
 * Verifies:
 *  - A successful upstream response returns a validated array of subscriptions.
 *  - Missing access token throws ApiError 500 before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 *  - A response missing the expected `items` array throws ApiError instead of crashing.
 */
import { getCustomerSubscriptions } from '../controllers/subscriptionController';
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

const SUBSCRIPTIONS_FIXTURE = {
  totalCount: 1,
  items: [
    {
      subscriptionId: 'SUBSCRIPTION-TEST-0001',
      offerId: 'OFFER-TEST-0001',
      currentQuantity: 10,
      status: 'ACTIVE',
      autoRenewal: { enabled: true, renewalQuantity: 10 },
    },
  ],
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

describe('subscriptionController — getCustomerSubscriptions', () => {
  it('returns an array of validated subscriptions on a successful upstream response', async () => {
    mockFetchOk(SUBSCRIPTIONS_FIXTURE);

    const result = await getCustomerSubscriptions(CUSTOMER_ID, ACCESS_TOKEN);

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ subscriptionId: 'SUBSCRIPTION-TEST-0001' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(url).toContain('/subscriptions');
    expect(options.method).toBe('GET');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('throws ApiError 500 when access token is missing, without making a network call', async () => {
    const err = await getCustomerSubscriptions(CUSTOMER_ID, '').catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(403, { message: 'Forbidden' });

    const err = await getCustomerSubscriptions(CUSTOMER_ID, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
  });

  it('throws ApiError when the response is missing the items array', async () => {
    mockFetchOk({ totalCount: 0 });

    const err = await getCustomerSubscriptions(CUSTOMER_ID, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
  });
});
