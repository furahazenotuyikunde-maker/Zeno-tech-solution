export type AnomalyType =
  | 'FREQUENT_TAPS'
  | 'NIGHT_ACTIVITY'
  | 'UNUSUAL_ROOM'
  | 'LOST_CARD'
  | 'DUPLICATE_USE'
  | 'NONE';

export interface AccessLog {
  id: string;
  timestamp: string;
  cardUid: string;
  roomId: string;
  roomNumber: string;
  result: 'Allowed' | 'Denied';
  readerId?: string;
  staffId?: string;
  cardType?: 'guest' | 'receptionist_master' | 'master';
  powerState?: 'ON' | 'OFF';
  cardState?: 'IN' | 'OUT';
  checkoutAt?: string;
  cardActive?: boolean;
  eventType?: 'access' | 'checkout_snapshot';
}

export interface CardAnomaly {
  cardUid: string;
  isAnomaly: boolean;
  riskScore: number;
  type: AnomalyType;
  reason: string;
  message: string;
  roomId?: string;
}

export interface ElectricityEvent {
  roomId: string;
  timestamp: string;
  powerState: 'ON' | 'OFF';
  cardState: 'IN' | 'OUT';
  watts: number;
  cardUid?: string;
}

export interface ElectricityPrediction {
  roomId: string;
  wastedKwh: number;
  wastedRWF: number;
  suggestion: string;
  confidence: number;
  monthlySavingsUsd: number;
}

export interface LockBatterySample {
  date: string;
  battery: number;
}

export interface Lock {
  lockId: string;
  roomId: string;
  battery: number;
  samples: LockBatterySample[];
}

export interface BatteryRisk {
  lockId: string;
  roomId: string;
  battery: number;
  daysLeft: number;
  action: string;
  riskScore: number;
}

export interface StaffLog {
  staffId: string;
  event: 'check_in_started' | 'check_in_completed' | 'failed_tap' | 'tap_resolved' | 'door_opened';
  timestamp: string;
  roomId?: string;
  cardUid?: string;
}

export interface StaffAlert {
  staffId: string;
  performance: number;
  averageCheckInMinutes: number;
  averageFailedTapResponseMinutes: number;
  nightAccessCount: number;
  alert: string;
}

export interface ElectricityWasteItem {
  roomId: string;
  kwh: number;
  rwf: number;
  suggestion: string;
}
