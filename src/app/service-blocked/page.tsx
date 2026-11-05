import Link from 'next/link';

export default function ServiceBlockedPage() {
  return (
    <main className="min-h-screen bg-[#0A1931] text-white grid place-items-center px-6">
      <section className="max-w-lg rounded-3xl border border-rose-400/30 bg-[#102442] p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">Subscription expired</p>
        <h1 className="mt-3 text-3xl font-bold">Service Blocked</h1>
        <p className="mt-4 text-slate-300">Contact the hotel manager to restore service. Payment assistance: $20, 0790723406 or tuyikundefzeno@gmail.com (MoMo Pay).</p>
        <Link href="/login" className="mt-7 inline-flex rounded-xl bg-[#00D4FF] px-5 py-3 font-bold text-[#0A1931]">Back to sign in</Link>
      </section>
    </main>
  );
}
