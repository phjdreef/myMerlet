import { useState, useCallback } from "react";

export interface UseAsyncOperationResult<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  setError: (error: string | null) => void;
}

/**
 * Custom hook for managing async operations with loading and error states
 *
 * @example
 * const { loading, error, execute } = useAsyncOperation();
 *
 * const loadData = () => execute(async () => {
 *   const result = await window.api.getData();
 *   if (!result.success) throw new Error(result.error);
 *   return result.data;
 * });
 */
export function useAsyncOperation<T = unknown>(): UseAsyncOperationResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { loading, error, data, execute, reset, setError };
}
