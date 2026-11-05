'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { UserRole } from '@/types';

interface NavbarProps {
  currentRole: UserRole | null;
  hotelName: string;
}

export const Navbar = ({ currentRole, hotelName }: NavbarProps) => {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    setError('');
    const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      setBusy(false);
      return;
    }
    router.replace('/auth/signin');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-700 bg-[#0A1931]/95 px-5 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-emerald-200">
        <ShieldCheck className="h-4 w-4 text-[#00D4FF]" />
        <span>Authenticated hotel session</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold capitalize text-white">{currentRole || 'Loading session…'}</p>
          <p className="max-w-48 truncate text-[10px] text-slate-400">{hotelName}</p>
        </div>
        <button onClick={signOut} disabled={busy} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-300 disabled:opacity-50">
          <LogOut className="h-3.5 w-3.5" />{busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      {error && <span role="alert" className="absolute right-4 top-full mt-2 rounded-lg bg-rose-900 px-3 py-2 text-xs text-rose-100 shadow">{error}</span>}
    </header>
  );
};
