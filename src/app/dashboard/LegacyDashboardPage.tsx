import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, BatteryWarning, CreditCard, DoorOpen, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getActiveHotel, getUserContext } from '@/lib/server-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getKigaliDayBounds } from '@/lib/time';

export default async function LegacyDashboardPage() {
  const context = await getUserContext();
  if (!context) redirect('/hotel-not-found');
  if (context.role === 'receptionist') redirect('/dashboard/enroll');
  if (context.role === 'electrician') redirect('/dashboard/hardware');
  const hotel = await getActiveHotel(context.hotelId);
  if (!hotel) redirect('/hotel-not-found');

  const supabase = await createSupabaseServerClient();
  const { start: todayStart } = getKigaliDayBounds();
  const [rooms, cards, logs, denied, readers, recentLogs] = await Promise.all([
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', context.hotelId),
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('hotel_id', context.hotelId).eq('is_active', true),
    supabase.from('access_logs').select('id', { count: 'exact', head: true }).eq('hotel_id', context.hotelId).gte('created_at', todayStart.toISOString()),
    supabase.from('access_logs').select('id', { count: 'exact', head: true }).eq('hotel_id', context.hotelId).eq('allowed', false).gte('created_at', todayStart.toISOString()),
    supabase.from('readers').select('id, reader_id, battery, last_ping_at').eq('hotel_id', context.hotelId),
    supabase.from('access_logs').select('id, uid, room_number, reader_id, allowed, reason, created_at').eq('hotel_id', context.hotelId).order('created_at', { ascending: false }).limit(6),
  ]);
  for (const result of [rooms, cards, logs, denied, readers, recentLogs]) {
    if (result.error) throw new Error(`Could not load dashboard data: ${result.error.message}`);
  }

  const onlineCount = (readers.data ?? []).filter((reader) => reader.last_ping_at && Date.now() - new Date(reader.last_ping_at).getTime() < 120000).length;
  const daysLeft = Math.max(0, Math.ceil((new Date(hotel.trial_ends_at).getTime() - Date.now()) / 86400000));
  const metrics = [
    { title: 'Rooms configured', value: rooms.count ?? 0, detail: 'Hotel rooms', icon: DoorOpen },
    { title: 'Active guest cards', value: cards.count ?? 0, detail: 'Currently enabled', icon: CreditCard },
    { title: 'Access events today', value: logs.count ?? 0, detail: `${denied.count ?? 0} denied attempts`, icon: Activity },
    { title: 'Readers online', value: `${onlineCount}/${readers.data?.length ?? 0}`, detail: 'Heartbeat under 2 min', icon: BatteryWarning },
  ];

  return <DashboardLayout>
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Hotel overview</p><h1 className="mt-1 text-3xl font-bold">{hotel.name}</h1><p className="mt-2 text-sm text-slate-400">Live RFID access and hardware activity for your property.</p></div>
        <div className="flex gap-2"><Link href="/dashboard/enroll" className="rounded-xl bg-[#00D4FF] px-4 py-2.5 text-sm font-bold text-[#0A1931]">Enroll guest</Link><Link href="/dashboard/hardware" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm hover:border-cyan-300">Hardware</Link></div>
      </header>
      {hotel.subscription_status === 'trialing' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4"><p className="text-sm text-cyan-100">Trial access · {daysLeft} days remaining</p><Link href="/dashboard/billing" className="text-sm font-semibold text-cyan-200 underline">View billing</Link></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ title, value, detail, icon: Icon }) => <article key={title} className="rounded-2xl border border-slate-700 bg-[#102442] p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p><Icon className="h-5 w-5 text-[#00D4FF]" /></div><p className="mt-4 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>)}</div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
          <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><div><h2 className="font-bold">Recent access events</h2><p className="mt-1 text-xs text-slate-400">Latest reader activity</p></div><Link href="/dashboard/logs" className="text-xs text-cyan-200 underline">All logs</Link></div>
          <div className="divide-y divide-slate-700">{(recentLogs.data ?? []).map((log) => <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{log.room_number ? `Room ${log.room_number}` : 'Unassigned card'} <span className="font-mono text-xs text-slate-500">{log.uid}</span></p><p className="mt-1 text-xs text-slate-500">{log.reader_id || 'No reader'} · {new Date(log.created_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${log.allowed ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>{log.allowed ? 'ALLOWED' : 'DENIED'}</span></div>)}
            {!recentLogs.data?.length && <p className="px-5 py-10 text-center text-sm text-slate-500">No access events recorded yet.</p>}</div>
        </section>
        <aside className="space-y-4 rounded-3xl border border-slate-700 bg-[#102442] p-5">
          <h2 className="font-bold">Quick management</h2>
          <Link href="/dashboard/users" className="flex items-center gap-3 rounded-xl bg-[#0A1931] p-4 text-sm hover:ring-1 hover:ring-cyan-400/40"><Users className="h-4 w-4 text-cyan-300" /> Manage staff roles</Link>
          <Link href="/dashboard/rooms" className="flex items-center gap-3 rounded-xl bg-[#0A1931] p-4 text-sm hover:ring-1 hover:ring-cyan-400/40"><DoorOpen className="h-4 w-4 text-cyan-300" /> Configure rooms</Link>
          <Link href="/dashboard/master-cards" className="flex items-center gap-3 rounded-xl bg-[#0A1931] p-4 text-sm hover:ring-1 hover:ring-cyan-400/40"><CreditCard className="h-4 w-4 text-cyan-300" /> Master cards</Link>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="text-xs font-bold text-emerald-200">Offline ready</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Readers can cache up to 50 active card UIDs for access checks without internet.</p></div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-xs font-bold text-amber-200">Fail-secure hardware</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Confirm that door strikes remain locked during power loss, and maintain mechanical egress.</p></div>
        </aside>
      </div>
    </section>
  </DashboardLayout>;
}
