import { ICacheService } from './InMemoryCache';

export interface QueryClientOptions {
  defaultTtl?: number;
  retryCount?: number;
  retryDelay?: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class QueryClient {
  private cache: ICacheService;
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private options: QueryClientOptions;

  constructor(cache: ICacheService, options: QueryClientOptions = {}) {
    this.cache = cache;
    this.options = {
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      retryCount: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  async query<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; skipCache?: boolean }
  ): Promise<T> {
    const cacheKey = `query:${key}`;
    const ttl = options?.ttl || this.options.defaultTtl!;

    // Check cache first (unless skipCache is true)
    if (!options?.skipCache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!.promise;
    }

    // Create new request
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pendingRequests.set(cacheKey, {
      promise,
      resolve: resolve!,
      reject: reject!,
    });

    try {
      const data = await this.executeWithRetry(fetcher);
      
      // Cache the result
      await this.cache.set(cacheKey, data, ttl);
      
      // Resolve pending request
      resolve!(data);
      
      return data;
    } catch (error) {
      reject!(error as Error);
      throw error;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeWithRetry<T>(
    fetcher: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fetcher();
    } catch (error) {
      if (attempt < this.options.retryCount!) {
        await this.delay(this.options.retryDelay! * attempt);
        return this.executeWithRetry(fetcher, attempt + 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async invalidate(key: string): Promise<void> {
    const cacheKey = `query:${key}`;
    await this.cache.delete(cacheKey);
  }

  async invalidatePattern(_pattern: string): Promise<void> {
    // This would require a more sophisticated cache implementation
    // For now, we'll just clear all cache
    await this.cache.clear();
  }

  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    // Prefetch data in the background
    try {
      await this.query(key, fetcher, { ttl, skipCache: true });
    } catch (error) {
      // Prefetch errors are non-critical
      console.warn(`Prefetch failed for key: ${key}`, error);
    }
  }

  // Optimistic update: update cache immediately, then execute mutation
  async mutate<T, R>(
    key: string,
    mutationFn: () => Promise<R>,
    optimisticData?: T
  ): Promise<R> {
    const cacheKey = `query:${key}`;
    let previousData: T | null = null;

    try {
      // Store previous data for rollback
      if (optimisticData) {
        previousData = await this.cache.get<T>(cacheKey);
        await this.cache.set(cacheKey, optimisticData);
      }

      // Execute mutation
      const result = await mutationFn();

      // Invalidate cache to trigger refetch
      await this.invalidate(key);

      return result;
    } catch (error) {
      // Rollback optimistic update on error
      if (optimisticData && previousData !== null) {
        await this.cache.set(cacheKey, previousData);
      }
      throw error;
    }
  }
}