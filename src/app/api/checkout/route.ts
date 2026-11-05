import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { readJsonBody } from '@/lib/device-auth';

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can revoke guest cards.' }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (typeof body?.uid !== 'string' || !body.uid.trim() ||
      (body.reason !== 'CHECKOUT' && body.reason !== 'LOST_CARD')) {
    return NextResponse.json({ error: 'uid and reason (CHECKOUT or LOST_CARD) are required.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('cards')
    .update({ is_active: false, status: 'expired' })
    .eq('hotel_id', context.hotelId)
    .eq('uid', body.uid.trim().toUpperCase())
    .eq('is_active', true)
    .select('id, uid')
    .maybeSingle();
  if (error) return NextResponse.json({ error: `Could not revoke card: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Active card not found.' }, { status: 404 });

  const { error: keyError } = await supabase.from('guest_keys')
    .update({ is_active: false }).eq('hotel_id', context.hotelId).eq('card_id', data.id);
  const { error: logError } = await supabase.from('access_logs').insert({
    hotel_id: context.hotelId,
    uid: data.uid,
    card_uid: data.uid,
    room_number: null,
    allowed: false,
    reason: body.reason,
    guest_name: null,
  });
  return NextResponse.json({
    ok: true,
    card: data,
    ...((logError || keyError) ? { warning: `Card revoked, but follow-up failed: ${[keyError?.message, logError?.message].filter(Boolean).join('; ')}` } : {}),
  });
}
