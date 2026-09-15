// Colombia (America/Bogota) is fixed at UTC-5 year-round (no DST), so day
// boundaries can be computed with plain UTC arithmetic — no dependency on the
// host machine/container's local timezone. Never use `new Date().getTimezoneOffset()`
// or date-fns' local-time helpers (startOfDay, endOfDay, etc.) for this: their
// result depends on the server's OS timezone, which caused services created
// after 7pm Bogotá (= after midnight UTC) to be bucketed into the wrong day.

const BOGOTA_OFFSET_HOURS = 5;

interface BogotaDateParts {
  year: number;
  month: number; // 0-11
  day: number;
}

function toBogotaDateParts(utcInstant: Date): BogotaDateParts {
  const shifted = new Date(utcInstant.getTime() - BOGOTA_OFFSET_HOURS * 3600000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** "YYYY-MM-DD" key for the Bogotá calendar day a UTC instant falls in. */
export function bogotaDateKey(utcInstant: Date): string {
  const { year, month, day } = toBogotaDateParts(utcInstant);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** [start, end) UTC instants spanning the given Bogotá calendar day. */
function bogotaDayRangeUtc(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month, day, BOGOTA_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day + 1, BOGOTA_OFFSET_HOURS, 0, 0, 0));
  return { start, end };
}

/** [start, end) UTC instants for "today" in Bogotá, evaluated at call time. */
export function bogotaTodayRangeUtc() {
  const { year, month, day } = toBogotaDateParts(new Date());
  return bogotaDayRangeUtc(year, month, day);
}

/** [start, end) UTC instants for the Bogotá calendar day named "YYYY-MM-DD". */
export function bogotaDateStringRangeUtc(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return bogotaDayRangeUtc(year, month - 1, day);
}

/** [start, end) UTC instants for the Mon-Sun Bogotá week containing "now". */
export function bogotaWeekRangeUtc() {
  const { year, month, day } = toBogotaDateParts(new Date());
  const anchor = new Date(Date.UTC(year, month, day));
  const dow = anchor.getUTCDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(Date.UTC(year, month, day + diffToMonday));
  const { start } = bogotaDayRangeUtc(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
  const { end } = bogotaDayRangeUtc(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6);
  return { start, end };
}

/** [start, end) UTC instants for the current Bogotá biweekly cut (1-15 / 16-end). */
export function bogotaBiweeklyRangeUtc() {
  const { year, month, day } = toBogotaDateParts(new Date());
  if (day <= 15) {
    const { start } = bogotaDayRangeUtc(year, month, 1);
    const { end } = bogotaDayRangeUtc(year, month, 15);
    return { start, end };
  }
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const { start } = bogotaDayRangeUtc(year, month, 16);
  const { end } = bogotaDayRangeUtc(year, month, lastDay);
  return { start, end };
}

/** [start, end) UTC instants for the current Bogotá calendar month. */
export function bogotaMonthRangeUtc() {
  const { year, month } = toBogotaDateParts(new Date());
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const { start } = bogotaDayRangeUtc(year, month, 1);
  const { end } = bogotaDayRangeUtc(year, month, lastDay);
  return { start, end };
}
