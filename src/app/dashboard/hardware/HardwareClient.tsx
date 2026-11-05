'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Reader {
  id: string;
  reader_id: string;
  room_number: string;
  last_ping_at: string | null;
  battery: number | null;
  rssi: number | null;
}
interface Room { id: string; room_number: string; }

function isOnline(reader: Reader, now = Date.now()) {
  return Boolean(reader.last_ping_at && now - new Date(reader.last_ping_at).getTime() < 2 * 60 * 1000);
}

function needsAttention(reader: Reader, now = Date.now()) {
  const offlineTooLong = !reader.last_ping_at || now - new Date(reader.last_ping_at).getTime() > 10 * 60 * 1000;
  return offlineTooLong || (reader.battery !== null && reader.battery < 20);
}

export default function HardwareClient({ initialReaders, canManage }: { initialReaders: Reader[]; canManage: boolean }) {
  const [readers, setReaders] = useState(initialReaders);
  const [activeReader, setActiveReader] = useState<Reader | null>(null);
  const [addingReader, setAddingReader] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newReaderId, setNewReaderId] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/hardware/readers', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not refresh reader status.');
    setReaders(result.readers);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Reader refresh failed.'));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  async function sendCommand(reader: Reader, command: 'remote_open_test' | 'reboot') {
    setBusy(`${reader.reader_id}:${command}`);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/hardware/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_id: reader.reader_id, command }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not queue command.');
      setMessage(`${command === 'reboot' ? 'Reboot' : 'Remote open test'} queued for ${reader.reader_id}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not queue command.');
    } finally {
      setBusy('');
    }
  }

  async function updateWifi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeReader) return;
    setBusy(activeReader.reader_id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/hardware/update-wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_id: activeReader.reader_id, ssid, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not queue Wi-Fi update.');
      setMessage(`Encrypted Wi-Fi update queued for ${activeReader.reader_id}.`);
      setActiveReader(null);
      setSsid('');
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update Wi-Fi.');
    } finally {
      setBusy('');
    }
  }

  async function addReader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('register');
    setError('');
    try {
      const response = await fetch('/api/hardware/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_id: newReaderId, room_number: newRoomNumber }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not register reader.');
      setAddingReader(false);
      setNewReaderId('');
      setNewRoomNumber('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not register reader.');
    } finally {
      setBusy('');
    }
  }

  function openReaderForm() {
    setError('');
    fetch('/api/rooms', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load rooms.');
        setRooms(result.rooms);
        setNewRoomNumber(result.rooms[0]?.room_number ?? '');
        setAddingReader(true);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load rooms.'));
  }

  return (
    <DashboardLayout>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Device fleet</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Hardware health</h1>
            <p className="mt-2 text-sm text-slate-400">Reader heartbeat, battery, radio signal, and secure remote commands.</p>
          </div>
          <div className="flex gap-2">
            {canManage && <button onClick={openReaderForm} className="rounded-xl bg-[#00D4FF] px-4 py-2 text-sm font-bold text-[#0A1931]">Add reader</button>}
            <button onClick={() => refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Refresh failed.'))} className="rounded-xl border border-slate-600 px-4 py-2 text-sm hover:border-cyan-300">Refresh now</button>
          </div>
        </header>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">● Online · heartbeat under 2 min</span>
          <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Battery backup status from reader telemetry</span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200">Fail-secure · door remains locked on power loss</span>
        </div>
        {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        {readers.length === 0 && <div className="rounded-3xl border border-slate-700 bg-[#102442] p-10 text-center text-slate-400">No readers registered. Ask a manager to configure hotel hardware.</div>}
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {readers.map((reader) => {
            const online = isOnline(reader);
            const alert = needsAttention(reader);
            return <article key={reader.id} className={`rounded-3xl border bg-[#102442] p-5 shadow-lg ${alert ? 'border-rose-400/50' : 'border-slate-700'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{reader.reader_id}</p>
                  <h2 className="mt-1 text-xl font-bold">Room {reader.room_number}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${online ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>{online ? '● ONLINE' : '● OFFLINE'}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#0A1931] p-3"><p className="text-xs text-slate-500">Battery backup</p><p className={`mt-1 font-bold ${(reader.battery ?? 0) < 20 ? 'text-rose-300' : 'text-white'}`}>{reader.battery === null ? 'No data' : `${reader.battery}%`}</p></div>
                <div className="rounded-xl bg-[#0A1931] p-3"><p className="text-xs text-slate-500">Signal · RSSI</p><p className="mt-1 font-bold text-white">{reader.rssi === null ? 'No data' : `${reader.rssi} dBm`}</p></div>
              </div>
              <p className={`mt-3 text-xs ${alert ? 'text-rose-300' : 'text-slate-500'}`}>
                {alert ? 'Warning: battery below 20% or offline over 10 minutes.' : `Last heartbeat ${reader.last_ping_at ? new Date(reader.last_ping_at).toLocaleString() : 'not received'}.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button disabled={busy !== ''} onClick={() => sendCommand(reader, 'remote_open_test')} className="rounded-lg bg-[#00D4FF] px-3 py-2 text-xs font-bold text-[#0A1931] disabled:opacity-50">Remote open test</button>
                <button disabled={busy !== ''} onClick={() => sendCommand(reader, 'reboot')} className="rounded-lg border border-slate-600 px-3 py-2 text-xs hover:border-cyan-300 disabled:opacity-50">Reboot</button>
                <button onClick={() => setActiveReader(reader)} className="rounded-lg border border-slate-600 px-3 py-2 text-xs hover:border-cyan-300">Update Wi-Fi</button>
              </div>
            </article>;
          })}
        </div>
      </section>
      {activeReader && <div role="dialog" aria-modal="true" aria-labelledby="wifi-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
        <form onSubmit={updateWifi} className="w-full max-w-md space-y-4 rounded-3xl border border-slate-700 bg-[#102442] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div><h2 id="wifi-title" className="text-xl font-bold">Update reader Wi-Fi</h2><p className="mt-1 text-sm text-slate-400">{activeReader.reader_id} · Room {activeReader.room_number}</p></div>
            <button type="button" onClick={() => setActiveReader(null)} className="text-slate-400 hover:text-white" aria-label="Close">✕</button>
          </div>
          <label className="block text-sm">Network name (SSID)<input required maxLength={32} value={ssid} onChange={(event) => setSsid(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3" /></label>
          <label className="block text-sm">Network password<input required type="password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3" /></label>
          <p className="text-xs text-slate-500">Credentials are encrypted before being queued. The reader must poll the command endpoint to apply changes.</p>
          <button disabled={busy !== ''} type="submit" className="w-full rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931] disabled:opacity-50">{busy ? 'Queueing…' : 'Queue Wi-Fi update'}</button>
        </form>
      </div>}
      {addingReader && <div role="dialog" aria-modal="true" aria-labelledby="reader-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
        <form onSubmit={addReader} className="w-full max-w-md space-y-4 rounded-3xl border border-slate-700 bg-[#102442] p-6">
          <div className="flex items-start justify-between"><div><h2 id="reader-title" className="text-xl font-bold">Register a reader</h2><p className="mt-1 text-sm text-slate-400">Add the ESP32 ID and assigned room.</p></div><button type="button" onClick={() => setAddingReader(false)} aria-label="Close">✕</button></div>
          <label className="block text-sm">Reader ID<input required maxLength={100} value={newReaderId} onChange={(event) => setNewReaderId(event.target.value)} placeholder="ESP32-R204" className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3" /></label>
          <label className="block text-sm">Room<select required value={newRoomNumber} onChange={(event) => setNewRoomNumber(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3"><option value="" disabled>Select room</option>{rooms.map((room) => <option key={room.id} value={room.room_number}>Room {room.room_number}</option>)}</select></label>
          {!rooms.length && <p className="text-sm text-amber-200">Add a room before registering a reader.</p>}
          <button disabled={busy !== '' || !rooms.length} className="w-full rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931] disabled:opacity-50">{busy === 'register' ? 'Registering…' : 'Register reader'}</button>
        </form>
      </div>}
    </DashboardLayout>
  );
}
