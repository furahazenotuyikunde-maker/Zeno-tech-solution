import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import HardwareClient from './HardwareClient';

export default async function HardwarePage() {
  const context = await getUserContext();
  if (!context) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;
  if (context.role !== 'manager' && context.role !== 'electrician') return <DashboardLayout><p className="text-rose-300">Hardware access required.</p></DashboardLayout>;
  const supabase = await createSupabaseServerClient();
  const { data: readers, error } = await supabase.from('readers')
    .select('id, reader_id, room_number, last_ping_at, battery, rssi')
    .eq('hotel_id', context.hotelId).order('reader_id');
  if (error) throw new Error(`Could not load readers: ${error.message}`);
  return <HardwareClient initialReaders={readers ?? []} canManage={context.role === 'manager'} />;
}
