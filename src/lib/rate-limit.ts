// Simple in-memory rate limiter for serverless
// Resets when the function cold-starts, which is acceptable for basic protection
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  // Clean expired entries periodically
  if (attempts.size > 1000) {
    for (const [k, v] of attempts) {
      if (v.resetAt < now) attempts.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count, resetIn: entry.resetAt - now };
}

export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}
