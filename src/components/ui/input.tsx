import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-slate-700 bg-[#0A1931] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D4FF] focus:ring-2 focus:ring-cyan-400/10 ${className}`}
      {...props}
    />
  );
}
