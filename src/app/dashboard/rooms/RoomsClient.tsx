'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Room { id: string; room_number: string; }

export default function RoomsClient({ trialing }: { trialing: boolean }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomNumber, setRoomNumber] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch('/api/rooms', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load rooms.');
    setRooms(result.rooms);
  }
  useEffect(() => { refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load rooms.')); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_number: roomNumber }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not add room.');
      setRoomNumber('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add room.');
    } finally {
      setBusy(false);
    }
  }

  return <DashboardLayout>
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Property setup</p><h1 className="mt-1 text-3xl font-bold">Rooms</h1><p className="mt-2 text-sm text-slate-400">{rooms.length} configured · {trialing ? 'Trial plans include 2 rooms.' : 'Room limits depend on your plan.'}</p></header>
      <form onSubmit={submit} className="flex flex-wrap gap-3 rounded-3xl border border-slate-700 bg-[#102442] p-5">
        <input required maxLength={32} value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="Room number, e.g. 204" className="min-w-[220px] flex-1 rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3" />
        <button disabled={busy} className="rounded-xl bg-[#00D4FF] px-5 py-3 font-bold text-[#0A1931] disabled:opacity-50">{busy ? 'Adding…' : 'Add room'}</button>
      </form>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {trialing && rooms.length >= 2 && <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">Trial room limit reached. Upgrade your plan before adding more rooms.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rooms.map((room) => <article key={room.id} className="rounded-2xl border border-slate-700 bg-[#102442] p-5"><p className="text-xs text-slate-500">ROOM</p><p className="mt-1 text-2xl font-bold">{room.room_number}</p></article>)}</div>
    </section>
  </DashboardLayout>;
}
