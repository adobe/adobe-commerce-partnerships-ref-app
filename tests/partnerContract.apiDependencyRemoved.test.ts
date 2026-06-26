/**
 * Verifies that removing the internal partner-details API dependency is complete:
 *
 * Test A: getPartnerDetails never calls fetch — data comes from env vars only.
 * Test B: the returned shape has marketSegments (array), currencies (array), and
 *         each currency entry carries a priceRegion string (the region field).
 */
import { getPartnerDetails } from '../controllers/partnerDetailsController';

jest.mock('../utils/logger', () => ({
  createControllerLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  process.env.MARKET_SEGMENTS = '["COM","EDU"]';
  process.env.CURRENCIES = '["EUR","GBP"]';
  process.env.REGION = 'WE';
  (global.fetch as jest.Mock).mockClear();
});

afterEach(() => {
  process.env = savedEnv;
});

it('partner details handler does not call the removed internal API', async () => {
  await getPartnerDetails();

  const calledUrls = (global.fetch as jest.Mock).mock.calls.map(([url]: [string]) => String(url));
  for (const url of calledUrls) {
    expect(url).not.toMatch(/\/partner[-_]?details/i);
  }
  // Confirm no fetch at all — the data is built from env vars
  expect((global.fetch as jest.Mock).mock.calls.length).toBe(0);
});

it('handler returns the fields the app depends on', async () => {
  const result = await getPartnerDetails();

  expect(Array.isArray(result.data.marketSegments)).toBe(true);
  expect(result.data.marketSegments.length).toBeGreaterThan(0);

  expect(Array.isArray(result.data.currencies)).toBe(true);
  expect(result.data.currencies.length).toBeGreaterThan(0);

  // region is carried per-currency as priceRegion (no top-level region field)
  expect(typeof result.data.currencies[0].priceRegion).toBe('string');
  expect(result.data.currencies[0].priceRegion.length).toBeGreaterThan(0);
});
