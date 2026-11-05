'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { store } from '@/lib/storage';
import { sound } from '@/lib/sound';
import { CardItem } from '@/types';
import { SmartAccessCard } from '@/components/card/SmartAccessCard';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye,
  X,
  Layers,
  Radio,
} from 'lucide-react';

export default function CardsInventoryPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unassigned' | 'lost' | 'blocked'>('all');
  const [previewCard, setPreviewCard] = useState<CardItem | null>(null);

  useEffect(() => {
    const update = () => setCards(store.getCards());
    update();
    const unsub = store.subscribe(update);
    return unsub;
  }, []);

  const totalCards = cards.length;
  const activeCards = cards.filter((c) => c.status === 'active').length;
  const blankStock = cards.filter((c) => c.status === 'unassigned').length;
  const lostCards = cards.filter((c) => c.status === 'lost' || c.status === 'blocked').length;

  const handleBatchGenerate = () => {
    sound.playBeep();
    const batchId = `BATCH-${new Date().getFullYear()}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const newCards: CardItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: `c-${Date.now()}-${i}`,
      uid: store.generateMifareUid(),
      type: 'Mifare Classic 1K',
      status: 'unassigned',
      batchNumber: batchId,
      lastRead: 'Stock Provisioned',
    }));

    // Update store state by appending new cards
    newCards.forEach((c) => {
      store.getCards().push(c);
    });
    setCards([...store.getCards()]);
    alert(`Provisioned 5 Blank Mifare Classic 1K cards in batch ${batchId}!`);
  };

  const handleStatusChange = (cardId: string, newStatus: CardItem['status']) => {
    sound.playRelayClick();
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;
    target.status = newStatus;
    if (newStatus === 'lost' || newStatus === 'blocked') {
      target.assignedGuest = `Revoked (${newStatus.toUpperCase()})`;
    }
    setCards([...cards]);
  };

  const handleTestCardTap = (card: CardItem) => {
    if (card.status === 'lost' || card.status === 'blocked') {
      sound.playError();
      store.addLog({
        roomId: 'r-204',
        roomNumber: '204',
        cardUid: card.uid,
        guestName: card.assignedGuest || 'Blocked Card',
        status: 'FAILED',
        reason: `Card UID ${card.uid} is marked ${card.status.toUpperCase()} in inventory database`,
        source: 'RFID',
      });
      alert(`Tap FAILED: Card ${card.uid} is ${card.status.toUpperCase()}! Access was denied.`);
    } else {
      sound.playBeep();
      setTimeout(() => sound.playDoorUnlock(), 200);
      store.addLog({
        roomId: 'r-204',
        roomNumber: '204',
        cardUid: card.uid,
        guestName: card.assignedGuest || 'Stock Verification Test',
        status: 'UNLOCKED',
        reason: 'Technician bench reader test OK',
        source: 'RFID',
      });
      alert(`Card ${card.uid} tested: Transponder 13.56MHz active. Sector 0 readable.`);
    }
  };

  const filteredCards = cards.filter((card) => {
    const matchStatus = statusFilter === 'all' ? true : card.status === statusFilter;
    const matchSearch =
      card.uid.toLowerCase().includes(search.toLowerCase()) ||
      card.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      (card.assignedGuest && card.assignedGuest.toLowerCase().includes(search.toLowerCase())) ||
      (card.assignedRoom && card.assignedRoom.includes(search));
    return matchStatus && matchSearch;
  });

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
            RFID Smart Cards Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage blank Mifare Classic 1K physical stock, trace issued cards, and blacklist lost credentials.
          </p>
        </div>

        <button
          onClick={handleBatchGenerate}
          className="px-4 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider text-white bg-zeno-navy hover:bg-slate-900 border border-teal-500/30 transition-all shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-zeno-teal" />
          <span>Provision 5 Blank Cards</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Total Cards</div>
            <div className="text-3xl font-heading font-black text-slate-900 dark:text-white mt-1">
              {totalCards}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Physical credentials in pool</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Active In Use</div>
            <div className="text-3xl font-heading font-black text-zeno-teal mt-1">
              {activeCards}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Carried by checked-in guests</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-zeno-teal flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Blank Stock</div>
            <div className="text-3xl font-heading font-black text-blue-600 mt-1">
              {blankStock}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Ready for reception desk</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Lost / Blocked</div>
            <div className="text-3xl font-heading font-black text-rose-600 mt-1">
              {lostCards}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Access revoked from ESP32 locks</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          {(['all', 'active', 'unassigned', 'lost', 'blocked'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg capitalize ${
                statusFilter === st ? 'bg-white dark:bg-slate-900 text-zeno-teal shadow-sm' : 'text-slate-500'
              }`}
            >
              {st === 'unassigned' ? 'Blank Stock' : st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search card UID, guest, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
          />
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Card UID</th>
                <th className="py-3 px-4">Hardware Chip Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Guest</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCards.map((card) => (
                <tr
                  key={card.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    <span className="px-2 py-0.5 rounded bg-zeno-navy text-white text-[11px]">
                      {card.uid}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    <div className="font-semibold">{card.type}</div>
                    <div className="text-[10px] text-slate-400">13.56 MHz ISO 14443A</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        card.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : card.status === 'unassigned'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : card.status === 'lost'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {card.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {card.assignedGuest || <span className="text-slate-400 italic">None (Unassigned)</span>}
                  </td>

                  <td className="py-3.5 px-4 font-heading font-black text-xs text-zeno-teal">
                    {card.assignedRoom ? `Room ${card.assignedRoom}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {card.batchNumber}
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => setPreviewCard(card)}
                      title="Inspect ZENO Card Specimen"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleTestCardTap(card)}
                      title="Simulate Card Tap on Reader"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-zeno-teal transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </button>

                    {card.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(card.id, 'lost')}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                      >
                        Mark Lost
                      </button>
                    )}

                    {(card.status === 'lost' || card.status === 'blocked') && (
                      <button
                        onClick={() => handleStatusChange(card.id, 'unassigned')}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors"
                      >
                        Re-enable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Specimen Inspection Modal */}
      {previewCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col items-center">
            <button
              onClick={() => setPreviewCard(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white mb-1">
              ZENO Physical Smart Card Specimen
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              UID: {previewCard.uid} • Batch: {previewCard.batchNumber}
            </p>

            <SmartAccessCard
              guestName={previewCard.assignedGuest || 'HOTEL GUEST'}
              roomNumber={previewCard.assignedRoom || 'STOCK'}
              cardUid={previewCard.uid}
              validUntil="2026-12-31"
              interactive={true}
            />

            <button
              onClick={() => setPreviewCard(null)}
              className="mt-6 px-6 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              Close Specimen
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
