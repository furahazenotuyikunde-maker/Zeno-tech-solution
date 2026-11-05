'use client';

import { AlertTriangle, BatteryWarning, BrainCircuit, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AiAlertCard from '@/components/AiAlertCard';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { aiApi } from '@/services/api';
import mockData from '@/data/mockData.json';

function SkeletonCard() {
  return <Card className="h-48 animate-pulse bg-slate-900/80 p-5"><div className="h-4 w-2/3 rounded bg-slate-800" /><div className="mt-5 h-8 w-1/3 rounded bg-slate-800" /><div className="mt-4 h-10 rounded bg-slate-800" /></Card>;
}

export default function AiInsightsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['ai-insights', mockData.hotel.id],
    queryFn: () => aiApi.getInsights(mockData.hotel.id),
  });
  const rooms = mockData.rooms;
  const maxKwh = Math.max(1, ...(data?.electricityWaste.map((room) => room.kwh) ?? [1]));
  const monthlySavings = mockData.overview.aiSavingsEstimateUsd;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-3 border-cyan-400/15 bg-gradient-to-r from-cyan-400/[0.08] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><BrainCircuit className="h-5 w-5" /></span><div><h2 className="font-semibold text-white">AI estimated savings this month</h2><p className="mt-1 text-sm text-slate-400">Room power-pattern demo estimate. This is not a measured or guaranteed saving.</p></div></div>
        <p className="text-3xl font-bold text-cyan-200">${monthlySavings}<span className="ml-1 text-sm font-medium text-slate-500">demo estimate</span></p>
      </Card>

      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">Could not load mock AI insights: {error.message}</p>}

      <section>
        <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-300" /><h2 className="font-semibold text-white">Anomaly review</h2><Badge tone="warning">{data?.suspiciousCards.length ?? 0} flagged</Badge></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isPending ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></> : data?.suspiciousCards.map((anomaly) => <AiAlertCard
            key={`${anomaly.cardUid}-${anomaly.type}`}
            title={`${anomaly.type.replaceAll('_', ' ')} · ${anomaly.cardUid}`}
            description={`${anomaly.message}${anomaly.roomId ? ` Room ${anomaly.roomId}.` : ''}`}
            riskScore={anomaly.riskScore}
            level={anomaly.riskScore >= 85 ? 'high' : anomaly.riskScore >= 70 ? 'medium' : 'low'}
            actionLabel="Review card"
          />)}
          {!isPending && !data?.suspiciousCards.length && <Card className="p-5 text-sm text-slate-400">No suspicious access patterns found in the mock sample.</Card>}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4"><Zap className="h-4 w-4 text-cyan-300" /><div><h2 className="font-semibold text-white">Electricity waste prediction</h2><p className="mt-1 text-xs text-slate-500">Power left on while guest card is out</p></div></div>
          {isPending ? <div className="space-y-3 p-5"><div className="h-8 animate-pulse rounded bg-slate-800" /><div className="h-8 animate-pulse rounded bg-slate-800" /></div> : <div className="space-y-4 p-5">
            {data?.electricityWaste.map((prediction) => {
              const room = rooms.find((item) => item.number === prediction.roomId);
              return <div key={prediction.roomId} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-white">Room {prediction.roomId}</span><span className="text-cyan-200">{prediction.kwh} kWh · {room ? `$${room.powerWasteUsdMonthly}/mo` : `${prediction.rwf} RWF`}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300" style={{ width: `${Math.max(4, prediction.kwh / maxKwh * 100)}%` }} /></div><p className="text-xs leading-5 text-slate-500">{prediction.suggestion}</p></div>;
            })}
            {!data?.electricityWaste.length && <p className="text-sm text-slate-400">No electricity waste patterns detected.</p>}
          </div>}
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4"><BatteryWarning className="h-4 w-4 text-amber-300" /><div><h2 className="font-semibold text-white">Battery health predictions</h2><p className="mt-1 text-xs text-slate-500">Locks draining faster than 5% per day</p></div></div>
          {isPending ? <div className="space-y-3 p-5"><div className="h-8 animate-pulse rounded bg-slate-800" /><div className="h-8 animate-pulse rounded bg-slate-800" /></div> : <div className="divide-y divide-slate-800/80">
            {data?.batteryRisks.map((risk) => <div key={risk.lockId} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-medium text-white">Room {risk.roomId} · {risk.lockId}</p><p className="mt-1 text-xs text-slate-500">{risk.battery}% battery · {risk.action}</p></div><Badge tone="danger">{risk.daysLeft} days left</Badge></div>)}
            {!data?.batteryRisks.length && <p className="p-5 text-sm text-slate-400">No fast battery drain detected.</p>}
          </div>}
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Staff operations insights</h2><p className="mt-1 text-xs text-slate-500">Average service speed and after-hours activity</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr>{['Staff member', 'Performance', 'Check-in time', 'Failed-tap response', 'Night access', 'Insight'].map((heading) => <th key={heading} className="border-b border-slate-800 px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/80">
          {data?.staffAlerts.map((staff) => <tr key={staff.staffId}><td className="px-4 py-3.5 font-medium text-white">{staff.staffId}</td><td className="px-4 py-3.5"><Badge tone={staff.performance >= 80 ? 'success' : 'warning'}>{staff.performance}/100</Badge></td><td className="px-4 py-3.5 text-slate-300">{staff.averageCheckInMinutes} min</td><td className="px-4 py-3.5 text-slate-300">{staff.averageFailedTapResponseMinutes} min</td><td className="px-4 py-3.5 text-slate-300">{staff.nightAccessCount}</td><td className="max-w-xs px-4 py-3.5 text-xs text-slate-400">{staff.alert}</td></tr>)}
        </tbody></table></div>
      </Card>
      <p className="text-xs text-slate-600">Offline rule-based demo only. AI results are estimates for product preview, not security decisions.</p>
    </div>
  );
}
