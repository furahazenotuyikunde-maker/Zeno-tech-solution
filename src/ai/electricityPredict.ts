import type { ElectricityEvent, ElectricityPrediction } from './types';

const RWF_PER_KWH = 150;
const DAYS_IN_MONTH = 30;

export function predictElectricityWaste(roomId: string, logs: ElectricityEvent[]): ElectricityPrediction {
  const roomEvents = logs
    .filter((event) => event.roomId === roomId && Number.isFinite(new Date(event.timestamp).getTime()))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let wastedKwh = 0;
  let highDraw = false;
  for (let index = 0; index < roomEvents.length; index += 1) {
    const event = roomEvents[index];
    if (event.watts >= 3800) highDraw = true;
    if (event.powerState !== 'ON' || event.cardState !== 'OUT') continue;
    const next = roomEvents.slice(index + 1).find((candidate) => candidate.powerState === 'OFF' || candidate.cardState === 'IN');
    const end = next ? new Date(next.timestamp).getTime() : new Date(event.timestamp).getTime() + 60 * 60 * 1000;
    const durationHours = Math.max(0, (end - new Date(event.timestamp).getTime()) / (60 * 60 * 1000));
    if (durationHours > 10 / 60) wastedKwh += event.watts / 1000 * durationHours;
  }

  const averageWastedKwh = Math.round(wastedKwh * 10) / 10;
  const monthlySavingsUsd = Math.round(averageWastedKwh * RWF_PER_KWH * DAYS_IN_MONTH / 1450);
  const suggestion = highDraw
    ? 'AC draw exceeds 3.8 kW. Inspect and clean the air-conditioner filter.'
    : 'Auto cut power at 08:10, even if the card is left in the slot trick.';

  return {
    roomId,
    wastedKwh: averageWastedKwh,
    wastedRWF: Math.round(averageWastedKwh * RWF_PER_KWH),
    suggestion,
    confidence: Math.min(96, 65 + roomEvents.length * 3),
    monthlySavingsUsd,
  };
}
