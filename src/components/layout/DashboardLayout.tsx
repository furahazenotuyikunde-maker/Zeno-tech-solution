'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { store } from '@/lib/storage';
import { UserRole, Language } from '@/types';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [hotelName, setHotelName] = useState('Hotel');

  useEffect(() => {
    setLang(store.getLanguage());
    let active = true;
    fetch('/api/session', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load hotel session.');
        return result;
      })
      .then((session) => {
        if (!active) return;
        setRole(session.role);
        setHotelName(session.hotel.name);
      })
      .catch((error: unknown) => {
        if (active) console.error(error instanceof Error ? error.message : 'Could not load hotel session.');
      });
    const unsubscribe = store.subscribe(() => setLang(store.getLanguage()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleLangChange = (newLang: Language) => {
    store.setLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-[#0A1931] text-white flex antialiased">
      <Sidebar
        currentRole={role}
        currentLang={lang}
        onLangChange={handleLangChange}
        hotelName={hotelName}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar currentRole={role} hotelName={hotelName} />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
