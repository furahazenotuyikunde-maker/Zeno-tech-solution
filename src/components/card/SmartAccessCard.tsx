'use client';

import React, { useState } from 'react';
import { ZenoLogo } from '../brand/ZenoLogo';
import { Wifi, QrCode, Sparkles, Printer, RotateCw, CheckCircle2 } from 'lucide-react';

interface SmartAccessCardProps {
  guestName?: string;
  roomNumber?: string;
  cardUid?: string;
  validUntil?: string;
  vipStatus?: boolean;
  interactive?: boolean;
  className?: string;
  onTap?: () => void;
}

export const SmartAccessCard: React.FC<SmartAccessCardProps> = ({
  guestName = 'JOHN SMITH',
  roomNumber = '204',
  cardUid = 'G-10247',
  validUntil = '2026-11-04',
  vipStatus = true,
  interactive = true,
  className = '',
  onTap,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [tapped, setTapped] = useState(false);

  const handleCardClick = () => {
    if (onTap) {
      setTapped(true);
      setTimeout(() => setTapped(false), 800);
      onTap();
    }
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Perspective Card Wrapper */}
      <div
        className="w-[380px] sm:w-[420px] h-[245px] sm:h-[265px] transition-transform duration-700 ease-out preserve-3d cursor-pointer"
        style={{
          perspective: '1200px',
        }}
        onClick={handleCardClick}
      >
        <div
          className={`relative w-full h-full rounded-2xl shadow-2xl transition-all duration-700 [transform-style:preserve-3d] ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          } ${tapped ? 'scale-105 shadow-glow ring-4 ring-zeno-teal' : ''}`}
        >
          {/* ===================== FRONT SIDE ===================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-[#0F1D5E] border border-cyan-500/20 shadow-2xl text-white [backface-visibility:hidden] flex flex-col justify-between"
            style={{
              background: 'radial-gradient(circle at 85% 15%, #182B8A 0%, #0F1D5E 65%, #080F33 100%)',
            }}
          >
            {/* Holographic circuit overlay watermark */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#14B8A6 1px, transparent 1px), radial-gradient(#D4A017 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px',
              }}
            />

            {/* Subtle light sheen */}
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -rotate-45 pointer-events-none" />

            {/* TOP BAR: Z Logo Left | SMART ACCESS CARD Right */}
            <div className="relative z-10 px-6 pt-5 pb-2 flex items-center justify-between">
              {/* Left: House Circuit Logo */}
              <div className="flex items-center gap-2">
                <ZenoLogo variant="dark" size="sm" showText={false} />
                <div className="flex flex-col">
                  <span className="font-heading font-black text-xs tracking-wider text-white">
                    ZENO
                  </span>
                  <span className="text-[8px] font-bold tracking-widest text-zeno-teal uppercase">
                    SYSTEMS
                  </span>
                </div>
              </div>

              {/* Right: SMART ACCESS CARD + RFID ENABLED */}
              <div className="text-right">
                <div className="font-heading font-black text-sm sm:text-base tracking-wide text-white uppercase drop-shadow-sm">
                  SMART ACCESS CARD
                </div>
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-[#7DD3FC] tracking-wider mt-0.5">
                  {/* Microchip Icon */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7DD3FC" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
                  </svg>
                  <span>RFID ENABLED</span>
                  {vipStatus && (
                    <span className="ml-1 bg-zeno-gold/20 text-zeno-gold text-[8px] px-1.5 py-0.2 rounded border border-zeno-gold/40">
                      VIP
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* MIDDLE: Physical EMV Contact Chip & Cardholder Info */}
            <div className="relative z-10 px-6 py-2 flex items-center justify-between">
              {/* Golden Metallic Smart Chip */}
              <div className="relative w-12 h-9 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-300 shadow-md overflow-hidden flex flex-col justify-around p-1 shrink-0">
                <div className="w-full h-[1px] bg-amber-800/40" />
                <div className="w-full h-[1px] bg-amber-800/40" />
                <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-800/40" />
                <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-800/40" />
                <div className="w-2 h-2 rounded-full border border-amber-900/40 mx-auto" />
              </div>

              {/* Contactless waves near chip */}
              <div className="text-slate-400 opacity-60">
                <Wifi className="w-5 h-5 rotate-90" />
              </div>

              {/* Guest & Room Details */}
              <div className="flex-1 ml-6 space-y-1.5">
                <div className="flex items-baseline justify-between border-b border-cyan-500/20 pb-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                    Guest Name:
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-wide truncate max-w-[170px]">
                    {guestName.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-b border-cyan-500/20 pb-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                    Room Number:
                  </span>
                  <span className="font-heading font-black text-sm sm:text-base text-zeno-teal">
                    ROOM {roomNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span>UID: <strong className="text-cyan-300 font-mono">{cardUid}</strong></span>
                  <span>EXP: <strong className="text-slate-300">{validUntil}</strong></span>
                </div>
              </div>
            </div>

            {/* BOTTOM: Solid Gold Accent Stripe + Wave Icon & Brand Footer */}
            <div className="relative z-10 w-full mt-auto">
              {/* Gold Stripe */}
              <div className="w-full h-3 bg-gradient-to-r from-[#D4A017] via-[#EAB308] to-[#D4A017] flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900/40" />
                </div>
                {/* RFID wave icon on gold stripe */}
                <div className="flex items-center gap-1 text-slate-900">
                  <span className="text-[8px] font-black tracking-widest uppercase">Mifare 1K</span>
                  <Wifi className="w-3.5 h-3.5 rotate-90 stroke-[2.5]" />
                </div>
              </div>

              {/* Dark Navy Footer */}
              <div className="bg-[#090E2D] px-6 py-2 flex items-center justify-between text-[9px] text-slate-300 font-medium">
                <span>ZENO TECH SOLUTION • Smart Access Systems</span>
                <span className="text-zeno-teal font-mono">13.56 MHz</span>
              </div>
            </div>
          </div>

          {/* ===================== BACK SIDE ===================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-[#0A1238] border border-cyan-500/20 shadow-2xl text-white [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between"
          >
            {/* Magnetic Stripe */}
            <div className="w-full h-11 bg-black mt-4 shadow-inner flex items-center justify-end px-6">
              <span className="text-[7px] font-mono text-zinc-600 tracking-widest">
                ISO/IEC 7810 ID-1 • HIGH COERCIVITY 4000 Oe
              </span>
            </div>

            {/* Back Middle Section: Digital QR Key + Terms */}
            <div className="px-6 py-3 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="text-[9px] font-bold text-zeno-teal uppercase tracking-wider">
                  Digital Backup Access
                </div>
                <p className="text-[8px] text-slate-300 leading-relaxed">
                  If card fails, scan this QR code at door reader optical scanner or present at front desk. Non-transferable.
                </p>
                <div className="text-[8px] font-mono text-slate-400">
                  TOKEN: <span className="text-white">AUTH-{cardUid}-SEC</span>
                </div>
                <div className="text-[8px] text-zeno-gold font-semibold pt-1">
                  HOTEL RECEPTION: +250 788 000 111 (24/7)
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-2 rounded-lg shadow-md shrink-0 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-950 p-1 rounded flex items-center justify-center">
                  {/* High visual fidelity QR SVG */}
                  <svg width="56" height="56" viewBox="0 0 28 28" fill="white">
                    <rect x="2" y="2" width="8" height="8" fill="none" stroke="white" strokeWidth="2" />
                    <rect x="4" y="4" width="4" height="4" fill="white" />
                    <rect x="18" y="2" width="8" height="8" fill="none" stroke="white" strokeWidth="2" />
                    <rect x="20" y="4" width="4" height="4" fill="white" />
                    <rect x="2" y="18" width="8" height="8" fill="none" stroke="white" strokeWidth="2" />
                    <rect x="4" y="20" width="4" height="4" fill="white" />
                    <rect x="12" y="3" width="2" height="6" fill="white" />
                    <rect x="12" y="12" width="4" height="4" fill="white" />
                    <rect x="3" y="12" width="6" height="2" fill="white" />
                    <rect x="18" y="14" width="6" height="2" fill="white" />
                    <rect x="14" y="20" width="3" height="5" fill="white" />
                    <rect x="20" y="20" width="5" height="5" fill="white" />
                  </svg>
                </div>
                <span className="text-[7px] text-slate-800 font-bold mt-0.5">ROOM KEY</span>
              </div>
            </div>

            {/* Barcode & Footer */}
            <div className="px-6 pb-4">
              {/* Simulated Barcode */}
              <div className="w-full h-6 bg-white/90 rounded flex items-center justify-between px-3 overflow-hidden">
                <div className="w-full flex items-center justify-center gap-[2px] h-4">
                  {[3, 1, 4, 1, 2, 5, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3].map((w, i) => (
                    <div
                      key={i}
                      className="h-full bg-slate-900"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center text-[7px] text-slate-400 mt-1">
                <span>PATENT PENDING • ZENO TECH IOT FIRMWARE V2.4</span>
                <span className="font-mono">SN: 8849-0192-KGL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls underneath card */}
      {interactive && (
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setFlipped(!flipped)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            {flipped ? 'View Front Side' : 'Flip to QR Backup'}
          </button>

          {onTap && (
            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zeno-teal text-white hover:bg-teal-600 transition-colors shadow-sm"
            >
              <Wifi className="w-3.5 h-3.5 rotate-90" />
              Simulate Tap on Reader
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Card Pass
          </button>
        </div>
      )}
    </div>
  );
};
