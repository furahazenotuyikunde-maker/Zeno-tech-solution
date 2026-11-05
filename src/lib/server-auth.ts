import { createSupabaseServerClient } from '@/lib/supabase-server';

export type HotelRole = 'manager' | 'receptionist' | 'electrician';

export interface UserContext {
  userId: string;
  email: string;
  hotelId: string;
  role: HotelRole;
}

function hotelRole(role: string): HotelRole | null {
  if (role === 'manager' || role === 'receptionist' || role === 'electrician') return role;
  return null;
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: membership, error } = await supabase
    .from('hotel_users')
    .select('hotel_id, role, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load hotel membership: ${error.message}`);
  if (!membership) return null;

  const role = hotelRole(membership.role);
  if (!role) return null;

  return {
    userId: user.id,
    email: membership.email || user.email || '',
    hotelId: membership.hotel_id,
    role,
  };
}

export async function getActiveHotel(hotelId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, subscription_status, trial_ends_at, plan, owner_email')
    .eq('id', hotelId)
    .maybeSingle();

  if (error) throw new Error(`Could not load hotel: ${error.message}`);
  return data;
}

export async function hasActiveSubscription(hotelId: string) {
  const hotel = await getActiveHotel(hotelId);
  if (!hotel) return false;
  return hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now());
}
