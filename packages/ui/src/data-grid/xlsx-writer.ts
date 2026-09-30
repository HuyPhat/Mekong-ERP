// A small, dependency-light writer for single-sheet .xlsx files (OOXML
// SpreadsheetML in a ZIP). It exists instead of an XLSX library because the
// browser builds of those compress big sheets in a `blob:` Web Worker, which the
// app's CSP (`worker-src 'self'`) blocks — the export then never finishes and
// nothing rejects. `zipSync` needs no worker, so the whole thing runs under the
// strict CSP, and `xlsx-worker.ts` runs it off the main thread from a
// same-origin script.
//
// Pure and framework-agnostic: no DOM, so it is unit-tested in Node.
import { strToU8, zipSync } from 'fflate';

export type XlsxColumnType = 'text' | 'integer' | 'decimal' | 'money' | 'date' | 'datetime';

export interface XlsxColumnSpec {
  header: string;
  type: XlsxColumnType;
  /** Width in characters; estimated from the content when omitted. */
  width?: number | undefined;
}

export type XlsxValue = string | number | boolean | null | undefined;

export interface XlsxSheetInput {
  sheetName: string;
  columns: XlsxColumnSpec[];
  rows: XlsxValue[][];
}

// Excel's hard limits: 16,384 columns, 1,048,576 rows (header included),
// 32,767 characters per cell, 31 characters per sheet name.
const MAX_COLUMNS = 16_384;
const MAX_ROWS = 1_048_576;
const MAX_CELL_CHARS = 32_767;
const MAX_SHEET_NAME_CHARS = 31;

// Cell style indices, matching the <cellXfs> order in STYLES_XML.
const STYLE_TEXT = 0;
const STYLE_HEADER = 1;
const STYLE_BY_TYPE: Record<XlsxColumnType, number> = {
  text: STYLE_TEXT,
  integer: 2,
  decimal: 3,
  money: 4,
  date: 5,
  datetime: 6,
};

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

const CONTENT_TYPES_XML =
  XML_DECLARATION +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const ROOT_RELS_XML =
  XML_DECLARATION +
  `<Relationships xmlns="${NS_PKG_REL}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
  '</Relationships>';

const WORKBOOK_RELS_XML =
  XML_DECLARATION +
  `<Relationships xmlns="${NS_PKG_REL}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>` +
  '</Relationships>';

// Number formats: 3 and 4 are Excel built-ins (#,##0 and #,##0.00). The rest
// are custom and locale-independent — Excel renders the grouping separator
// according to the viewer's regional settings, and dates use a fixed
// dd/mm/yyyy so they read the same as in the app.
const STYLES_XML =
  XML_DECLARATION +
  `<styleSheet xmlns="${NS_MAIN}">` +
  '<numFmts count="3">' +
  '<numFmt numFmtId="164" formatCode="#,##0&quot; ₫&quot;"/>' +
  '<numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>' +
  '<numFmt numFmtId="166" formatCode="dd/mm/yyyy hh:mm"/>' +
  '</numFmts>' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F6"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="7">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
  '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** 0 → A, 25 → Z, 26 → AA, 701 → ZZ, 702 → AAA. */
export function columnLetter(index: number): string {
  let n = index;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}

// XML 1.0 forbids most C0 control characters (only tab, LF and CR are legal);
// one stray character makes Excel report the whole file as corrupt.
// eslint-disable-next-line no-control-regex -- matching exactly those characters is the point
const ILLEGAL_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function escapeXml(text: string): string {
  return text
    .replace(ILLEGAL_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Excel forbids `\ / ? * [ ] :`, a leading or trailing apostrophe, and names over 31 characters. */
export function sanitizeSheetName(name: string): string {
  const cleaned = name
    .replace(/[\\/?*[\]:]/g, '-')
    .replace(/^'+|'+$/g, '')
    .trim()
    .slice(0, MAX_SHEET_NAME_CHARS);
  return cleaned === '' ? 'Sheet1' : cleaned;
}

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const FIRST_RELIABLE_SERIAL = 61; // 1900-03-01
const MS_PER_DAY = 86_400_000;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converts a value to an Excel serial date, or null if it isn't a usable date.
 *
 * Instants (ISO strings with a time, epoch milliseconds) become the wall-clock
 * time in the *local* time zone, so the sheet shows what the grid shows. A bare
 * `yyyy-mm-dd` is a calendar date, not an instant, and is never shifted by the
 * time zone. Serials before 61 (1900-03-01) are refused: Excel counts a
 * non-existent 1900-02-29, so dates before it can't be mapped reliably.
 */
export function toExcelSerial(value: string | number | boolean, dateOnly: boolean): number | null {
  if (typeof value === 'boolean') return null;
  let utcMs: number;
  const bare = typeof value === 'string' ? DATE_ONLY_RE.exec(value) : null;
  if (bare) {
    utcMs = Date.UTC(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]));
  } else {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    utcMs = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    );
  }
  const serial = (utcMs - EXCEL_EPOCH_UTC_MS) / MS_PER_DAY;
  // Also rejects Date.UTC's remapping of years 0-99 to 1900-1999.
  if (!Number.isFinite(serial) || serial < FIRST_RELIABLE_SERIAL) return null;
  return dateOnly ? Math.floor(serial) : serial;
}

function textCell(ref: string, text: string, style: number): string {
  const clipped = text.length > MAX_CELL_CHARS ? text.slice(0, MAX_CELL_CHARS) : text;
  const preserve = /^\s|\s$/.test(clipped) ? ' xml:space="preserve"' : '';
  // An inline string is text, never a formula: a value such as "=HYPERLINK(...)"
  // stays inert here, unlike in a CSV, so it needs no apostrophe prefix.
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t${preserve}>${escapeXml(clipped)}</t></is></c>`;
}

/** Returns the cell's XML, or '' for an empty value (Excel treats a missing cell as blank). */
export function encodeCell(ref: string, value: XlsxValue, type: XlsxColumnType): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean' && type === 'text') {
    return `<c r="${ref}" s="${STYLE_TEXT}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  switch (type) {
    case 'text':
      return textCell(ref, String(value), STYLE_TEXT);
    case 'integer':
    case 'decimal':
    case 'money': {
      const n = typeof value === 'number' ? value : Number(value);
      // Keep the original text rather than drop data from a numeric column ("n/a").
      if (typeof value === 'boolean' || !Number.isFinite(n)) {
        return textCell(ref, String(value), STYLE_TEXT);
      }
      return `<c r="${ref}" s="${STYLE_BY_TYPE[type]}"><v>${n}</v></c>`;
    }
    case 'date':
    case 'datetime': {
      const serial = toExcelSerial(value, type === 'date');
      if (serial === null) return textCell(ref, String(value), STYLE_TEXT);
      return `<c r="${ref}" s="${STYLE_BY_TYPE[type]}"><v>${serial}</v></c>`;
    }
  }
}

function displayLength(value: XlsxValue, type: XlsxColumnType): number {
  if (value === null || value === undefined || value === '') return 0;
  switch (type) {
    case 'text':
      // Only the longest line matters: multi-line text isn't wrapped.
      return Math.max(
        ...String(value)
          .split('\n')
          .map((line) => line.length),
      );
    case 'integer':
    case 'decimal':
    case 'money': {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value).length;
      const digits = String(Math.trunc(Math.abs(n))).length;
      const grouping = Math.floor((digits - 1) / 3);
      return (
        digits +
        grouping +
        (n < 0 ? 1 : 0) +
        (type === 'decimal' ? 3 : 0) +
        (type === 'money' ? 2 : 0)
      );
    }
    case 'date':
      return 10;
    case 'datetime':
      return 16;
  }
}

function estimateWidth(column: XlsxColumnSpec, rows: XlsxValue[][], index: number): number {
  if (column.width !== undefined) return column.width;
  // A sample is enough: this is a cosmetic default, and 100k rows shouldn't cost a full scan.
  const sample = Math.min(rows.length, 2000);
  let widest = column.header.length + 2; // the bold header, plus room for the filter button
  for (let i = 0; i < sample; i += 1) {
    const value = rows[i]?.[index];
    widest = Math.max(widest, displayLength(value, column.type));
  }
  return Math.min(Math.max(Math.ceil(widest + 2), 8), 60);
}

function buildSheetXml(input: XlsxSheetInput): string {
  const { columns, rows } = input;
  const lastColumn = columnLetter(columns.length - 1);
  const ref = `A1:${lastColumn}${rows.length + 1}`;

  const parts: string[] = [
    XML_DECLARATION,
    `<worksheet xmlns="${NS_MAIN}">`,
    `<dimension ref="${ref}"/>`,
    // Freeze the header row so it stays visible while scrolling.
    '<sheetViews><sheetView tabSelected="1" workbookViewId="0">' +
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
      '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>',
    '<sheetFormatPr defaultRowHeight="15"/>',
    '<cols>',
  ];
  columns.forEach((column, index) => {
    const width = estimateWidth(column, rows, index);
    parts.push(`<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`);
  });
  parts.push('</cols><sheetData>');

  parts.push('<row r="1">');
  columns.forEach((column, index) => {
    parts.push(textCell(`${columnLetter(index)}1`, column.header, STYLE_HEADER));
  });
  parts.push('</row>');

  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    parts.push(`<row r="${rowNumber}">`);
    columns.forEach((column, index) => {
      parts.push(encodeCell(`${columnLetter(index)}${rowNumber}`, row[index], column.type));
    });
    parts.push('</row>');
  });

  parts.push('</sheetData>');
  parts.push(`<autoFilter ref="${ref}"/>`);
  parts.push('</worksheet>');
  return parts.join('');
}

function buildWorkbookXml(sheetName: string, ref: string): string {
  const absolute = ref.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2');
  const quotedName = `'${sheetName.replace(/'/g, "''")}'`;
  return (
    XML_DECLARATION +
    `<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
    '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="17600"/></bookViews>' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    // Excel records an autofilter's range here too; keeping it makes the
    // filter buttons behave as if the sheet had been saved by Excel.
    `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(quotedName)}!${absolute}</definedName></definedNames>` +
    '</workbook>'
  );
}

/** Builds a single-sheet workbook: bold frozen header, autofilter, typed cells. */
export function buildXlsx(input: XlsxSheetInput): Uint8Array {
  const { columns, rows } = input;
  if (columns.length === 0) throw new RangeError('An XLSX sheet needs at least one column.');
  if (columns.length > MAX_COLUMNS) {
    throw new RangeError(`An XLSX sheet holds at most ${MAX_COLUMNS} columns.`);
  }
  if (rows.length + 1 > MAX_ROWS) {
    throw new RangeError(`An XLSX sheet holds at most ${MAX_ROWS - 1} data rows.`);
  }

  const sheetName = sanitizeSheetName(input.sheetName);
  const ref = `A1:${columnLetter(columns.length - 1)}${rows.length + 1}`;
  return zipSync(
    {
      '[Content_Types].xml': strToU8(CONTENT_TYPES_XML),
      '_rels/.rels': strToU8(ROOT_RELS_XML),
      'xl/workbook.xml': strToU8(buildWorkbookXml(sheetName, ref)),
      'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS_XML),
      'xl/styles.xml': strToU8(STYLES_XML),
      'xl/worksheets/sheet1.xml': strToU8(buildSheetXml({ ...input, sheetName })),
    },
    { level: 6 },
  );
}
