import { NextRequest, NextResponse } from 'next/server';
import { getDeviceAuthError } from '@/lib/device-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authError = getDeviceAuthError(request);
  if (authError) return authError;
  const hotelId = request.nextUrl.searchParams.get('hotel_id');
  const readerId = request.nextUrl.searchParams.get('esp32_id');
  if (!hotelId || !readerId) return NextResponse.json({ error: 'hotel_id and esp32_id are required.' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: reader, error: readerError } = await supabase.from('readers')
    .select('id').eq('hotel_id', hotelId).eq('reader_id', readerId).maybeSingle();
  if (readerError) return NextResponse.json({ error: `Could not verify reader: ${readerError.message}` }, { status: 500 });
  if (!reader) return NextResponse.json({ error: 'Reader not registered.', allowed: false }, { status: 404 });

  const { data: hotel, error } = await supabase.from('hotels')
    .select('subscription_status, trial_ends_at').eq('id', hotelId).maybeSingle();
  if (error) return NextResponse.json({ error: `Could not check subscription: ${error.message}` }, { status: 500 });
  if (!hotel) return NextResponse.json({ error: 'Hotel not found.', allowed: false }, { status: 404 });

  const allowed = hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now());
  return NextResponse.json({
    allowed,
    expired: !allowed,
    hotel_id: hotelId,
    reader_id: readerId,
    subscription_status: hotel.subscription_status,
    trial_ends_at: hotel.trial_ends_at,
    contact: '0790723406',
    email: 'tuyikundefzeno@gmail.com',
  }, { status: allowed ? 200 : 402, headers: { 'Cache-Control': 'no-store' } });
}
