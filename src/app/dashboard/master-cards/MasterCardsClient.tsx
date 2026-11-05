'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface MasterCard { id: string; uid: string; type: 'manager' | 'cleaner'; is_active: boolean; created_at: string; }

export default function MasterCardsClient() {
  const [cards, setCards] = useState<MasterCard[]>([]);
  const [uid, setUid] = useState('');
  const [type, setType] = useState<'manager' | 'cleaner'>('manager');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/master-cards', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load master cards.');
    setCards(result.cards);
  }
  useEffect(() => { refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load master cards.')); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/master-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, type }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create master card.');
      setUid('');
      setMessage(`${type === 'manager' ? 'Manager' : 'Cleaner'} master card created.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create master card.');
    }
  }

  return <DashboardLayout>
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Privileged credentials</p><h1 className="mt-1 text-3xl font-bold">Master cards</h1><p className="mt-2 text-sm text-slate-400">Manager cards open all rooms at any time. Cleaner cards work only 08:00–16:00 Rwanda time.</p></header>
      <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-700 bg-[#102442] p-5 md:grid-cols-[1fr_220px_auto]">
        <label className="text-sm">Card UID<input required maxLength={64} value={uid} onChange={(event) => setUid(event.target.value.toUpperCase())} placeholder="Scan card UID" className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 font-mono uppercase" /></label>
        <label className="text-sm">Card type<select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3"><option value="manager">Manager · 24 hours</option><option value="cleaner">Cleaner · 08:00–16:00</option></select></label>
        <button className="self-end rounded-xl bg-[#00D4FF] px-5 py-3 font-bold text-[#0A1931]">Create master card</button>
      </form>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="overflow-x-auto rounded-3xl border border-slate-700 bg-[#102442]">
        <table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-[#0A1931] text-xs uppercase text-slate-400"><tr><th className="px-5 py-3">UID</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Access</th><th className="px-5 py-3">Created</th></tr></thead>
          <tbody className="divide-y divide-slate-700">{cards.map((card) => <tr key={card.id}><td className="px-5 py-4 font-mono">{card.uid}</td><td className="px-5 py-4 capitalize">{card.type}</td><td className="px-5 py-4">{card.type === 'cleaner' ? '08:00–16:00 Kigali' : 'All rooms · 24h'}</td><td className="px-5 py-4 text-slate-400">{new Date(card.created_at).toLocaleDateString()}</td></tr>)}
            {!cards.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No master cards created.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </DashboardLayout>;
}
