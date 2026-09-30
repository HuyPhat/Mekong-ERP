// Runs the XLSX build off the main thread. It is a same-origin script, so the
// app's `worker-src 'self'` allows it (unlike the `blob:` workers XLSX libraries
// spawn). The DOM lib has no DedicatedWorkerGlobalScope, so type just what is used.
import { buildXlsx, type XlsxSheetInput } from './xlsx-writer';

export type XlsxWorkerResult = { ok: Uint8Array } | { error: string };

interface XlsxWorkerScope {
  onmessage: ((event: MessageEvent<XlsxSheetInput>) => void) | null;
  postMessage: (message: XlsxWorkerResult, transfer: Transferable[]) => void;
}

const scope = self as unknown as XlsxWorkerScope;

scope.onmessage = (event) => {
  try {
    const bytes = buildXlsx(event.data);
    // Hand the buffer over rather than copying what can be tens of megabytes.
    scope.postMessage({ ok: bytes }, [bytes.buffer]);
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : String(error) }, []);
  }
};
