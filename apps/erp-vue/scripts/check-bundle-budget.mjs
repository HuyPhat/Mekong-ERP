// Fails the build if the initial-load payload grows past the budget.
// "Initial load" = the entry script, its modulepreloaded chunks, and the CSS
// linked from index.html, measured gzipped — i.e. what a first visit must
// download before anything renders. Lazily imported route chunks, MSW and the
// seed generators are deliberately outside it.
/* global process, URL, console */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const BUDGET_JS_KB = Number(process.env.BUDGET_JS_KB ?? 150);
const BUDGET_CSS_KB = Number(process.env.BUDGET_CSS_KB ?? 20);

const html = readFileSync(`${DIST}index.html`, 'utf8');
const assets = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(js|css))"/g)].map((m) => ({
  file: m[1],
  kind: m[2],
}));

let js = 0;
let css = 0;
for (const { file, kind } of assets) {
  const gz = gzipSync(readFileSync(`${DIST}${file}`), { level: 9 }).length;
  if (kind === 'js') js += gz;
  else css += gz;
}
const kb = (bytes) => (bytes / 1024).toFixed(1);
console.log(`initial JS  ${kb(js)} kB gzip (budget ${BUDGET_JS_KB} kB)`);
console.log(`initial CSS ${kb(css)} kB gzip (budget ${BUDGET_CSS_KB} kB)`);

if (js > BUDGET_JS_KB * 1024 || css > BUDGET_CSS_KB * 1024) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
