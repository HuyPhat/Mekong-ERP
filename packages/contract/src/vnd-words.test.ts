import { describe, expect, it } from 'vitest';
import { vndToWords } from './vnd-words';

describe('vndToWords', () => {
  it('reads zero', () => {
    expect(vndToWords(0)).toBe('Không đồng');
  });

  it('reads single digits', () => {
    expect(vndToWords(1)).toBe('Một đồng');
    expect(vndToWords(5)).toBe('Năm đồng');
  });

  it('reads teens with mười/mười lăm', () => {
    expect(vndToWords(10)).toBe('Mười đồng');
    expect(vndToWords(11)).toBe('Mười một đồng');
    expect(vndToWords(15)).toBe('Mười lăm đồng');
  });

  it('reads tens with mốt/lăm substitutions', () => {
    expect(vndToWords(21)).toBe('Hai mươi mốt đồng');
    expect(vndToWords(25)).toBe('Hai mươi lăm đồng');
    expect(vndToWords(24)).toBe('Hai mươi bốn đồng');
    expect(vndToWords(20)).toBe('Hai mươi đồng');
  });

  it('reads hundreds, including the "linh" gap for a zero tens digit', () => {
    expect(vndToWords(100)).toBe('Một trăm đồng');
    expect(vndToWords(105)).toBe('Một trăm linh năm đồng');
    expect(vndToWords(120)).toBe('Một trăm hai mươi đồng');
  });

  it('pads non-leading groups with "không trăm"', () => {
    expect(vndToWords(1_005)).toBe('Một nghìn không trăm linh năm đồng');
    expect(vndToWords(1_015_000)).toBe('Một triệu không trăm mười lăm nghìn đồng');
  });

  it('reads thousands/millions/billions', () => {
    expect(vndToWords(1_000)).toBe('Một nghìn đồng');
    expect(vndToWords(1_200_000)).toBe('Một triệu hai trăm nghìn đồng');
    expect(vndToWords(2_500_000_000)).toBe('Hai tỷ năm trăm triệu đồng');
  });

  it('skips zero groups entirely', () => {
    expect(vndToWords(1_000_000)).toBe('Một triệu đồng');
  });

  it('reads negative amounts with an "Âm" prefix', () => {
    expect(vndToWords(-500)).toBe('Âm năm trăm đồng');
  });

  it('rounds non-integer input', () => {
    expect(vndToWords(999.6)).toBe('Một nghìn đồng');
    expect(vndToWords(1_000.6)).toBe('Một nghìn không trăm linh một đồng');
  });
});
