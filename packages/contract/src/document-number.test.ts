import { describe, expect, it } from 'vitest';
import { generateDocumentNumber } from './document-number';

describe('generateDocumentNumber', () => {
  it('zero-pads the sequence to six digits', () => {
    expect(generateDocumentNumber('PO', 2026, 123)).toBe('PO-2026-000123');
    expect(generateDocumentNumber('INV', 2025, 1)).toBe('INV-2025-000001');
  });

  it('does not truncate sequences longer than six digits', () => {
    expect(generateDocumentNumber('JE', 2026, 1234567)).toBe('JE-2026-1234567');
  });
});
