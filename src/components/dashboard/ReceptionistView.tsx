'use client';

import { useCallback, useEffect, useState } from 'react';
import CreateCardButton from '@/components/dashboard/CreateCardButton';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface GuestCard {
  id: string;
  uid: string | null;
  room_number: string;
  guest_name: string;
  status: 'pending' | 'active' | 'expired' | 'blocked';
  valid_from: string;
  valid_until: string | null;
}

interface Room {
  id: string;
  room_number: string;
  esp32_id: string | null;
}

export default function ReceptionistView({ hotelId }: { hotelId: string }) {
  const [cards, setCards] = useState<GuestCard[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [busyCardId, setBusyCardId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [cardsResponse, roomsResult] = await Promise.all([
      fetch('/api/cards', { cache: 'no-store' }),
      supabase.from('rooms').select('id, room_number, esp32_id').eq('hotel_id', hotelId).order('room_number'),
    ]);
    const cardResult = await cardsResponse.json();
    if (!cardsResponse.ok) throw new Error(cardResult.error || 'Could not load cards.');
    if (roomsResult.error) throw new Error(`Could not load rooms: ${roomsResult.error.message}`);
    setCards(cardResult.cards ?? []);
    setRooms(roomsResult.data ?? []);
  }, [hotelId]);

  useEffect(() => {
    loadData().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load receptionist dashboard.'));
  }, [loadData]);

  function refreshData() {
    loadData().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh receptionist dashboard.'));
  }

  async function checkOut(card: GuestCard) {
    setBusyCardId(card.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/cards/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not check out guest.');
      setMessage(result.warning || `Guest in room ${card.room_number} checked out.`);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not check out guest.');
    } finally {
      setBusyCardId('');
    }
  }

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Reception desk</p><h1 className="mt-1 text-3xl font-bold">Guest check-ins</h1><p className="mt-2 text-sm text-slate-400">Manage live guest cards, rooms, and check-outs.</p></div>
        <CreateCardButton onCreated={refreshData} />
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Live Cards List</h2><p className="mt-1 text-xs text-slate-400">Cards created for this hotel</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Guest</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">Card UID</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Check-out</th><th className="px-5 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{cards.map((card) => <tr key={card.id}><td className="px-5 py-3">{card.guest_name}</td><td className="px-5 py-3">{card.room_number}</td><td className="px-5 py-3 font-mono text-xs">{card.uid ?? 'Tap card to activate'}</td><td className={`px-5 py-3 capitalize ${card.status === 'active' ? 'text-emerald-300' : card.status === 'pending' ? 'text-amber-200' : 'text-slate-400'}`}>{card.status}</td><td className="px-5 py-3 text-slate-400">{card.valid_until ? new Date(card.valid_until).toLocaleDateString() : '—'}</td><td className="px-5 py-3">{(card.status === 'active' || card.status === 'pending') && <button onClick={() => checkOut(card)} disabled={Boolean(busyCardId)} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/10 disabled:opacity-50">{busyCardId === card.id ? 'Checking out…' : 'Check-out'}</button>}</td></tr>)}
              {!cards.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No guest cards found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
        <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Rooms</h2><p className="mt-1 text-xs text-slate-400">Rooms registered to this hotel</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[450px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Room</th><th className="px-5 py-3">Reader</th><th className="px-5 py-3">Occupancy</th></tr></thead>
            <tbody className="divide-y divide-slate-700">{rooms.map((room) => {
              const occupied = cards.some((card) => (card.status === 'active' || card.status === 'pending') && card.room_number === room.room_number);
              return <tr key={room.id}><td className="px-5 py-3">{room.room_number}</td><td className="px-5 py-3 font-mono text-xs text-slate-400">{room.esp32_id ?? 'Not linked'}</td><td className={`px-5 py-3 ${occupied ? 'text-amber-200' : 'text-emerald-300'}`}>{occupied ? 'Occupied' : 'Available'}</td></tr>;
            })}
              {!rooms.length && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">No rooms found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
