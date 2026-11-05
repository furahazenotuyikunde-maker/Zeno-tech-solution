import { NextRequest, NextResponse } from 'next/server';
import { getDeviceAuthError, readJsonBody } from '@/lib/device-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authError = getDeviceAuthError(request);
  if (authError) return authError;

  const hotelId = request.nextUrl.searchParams.get('hotel_id');
  const readerId = request.nextUrl.searchParams.get('reader_id');
  if (!hotelId || !readerId) return NextResponse.json({ error: 'hotel_id and reader_id are required.' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: reader, error: readerError } = await supabase.from('readers')
    .select('id').eq('hotel_id', hotelId).eq('reader_id', readerId).maybeSingle();
  if (readerError) return NextResponse.json({ error: `Could not verify reader: ${readerError.message}` }, { status: 500 });
  if (!reader) return NextResponse.json({ error: 'Reader not registered.' }, { status: 404 });
  const { data: hotel, error: hotelError } = await supabase.from('hotels')
    .select('subscription_status, trial_ends_at').eq('id', hotelId).maybeSingle();
  if (hotelError) return NextResponse.json({ error: `Could not check subscription: ${hotelError.message}` }, { status: 500 });
  if (!hotel) return NextResponse.json({ error: 'Hotel not found.' }, { status: 404 });
  const subscriptionActive = hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now());
  if (!subscriptionActive) {
    return NextResponse.json({ commands: [], error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const { data: commands, error } = await supabase.from('hardware_commands')
    .select('id, command, encrypted_payload, created_at')
    .eq('hotel_id', hotelId).eq('reader_id', readerId).eq('status', 'pending')
    .order('created_at', { ascending: true }).limit(10);
  if (error) return NextResponse.json({ error: `Could not load commands: ${error.message}` }, { status: 500 });
  if (commands?.length) {
    const { error: updateError } = await supabase.from('hardware_commands')
      .update({ status: 'delivered' }).in('id', commands.map((command) => command.id));
    if (updateError) return NextResponse.json({ error: `Commands loaded but could not mark them delivered: ${updateError.message}` }, { status: 500 });
  }
  return NextResponse.json({ commands: commands ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const authError = getDeviceAuthError(request);
  if (authError) return authError;
  const body = await readJsonBody(request);
  const hotelId = body?.hotel_id;
  const readerId = body?.reader_id;
  const commandId = body?.command_id;
  const status = body?.status;
  if (typeof hotelId !== 'string' || typeof readerId !== 'string' || typeof commandId !== 'string' ||
      (status !== 'completed' && status !== 'failed')) {
    return NextResponse.json({ error: 'hotel_id, reader_id, command_id, and status (completed or failed) are required.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('hardware_commands')
    .update({ status })
    .eq('id', commandId).eq('hotel_id', hotelId).eq('reader_id', readerId).eq('status', 'delivered')
    .select('id').maybeSingle();
  if (error) return NextResponse.json({ error: `Could not acknowledge command: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Pending command not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
