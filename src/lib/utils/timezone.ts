/**
 * Timezone utilities for accurate date boundaries across cloud deployments (UTC servers)
 * and client/organization business timezones (default: Asia/Kolkata).
 */

export function getTimezoneDayBounds(
  timezone: string = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Kolkata',
  referenceDate: Date = new Date()
): { startOfToday: Date; endOfToday: Date; dateStr: string } {
  const tz = timezone || 'Asia/Kolkata';

  // Format reference date into YYYY-MM-DD in target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(referenceDate); // e.g. "2026-10-16"
  const [y, m, d] = dateStr.split('-').map(Number);

  // Sample at midday to safely determine current offset without DST anomalies
  const midDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(midDay);

  const p: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      p[part.type] = Number(part.value);
    }
  }

  const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offsetMs = localAsUtc - midDay.getTime();

  const startOfToday = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offsetMs);
  const endOfToday = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMs);

  return { startOfToday, endOfToday, dateStr };
}
