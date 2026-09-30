// Dates for the leave specs. They are worked out from today, so the same specs pass
// on any day of any year: the seeded leave history runs to about 75 days from the day
// the browser was seeded, and every date here is further out than that.

const DAY_MS = 86_400_000;

// Public holidays that fall on the same date every year (month-day). Keep in step
// with the contract's FIXED_PUBLIC_HOLIDAYS; only used here to pick weeks without one.
const FIXED_HOLIDAYS = ['01-01', '04-30', '05-01', '09-02'];

/** A local calendar date as `yyyy-mm-dd`. */
export function dateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A `yyyy-mm-dd` date moved by whole days, across months and years. */
export function addDays(date: string, days: number): string {
  // Noon, so a daylight-saving change can't tip the result into the neighbouring day.
  const moved = new Date(`${date}T12:00:00`);
  moved.setDate(moved.getDate() + days);
  return dateOnly(moved);
}

/**
 * The year the specs file leave in: the first whose 1 March is more than 120 days
 * away, so its whole spring is clear of the seeded history.
 */
export function anchorYear(): number {
  const soonest = new Date(Date.now() + 120 * DAY_MS);
  const march = new Date(soonest.getFullYear(), 2, 1);
  return soonest > march ? soonest.getFullYear() + 1 : soonest.getFullYear();
}

export interface Week {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

/**
 * A Monday-to-Friday with no fixed public holiday in it, so exactly five working
 * days. Weeks are counted from 1 March of `anchorYear()`, skipping any that hold a
 * holiday: `freeWeek(0)` is the first, `freeWeek(1)` the next, and they never overlap.
 */
export function freeWeek(index = 0): Week {
  const start = new Date(anchorYear(), 2, 1, 12);
  // The first Monday on or after 1 March (Sunday is 0, Monday 1).
  start.setDate(start.getDate() + ((8 - start.getDay()) % 7));

  let mon = dateOnly(start);
  let found = 0;
  for (;;) {
    const week: Week = {
      mon,
      tue: addDays(mon, 1),
      wed: addDays(mon, 2),
      thu: addDays(mon, 3),
      fri: addDays(mon, 4),
      sat: addDays(mon, 5),
      sun: addDays(mon, 6),
    };
    const workdays = [week.mon, week.tue, week.wed, week.thu, week.fri];
    if (!workdays.some((day) => FIXED_HOLIDAYS.includes(day.slice(5)))) {
      if (found === index) return week;
      found += 1;
    }
    mon = addDays(mon, 7);
  }
}
