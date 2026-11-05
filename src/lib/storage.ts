import { Guest, Room, AccessLog, CardItem, Hotel, UserRole, Language, SubscriptionPlan, SubscriptionStatus } from '@/types';

export const INITIAL_HOTELS: Hotel[] = [
  {
    id: 'h-1',
    name: 'Grand Serena Hotel & Suites',
    code: 'GSH',
    location: 'Kigali, Rwanda',
    totalRooms: 48,
    currency: 'USD',
    ownerEmail: 'manager@grandserena.rw',
    subscriptionStatus: 'trialing',
    plan: 'trial',
    // 5 days and 14 hours remaining from now
    trialEndsAt: new Date(Date.now() + (5 * 24 + 14) * 60 * 60 * 1000).toISOString(),
    maxRooms: 2,
  },
  {
    id: 'h-2',
    name: 'Lake Kivu Serena Resort',
    code: 'LKS',
    location: 'Rubavu, Rwanda',
    totalRooms: 64,
    currency: 'USD',
    ownerEmail: 'finance@lakekivu.rw',
    subscriptionStatus: 'active',
    plan: 'pro',
    trialEndsAt: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000).toISOString(),
    maxRooms: 50,
  },
  {
    id: 'h-3',
    name: 'Akagera Safari Luxury Lodge',
    code: 'ASL',
    location: 'Kayonza, Rwanda',
    totalRooms: 24,
    currency: 'USD',
    ownerEmail: 'lodge@akagera.rw',
    subscriptionStatus: 'past_due',
    plan: 'starter',
    trialEndsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    maxRooms: 10,
  },
  {
    id: 'h-4',
    name: 'Kigali Marriott Express',
    code: 'KME',
    location: 'Kigali, Rwanda',
    totalRooms: 12,
    currency: 'USD',
    ownerEmail: 'stay@kigalimarriott.rw',
    subscriptionStatus: 'canceled',
    plan: 'trial',
    // Expired 2 days ago
    trialEndsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    maxRooms: 2,
  },
];

export const INITIAL_ROOMS: Room[] = [
  { id: 'r-101', number: '101', floor: 1, type: 'Standard', status: 'vacant', lockId: 'ESP32-L101', esp32Id: 'ESP32-L101', lockStatus: 'online', lockBattery: 98, lockSignal: -62 },
  { id: 'r-102', number: '102', floor: 1, type: 'Deluxe', status: 'occupied', cardAssigned: 'G-10242', currentGuest: 'Amina Uwase', lockId: 'ESP32-L102', esp32Id: 'ESP32-L102', lockStatus: 'online', lockBattery: 85, lockSignal: -58, lastAccessTime: '10 mins ago' },
  { id: 'r-103', number: '103', floor: 1, type: 'Standard', status: 'vacant', lockId: 'ESP32-L103', esp32Id: 'ESP32-L103', lockStatus: 'online', lockBattery: 92, lockSignal: -65 },
  { id: 'r-104', number: '104', floor: 1, type: 'Deluxe', status: 'maintenance', lockId: 'ESP32-L104', esp32Id: 'ESP32-L104', lockStatus: 'warning', lockBattery: 22, lockSignal: -78 },
  { id: 'r-201', number: '201', floor: 2, type: 'Executive Suite', status: 'vacant', lockId: 'ESP32-L201', esp32Id: 'ESP32-L201', lockStatus: 'online', lockBattery: 94, lockSignal: -60 },
  { id: 'r-202', number: '202', floor: 2, type: 'Deluxe', status: 'occupied', cardAssigned: 'G-10245', currentGuest: 'David Miller', lockId: 'ESP32-L202', esp32Id: 'ESP32-L202', lockStatus: 'online', lockBattery: 78, lockSignal: -54, lastAccessTime: '42 mins ago' },
  { id: 'r-203', number: '203', floor: 2, type: 'Standard', status: 'vacant', lockId: 'ESP32-L203', esp32Id: 'ESP32-L203', lockStatus: 'online', lockBattery: 88, lockSignal: -68 },
  { id: 'r-204', number: '204', floor: 2, type: 'Executive Suite', status: 'occupied', cardAssigned: 'G-10247', currentGuest: 'John Smith', lockId: 'ESP32-L204', esp32Id: 'ESP32-L204', lockStatus: 'online', lockBattery: 91, lockSignal: -51, lastAccessTime: '3 mins ago' },
  { id: 'r-205', number: '205', floor: 2, type: 'Standard', status: 'vacant', lockId: 'ESP32-L205', esp32Id: 'ESP32-L205', lockStatus: 'offline', lockBattery: 15, lockSignal: -85 },
  { id: 'r-301', number: '301', floor: 3, type: 'Presidential Suite', status: 'occupied', cardAssigned: 'G-10250', currentGuest: 'Elena Rostova', lockId: 'ESP32-L301', esp32Id: 'ESP32-L301', lockStatus: 'online', lockBattery: 96, lockSignal: -48, lastAccessTime: '2 hours ago' },
  { id: 'r-302', number: '302', floor: 3, type: 'Presidential Suite', status: 'vacant', lockId: 'ESP32-L302', esp32Id: 'ESP32-L302', lockStatus: 'online', lockBattery: 95, lockSignal: -55 },
];

export const INITIAL_GUESTS: Guest[] = [
  {
    id: 'gst-1',
    name: 'John Smith',
    roomNumber: '204',
    checkInDate: '2026-10-30',
    checkOutDate: '2026-11-04',
    idNumber: 'USA-9844201',
    phone: '+1 (555) 234-5678',
    email: 'john.smith@example.com',
    cardUid: 'G-10247',
    status: 'active',
    issuedAt: '2026-10-30 14:15',
    hotelId: 'h-1',
    vipStatus: true,
  },
  {
    id: 'gst-2',
    name: 'Amina Uwase',
    roomNumber: '102',
    checkInDate: '2026-10-29',
    checkOutDate: '2026-11-02',
    idNumber: 'RWA-1199480029',
    phone: '+250 788 123 456',
    email: 'amina.uwase@rwanda.tech',
    cardUid: 'G-10242',
    status: 'active',
    issuedAt: '2026-10-29 11:20',
    hotelId: 'h-1',
  },
  {
    id: 'gst-3',
    name: 'David Miller',
    roomNumber: '202',
    checkInDate: '2026-10-28',
    checkOutDate: '2026-11-01',
    idNumber: 'UK-7729188',
    phone: '+44 7911 123456',
    email: 'dmiller@london.co.uk',
    cardUid: 'G-10245',
    status: 'active',
    issuedAt: '2026-10-28 16:45',
    hotelId: 'h-1',
  },
  {
    id: 'gst-4',
    name: 'Elena Rostova',
    roomNumber: '301',
    checkInDate: '2026-10-31',
    checkOutDate: '2026-11-07',
    idNumber: 'FR-8893120',
    phone: '+33 6 12 34 56 78',
    email: 'elena.rostova@paris.fr',
    cardUid: 'G-10250',
    status: 'active',
    issuedAt: '2026-10-31 09:30',
    hotelId: 'h-1',
    vipStatus: true,
  },
];

export const INITIAL_LOGS: AccessLog[] = [
  {
    id: 'log-101',
    timestamp: '2026-10-31 12:41:15',
    roomId: 'r-204',
    roomNumber: '204',
    cardUid: 'G-10247',
    guestName: 'John Smith',
    status: 'UNLOCKED',
    source: 'RFID',
    batteryStatus: 91,
  },
  {
    id: 'log-100',
    timestamp: '2026-10-31 12:35:02',
    roomId: 'r-102',
    roomNumber: '102',
    cardUid: 'G-10242',
    guestName: 'Amina Uwase',
    status: 'UNLOCKED',
    source: 'RFID',
    batteryStatus: 85,
  },
  {
    id: 'log-99',
    timestamp: '2026-10-31 12:12:44',
    roomId: 'r-204',
    roomNumber: '204',
    cardUid: 'G-99999',
    guestName: 'Unknown Card',
    status: 'FAILED',
    reason: 'Card not registered to Room 204',
    source: 'RFID',
  },
  {
    id: 'log-98',
    timestamp: '2026-10-31 11:45:18',
    roomId: 'r-202',
    roomNumber: '202',
    cardUid: 'G-10245',
    guestName: 'David Miller',
    status: 'UNLOCKED',
    source: 'RFID',
    batteryStatus: 78,
  },
  {
    id: 'log-97',
    timestamp: '2026-10-31 10:15:30',
    roomId: 'r-301',
    roomNumber: '301',
    cardUid: 'G-10250',
    guestName: 'Elena Rostova',
    status: 'UNLOCKED',
    source: 'QR_BACKUP',
    batteryStatus: 96,
  },
  {
    id: 'log-96',
    timestamp: '2026-10-31 09:22:11',
    roomId: 'r-205',
    roomNumber: '205',
    cardUid: 'G-10247',
    guestName: 'John Smith',
    status: 'FAILED',
    reason: 'Invalid room authorization',
    source: 'RFID',
  },
];

export const INITIAL_CARDS: CardItem[] = [
  { id: 'c-1', uid: 'G-10247', type: 'Mifare Classic 1K', status: 'active', assignedGuest: 'John Smith', assignedRoom: '204', batchNumber: 'BATCH-2026-A', lastRead: '2026-10-31 12:41' },
  { id: 'c-2', uid: 'G-10242', type: 'Mifare Classic 1K', status: 'active', assignedGuest: 'Amina Uwase', assignedRoom: '102', batchNumber: 'BATCH-2026-A', lastRead: '2026-10-31 12:35' },
  { id: 'c-3', uid: 'G-10245', type: 'Mifare Classic 1K', status: 'active', assignedGuest: 'David Miller', assignedRoom: '202', batchNumber: 'BATCH-2026-A', lastRead: '2026-10-31 11:45' },
  { id: 'c-4', uid: 'G-10250', type: 'Mifare Classic 1K', status: 'active', assignedGuest: 'Elena Rostova', assignedRoom: '301', batchNumber: 'BATCH-2026-A', lastRead: '2026-10-31 10:15' },
  { id: 'c-5', uid: 'G-10251', type: 'Mifare Classic 1K', status: 'unassigned', batchNumber: 'BATCH-2026-B' },
  { id: 'c-6', uid: 'G-10252', type: 'Mifare Classic 1K', status: 'unassigned', batchNumber: 'BATCH-2026-B' },
  { id: 'c-7', uid: 'G-10253', type: 'Mifare Classic 1K', status: 'unassigned', batchNumber: 'BATCH-2026-B' },
  { id: 'c-8', uid: 'G-10254', type: 'Mifare Classic 1K', status: 'unassigned', batchNumber: 'BATCH-2026-B' },
  { id: 'c-9', uid: 'G-10219', type: 'Mifare Classic 1K', status: 'lost', assignedGuest: 'Reported lost', assignedRoom: 'Ex-Room 105', batchNumber: 'BATCH-2026-A' },
  { id: 'c-10', uid: 'G-10220', type: 'Mifare Classic 1K', status: 'blocked', assignedGuest: 'Blocked security', batchNumber: 'BATCH-2026-A' },
];

export interface SystemConfig {
  wifiSsid: string;
  wifiPass: string;
  mqttBroker: string;
  mqttPort: number;
  hotelId: string;
  relayHoldSeconds: number;
  autoLockDelay: number;
  offlineSyncEnabled: boolean;
}

export const INITIAL_CONFIG: SystemConfig = {
  wifiSsid: "ZENO_HOTEL_GUEST_IOT",
  wifiPass: "zenoSecure2026!IoT",
  mqttBroker: "broker.emqx.io",
  mqttPort: 1883,
  hotelId: "h-1",
  relayHoldSeconds: 4,
  autoLockDelay: 5,
  offlineSyncEnabled: true,
};

type Listener = () => void;

class StateStore {
  private hotels: Hotel[] = INITIAL_HOTELS;
  private guests: Guest[] = INITIAL_GUESTS;
  private rooms: Room[] = INITIAL_ROOMS;
  private logs: AccessLog[] = INITIAL_LOGS;
  private cards: CardItem[] = INITIAL_CARDS;
  private currentHotelId: string = 'h-1';
  private role: UserRole = 'admin';
  private language: Language = 'en';
  private config: SystemConfig = INITIAL_CONFIG;
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
    }
  }

  private load() {
    try {
      const h = localStorage.getItem('zeno_hotels');
      if (h) this.hotels = JSON.parse(h);

      const g = localStorage.getItem('zeno_guests');
      if (g) this.guests = JSON.parse(g);

      const r = localStorage.getItem('zeno_rooms');
      if (r) this.rooms = JSON.parse(r);

      const l = localStorage.getItem('zeno_logs');
      if (l) this.logs = JSON.parse(l);

      const c = localStorage.getItem('zeno_cards');
      if (c) this.cards = JSON.parse(c);

      const curHotel = localStorage.getItem('zeno_current_hotel_id');
      if (curHotel) this.currentHotelId = curHotel;

      const role = localStorage.getItem('zeno_role') as UserRole;
      if (role) this.role = role;

      const lang = localStorage.getItem('zeno_lang') as Language;
      if (lang) this.language = lang;

      const cfg = localStorage.getItem('zeno_config');
      if (cfg) this.config = JSON.parse(cfg);

      this.initialized = true;
    } catch {
      // ignore
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('zeno_hotels', JSON.stringify(this.hotels));
      localStorage.setItem('zeno_guests', JSON.stringify(this.guests));
      localStorage.setItem('zeno_rooms', JSON.stringify(this.rooms));
      localStorage.setItem('zeno_logs', JSON.stringify(this.logs));
      localStorage.setItem('zeno_cards', JSON.stringify(this.cards));
      localStorage.setItem('zeno_current_hotel_id', this.currentHotelId);
      localStorage.setItem('zeno_role', this.role);
      localStorage.setItem('zeno_lang', this.language);
      localStorage.setItem('zeno_config', JSON.stringify(this.config));
    } catch {
      // storage quota
    }
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // Hotels & Subscription Getters
  getHotels(): Hotel[] {
    return this.hotels;
  }

  getCurrentHotel(): Hotel {
    return this.hotels.find((h) => h.id === this.currentHotelId) || this.hotels[0];
  }

  getHotelById(id: string): Hotel | undefined {
    return this.hotels.find((h) => h.id === id);
  }

  // Subscription Paywall Verification
  isSubscriptionExpired(hotelId?: string): boolean {
    const hotel = hotelId ? this.getHotelById(hotelId) : this.getCurrentHotel();
    if (!hotel) return false;

    // Active paid plan is never expired
    if (hotel.subscriptionStatus === 'active') return false;

    // Canceled or Past Due is immediately locked out
    if (hotel.subscriptionStatus === 'canceled' || hotel.subscriptionStatus === 'past_due') {
      return true;
    }

    // Trial mode: check if trial period has elapsed
    const trialEndTime = new Date(hotel.trialEndsAt).getTime();
    return Date.now() > trialEndTime;
  }

  getRemainingTrialTime(hotelId?: string): { days: number; hours: number; minutes: number; isExpired: boolean } {
    const hotel = hotelId ? this.getHotelById(hotelId) : this.getCurrentHotel();
    if (!hotel || hotel.subscriptionStatus === 'active') {
      return { days: 999, hours: 0, minutes: 0, isExpired: false };
    }

    const diff = new Date(hotel.trialEndsAt).getTime() - Date.now();
    if (diff <= 0 || hotel.subscriptionStatus === 'canceled' || hotel.subscriptionStatus === 'past_due') {
      return { days: 0, hours: 0, minutes: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, isExpired: false };
  }

  // Room Creation Limit Check (Max 2 rooms on trial)
  canAddRoom(hotelId?: string): { allowed: boolean; currentCount: number; maxRooms: number; reason?: string } {
    const hotel = hotelId ? this.getHotelById(hotelId) : this.getCurrentHotel();
    const currentCount = this.rooms.length;
    const maxRooms = hotel ? hotel.maxRooms : 2;

    if (this.isSubscriptionExpired(hotel?.id)) {
      return {
        allowed: false,
        currentCount,
        maxRooms,
        reason: 'Subscription expired. Please upgrade on the billing page to add rooms.',
      };
    }

    if (hotel && (hotel.plan === 'trial' || hotel.subscriptionStatus === 'trialing')) {
      if (currentCount >= maxRooms) {
        return {
          allowed: false,
          currentCount,
          maxRooms,
          reason: `Free trial limit reached (${currentCount}/${maxRooms} rooms). Upgrade to Starter ($20/mo) or Pro ($50/mo) to unlock additional rooms.`,
        };
      }
    }

    if (hotel && hotel.plan === 'starter' && currentCount >= 10) {
      return {
        allowed: false,
        currentCount,
        maxRooms: 10,
        reason: 'Starter plan limit reached (10 rooms maximum). Upgrade to Pro for up to 50 rooms.',
      };
    }

    return { allowed: true, currentCount, maxRooms };
  }

  // Admin and Paystack Subscription Upgrades
  upgradeSubscription(hotelId: string, plan: SubscriptionPlan, status: SubscriptionStatus = 'active') {
    const maxRooms = plan === 'pro' ? 50 : plan === 'starter' ? 10 : 2;
    this.hotels = this.hotels.map((h) =>
      h.id === hotelId
        ? {
            ...h,
            plan,
            subscriptionStatus: status,
            maxRooms,
            trialEndsAt: status === 'active' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : h.trialEndsAt,
          }
        : h
    );
    this.save();
  }

  markHotelAsPaid(hotelId: string, plan: SubscriptionPlan = 'starter') {
    this.upgradeSubscription(hotelId, plan, 'active');
  }

  banHotel(hotelId: string) {
    this.hotels = this.hotels.map((h) =>
      h.id === hotelId ? { ...h, subscriptionStatus: 'canceled' } : h
    );
    this.save();
  }

  extendTrial(hotelId: string, extraDays: number = 7) {
    this.hotels = this.hotels.map((h) => {
      if (h.id === hotelId) {
        const base = new Date(h.trialEndsAt).getTime() > Date.now() ? new Date(h.trialEndsAt).getTime() : Date.now();
        return {
          ...h,
          subscriptionStatus: 'trialing',
          trialEndsAt: new Date(base + extraDays * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return h;
    });
    this.save();
  }

  setSimulatedSubscriptionState(status: SubscriptionStatus, plan: SubscriptionPlan, trialDaysOffset: number) {
    const current = this.getCurrentHotel();
    const targetEnd = new Date(Date.now() + trialDaysOffset * 24 * 60 * 60 * 1000).toISOString();
    const maxRooms = plan === 'pro' ? 50 : plan === 'starter' ? 10 : 2;

    this.hotels = this.hotels.map((h) =>
      h.id === current.id
        ? {
            ...h,
            subscriptionStatus: status,
            plan,
            trialEndsAt: targetEnd,
            maxRooms,
          }
        : h
    );
    this.save();
  }

  // Standard Getters
  getGuests() { return this.guests; }
  getRooms() { return this.rooms; }
  getLogs() { return this.logs; }
  getCards() { return this.cards; }
  getRole() { return this.role; }
  getLanguage() { return this.language; }
  getConfig() { return this.config; }
  getCurrentHotelId() { return this.currentHotelId; }

  // Setters
  setRole(role: UserRole) {
    this.role = role;
    this.save();
  }

  setLanguage(lang: Language) {
    this.language = lang;
    this.save();
  }

  setCurrentHotel(hotelId: string) {
    this.currentHotelId = hotelId;
    this.save();
  }

  updateConfig(cfg: Partial<SystemConfig>) {
    this.config = { ...this.config, ...cfg };
    this.save();
  }

  // Enrollment
  enrollGuest(data: {
    name: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    idNumber: string;
    phone?: string;
    email?: string;
    cardUid: string;
  }): Guest {
    const newGuest: Guest = {
      id: `gst-${Date.now()}`,
      name: data.name,
      roomNumber: data.roomNumber,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      idNumber: data.idNumber,
      phone: data.phone,
      email: data.email,
      cardUid: data.cardUid,
      status: 'active',
      issuedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      hotelId: this.currentHotelId,
    };

    this.guests = [newGuest, ...this.guests];

    this.rooms = this.rooms.map((room) =>
      room.number === data.roomNumber
        ? {
            ...room,
            status: 'occupied',
            cardAssigned: data.cardUid,
            currentGuest: data.name,
            lastAccessTime: 'Just assigned',
          }
        : room
    );

    const cardIdx = this.cards.findIndex((c) => c.uid === data.cardUid);
    if (cardIdx >= 0) {
      this.cards[cardIdx] = {
        ...this.cards[cardIdx],
        status: 'active',
        assignedGuest: data.name,
        assignedRoom: data.roomNumber,
        lastRead: 'Just now',
      };
    } else {
      this.cards = [
        {
          id: `c-${Date.now()}`,
          uid: data.cardUid,
          type: 'Mifare Classic 1K',
          status: 'active',
          assignedGuest: data.name,
          assignedRoom: data.roomNumber,
          batchNumber: 'ENROLLED-DESK',
          lastRead: 'Just now',
        },
        ...this.cards,
      ];
    }

    this.addLog({
      roomId: `r-${data.roomNumber}`,
      roomNumber: data.roomNumber,
      cardUid: data.cardUid,
      guestName: data.name,
      status: 'UNLOCKED',
      reason: 'Initial card programmed & activated at Reception',
      source: 'RFID',
    });

    this.save();
    return newGuest;
  }

  checkoutGuest(guestId: string) {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return;

    this.guests = this.guests.map((g) =>
      g.id === guestId ? { ...g, status: 'checked_out' } : g
    );

    this.rooms = this.rooms.map((r) =>
      r.number === guest.roomNumber
        ? { ...r, status: 'vacant', cardAssigned: undefined, currentGuest: undefined }
        : r
    );

    this.cards = this.cards.map((c) =>
      c.uid === guest.cardUid
        ? { ...c, status: 'unassigned', assignedGuest: undefined, assignedRoom: undefined }
        : c
    );

    this.addLog({
      roomId: `r-${guest.roomNumber}`,
      roomNumber: guest.roomNumber,
      cardUid: guest.cardUid,
      guestName: guest.name,
      status: 'UNLOCKED',
      reason: 'Checkout completed. Access revoked.',
      source: 'RECEPTION_REMOTE',
    });

    this.save();
  }

  // Access Logging
  addLog(entry: Omit<AccessLog, 'id' | 'timestamp'>) {
    const newLog: AccessLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    this.logs = [newLog, ...this.logs.slice(0, 99)];

    if (entry.status === 'UNLOCKED') {
      this.rooms = this.rooms.map((r) =>
        r.number === entry.roomNumber
          ? { ...r, lastAccessTime: 'Just now' }
          : r
      );
    }

    this.save();
  }

  // Door remote trigger
  remoteUnlock(roomNumber: string) {
    const room = this.rooms.find((r) => r.number === roomNumber);
    const guestName = room?.currentGuest || 'Reception Master Remote';
    const cardUid = room?.cardAssigned || 'REMOTE-OVERRIDE';

    this.addLog({
      roomId: room?.id || `r-${roomNumber}`,
      roomNumber,
      cardUid,
      guestName,
      status: 'UNLOCKED',
      reason: 'Remote Emergency Unlock via ZENO Cloud',
      source: 'RECEPTION_REMOTE',
    });
  }

  // Add / Edit Room
  saveRoom(room: Room): { success: boolean; message?: string } {
    const limitCheck = this.canAddRoom(this.currentHotelId);
    const existing = this.rooms.find((r) => r.id === room.id);

    // If adding a new room, check limit
    if (!existing && !limitCheck.allowed) {
      return { success: false, message: limitCheck.reason };
    }

    const idx = this.rooms.findIndex((r) => r.id === room.id);
    if (idx >= 0) {
      this.rooms[idx] = room;
    } else {
      this.rooms = [...this.rooms, room];
    }
    this.save();
    return { success: true };
  }

  generateMifareUid(): string {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `G-${num}`;
  }

  exportLogsToCsv(): string {
    const headers = ['Log ID', 'Timestamp', 'Room', 'Card UID', 'Guest Name', 'Status', 'Event Type', 'Reason'];
    const rows = this.logs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      l.roomNumber,
      l.cardUid,
      `"${l.guestName}"`,
      l.status,
      l.source,
      `"${l.reason || ''}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const store = new StateStore();
