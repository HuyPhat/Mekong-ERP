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
