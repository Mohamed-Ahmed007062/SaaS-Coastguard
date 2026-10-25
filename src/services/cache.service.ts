interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private static store = new Map<string, CacheEntry<any>>();
  private static hits = 0;
  private static misses = 0;

  /**
   * Store a value with a specific TTL in milliseconds (default: 60,000ms = 60s)
   */
  public static set<T>(key: string, value: T, ttlMs = 60_000): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a value. Returns null if expired or not found.
   */
  public static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Delete a specific cache key
   */
  public static del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or substring
   */
  public static invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache performance metrics
   */
  public static getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    const hitRate = total === 0 ? 0 : Math.round((this.hits / total) * 100);
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.store.size,
    };
  }

  /**
   * Clear all cache entries
   */
  public static clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
