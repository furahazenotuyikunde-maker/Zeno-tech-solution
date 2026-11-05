import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-2xl border border-slate-800 bg-[#102442] ${className}`} {...props} />;
}
