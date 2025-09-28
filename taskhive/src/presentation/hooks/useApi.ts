import { useState, useEffect } from 'react';

export interface ApiState<T> {
  data?: T;
  loading: boolean;
  error?: Error;
}

interface RequestTracker {
  promise: Promise<any>;
  timestamp: number;
}

export class RequestDeduplicator {
  private static pendingRequests = new Map<string, RequestTracker>();
  
  static async execute<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.pendingRequests.get(key);
    
    // If request exists and is less than 5 seconds old, reuse it
    if (existing && (now - existing.timestamp) < 5000) {
      return existing.promise as Promise<T>;
    }
    
    // Create new request
    const promise = fetcher();
    this.pendingRequests.set(key, {
      promise,
      timestamp: now,
    });
    
    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after request completes
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, 5000);
    }
  }
}

export function useApi<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean;
    dependencies?: any[];
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
): ApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<ApiState<T>>({
    loading: options?.enabled !== false,
  });

  const executeQuery = async (): Promise<void> => {
    if (options?.enabled === false) return;

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const data = await RequestDeduplicator.execute(key, fetcher);
      setState({ data, loading: false });
      options?.onSuccess?.(data);
    } catch (error) {
      const err = error as Error;
      setState({ loading: false, error: err });
      options?.onError?.(err);
    }
  };

  useEffect(() => {
    executeQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...(options?.dependencies || [])]);

  return {
    ...state,
    refetch: executeQuery,
  };
}

export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    onSettled?: (data: T | undefined, error: Error | undefined, variables: V) => void;
  }
): {
  mutate: (variables: V) => Promise<void>;
  data?: T;
  loading: boolean;
  error?: Error;
} {
  const [state, setState] = useState<ApiState<T>>({
    loading: false,
  });

  const mutate = async (variables: V): Promise<void> => {
    setState({ loading: true, error: undefined, data: undefined });

    try {
      const data = await mutationFn(variables);
      setState({ data, loading: false });
      options?.onSuccess?.(data, variables);
      options?.onSettled?.(data, undefined, variables);
    } catch (error) {
      const err = error as Error;
      setState({ loading: false, error: err });
      options?.onError?.(err, variables);
      options?.onSettled?.(undefined, err, variables);
    }
  };

  return {
    ...state,
    mutate,
  };
}