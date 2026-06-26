/**
 * Integration-style unit tests for resellerController — createReseller
 *
 * Verifies:
 *  - A valid request body creates a reseller and returns the response data.
 *  - An invalid body (missing required field) is rejected by Zod before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 */
import { createReseller } from '../controllers/resellerController';
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

const ACCESS_TOKEN = 'test-access-token';

const VALID_BODY = {
  distributorId: 'DISTRIBUTOR-TEST-0001',
  externalReferenceId: '00000000-0000-0000-0000-000000000001',
  resellerId: 'RESELLER-TEST-0001',
  status: 'ACTIVE',
  creationDate: '2024-01-01',
  companyProfile: {
    companyName: 'Test Reseller Company',
    preferredLanguage: 'en-US',
    marketSegments: ['COM', 'EDU', 'GOV'],
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
        phoneNumber: '555-0100',
      },
    ],
  },
};

const CREATED_RESELLER_FIXTURE = {
  ...VALID_BODY,
  resellerId: 'RESELLER-CREATED-0001',
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

describe('resellerController — createReseller', () => {
  it('returns reseller data on a successful upstream response', async () => {
    mockFetchOk(CREATED_RESELLER_FIXTURE);

    const result = await createReseller(VALID_BODY, ACCESS_TOKEN);

    expect(result.data).toMatchObject({ distributorId: 'DISTRIBUTOR-TEST-0001' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/v3/resellers');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);

    const sentBody = JSON.parse(options.body);
    expect(sentBody.distributorId).toBe('DISTRIBUTOR-TEST-0001');
  });

  it('throws ApiError 400 when distributorId is missing, without making a network call', async () => {
    const { distributorId: _, ...bodyMissingDistributor } = VALID_BODY;

    const err = await createReseller(bodyMissingDistributor, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError 400 when companyProfile is missing, without making a network call', async () => {
    const { companyProfile: _, ...bodyMissingProfile } = VALID_BODY;

    const err = await createReseller(bodyMissingProfile, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(409, { error: 'Reseller already exists' });

    const err = await createReseller(VALID_BODY, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
  });
});
