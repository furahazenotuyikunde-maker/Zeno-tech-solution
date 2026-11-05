import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

const variants = {
  primary: 'bg-[#00D4FF] text-[#0A1931] hover:bg-cyan-300',
  secondary: 'border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-cyan-400/50 hover:bg-slate-800',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white',
  danger: 'border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20',
};

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) {
  const sizing = size === 'sm' ? 'min-h-9 px-3 text-xs' : 'min-h-10 px-4 text-sm';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${sizing} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
