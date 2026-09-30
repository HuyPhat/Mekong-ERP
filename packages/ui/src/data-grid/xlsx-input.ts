import type { XlsxColumnType, XlsxSheetInput, XlsxValue } from './xlsx-writer';

export type { XlsxColumnType } from './xlsx-writer';

/**
 * A superset of `CsvColumn`, so one column list can feed both exports.
 * `type` picks the cell format (VND, date, …); it defaults to text.
 */
export interface XlsxColumn<TRow> {
  header: string;
  get: (row: TRow) => unknown;
  type?: XlsxColumnType | undefined;
  /** Width in characters; estimated from the content when omitted. */
  width?: number | undefined;
}

export interface ExportXlsxOptions {
  sheetName?: string | undefined;
}

/** Reduces whatever a column getter returns to something a worker can be sent. */
export function normalizeValue(value: unknown): XlsxValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return String(value);
}

/** Pure mapping from typed rows to the plain data the writer takes. */
export function toSheetInput<TRow>(
  rows: TRow[],
  columns: XlsxColumn<TRow>[],
  options: ExportXlsxOptions = {},
): XlsxSheetInput {
  return {
    sheetName: options.sheetName ?? 'Sheet1',
    columns: columns.map((column) => ({
      header: column.header,
      type: column.type ?? 'text',
      width: column.width,
    })),
    rows: rows.map((row) => columns.map((column) => normalizeValue(column.get(row)))),
  };
}
