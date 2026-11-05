import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/exchange-rate
 * Returns live USD → RWF rate from exchangerate-api.com
 * Cached for 1 hour by Next.js ISR
 */
export async function GET(_req: NextRequest) {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('upstream error');
    const data = await res.json();
    const rate: number = data?.rates?.RWF ?? 1400;
    return NextResponse.json({ rate, base: 'USD', target: 'RWF', source: 'exchangerate-api.com' });
  } catch {
    // Fallback static rate
    return NextResponse.json({ rate: 1400, base: 'USD', target: 'RWF', source: 'fallback' });
  }
}
