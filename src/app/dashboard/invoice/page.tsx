'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ZenoLogo } from '@/components/brand/ZenoLogo';
import {
  Printer,
  Download,
  Building,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export default function ClientInvoicePage() {
  const [roomCount, setRoomCount] = useState<number>(10);
  const [hotelName, setHotelName] = useState<string>('Grand Serena Hotel & Suites');
  const [clientContact, setClientContact] = useState<string>('Finance Director - Kigali, Rwanda');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-ZENO-2026-089');
  const [invoiceDate, setInvoiceDate] = useState<string>('2026-10-31');
  const [dueDate, setDueDate] = useState<string>('2026-11-15');
  const [currency, setCurrency] = useState<'USD' | 'RWF' | 'EUR'>('USD');
  const [applyTax, setApplyTax] = useState<boolean>(true);

  // Unit prices in USD
  const unitPrices = {
    controller: 45, // ESP32 + RC522 + Buck + Enclosure
    strikeLock: 38, // 12V Heavy Duty Strike
    smartCard: 2.5, // Mifare 1K card (5 per room)
    receptionReader: 85, // Desk USB RC522 Reader
    installationPerRoom: 35, // Labor & cabling
    annualSaaSPerRoom: 24, // $2/room/month
  };

  const exchangeRates = {
    USD: 1,
    RWF: 1350,
    EUR: 0.92,
  };

  const rate = exchangeRates[currency];

  const formatMoney = (amountUSD: number) => {
    const val = amountUSD * rate;
    if (currency === 'RWF') {
      return `RWF ${Math.round(val).toLocaleString()}`;
    }
    if (currency === 'EUR') {
      return `€${val.toFixed(2)}`;
    }
    return `$${val.toFixed(2)}`;
  };

  // Line items
  const items = [
    {
      description: 'ZENO ESP32 Wireless Door Controller Kits (IP65 RC522 Reader, 5V Relay, 3.3V Buck)',
      quantity: roomCount,
      unitPriceUSD: unitPrices.controller,
      category: 'Hardware',
    },
    {
      description: 'Heavy-Duty 12V Fail-Secure Electric Strike Locks (Stainless Steel Faceplate)',
      quantity: roomCount,
      unitPriceUSD: unitPrices.strikeLock,
      category: 'Hardware',
    },
    {
      description: 'Custom ZENO Branded Blue Smart Access Cards (Mifare Classic 1K, 13.56 MHz)',
      quantity: roomCount * 5, // 5 cards per room
      unitPriceUSD: unitPrices.smartCard,
      category: 'Credentials',
    },
    {
      description: 'Desk-Mounted USB RC522 Receptionist Enrollment Station',
      quantity: 1,
      unitPriceUSD: unitPrices.receptionReader,
      category: 'Hardware',
    },
    {
      description: 'On-site Turnkey Installation, Cabling, Cabinet Dressing & Lock Commissioning',
      quantity: roomCount,
      unitPriceUSD: unitPrices.installationPerRoom,
      category: 'Services',
    },
    {
      description: 'ZENO Cloud SaaS Annual Enterprise Subscription (AWS IoT Telemetry & 24/7 SLA)',
      quantity: roomCount,
      unitPriceUSD: unitPrices.annualSaaSPerRoom,
      category: 'Software',
    },
  ];

  const subtotalUSD = items.reduce((acc, item) => acc + item.quantity * item.unitPriceUSD, 0);
  const taxUSD = applyTax ? subtotalUSD * 0.18 : 0;
  const totalUSD = subtotalUSD + taxUSD;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
            Hotel Client Quotation & Invoice Generator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate customized commercial proposals and hardware procurement invoices based on room volume.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider text-slate-950 bg-zeno-teal hover:bg-teal-400 shadow-glow transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-zeno-gold" />
          <span>Quick Quote Customizer</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Number of Hotel Rooms:
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={roomCount}
              onChange={(e) => setRoomCount(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client Hotel Name:
            </label>
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Billing Currency:
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
              className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
            >
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="RWF">RWF (Frw - Rwandan Franc)</option>
              <option value="EUR">EUR (€ - Euro)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tax (18% VAT):
            </label>
            <button
              onClick={() => setApplyTax(!applyTax)}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
                applyTax
                  ? 'bg-zeno-navy text-white border-zeno-navy'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {applyTax ? '✓ 18% VAT Applied' : 'Tax Exempt / 0% VAT'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE OFFICIAL INVOICE SHEET */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-slate-900 max-w-4xl mx-auto">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-8 gap-6">
          <div>
            <ZenoLogo variant="light" size="md" showText={true} />
            <div className="mt-4 text-xs text-slate-500 leading-relaxed">
              <strong>ZENO TECH SOLUTION LTD</strong><br />
              Smart Access & IoT Security Division<br />
              Kigali Heights, 4th Floor, KG 7 Ave, Kigali, Rwanda<br />
              TIN: 109283746 • contact@zenotech.rw • +250 788 123 456
            </div>
          </div>

          <div className="sm:text-right">
            <div className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-xs font-black tracking-widest uppercase mb-2">
              COMMERCIAL INVOICE
            </div>
            <div className="font-mono text-sm font-bold text-slate-700">{invoiceNumber}</div>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <div>Issue Date: <strong>{invoiceDate}</strong></div>
              <div>Due Date: <strong>{dueDate}</strong></div>
            </div>
          </div>
        </div>

        {/* Bill To & Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          <div>
            <div className="font-bold uppercase tracking-wider text-slate-400 mb-1">
              Billed To (Client):
            </div>
            <div className="font-heading font-black text-base text-slate-900">{hotelName}</div>
            <div className="text-slate-600 mt-0.5">{clientContact}</div>
            <div className="text-slate-500 mt-1">Scope: Full Smart Access Deployment ({roomCount} Rooms)</div>
          </div>

          <div className="sm:text-right">
            <div className="font-bold uppercase tracking-wider text-slate-400 mb-1">
              Payment Terms:
            </div>
            <div className="text-slate-700">Bank Wire Transfer (Swift / RWF Domestic)</div>
            <div className="text-slate-500 mt-0.5">50% Advance on signing, 50% upon final lock handover</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">Total ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-3 font-medium text-slate-800 max-w-sm">
                    {item.description}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                    {formatMoney(item.unitPriceUSD)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatMoney(item.quantity * item.unitPriceUSD)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="text-xs text-slate-500 max-w-xs space-y-1">
            <div className="font-bold text-slate-700">Hardware Warranty:</div>
            <p>
              24-Month Comprehensive Hardware Replacement warranty on all ESP32 nodes, RC522 readers, and electric strike locks.
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">{formatMoney(subtotalUSD)}</span>
            </div>

            {applyTax && (
              <div className="flex justify-between text-slate-600">
                <span>VAT (18%):</span>
                <span className="font-mono text-slate-900">{formatMoney(taxUSD)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-heading font-black text-slate-900 pt-2 border-t border-slate-300">
              <span>Grand Total:</span>
              <span className="font-mono text-zeno-navy">{formatMoney(totalUSD)}</span>
            </div>
          </div>
        </div>

        {/* Signatures & Seal */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="text-slate-400 font-semibold mb-8">Authorized Signatory (ZENO TECH SOLUTION):</div>
            <div className="font-heading font-black text-slate-900">Eng. Emmanuel Habimana</div>
            <div className="text-slate-500">Lead IoT Systems Architect</div>
          </div>

          <div className="text-right">
            <div className="text-slate-400 font-semibold mb-8">Client Acceptance (Authorized Hotel Rep):</div>
            <div className="h-6 border-b border-dashed border-slate-300 inline-block w-48" />
            <div className="text-slate-500 mt-1">Date & Signature</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
