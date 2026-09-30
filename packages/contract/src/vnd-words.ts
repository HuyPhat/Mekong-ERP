// Vietnamese number-to-words for the mock e-invoice's "total in words" line
// (PLAN.md §6 — clearly a DEMO, not a legally-reviewed compliance tool).
// Scoped to individual document totals: four group tiers (units/nghìn/
// triệu/tỷ) comfortably cover any realistic invoice amount without taking on
// the genuinely rare/ambiguous naming conventions above "tỷ".

const ONES = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUP_UNITS = ['', ' nghìn', ' triệu', ' tỷ'];

function readThreeDigits(value: number, isLeadingGroup: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} trăm`);
  } else if (!isLeadingGroup) {
    parts.push('không trăm');
  }

  if (tens === 0) {
    if (ones > 0 && parts.length > 0) parts.push('linh');
    if (ones > 0) parts.push(ONES[ones] ?? '');
  } else if (tens === 1) {
    parts.push('mười');
    if (ones === 1) parts.push('một');
    else if (ones === 5) parts.push('lăm');
    else if (ones > 0) parts.push(ONES[ones] ?? '');
  } else {
    parts.push(`${ONES[tens]} mươi`);
    if (ones === 1) parts.push('mốt');
    else if (ones === 5) parts.push('lăm');
    else if (ones > 0) parts.push(ONES[ones] ?? '');
  }

  return parts.join(' ');
}

/** Converts an integer VND amount to Vietnamese words, e.g. 1_200_000 -> "Một triệu hai trăm nghìn đồng". */
export function vndToWords(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Không đồng';

  const isNegative = rounded < 0;
  let remaining = Math.abs(rounded);
  const groups: number[] = [];
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const value = groups[i];
    if (!value) continue;
    const groupIndexFromEnd = groups.length - 1 - i;
    const groupWords = readThreeDigits(value, words.length === 0);
    words.push(`${groupWords}${GROUP_UNITS[groupIndexFromEnd] ?? ''}`);
  }

  const magnitude = words.join(' ');
  const sentence = isNegative ? `âm ${magnitude}` : magnitude;
  const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return `${capitalized} đồng`;
}
