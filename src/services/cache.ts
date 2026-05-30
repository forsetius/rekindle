export interface CacheEntry<T> {
  data?: T;
  lastSuccessAt?: Date;
  lastError?: string;
  inFlight?: Promise<T>;
}

export function createCacheEntry<T>(): CacheEntry<T> {
  return {};
}

export async function refreshCache<T>(
  cache: CacheEntry<T>,
  fetcher: () => Promise<T>,
  now: () => Date = () => new Date()
): Promise<T> {
  if (cache.inFlight !== undefined) {
    return cache.inFlight;
  }

  const inFlight = fetcher()
    .then((data) => {
      cache.data = data;
      cache.lastSuccessAt = now();
      delete cache.lastError;
      return data;
    })
    .catch((error: unknown) => {
      cache.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    })
    .finally(() => {
      delete cache.inFlight;
    });

  cache.inFlight = inFlight;
  return inFlight;
}
