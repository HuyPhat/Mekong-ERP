// Numbers and dates are shown the Vietnamese way whatever language the words are in,
// as in the React app.
const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat('vi-VN');

export function formatVnd(amountInVnd: number): string {
  return vnd.format(amountInVnd);
}

/** An instant, shown as a date in the viewer's time zone. */
export function formatDate(value: string | number | Date): string {
  return date.format(typeof value === 'object' ? value : new Date(value));
}

/**
 * A calendar date written `yyyy-mm-dd`. It names a day, not an instant, so it is built
 * as a local date: `new Date('2027-03-01')` is midnight UTC and reads as the day before
 * for a viewer in the Americas.
 */
export function formatDateOnly(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return date.format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** A day (`yyyy-mm-dd`) or an instant, whichever the API sent for a date. */
export function formatDay(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateOnly(value) : formatDate(value);
}
