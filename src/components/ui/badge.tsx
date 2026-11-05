import type { HTMLAttributes } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
};

const tones = {
  success: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  warning: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  danger: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
  neutral: 'bg-slate-700/60 text-slate-300 ring-slate-600/50',
  info: 'bg-cyan-400/10 text-cyan-200 ring-cyan-400/20',
};

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`} {...props} />;
}
