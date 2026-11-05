'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { store } from '@/lib/storage';
import { Hotel } from '@/types';
import {
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export const TrialBanner: React.FC = () => {
  const [hotel, setHotel] = useState<Hotel>(store.getCurrentHotel());
  const [timeLeft, setTimeLeft] = useState(store.getRemainingTrialTime());

  useEffect(() => {
    const update = () => {
      setHotel(store.getCurrentHotel());
      setTimeLeft(store.getRemainingTrialTime());
    };
    update();
    const unsub = store.subscribe(update);
    const interval = setInterval(update, 60000); // refresh every minute
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // If subscription is active, show sleek active badge or hide
  if (hotel.subscriptionStatus === 'active') {
    return (
      <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-2xl flex items-center justify-between text-xs mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            <strong>{hotel.plan.toUpperCase()} LICENSE ACTIVE:</strong> All ESP32 door controllers & lock features unlocked (Max {hotel.maxRooms} Rooms).
          </span>
        </div>
        <Link
          href="/billing"
          className="font-bold hover:underline text-emerald-200 text-[11px]"
        >
          Manage Subscription →
        </Link>
      </div>
    );
  }

  // If expired or canceled, show urgent red alert banner
  if (timeLeft.isExpired || hotel.subscriptionStatus === 'canceled' || hotel.subscriptionStatus === 'past_due') {
    return (
      <div className="bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 border-2 border-rose-500 text-white px-5 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-6 shadow-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/30 text-rose-300 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-heading font-black text-sm text-white">
              SUBSCRIPTION EXPIRED — HARDWARE & ENROLLMENT RESTRICTED
            </div>
            <div className="text-[11px] text-rose-200 mt-0.5">
              Your free trial has ended. Door strikes cannot be actuated and new cards cannot be enrolled.
            </div>
          </div>
        </div>

        <Link
          href="/billing?expired=true"
          className="px-4 py-2 rounded-xl font-heading font-black text-xs uppercase tracking-wider bg-white hover:bg-rose-50 text-rose-950 transition-colors shadow-md text-center shrink-0"
        >
          Upgrade Subscription Now
        </Link>
      </div>
    );
  }

  // Standard Trialing Banner with live countdown
  return (
    <div className="bg-gradient-to-r from-[#0F1D5E] via-slate-900 to-[#0F1D5E] border border-amber-500/40 text-white px-5 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-6 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 animate-spin-slow" />
        </div>
        <div>
          <div className="font-heading font-black text-sm text-amber-300 flex items-center gap-2">
            <span>Trial ends in {timeLeft.days} days, {timeLeft.hours}h {timeLeft.minutes}m</span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.2 rounded border border-amber-400/30 font-mono">
              2 Rooms Max
            </span>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5">
            You are on the free trial. Upgrade to unlock unlimited rooms, multi-role staff, and 24/7 SLA.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <Link
          href="/billing"
          className="px-4 py-2 rounded-xl font-heading font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Upgrade Plan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
