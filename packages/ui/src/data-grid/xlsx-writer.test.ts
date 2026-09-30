import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import {
  buildXlsx,
  columnLetter,
  encodeCell,
  sanitizeSheetName,
  toExcelSerial,
  type XlsxSheetInput,
} from './xlsx-writer';
import { toSheetInput } from './xlsx-input';

function readParts(bytes: Uint8Array): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const [name, data] of Object.entries(unzipSync(bytes))) parts[name] = strFromU8(data);
  return parts;
}

// Local-time constructors: the writer reads the *local* wall clock, so these
// hold in any time zone the tests run in.
const localIso = (y: number, m: number, d: number, h = 0, mi = 0) =>
  new Date(y, m - 1, d, h, mi).toISOString();

describe('columnLetter', () => {
  it('maps indices to spreadsheet column names', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
    expect(columnLetter(51)).toBe('AZ');
    expect(columnLetter(52)).toBe('BA');
    expect(columnLetter(701)).toBe('ZZ');
    expect(columnLetter(702)).toBe('AAA');
    expect(columnLetter(16_383)).toBe('XFD'); // Excel's last column
  });
});

describe('sanitizeSheetName', () => {
  it('replaces forbidden characters and trims apostrophes', () => {
    expect(sanitizeSheetName('Q1/Q2: "plan"?')).toBe('Q1-Q2- "plan"-');
    expect(sanitizeSheetName("'quoted'")).toBe('quoted');
  });

  it('caps the length at 31 characters and never returns an empty name', () => {
    expect(sanitizeSheetName('x'.repeat(40))).toHaveLength(31);
    expect(sanitizeSheetName('   ')).toBe('Sheet1');
    expect(sanitizeSheetName('')).toBe('Sheet1');
  });
});

describe('toExcelSerial', () => {
  it('matches known Excel serials', () => {
    expect(toExcelSerial('2000-01-01', true)).toBe(36526);
    expect(toExcelSerial('2026-01-01', true)).toBe(46023);
    expect(toExcelSerial('1900-03-01', true)).toBe(61); // first date after Excel's phantom Feb 29
  });

  it('turns an instant into the local wall-clock time, with the time as a fraction', () => {
    expect(toExcelSerial(localIso(2000, 1, 1, 12), false)).toBe(36526.5);
    expect(toExcelSerial(localIso(2000, 1, 1, 18), false)).toBe(36526.75);
    expect(toExcelSerial(localIso(2000, 1, 1, 18), true)).toBe(36526); // date-only drops the time
    expect(toExcelSerial(new Date(2000, 0, 1, 6).getTime(), false)).toBe(36526.25);
  });

  it('never shifts a bare calendar date by the time zone', () => {
    // Parsed as an instant this would land on 31 Dec in any zone west of UTC.
    expect(toExcelSerial('2026-01-01', false)).toBe(46023);
  });

  it('refuses what is not a usable date', () => {
    expect(toExcelSerial('not a date', false)).toBeNull();
    expect(toExcelSerial(true, false)).toBeNull();
    expect(toExcelSerial('1899-12-31', true)).toBeNull();
    expect(toExcelSerial('1900-02-28', true)).toBeNull(); // before the reliable range
  });
});

describe('encodeCell', () => {
  it('writes nothing for an empty value', () => {
    expect(encodeCell('A2', null, 'text')).toBe('');
    expect(encodeCell('A2', undefined, 'money')).toBe('');
    expect(encodeCell('A2', '', 'date')).toBe('');
  });

  it('writes text as an inline string and escapes XML', () => {
    expect(encodeCell('A2', 'Trà <xanh> & "mật ong"', 'text')).toBe(
      '<c r="A2" s="0" t="inlineStr"><is><t>Trà &lt;xanh&gt; &amp; &quot;mật ong&quot;</t></is></c>',
    );
  });

  it('strips characters XML 1.0 forbids, which would corrupt the whole file', () => {
    expect(encodeCell('A2', 'a\u0000b\u000Bc\u001Fd', 'text')).toContain('<t>abcd</t>');
    // Tab, newline and carriage return are legal and kept.
    expect(encodeCell('A2', 'a\tb\nc', 'text')).toContain('<t>a\tb\nc</t>');
  });

  it('preserves leading and trailing whitespace', () => {
    expect(encodeCell('A2', ' padded ', 'text')).toContain('<t xml:space="preserve"> padded </t>');
  });

  it('keeps a formula-looking value inert: it is an inline string, never a formula', () => {
    const cell = encodeCell('A2', '=HYPERLINK("http://evil.example","x")', 'text');
    expect(cell).toContain('t="inlineStr"');
    expect(cell).not.toContain('<f>');
    expect(cell).toContain('=HYPERLINK(');
  });

  it("clips text to Excel's 32,767-character cell limit", () => {
    const cell = encodeCell('A2', 'x'.repeat(40_000), 'text');
    expect(cell.match(/x/g)).toHaveLength(32_767);
  });

  it('writes numbers with the style for their type', () => {
    expect(encodeCell('B2', 1250000, 'money')).toBe('<c r="B2" s="4"><v>1250000</v></c>');
    expect(encodeCell('B2', 42, 'integer')).toBe('<c r="B2" s="2"><v>42</v></c>');
    expect(encodeCell('B2', -0.5, 'decimal')).toBe('<c r="B2" s="3"><v>-0.5</v></c>');
    expect(encodeCell('B2', '1500', 'money')).toBe('<c r="B2" s="4"><v>1500</v></c>');
  });

  it('keeps unusable numbers as text instead of dropping the data', () => {
    expect(encodeCell('B2', 'n/a', 'money')).toContain('<t>n/a</t>');
    expect(encodeCell('B2', Number.NaN, 'integer')).toContain('<t>NaN</t>');
    expect(encodeCell('B2', Number.POSITIVE_INFINITY, 'decimal')).toContain('<t>Infinity</t>');
  });

  it('writes dates as serials and falls back to text for a bad date', () => {
    expect(encodeCell('C2', '2026-01-01', 'date')).toBe('<c r="C2" s="5"><v>46023</v></c>');
    expect(encodeCell('C2', localIso(2000, 1, 1, 12), 'datetime')).toBe(
      '<c r="C2" s="6"><v>36526.5</v></c>',
    );
    expect(encodeCell('C2', 'soon', 'date')).toContain('<t>soon</t>');
  });

  it('writes a boolean in a text column as a boolean cell, and as text elsewhere', () => {
    expect(encodeCell('D2', true, 'text')).toBe('<c r="D2" s="0" t="b"><v>1</v></c>');
    expect(encodeCell('D2', false, 'money')).toContain('<t>false</t>');
  });
});

describe('buildXlsx', () => {
  const input: XlsxSheetInput = {
    sheetName: 'Products',
    columns: [
      { header: 'SKU', type: 'text' },
      { header: 'Price', type: 'money' },
      { header: 'Created', type: 'date' },
    ],
    rows: [
      ['SKU-1', 1250000, '2026-01-01'],
      ['SKU-2', null, '2026-02-01'],
    ],
  };

  it('produces a ZIP with the parts of a minimal workbook', () => {
    const parts = readParts(buildXlsx(input));
    expect(Object.keys(parts).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ]);
  });

  it('writes a bold frozen header, filter buttons and the data range', () => {
    const sheet = readParts(buildXlsx(input))['xl/worksheets/sheet1.xml'] ?? '';
    expect(sheet).toContain('<dimension ref="A1:C3"/>');
    expect(sheet).toContain(
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    );
    expect(sheet).toContain('<autoFilter ref="A1:C3"/>');
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t>SKU</t></is></c>');
    expect(sheet).toContain('<c r="C1" s="1" t="inlineStr"><is><t>Created</t></is></c>');
  });

  it('places typed cells and omits empty ones', () => {
    const sheet = readParts(buildXlsx(input))['xl/worksheets/sheet1.xml'] ?? '';
    expect(sheet).toContain('<c r="A2" s="0" t="inlineStr"><is><t>SKU-1</t></is></c>');
    expect(sheet).toContain('<c r="B2" s="4"><v>1250000</v></c>');
    expect(sheet).toContain('<c r="C2" s="5"><v>46023</v></c>');
    expect(sheet).toContain('<c r="C3" s="5"><v>46054</v></c>');
    expect(sheet).not.toContain('r="B3"');
  });

  it('sizes columns from the content unless a width is given', () => {
    const wide: XlsxSheetInput = {
      sheetName: 'Widths',
      columns: [
        { header: 'Name', type: 'text' },
        { header: 'Fixed', type: 'text', width: 33 },
      ],
      rows: [['a much longer name than the header', 'x']],
    };
    const sheet = readParts(buildXlsx(wide))['xl/worksheets/sheet1.xml'] ?? '';
    expect(sheet).toContain('<col min="1" max="1" width="36" customWidth="1"/>');
    expect(sheet).toContain('<col min="2" max="2" width="33" customWidth="1"/>');
  });

  it('names the sheet, sanitized, and records the filter range', () => {
    // An apostrophe inside the name is legal but must be doubled in the range reference.
    const named = { ...input, sheetName: "Q1/Q2 o'brien" };
    const workbook = readParts(buildXlsx(named))['xl/workbook.xml'] ?? '';
    expect(workbook).toContain('<sheet name="Q1-Q2 o&apos;brien" sheetId="1" r:id="rId1"/>');
    expect(workbook).toContain(
      '<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">' +
        '&apos;Q1-Q2 o&apos;&apos;brien&apos;!$A$1:$C$3</definedName>',
    );
  });

  it('defines the VND and date formats the cell styles point at', () => {
    const styles = readParts(buildXlsx(input))['xl/styles.xml'] ?? '';
    expect(styles).toContain('formatCode="#,##0&quot; ₫&quot;"');
    expect(styles).toContain('formatCode="dd/mm/yyyy"');
    expect(styles).toContain('formatCode="dd/mm/yyyy hh:mm"');
    expect(styles).toContain('<cellXfs count="7">');
  });

  it('handles an empty result: just the header', () => {
    const sheet = readParts(buildXlsx({ ...input, rows: [] }))['xl/worksheets/sheet1.xml'] ?? '';
    expect(sheet).toContain('<dimension ref="A1:C1"/>');
    expect(sheet).toContain('<autoFilter ref="A1:C1"/>');
  });

  it('builds a large sheet', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) => [`row ${i}`, i, '2026-01-01']);
    const sheet = readParts(buildXlsx({ ...input, rows }))['xl/worksheets/sheet1.xml'] ?? '';
    expect(sheet).toContain('<dimension ref="A1:C20001"/>');
    expect(sheet).toContain('<c r="B20001" s="4"><v>19999</v></c>');
  });

  it("rejects what Excel can't hold", () => {
    expect(() => buildXlsx({ ...input, columns: [] })).toThrow(RangeError);
    expect(() => buildXlsx({ ...input, rows: new Array<never>(1_048_576) })).toThrow(RangeError);
  });
});

describe('toSheetInput', () => {
  interface Row {
    sku: string;
    price: number;
    at: Date;
    note: { text: string } | null;
  }
  const rows: Row[] = [
    { sku: 'A', price: 100, at: new Date(2026, 0, 1, 8), note: { text: 'hi' } },
    { sku: 'B', price: 200, at: new Date(Number.NaN), note: null },
  ];

  it('maps rows through the column getters, defaulting to text', () => {
    const sheet = toSheetInput(
      rows,
      [
        { header: 'SKU', get: (r) => r.sku },
        { header: 'Price', get: (r) => r.price, type: 'money', width: 14 },
        { header: 'At', get: (r) => r.at, type: 'datetime' },
        { header: 'Note', get: (r) => r.note },
      ],
      { sheetName: 'Rows' },
    );
    expect(sheet.sheetName).toBe('Rows');
    expect(sheet.columns).toEqual([
      { header: 'SKU', type: 'text', width: undefined },
      { header: 'Price', type: 'money', width: 14 },
      { header: 'At', type: 'datetime', width: undefined },
      { header: 'Note', type: 'text', width: undefined },
    ]);
    // Dates become ISO strings, invalid dates and null become null, objects become text.
    expect(sheet.rows[0]).toEqual([
      'A',
      100,
      new Date(2026, 0, 1, 8).toISOString(),
      '[object Object]',
    ]);
    expect(sheet.rows[1]).toEqual(['B', 200, null, null]);
  });

  it('defaults the sheet name', () => {
    expect(toSheetInput(rows, [{ header: 'SKU', get: (r) => r.sku }]).sheetName).toBe('Sheet1');
  });
});
