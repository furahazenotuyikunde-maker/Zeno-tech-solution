import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-auth';
import { getActiveHotel } from '@/lib/server-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Hotel not found.' }, { status: 401 });
  const hotel = await getActiveHotel(context.hotelId);
  if (!hotel) return NextResponse.json({ error: 'Hotel not found.' }, { status: 404 });
  return NextResponse.json({
    role: context.role,
    hotel: { id: hotel.id, name: hotel.name },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: 'Hotel not found.' }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: authUser, error: getUserError } = await admin.auth.admin.getUserById(context.userId);
  if (getUserError) return NextResponse.json({ error: `Could not update session role: ${getUserError.message}` }, { status: 500 });
  const { error } = await admin.auth.admin.updateUserById(context.userId, {
    app_metadata: {
      ...authUser.user.app_metadata,
      hotel_id: context.hotelId,
      role: context.role,
    },
  });
  if (error) return NextResponse.json({ error: `Could not update session role: ${error.message}` }, { status: 500 });
  return NextResponse.json({ role: context.role, hotel_id: context.hotelId });
}
