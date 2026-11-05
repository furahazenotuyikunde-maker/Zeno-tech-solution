import mockData from '@/data/mockData.json';
import { analyzeStaff } from '@/ai/staffInsights';
import { predictBatteryFailure } from '@/ai/batteryPredict';
import { detectCardAnomaly } from '@/ai/cardAnomaly';
import { predictElectricityWaste } from '@/ai/electricityPredict';
import type {
  AccessLog, AnomalyType, BatteryRisk, CardAnomaly, ElectricityEvent, ElectricityWasteItem, StaffAlert, StaffLog,
} from '@/ai/types';

const MOCK_DELAY_MS = 400;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

export interface AnomalyCheckRequest {
  lockId: string;
  cardUid: string;
  timestamp: string;
  logs: AccessLog[];
}

export interface AnomalyCheckResponse {
  isAnomaly: boolean;
  riskScore: number;
  type: AnomalyType;
  reason: string;
}

export interface AiInsights {
  electricityWaste: ElectricityWasteItem[];
  suspiciousCards: CardAnomaly[];
  batteryRisks: BatteryRisk[];
  staffAlerts: StaffAlert[];
}

export interface ElectricityPredictionResponse {
  prediction: Array<{ date: string; kwh: number }>;
  savingPotential: number;
}

export interface CheckoutPrediction {
  willCheckoutToday: boolean;
  confidence: number;
}

function toAccessLogs(): AccessLog[] {
  return mockData.logs.map((log) => ({
    id: log.id,
    timestamp: log.time,
    cardUid: log.cardUid,
    roomId: log.room,
    roomNumber: log.room,
    result: log.result === 'Allowed' ? 'Allowed' : 'Denied',
    readerId: log.reader,
    ...(log.cardType === 'receptionist_master' || log.cardType === 'master' ? { cardType: log.cardType } : {}),
  }));
}

function toElectricityEvents(): ElectricityEvent[] {
  return mockData.electricityEvents.map((event) => ({
    roomId: event.roomId,
    timestamp: event.timestamp,
    powerState: event.powerState === 'ON' ? 'ON' : 'OFF',
    cardState: event.cardState === 'OUT' ? 'OUT' : 'IN',
    watts: event.watts,
    cardUid: event.cardUid,
  }));
}

function toStaffLogs(): StaffLog[] {
  return mockData.staffLogs.flatMap((log) => {
    if (
      log.event !== 'check_in_started' &&
      log.event !== 'check_in_completed' &&
      log.event !== 'failed_tap' &&
      log.event !== 'tap_resolved' &&
      log.event !== 'door_opened'
    ) return [];
    return [{ staffId: log.staffId, event: log.event, timestamp: log.timestamp }];
  });
}

function findAnomalies(): CardAnomaly[] {
  const grouped = new Map<string, AccessLog[]>();
  for (const log of toAccessLogs()) {
    const group = grouped.get(log.cardUid) ?? [];
    group.push(log);
    grouped.set(log.cardUid, group);
  }
  return Array.from(grouped.values())
    .map((logs) => detectCardAnomaly(logs))
    .filter((anomaly) => anomaly.isAnomaly);
}

// TODO: Replace these deterministic mock rules with the Python ML model in a Supabase Edge Function.
export const aiApi = {
  async checkAnomaly(input: AnomalyCheckRequest): Promise<AnomalyCheckResponse> {
    await delay();
    const matchingLogs = input.logs.filter((log) => log.cardUid === input.cardUid);
    const analysis = detectCardAnomaly(matchingLogs);
    return {
      isAnomaly: analysis.isAnomaly,
      riskScore: analysis.riskScore,
      type: analysis.type,
      reason: analysis.reason,
    };
  },

  async getInsights(_hotelId: string): Promise<AiInsights> {
    await delay();
    const electricityWaste = mockData.rooms.map((room) => {
      const prediction = predictElectricityWaste(room.number, toElectricityEvents());
      return {
        roomId: room.number,
        kwh: prediction.wastedKwh,
        rwf: prediction.wastedRWF,
        suggestion: prediction.suggestion,
      };
    }).filter((room) => room.kwh > 0);

    return {
      electricityWaste,
      suspiciousCards: findAnomalies(),
      batteryRisks: predictBatteryFailure(mockData.locks),
      staffAlerts: analyzeStaff(toStaffLogs()),
    };
  },

  async predictElectricity(_hotelId: string, range: '7d'): Promise<ElectricityPredictionResponse> {
    await delay();
    const prediction = mockData.electricity.weeklyUsage.map((item, index) => ({
      date: new Date(Date.UTC(2026, 9, 27 + index)).toISOString().slice(0, 10),
      kwh: Math.round(item.kwh * 0.92),
    }));
    return {
      prediction: range === '7d' ? prediction : [],
      savingPotential: Math.round(prediction.reduce((total, point) => total + point.kwh, 0) * 0.08),
    };
  },

  async predictCheckout(roomId: string): Promise<CheckoutPrediction> {
    await delay();
    const room = mockData.rooms.find((entry) => entry.number === roomId);
    const willCheckoutToday = room?.status === 'Occupied' && room.checkOut === '2026-11-02';
    return { willCheckoutToday, confidence: willCheckoutToday ? 82 : 61 };
  },
};

export type { AccessLog, BatteryRisk, CardAnomaly, StaffAlert };
