export type UserRole = 'manager' | 'receptionist' | 'electrician' | 'admin' | 'technician';

export type Language = 'en' | 'sw' | 'fr' | 'rw';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type SubscriptionPlan = 'trial' | 'starter' | 'pro';

export interface Profile {
  id: string; // references auth.users.id
  hotelId: string;
  role: UserRole;
  isActive: boolean;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Hotel {
  id: string;
  name: string;
  code: string;
  location: string;
  totalRooms: number;
  currency: string;
  ownerEmail: string;
  subscriptionStatus: SubscriptionStatus;
  plan: SubscriptionPlan;
  trialEndsAt: string;
  maxRooms: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Guest {
  id: string;
  name: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  idNumber: string;
  phone?: string;
  email?: string;
  cardUid: string;
  status: 'active' | 'checked_out' | 'deactivated';
  issuedAt: string;
  hotelId: string;
  vipStatus?: boolean;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: 'Standard' | 'Deluxe' | 'Executive Suite' | 'Presidential Suite';
  status: 'vacant' | 'occupied' | 'maintenance';
  cardAssigned?: string;
  currentGuest?: string;
  lockId: string;
  esp32Id?: string;
  lockStatus: 'online' | 'offline' | 'warning';
  lockBattery: number; // percentage
  lockSignal: number; // dBm / RSSI
  lastAccessTime?: string;
}

export interface AccessLog {
  id: string;
  timestamp: string;
  roomId: string;
  roomNumber: string;
  cardUid: string;
  guestName: string;
  status: 'UNLOCKED' | 'FAILED';
  reason?: string;
  source: 'RFID' | 'QR_BACKUP' | 'RECEPTION_REMOTE';
  batteryStatus?: number;
}

export interface CardItem {
  id: string;
  uid: string;
  type: 'Mifare Classic 1K' | 'Desfire EV1';
  status: 'active' | 'unassigned' | 'lost' | 'blocked';
  assignedGuest?: string;
  assignedRoom?: string;
  batchNumber: string;
  lastRead?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'Hardware' | 'Installation' | 'Software Subscription' | 'Smart Cards';
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  invoiceNumber: string;
  hotelName: string;
  clientContact: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  currency: string;
  taxRate: number;
}
