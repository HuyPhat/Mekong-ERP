import { downloadBlob } from './download';
import { toSheetInput, type ExportXlsxOptions, type XlsxColumn } from './xlsx-input';
import type { XlsxWorkerResult } from './xlsx-worker';
import type { XlsxSheetInput } from './xlsx-writer';

export type { ExportXlsxOptions, XlsxColumn, XlsxColumnType } from './xlsx-input';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function buildInWorker(input: XlsxSheetInput): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./xlsx-worker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    worker.onmessage = (event: MessageEvent<XlsxWorkerResult>) => {
      worker.terminate();
      if ('ok' in event.data) resolve(event.data.ok);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'The XLSX worker failed to run.'));
    };
    worker.postMessage(input);
  });
}

async function buildOnMainThread(input: XlsxSheetInput): Promise<Uint8Array> {
  const { buildXlsx } = await import('./xlsx-writer');
  return buildXlsx(input);
}

/**
 * Downloads `rows` as a single-sheet .xlsx: typed cells, a frozen bold header
 * and filter buttons. The file is built in a worker so a large export doesn't
 * freeze the page; if a worker can't run, it is built on the main thread
 * instead. The writer (and fflate) load only when an export is requested.
 */
export async function exportXlsx<TRow>(
  rows: TRow[],
  columns: XlsxColumn<TRow>[],
  filename: string,
  options: ExportXlsxOptions = {},
): Promise<void> {
  const input = toSheetInput(rows, columns, options);
  let bytes: Uint8Array;
  try {
    bytes = await buildInWorker(input);
  } catch {
    bytes = await buildOnMainThread(input);
  }
  // Copy into a plain ArrayBuffer-backed view, which is what Blob's types accept.
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: XLSX_MIME_TYPE }), filename);
}
