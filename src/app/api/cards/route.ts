import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { readJsonBody } from '@/lib/device-auth';

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateBounds(checkIn: string, checkOut: string) {
  return {
    validFrom: new Date(`${checkIn}T00:00:00+02:00`).toISOString(),
    validUntil: new Date(`${checkOut}T23:59:59+02:00`).toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  if (context.role === 'electrician') {
    const [blockedCards, cloneLogs] = await Promise.all([
      supabase.from('cards').select('id, uid, room_number, status, created_at')
        .eq('hotel_id', context.hotelId).eq('status', 'blocked').order('created_at', { ascending: false }),
      supabase.from('access_logs').select('id, uid, room_number, reader_id, reason, created_at')
        .eq('hotel_id', context.hotelId).eq('allowed', false).ilike('reason', '%clone%')
        .order('created_at', { ascending: false }),
    ]);
    const queryError = blockedCards.error ?? cloneLogs.error;
    if (queryError) return NextResponse.json({ error: `Could not load card alerts: ${queryError.message}` }, { status: 500 });
    return NextResponse.json({
      cards: [],
      alerts: [
        ...(blockedCards.data ?? []).map((card) => ({ ...card, alert_type: 'blocked_card' })),
        ...(cloneLogs.data ?? []).map((log) => ({ ...log, status: 'blocked', alert_type: 'cloned_card' })),
      ],
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Card access required.' }, { status: 403 });
  }
  let query = supabase.from('cards')
    .select('id, uid, guest_name, phone, passport_number, room_number, status, valid_from, valid_until, created_at')
    .eq('hotel_id', context.hotelId).order('created_at', { ascending: false });
  const cardId = request.nextUrl.searchParams.get('card_id');
  if (cardId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cardId)) {
      return NextResponse.json({ error: 'Invalid card_id.' }, { status: 400 });
    }
    query = query.eq('id', cardId);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: `Could not load cards: ${error.message}` }, { status: 500 });
  return NextResponse.json({ cards: data ?? [], alerts: [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can create cards.' }, { status: 403 });
  }
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const guestName = body?.guest_name;
  const phone = body?.phone;
  const passportNumber = body?.passport_number;
  const roomNumber = body?.room_number;
  const checkIn = body?.check_in;
  const checkOut = body?.check_out;
  if (typeof guestName !== 'string' || !guestName.trim() || guestName.length > 160 ||
      typeof phone !== 'string' || !phone.trim() || phone.length > 40 ||
      typeof passportNumber !== 'string' || !passportNumber.trim() || passportNumber.length > 80 ||
      typeof roomNumber !== 'string' || !roomNumber.trim() || roomNumber.length > 32 ||
      !isDateOnly(checkIn) || !isDateOnly(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: 'Guest name, phone, passport number, room, and valid check-in/check-out dates are required.' }, { status: 400 });
  }

  const { validFrom, validUntil } = dateBounds(checkIn, checkOut);
  if (validUntil <= validFrom) {
    return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase.from('rooms')
    .select('id').eq('hotel_id', context.hotelId).eq('room_number', roomNumber.trim()).maybeSingle();
  if (roomError) return NextResponse.json({ error: `Could not verify room: ${roomError.message}` }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'Room not found for this hotel.' }, { status: 404 });

  const { data: occupiedCard, error: occupiedError } = await supabase.from('cards')
    .select('id').eq('hotel_id', context.hotelId).eq('room_number', roomNumber.trim())
    .in('status', ['pending', 'active']).gt('valid_until', new Date().toISOString()).maybeSingle();
  if (occupiedError) return NextResponse.json({ error: `Could not check room occupancy: ${occupiedError.message}` }, { status: 500 });
  if (occupiedCard) return NextResponse.json({ error: 'This room already has a pending or active guest card.' }, { status: 409 });

  const { data, error } = await supabase.from('cards').insert({
    hotel_id: context.hotelId,
    uid: null,
    guest_name: guestName.trim(),
    phone: phone.trim(),
    passport_number: passportNumber.trim(),
    room_number: roomNumber.trim(),
    status: 'pending',
    valid_from: validFrom,
    valid_until: validUntil,
    starts_at: validFrom,
    expires_at: validUntil,
    is_active: false,
    created_by: context.userId,
  }).select('id, uid, guest_name, phone, passport_number, room_number, status, valid_from, valid_until, created_at').single();
  if (error) return NextResponse.json({ error: `Could not create pending card: ${error.message}` }, { status: 500 });
  return NextResponse.json({ card: data }, { status: 201 });
}
