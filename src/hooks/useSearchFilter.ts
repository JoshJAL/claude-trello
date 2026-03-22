import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useDebounce } from './useDebounce';

interface UseSearchFilterOptions {
  /** The search parameter key to use in the URL (default: 'q') */
  searchParam?: string;
  /** Debounce delay in milliseconds (default: 400ms) */
  debounceDelay?: number;
  /** Filter function to apply to items */
  filterFn: (item: any, query: string) => boolean;
}

/**
 * Custom hook for managing search input with URL persistence and debouncing.
 * Separates instant local input updates from debounced URL/API updates.
 */
export function useSearchFilter<T>(
  items: T[] | undefined,
  options: UseSearchFilterOptions
) {
  const {
    searchParam = 'q',
    debounceDelay = 400,
    filterFn
  } = options;
  
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  
  // Get initial value from URL
  const urlQuery = (search as any)?.[searchParam] || '';
  
  // Local input state for instant updates
  const [localQuery, setLocalQuery] = useState(urlQuery);
  
  // Debounced value for URL updates
  const debouncedQuery = useDebounce(localQuery, debounceDelay);
  
  // Sync local state with URL on mount/navigation
  useEffect(() => {
    setLocalQuery(urlQuery);
  }, [urlQuery]);
  
  // Update URL when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== urlQuery) {
      navigate({
        search: (prev) => ({
          ...prev,
          [searchParam]: debouncedQuery || undefined
        }),
        replace: true
      });
    }
  }, [debouncedQuery, urlQuery, searchParam, navigate]);
  
  // Filter items based on debounced query
  const filteredItems = useMemo(() => {
    if (!items || !debouncedQuery.trim()) {
      return items || [];
    }
    
    return items.filter(item => filterFn(item, debouncedQuery.toLowerCase()));
  }, [items, debouncedQuery, filterFn]);
  
  return {
    /** Current input value for controlled input */
    query: localQuery,
    /** Function to update search query */
    setQuery: setLocalQuery,
    /** Debounced query value (used for filtering) */
    debouncedQuery,
    /** Filtered results */
    filteredItems,
    /** Whether search is active */
    isSearching: !!debouncedQuery.trim()
  };
}