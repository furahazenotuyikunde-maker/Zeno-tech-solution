import { NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: logs, error } = await supabase.from('access_logs')
    .select('id, uid, reader_id, room_number, allowed, reason, created_at')
    .eq('hotel_id', context.hotelId).order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: `Could not load access logs: ${error.message}` }, { status: 500 });

  const records = logs ?? [];
  if (context.role === 'electrician' || records.length === 0) {
    return NextResponse.json({ logs: records, role: context.role }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const { data: guestDetails, error: detailError } = await supabase.from('access_log_guest_details')
    .select('access_log_id, guest_name')
    .eq('hotel_id', context.hotelId)
    .in('access_log_id', records.map((log) => log.id));
  if (detailError) return NextResponse.json({ error: `Could not load private log details: ${detailError.message}` }, { status: 500 });

  const guestNameByLog = new Map((guestDetails ?? []).map((detail) => [detail.access_log_id, detail.guest_name]));
  return NextResponse.json({
    logs: records.map((log) => ({ ...log, guest_name: guestNameByLog.get(log.id) ?? null })),
    role: context.role,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
