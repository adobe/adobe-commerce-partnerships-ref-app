import { Button, SearchField } from '@react-spectrum/s2';
import Search from '@react-spectrum/s2/icons/Search';
import { useRouter } from 'next/router';
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NavigationPanel from '../components/NavigationPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { CustomerMinimal } from '../models/Customer';
import { Layout } from '../components/Layout';
import { usePaginatedCustomersList } from '../hooks/usePaginatedCustomersList';
import { invalidateCustomers } from '../utils/queryUtils';
import { formatTotalCount } from '../utils/commonUtils';
import styles from '../styles/CustomersPage.module.css';
import commonStyles from '../styles/CommonCard.module.css';
import { RESELLER_API_TYPE } from '../utils/constants';
import { createClientLogger } from '../utils/logger';

const logger = createClientLogger('customersPage');

export default function CustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resellerId } = router.query;
  const [search, setSearch] = React.useState('');
  const itemsPerPage = 50;

  React.useEffect(() => {
    if (!resellerId && router.isReady) {
      router.push('/resellers');
    }
  }, [resellerId, router.isReady, router]);

  const resellerIdString = Array.isArray(resellerId) ? resellerId[0] : resellerId;

  const { data: resellerData, isLoading: resellerLoading } = useQuery({
    queryKey: ['reseller', resellerIdString],
    queryFn: async () => {
      const url = `/api/resellers?type=${RESELLER_API_TYPE.GET_RESELLER_DETAILS}&id=${resellerIdString}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch reseller details');
      }

      return response.json();
    },
    enabled: !!resellerIdString,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const resellerCompanyName = resellerData?.companyProfile?.companyName || null;

  const {
    customers,
    data,
    totalCount,
    hasMore,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    isSearchMode,
    currentPage,
    goToPage,
  } = usePaginatedCustomersList({
    resellerId: resellerIdString || '',
    itemsPerPage,
    prefetchEnabled: true,
    search,
  });

  return (
    <Layout activePage="customers" partnerName={resellerCompanyName || ' '}>
      {/* Navigation Panel / Breadcrumbs */}
      <NavigationPanel
        items={[
          { label: 'Resellers', href: '/resellers' },
          { label: resellerCompanyName || '\u00A0', href: undefined },
        ]}
      />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.resellerTitle}>
          {resellerLoading ? (
            <span className={styles.loadingText}>Loading...</span>
          ) : (
            resellerCompanyName || '\u00A0'
          )}
        </div>
        <div className={styles.customerTitle}>Customers</div>
      </div>

      {/* Search and Create Row */}
      <div className={commonStyles.searchRow}>
        {/* Search Field */}
        <div className={commonStyles.searchField}>
          <SearchField
            {...({ placeholder: 'Search for a customer' } as any)}
            id="customer-search"
            value={search}
            onChange={setSearch}
            size="L"
            aria-label="Search customers"
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className={commonStyles.contentGrid}>
        {/* Customers Grid */}
        <div className={commonStyles.itemsGrid}>
          {isLoading && !isPlaceholderData ? (
            <LoadingSkeleton count={itemsPerPage} />
          ) : error ? (
            <div className={`${styles.stateMessage} ${styles.errorMessage}`}>
              <div>
                <h3>Unable to load customers</h3>
                <p>{error?.message || 'An unexpected error occurred'}</p>
                <Button variant="secondary" onPress={() => invalidateCustomers(queryClient)}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className={`${styles.stateMessage} ${styles.emptyMessage}`}>
              <div>
                <h3>No customers found</h3>
                <p>
                  {search
                    ? 'Try adjusting your search terms.'
                    : 'No customers available for this reseller.'}
                </p>
                {search && <p className={styles.searchingFor}>Searching for: "{search}"</p>}
              </div>
            </div>
          ) : (
            <>
              {/* Show loading indicator while fetching in background */}
              {isFetching && isPlaceholderData && (
                <div className={styles.loadingSpinnerWrapper}>
                  <div className={styles.loadingSpinner} />
                </div>
              )}
              {/* Show search indicator when searching */}
              {isSearchMode && (
                <div className={styles.searchIndicator}>
                  <Search />
                  Search results for "{search}" ({formatTotalCount(data?.totalCount || 0)} found)
                  {isFetching && <span> - Updating...</span>}
                </div>
              )}
              {customers.map((customer: CustomerMinimal) => (
                <div
                  key={customer.customerId}
                  className={commonStyles.card}
                  onClick={() => {
                    logger.debug({ customer }, 'Navigating to customer details page');

                    router.push({
                      pathname: '/customerdetails',
                      query: {
                        resellerId: resellerId,
                        customerId: customer.customerId,
                      },
                    });
                  }}
                  role="button"
                  aria-label={`View details for ${customer.companyProfile.companyName}`}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push({
                        pathname: '/customerdetails',
                        query: {
                          resellerId: resellerId,
                          customerId: customer.customerId,
                        },
                      });
                    }
                  }}
                >
                  <div className={styles.customerInfo}>
                    <div className={styles.customerName}>{customer.companyProfile.companyName}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Pagination Controls - Bottom of Page */}
      {data && totalCount > itemsPerPage && (
        <div className={commonStyles.pagination}>
          <span className={commonStyles.paginationInfo}>
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, data.totalCount)} of{' '}
            {formatTotalCount(data.totalCount)} customers
            {isSearchMode && ' (search results)'}
          </span>

          <div className={commonStyles.paginationControls}>
            <Button
              variant="secondary"
              size="S"
              isDisabled={currentPage === 1 || (isFetching && !isPlaceholderData)}
              onPress={() => goToPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className={commonStyles.pageInfo}>
              Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
              {isFetching && isPlaceholderData && ' (Loading...)'}
            </span>
            <Button
              variant="secondary"
              size="S"
              isDisabled={!hasMore || (isFetching && !isPlaceholderData)}
              onPress={() => goToPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
