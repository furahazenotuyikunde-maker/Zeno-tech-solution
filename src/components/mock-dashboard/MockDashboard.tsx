'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowDownRight, ArrowUpRight, BatteryCharging, Bell, Building2,
  BrainCircuit, Check, ChevronDown, CircleDollarSign, CreditCard, DoorOpen, Download,
  LayoutDashboard, LogOut, Menu, Search, ShieldCheck, X, Zap,
} from 'lucide-react';
import mockData from '@/data/mockData.json';
import AiAlertCard from '@/components/AiAlertCard';
import AiInsightsPage from '@/components/mock-dashboard/AiInsightsPage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AccessLog, CardAnomaly } from '@/ai/types';
import { detectCardAnomaly } from '@/ai/cardAnomaly';
import { predictBatteryFailure } from '@/ai/batteryPredict';
import { aiApi } from '@/services/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Page = 'dashboard' | 'rooms' | 'cards' | 'logs' | 'electricity' | 'billing' | 'ai-insights';
type Room = Omit<(typeof mockData.rooms)[number], 'powerWasteUsdMonthly'> & { powerWasteUsdMonthly?: number };
type AccessCard = (typeof mockData.cards)[number];
type LogEntry = (typeof mockData.logs)[number];
type Circuit = (typeof mockData.electricity.circuits)[number];

const iconByName = {
  dashboard: LayoutDashboard,
  rooms: DoorOpen,
  cards: CreditCard,
  logs: Activity,
  electricity: Zap,
  billing: CircleDollarSign,
  ai: BrainCircuit,
};

const pageDetails: Record<Page, { eyebrow: string; description: string }> = {
  dashboard: { eyebrow: 'PROPERTY OVERVIEW', description: 'A clear view of your hotel access, rooms, and operations.' },
  rooms: { eyebrow: 'PROPERTY MANAGEMENT', description: 'Review availability and manage room readiness.' },
  cards: { eyebrow: 'ACCESS MANAGEMENT', description: 'Keep guest keycards organized and access under control.' },
  logs: { eyebrow: 'SECURITY ACTIVITY', description: 'Review recent door activity across your property.' },
  electricity: { eyebrow: 'FACILITY MONITORING', description: 'Monitor energy use and manage building circuits.' },
  billing: { eyebrow: 'ACCOUNT & PAYMENTS', description: 'Review your subscription, usage, and invoices.' },
  'ai-insights': { eyebrow: 'PREDICTIVE OPERATIONS', description: 'See explainable access, energy, battery, and staff insights.' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: mockData.hotel.currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium', timeZone: mockData.hotel.timezone }).format(date);
}

function statusTone(value: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (['Active', 'Occupied', 'Allowed', 'Paid', 'Normal'].includes(value)) return 'success';
  if (['Cleaning', 'Pending', 'Standby'].includes(value)) return 'warning';
  if (['Blocked', 'Denied', 'Overdue'].includes(value)) return 'danger';
  if (value === 'Available') return 'info';
  return 'neutral';
}

function PageHeader({ page, onMenuClick }: { page: Page; onMenuClick: () => void }) {
  const nav = mockData.navigation.find((item) => item.href === (page === 'dashboard' ? '/dashboard' : `/${page}`));
  const details = pageDetails[page];
  return (
    <header className="mb-7 flex items-start gap-3">
      <Button variant="secondary" size="sm" className="mt-1 lg:hidden" aria-label="Open navigation" onClick={onMenuClick}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-cyan-300">{details.eyebrow}</p>
          <Badge tone="info">Demo data</Badge>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{nav?.label}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{details.description}</p>
      </div>
      <Button variant="secondary" size="sm" className="hidden shrink-0 sm:inline-flex">
        <Bell className="h-4 w-4" />
        <span className="hidden md:inline">Notifications</span>
      </Button>
    </header>
  );
}

function MetricCard({ label, value, note, icon: Icon, change }: {
  label: string; value: string; note: string; icon: typeof Activity; change?: number;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
        </div>
        <span className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-2.5 text-cyan-300"><Icon className="h-5 w-5" /></span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        {typeof change === 'number' && <span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
          {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(change)}%
        </span>}
        <span>{note}</span>
      </div>
    </Card>
  );
}

function DataTable({ children, headers }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{headers.map((header) => <th key={header} className="whitespace-nowrap border-b border-slate-800 px-4 py-3 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">{children}</tbody>
      </table>
    </div>
  );
}

function asAiLogs(logs: LogEntry[]): AccessLog[] {
  return logs.map((log) => ({
    id: log.id,
    timestamp: log.time,
    cardUid: log.cardUid,
    roomId: log.room,
    roomNumber: log.room,
    result: log.result === 'Allowed' ? 'Allowed' : 'Denied',
    readerId: log.reader,
    ...(log.cardType === 'receptionist_master' || log.cardType === 'master' ? { cardType: log.cardType } : {}),
  }));
}

function DashboardHome({ rooms, cards, logs }: { rooms: Room[]; cards: AccessCard[]; logs: LogEntry[] }) {
  const [simulatedAnomaly, setSimulatedAnomaly] = useState<CardAnomaly | null>(null);
  const insights = useQuery({ queryKey: ['ai-insights', mockData.hotel.id], queryFn: () => aiApi.getInsights(mockData.hotel.id) });
  const topSuspiciousCard = insights.data?.suspiciousCards[0];
  const suspiciousRisk = topSuspiciousCard?.riskScore ?? 0;
  const simulation = useMutation({
    mutationFn: () => {
      const timestamp = new Date().toISOString();
      const simulatedLogs: AccessLog[] = [
        { id: 'demo-clone-1', timestamp, cardUid: mockData.demoScenario.cardUid, roomId: mockData.demoScenario.roomId, roomNumber: mockData.demoScenario.roomId, result: 'Allowed' },
        { id: 'demo-clone-2', timestamp: new Date(Date.now() + 60_000).toISOString(), cardUid: mockData.demoScenario.cardUid, roomId: mockData.demoScenario.otherRoomId, roomNumber: mockData.demoScenario.otherRoomId, result: 'Allowed' },
      ];
      return aiApi.checkAnomaly({ lockId: `LOCK-${mockData.demoScenario.roomId}`, cardUid: mockData.demoScenario.cardUid, timestamp, logs: simulatedLogs });
    },
    onSuccess: (result) => setSimulatedAnomaly({
      cardUid: mockData.demoScenario.cardUid,
      isAnomaly: result.isAnomaly,
      riskScore: result.riskScore,
      type: result.type,
      reason: result.reason,
      message: `${mockData.demoScenario.kinyarwandaMessage} - ${mockData.demoScenario.englishMessage}`,
      roomId: mockData.demoScenario.roomId,
    }),
  });
  const overview = mockData.overview;
  const roomOccupancy = Math.round((rooms.filter((room) => room.status === 'Occupied').length / Math.max(rooms.length, 1)) * 100);
  const maxTrend = Math.max(...mockData.overview.accessTrend.map((point) => point.value));
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rooms occupied" value={`${roomOccupancy}%`} note={`${overview.totalRooms} rooms in property`} icon={DoorOpen} />
        <MetricCard label="Active guest cards" value={String(cards.filter((card) => card.status === 'Active').length)} note="Currently enabled" icon={CreditCard} />
        <MetricCard label="Access events today" value={String(overview.accessEventsToday)} note={`${overview.deniedEventsToday} denied attempts`} icon={Activity} />
        <MetricCard label="Monthly revenue" value={formatCurrency(overview.monthlyRevenue)} note="Current month" icon={CircleDollarSign} change={overview.revenueChangePercent} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold text-white">Access activity</h2><p className="mt-1 text-xs text-slate-500">Door events over the last seven days</p></div>
            <Badge tone="success"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />Readers online</Badge>
          </div>
          <div className="mt-7 flex h-48 items-end gap-3 sm:gap-5">
            {mockData.overview.accessTrend.map((item) => (
              <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] text-slate-500">{item.value}</span>
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-cyan-700 to-cyan-300/90" style={{ height: `${Math.max(8, item.value / maxTrend * 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{item.day}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div><h2 className="font-semibold text-white">Property snapshot</h2><p className="mt-1 text-xs text-slate-500">{mockData.hotel.location}</p></div>
            <Building2 className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Room occupancy</span><span className="font-semibold text-white">{roomOccupancy}%</span></div>
              <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${roomOccupancy}%` }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#0A1931] p-3"><p className="text-xs text-slate-500">Total rooms</p><p className="mt-1 text-lg font-bold text-white">{overview.totalRooms}</p></div>
              <div className="rounded-xl bg-[#0A1931] p-3"><p className="text-xs text-slate-500">Denied today</p><p className="mt-1 text-lg font-bold text-rose-300">{overview.deniedEventsToday}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3">
              <BatteryCharging className="h-5 w-5 shrink-0 text-cyan-300" />
              <div><p className="text-sm font-medium text-white">Power backup ready</p><p className="text-xs text-slate-500">{mockData.electricity.backupMinutes} minutes estimated reserve</p></div>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-cyan-300" /><h2 className="font-semibold text-white">AI Insights Today</h2><Badge tone="info">Offline AI preview</Badge></div><p className="mt-1 text-xs text-slate-500">Actionable estimates from the sample access and device patterns.</p></div>
          <Link href="/ai-insights" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Explore insights <span aria-hidden="true">→</span></Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {insights.isPending ? <><Card className="h-44 animate-pulse bg-slate-900/80" /><Card className="h-44 animate-pulse bg-slate-900/80" /><Card className="h-44 animate-pulse bg-slate-900/80" /></> : <>
            <AiAlertCard title="AI savings estimate" value={`$${overview.aiSavingsEstimateUsd} this month`} description="Estimated savings potential from detected room energy patterns. Demo estimate, not a measured result." riskScore={Math.min(100, Math.round(40 + rooms.reduce((sum, room) => sum + (room.powerWasteUsdMonthly ?? 0), 0) * 0.25))} level="medium" actionLabel="View energy insights" onAction={() => { window.location.href = '/ai-insights'; }} />
            <AiAlertCard title="Suspicious cards" value={`${insights.data?.suspiciousCards.length ?? 0} patterns found`} description={topSuspiciousCard?.message ?? 'No suspicious card patterns in the sample.'} riskScore={suspiciousRisk} level={suspiciousRisk >= 85 ? 'high' : suspiciousRisk >= 65 ? 'medium' : 'low'} actionLabel="Review flagged logs" onAction={() => { window.location.href = '/logs'; }} />
            <AiAlertCard title="Battery risk" value={insights.data?.batteryRisks.length ? `${insights.data.batteryRisks[0].daysLeft} days left · Room ${insights.data.batteryRisks[0].roomId}` : 'No urgent battery risk'} description={insights.data?.batteryRisks[0]?.action ?? 'Battery levels are stable in the sample.'} riskScore={insights.data?.batteryRisks[0]?.riskScore ?? 0} level={insights.data?.batteryRisks.length ? 'high' : 'low'} actionLabel="Review battery health" onAction={() => { window.location.href = '/ai-insights'; }} />
          </>}
        </div>
        {insights.error && <p role="alert" className="mt-3 text-xs text-rose-300">Could not load preview insights: {insights.error.message}</p>}
      </section>

      <Card className="flex flex-col gap-3 border-cyan-400/10 bg-cyan-400/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-white">Try a live demo scenario</p><p className="mt-1 text-xs text-slate-500">Simulate a card used in Room 3 and another room one minute apart.</p></div>
        <Button variant="secondary" disabled={simulation.isPending} onClick={() => simulation.mutate()}><BrainCircuit className="h-4 w-4 text-cyan-300" />{simulation.isPending ? 'Analyzing…' : 'Simulate Cloned Card'}</Button>
      </Card>
      {simulation.error && <p role="alert" className="text-sm text-rose-300">Could not run simulation: {simulation.error.message}</p>}
      {simulatedAnomaly && <AiAlertCard title={`RISK ${simulatedAnomaly.riskScore}% - Possible cloned card in Room ${simulatedAnomaly.roomId}`} description={simulatedAnomaly.message} riskScore={simulatedAnomaly.riskScore} level="high" actionLabel="Deactivate card?" />}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div><h2 className="font-semibold text-white">Recent access</h2><p className="mt-1 text-xs text-slate-500">Latest activity across your readers</p></div>
          <Link href="/logs" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">View all logs <span aria-hidden="true">→</span></Link>
        </div>
        <DataTable headers={['Time', 'Room / guest', 'Reader', 'Result']}>
          {logs.slice(0, 5).map((log) => <tr key={log.id}>
            <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">{new Intl.DateTimeFormat('en-RW', { timeStyle: 'short', timeZone: mockData.hotel.timezone }).format(new Date(log.time))}</td>
            <td className="px-4 py-3.5"><p className="font-medium text-white">Room {log.room}</p><p className="mt-0.5 text-xs text-slate-500">{log.guest}</p></td>
            <td className="px-4 py-3.5 text-slate-400">{log.reader}</td>
            <td className="px-4 py-3.5"><Badge tone={statusTone(log.result)}>{log.result}</Badge></td>
          </tr>)}
        </DataTable>
      </Card>
    </div>
  );
}

function RoomsPage({ rooms, setRooms }: { rooms: Room[]; setRooms: (rooms: Room[]) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [roomNumber, setRoomNumber] = useState('');
  const [notice, setNotice] = useState('');
  const batteryRisks = predictBatteryFailure(mockData.locks);
  const filtered = rooms.filter((room) => {
    const matchesText = `${room.number} ${room.type} ${room.guest}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (filter === 'All' || room.status === filter);
  });
  function addRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = roomNumber.trim();
    if (!number || rooms.some((room) => room.number.toLowerCase() === number.toLowerCase())) {
      setNotice('Enter a unique room number.');
      return;
    }
    setRooms([...rooms, { number, type: mockData.defaults.newRoomType, floor: Number(number[0]) || 1, status: mockData.defaults.newRoomStatus, guest: '', checkOut: '' }]);
    setRoomNumber('');
    setNotice(`Room ${number} added to this preview.`);
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {(['Occupied', 'Available', 'Cleaning'] as const).map((status) => <Card key={status} className="p-4"><p className="text-sm text-slate-400">{status} rooms</p><p className="mt-2 text-2xl font-bold text-white">{rooms.filter((room) => room.status === status).length}</p></Card>)}
      </div>
      <Card className="p-4 sm:p-5">
        <form onSubmit={addRoom} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="room-number">Room number</label>
          <Input id="room-number" value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="Add a room number" />
          <Button variant="primary" type="submit"><DoorOpen className="h-4 w-4" /> Add room</Button>
        </form>
        {notice && <p role="status" className="mt-3 text-xs text-cyan-200">{notice}</p>}
      </Card>
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rooms or guests" className="pl-9" /></div>
          <div className="flex flex-wrap gap-2">{['All', 'Occupied', 'Available', 'Cleaning'].map((status) => <Button key={status} size="sm" variant={filter === status ? 'primary' : 'secondary'} onClick={() => setFilter(status)}>{status}</Button>)}</div>
        </div>
        <DataTable headers={['Room', 'Type', 'Floor', 'Guest', 'Check-out', 'Status', 'AI insight']}>
          {filtered.map((room) => <tr key={room.number}>
            <td className="px-4 py-3.5 font-semibold text-white">{room.number}</td><td className="px-4 py-3.5 text-slate-300">{room.type}</td><td className="px-4 py-3.5 text-slate-400">{room.floor}</td><td className="px-4 py-3.5 text-slate-300">{room.guest || '—'}</td><td className="px-4 py-3.5 text-slate-400">{room.checkOut ? formatDate(room.checkOut) : '—'}</td><td className="px-4 py-3.5"><Badge tone={statusTone(room.status)}>{room.status}</Badge></td><td className="px-4 py-3.5">{batteryRisks.find((risk) => risk.roomId === room.number) ? <Badge tone="danger">AI: battery {batteryRisks.find((risk) => risk.roomId === room.number)?.daysLeft} days</Badge> : <Badge tone={(room.powerWasteUsdMonthly ?? 0) >= 10 ? 'warning' : 'neutral'}>Wastes ${room.powerWasteUsdMonthly ?? 0}/mo</Badge>}</td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No rooms match your search.</td></tr>}
        </DataTable>
      </Card>
    </div>
  );
}

function CardsPage({ cards, setCards }: { cards: AccessCard[]; setCards: (cards: AccessCard[]) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const filtered = cards.filter((card) => `${card.uid} ${card.guest} ${card.room}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || card.status === filter));
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-sm text-slate-400">All cards</p><p className="mt-2 text-2xl font-bold text-white">{cards.length}</p></Card><Card className="p-4"><p className="text-sm text-slate-400">Active</p><p className="mt-2 text-2xl font-bold text-emerald-300">{cards.filter((card) => card.status === 'Active').length}</p></Card><Card className="p-4"><p className="text-sm text-slate-400">Blocked</p><p className="mt-2 text-2xl font-bold text-rose-300">{cards.filter((card) => card.status === 'Blocked').length}</p></Card></div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search UID, guest, room" className="pl-9" /></div>
          <div className="flex gap-2">{['All', 'Active', 'Blocked'].map((status) => <Button key={status} size="sm" variant={filter === status ? 'primary' : 'secondary'} onClick={() => setFilter(status)}>{status}</Button>)}</div>
        </div>
        <DataTable headers={['Card UID', 'Guest', 'Room', 'Expires', 'Status', 'Action']}>
          {filtered.map((card) => <tr key={card.uid}>
            <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-cyan-100">{card.uid}</td><td className="px-4 py-3.5 font-medium text-white">{card.guest}</td><td className="px-4 py-3.5 text-slate-300">{card.room}</td><td className="px-4 py-3.5 text-slate-400">{formatDate(card.expires)}</td><td className="px-4 py-3.5"><Badge tone={statusTone(card.status)}>{card.status}</Badge></td>
            <td className="px-4 py-3.5"><Button size="sm" variant={card.status === 'Active' ? 'danger' : 'secondary'} onClick={() => setCards(cards.map((item) => item.uid === card.uid ? { ...item, status: item.status === 'Active' ? 'Blocked' : 'Active' } : item))}>{card.status === 'Active' ? 'Block card' : 'Activate'}</Button></td>
          </tr>)}
        </DataTable>
      </Card>
    </div>
  );
}

function LogsPage({ logs }: { logs: LogEntry[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const anomalyByCard = new Map<string, CardAnomaly>();
  const groupedLogs = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const group = groupedLogs.get(log.cardUid) ?? [];
    group.push(log);
    groupedLogs.set(log.cardUid, group);
  }
  for (const group of Array.from(groupedLogs.values())) {
    const analysis = detectCardAnomaly(asAiLogs(group));
    if (analysis.isAnomaly) anomalyByCard.set(analysis.cardUid, analysis);
  }
  const filtered = logs.filter((log) => {
    const matchesText = `${log.room} ${log.guest} ${log.reader} ${log.reason}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filter === 'All' || filter === 'AI flagged' ? true : log.result === filter;
    const matchesAi = filter !== 'AI flagged' || anomalyByCard.has(log.cardUid);
    return matchesText && matchesStatus && matchesAi;
  });
  function exportCsv() {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const body = [['Time', 'Room', 'Guest', 'Reader', 'Result', 'Reason'], ...filtered.map((log) => [log.time, log.room, log.guest, log.reader, log.result, log.reason])].map((row) => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'zeno-access-logs.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-sm text-slate-400">Events today</p><p className="mt-2 text-2xl font-bold text-white">{mockData.overview.accessEventsToday}</p></Card><Card className="p-4"><p className="text-sm text-slate-400">Allowed</p><p className="mt-2 text-2xl font-bold text-emerald-300">{logs.filter((log) => log.result === 'Allowed').length}</p></Card><Card className="p-4"><p className="text-sm text-slate-400">Denied</p><p className="mt-2 text-2xl font-bold text-rose-300">{logs.filter((log) => log.result === 'Denied').length}</p></Card></div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search access activity" className="pl-9" /></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant={filter === 'All' ? 'primary' : 'secondary'} onClick={() => setFilter('All')}>All events</Button><Button size="sm" variant={filter === 'Allowed' ? 'primary' : 'secondary'} onClick={() => setFilter('Allowed')}>Allowed</Button><Button size="sm" variant={filter === 'Denied' ? 'primary' : 'secondary'} onClick={() => setFilter('Denied')}>Denied</Button><Button size="sm" variant={filter === 'AI flagged' ? 'primary' : 'secondary'} onClick={() => setFilter('AI flagged')}><BrainCircuit className="h-4 w-4" /> AI flagged only</Button><Button size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button></div>
        </div>
        <DataTable headers={['Time', 'Room / guest', 'Reader', 'Result', 'AI risk', 'Reason']}>
          {filtered.map((log) => <tr key={log.id}>
            <td className="whitespace-nowrap px-4 py-3.5 text-slate-400">{new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium', timeStyle: 'short', timeZone: mockData.hotel.timezone }).format(new Date(log.time))}</td><td className="px-4 py-3.5"><p className="font-medium text-white">Room {log.room}</p><p className="mt-0.5 text-xs text-slate-500">{log.guest}</p></td><td className="px-4 py-3.5 text-slate-300">{log.reader}</td><td className="px-4 py-3.5"><Badge tone={statusTone(log.result)}>{log.result}</Badge></td><td className="px-4 py-3.5">{anomalyByCard.has(log.cardUid) ? <Badge tone={anomalyByCard.get(log.cardUid)!.riskScore >= 85 ? 'danger' : 'warning'}>{anomalyByCard.get(log.cardUid)!.riskScore}% · {anomalyByCard.get(log.cardUid)!.type}</Badge> : <span className="text-slate-600">—</span>}</td><td className="px-4 py-3.5 text-slate-400">{log.reason}</td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No access events match your search.</td></tr>}
        </DataTable>
      </Card>
    </div>
  );
}

function ElectricityPage({ circuits, setCircuits }: { circuits: Circuit[]; setCircuits: (circuits: Circuit[]) => void }) {
  const energy = mockData.electricity;
  const maxKwh = Math.max(...energy.weeklyUsage.map((item) => item.kwh));
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Energy today" value={`${energy.todayKwh} kWh`} note="Across all circuits" icon={Zap} change={energy.usageChangePercent} />
        <MetricCard label="Estimated cost" value={formatCurrency(energy.estimatedCostRwf)} note="Today's estimated usage" icon={CircleDollarSign} />
        <MetricCard label="Backup reserve" value={`${energy.backupMinutes} min`} note="Estimated at current load" icon={BatteryCharging} />
        <MetricCard label="Active circuits" value={`${circuits.filter((circuit) => circuit.active).length}/${circuits.length}`} note="Manage circuit status below" icon={Activity} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-white">Weekly energy use</h2><p className="mt-1 text-xs text-slate-500">Daily consumption in kWh</p>
          <div className="mt-7 flex h-48 items-end gap-3 sm:gap-5">
            {energy.weeklyUsage.map((item) => <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-500">{item.kwh}</span><div className="flex w-full flex-1 items-end"><div className="w-full rounded-t-md bg-gradient-to-t from-blue-800 to-cyan-300" style={{ height: `${Math.max(8, item.kwh / maxKwh * 100)}%` }} /></div><span className="text-[10px] text-slate-500">{item.day}</span></div>)}
          </div>
        </Card>
        <Card>
          <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Building circuits</h2><p className="mt-1 text-xs text-slate-500">Demo controls change preview state only</p></div>
          <div className="divide-y divide-slate-800/80">
            {circuits.map((circuit) => <div key={circuit.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3"><span className={`rounded-xl p-2 ${circuit.active ? 'bg-cyan-400/10 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}><Zap className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{circuit.name}</p><p className="text-xs text-slate-500">{circuit.area} · {circuit.watts} W</p></div></div>
              <div className="flex items-center gap-3"><Badge tone={statusTone(circuit.active ? circuit.status : 'Standby')}>{circuit.active ? circuit.status : 'Off'}</Badge><Button size="sm" variant={circuit.active ? 'secondary' : 'primary'} onClick={() => setCircuits(circuits.map((item) => item.id === circuit.id ? { ...item, active: !item.active } : item))}>{circuit.active ? 'Turn off' : 'Turn on'}</Button></div>
            </div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BillingPage() {
  const billing = mockData.billing;
  const [notice, setNotice] = useState('');
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current subscription</p><h2 className="mt-2 text-2xl font-bold text-white">{billing.plan} plan</h2><p className="mt-1 text-sm text-slate-400">For {mockData.hotel.name}</p></div><Badge tone={statusTone(billing.status)}>{billing.status}</Badge></div>
          <div className="mt-7 flex items-end gap-2"><span className="text-3xl font-bold text-white">{formatCurrency(billing.monthlyPriceRwf)}</span><span className="pb-1 text-sm text-slate-500">/ month</span></div>
          <div className="mt-5 space-y-4 border-t border-slate-800 pt-5">
            <div className="flex justify-between gap-3 text-sm"><span className="text-slate-400">Next billing date</span><span className="text-white">{formatDate(billing.nextBillingDate)}</span></div>
            <div><div className="flex justify-between gap-3 text-sm"><span className="text-slate-400">Rooms used</span><span className="text-white">{billing.roomsUsed} of {billing.roomsIncluded}</span></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.min(100, billing.roomsUsed / billing.roomsIncluded * 100)}%` }} /></div></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-slate-400">Payment method</span><span className="text-white">{billing.paymentMethod}</span></div>
          </div>
          <Button variant="primary" className="mt-6 w-full" onClick={() => setNotice('Plan management is a preview action. No payment has been made.')}>Manage plan <ChevronDown className="h-4 w-4" /></Button>
          {notice && <p role="status" className="mt-3 text-xs text-cyan-200">{notice}</p>}
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-semibold text-white">Subscription includes</h2><p className="mt-1 text-sm text-slate-500">Tools to support your daily hotel operations.</p></div></div>
          <ul className="mt-6 space-y-4">{billing.includedFeatures.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-slate-300"><Check className="h-4 w-4 text-emerald-300" />{item}</li>)}</ul>
          <p className="mt-7 rounded-xl border border-slate-800 bg-[#0A1931] p-4 text-xs leading-5 text-slate-500">This dashboard displays sample billing information. Payment and subscription changes are not connected in this preview.</p>
        </Card>
      </div>
      <Card>
        <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Recent invoices</h2><p className="mt-1 text-xs text-slate-500">Your latest billing history</p></div>
        <DataTable headers={['Invoice', 'Date', 'Description', 'Amount', 'Status']}>
          {billing.invoices.map((invoice) => <tr key={invoice.number}><td className="px-4 py-3.5 font-medium text-cyan-200">{invoice.number}</td><td className="px-4 py-3.5 text-slate-400">{formatDate(invoice.date)}</td><td className="px-4 py-3.5 text-slate-300">{invoice.description}</td><td className="px-4 py-3.5 font-medium text-white">{formatCurrency(invoice.amountRwf)}</td><td className="px-4 py-3.5"><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge></td></tr>)}
        </DataTable>
      </Card>
    </div>
  );
}

export default function MockDashboard({ page }: { page: Page }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>(mockData.rooms);
  const [cards, setCards] = useState<AccessCard[]>(mockData.cards);
  const [circuits, setCircuits] = useState<Circuit[]>(mockData.electricity.circuits);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const currentPageLabel = useMemo(() => mockData.navigation.find((item) => item.href === (page === 'dashboard' ? '/dashboard' : `/${page}`))?.label, [page]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

    const supabase = getSupabaseBrowserClient();
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session));
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setSignOutError(`Could not check your sign-in status: ${error.message}`);
        return;
      }
      setIsAuthenticated(Boolean(data.session));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setIsSigningOut(true);
    setSignOutError('');
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) {
        setSignOutError(error.message);
        return;
      }
      setIsAuthenticated(false);
      setProfileOpen(false);
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1931] text-white lg:flex">
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,280px)] flex-col border-r border-slate-800 bg-[#09172B] transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 font-black text-[#0A1931]">Z</span>
            <span><span className="block text-sm font-bold tracking-wide">ZENO</span><span className="block text-[10px] font-semibold tracking-[0.17em] text-cyan-300">SMART ACCESS</span></span>
          </Link>
          <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900/70 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/10 bg-cyan-400/5 text-cyan-300"><Building2 className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{mockData.hotel.name}</p><p className="mt-1 truncate text-[11px] text-slate-500">{mockData.hotel.location}</p></div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          {mockData.navigation.map((item) => {
            const Icon = iconByName[item.icon as keyof typeof iconByName];
            const isActive = item.href === (page === 'dashboard' ? '/dashboard' : `/${page}`);
            return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={isActive ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-cyan-400 text-[#0A1931]' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}`}><Icon className="h-4 w-4 shrink-0" />{item.label}</Link>;
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400" />Preview environment</div><p className="mt-2 text-[11px] leading-5 text-slate-500">Changes here are local to this page session.</p></div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-[#0A1931]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400"><span className="hidden sm:inline">{mockData.hotel.name}</span><span className="hidden text-slate-700 sm:inline">/</span><span className="truncate text-white">{currentPageLabel}</span></div>
          <div className="relative">
            <Button variant="ghost" size="sm" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}>            <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400/10 text-[11px] font-bold text-cyan-200">{mockData.hotel.manager.split(' ').map((part) => part[0]).join('')}</span><span className="hidden sm:inline">{mockData.hotel.manager}</span><ChevronDown className="h-3.5 w-3.5" /></Button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-700 bg-[#102442] p-3 shadow-xl">
                <p className="text-sm font-semibold text-white">{mockData.hotel.manager}</p>
                <p className="mt-1 text-xs text-slate-500">{mockData.hotel.name}</p>
                {isAuthenticated && (
                  <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={signOut} disabled={isSigningOut}>
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                  </Button>
                )}
                {signOutError && <p role="alert" className="mt-2 text-xs text-rose-300">{signOutError}</p>}
                <Button
                  variant="secondary"
                  size="sm"
                  className={`${isAuthenticated || signOutError ? 'mt-2' : 'mt-3'} w-full`}
                  onClick={() => setProfileOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <PageHeader page={page} onMenuClick={() => setMenuOpen(true)} />
          {page === 'dashboard' && <DashboardHome rooms={rooms} cards={cards} logs={mockData.logs} />}
          {page === 'rooms' && <RoomsPage rooms={rooms} setRooms={setRooms} />}
          {page === 'cards' && <CardsPage cards={cards} setCards={setCards} />}
          {page === 'logs' && <LogsPage logs={mockData.logs} />}
          {page === 'electricity' && <ElectricityPage circuits={circuits} setCircuits={setCircuits} />}
          {page === 'billing' && <BillingPage />}
          {page === 'ai-insights' && <AiInsightsPage />}
          <footer className="mt-8 border-t border-slate-800 pt-4 text-center text-[11px] text-slate-600">ZENO TECH SOLUTION · {mockData.hotel.location} · Mock-data preview</footer>
        </main>
      </div>
    </div>
  );
}
