// Run tests/photo-regression.js in headless Chrome (fresh profile) against the
// app at http://localhost:8741 (preview "loto-testflight").
//   node run_suite.mjs                     full suite, web (IndexedDB)
//   NATIVE_MOCK=1 node run_suite.mjs       full suite through the in-memory native filesystem
//   ONLY=t100,t101 node run_suite.mjs      selected tests (function-name prefixes)
//   SKIP_SCALE=1 …                         without the 500-entry scale test
// PORT = CDP port (default 9730). Exit code 0 = every test passed.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = +(process.env.PORT || 9730);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const prof = mkdtempSync(path.join(tmpdir(), 'lotosuite-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1180,820', 'about:blank'], { stdio: 'ignore' });
let code = 1;
try {
  let ws;
  for (let i = 0; i < 80 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch (e) {} if (!ws) await sleep(250); }
  const sock = new WebSocket(ws); let id = 0; const pend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: (process.env.APP_BASE || 'http://localhost:8741') + '/index.html?suite=' + Date.now() });
  await sleep(4500);
  await send('Runtime.evaluate', { expression: `new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/tests/photo-regression.js?v=' + Date.now(); s.onload = res; s.onerror = rej; document.body.appendChild(s); })`, awaitPromise: true });
  const opts = { iUnderstandThisErasesAllData: true };
  if (process.env.NATIVE_MOCK) opts.nativeMock = true;
  if (process.env.SKIP_SCALE) opts.skipScale = true;
  if (process.env.ONLY) opts.only = process.env.ONLY.split(',');
  const t0 = Date.now();
  const r = await send('Runtime.evaluate', { expression: `runPhotoRegressionSuite(${JSON.stringify(opts)}).then(s => JSON.stringify(s))`, awaitPromise: true, returnByValue: true, timeout: 1800000 });
  const v = r.result && r.result.result && r.result.result.value;
  if (!v) { console.log('SUITE ERROR', JSON.stringify(r).slice(0, 1500)); }
  else {
    const s = JSON.parse(v);
    for (const x of s.results) if (!x.pass || process.env.VERBOSE) console.log((x.pass ? 'PASS ' : 'FAIL ') + x.name + (x.pass && !process.env.VERBOSE ? '' : '  ::  ' + x.detail));
    console.log(`${s.mode}: ${s.pass} pass / ${s.fail} fail (${s.results.length} results) in ${Math.round((Date.now() - t0) / 1000)} s`);
    code = s.fail ? 1 : 0;
  }
  sock.close();
} finally { chrome.kill('SIGKILL'); await sleep(400); try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
process.exit(code);
