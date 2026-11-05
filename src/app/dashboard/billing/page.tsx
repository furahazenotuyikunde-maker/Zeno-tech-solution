import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getActiveHotel, getUserContext } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function BillingPage() {
  const context = await getUserContext();
  if (!context) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;
  if (context.role !== 'manager') return <DashboardLayout><p className="text-rose-300">Manager access required.</p></DashboardLayout>;
  const hotel = await getActiveHotel(context.hotelId);
  if (!hotel) return <DashboardLayout><p className="text-rose-300">Hotel not found.</p></DashboardLayout>;

  const supabase = await createSupabaseServerClient();
  const { data: rooms, error } = await supabase.from('rooms')
    .select('id, room_number').eq('hotel_id', context.hotelId).order('room_number');
  if (error) throw new Error(`Could not load rooms for billing: ${error.message}`);

  const trialEnd = new Date(hotel.trial_ends_at);
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));
  const active = hotel.subscription_status === 'active' ||
    (hotel.subscription_status === 'trialing' && trialEnd.getTime() > Date.now());
  const extraRooms = hotel.subscription_status === 'trialing' ? (rooms ?? []).slice(2) : [];
  const whatsapp = (roomNumber: string) => `https://wa.me/250790723406?text=${encodeURIComponent(`Please unlock room ${roomNumber} for ${hotel.name} ($5).`)}`;

  return <DashboardLayout>
    <section className="mx-auto max-w-4xl space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Account plan</p><h1 className="mt-1 text-3xl font-bold">Billing & subscription</h1><p className="mt-2 text-sm text-slate-400">{hotel.name}</p></header>
      {!active ? <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-200">Subscription ended</p>
        <h2 className="mt-2 text-3xl font-black">Service Blocked</h2>
        <p className="mt-3 text-slate-200">Renew access for <strong>$20</strong>. To arrange MTN MoMo Pay or account reactivation, contact us directly:</p>
        <div className="mt-5 flex flex-wrap gap-3"><a href="tel:0790723406" className="rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931]">Call 0790723406</a><a href="mailto:tuyikundefzeno@gmail.com" className="rounded-xl border border-slate-500 px-4 py-3">tuyikundefzeno@gmail.com</a></div>
        <p className="mt-4 text-xs text-slate-400">Payment is confirmed manually; this page does not claim a payment has completed.</p>
      </div> : <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-700 bg-[#102442] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current status</p>
          <h2 className="mt-2 text-2xl font-bold capitalize">{hotel.subscription_status.replace('_', ' ')}</h2>
          <p className="mt-4 text-sm text-slate-300">{hotel.subscription_status === 'trialing' ? `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${trialEnd.toLocaleDateString()}).` : `Plan: ${hotel.plan ?? 'active'}.`}</p>
          <p className="mt-2 text-sm text-slate-400">{rooms?.length ?? 0} rooms configured.</p>
        </article>
        <article className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Need to renew?</p>
          <h2 className="mt-2 text-2xl font-bold">$20 subscription</h2>
          <p className="mt-3 text-sm text-slate-300">Contact us to pay by MoMo and activate your hotel account.</p>
          <a href="https://wa.me/250790723406?text=Please%20help%20me%20renew%20my%20ZENO%20hotel%20subscription" className="mt-5 inline-flex rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931]">Contact for MoMo Pay</a>
        </article>
      </div>}
      {extraRooms.length > 0 && <section className="rounded-3xl border border-slate-700 bg-[#102442] p-6">
        <h2 className="text-xl font-bold">Additional rooms</h2><p className="mt-2 text-sm text-slate-400">Trial includes two rooms. Contact ZENO to unlock additional rooms for $5 each.</p>
        <div className="mt-4 space-y-3">{extraRooms.map((room) => <div key={room.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0A1931] p-4"><span>Room {room.room_number}</span><a href={whatsapp(room.room_number)} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200">Request $5 room unlock</a></div>)}</div>
        <p className="mt-4 text-xs text-slate-500">Room unlock requests are confirmed manually by MoMo; access remains locked until the account is updated.</p>
      </section>}
      <p className="text-xs text-slate-500">For assistance: 0790723406 · tuyikundefzeno@gmail.com · <Link href="/dashboard" className="text-cyan-200 underline">Back to dashboard</Link></p>
    </section>
  </DashboardLayout>;
}
