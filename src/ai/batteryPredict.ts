import type { BatteryRisk, Lock } from './types';

export function predictBatteryFailure(locks: Lock[]): BatteryRisk[] {
  return locks.flatMap((lock) => {
    const samples = [...lock.samples]
      .filter((sample) => Number.isFinite(new Date(sample.date).getTime()) && Number.isFinite(sample.battery))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (samples.length < 2) return [];

    const first = samples[0];
    const last = samples[samples.length - 1];
    const elapsedDays = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
    if (elapsedDays <= 0) return [];
    const dailyDrop = (first.battery - last.battery) / elapsedDays;
    if (dailyDrop <= 5) return [];

    const daysLeft = Math.max(0, Math.ceil(last.battery / dailyDrop));
    return [{
      lockId: lock.lockId,
      roomId: lock.roomId,
      battery: last.battery,
      daysLeft,
      action: `Replace or recharge battery in Room ${lock.roomId} within ${daysLeft} days.`,
      riskScore: Math.min(99, Math.max(60, Math.round(100 - last.battery + dailyDrop * 4))),
    }];
  }).sort((a, b) => a.daysLeft - b.daysLeft);
}
