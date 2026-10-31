import { useState, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';
import { buildQueryParams } from '../utils/helpers';

export function useApiData(apiFunc, options = {}) {
  const { autoFetch = false, initialData = null, pageSize = DEFAULT_PAGE_SIZE } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  });

  const fetchData = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const cleanParams = buildQueryParams({
          page: pagination.page,
          page_size: pagination.pageSize,
          ...params,
        });
        const response = await apiFunc(cleanParams);
        const result = response.data;
        if (result.results !== undefined) {
          setData(result.results);
          setPagination((prev) => ({
            ...prev,
            total: result.count || 0,
            totalPages: Math.ceil((result.count || 0) / prev.pageSize),
          }));
        } else {
          setData(result);
        }
        return result;
      } catch (err) {
        const msg = err.response?.data?.detail || err.response?.data?.error || err.message || 'An error occurred';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, pagination.page, pagination.pageSize]
  );

  const setPage = useCallback((page) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((size) => {
    setPagination((prev) => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  const refresh = useCallback(
    (params) => fetchData(params),
    [fetchData]
  );

  return {
    data,
    setData,
    loading,
    error,
    pagination,
    setPage,
    setPageSize,
    fetchData,
    refresh,
  };
}
