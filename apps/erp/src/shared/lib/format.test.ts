import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, formatVnd } from './format';

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
