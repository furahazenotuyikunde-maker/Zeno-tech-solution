'use client';

import { useCallback, useEffect, useState } from 'react';
import { Battery, DoorClosed, DoorOpen } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Reader {
  id: string;
  reader_id: string;
  room_number: string;
  last_ping_at: string | null;
  battery: number | null;
  rssi: number | null;
  maintenance_status: 'open' | 'fixed';
}

interface CardAlert {
  id: string;
  room_number: string | null;
  uid: string | null;
  status: string;
  alert_type: 'blocked_card' | 'cloned_card';
  reader_id?: string | null;
  reason?: string | null;
  created_at: string;
}

function online(reader: Reader) {
  return Boolean(reader.last_ping_at && Date.now() - new Date(reader.last_ping_at).getTime() < 120_000);
}

export default function ElectricianView({ hotelId }: { hotelId: string }) {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [alerts, setAlerts] = useState<CardAlert[]>([]);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadReaders = useCallback(async () => {
    const { data, error: queryError } = await getSupabaseBrowserClient().from('readers')
      .select('id, reader_id, room_number, last_ping_at, battery, rssi, maintenance_status')
      .eq('hotel_id', hotelId).order('reader_id');
    if (queryError) throw new Error(`Could not load ESP32 status: ${queryError.message}`);
    setReaders(data ?? []);
  }, [hotelId]);

  const loadAlerts = useCallback(async () => {
    const response = await fetch('/api/cards', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load blocked-card alerts.');
    setAlerts(result.alerts ?? []);
  }, []);

  useEffect(() => {
    loadReaders().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load electrician dashboard.'));
    loadAlerts().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load blocked-card alerts.'));
  }, [loadAlerts, loadReaders]);

  async function markFixed(reader: Reader) {
    setBusyId(reader.reader_id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/hardware/mark-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_id: reader.reader_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not mark this door fixed.');
      setReaders((current) => current.map((item) => item.id === reader.id ? { ...item, maintenance_status: 'fixed' } : item));
      setMessage(`${reader.reader_id} marked fixed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark this door fixed.');
    } finally {
      setBusyId('');
    }
  }

  const onlineCount = readers.filter(online).length;
  const offlineCount = readers.length - onlineCount;
  const batteries = readers.map((reader) => reader.battery).filter((value): value is number => value !== null);
  const averageBattery = batteries.length ? Math.round(batteries.reduce((sum, value) => sum + value, 0) / batteries.length) : null;

  return (
    <section className="space-y-7">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Facility monitoring</p><h1 className="mt-1 text-3xl font-bold">Door & ESP32 status</h1><p className="mt-2 text-sm text-slate-400">Monitor controller connectivity and resolve maintenance items.</p></header>
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-700 bg-[#102442] p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-xs font-semibold uppercase tracking-wider">Doors online</span><DoorOpen className="h-5 w-5 text-emerald-300" /></div><p className="mt-4 text-3xl font-bold text-emerald-200">{onlineCount}</p></article>
        <article className="rounded-2xl border border-slate-700 bg-[#102442] p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-xs font-semibold uppercase tracking-wider">Doors offline</span><DoorClosed className="h-5 w-5 text-rose-300" /></div><p className="mt-4 text-3xl font-bold text-rose-200">{offlineCount}</p></article>
        <article className="rounded-2xl border border-slate-700 bg-[#102442] p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-xs font-semibold uppercase tracking-wider">Average battery</span><Battery className="h-5 w-5 text-[#00D4FF]" /></div><p className="mt-4 text-3xl font-bold">{averageBattery === null ? '—' : `${averageBattery}%`}</p></article>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Blocked / cloned card alerts</h2><p className="mt-1 text-xs text-slate-400">Security alerts only; guest identity details are not shown.</p></div>
        <div className="divide-y divide-slate-700">
          {alerts.map((alert) => <article key={`${alert.alert_type}:${alert.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div><p className="font-semibold text-rose-200">{alert.alert_type === 'cloned_card' ? 'Cloned card attempt' : 'Blocked card'}</p><p className="mt-1 text-xs text-slate-400">Room {alert.room_number ?? '—'} · UID {alert.uid ?? '—'}{alert.reader_id ? ` · Reader ${alert.reader_id}` : ''}{alert.reason ? ` · ${alert.reason}` : ''}</p></div>
            <time className="text-xs text-slate-500">{new Date(alert.created_at).toLocaleString()}</time>
          </article>)}
          {!alerts.length && <p className="px-5 py-8 text-center text-sm text-slate-500">No blocked or cloned-card alerts.</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">ESP32 status</h2><p className="mt-1 text-xs text-slate-400">Heartbeat, signal, battery, and maintenance status per door</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Room</th><th className="px-5 py-3">ESP32</th><th className="px-5 py-3">Connection</th><th className="px-5 py-3">Battery</th><th className="px-5 py-3">Signal</th><th className="px-5 py-3">Maintenance</th><th className="px-5 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{readers.map((reader) => <tr key={reader.id}>
              <td className="px-5 py-3">{reader.room_number}</td><td className="px-5 py-3 font-mono text-xs">{reader.reader_id}</td>
              <td className={`px-5 py-3 ${online(reader) ? 'text-emerald-300' : 'text-rose-300'}`}>{online(reader) ? 'Online' : 'Offline'}</td>
              <td className="px-5 py-3">{reader.battery === null ? '—' : `${reader.battery}%`}</td><td className="px-5 py-3">{reader.rssi === null ? '—' : `${reader.rssi} dBm`}</td>
              <td className={`px-5 py-3 capitalize ${reader.maintenance_status === 'fixed' ? 'text-emerald-300' : 'text-amber-200'}`}>{reader.maintenance_status}</td>
              <td className="px-5 py-3"><button onClick={() => markFixed(reader)} disabled={reader.maintenance_status === 'fixed' || Boolean(busyId)} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10 disabled:opacity-50">{busyId === reader.reader_id ? 'Saving…' : 'Mark Fixed'}</button></td>
            </tr>)}
              {!readers.length && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No ESP32 readers registered.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
