import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, hasActiveSubscription } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { readJsonBody } from '@/lib/device-auth';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('hotel_users')
    .select('id, email, role, created_at').eq('hotel_id', context.hotelId).order('created_at');
  if (error) return NextResponse.json({ error: `Could not load hotel users: ${error.message}` }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(request: NextRequest) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Sign in with an assigned hotel account.' }, { status: 401 });
  if (context.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  if (!(await hasActiveSubscription(context.hotelId))) {
    return NextResponse.json({ error: 'Hotel subscription expired.' }, { status: 402 });
  }

  const body = await readJsonBody(request);
  const email = body?.email;
  const role = body?.role;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (role !== 'receptionist' && role !== 'electrician')) {
    return NextResponse.json({ error: 'A valid email and role (receptionist or electrician) are required.' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase());
  if (inviteError) return NextResponse.json({ error: `Could not invite user: ${inviteError.message}` }, { status: 400 });
  if (!invited.user) return NextResponse.json({ error: 'Invitation did not create an auth user.' }, { status: 500 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('hotel_users').insert({
    hotel_id: context.hotelId,
    auth_user_id: invited.user.id,
    email: email.trim().toLowerCase(),
    role,
  }).select('id, email, role, created_at').single();
  if (error) return NextResponse.json({ error: `Invitation sent but hotel membership could not be saved: ${error.message}` }, { status: 500 });
  return NextResponse.json({ user: data }, { status: 201 });
}
