import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
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
  const command = body?.command;
  if (typeof readerId !== 'string' || (command !== 'remote_open_test' && command !== 'reboot')) {
    return NextResponse.json({ error: 'reader_id and a supported command are required.' }, { status: 400 });
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
    command,
    encrypted_payload: null,
  }).select('id, status').single();
  if (error) return NextResponse.json({ error: `Could not queue hardware command: ${error.message}` }, { status: 500 });
  return NextResponse.json({ command: data }, { status: 202 });
}
