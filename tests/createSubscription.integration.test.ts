/**
 * Integration-style unit tests for subscriptionController — createSubscription
 *
 * Verifies:
 *  - A valid request body creates a subscription and returns the response data.
 *  - An invalid body (missing required fields) is rejected by Zod before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 */
import { createSubscription } from '../controllers/subscriptionController';
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

const VALID_BODY = {
  customerId: CUSTOMER_ID,
  offerId: 'OFFER-TEST-0001',
  autoRenewal: {
    enabled: true,
    renewalQuantity: 10,
  },
};

const CREATED_SUBSCRIPTION_FIXTURE = {
  subscriptionId: 'SUBSCRIPTION-CREATED-0001',
  offerId: 'OFFER-TEST-0001',
  currentQuantity: 10,
  status: 'ACTIVE',
  autoRenewal: { enabled: true, renewalQuantity: 10 },
};

function mockFetchOk(body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 201,
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

describe('subscriptionController — createSubscription', () => {
  it('returns subscription data on a successful upstream response', async () => {
    mockFetchOk(CREATED_SUBSCRIPTION_FIXTURE);

    const result = await createSubscription(CUSTOMER_ID, VALID_BODY, ACCESS_TOKEN);

    expect(result.data).toMatchObject({ subscriptionId: 'SUBSCRIPTION-CREATED-0001' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(url).toContain('/subscriptions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('throws ApiError 400 for invalid body without making a network call', async () => {
    const invalidBody = { offerId: 'OFFER-TEST-0001' }; // missing customerId and autoRenewal

    const err = await createSubscription(CUSTOMER_ID, invalidBody, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(422, { error: 'Offer not found' });

    const err = await createSubscription(CUSTOMER_ID, VALID_BODY, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });
});
