import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { readJsonBody } from '@/lib/device-auth';

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can check out guests.' }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (typeof body?.card_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.card_id)) {
    return NextResponse.json({ error: 'A valid card_id is required.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('cards').update({
    status: 'expired',
    is_active: false,
  }).eq('id', body.card_id).eq('hotel_id', context.hotelId).in('status', ['pending', 'active'])
    .select('id, room_number, status').maybeSingle();
  if (error) return NextResponse.json({ error: `Could not check out guest: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Active or pending card not found for this hotel.' }, { status: 404 });
  return NextResponse.json({ card: data });
}
