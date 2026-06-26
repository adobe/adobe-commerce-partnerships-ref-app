/**
 * Integration-style unit tests for subscriptionController — getSubscriptionDetails
 *
 * Verifies:
 *  - A successful upstream response returns validated subscription data.
 *  - Missing access token throws ApiError 500 before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 *  - A non-JSON upstream response throws ApiError instead of crashing.
 */
import { getSubscriptionDetails } from '../controllers/subscriptionController';
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
const SUBSCRIPTION_ID = 'SUBSCRIPTION-TEST-0001';
const ACCESS_TOKEN = 'test-access-token';

const SUBSCRIPTION_FIXTURE = {
  subscriptionId: SUBSCRIPTION_ID,
  offerId: 'OFFER-TEST-0001',
  currentQuantity: 10,
  usedQuantity: 5,
  renewalDate: '2026-01-01',
  creationDate: '2024-01-01',
  status: 'ACTIVE',
  autoRenewal: {
    enabled: true,
    renewalQuantity: 10,
  },
  currencyCode: 'USD',
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

describe('subscriptionController — getSubscriptionDetails', () => {
  it('returns validated subscription data on a successful upstream response', async () => {
    mockFetchOk(SUBSCRIPTION_FIXTURE);

    const result = await getSubscriptionDetails(CUSTOMER_ID, SUBSCRIPTION_ID, ACCESS_TOKEN);

    expect(result.data).toMatchObject({ subscriptionId: SUBSCRIPTION_ID });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(url).toContain(SUBSCRIPTION_ID);
    expect(options.method).toBe('GET');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('throws ApiError 500 when access token is missing, without making a network call', async () => {
    const err = await getSubscriptionDetails(CUSTOMER_ID, SUBSCRIPTION_ID, '').catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(404, { message: 'Subscription not found' });

    const err = await getSubscriptionDetails(CUSTOMER_ID, SUBSCRIPTION_ID, ACCESS_TOKEN).catch(
      e => e
    );

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
  });

  it('throws ApiError when the upstream response is not valid JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'not-json',
      headers: { get: () => null },
    });

    const err = await getSubscriptionDetails(CUSTOMER_ID, SUBSCRIPTION_ID, ACCESS_TOKEN).catch(
      e => e
    );

    expect(err).toBeInstanceOf(ApiError);
  });
});
