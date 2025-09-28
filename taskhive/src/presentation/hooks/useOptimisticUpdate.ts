import { useState, useCallback } from 'react';

interface OptimisticState<T> {
  data?: T;
  loading: boolean;
  error?: Error;
}

export function useOptimisticUpdate<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    getOptimisticData?: (variables: V, currentData?: T) => T;
  }
): {
  mutate: (variables: V) => Promise<void>;
  data?: T;
  loading: boolean;
  error?: Error;
} {
  const [state, setState] = useState<OptimisticState<T>>({
    loading: false,
  });

  const mutate = useCallback(async (variables: V): Promise<void> => {
    let rollbackData: T | undefined;

    try {
      // Apply optimistic update
      if (options?.getOptimisticData) {
        rollbackData = state.data;
        const optimisticData = options.getOptimisticData(variables, state.data);
        setState(prev => ({ ...prev, data: optimisticData, loading: true, error: undefined }));
      } else {
        setState(prev => ({ ...prev, loading: true, error: undefined }));
      }

      // Execute mutation
      const data = await mutationFn(variables);
      
      // Update with real data
      setState({ data, loading: false });
      options?.onSuccess?.(data, variables);
      
    } catch (error) {
      const err = error as Error;
      
      // Rollback optimistic update
      if (rollbackData !== undefined) {
        setState({ data: rollbackData, loading: false, error: err });
      } else {
        setState(prev => ({ ...prev, loading: false, error: err }));
      }
      
      options?.onError?.(err, variables);
    }
  }, [mutationFn, options, state.data]);

  return {
    ...state,
    mutate,
  };
}