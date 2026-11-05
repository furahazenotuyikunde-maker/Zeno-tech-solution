import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { encryptHardwarePayload } from '@/lib/hardware-commands';
import { readJsonBody } from '@/lib/device-auth';

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'electrician') {
    return NextResponse.json({ error: 'Hardware access required.' }, { status: 403 });
  }
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const readerId = body?.reader_id;
  const ssid = body?.ssid;
  const password = body?.password;
  if (typeof readerId !== 'string' || typeof ssid !== 'string' || typeof password !== 'string' ||
      !readerId.trim() || !ssid.trim() || !password || ssid.length > 32 || password.length > 128) {
    return NextResponse.json({ error: 'reader_id, SSID (up to 32 chars), and password (up to 128 chars) are required.' }, { status: 400 });
  }

  let encryptedPayload: ReturnType<typeof encryptHardwarePayload>;
  try {
    encryptedPayload = encryptHardwarePayload({ ssid: ssid.trim(), password });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not encrypt Wi-Fi credentials.' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: reader, error: readerError } = await supabase.from('readers')
    .select('id').eq('hotel_id', context.hotelId).eq('reader_id', readerId).maybeSingle();
  if (readerError) return NextResponse.json({ error: `Could not verify reader: ${readerError.message}` }, { status: 500 });
  if (!reader) return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('hardware_commands').insert({
    hotel_id: context.hotelId,
    reader_id: readerId,
    command: 'update_wifi',
    encrypted_payload: encryptedPayload,
  }).select('id, status').single();
  if (error) return NextResponse.json({ error: `Could not queue Wi-Fi update: ${error.message}` }, { status: 500 });
  return NextResponse.json({ command: data, message: 'Encrypted Wi-Fi update queued for the reader.' }, { status: 202 });
}
