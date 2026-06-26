import React from 'react';
import { Button, SearchField, Heading } from '@react-spectrum/s2';
import Search from '@react-spectrum/s2/icons/Search';
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import NavigationPanel from '../components/NavigationPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Layout } from '../components/Layout';
import { usePaginatedResellersList } from '../hooks/usePaginatedResellersList';
import { invalidateResellers } from '../utils/queryUtils';
import { formatTotalCount } from '../utils/commonUtils';
import styles from '../styles/ResellersPage.module.css';
import commonStyles from '../styles/CommonCard.module.css';
import { usePartnerDetails } from '../contexts/PartnerContext';

export default function ResellersPage() {
  const { partnerName } = usePartnerDetails();
  const router = useRouter();
  const queryClient = useQueryClient();
  const itemsPerPage = 50;
  const [search, setSearch] = React.useState('');

  const {
    resellers,
    data,
    totalCount,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    isSearchMode,
    currentPage,
    goToPage,
  } = usePaginatedResellersList({
    itemsPerPage,
    prefetchEnabled: true,
    search,
  });

  return (
    <Layout activePage="resellers" partnerName={partnerName}>
      {/* Navigation Panel / Breadcrumbs */}
      <NavigationPanel items={[]} />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <Heading level={2}>{partnerName}</Heading>
        <span className={styles.pageTitle}>Resellers</span>
      </div>

      {/* Search and Create Row */}
      <div className={commonStyles.searchRow}>
        {/* Search Field */}
        <div className={commonStyles.searchField}>
          <SearchField
            {...({ placeholder: 'Search for a reseller' } as any)}
            id="reseller-search"
            value={search}
            onChange={setSearch}
            size="L"
            aria-label="Search Resellers"
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className={commonStyles.contentGrid}>
        {/* Resellers Grid */}
        <div className={commonStyles.itemsGrid}>
          {isLoading && !isPlaceholderData ? (
            <LoadingSkeleton count={itemsPerPage} />
          ) : error ? (
            <div className={`${styles.stateMessage} ${styles.errorMessage}`}>
              <div>
                <h3>Unable to load resellers</h3>
                <p>{error?.message || 'An unexpected error occurred'}</p>
                <Button variant="secondary" onPress={() => invalidateResellers(queryClient)}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : resellers.length === 0 ? (
            <div className={`${styles.stateMessage} ${styles.emptyMessage}`}>
              <div>
                <h3>{isSearchMode ? 'No resellers match your search' : 'No resellers found'}</h3>
                <p>
                  {isSearchMode
                    ? 'Try adjusting your search terms or clear the search to see all resellers.'
                    : 'Check back later or contact support.'}
                </p>
                {search && <p className={styles.searchingFor}>Searching for: "{search}"</p>}
                {isSearchMode && (
                  <Button variant="secondary" onPress={() => setSearch('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Show loading indicator while fetching in background */}
              {isFetching && isPlaceholderData && (
                <div className={styles.loadingIndicator}>
                  <div className={styles.spinner} />
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
              {resellers.map(reseller => (
                <div
                  key={reseller.resellerId}
                  className={commonStyles.card}
                  onClick={() => {
                    router.push({
                      pathname: '/customers',
                      query: {
                        resellerId: reseller.resellerId,
                      },
                    });
                  }}
                  role="button"
                  aria-label={`View customers for ${reseller.companyProfile.companyName}`}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push({
                        pathname: '/customers',
                        query: {
                          resellerId: reseller.resellerId,
                        },
                      });
                    }
                  }}
                >
                  <div className={styles.resellerInfo}>
                    <div className={styles.resellerName}>{reseller.companyProfile.companyName}</div>
                  </div>
                  <ChevronRight />
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
            {formatTotalCount(data.totalCount)} resellers
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
              isDisabled={!data.hasMore || (isFetching && !isPlaceholderData)}
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
