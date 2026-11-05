import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'Reminder job authentication is not configured.' }, { status: 503 });

  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: hotels, error } = await supabase.from('hotels')
    .select('id, name, owner_email, subscription_status, trial_ends_at');
  if (error) return NextResponse.json({ error: `Could not load hotels: ${error.message}` }, { status: 500 });

  const now = Date.now();
  const twoDays = 2 * 86400000;
  const reminders = (hotels ?? []).flatMap((hotel) => {
    const remaining = new Date(hotel.trial_ends_at).getTime() - now;
    const daysLeft = Math.ceil(remaining / 86400000);
    const expired = hotel.subscription_status !== 'active' && remaining <= 0;
    const expiring = hotel.subscription_status === 'trialing' && remaining > 0 && remaining <= twoDays;
    if (!expired && !expiring) return [];
    return [{
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      owner_email: hotel.owner_email,
      type: expired ? 'expired' : 'expiring_soon',
      days_left: expired ? 0 : daysLeft,
    }];
  });

  return NextResponse.json({
    processed: hotels?.length ?? 0,
    reminders_due: reminders.length,
    reminders,
    sent: false,
    message: 'Reminder payloads are prepared; email and WhatsApp delivery are not configured.',
    timestamp: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
