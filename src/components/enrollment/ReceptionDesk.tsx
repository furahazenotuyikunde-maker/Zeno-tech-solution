'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/lib/storage';
import { sound } from '@/lib/sound';
import { Guest, Room } from '@/types';
import { SmartAccessCard } from '../card/SmartAccessCard';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Key,
  ShieldCheck,
  UserMinus,
  Sparkles,
  QrCode,
  AlertCircle,
  Hash,
  User,
  Radio,
  Printer,
  X,
} from 'lucide-react';

export const ReceptionDesk: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'checked_out'>('active');

  // Form State
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState('2026-10-31');
  const [checkOutDate, setCheckOutDate] = useState('2026-11-05');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Reader Simulator State
  const [readerStatus, setReaderStatus] = useState<'idle' | 'reading' | 'ready'>('idle');
  const [detectedUid, setDetectedUid] = useState<string>('');
  const [enrolledGuest, setEnrolledGuest] = useState<Guest | null>(null);
  const [showQrModal, setShowQrModal] = useState<Guest | null>(null);

  // Sync store
  useEffect(() => {
    const update = () => {
      setGuests(store.getGuests());
      setRooms(store.getRooms());
    };
    update();
    const unsub = store.subscribe(update);
    return unsub;
  }, []);

  // Set default vacant room
  useEffect(() => {
    const vacantRoom = rooms.find((r) => r.status === 'vacant');
    if (vacantRoom && !roomNumber) {
      setRoomNumber(vacantRoom.number);
    }
  }, [rooms, roomNumber]);

  // Desk RC522 Reader Simulation
  const handleTapDeskReader = () => {
    setReaderStatus('reading');
    sound.playBeep();
    setTimeout(() => {
      const newUid = store.generateMifareUid();
      setDetectedUid(newUid);
      setReaderStatus('ready');
      sound.playDoorUnlock();
    }, 600);
  };

  const handleEnrollCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !roomNumber) return;

    const uidToUse = detectedUid || store.generateMifareUid();
    sound.playBeep();

    const newGuest = store.enrollGuest({
      name: guestName,
      roomNumber,
      checkInDate,
      checkOutDate,
      idNumber: idNumber || `ID-${Math.floor(100000 + Math.random() * 900000)}`,
      phone,
      email,
      cardUid: uidToUse,
    });

    setEnrolledGuest(newGuest);
    setDetectedUid('');
    setReaderStatus('idle');

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0DB5B5', '#0F1D5E', '#D4A017'],
      });
    } catch {
      // fallback
    }

    // Reset form
    setGuestName('');
    setIdNumber('');
    setPhone('');
    setEmail('');
  };

  const handleCheckout = (guest: Guest) => {
    if (confirm(`Check out ${guest.name} and revoke Card ${guest.cardUid}? Room ${guest.roomNumber} will become vacant.`)) {
      sound.playRelayClick();
      store.checkoutGuest(guest.id);
      if (enrolledGuest?.id === guest.id) {
        setEnrolledGuest(null);
      }
    }
  };

  // Filtered guest list
  const filteredGuests = guests.filter((g) => {
    const matchSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.roomNumber.includes(searchQuery) ||
      g.cardUid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = selectedFilter === 'all' ? true : g.status === selectedFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* DESK ENROLLMENT MODULE & HARDWARE SIMULATOR */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Enrollment Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zeno-navy text-white flex items-center justify-center">
                <Key className="w-5 h-5 text-zeno-teal" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
                  Reception Card Enrollment Desk
                </h3>
                <p className="text-xs text-slate-500">
                  Assign RFID Mifare card to hotel guest & pair with door strike
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Desk RC522 Online
            </div>
          </div>

          <form onSubmit={handleEnrollCard} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Guest Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Guest Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
                  />
                </div>
              </div>

              {/* Room Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Assign Room *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.number}>
                        Room {room.number} ({room.type}) - {room.status.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-in Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Check-in Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
                  />
                </div>
              </div>

              {/* Check-out Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Check-out Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Passport / National ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Passport / National ID Number
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. USA-9844201 / RWA-11994"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
                />
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone (for SMS Backup Key)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +250 788 123 456"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
                />
              </div>
            </div>

            {/* Simulated Desk RC522 Reader Interface */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Physical Desk Reader Graphic */}
                <div className="relative w-14 h-14 bg-gradient-to-br from-slate-900 to-zeno-navy rounded-xl border-2 border-teal-500/50 shadow-md flex items-center justify-center shrink-0">
                  <Radio
                    className={`w-7 h-7 text-zeno-teal ${
                      readerStatus === 'reading' ? 'animate-ping' : ''
                    }`}
                  />
                  <span
                    className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                      readerStatus === 'ready'
                        ? 'bg-emerald-400'
                        : readerStatus === 'reading'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-blue-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Desk USB RC522 RFID Reader
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {detectedUid ? (
                      <span className="text-emerald-500 font-mono font-bold">
                        Scanned UID: {detectedUid} (Mifare 1K)
                      </span>
                    ) : (
                      'Waiting for Mifare card tap...'
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTapDeskReader}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-zeno-gold" />
                Tap Blank Card on Desk
              </button>
            </div>

            {/* Submit Enroll Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-heading font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-zeno-navy via-slate-900 to-zeno-navy hover:from-slate-900 hover:to-zeno-navy border border-zeno-teal/40 shadow-card hover:shadow-glow transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5 text-zeno-teal" />
              Enroll & Program Smart Access Card
            </button>
          </form>
        </div>

        {/* Right: Enrolled Card Visual Overlay */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Card Visual Output
            </span>
            <span className="text-xs bg-zeno-teal/15 text-zeno-teal font-bold px-2.5 py-0.5 rounded-full border border-zeno-teal/30">
              {enrolledGuest ? 'Active Issued Card' : 'Preview Specimen'}
            </span>
          </div>

          {/* Realistic ZENO Card */}
          <SmartAccessCard
            guestName={enrolledGuest?.name || guestName || 'JOHN SMITH'}
            roomNumber={enrolledGuest?.roomNumber || roomNumber || '204'}
            cardUid={enrolledGuest?.cardUid || detectedUid || 'G-10247'}
            validUntil={enrolledGuest?.checkOutDate || checkOutDate}
            vipStatus={true}
          />

          {enrolledGuest && (
            <div className="w-full mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <strong>Card Programmed!</strong> Room {enrolledGuest.roomNumber} is ready for access.
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(enrolledGuest)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shrink-0"
              >
                <QrCode className="w-3 h-3" /> QR Key
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE GUESTS MANAGEMENT TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Header & Search Filter */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
              Active Registered Guests & Cards
            </h3>
            <p className="text-xs text-slate-500">
              Search by guest name, room number, or RFID card UID (G-series)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search guest or card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zeno-teal"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setSelectedFilter('active')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'active'
                    ? 'bg-white dark:bg-slate-900 text-zeno-teal shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Active Guests
              </button>
              <button
                onClick={() => setSelectedFilter('checked_out')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'checked_out'
                    ? 'bg-white dark:bg-slate-900 text-zeno-teal shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Checked Out
              </button>
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-zeno-teal shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Records
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Guest Details</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Mifare Card UID</th>
                <th className="py-3 px-4">Check-in / Out</th>
                <th className="py-3 px-4">ID Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No guests found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Guest Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{guest.name}</span>
                        {guest.vipStatus && (
                          <span className="text-[9px] bg-zeno-gold/20 text-zeno-gold px-1.5 py-0.2 rounded border border-zeno-gold/40 font-bold">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{guest.phone || guest.email || 'No contact'}</div>
                    </td>

                    {/* Room */}
                    <td className="py-3.5 px-4 font-heading font-black text-sm text-zeno-teal">
                      Room {guest.roomNumber}
                    </td>

                    {/* Card UID */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-zeno-navy text-white text-[11px]">
                        {guest.cardUid}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div>In: <strong>{guest.checkInDate}</strong></div>
                      <div>Out: <strong>{guest.checkOutDate}</strong></div>
                    </td>

                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {guest.idNumber}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {guest.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Checked Out
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setShowQrModal(guest)}
                        title="Digital QR Key Backup"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      {guest.status === 'active' && (
                        <button
                          onClick={() => handleCheckout(guest)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors inline-flex items-center gap-1"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Checkout
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIGITAL QR BACKUP KEY MODAL */}
      {/* ========================================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative text-center">
            <button
              onClick={() => setShowQrModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-zeno-navy text-white flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6 text-zeno-teal" />
            </div>

            <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white">
              Digital Backup Key Pass
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Send or show this QR key pass to guest if card is lost or misplaced
            </p>

            {/* QR Code Container */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-teal-500/30 flex flex-col items-center shadow-inner">
              <div className="p-2 bg-white rounded-xl">
                <svg width="140" height="140" viewBox="0 0 28 28" fill="#0F1D5E">
                  <rect x="2" y="2" width="8" height="8" fill="none" stroke="#0F1D5E" strokeWidth="2" />
                  <rect x="4" y="4" width="4" height="4" fill="#0F1D5E" />
                  <rect x="18" y="2" width="8" height="8" fill="none" stroke="#0F1D5E" strokeWidth="2" />
                  <rect x="20" y="4" width="4" height="4" fill="#0F1D5E" />
                  <rect x="2" y="18" width="8" height="8" fill="none" stroke="#0F1D5E" strokeWidth="2" />
                  <rect x="4" y="20" width="4" height="4" fill="#0F1D5E" />
                  <rect x="12" y="3" width="2" height="6" fill="#0F1D5E" />
                  <rect x="12" y="12" width="4" height="4" fill="#0F1D5E" />
                  <rect x="3" y="12" width="6" height="2" fill="#0F1D5E" />
                  <rect x="18" y="14" width="6" height="2" fill="#0F1D5E" />
                  <rect x="14" y="20" width="3" height="5" fill="#0F1D5E" />
                  <rect x="20" y="20" width="5" height="5" fill="#0F1D5E" />
                </svg>
              </div>

              <div className="mt-3 text-white font-heading font-bold text-sm">
                ROOM {showQrModal.roomNumber}
              </div>
              <div className="text-[11px] font-mono text-cyan-300">
                {showQrModal.name} • {showQrModal.cardUid}
              </div>
              <div className="text-[9px] text-slate-400 mt-1">
                Valid until: {showQrModal.checkOutDate}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  alert(`Backup access link sent to ${showQrModal.phone || 'guest mobile'}`);
                  setShowQrModal(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-zeno-teal hover:bg-teal-600 text-white transition-colors"
              >
                Send via SMS
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
