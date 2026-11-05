'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZenoLogo } from '@/components/brand/ZenoLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { HotelRole } from '@/lib/server-auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<HotelRole>('manager');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !signIn.user) {
        setError(signInError?.message ?? 'Could not sign in.');
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from('hotel_users')
        .select('role, hotel_id')
        .eq('auth_user_id', signIn.user.id)
        .maybeSingle();
      if (membershipError) {
        setError(`Could not load your hotel role: ${membershipError.message}`);
        return;
      }
      if (!membership) {
        await supabase.auth.signOut();
        setError('Hotel not found. Ask your hotel manager to invite you.');
        return;
      }

      if (membership.role !== selectedRole) {
        await supabase.auth.signOut();
        setError(`This account is assigned the ${membership.role} role. Select that role to continue.`);
        return;
      }

      const sessionResponse = await fetch('/api/session', { method: 'POST', cache: 'no-store' });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok) {
        setError(session.error || 'Could not store your hotel session.');
        return;
      }
      if (session.role !== membership.role || session.hotel_id !== membership.hotel_id) {
        await supabase.auth.signOut();
        setError('Could not confirm your hotel session. Ask your hotel manager to review your account.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A1931] text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <ZenoLogo variant="dark" size="md" showText />
        </div>
        <section className="rounded-3xl border border-cyan-400/20 bg-[#102442] p-7 shadow-2xl sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00D4FF]">Hotel access platform</p>
          <h1 className="mt-2 text-2xl font-bold">Sign in to ZENO</h1>
          <p className="mt-2 text-sm text-slate-400">Your dashboard is tailored to your hotel role.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-slate-200">
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 text-white outline-none focus:border-[#00D4FF] focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 text-white outline-none focus:border-[#00D4FF] focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Sign in as
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as HotelRole)}
                className="mt-2 w-full rounded-xl border border-slate-600 bg-[#0A1931] px-4 py-3 text-white outline-none focus:border-[#00D4FF] focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="manager">Manager</option>
                <option value="receptionist">Receptionist</option>
                <option value="electrician">Electrician</option>
              </select>
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#00D4FF] px-4 py-3 font-bold text-[#0A1931] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
        <p className="mt-6 text-center text-xs text-slate-500">
          Need access? Ask your hotel manager to invite your email address.
        </p>
      </div>
    </main>
  );
}
