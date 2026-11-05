import { NextRequest, NextResponse } from 'next/server';
import { getDeviceAuthError, readJsonBody } from '@/lib/device-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authError = getDeviceAuthError(request);
  if (authError) return authError;

  const body = await readJsonBody(request);
  const hotelId = body?.hotel_id;
  const readerId = body?.reader_id;
  const battery = body?.battery;
  const rssi = body?.rssi;
  if (typeof hotelId !== 'string' || typeof readerId !== 'string' ||
      typeof battery !== 'number' || !Number.isInteger(battery) || battery < 0 || battery > 100 ||
      typeof rssi !== 'number' || !Number.isInteger(rssi)) {
    return NextResponse.json({ error: 'hotel_id, reader_id, battery (0-100), and integer rssi are required.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: reader, error: readerError } = await supabase
    .from('readers')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('reader_id', readerId)
    .maybeSingle();
  if (readerError) {
    return NextResponse.json({ error: `Could not find reader: ${readerError.message}` }, { status: 500 });
  }
  if (!reader) return NextResponse.json({ error: 'Reader not registered.' }, { status: 404 });

  const pingedAt = new Date().toISOString();
  const { error } = await supabase.from('readers')
    .update({ battery, rssi, last_ping_at: pingedAt })
    .eq('id', reader.id)
    .eq('hotel_id', hotelId);
  if (error) return NextResponse.json({ error: `Could not save reader status: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, last_ping_at: pingedAt });
}
