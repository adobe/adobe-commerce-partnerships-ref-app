/**
 * Test 1.1 — Pricelist currency race-condition fix + snap-back guard
 *
 * Covers two fixes in pages/catalog.tsx:
 *  1. Both prefetch effects exit early when filtersWithRegion.currency is falsy.
 *  2. The default-currency effect carries `&& !filters.currency` so it does not
 *     overwrite a user's selection on subsequent renders.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CatalogPage from '../pages/catalog';
import { prefetchAllMarketSegments, prefetchOtherMarketSegments } from '../utils/prefetchProducts';
import { usePartnerDetails } from '../contexts/PartnerContext';

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock('../utils/prefetchProducts', () => ({
  prefetchAllMarketSegments: jest.fn(),
  prefetchOtherMarketSegments: jest.fn(),
  invalidateMarketSegmentsForCurrency: jest.fn(),
  getPricelistQueryKey: jest.fn().mockReturnValue(['pricelist-infinite', 'COM', '']),
  fetchPricelistPage: jest.fn().mockResolvedValue({ offers: [], hasMore: false }),
  MARKET_SEGMENTS: ['Commercial', 'Education', 'Government'],
}));

jest.mock('../contexts/PartnerContext', () => ({ usePartnerDetails: jest.fn() }));
jest.mock('../contexts/CartContext', () => ({
  useCart: jest.fn().mockReturnValue({
    cartItemIdToQuantityMap: {},
    cartItemIdToCartItemDetailsMap: {},
    getTotalItems: jest.fn().mockReturnValue(0),
    showCartModal: false,
    setShowCartModal: jest.fn(),
    updateQuantity: jest.fn(),
    removeFromCart: jest.fn(),
    updateCartItemsFromAPI: jest.fn(),
    addToCart: jest.fn(),
    clearCustomerInfoInCart: jest.fn(),
  }),
}));
jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn().mockReturnValue({
    data: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useQueryClient: jest.fn().mockReturnValue({
    prefetchInfiniteQuery: jest.fn(),
    getQueryData: jest.fn().mockReturnValue(null),
    invalidateQueries: jest.fn(),
  }),
}));

// Heavy UI components replaced with minimal stubs
jest.mock('../components/NavigationPanel', () => ({ __esModule: true, default: () => null }));
// CatalogFilters is replaced with a native <select> so fireEvent.change works
jest.mock('../components/CatalogFilters', () => ({
  __esModule: true,
  default: ({ filters, onFiltersChange }: any) => (
    <select
      data-testid="currency-select"
      value={filters.currency}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
        onFiltersChange({ ...filters, currency: e.target.value })
      }
    >
      <option value="">--</option>
      <option value="EUR">EUR</option>
      <option value="GBP">GBP</option>
    </select>
  ),
}));
jest.mock('../components/CatalogProductCard', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/catalogCart/CartDetails', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/catalogCart/FindOrCreateCustomer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/Layout', () => ({ Layout: ({ children }: any) => <>{children}</> }));
jest.mock('@react-spectrum/s2', () => ({ SearchField: () => null, ProgressCircle: () => null }));
jest.mock('@react-spectrum/s2/icons/ShoppingCart', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../utils/ToastMessageUtils', () => ({ ErrorToast: () => null }));
jest.mock('../utils/iconPreloader', () => ({
  iconPreloader: { preloadProductFamilyIcons: jest.fn() },
}));
jest.mock('../hooks/useDebounce', () => ({
  useSearchDebounce: jest.fn().mockReturnValue({ debouncedSearch: '', isSearching: false }),
}));
jest.mock('../utils/iconUtils', () => ({
  getProductCloudCategory: jest.fn().mockReturnValue('All'),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CONTRACT_EMPTY = {
  partnerDetails: undefined,
  partnerName: '',
  availableCurrencies: [],
  region: '',
  regionCurrencies: [],
  marketSegments: [],
  isLoading: false,
  error: null,
};

const CONTRACT_READY = {
  partnerDetails: undefined,
  partnerName: 'Test Partner',
  availableCurrencies: [
    { currency: 'EUR', priceRegion: 'WE' },
    { currency: 'GBP', priceRegion: 'WE' },
  ],
  region: 'WE',
  regionCurrencies: [
    { currency: 'EUR', priceRegion: 'WE' },
    { currency: 'GBP', priceRegion: 'WE' },
  ],
  marketSegments: ['COM'],
  isLoading: false,
  error: null,
};

// ─── Setup ───────────────────────────────────────────────────────────────────

// IntersectionObserver is not available in jsdom
beforeAll(() => {
  global.IntersectionObserver = jest.fn().mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }) as any;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CatalogPage — currency race-condition fix', () => {
  const mockPrefetchAll = jest.mocked(prefetchAllMarketSegments);
  const mockPrefetchOther = jest.mocked(prefetchOtherMarketSegments);
  const mockUsePartnerDetails = usePartnerDetails as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPrefetchAll.mockClear();
    mockPrefetchOther.mockClear();
    mockUsePartnerDetails.mockReturnValue(CONTRACT_EMPTY);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not prefetch pricelists until filters.currency is populated, and does not overwrite user selection', async () => {
    const { rerender } = render(<CatalogPage />);

    // Phase A — contract not ready; currency stays ''; advance past the 1 s timer
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(mockPrefetchAll).toHaveBeenCalledTimes(0);
    expect(mockPrefetchOther).toHaveBeenCalledTimes(0);

    // Phase B — contract becomes ready; default-currency effect fires → currency = 'EUR'
    mockUsePartnerDetails.mockReturnValue(CONTRACT_READY);
    await act(async () => {
      rerender(<CatalogPage />);
    });

    // prefetchOtherMarketSegments fires when isPartnerDetailsReady becomes true (no setTimeout).
    // It may fire more than once: once when the contract loads and again after the default-currency
    // effect updates filters.currency. The last call must carry 'EUR'.
    expect(mockPrefetchOther).toHaveBeenCalled();
    const otherCalls = mockPrefetchOther.mock.calls;
    expect(otherCalls[otherCalls.length - 1][2]).toMatchObject({ currency: 'EUR' });

    // Advance past the 1 000 ms delay → prefetchAllMarketSegments fires
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(mockPrefetchAll).toHaveBeenCalledTimes(1);
    // Second argument is filtersWithRegion (queryClient, filtersWithRegion, …)
    expect(mockPrefetchAll.mock.calls[0][1]).toMatchObject({ currency: 'EUR' });

    // Phase C — user picks GBP; the !filters.currency guard keeps default-currency effect silent
    await act(async () => {
      fireEvent.change(screen.getByTestId('currency-select'), { target: { value: 'GBP' } });
    });
    expect((screen.getByTestId('currency-select') as HTMLSelectElement).value).toBe('GBP');

    // Phase D — advance timers; the most-recent prefetchAll call must carry GBP
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    const allCalls = mockPrefetchAll.mock.calls;
    expect(allCalls.length).toBeGreaterThanOrEqual(2);
    expect(allCalls[allCalls.length - 1][1]).toMatchObject({ currency: 'GBP' });
    expect(allCalls[allCalls.length - 1][1]).not.toMatchObject({ currency: 'EUR' });
  });
});
