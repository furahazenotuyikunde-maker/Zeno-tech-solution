import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getDeviceAuthError, readJsonBody } from '@/lib/device-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  const deviceAuthError = getDeviceAuthError(request);
  if (!context && deviceAuthError) return deviceAuthError;
  if (context && context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can activate cards.' }, { status: 403 });
  }

  const body = await readJsonBody(request);
  const cardId = body?.card_id;
  const uidInput = body?.uid;
  if (typeof cardId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cardId) ||
      typeof uidInput !== 'string' || !/^[a-zA-Z0-9:-]{1,64}$/.test(uidInput.trim())) {
    return NextResponse.json({ error: 'A valid card_id and UID are required.' }, { status: 400 });
  }
  const uid = uidInput.trim().toUpperCase();
  const supabase = createSupabaseAdminClient();
  let cardQuery = supabase.from('cards')
    .select('id, hotel_id, guest_name, room_number, status, valid_until')
    .eq('id', cardId);
  if (context) cardQuery = cardQuery.eq('hotel_id', context.hotelId);
  const { data: card, error: cardError } = await cardQuery.maybeSingle();
  if (cardError) return NextResponse.json({ error: `Could not verify pending card: ${cardError.message}` }, { status: 500 });
  if (!card) return NextResponse.json({ error: 'Pending card not found.' }, { status: 404 });
  if (card.status !== 'pending') {
    if (card.status === 'active') {
      const { data: existingCard, error: existingError } = await supabase.from('cards')
        .select('uid').eq('id', card.id).eq('hotel_id', card.hotel_id).maybeSingle();
      if (existingError) return NextResponse.json({ error: `Could not verify active card: ${existingError.message}` }, { status: 500 });
      if (existingCard?.uid === uid) return NextResponse.json({ card: { ...card, uid }, replayed: true });
    }
    return NextResponse.json({ error: `Card cannot be activated from status ${card.status}.` }, { status: 409 });
  }
  if (card.valid_until && new Date(card.valid_until).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'This card’s check-out date has passed.' }, { status: 409 });
  }

  const { data, error } = await supabase.from('cards').update({
    uid,
    status: 'active',
    is_active: true,
  }).eq('id', card.id).eq('hotel_id', card.hotel_id).eq('status', 'pending').is('uid', null)
    .select('id, uid, guest_name, room_number, status, valid_from, valid_until').maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'This card UID is already assigned.' : `Could not activate card: ${error.message}` }, {
      status: error.code === '23505' ? 409 : 500,
    });
  }
  if (!data) return NextResponse.json({ error: 'Card was activated by another reader or is no longer pending.' }, { status: 409 });
  return NextResponse.json({ card: data });
}
