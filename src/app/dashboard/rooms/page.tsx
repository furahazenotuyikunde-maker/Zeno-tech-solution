import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getUserContext } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import RoomsClient from './RoomsClient';

export default async function RoomsPage() {
  const context = await getUserContext();
  if (!context) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;
  const supabase = await createSupabaseServerClient();
  const { data: hotel, error } = await supabase.from('hotels').select('subscription_status').eq('id', context.hotelId).single();
  if (error) throw new Error(`Could not load subscription: ${error.message}`);
  return <RoomsClient trialing={hotel.subscription_status === 'trialing'} />;
}
