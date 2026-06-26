import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchDebounce } from './useDebounce';
import {
  fetchResellersPage,
  searchResellers,
  type PaginatedResellersResponse,
} from '../utils/AccountApis';
import { getResellerListKey, getResellerSearchKey } from '../utils/queryUtils';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

export interface PaginatedResellersListInputOptions {
  itemsPerPage?: number;
  enabled?: boolean;
  prefetchEnabled?: boolean;
  search: string;
}

export interface PaginatedResellersListResponse {
  resellers: any[];
  data: PaginatedResellersResponse | undefined;
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

export const usePaginatedResellersList = (
  options: PaginatedResellersListInputOptions
): PaginatedResellersListResponse => {
  const { itemsPerPage = 50, enabled = true, prefetchEnabled = true, search } = options;

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
  } = useQuery<PaginatedResellersResponse>({
    queryKey: [...getResellerListKey(currentPage, itemsPerPage)],
    queryFn: () => fetchResellersPage(currentPage, itemsPerPage),
    enabled: enabled && !isSearchMode,
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
  } = useQuery<PaginatedResellersResponse>({
    queryKey: [...getResellerSearchKey(debouncedSearch, currentPage, itemsPerPage)],
    queryFn: () => searchResellers(debouncedSearch, currentPage, itemsPerPage),
    enabled: enabled && isSearchMode,
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const data = isSearchMode ? searchData : paginatedData;
  const isLoading = isSearchMode ? isSearchLoading : isPaginatedLoading;
  const error = isSearchMode ? searchError : paginatedError;
  const isFetching = isSearchMode ? isSearchFetching : isPaginatedFetching;
  const isPlaceholderData = isSearchMode ? isSearchPlaceholder : isPaginatedPlaceholder;
  const resellers = data?.resellers || [];
  const hasMore = data?.hasMore || false;
  const totalCount = data?.totalCount || 0;

  useEffect(() => {
    if (!prefetchEnabled || !hasMore || isPlaceholderData) return;

    const nextPage = currentPage + 1;
    if (isSearchMode) {
      queryClient.prefetchQuery({
        queryKey: [...getResellerSearchKey(debouncedSearch, nextPage, itemsPerPage)],
        queryFn: () => searchResellers(debouncedSearch, nextPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    } else {
      queryClient.prefetchQuery({
        queryKey: [...getResellerListKey(nextPage, itemsPerPage)],
        queryFn: () => fetchResellersPage(nextPage, itemsPerPage),
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
  ]);

  useEffect(() => {
    if (!prefetchEnabled || currentPage <= 1) return;

    const prevPage = currentPage - 1;
    if (isSearchMode) {
      queryClient.prefetchQuery({
        queryKey: [...getResellerSearchKey(debouncedSearch, prevPage, itemsPerPage)],
        queryFn: () => searchResellers(debouncedSearch, prevPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    } else {
      queryClient.prefetchQuery({
        queryKey: [...getResellerListKey(prevPage, itemsPerPage)],
        queryFn: () => fetchResellersPage(prevPage, itemsPerPage),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
      });
    }
  }, [currentPage, queryClient, isSearchMode, debouncedSearch, itemsPerPage, prefetchEnabled]);

  const goToPage = useCallback((page: number) => {
    if (page < 1) return;
    setCurrentPage(page);
  }, []);

  return {
    resellers,
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
