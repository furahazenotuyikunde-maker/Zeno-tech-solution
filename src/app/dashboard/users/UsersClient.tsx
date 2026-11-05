'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface HotelUser {
  id: string;
  email: string;
  role: 'receptionist' | 'electrician';
  created_at: string;
}

export default function UsersClient() {
  const [users, setUsers] = useState<HotelUser[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'receptionist' | 'electrician'>('receptionist');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch('/api/users', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load users.');
    setUsers(result.users);
  }

  useEffect(() => {
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load users.'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not invite user.');
      setEmail('');
      setMessage(`Invitation sent to ${result.user.email}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not invite user.');
    } finally {
      setBusy(false);
    }
  }

  return <DashboardLayout>
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Team access</p><h1 className="mt-1 text-3xl font-bold">Hotel users</h1><p className="mt-2 text-sm text-slate-400">Invite staff; each role is enforced on the server and in the database.</p></header>
      <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-700 bg-[#102442] p-5 md:grid-cols-[1fr_220px_auto]">
        <label className="text-sm">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3" placeholder="staff@hotel.rw" /></label>
        <label className="text-sm">Role<select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3"><option value="receptionist">Receptionist</option><option value="electrician">Electrician</option></select></label>
        <button disabled={busy} className="self-end rounded-xl bg-[#00D4FF] px-5 py-3 font-bold text-[#0A1931] disabled:opacity-50">{busy ? 'Sending…' : 'Invite staff'}</button>
      </form>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="overflow-x-auto rounded-3xl border border-slate-700 bg-[#102442]">
        <table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-[#0A1931] text-xs uppercase text-slate-400"><tr><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Added</th></tr></thead>
          <tbody className="divide-y divide-slate-700">{users.map((user) => <tr key={user.id}><td className="px-5 py-4">{user.email}</td><td className="px-5 py-4 capitalize">{user.role}</td><td className="px-5 py-4 text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td></tr>)}
            {!users.length && <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-500">No staff accounts yet.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  </DashboardLayout>;
}
