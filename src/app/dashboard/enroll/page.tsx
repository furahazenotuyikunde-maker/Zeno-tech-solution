import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import EnrollClient from './EnrollClient';

export default async function EnrollPage() {
  const context = await getUserContext();
  if (!context) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;
  const supabase = await createSupabaseServerClient();
  const { data: rooms, error } = await supabase.from('rooms')
    .select('id, room_number').eq('hotel_id', context.hotelId).order('room_number');
  if (error) throw new Error(`Could not load hotel rooms: ${error.message}`);
  return <EnrollClient initialRooms={rooms ?? []} hotelId={context.hotelId} />;
}
