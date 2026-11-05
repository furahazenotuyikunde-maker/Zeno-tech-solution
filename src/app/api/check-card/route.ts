import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDeviceAuthError, readJsonBody } from '@/lib/device-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isOpenForCleaner(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now));
  return hour >= 8 && hour < 16;
}

async function writeAccessLog(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  event: {
    hotel_id: string;
    uid: string;
    reader_id: string;
    allowed: boolean;
    reason: string | null;
    room_number: string | null;
    guest_name: string | null;
  }
) {
  const { guest_name: guestName, ...logData } = event;
  const { data: log, error } = await supabase.from('access_logs').insert({
    ...logData,
    card_uid: event.uid,
    guest_name: null,
  }).select('id').single();
  if (error) throw new Error(`Could not record access attempt: ${error.message}`);
  if (guestName) {
    const { error: detailError } = await supabase.from('access_log_guest_details').insert({
      access_log_id: log.id,
      hotel_id: event.hotel_id,
      guest_name: guestName,
    });
    if (detailError) throw new Error(`Access was logged, but private guest details were not saved: ${detailError.message}`);
  }
}

export async function POST(request: NextRequest) {
  const authError = getDeviceAuthError(request);
  if (authError) return authError;

  const body = await readJsonBody(request);
  const hotelId = body?.hotel_id;
  const uidInput = body?.uid;
  const readerIdInput = body?.reader_id;
  if (typeof hotelId !== 'string' || typeof uidInput !== 'string' || typeof readerIdInput !== 'string' ||
      !hotelId.trim() || !uidInput.trim() || !readerIdInput.trim() ||
      uidInput.length > 256 || readerIdInput.length > 100) {
    return NextResponse.json({ error: 'hotel_id, uid, and reader_id are required.' }, { status: 400 });
  }
  const uid = uidInput.trim();
  const readerId = readerIdInput.trim();

  const supabase = createSupabaseAdminClient();
  const { data: reader, error: readerError } = await supabase.from('readers')
    .select('id').eq('hotel_id', hotelId).eq('reader_id', readerId).maybeSingle();
  if (readerError) {
    return NextResponse.json({ error: `Could not verify reader: ${readerError.message}` }, { status: 500 });
  }
  if (!reader) return NextResponse.json({ allowed: false, reason: 'READER_NOT_FOUND' }, { status: 404 });

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('subscription_status, trial_ends_at')
    .eq('id', hotelId)
    .maybeSingle();
  if (hotelError) {
    return NextResponse.json({ error: `Could not check hotel subscription: ${hotelError.message}` }, { status: 500 });
  }
  if (!hotel) {
    return NextResponse.json({ allowed: false, reason: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' }, { status: 404 });
  }

  const subscriptionActive = hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now());
  if (!subscriptionActive) {
    await writeAccessLog(supabase, {
      hotel_id: hotelId,
      uid,
      reader_id: readerId,
      allowed: false,
      reason: 'EXPIRED',
      room_number: null,
      guest_name: null,
    });
    return NextResponse.json({
      allowed: false,
      reason: 'EXPIRED',
      message: 'Pay $20 - 0790723406',
    }, { status: 200 });
  }

  const { data: masterCard, error: masterError } = await supabase
    .from('master_cards')
    .select('type')
    .eq('hotel_id', hotelId)
    .eq('uid', uid)
    .eq('is_active', true)
    .maybeSingle();
  if (masterError) {
    return NextResponse.json({ error: `Could not check master card: ${masterError.message}` }, { status: 500 });
  }

  if (masterCard && (masterCard.type === 'manager' || isOpenForCleaner())) {
    await writeAccessLog(supabase, {
      hotel_id: hotelId,
      uid,
      reader_id: readerId,
      allowed: true,
      reason: masterCard.type === 'cleaner' ? 'MASTER_CLEANER' : 'MASTER_MANAGER',
      room_number: '*',
      guest_name: masterCard.type === 'cleaner' ? 'Cleaner master card' : 'Manager master card',
    });
    return NextResponse.json({ allowed: true, room: '*', guest: `${masterCard.type} master card` });
  }

  if (masterCard?.type === 'cleaner') {
    await writeAccessLog(supabase, {
      hotel_id: hotelId,
      uid,
      reader_id: readerId,
      allowed: false,
      reason: 'OUTSIDE_CLEANER_HOURS',
      room_number: '*',
      guest_name: null,
    });
    return NextResponse.json({ allowed: false, reason: 'OUTSIDE_CLEANER_HOURS' });
  }

  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('room_number, guest_name, starts_at, expires_at, valid_from, valid_until')
    .eq('hotel_id', hotelId)
    .eq('uid', uid)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle();
  if (cardError) {
    return NextResponse.json({ error: `Could not check card: ${cardError.message}` }, { status: 500 });
  }

  let guestKey: { room_number: string; guest_name: string; expires_at: string } | null = null;
  if (!card) {
    const tokenHash = createHash('sha256').update(uid).digest('hex');
    const { data, error: guestKeyError } = await supabase.from('guest_keys')
      .select('room_number, guest_name, expires_at, cards!inner(is_active, status, starts_at, expires_at)')
      .eq('hotel_id', hotelId).eq('uid', tokenHash).eq('is_active', true)
      .eq('cards.is_active', true).eq('cards.status', 'active').gt('expires_at', new Date().toISOString())
      .lte('cards.starts_at', new Date().toISOString())
      .gt('cards.expires_at', new Date().toISOString()).maybeSingle();
    if (guestKeyError) return NextResponse.json({ error: `Could not check mobile key: ${guestKeyError.message}` }, { status: 500 });
    guestKey = data;
  }

  const cardValidFrom = card?.valid_from ?? card?.starts_at;
  const cardValidUntil = card?.valid_until ?? card?.expires_at;
  const isStarted = Boolean(card && new Date(cardValidFrom).getTime() <= Date.now());
  const isAllowed = Boolean(guestKey || (card && isStarted && (!cardValidUntil || new Date(cardValidUntil).getTime() > Date.now())));
  const reason = isAllowed ? null : card ? (isStarted ? 'EXPIRED_CARD' : 'NOT_YET_VALID') : 'UNKNOWN_CARD';
  const auditUid = guestKey ? createHash('sha256').update(uid).digest('hex') : uid;
  await writeAccessLog(supabase, {
    hotel_id: hotelId,
    uid: auditUid,
    reader_id: readerId,
    allowed: isAllowed,
    reason,
    room_number: guestKey?.room_number ?? card?.room_number ?? null,
    guest_name: isAllowed ? guestKey?.guest_name ?? card?.guest_name ?? null : null,
  });

  return NextResponse.json(isAllowed
    ? { allowed: true, room: guestKey?.room_number ?? card?.room_number, guest: guestKey?.guest_name ?? card?.guest_name }
    : { allowed: false, reason });
}

export async function GET(request: NextRequest) {
  const authError = getDeviceAuthError(request);
  if (authError) return authError;

  const hotelId = request.nextUrl.searchParams.get('hotel_id');
  if (!hotelId) return NextResponse.json({ error: 'hotel_id is required.' }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select('subscription_status, trial_ends_at')
    .eq('id', hotelId)
    .maybeSingle();
  if (hotelError) {
    return NextResponse.json({ error: `Could not check hotel subscription: ${hotelError.message}` }, { status: 500 });
  }
  if (!hotel) return NextResponse.json({ error: 'Hotel not found.' }, { status: 404 });

  const active = hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now());
  if (!active) {
    return NextResponse.json({ uids: [], master_cards: [], generated_at: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const [cards, masters] = await Promise.all([
    supabase.from('cards').select('uid').eq('hotel_id', hotelId).eq('is_active', true)
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('master_cards').select('uid, type').eq('hotel_id', hotelId).eq('is_active', true),
  ]);
  if (cards.error || masters.error) {
    return NextResponse.json({ error: `Could not load offline whitelist: ${cards.error?.message ?? masters.error?.message}` }, { status: 500 });
  }

  const masterCards = (masters.data ?? []).slice(0, 50);
  const physicalCards = (cards.data ?? []).slice(0, Math.max(0, 50 - masterCards.length));
  const uids = Array.from(new Set([...masterCards.map((card) => card.uid), ...physicalCards.map((card) => card.uid)]));
  return NextResponse.json({
    uids,
    master_cards: masterCards,
    generated_at: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
