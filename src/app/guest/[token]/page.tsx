import { createHash } from 'node:crypto';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function GuestKeyPage({ params }: { params: { token: string } }) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(params.token)) notFound();

  const hash = createHash('sha256').update(params.token).digest('hex');
  const supabase = createSupabaseAdminClient();
  const { data: guestKey, error } = await supabase.from('guest_keys')
    .select('guest_name, room_number, expires_at, hotel_id, cards!inner(is_active, starts_at, expires_at)')
    .eq('uid', hash).eq('is_active', true)
    .eq('cards.is_active', true).gt('expires_at', new Date().toISOString())
    .lte('cards.starts_at', new Date().toISOString())
    .gt('cards.expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw new Error(`Could not validate mobile key: ${error.message}`);
  if (!guestKey) notFound();
  const { data: hotel, error: hotelError } = await supabase.from('hotels')
    .select('subscription_status, trial_ends_at').eq('id', guestKey.hotel_id).maybeSingle();
  if (hotelError) throw new Error(`Could not verify hotel status: ${hotelError.message}`);
  if (!hotel || (hotel.subscription_status !== 'active' &&
      !(hotel.subscription_status === 'trialing' && new Date(hotel.trial_ends_at).getTime() > Date.now()))) notFound();

  const qrDataUrl = await QRCode.toDataURL(params.token, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
  return (
    <main className="min-h-screen bg-[#0A1931] px-5 py-10 text-white grid place-items-center">
      <section className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#102442] p-7 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">ZENO mobile key</p>
        <h1 className="mt-3 text-2xl font-bold">Room {guestKey.room_number}</h1>
        <p className="mt-2 text-slate-300">Issued for {guestKey.guest_name}</p>
        <div className="mx-auto my-6 w-fit rounded-2xl bg-white p-3"><img src={qrDataUrl} alt="Guest access QR code" width="280" height="280" /></div>
        <p className="text-sm text-slate-300">Show this QR code to a supported ZENO QR reader to unlock your room.</p>
        <p className="mt-3 text-xs text-amber-200">Valid until {new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kigali' }).format(new Date(guestKey.expires_at))} Kigali time. Keep this key private.</p>
      </section>
    </main>
  );
}
