import { describe, expect, it } from 'vitest';
import { formatDate, formatDateOnly, formatDay, formatVnd } from './format';

// Intl puts a no-break space before the currency symbol.
const plain = (value: string) => value.replaceAll(String.fromCharCode(0xa0), ' ');

describe('formatVnd', () => {
  it('groups thousands the Vietnamese way and never shows decimals', () => {
    expect(plain(formatVnd(1_250_000))).toBe('1.250.000 ₫');
    expect(plain(formatVnd(0))).toBe('0 ₫');
    expect(formatVnd(1_250_000.9)).not.toContain(',');
  });
});

describe('formatDateOnly', () => {
  it('writes a calendar date day first', () => {
    expect(formatDateOnly('2027-03-01')).toBe('1/3/2027');
    expect(formatDateOnly('2027-12-31')).toBe('31/12/2027');
  });

  // new Date('2027-01-01') is midnight UTC, which reads as 31/12/2026 west of Greenwich.
  // The suite is also run under such a zone (TZ=America/Los_Angeles) to see it bite.
  it('never moves the day, whatever the viewer’s time zone', () => {
    expect(formatDateOnly('2027-01-01')).toBe('1/1/2027');
  });

  it('hands back anything that is not a yyyy-mm-dd date unchanged', () => {
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('1/3/2027')).toBe('1/3/2027');
  });
});

describe('formatDate', () => {
  it('formats an instant as a date', () => {
    expect(formatDate(new Date(2026, 8, 30, 12))).toBe('30/9/2026');
    expect(formatDate(new Date(2026, 0, 5, 12).toISOString())).toBe('5/1/2026');
  });
});

describe('formatDay', () => {
  it('treats a yyyy-mm-dd string as a day and anything else as an instant', () => {
    expect(formatDay('2027-03-01')).toBe('1/3/2027');
    expect(formatDay(new Date(2026, 8, 30, 12).toISOString())).toBe('30/9/2026');
  });
});
