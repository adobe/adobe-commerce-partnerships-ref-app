/**
 * Integration-style unit tests for customerController — getCustomer
 *
 * Verifies:
 *  - A successful upstream response returns parsed customer data.
 *  - Missing access token throws ApiError 500 before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 *  - A non-JSON upstream response throws ApiError instead of crashing.
 */
import { getCustomer } from '../controllers/customerController';
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

const CUSTOMER_FIXTURE = {
  customerId: CUSTOMER_ID,
  externalReferenceId: 'ext-ref-001',
  resellerId: 'RESELLER-TEST-0001',
  globalSalesEnabled: false,
  companyProfile: {
    companyName: 'Test Company',
    preferredLanguage: 'en-US',
    address: {
      country: 'US',
      region: 'CA',
      city: 'San Jose',
      addressLine1: '123 Test Street',
      addressLine2: '',
      postalCode: '95110',
    },
    contacts: [
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      },
    ],
  },
  discounts: [],
  cotermDate: '2026-01-01',
  creationDate: '2024-01-01',
  status: 'ACTIVE',
  links: { self: { uri: '/customers/CUSTOMER-TEST-0001', method: 'GET', headers: [] } },
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

describe('customerController — getCustomer', () => {
  it('returns validated customer data on a successful upstream response', async () => {
    mockFetchOk(CUSTOMER_FIXTURE);

    const result = await getCustomer(CUSTOMER_ID, ACCESS_TOKEN);

    expect(result.data).toMatchObject({ customerId: CUSTOMER_ID });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(CUSTOMER_ID);
    expect(options.method).toBe('GET');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('throws ApiError 500 when access token is missing, without making a network call', async () => {
    const err = await getCustomer(CUSTOMER_ID, '').catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(404, { message: 'Customer not found' });

    const err = await getCustomer(CUSTOMER_ID, ACCESS_TOKEN).catch(e => e);

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

    const err = await getCustomer(CUSTOMER_ID, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
  });
});
