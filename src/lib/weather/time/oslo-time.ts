const OSLO_TIME_ZONE = "Europe/Oslo";

// en-CA formats as YYYY-MM-DD, which is what we want as a sortable,
// comparable calendar-day key. Intl.DateTimeFormat with an explicit
// timeZone is DST-aware by construction, so this needs no manual offset
// handling (ADR-007).
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: OSLO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Europe/Oslo calendar date for a UTC instant, as YYYY-MM-DD. */
export function toOsloDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

/**
 * The next `count` distinct Europe/Oslo calendar-day keys starting from
 * `startDate`'s own day (inclusive). Stepping the cursor by 24 real hours at
 * a time is safe across a DST transition: a later UTC instant never maps to
 * an earlier Oslo date, it only ever stays on the same date or advances, so
 * this can't skip or repeat a day out of order.
 */
export function nextOsloDateKeys(startDate: Date, count: number): string[] {
  const keys: string[] = [];
  let cursor = new Date(startDate);

  while (keys.length < count) {
    const key = toOsloDateKey(cursor);
    if (keys[keys.length - 1] !== key) {
      keys.push(key);
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return keys;
}
