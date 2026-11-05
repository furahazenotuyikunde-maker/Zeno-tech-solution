import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/device-auth';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('master_cards')
    .select('id, uid, type, is_active, created_at').eq('hotel_id', context.hotelId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: `Could not load master cards: ${error.message}` }, { status: 500 });
  return NextResponse.json({ cards: data });
}

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const uid = body?.uid;
  const type = body?.type;
  if (typeof uid !== 'string' || !uid.trim() || (type !== 'manager' && type !== 'cleaner')) {
    return NextResponse.json({ error: 'A valid uid and type (manager or cleaner) are required.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('master_cards').insert({
    hotel_id: context.hotelId, uid: uid.trim().toUpperCase(), type, is_active: true,
  }).select('id, uid, type, is_active, created_at').single();
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'That UID is already assigned.' : `Could not create master card: ${error.message}` }, {
      status: error.code === '23505' ? 409 : 500,
    });
  }
  return NextResponse.json({ card: data }, { status: 201 });
}
