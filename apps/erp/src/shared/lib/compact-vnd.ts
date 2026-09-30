const compactFormatter = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Short axis-label form of a VND amount (e.g. "1,2 Tr") — full precision belongs in tooltips/cells via formatVnd. */
export function formatVndCompact(amount: number): string {
  return compactFormatter.format(amount);
}
