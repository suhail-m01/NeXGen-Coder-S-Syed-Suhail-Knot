const globalLimits = globalThis as typeof globalThis & { __knotHackathonLimits?: Map<string, { count: number; resetAt: number }> };
const buckets = globalLimits.__knotHackathonLimits ?? new Map<string, { count: number; resetAt: number }>();
globalLimits.__knotHackathonLimits = buckets;

export function rateLimit(key: string, scope: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }
  const id = `${scope}:${key}`;
  const current = buckets.get(id);
  if (!current || current.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  const allowed = current.count <= limit;
  return { allowed, retryAfter: allowed ? 0 : Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}
