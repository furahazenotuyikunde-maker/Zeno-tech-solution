import type { AccessLog, AnomalyType, CardAnomaly } from './types';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function bilingual(cardUid: string, type: AnomalyType, reason: string): string {
  const translations: Partial<Record<AnomalyType, string>> = {
    FREQUENT_TAPS: `Ikarita ${cardUid} ikoreshwa cyane`,
    NIGHT_ACTIVITY: `Ikarita ${cardUid} yakoreshejwe nijoro mu minsi myinshi`,
    UNUSUAL_ROOM: `Ikarita y'umukozi yafunguye ibyumba byinshi mu gihe gito`,
    LOST_CARD: `Ikarita ntiyahagaritswe nyuma yo gusohoka`,
    DUPLICATE_USE: `Ikarita ${cardUid} ikoreshwa mu byumba bibiri mu gihe gito`,
  };
  return `${translations[type] ?? 'Nta kibazo cyabonetse'} - Card ${cardUid}: ${reason}`;
}

function result(cardUid: string, type: AnomalyType, riskScore: number, reason: string, roomId?: string): CardAnomaly {
  return {
    cardUid,
    isAnomaly: type !== 'NONE',
    riskScore,
    type,
    reason,
    message: type === 'NONE' ? 'Nta kibazo cyabonetse - No unusual card activity found' : bilingual(cardUid, type, reason),
    ...(roomId ? { roomId } : {}),
  };
}

function within(log: AccessLog, start: number, end: number): boolean {
  const time = new Date(log.timestamp).getTime();
  return Number.isFinite(time) && time >= start && time <= end;
}

export function detectCardAnomaly(logs: AccessLog[]): CardAnomaly {
  const allowed = logs
    .filter((log) => log.result === 'Allowed' && Number.isFinite(new Date(log.timestamp).getTime()))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (!allowed.length) return result('UNKNOWN', 'NONE', 0, 'No successful card taps to evaluate.');

  const cardGroups = new Map<string, AccessLog[]>();
  for (const log of allowed) {
    const group = cardGroups.get(log.cardUid) ?? [];
    group.push(log);
    cardGroups.set(log.cardUid, group);
  }

  for (const [cardUid, taps] of Array.from(cardGroups.entries())) {
    for (let index = 0; index < taps.length; index += 1) {
      const start = new Date(taps[index].timestamp).getTime();
      const windowTaps = taps.filter((tap) => within(tap, start, start + HOUR));
      if (windowTaps.length > 5) {
        return result(cardUid, 'FREQUENT_TAPS', Math.min(98, 70 + windowTaps.length * 3), `${windowTaps.length} opens within one hour; possible cloning or unusual repeated access.`);
      }
    }
  }

  const masterTaps = allowed.filter((log) => log.cardType === 'receptionist_master' || log.cardType === 'master');
  for (const tap of masterTaps) {
    const start = new Date(tap.timestamp).getTime();
    const windowTaps = masterTaps.filter((item) => item.cardUid === tap.cardUid && within(item, start, start + 30 * MINUTE));
    const distinctRooms = new Set(windowTaps.map((item) => item.roomId));
    if (distinctRooms.size >= 5) {
      return result(tap.cardUid, 'UNUSUAL_ROOM', 86, `Master card accessed ${distinctRooms.size} rooms within 30 minutes.`);
    }
  }

  for (const [cardUid, taps] of Array.from(cardGroups.entries())) {
    for (let index = 0; index < taps.length; index += 1) {
      const first = new Date(taps[index].timestamp).getTime();
      const sameWindow = taps.filter((tap) => within(tap, first, first + 10 * MINUTE));
      const distinctRooms = new Set(sameWindow.map((tap) => tap.roomId));
      if (distinctRooms.size > 1) {
        return result(cardUid, 'DUPLICATE_USE', 92, `Possible cloned card used in ${distinctRooms.size} different rooms within 10 minutes.`, sameWindow[0].roomId);
      }
    }
  }

  for (const [cardUid, taps] of Array.from(cardGroups.entries())) {
    const nightDates = new Set(taps.filter((tap) => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Kigali',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(tap.timestamp));
      const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
      const hour = Number(part('hour'));
      const minute = Number(part('minute'));
      return hour >= 2 && (hour < 4 || (hour === 4 && minute <= 30));
    }).map((tap) => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(tap.timestamp));
      return `${parts.find((item) => item.type === 'year')?.value}-${parts.find((item) => item.type === 'month')?.value}-${parts.find((item) => item.type === 'day')?.value}`;
    }));
    if (nightDates.size >= 3) {
      return result(cardUid, 'NIGHT_ACTIVITY', 78, `Card opened between 02:00 and 04:30 on ${nightDates.size} separate nights.`);
    }
  }

  const observationTime = Math.max(...logs.map((log) => new Date(log.timestamp).getTime()).filter(Number.isFinite));
  for (const [cardUid, taps] of Array.from(cardGroups.entries())) {
    const snapshot = logs.find((log) => log.cardUid === cardUid && log.eventType === 'checkout_snapshot' && log.cardActive && log.powerState === 'OFF' && log.checkoutAt);
    if (snapshot?.checkoutAt) {
      const checkout = new Date(snapshot.checkoutAt).getTime();
      const accessAfterCheckout = taps.some((tap) => new Date(tap.timestamp).getTime() > checkout);
      if (Number.isFinite(checkout) && observationTime - checkout >= 24 * HOUR && !accessAfterCheckout) {
        return result(cardUid, 'LOST_CARD', 74, 'Card remained active for 24 hours after checkout while room power was off.');
      }
    }
  }

  return result(allowed[allowed.length - 1].cardUid, 'NONE', 0, 'No unusual card activity found.');
}
