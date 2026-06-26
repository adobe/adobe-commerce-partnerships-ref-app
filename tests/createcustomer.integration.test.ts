/**
 * Integration-style unit tests for customerController — createCustomer
 *
 * Verifies:
 *  - A valid request body results in a successful customer creation response.
 *  - An invalid request body is rejected before any network call (Zod validation).
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 */
import { createCustomer } from '../controllers/customerController';
import { ApiError } from '../utils/apiError';
import type { CreateCustomer } from '../models/CustomerDetails';

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

const VALID_BODY: CreateCustomer = {
  resellerId: 'RESELLER-TEST-0001',
  externalReferenceId: '00000000-0000-0000-0000-000000000001',
  companyProfile: {
    companyName: 'Test Customer Company',
    preferredLanguage: 'en-US',
    marketSegment: 'EDU',
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
};

const CREATED_CUSTOMER_FIXTURE = {
  customerId: 'CUSTOMER-CREATED-0001',
  externalReferenceId: '00000000-0000-0000-0000-000000000001',
  resellerId: 'RESELLER-TEST-0001',
  globalSalesEnabled: false,
  companyProfile: VALID_BODY.companyProfile,
  discounts: [],
  cotermDate: '2026-01-01',
  creationDate: '2024-01-01',
  status: 'ACTIVE',
  links: { self: { uri: '/customers/CUSTOMER-CREATED-0001', method: 'GET', headers: [] } },
};

const ACCESS_TOKEN = 'test-access-token';

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

describe('customerController — createCustomer', () => {
  it('returns created customer data on a successful upstream response', async () => {
    mockFetchOk(CREATED_CUSTOMER_FIXTURE);

    const result = await createCustomer(VALID_BODY, ACCESS_TOKEN);

    expect(result.data).toMatchObject({ customerId: 'CUSTOMER-CREATED-0001' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/v3/customers');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('throws ApiError 400 for invalid body without making a network call', async () => {
    const invalidBody = { resellerId: 'RESELLER-TEST-0001' } as any;

    const err = await createCustomer(invalidBody, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(422, { message: 'Reseller not found' });

    const err = await createCustomer(VALID_BODY, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });
});
