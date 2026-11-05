'use client';

/**
 * ZENO TECH SOLUTION - Subscription Enforcement Library
 * Central helper used by middleware, API routes, and UI components.
 * Owner: tuyikundefzeno@gmail.com | +250 790 723 406
 */

export type SubscriptionState = 'active' | 'trialing' | 'expired';

export interface SubscriptionInfo {
  status: SubscriptionState;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  isExpired: boolean;
  isTrialing: boolean;
  isActive: boolean;
  /** true when <= 3 days left on trial */
  isWarning: boolean;
  /** true when <= 1 day left on trial */
  isCritical: boolean;
  trialEndsAt: Date | null;
  expiredSinceDays: number;
}

/**
 * Compute subscription state from raw hotel fields.
 * Works in both browser and Node / Edge runtime.
 */
export function computeSubscriptionInfo(
  subscriptionStatus: string,
  trialEndsAtStr: string | null | undefined
): SubscriptionInfo {
  const now = Date.now();
  const trialEndsAt = trialEndsAtStr ? new Date(trialEndsAtStr) : null;
  const trialMs = trialEndsAt ? trialEndsAt.getTime() - now : -1;

  const isActive = subscriptionStatus === 'active';
  const isTrialing =
    subscriptionStatus === 'trialing' && trialMs > 0;
  const isExpired =
    !isActive &&
    (subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'past_due' ||
      (subscriptionStatus === 'trialing' && trialMs <= 0));

  const daysLeft = Math.max(0, Math.floor(trialMs / 86_400_000));
  const hoursLeft = Math.max(0, Math.floor((trialMs % 86_400_000) / 3_600_000));
  const minutesLeft = Math.max(0, Math.floor((trialMs % 3_600_000) / 60_000));

  const expiredSinceDays =
    isExpired && trialEndsAt
      ? Math.floor((now - trialEndsAt.getTime()) / 86_400_000)
      : 0;

  const status: SubscriptionState = isActive
    ? 'active'
    : isTrialing
    ? 'trialing'
    : 'expired';

  return {
    status,
    daysLeft,
    hoursLeft,
    minutesLeft,
    isExpired,
    isTrialing,
    isActive,
    isWarning: isTrialing && daysLeft <= 3,
    isCritical: isTrialing && daysLeft <= 1,
    trialEndsAt,
    expiredSinceDays,
  };
}

/** Exchange-rate cache so we don't hammer the API */
let _rwfRateCache: { rate: number; fetchedAt: number } | null = null;
const RATE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch live USD → RWF exchange rate from exchangerate-api.com.
 * Falls back to a conservative static rate (1400) if the network fails.
 */
export async function fetchUsdToRwf(): Promise<number> {
  if (_rwfRateCache && Date.now() - _rwfRateCache.fetchedAt < RATE_TTL_MS) {
    return _rwfRateCache.rate;
  }
  try {
    // Free tier — no API key required for basic pairs
    const res = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
      { next: { revalidate: 3600 } } // Next.js cache
    );
    if (!res.ok) throw new Error('bad response');
    const json = await res.json();
    const rate: number = json?.rates?.RWF ?? 1400;
    _rwfRateCache = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return 1400; // fallback
  }
}

/** Format dollar amount as RWF string, e.g. "28,000 RWF" */
export function usdToRwfFormatted(usd: number, rate: number): string {
  const rwf = Math.round(usd * rate);
  return `${rwf.toLocaleString()} RWF`;
}
