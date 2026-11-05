import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/device-auth';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager' && context.role !== 'electrician') {
    return NextResponse.json({ error: 'Hardware access required.' }, { status: 403 });
  }
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('readers')
    .select('id, reader_id, room_number, last_ping_at, battery, rssi')
    .eq('hotel_id', context.hotelId).order('reader_id');
  if (error) return NextResponse.json({ error: `Could not load readers: ${error.message}` }, { status: 500 });
  return NextResponse.json({ readers: data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const readerId = body?.reader_id;
  const roomNumber = body?.room_number;
  if (typeof readerId !== 'string' || typeof roomNumber !== 'string' ||
      !readerId.trim() || !roomNumber.trim() || readerId.length > 100 || roomNumber.length > 32) {
    return NextResponse.json({ error: 'reader_id and room_number are required.' }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: room, error: roomError } = await supabase.from('rooms')
    .select('id').eq('hotel_id', context.hotelId).eq('room_number', roomNumber.trim()).maybeSingle();
  if (roomError) return NextResponse.json({ error: `Could not verify room: ${roomError.message}` }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });

  const { data, error } = await supabase.from('readers').insert({
    hotel_id: context.hotelId,
    reader_id: readerId.trim(),
    room_number: roomNumber.trim(),
  }).select('id, reader_id, room_number, last_ping_at, battery, rssi').single();
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'That reader ID is already registered.' : `Could not register reader: ${error.message}` }, {
      status: error.code === '23505' ? 409 : 500,
    });
  }
  return NextResponse.json({ reader: data }, { status: 201 });
}
