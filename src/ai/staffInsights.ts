import type { StaffAlert, StaffLog } from './types';

const MINUTE = 60 * 1000;

export function analyzeStaff(logs: StaffLog[]): StaffAlert[] {
  const staffIds = Array.from(new Set(logs.map((log) => log.staffId)));
  return staffIds.map((staffId) => {
    const staffLogs = logs
      .filter((log) => log.staffId === staffId && Number.isFinite(new Date(log.timestamp).getTime()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const checkInTimes: number[] = [];
    const responseTimes: number[] = [];
    let checkInStarted: number | undefined;
    let failedTap: number | undefined;
    let nightAccessCount = 0;

    for (const log of staffLogs) {
      const time = new Date(log.timestamp).getTime();
      const hourPart = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date(log.timestamp)).find((part) => part.type === 'hour')?.value;
      const hour = Number(hourPart);
      if (hour >= 0 && hour < 5 && log.event === 'door_opened') nightAccessCount += 1;
      if (log.event === 'check_in_started') checkInStarted = time;
      if (log.event === 'check_in_completed' && checkInStarted !== undefined) {
        checkInTimes.push((time - checkInStarted) / MINUTE);
        checkInStarted = undefined;
      }
      if (log.event === 'failed_tap') failedTap = time;
      if (log.event === 'tap_resolved' && failedTap !== undefined) {
        responseTimes.push((time - failedTap) / MINUTE);
        failedTap = undefined;
      }
    }

    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const averageCheckInMinutes = average(checkInTimes);
    const averageFailedTapResponseMinutes = average(responseTimes);
    const performance = Math.max(0, Math.min(100, Math.round(100 - averageCheckInMinutes * 2 - averageFailedTapResponseMinutes * 3 - nightAccessCount * 8)));
    const alert = nightAccessCount > 0
      ? `${nightAccessCount} after-hours door event${nightAccessCount === 1 ? '' : 's'} to review.`
      : performance < 70
        ? 'Check-in or failed-tap response is slower than the target.'
        : 'Performance is within the expected range.';

    return { staffId, performance, averageCheckInMinutes: Math.round(averageCheckInMinutes * 10) / 10, averageFailedTapResponseMinutes: Math.round(averageFailedTapResponseMinutes * 10) / 10, nightAccessCount, alert };
  });
}
