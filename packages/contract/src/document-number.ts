/** `PO-2026-000123` style numbering, matching the seeded stock-movement references from Phase 2. */
export function generateDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;
}
