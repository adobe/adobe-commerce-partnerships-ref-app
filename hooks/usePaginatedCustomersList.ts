import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchDebounce } from './useDebounce';
import { fetchCustomersPage, searchCustomers } from '../utils/AccountApis';
import { getCustomerListKey, getCustomerSearchKey } from '../utils/queryUtils';
import { PaginatedCustomersResponse } from '../controllers/customerController';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

export interface UsePaginatedCustomersListOptions {
  resellerId: string;
  itemsPerPage?: number;
  enabled?: boolean;
  prefetchEnabled?: boolean;
  search: string;
}

export interface UsePaginatedCustomersListReturn {
  customers: any[];
  data: PaginatedCustomersResponse | undefined;
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  error: Error | null;
  debouncedSearch: string;
  isSearchMode: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  goToPage: (page: number) => void;
}

export const usePaginatedCustomersList = (
  options: UsePaginatedCustomersListOptions
): UsePaginatedCustomersListReturn => {
  const { resellerId, itemsPerPage = 50, enabled = true, prefetchEnabled = true, search } = options;

  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { debouncedSearch } = useSearchDebounce(search, 300);
  const isSearchMode = debouncedSearch.trim().length > 0;

  useEffect(() => {
    if (isSearchMode) setCurrentPage(1);
  }, [debouncedSearch, isSearchMode]);

  const {
    data: paginatedData,
    isLoading: isPaginatedLoading,
    error: paginatedError,
    isFetching: isPaginatedFetching,
    isPlaceholderData: isPaginatedPlaceholder,
  } = useQuery<PaginatedCustomersResponse>({
    queryKey: [...getCustomerListKey(resellerId, currentPage, itemsPerPage)],
    queryFn: () => fetchCustomersPage(resellerId, currentPage, itemsPerPage),
    enabled: enabled && !isSearchMode && !!resellerId,
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
    isFetching: isSearchFetching,
    isPlaceholderData: isSearchPlaceholder,
  } = useQuery<PaginatedCustomersResponse>({
    queryKey: [...getCustomerSearchKey(resellerId, debouncedSearch, currentPage, itemsPerPage)],
    queryFn: () => searchCustomers(resellerId, debouncedSearch, currentPage, itemsPerPage),
    enabled: enabled && isSearchMode && !!resellerId,
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const data = isSearchMode ? searchData : paginatedData;
  const isLoading = isSearchMode ? isSearchLoading : isPaginatedLoading;
  const error = isSearchMode ? searchError : paginatedError;
  const isFetching = isSearchMode ? isSearchFetching : isPaginatedFetching;
  const isPlaceholderData = isSearchMode ? isSearchPlaceholder : isPaginatedPlaceholder;
  const customers = data?.customers || [];
  const hasMore = data?.hasMore || false;
  const totalCount = data?.totalCount || 0;

  useEffect(() => {
    if (!prefetchEnabled || !hasMore || isPlaceholderData || !resellerId) return;

    const nextPage = currentPage + 1;
    if (isSearchMode) {
      queryClient.prefetchQuery({
        queryKey: [...getCustomerSearchKey(resellerId, debouncedSearch, nextPage, itemsPerPage)],
        queryFn: () => searchCustomers(resellerId, debouncedSearch, nextPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    } else {
      queryClient.prefetchQuery({
        queryKey: [...getCustomerListKey(resellerId, nextPage, itemsPerPage)],
        queryFn: () => fetchCustomersPage(resellerId, nextPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    }
  }, [
    hasMore,
    currentPage,
    isPlaceholderData,
    queryClient,
    isSearchMode,
    debouncedSearch,
    itemsPerPage,
    prefetchEnabled,
    resellerId,
  ]);

  useEffect(() => {
    if (!prefetchEnabled || currentPage <= 1 || !resellerId) return;

    const prevPage = currentPage - 1;
    if (isSearchMode) {
      queryClient.prefetchQuery({
        queryKey: [...getCustomerSearchKey(resellerId, debouncedSearch, prevPage, itemsPerPage)],
        queryFn: () => searchCustomers(resellerId, debouncedSearch, prevPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    } else {
      queryClient.prefetchQuery({
        queryKey: [...getCustomerListKey(resellerId, prevPage, itemsPerPage)],
        queryFn: () => fetchCustomersPage(resellerId, prevPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    }
  }, [
    currentPage,
    queryClient,
    isSearchMode,
    debouncedSearch,
    itemsPerPage,
    prefetchEnabled,
    resellerId,
  ]);

  const goToPage = useCallback((page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
  }, []);

  return {
    customers,
    data,
    totalCount,
    hasMore,
    isLoading,
    isFetching,
    isPlaceholderData,
    error: error as Error | null,
    debouncedSearch,
    isSearchMode,
    currentPage,
    setCurrentPage,
    goToPage,
  };
};
