const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN');

export function formatVnd(amountInVnd: number): string {
  return vndFormatter.format(amountInVnd);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDate(date: Date | string | number): string {
  const value = typeof date === 'object' ? date : new Date(date);
  return dateFormatter.format(value);
}

/**
 * Formats a calendar date written `yyyy-mm-dd`. Such a string names a day, not an
 * instant, so it is built as a local date: `new Date('2027-03-01')` is midnight UTC,
 * which shows as the day before for a viewer west of Greenwich.
 */
export function formatDateOnly(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return dateFormatter.format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
