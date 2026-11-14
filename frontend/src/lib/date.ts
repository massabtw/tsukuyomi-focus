const LOCAL_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Formats a Date into YYYY-MM-DD using the user's local timezone.
 * Avoids UTC shifts around midnight.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD local date string at 12:00 local time to prevent DST shifts.
 */
export function parseLocalDate(dateStr: string): Date {
  const match = LOCAL_DATE_REGEX.exec(dateStr);
  if (!match) {
    return new Date();
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function addDays(dateStr: string, deltaDays: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + deltaDays);
  return formatLocalDate(date);
}

export function getYesterdayLocalDate(today: string = formatLocalDate()): string {
  return addDays(today, -1);
}

/**
 * Returns the whole-day difference (toDateStr - fromDateStr) in local calendar days.
 */
export function diffDaysLocal(fromDateStr: string, toDateStr: string): number {
  const from = parseLocalDate(fromDateStr);
  const to = parseLocalDate(toDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Builds an ordered list of the last N local calendar dates ending at endDateStr (inclusive).
 */
export function getLastNDays(
  days: number,
  endDateStr: string = formatLocalDate(),
): string[] {
  const result: string[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    result.push(addDays(endDateStr, -offset));
  }
  return result;
}

export function formatTimerClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatDurationHuman(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

const ptBrShortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDisplayDatePtBr(dateStr: string): string {
  return ptBrShortDateFormatter.format(parseLocalDate(dateStr));
}
