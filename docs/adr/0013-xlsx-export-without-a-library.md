# ADR-0013: XLSX export is written in-house on fflate

Status: Accepted
Date: 2026-09-30

## Context

CSV export shipped in Phase 2; Excel export was deferred to Phase 6 (PLAN.md
§12). The obvious route is an XLSX library, and `write-excel-file` 4.1.1 (MIT,
about 70 kB minified, loaded lazily) was approved as the candidate.

It does not work under this app's CSP. Measured in Chromium, with the app's
exact `Content-Security-Policy` (`worker-src 'self'`):

| Rows exported | Result                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| 100           | Works (about 4 kB file).                                                            |
| 5,000         | Never finishes. No rejection, no message; two `worker-src blocked blob` violations. |

Its browser build zips with fflate's asynchronous API, which starts a `blob:` Web
Worker for any file over 160 kB. The CSP blocks the worker, fflate doesn't
handle the failure, and the promise stays pending forever — the user clicks
"Export" and nothing happens. The package exposes no synchronous option.

## Decision

Write the workbook ourselves (`packages/ui/src/data-grid/xlsx-writer.ts`, about
250 lines) and zip it with fflate's **synchronous** `zipSync`, which needs no
worker. To keep the page responsive, `exportXlsx()` builds the file in a
**same-origin** worker script (`xlsx-worker.ts`, which `worker-src 'self'`
allows) and falls back to the main thread if a worker can't start. Everything
loads only when an export is requested.

`fflate` becomes a direct dependency of `packages/ui` (MIT, about 8 kB gzip; it
is what `write-excel-file` uses underneath).

## Options considered

- **Keep `write-excel-file` and allow `blob:` in `worker-src`.** Least code and
  battle-tested output, but it loosens a CSP the README and SECURITY.md describe
  as strict, and a blocked worker still fails silently in any stricter context.
- **`exceljs`.** Uses jszip (no workers) and is full-featured, but is a ~1 MB lazy
  chunk with no release since December 2024.
- **SheetJS `xlsx` from npm.** The npm package is stale and has known
  vulnerabilities; fixed versions are only distributed from SheetJS's own CDN.

## What the writer does

One sheet with typed cells (text, integer, decimal, VND, date, date-time), a bold
frozen header row, filter buttons, and column widths sized from a sample of the
content. Money is a real number with the format `#,##0 "₫"`, so it sums in
Excel; dates are real dates in `dd/mm/yyyy`. Instants are written as the local
wall-clock time (what the grid shows); a bare `yyyy-mm-dd` is never shifted by
the time zone. Text is written as inline strings, so a value such as
`=HYPERLINK(...)` stays inert — unlike CSV, it needs no apostrophe prefix. Control
characters XML forbids are stripped, cells are clipped at Excel's 32,767
characters, and a value that doesn't fit its column type (`"n/a"` in a money
column) is kept as text rather than dropped.

## Consequences

- **The strict CSP is unchanged**, and a regression spec guards it: the e2e suite
  requires the export to be built by the same-origin `xlsx-worker` script, and a
  100,000-row movements export must complete — the case that hung with the library.
- **Verified against two independent readers**, openpyxl and SheetJS: sheet name,
  frozen pane, autofilter, widths, number formats and date-times all read back
  correctly, and well-formedness of every XML part was checked. **It was not opened
  in desktop Excel**, which was unavailable; the file follows the same minimal
  structure those tools write, but that is not proof.
- **We own the format.** Not supported: formulas, several sheets, styles beyond the
  header, dates before 1900-03-01 (Excel's phantom 29 February makes earlier serials
  unreliable), and more than 1,048,575 rows (a `RangeError`).
- The toolbar's export buttons are now disabled while a grid is loading or errored:
  exporting mid-load produced a header-only file (a bug for CSV too).
- Initial JS grew by about 0.9 kB (the button and the row mapping); the writer and
  fflate are separate lazy chunks.
