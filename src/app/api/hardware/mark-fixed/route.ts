import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { readJsonBody } from '@/lib/device-auth';

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'electrician') {
    return NextResponse.json({ error: 'Hardware access required.' }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (typeof body?.reader_id !== 'string' || !body.reader_id.trim() || body.reader_id.length > 100) {
    return NextResponse.json({ error: 'A valid reader_id is required.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('readers')
    .update({ maintenance_status: 'fixed' })
    .eq('hotel_id', context.hotelId)
    .eq('reader_id', body.reader_id.trim())
    .select('id, reader_id, maintenance_status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: `Could not mark reader fixed: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Reader not found for this hotel.' }, { status: 404 });
  return NextResponse.json({ reader: data });
}
