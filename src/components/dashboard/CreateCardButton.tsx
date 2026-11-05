'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
}

interface GuestCard {
  id: string;
  uid: string | null;
  room_number: string;
  guest_name: string;
  status: 'pending' | 'active' | 'expired' | 'blocked';
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CreateCardButton({ onCreated }: { onCreated: () => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [pendingCard, setPendingCard] = useState<GuestCard | null>(null);
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkIn, setCheckIn] = useState(localDate());
  const [checkOut, setCheckOut] = useState(localDate(new Date(Date.now() + 86_400_000)));
  const [uid, setUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/rooms', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load rooms.');
        return result.rooms as Room[];
      })
      .then((result) => {
        if (!active) return;
        setRooms(result);
        setRoomNumber((current) => current || result[0]?.room_number || '');
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load rooms.'));
    return () => { active = false; };
  }, []);

  const pollCard = useCallback(async (cardId: string) => {
    const response = await fetch(`/api/cards?card_id=${encodeURIComponent(cardId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not check card activation.');
    const card = (result.cards as GuestCard[]).find((item) => item.id === cardId);
    if (card?.status === 'active' && card.uid) {
      setPendingCard(card);
      setSuccess(`Card Active for Room ${card.room_number}`);
      setError('');
      onCreated();
    } else if (card && card.status !== 'pending') {
      setError(`Card is ${card.status} and cannot be activated.`);
    }
  }, [onCreated]);

  useEffect(() => {
    if (!pendingCard || pendingCard.status !== 'pending') return;
    const timer = window.setInterval(() => {
      pollCard(pendingCard.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not check card activation.'));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [pendingCard, pollCard]);

  async function createCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          phone,
          passport_number: passportNumber,
          room_number: roomNumber,
          check_in: checkIn,
          check_out: checkOut,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create card.');
      setPendingCard(result.card as GuestCard);
      setUid('');
      setShowForm(false);
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create card.');
    } finally {
      setBusy(false);
    }
  }

  async function activateCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingCard) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/cards/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: pendingCard.id, uid }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not activate card.');
      setPendingCard(result.card as GuestCard);
      setSuccess(`Card Active for Room ${result.card.room_number}`);
      setUid('');
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not activate card.');
    } finally {
      setBusy(false);
    }
  }

  function closeActivation() {
    setPendingCard(null);
    setSuccess('');
    setError('');
    onCreated();
  }

  return (
    <>
      <button onClick={() => { setError(''); setShowForm(true); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#00D4FF] px-5 font-bold text-[#0A1931] hover:bg-cyan-300">
        <Plus className="h-5 w-5" />Create Card
      </button>

      {error && !showForm && !pendingCard && <p role="alert" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="create-card-title">
          <section className="my-auto w-full max-w-xl rounded-3xl border border-slate-700 bg-[#102442] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Guest enrollment</p><h2 id="create-card-title" className="mt-1 text-xl font-bold">Create guest card</h2></div><button onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={createCard} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-200 sm:col-span-2">Guest name<input required maxLength={160} value={guestName} onChange={(event) => setGuestName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-cyan-300" /></label>
              <label className="text-sm text-slate-200">Phone<input required type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-cyan-300" /></label>
              <label className="text-sm text-slate-200">Passport number<input required maxLength={80} value={passportNumber} onChange={(event) => setPassportNumber(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-cyan-300" /></label>
              <label className="text-sm text-slate-200">Room<select required value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-cyan-300"><option value="" disabled>Select room</option>{rooms.map((room) => <option key={room.id} value={room.room_number}>{room.room_number}</option>)}</select></label>
              <span className="hidden sm:block" />
              <label className="text-sm text-slate-200">Check-in<input required type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-cyan-300" /></label>
              <label className="text-sm text-slate-200">Check-out<input required type="date" min={checkIn} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-cyan-300" /></label>
              {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200 sm:col-span-2">{error}</p>}
              <button type="submit" disabled={busy || !rooms.length} className="mt-2 rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931] disabled:opacity-50 sm:col-span-2">{busy ? 'Creating…' : 'Create Card'}</button>
            </form>
          </section>
        </div>
      )}

      {pendingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="activate-card-title">
          <section className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-[#102442] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Card activation</p><h2 id="activate-card-title" className="mt-2 text-2xl font-bold">{success || 'Tap blank card on reader...'}</h2></div>{success && <button onClick={closeActivation} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>}</div>
            <p className="mt-3 text-sm text-slate-300">Guest: {pendingCard.guest_name} · Room {pendingCard.room_number}</p>
            {success ? (
              <button onClick={closeActivation} className="mt-6 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-[#0A1931]">Done</button>
            ) : (
              <>
                <p className="mt-3 break-all rounded-lg bg-[#0A1931] p-3 font-mono text-xs text-slate-400">Card ID: {pendingCard.id}</p>
                <p className="mt-4 text-sm text-slate-400">The reader can POST this card ID and UID to <code className="text-cyan-200">/api/cards/activate</code>. A USB reader can type its UID below.</p>
                <form onSubmit={activateCard} className="mt-5 space-y-3">
                  <label className="block text-sm text-slate-200">Reader UID<input autoFocus required maxLength={64} pattern="[A-Za-z0-9:-]+" value={uid} onChange={(event) => setUid(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 font-mono outline-none focus:border-cyan-300" /></label>
                  {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
                  <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931] disabled:opacity-50">{busy ? 'Activating…' : 'Activate Card'}</button>
                </form>
                <p className="mt-4 text-center text-xs text-slate-500">Waiting for reader activation…</p>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
