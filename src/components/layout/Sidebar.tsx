'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ZenoLogo } from '../brand/ZenoLogo';
import { store } from '@/lib/storage';
import { translations } from '@/lib/i18n';
import { UserRole, Language } from '@/types';
import {
  LayoutDashboard,
  Users,
  DoorClosed,
  History,
  Cpu,
  Receipt,
  Shield,
  ShieldCheck,
  Languages,
  Building2,
  ChevronDown,
  ExternalLink,
  Download,
} from 'lucide-react';

interface SidebarProps {
  currentRole: UserRole | null;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
  hotelName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  currentLang,
  onLangChange,
  hotelName,
}) => {
  const pathname = usePathname();
  const t = translations[currentLang] || translations.en;
  const navItems = [
    { href: '/dashboard', label: t.dashboard, icon: LayoutDashboard, roles: ['manager', 'receptionist', 'electrician'] },
    { href: '/dashboard/rooms', label: t.rooms, icon: DoorClosed, roles: ['manager'] },
    { href: '/dashboard/logs', label: t.logs, icon: History, roles: ['manager', 'receptionist', 'electrician'] },
    { href: '/dashboard/hardware', label: 'Hardware', icon: Cpu, roles: ['manager', 'electrician'] },
    { href: '/dashboard/users', label: 'Team', icon: Users, roles: ['manager'] },
    { href: '/dashboard/master-cards', label: 'Master cards', icon: ShieldCheck, roles: ['manager'] },
    { href: '/dashboard/billing', label: 'Billing', icon: Receipt, roles: ['manager'] },
  ];

  const visibleNav = navItems.filter((item) => currentRole && item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-[#0A1931] text-white flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-slate-800/80 shadow-2xl z-30 select-none">
      {/* Top Header & Brand */}
      <div>
        <div className="p-5 border-b border-slate-800/80">
          <Link href="/" className="block">
            <ZenoLogo variant="dark" size="sm" showText={true} />
          </Link>

          {/* Hotel Property Switcher */}
          <div className="mt-4 p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="w-4 h-4 text-[#00D4FF] shrink-0" />
              <div className="truncate">
                <div className="text-xs font-bold truncate text-slate-100">{hotelName}</div>
                <div className="text-[10px] text-slate-400 font-mono">Rwanda · Smart Access</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-zeno-teal to-teal-500 text-slate-950 shadow-glow font-black'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Language, Role Switcher, Marketing Link */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0A1238]">
        {/* Language Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
            <Languages className="w-3.5 h-3.5 text-zeno-teal" />
            <span>Language:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
            {(['en', 'sw', 'fr', 'rw'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onLangChange(lang)}
                className={`px-1.5 py-0.5 rounded uppercase ${
                  currentLang === lang ? 'bg-zeno-teal text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Current Role:
            </span>
            <span className="text-zeno-teal font-mono capitalize">{currentRole || 'loading'}</span>
          </div>
        </div>

        {/* Public Landing Link & PWA install */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <Link href="/" className="hover:text-zeno-teal flex items-center gap-1 transition-colors">
            <ExternalLink className="w-3 h-3" />
            <span>Public Site</span>
          </Link>
          <button
            onClick={() => alert('ZENO TECH PWA is offline-ready and ready for Android/iPad tablet installation.')}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[10px] font-semibold"
          >
            <Download className="w-3 h-3" /> Install App
          </button>
        </div>
      </div>
    </aside>
  );
};
