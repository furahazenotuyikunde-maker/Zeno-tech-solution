export function getKigaliDayBounds(now = new Date()) {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => dateParts.find((entry) => entry.type === type)?.value;
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const start = new Date(`${date}T00:00:00+02:00`);
  return { start, end: new Date(start.getTime() + 86400000) };
}
