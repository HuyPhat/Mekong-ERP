import Papa from 'papaparse';

// A leading =, +, -, or @ can execute as a formula when the CSV is opened in
// Excel/Sheets. Prefix with an apostrophe (rendered as plain text) if unsafe.
const FORMULA_PREFIX_RE = /^[=+\-@]/;

export function sanitizeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return FORMULA_PREFIX_RE.test(str) ? `'${str}` : str;
}

export interface CsvColumn<TRow> {
  header: string;
  get: (row: TRow) => unknown;
}

export function exportCsv<TRow>(rows: TRow[], columns: CsvColumn<TRow>[], filename: string): void {
  const data = rows.map((row) => {
    const record: Record<string, string> = {};
    for (const column of columns) {
      record[column.header] = sanitizeCsvValue(column.get(row));
    }
    return record;
  });
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({ headers: result.meta.fields ?? [], rows: result.data });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export interface ImportRowResult<T> {
  rowNumber: number;
  raw: Record<string, string>;
  data?: T;
  errors?: string[];
}

export function validateImportRows<T>(
  rows: Record<string, string>[],
  parseRow: (raw: Record<string, string>) => { data: T } | { errors: string[] },
): ImportRowResult<T>[] {
  return rows.map((raw, index) => {
    const outcome = parseRow(raw);
    // Row numbers are 1-indexed and skip the header row, matching what a
    // human opening the file in a spreadsheet app would call "row N".
    const rowNumber = index + 2;
    if ('errors' in outcome) {
      return { rowNumber, raw, errors: outcome.errors };
    }
    return { rowNumber, raw, data: outcome.data };
  });
}
