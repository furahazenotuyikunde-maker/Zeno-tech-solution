import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/device-auth';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('rooms')
    .select('id, room_number').eq('hotel_id', context.hotelId).order('room_number');
  if (error) return NextResponse.json({ error: `Could not load rooms: ${error.message}` }, { status: 500 });
  return NextResponse.json({ rooms: data });
}

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const roomNumber = body?.room_number;
  if (typeof roomNumber !== 'string' || !roomNumber.trim() || roomNumber.length > 32) {
    return NextResponse.json({ error: 'A valid room_number is required.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: hotel, error: hotelError } = await supabase.from('hotels')
    .select('subscription_status, max_rooms').eq('id', context.hotelId).single();
  if (hotelError) return NextResponse.json({ error: `Could not load hotel plan: ${hotelError.message}` }, { status: 500 });

  const { count, error: countError } = await supabase.from('rooms')
    .select('id', { count: 'exact', head: true }).eq('hotel_id', context.hotelId);
  if (countError) return NextResponse.json({ error: `Could not count rooms: ${countError.message}` }, { status: 500 });
  const maximum = hotel.subscription_status === 'trialing' ? 2 : hotel.max_rooms;
  if ((count ?? 0) >= maximum) {
    return NextResponse.json({ error: `Room limit reached (${maximum}). Upgrade your subscription to add rooms.` }, { status: 409 });
  }

  const { data, error } = await supabase.from('rooms').insert({
    hotel_id: context.hotelId,
    room_number: roomNumber.trim(),
  }).select('id, room_number').single();
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'That room already exists.' : `Could not add room: ${error.message}` }, {
      status: error.code === '23505' ? 409 : 500,
    });
  }
  return NextResponse.json({ room: data }, { status: 201 });
}
