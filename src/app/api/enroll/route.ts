import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/device-auth';
import { getKigaliDayBounds } from '@/lib/time';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can view guest check-ins.' }, { status: 403 });
  }
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }
  const supabase = await createSupabaseServerClient();
  const { start: todayStart, end: todayEnd } = getKigaliDayBounds();
  const { data, error } = await supabase.from('cards')
    .select('id, uid, room_number, guest_name, starts_at, expires_at, is_active')
    .eq('hotel_id', context.hotelId).gte('starts_at', todayStart.toISOString())
    .lt('starts_at', todayEnd.toISOString()).order('starts_at', { ascending: false });
  if (error) return NextResponse.json({ error: `Could not load check-ins: ${error.message}` }, { status: 500 });
  return NextResponse.json({ check_ins: data });
}

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'receptionist') {
    return NextResponse.json({ error: 'Only managers and receptionists can enroll guests.' }, { status: 403 });
  }
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const guestName = body?.guest_name;
  const roomNumber = body?.room_number;
  const uid = body?.uid;
  const checkIn = body?.check_in;
  const checkOut = body?.check_out;
  const requestId = body?.request_id;
  if ([guestName, roomNumber, uid, checkIn, checkOut].some((value) => typeof value !== 'string' || !value.trim())) {
    return NextResponse.json({ error: 'guest_name, room_number, uid, check_in, and check_out are required.' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn as string) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut as string) ||
      (checkOut as string) <= (checkIn as string)) {
    return NextResponse.json({ error: 'Check-out must be after check-in using YYYY-MM-DD dates.' }, { status: 400 });
  }
  if ((uid as string).length > 64 || (guestName as string).length > 160 || (roomNumber as string).length > 32) {
    return NextResponse.json({ error: 'One or more values exceed the allowed length.' }, { status: 400 });
  }
  if (requestId !== undefined && (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))) {
    return NextResponse.json({ error: 'request_id must be a UUID.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (typeof requestId === 'string') {
    const { data: previous, error: previousError } = await supabase.from('cards')
      .select('id, uid, room_number, guest_name, starts_at, expires_at')
      .eq('hotel_id', context.hotelId).eq('client_request_id', requestId).maybeSingle();
    if (previousError) return NextResponse.json({ error: `Could not verify enrollment request: ${previousError.message}` }, { status: 500 });
    if (previous) return NextResponse.json({ card: previous, replayed: true });
  }
  const { data: room, error: roomError } = await supabase.from('rooms')
    .select('id').eq('hotel_id', context.hotelId).eq('room_number', roomNumber).maybeSingle();
  if (roomError) return NextResponse.json({ error: `Could not verify room: ${roomError.message}` }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'Room not found for this hotel.' }, { status: 404 });

  const { data: existingCard, error: existingError } = await supabase.from('cards')
    .select('id').eq('hotel_id', context.hotelId).eq('room_number', roomNumber)
    .in('status', ['pending', 'active']).gt('valid_until', new Date().toISOString()).maybeSingle();
  if (existingError) return NextResponse.json({ error: `Could not check room occupancy: ${existingError.message}` }, { status: 500 });
  if (existingCard) return NextResponse.json({ error: 'This room already has an active guest card.' }, { status: 409 });

  const expiresAt = new Date(`${checkOut}T23:59:59+02:00`).toISOString();
  const startsAt = new Date(`${checkIn}T00:00:00+02:00`).toISOString();
  const { data, error } = await supabase.from('cards').insert({
    hotel_id: context.hotelId,
    uid: (uid as string).trim().toUpperCase(),
    room_number: (roomNumber as string).trim(),
    guest_name: (guestName as string).trim(),
    status: 'active',
    starts_at: startsAt,
    expires_at: expiresAt,
    valid_from: startsAt,
    valid_until: expiresAt,
    client_request_id: typeof requestId === 'string' ? requestId : null,
    is_active: true,
    created_by: context.userId,
  }).select('id, uid, room_number, guest_name, starts_at, expires_at').single();

  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.code === '23505' ? 'This card UID is already assigned.' : `Could not enroll guest: ${error.message}` }, { status });
  }
  return NextResponse.json({ card: data }, { status: 201 });
}
