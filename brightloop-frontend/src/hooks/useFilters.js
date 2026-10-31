import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from '../utils/helpers';

export function useFilters(defaultFilters = {}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const debouncedSearchRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current);
      }
    };
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchTerm('');
    setSortBy('');
    setSortOrder('asc');
  }, [defaultFilters]);

  const handleSort = useCallback(
    (field) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
    },
    [sortBy]
  );

  const handleSearch = useCallback((value, callback) => {
    setSearchTerm(value);
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }
    debouncedSearchRef.current = setTimeout(() => {
      if (callback) callback(value);
    }, 300);
  }, []);

  const getQueryParams = useCallback(() => {
    const params = { ...filters };
    if (searchTerm) params.search = searchTerm;
    if (sortBy) {
      params.ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
    }
    return params;
  }, [filters, searchTerm, sortBy, sortOrder]);

  return {
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    sortBy,
    sortOrder,
    updateFilter,
    resetFilters,
    handleSort,
    handleSearch,
    getQueryParams,
  };
}
