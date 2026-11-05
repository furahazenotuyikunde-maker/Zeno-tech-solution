import Link from 'next/link';

export default function HotelNotFoundPage() {
  return (
    <main className="min-h-screen bg-[#0A1931] text-white grid place-items-center px-6">
      <section className="max-w-md rounded-3xl border border-cyan-400/20 bg-[#102442] p-8 text-center">
        <h1 className="text-2xl font-bold">Hotel not found</h1>
        <p className="mt-3 text-sm text-slate-300">Your account is not linked to a hotel. Ask the hotel manager to add you, then sign in again.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#00D4FF] px-5 py-3 font-bold text-[#0A1931]">Back to sign in</Link>
      </section>
    </main>
  );
}
