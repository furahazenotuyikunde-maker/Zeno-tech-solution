'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface AccessLog {
  id: string;
  uid: string;
  reader_id: string | null;
  room_number: string | null;
  allowed: boolean;
  reason: string | null;
  created_at: string;
  guest_name?: string | null;
}

type Role = 'manager' | 'receptionist' | 'electrician';

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function AccessLogsClient({ hotelId }: { hotelId: string }) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [role, setRole] = useState<Role>('receptionist');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'allowed' | 'denied'>('all');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/access-logs', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load logs.');
    setLogs(result.logs);
    setRole(result.role);
  }, []);

  useEffect(() => {
    let active = true;
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load logs.'));
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | undefined;
    try {
      const supabase = getSupabaseBrowserClient();
      channel = supabase.channel(`access-logs:${hotelId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'access_logs', filter: `hotel_id=eq.${hotelId}` }, () => {
          if (active) refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh logs.'));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'access_log_guest_details', filter: `hotel_id=eq.${hotelId}` }, () => {
          if (active) refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh private log details.'));
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' && active) setError('Real-time connection failed. Refresh to retry.');
        });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect to live logs.');
    }
    return () => {
      active = false;
      if (channel) void getSupabaseBrowserClient().removeChannel(channel);
    };
  }, [hotelId, refresh]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = filter === 'all' || (filter === 'allowed' ? log.allowed : !log.allowed);
      const matchesQuery = !query ||
        (log.room_number ?? '').toLowerCase().includes(query) ||
        log.uid.toLowerCase().includes(query) ||
        (log.reader_id ?? '').toLowerCase().includes(query) ||
        (log.guest_name ?? '').toLowerCase().includes(query) ||
        (log.reason ?? '').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [filter, logs, search]);

  function exportCsv() {
    const rows = [
      ['Time', 'Room', 'Guest', 'Reader ID', 'Allowed', 'Reason'],
      ...visible.map((log) => [
        new Date(log.created_at).toISOString(),
        log.room_number,
        log.guest_name,
        log.reader_id,
        log.allowed ? 'Allowed' : 'Denied',
        log.reason,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `zeno-access-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <DashboardLayout>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Live audit trail</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Access logs</h1>
            <p className="mt-2 text-sm text-slate-400">Realtime card access events · updates as readers report in.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh logs.'))} className="rounded-xl border border-slate-600 px-4 py-2 text-sm hover:border-cyan-300">Refresh</button>
            {role === 'manager' && <button onClick={exportCsv} className="rounded-xl bg-[#00D4FF] px-4 py-2 text-sm font-bold text-[#0A1931]">Export CSV</button>}
          </div>
        </header>
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-[#102442] p-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search room, UID, reader…" className="min-w-[220px] flex-1 rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-2.5 text-sm outline-none focus:border-[#00D4FF]" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-2.5 text-sm">
            <option value="all">All events</option><option value="allowed">Allowed</option><option value="denied">Denied</option>
          </select>
          <span className="text-xs text-slate-400">{visible.length} events</span>
        </section>
        {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        <div className="overflow-x-auto rounded-3xl border border-slate-700 bg-[#102442]">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#0A1931] text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Room</th>{role !== 'electrician' && <th className="px-5 py-3">Guest</th>}<th className="px-5 py-3">Reader ID</th><th className="px-5 py-3">Result</th><th className="px-5 py-3">Reason</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {visible.map((log) => <tr key={log.id}>
                <td className="whitespace-nowrap px-5 py-4 text-slate-300">{new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Kigali' }).format(new Date(log.created_at))}</td>
                <td className="px-5 py-4">{log.room_number ? `Room ${log.room_number}` : '—'}</td>
                {role !== 'electrician' && <td className="px-5 py-4">{log.guest_name || '—'}</td>}
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{log.reader_id || '—'}</td>
                <td className={`px-5 py-4 font-semibold ${log.allowed ? 'text-emerald-300' : 'text-rose-300'}`}>{log.allowed ? 'Allowed' : 'Denied'}</td>
                <td className="px-5 py-4 text-slate-400">{log.reason || '—'}</td>
              </tr>)}
              {!visible.length && <tr><td colSpan={role === 'electrician' ? 5 : 6} className="px-5 py-12 text-center text-slate-500">No access events found.</td></tr>}
            </tbody>
          </table>
        </div>
        {role === 'electrician' && <p className="text-xs text-slate-500">Guest names and billing details are unavailable to electrician accounts.</p>}
      </section>
    </DashboardLayout>
  );
}
