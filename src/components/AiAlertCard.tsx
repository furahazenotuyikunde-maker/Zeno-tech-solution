'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type AlertLevel = 'high' | 'medium' | 'low';

export interface AiAlertCardProps {
  title: string;
  description: string;
  riskScore: number;
  level: AlertLevel;
  actionLabel?: string;
  onAction?: () => void;
  value?: string;
}

const levelStyles = {
  high: { text: 'text-rose-300', border: 'border-rose-400/20', fill: 'from-rose-500 to-rose-300', badge: 'danger' as const, label: 'High risk' },
  medium: { text: 'text-amber-300', border: 'border-amber-400/20', fill: 'from-amber-500 to-yellow-300', badge: 'warning' as const, label: 'Review' },
  low: { text: 'text-emerald-300', border: 'border-emerald-400/20', fill: 'from-emerald-500 to-cyan-300', badge: 'success' as const, label: 'Healthy' },
};

export default function AiAlertCard({ title, description, riskScore, level, actionLabel, onAction, value }: AiAlertCardProps) {
  const [completed, setCompleted] = useState(false);
  const style = levelStyles[level];
  const Icon = level === 'high' ? ShieldAlert : level === 'medium' ? AlertTriangle : CheckCircle2;

  function runAction() {
    onAction?.();
    setCompleted(true);
  }

  return (
    <Card className={`overflow-hidden border ${style.border} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-xl bg-slate-950/50 p-2.5 ${style.text}`}><Icon className="h-5 w-5" /></span>
        <Badge tone={style.badge}>{style.label}</Badge>
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      {value && <p className={`mt-1 text-2xl font-bold ${style.text}`}>{value}</p>}
      <p className="mt-2 min-h-10 text-xs leading-5 text-slate-400">{description}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px]"><span className="text-slate-500">AI risk score</span><span className={`font-semibold ${style.text}`}>{riskScore}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full bg-gradient-to-r ${style.fill}`} style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }} /></div>
      </div>
      {actionLabel && <Button onClick={runAction} variant={completed ? 'secondary' : level === 'high' ? 'danger' : 'secondary'} size="sm" className="mt-4 w-full">
        {completed ? <><CheckCircle2 className="h-4 w-4" /> Action queued</> : <>{actionLabel}<ArrowRight className="h-3.5 w-3.5" /></>}
      </Button>}
      {!actionLabel && <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500"><Sparkles className="h-3.5 w-3.5 text-cyan-300" />Pattern-based preview</p>}
    </Card>
  );
}
