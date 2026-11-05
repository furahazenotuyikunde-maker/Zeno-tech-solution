'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Room {
  id: string;
  room_number: string;
}

interface CheckIn {
  id: string;
  uid: string;
  room_number: string;
  guest_name: string;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface Enrollment {
  request_id: string;
  guest_name: string;
  room_number: string;
  uid: string;
  check_in: string;
  check_out: string;
}
interface MobileKey { url: string; qr_data_url: string; expires_at: string; }

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EnrollClient({ initialRooms, hotelId }: { initialRooms: Room[]; hotelId: string }) {
  const queueKey = `zeno:enrollment-queue:${hotelId}`;
  const [rooms, setRooms] = useState(initialRooms);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [queue, setQueue] = useState<Enrollment[]>([]);
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState(initialRooms[0]?.room_number ?? '');
  const [checkIn, setCheckIn] = useState(localDate());
  const [checkOut, setCheckOut] = useState(localDate(new Date(Date.now() + 86400000)));
  const [uid, setUid] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mobileKey, setMobileKey] = useState<MobileKey | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const refreshCheckIns = useCallback(async () => {
    const response = await fetch('/api/enroll', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load check-ins.');
    setCheckIns(result.check_ins ?? []);
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const saved = window.localStorage.getItem(queueKey);
    if (!saved) return;
    const pending = JSON.parse(saved) as Enrollment[];
    const remaining = [...pending];
    while (remaining.length) {
      const current = remaining[0];
      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not sync an offline enrollment.');
      remaining.shift();
      window.localStorage.setItem(queueKey, JSON.stringify(remaining));
    }
    window.localStorage.removeItem(queueKey);
    setQueue([]);
    setMessage('Offline enrollments synced.');
    await refreshCheckIns();
  }, [queueKey, refreshCheckIns]);

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
    refreshCheckIns().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load check-ins.'));
    try {
      const saved = window.localStorage.getItem(queueKey);
      if (saved) setQueue(JSON.parse(saved) as Enrollment[]);
    } catch (cause) {
      setError(cause instanceof Error ? `Offline queue could not be read: ${cause.message}` : 'Offline queue could not be read.');
    }
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      syncQueue().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Offline sync failed.'));
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [queueKey, refreshCheckIns, syncQueue]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);
    const enrollment: Enrollment = {
      request_id: crypto.randomUUID(),
      guest_name: guestName.trim(),
      room_number: roomNumber,
      uid: uid.trim().toUpperCase(),
      check_in: checkIn,
      check_out: checkOut,
    };

    try {
      if (!navigator.onLine) {
        const nextQueue = [...queue, enrollment];
        window.localStorage.setItem(queueKey, JSON.stringify(nextQueue));
        setQueue(nextQueue);
        setMessage('Saved on this device. It will sync when internet returns.');
      } else {
        const response = await fetch('/api/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enrollment),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not enroll guest.');
        setMessage(`Card ${result.card.uid} enrolled for room ${result.card.room_number}.`);
        await refreshCheckIns();
      }
      setGuestName('');
      setUid('');
    } catch (cause) {
      if (cause instanceof TypeError && !navigator.onLine) {
        try {
          const nextQueue = [...queue, enrollment];
          window.localStorage.setItem(queueKey, JSON.stringify(nextQueue));
          setQueue(nextQueue);
          setMessage('Saved on this device. It will sync when internet returns.');
        } catch (storageError) {
          setError(storageError instanceof Error ? `Could not save offline enrollment: ${storageError.message}` : 'Could not save offline enrollment.');
        }
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not enroll guest.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeCard(card: CheckIn, reason: 'CHECKOUT' | 'LOST_CARD') {
    setError('');
    setMessage('');
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: card.uid, reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not deactivate card.');
      return;
    }
    setMessage(result.warning || (reason === 'CHECKOUT' ? 'Guest checked out and card revoked.' : 'Lost card blocked.'));
    await refreshCheckIns();
  }

  async function generateMobileKey(card: CheckIn) {
    setError('');
    setMessage('');
    const response = await fetch('/api/guest-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not create mobile key.');
      return;
    }
    setMobileKey(result);
  }

  return (
    <DashboardLayout>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Reception desk</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Guest enrollment</h1>
            <p className="mt-2 text-sm text-slate-400">Issue room access in seconds. Card data syncs securely when online.</p>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200">
            Offline queue · {queue.length} pending
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-700 bg-[#102442] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">ENROLL NEW GUEST</h2>
                <p className="mt-1 text-sm text-slate-400">Scan a card UID or enter it manually.</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">50 cards cached offline</span>
            </div>
            <label className="block text-sm font-medium text-slate-200">
              Guest name
              <input required maxLength={160} value={guestName} onChange={(event) => setGuestName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-[#00D4FF]" />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Room
              <select required value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 outline-none focus:border-[#00D4FF]">
                <option value="" disabled>Select room</option>
                {rooms.map((room) => <option key={room.id} value={room.room_number}>Room {room.room_number}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-200">
                Check-in
                <input type="date" required value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 text-white outline-none focus:border-[#00D4FF]" />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Check-out
                <input type="date" required min={checkIn} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 text-white outline-none focus:border-[#00D4FF]" />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-200">
              RFID card UID
              <input required maxLength={64} autoComplete="off" value={uid} onChange={(event) => setUid(event.target.value.toUpperCase())} onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  setUid((value) => value.trim().toUpperCase());
                }
              }} placeholder="Focus here, then scan card" className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 font-mono uppercase outline-none focus:border-[#00D4FF]" />
              <span className="mt-1 block text-xs text-slate-500">USB RC522 readers enter the UID as keyboard input.</span>
            </label>
            {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
            {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <button disabled={submitting || !roomNumber} type="submit" className="w-full rounded-xl bg-[#00D4FF] px-5 py-4 text-sm font-black tracking-wide text-[#0A1931] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'SAVING…' : 'ENROLL NEW GUEST'}
            </button>
          </form>

          <aside className="space-y-4 rounded-3xl border border-slate-700 bg-[#102442] p-6">
            <div>
              <h2 className="text-lg font-bold">Reception status</h2>
              <p className="mt-1 text-sm text-slate-400">Designed for a fast check-in flow.</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-[#0A1931] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connection</p>
              <p className={`mt-2 font-semibold ${isOnline ? 'text-emerald-300' : 'text-amber-200'}`}>{isOnline ? 'Online · synced to hotel' : 'Offline · local queue enabled'}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-cyan-200">Offline whitelist</p>
              <p className="mt-1">Readers cache the 50 current active cards. Access checks continue during internet interruptions.</p>
            </div>
            {rooms.length === 0 && <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">No rooms found. Ask a manager to add rooms before enrolling guests.</p>}
          </aside>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-700 bg-[#102442]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-4">
            <div>
              <h2 className="font-bold">Today’s check-ins</h2>
              <p className="mt-1 text-xs text-slate-400">Guest details are visible only to managers and reception staff.</p>
            </div>
            <span className="text-xs text-slate-400">{checkIns.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-[#0A1931] text-xs uppercase tracking-wider text-slate-400">
                <tr><th className="px-5 py-3">Guest</th><th className="px-5 py-3">Room</th><th className="px-5 py-3">UID</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {checkIns.map((card) => <tr key={card.id}>
                  <td className="px-5 py-4 font-medium">{card.guest_name}</td>
                  <td className="px-5 py-4">Room {card.room_number}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-400">{card.uid}</td>
                  <td className="px-5 py-4"><span className={card.is_active ? 'text-emerald-300' : 'text-slate-500'}>{card.is_active ? 'Active' : 'Revoked'}</span></td>
                  <td className="px-5 py-4">
                    {card.is_active && <div className="flex gap-2">
                      <button onClick={() => revokeCard(card, 'CHECKOUT')} className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs hover:border-cyan-300">Checkout</button>
                      <button onClick={() => revokeCard(card, 'LOST_CARD')} className="rounded-lg border border-rose-400/30 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">Block lost card</button>
                      <button onClick={() => generateMobileKey(card).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not create mobile key.'))} className="rounded-lg border border-cyan-400/30 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10">QR key</button>
                    </div>}
                  </td>
                </tr>)}
                {!checkIns.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No check-ins recorded today.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      {mobileKey && <div role="dialog" aria-modal="true" aria-labelledby="guest-key-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
        <section className="w-full max-w-sm rounded-3xl border border-slate-700 bg-[#102442] p-6 text-center">
          <div className="flex items-start justify-between"><div className="text-left"><h2 id="guest-key-title" className="text-xl font-bold">Guest mobile key</h2><p className="mt-1 text-xs text-slate-400">Share this link privately with the guest.</p></div><button onClick={() => setMobileKey(null)} aria-label="Close" className="text-slate-400">✕</button></div>
          <img src={mobileKey.qr_data_url} alt="Guest access QR code" width="240" height="240" className="mx-auto my-5 rounded-xl bg-white p-2" />
          <a href={mobileKey.url} className="break-all text-xs text-cyan-200 underline">{mobileKey.url}</a>
          <p className="mt-3 text-xs text-slate-500">Expires {new Date(mobileKey.expires_at).toLocaleString()} · Requires a supported online QR reader.</p>
        </section>
      </div>}
    </DashboardLayout>
  );
}
