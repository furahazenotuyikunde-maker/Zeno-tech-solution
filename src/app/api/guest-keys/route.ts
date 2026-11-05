import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can issue guest keys.' }, { status: 403 });
  }
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  let body: { card_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (typeof body.card_id !== 'string' || !body.card_id) {
    return NextResponse.json({ error: 'card_id is required.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: card, error: cardError } = await supabase.from('cards')
    .select('room_number, guest_name, starts_at, expires_at, is_active')
    .eq('hotel_id', context.hotelId).eq('id', body.card_id).maybeSingle();
  if (cardError) return NextResponse.json({ error: `Could not load guest card: ${cardError.message}` }, { status: 500 });
  if (!card || !card.is_active || new Date(card.starts_at).getTime() > Date.now() ||
      !card.expires_at || new Date(card.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Only active guest cards can receive mobile keys.' }, { status: 409 });
  }

  const token = randomBytes(32).toString('base64url');
  const hashedToken = createHash('sha256').update(token).digest('hex');
  const url = new URL(`/guest/${token}`, request.nextUrl.origin).toString();
  const qrDataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
  const { error } = await supabase.from('guest_keys').insert({
    hotel_id: context.hotelId,
    card_id: body.card_id,
    uid: hashedToken,
    room_number: card.room_number,
    guest_name: card.guest_name,
    is_active: true,
    expires_at: card.expires_at,
  });
  if (error) return NextResponse.json({ error: `Could not issue mobile key: ${error.message}` }, { status: 500 });

  return NextResponse.json({ url, qr_data_url: qrDataUrl, expires_at: card.expires_at }, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' },
  });
}
