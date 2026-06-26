/**
 * Integration-style unit tests for resellerController — getResellerDetails
 *
 * Verifies:
 *  - A successful upstream response returns validated reseller details.
 *  - Missing access token throws ApiError 500 before any network call.
 *  - A non-OK upstream response is surfaced as an ApiError with the correct status.
 *  - A non-JSON upstream response throws ApiError instead of crashing.
 */
import { getResellerDetails } from '../controllers/resellerController';
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

const RESELLER_ID = 'RESELLER-TEST-0001';
const ACCESS_TOKEN = 'test-access-token';

const RESELLER_DETAILS_FIXTURE = {
  resellerId: RESELLER_ID,
  distributorId: 'DISTRIBUTOR-TEST-0001',
  externalReferenceId: '00000000-0000-0000-0000-000000000001',
  status: 'ACTIVE',
  creationDate: '2024-01-01',
  companyProfile: {
    companyName: 'Test Reseller Company',
    preferredLanguage: 'en-US',
    marketSegments: ['COM', 'EDU'],
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

describe('resellerController — getResellerDetails', () => {
  it('returns validated reseller details on a successful upstream response', async () => {
    mockFetchOk(RESELLER_DETAILS_FIXTURE);

    const result = await getResellerDetails(RESELLER_ID, ACCESS_TOKEN);

    expect(result.data).toMatchObject({
      resellerId: RESELLER_ID,
      distributorId: 'DISTRIBUTOR-TEST-0001',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(RESELLER_ID);
    expect(options.method).toBe('GET');
    expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('throws ApiError 500 when access token is missing, without making a network call', async () => {
    const err = await getResellerDetails(RESELLER_ID, '').catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws ApiError with the upstream status code on a non-OK response', async () => {
    mockFetchError(404, { error: 'Reseller not found' });

    const err = await getResellerDetails(RESELLER_ID, ACCESS_TOKEN).catch(e => e);

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

    const err = await getResellerDetails(RESELLER_ID, ACCESS_TOKEN).catch(e => e);

    expect(err).toBeInstanceOf(ApiError);
  });
});
