import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Object with debouncedValue and isDebouncing state
 */
export function useDebounce<T>(value: T, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    // Set debouncing state when value changes
    if (value !== debouncedValue) {
      setIsDebouncing(true);
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, debouncedValue]);

  return { debouncedValue, isDebouncing };
}

/**
 * Custom hook specifically for search functionality
 * @param searchTerm - The search term to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Object with debouncedSearch and isSearching state
 */
export function useSearchDebounce(searchTerm: string, delay: number = 300) {
  const { debouncedValue, isDebouncing } = useDebounce(searchTerm, delay);

  return {
    debouncedSearch: debouncedValue,
    isSearching: isDebouncing,
  };
}
