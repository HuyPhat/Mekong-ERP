import { describe, expect, it } from 'vitest';
import { formatDate, formatDateOnly, formatNumber, formatVnd } from './format';

const NO_BREAK_SPACE = String.fromCharCode(0xa0);

// Intl inserts a no-break space before the currency symbol, which is visually
// indistinguishable from a regular space in source/terminal output.
function withRegularSpaces(value: string): string {
  return value.split(NO_BREAK_SPACE).join(' ');
}

describe('formatVnd', () => {
  it('formats an integer VND amount with vi-VN grouping and the ₫ symbol', () => {
    expect(withRegularSpaces(formatVnd(1_250_000))).toBe('1.250.000 ₫');
  });

  it('never emits decimals, even for a non-integer input', () => {
    expect(formatVnd(1_250_000.9)).not.toContain(',');
  });

  it('formats zero', () => {
    expect(withRegularSpaces(formatVnd(0))).toBe('0 ₫');
  });
});

describe('formatNumber', () => {
  it('uses vi-VN grouping (dot) and decimal (comma) separators', () => {
    expect(formatNumber(1_234_567.5)).toBe('1.234.567,5');
  });
});

describe('formatDate', () => {
  it('formats a Date, an ISO string, and a timestamp identically', () => {
    const iso = '2026-03-05T00:00:00Z';
    const fromDate = formatDate(new Date(iso));
    const fromString = formatDate(iso);
    const fromTimestamp = formatDate(new Date(iso).getTime());
    expect(fromString).toBe(fromDate);
    expect(fromTimestamp).toBe(fromDate);
  });
});

describe('formatDateOnly', () => {
  it('formats a calendar date the way formatDate does, day first', () => {
    expect(formatDateOnly('2027-03-01')).toBe('1/3/2027');
    expect(formatDateOnly('2027-12-31')).toBe('31/12/2027');
  });

  // The day must be the one written, in any time zone: `new Date('2027-03-01')` is
  // midnight UTC and reads as 28 February for a viewer in the Americas. The suite is
  // also run under such a zone (TZ=America/Los_Angeles) to see this bite.
  it("never moves the day, whatever the viewer's time zone", () => {
    expect(formatDateOnly('2027-01-01')).toBe('1/1/2027');
  });

  it('hands back anything that is not a yyyy-mm-dd date unchanged', () => {
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('1/3/2027')).toBe('1/3/2027');
  });
});
