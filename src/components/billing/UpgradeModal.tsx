'use client';

import React from 'react';
import Link from 'next/link';
import {
  Lock,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Building,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  maxRooms: number;
  reason?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  maxRooms,
  reason,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-500 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Room Limit Enforced ({currentCount}/{maxRooms} Rooms)</span>
        </div>

        <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white">
          Upgrade Required to Add More Rooms
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          {reason || `You have reached the maximum room capacity allowed by your current plan (${maxRooms} rooms). Upgrade to Starter ($20/mo, 10 rooms) or Pro ($50/mo, 50 rooms) to unlock more doors.`}
        </p>

        {/* Plan comparison mini-box */}
        <div className="my-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold">
            <span className="text-slate-700 dark:text-slate-300">Starter Plan:</span>
            <span className="text-zeno-teal">$20/mo (Up to 10 Rooms)</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span className="text-slate-700 dark:text-slate-300">Pro Enterprise:</span>
            <span className="text-amber-500">$50/mo (Up to 50 Rooms)</span>
          </div>
        </div>

        <div className="space-y-2">
          <Link
            href="/billing"
            className="w-full py-3.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-zeno-teal to-teal-400 hover:from-teal-300 hover:to-teal-500 shadow-glow transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Go to Billing & Upgrade Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
