'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  X,
  CreditCard,
  Phone,
  Clock,
  Lock,
  ShieldX,
  Bell,
  Zap,
} from 'lucide-react';
import { store } from '@/lib/storage';
import { computeSubscriptionInfo } from '@/lib/subscription';

const OWNER_PHONE = '0790723406';
const OWNER_EMAIL = 'tuyikundefzeno@gmail.com';
const STARTER_USD = 20;
const PRO_USD = 50;

/** Dismiss key stored in localStorage so popups don't spam on every click */
const POPUP_DISMISS_KEY = 'zeno_popup_dismissed_at';
const DISMISS_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between "remind later"

function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const ts = parseInt(localStorage.getItem(POPUP_DISMISS_KEY) ?? '0', 10);
    return Date.now() - ts < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(POPUP_DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function clearDismissed() {
  try {
    localStorage.removeItem(POPUP_DISMISS_KEY);
  } catch {
    // ignore
  }
}

/**
 * PaymentReminderPopup
 *
 * Automatically shown on every dashboard load based on subscription state:
 *
 * • trialing + ≤ 3 days → Yellow warning, closeable after 5 s
 * • trialing + ≤ 1 day  → Red critical, blurs background, closeable after 5 s
 * • expired             → Full-screen SERVICE BLOCKED, NO close button
 *
 * Uses localStorage to avoid spamming (respects 4-hour cooldown for dismissal)
 * but always shows at least once per login.
 *
 * Owner: tuyikundefzeno@gmail.com | +250 790 723 406
 */
export function PaymentReminderPopup() {
  const router = useRouter();
  const [hotel, setHotel] = useState(() => store.getCurrentHotel());
  const [rwfRate, setRwfRate] = useState<number>(1400);
  const [visible, setVisible] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to store updates
  useEffect(() => {
    const unsub = store.subscribe(() => setHotel(store.getCurrentHotel()));
    return unsub;
  }, []);

  // Fetch live RWF rate
  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.rate === 'number') setRwfRate(d.rate);
      })
      .catch(() => {});
  }, []);

  const subInfo = computeSubscriptionInfo(
    hotel.subscriptionStatus,
    hotel.trialEndsAt
  );

  // Decide whether to show popup
  useEffect(() => {
    if (subInfo.isActive) {
      setVisible(false);
      return;
    }

    const shouldShow =
      subInfo.isExpired ||       // always show if expired (no bypass)
      subInfo.isCritical ||      // ≤ 1 day
      (subInfo.isWarning && !wasDismissedRecently()); // ≤ 3 days but respect cooldown

    if (shouldShow) {
      setVisible(true);
      setCanClose(false);
      setCloseCountdown(5);

      // After 5 seconds, allow closing (except for fully expired = no close ever)
      if (!subInfo.isExpired) {
        countdownRef.current = setInterval(() => {
          setCloseCountdown((c) => {
            if (c <= 1) {
              clearInterval(countdownRef.current!);
              setCanClose(true);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }
    } else {
      setVisible(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [subInfo.isActive, subInfo.isExpired, subInfo.isWarning, subInfo.isCritical]);

  const handleDismiss = useCallback(() => {
    if (subInfo.isExpired) return; // Cannot dismiss expired
    markDismissed();
    setVisible(false);
  }, [subInfo.isExpired]);

  const handlePayNow = useCallback(() => {
    clearDismissed();
    router.push('/billing');
  }, [router]);

  if (!visible) return null;

  const rwfStarterFormatted = `${Math.round(STARTER_USD * rwfRate).toLocaleString()} RWF`;
  const rwfProFormatted = `${Math.round(PRO_USD * rwfRate).toLocaleString()} RWF`;

  // ── EXPIRED: Full-screen block ────────────────────────────────────────────
  if (subInfo.isExpired) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        aria-label="Service blocked"
      >
        <div className="max-w-lg w-full bg-gradient-to-b from-red-950 to-slate-950 border-2 border-red-500 rounded-3xl shadow-2xl p-8 text-white text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
              <ShieldX className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest border border-red-500/50 mb-3">
              <Lock className="w-3 h-3" />
              SERVICE BLOCKED
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              No Payment Detected
            </h2>
            <p className="text-red-300 text-sm mt-2 leading-relaxed">
              Your subscription expired{' '}
              <strong>{subInfo.expiredSinceDays} day(s) ago</strong>.
              All guest cards have stopped working. Door controllers are locked.
            </p>
          </div>

          {/* Expired timer */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm">
            <div className="text-red-400 font-bold text-xs uppercase tracking-wider mb-1">
              Service stopped
            </div>
            <div className="text-2xl font-black text-red-300">
              {subInfo.expiredSinceDays} day{subInfo.expiredSinceDays !== 1 ? 's' : ''} ago
            </div>
            <div className="text-xs text-red-400/80 mt-1">
              Every hour without payment = more guest complaints
            </div>
          </div>

          {/* Pricing with live RWF */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left">
              <div className="font-black text-white">Starter Plan</div>
              <div className="text-zeno-teal font-mono font-bold text-base">${STARTER_USD}/mo</div>
              <div className="text-slate-400 font-mono text-[10px]">≈ {rwfStarterFormatted}</div>
              <div className="text-slate-400 text-[10px] mt-1">Up to 10 rooms</div>
            </div>
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 text-left">
              <div className="font-black text-white">Pro Plan</div>
              <div className="text-teal-300 font-mono font-bold text-base">${PRO_USD}/mo</div>
              <div className="text-slate-400 font-mono text-[10px]">≈ {rwfProFormatted}</div>
              <div className="text-slate-400 text-[10px] mt-1">Up to 50 rooms</div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handlePayNow}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-slate-950 bg-gradient-to-r from-red-400 via-rose-400 to-red-500 hover:from-red-300 hover:to-rose-400 shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Pay Now to Restore Doors
          </button>

          {/* Contact */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <a href={`tel:${OWNER_PHONE}`} className="flex items-center gap-1 hover:text-white">
              <Phone className="w-3 h-3" />
              {OWNER_PHONE}
            </a>
            <span>·</span>
            <a href={`mailto:${OWNER_EMAIL}`} className="hover:text-white">
              {OWNER_EMAIL}
            </a>
          </div>

          <p className="text-[10px] text-slate-600">
            This screen cannot be closed without payment. It is enforced by ZENO TECH SOLUTION.
          </p>
        </div>
      </div>
    );
  }

  // ── CRITICAL: ≤ 1 day — red overlay, blurs dashboard behind ──────────────
  if (subInfo.isCritical) {
    return (
      <div
        className="fixed inset-0 z-[9998] bg-red-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="max-w-md w-full bg-gradient-to-b from-red-900 to-slate-900 border-2 border-red-400 rounded-3xl shadow-2xl p-7 text-white space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/30 border border-red-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-300 animate-bounce" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  Critical Warning
                </div>
                <h2 className="text-lg font-black text-white leading-tight">
                  1 Day Left!
                </h2>
              </div>
            </div>
            {canClose ? (
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-red-400">
                {closeCountdown}s
              </div>
            )}
          </div>

          <p className="text-sm text-red-200 leading-relaxed">
            After tomorrow, <strong>all guest RFID cards will stop working</strong> and
            doors will lock. Pay now to avoid service interruption.
          </p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <div className="text-xs text-red-400 uppercase font-bold">Trial expires in</div>
            <div className="text-3xl font-black text-white mt-1">
              {subInfo.hoursLeft}h {subInfo.minutesLeft}m
            </div>
          </div>

          {/* Pricing */}
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span>Starter (10 rooms)</span>
              <span className="font-mono font-bold text-teal-300">${STARTER_USD} ≈ {rwfStarterFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Pro (50 rooms)</span>
              <span className="font-mono font-bold text-teal-300">${PRO_USD} ≈ {rwfProFormatted}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handlePayNow}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 bg-red-400 hover:bg-red-300 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Pay Now – Restore Instantly
            </button>
            {canClose && (
              <button
                onClick={handleDismiss}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Remind me later (4 hrs)
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <Phone className="w-3 h-3" />
            <span>Fast activation: {OWNER_PHONE}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── WARNING: ≤ 3 days — yellow, dismissable after 5 s ────────────────────
  return (
    <div
      className="fixed bottom-6 right-6 z-[9997] max-w-sm w-full animate-in slide-in-from-bottom-4 duration-300"
      role="alert"
    >
      <div className="bg-amber-50 dark:bg-amber-950/90 border-2 border-amber-400 rounded-2xl shadow-2xl p-5 text-slate-900 dark:text-white space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-ring" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Trial Reminder
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {subInfo.daysLeft} day{subInfo.daysLeft !== 1 ? 's' : ''} left
              </h3>
            </div>
          </div>
          {canClose ? (
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-lg bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-amber-800 dark:text-amber-200" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-amber-200/50 flex items-center justify-center text-[10px] font-bold text-amber-700">
              {closeCountdown}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-700 dark:text-amber-200 leading-relaxed">
          Trial ends in <strong>{subInfo.daysLeft}d {subInfo.hoursLeft}h</strong>.
          Pay <strong>${STARTER_USD}</strong> to keep doors working.
          Rooms will <strong>lock</strong> after trial.
        </p>

        <div className="text-[11px] text-slate-500 dark:text-amber-400/70 font-mono">
          Starter: ≈ {rwfStarterFormatted} &nbsp;·&nbsp; Pro: ≈ {rwfProFormatted}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePayNow}
            className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Pay $20
          </button>
          {canClose && (
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 transition-colors"
            >
              Later
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Contact: {OWNER_PHONE} · {OWNER_EMAIL}</span>
        </div>
      </div>
    </div>
  );
}
