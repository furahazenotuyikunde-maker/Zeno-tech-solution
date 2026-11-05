'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, CircleDollarSign, CreditCard, DoorOpen, Users } from 'lucide-react';
import CreateCardButton from '@/components/dashboard/CreateCardButton';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface AccessLog {
  id: string;
  uid: string;
  room_number: string | null;
  reader_id: string | null;
  allowed: boolean;
  created_at: string;
}

interface Door {
  reader_id: string;
  room_number: string;
  last_ping_at: string | null;
  battery: number | null;
}

interface GuestCard {
  id: string;
  uid: string | null;
  guest_name: string;
  room_number: string;
  status: 'pending' | 'active' | 'expired' | 'blocked';
  valid_until: string | null;
}

function isOnline(lastPing: string | null) {
  return Boolean(lastPing && Date.now() - new Date(lastPing).getTime() < 120_000);
}

export default function ManagerView({ hotelId }: { hotelId: string }) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [cards, setCards] = useState<GuestCard[]>([]);
  const [roomCount, setRoomCount] = useState(0);
  const [activeCardCount, setActiveCardCount] = useState(0);
  const [todayLogCount, setTodayLogCount] = useState(0);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date().toISOString();
    const [teamResult, logsResult, doorsResult, roomsResult, activeCardsResult, countResult, cardResponse] = await Promise.all([
      supabase.from('hotel_users').select('id, email, role, created_at').eq('hotel_id', hotelId).order('created_at'),
      supabase.from('access_logs').select('id, uid, room_number, reader_id, allowed, created_at').eq('hotel_id', hotelId).order('created_at', { ascending: false }).limit(10),
      supabase.from('readers').select('reader_id, room_number, last_ping_at, battery').eq('hotel_id', hotelId).order('room_number'),
      supabase.from('rooms').select('id').eq('hotel_id', hotelId),
      supabase.from('cards').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'active').lte('valid_from', now).or(`valid_until.is.null,valid_until.gt.${now}`),
      supabase.from('access_logs').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).gte('created_at', today.toISOString()),
      fetch('/api/cards', { cache: 'no-store' }),
    ]);
    const cardResult = await cardResponse.json();
    if (!cardResponse.ok) throw new Error(cardResult.error || 'Could not load hotel cards.');
    const failed = [teamResult, logsResult, doorsResult, roomsResult, activeCardsResult, countResult].find((result) => result.error);
    if (failed?.error) throw new Error(`Could not load manager dashboard: ${failed.error.message}`);
    setTeam(teamResult.data ?? []);
    setLogs(logsResult.data ?? []);
    setDoors(doorsResult.data ?? []);
    setCards(cardResult.cards ?? []);
    setRoomCount(roomsResult.data?.length ?? 0);
    setActiveCardCount(activeCardsResult.count ?? 0);
    setTodayLogCount(countResult.count ?? 0);
  }, [hotelId]);

  useEffect(() => {
    loadDashboard().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load manager dashboard.'));
  }, [loadDashboard]);

  function refreshDashboard() {
    loadDashboard().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh manager dashboard.'));
  }

  const metrics = [
    { label: 'Revenue tracking', value: 'Not configured', note: 'No payment ledger is connected', icon: CircleDollarSign },
    { label: 'Active guest cards', value: activeCardCount, note: 'Enabled access cards', icon: CreditCard },
    { label: 'Rooms', value: roomCount, note: 'Configured for this hotel', icon: DoorOpen },
    { label: 'Access events today', value: todayLogCount, note: 'All door activity', icon: Activity },
  ];

  return (
    <section className="space-y-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Manager overview</p>
        <h1 className="mt-1 text-3xl font-bold">Hotel dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Team, access activity, and door health for your property.</p>
        <div className="mt-5"><CreateCardButton onCreated={refreshDashboard} /></div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-slate-700 bg-[#102442] p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><Icon className="h-5 w-5 text-[#00D4FF]" /></div>
            <p className="mt-4 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">All Cards</h2><p className="mt-1 text-xs text-slate-400">Cards assigned to this hotel</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Guest</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">UID</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Valid until</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{cards.map((card) => <tr key={card.id}><td className="px-5 py-3">{card.guest_name}</td><td className="px-5 py-3">{card.room_number}</td><td className="px-5 py-3 font-mono text-xs">{card.uid ?? '—'}</td><td className={`px-5 py-3 capitalize ${card.status === 'active' ? 'text-emerald-300' : card.status === 'blocked' ? 'text-rose-300' : 'text-slate-300'}`}>{card.status}</td><td className="px-5 py-3 text-slate-400">{card.valid_until ? new Date(card.valid_until).toLocaleString() : '—'}</td></tr>)}
              {!cards.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No cards found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Team</h2><p className="mt-1 text-xs text-slate-400">Hotel users and assigned roles</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Added</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{team.map((member) => <tr key={member.id}><td className="px-5 py-3">{member.email}</td><td className="px-5 py-3 capitalize">{member.role}</td><td className="px-5 py-3 text-slate-400">{new Date(member.created_at).toLocaleDateString()}</td></tr>)}
              {!team.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">No team members found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><div><h2 className="font-bold">All Logs</h2><p className="mt-1 text-xs text-slate-400">Most recent hotel access events</p></div><Link href="/dashboard/logs" className="text-xs text-cyan-200 underline">View all</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">Card UID</th><th className="px-5 py-3">Door</th><th className="px-5 py-3">Result</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-5 py-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td><td className="px-5 py-3">{log.room_number ?? '—'}</td><td className="px-5 py-3 font-mono text-xs">{log.uid}</td><td className="px-5 py-3">{log.reader_id ?? '—'}</td><td className={`px-5 py-3 font-semibold ${log.allowed ? 'text-emerald-300' : 'text-rose-300'}`}>{log.allowed ? 'Allowed' : 'Denied'}</td></tr>)}
              {!logs.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No access logs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">All Doors</h2><p className="mt-1 text-xs text-slate-400">ESP32 reader status and battery levels</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Room</th><th className="px-5 py-3">Reader</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Battery</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{doors.map((door) => <tr key={door.reader_id}><td className="px-5 py-3">{door.room_number}</td><td className="px-5 py-3 font-mono text-xs">{door.reader_id}</td><td className={`px-5 py-3 ${isOnline(door.last_ping_at) ? 'text-emerald-300' : 'text-rose-300'}`}>{isOnline(door.last_ping_at) ? 'Online' : 'Offline'}</td><td className="px-5 py-3">{door.battery === null ? '—' : `${door.battery}%`}</td></tr>)}
              {!doors.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No doors registered.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
