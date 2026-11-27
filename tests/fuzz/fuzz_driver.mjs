// Drive tests/fuzz-harness.js in headless Chrome over the DevTools protocol
// (no npm dependencies — Node's built-in WebSocket). Each worker is its own
// Chrome with its own profile (separate IndexedDB / localStorage).
//   node fuzz_driver.mjs <workers> <seedStart> <seedsPerWorker> <steps> <faults> <outJson> [uploadTo]
//   SEEDS=1014,7153 KEEP=1 node fuzz_driver.mjs 2 0 0 40 0 replay.json   (replay given seeds with full traces)
// Needs the app at http://localhost:8741 (preview "loto-testflight"); PORT_BASE = first CDP port (9400).
// Each seed is its own run (build 99): a page that crashes or hangs is reported
// as `worker-crash` for that seed and the next seed gets a fresh browser — one
// lost page used to hang the whole driver and lose every worker's results.
// A crash report carries the last trace lines the page streamed; with
// CHROME_LOG=<dir> each browser's own log is kept there. The output file is
// rewritten as each worker finishes.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, openSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [workers = '4', seedStart = '1', perWorker = '25', steps = '40', faults = '0', outJson = 'fuzz_out.json', uploadTo = ''] = process.argv.slice(2);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP = (process.env.APP_BASE || 'http://localhost:8741') + '/index.html';   // APP_BASE: another checkout's server
const SEED_TIMEOUT_MS = 60 * 60 * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function cdpTarget(port) {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('no page target on ' + port);
}

// Every pending call fails once the page crashes or the connection closes.
function connect(wsUrl, onEvent) {
  const ws = new WebSocket(wsUrl);
  let id = 0, dead = null; const pending = new Map();
  const failAll = (why) => { dead = dead || why; for (const p of pending.values()) p.rej(new Error(dead)); pending.clear(); };
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.method === 'Inspector.targetCrashed') return failAll('page crashed');
    if (d.method === 'Inspector.detached') return failAll('page detached (' + ((d.params && d.params.reason) || '?') + ')');
    if (d.id && pending.has(d.id)) { pending.get(d.id).res(d); pending.delete(d.id); }
    else if (d.method && onEvent) onEvent(d);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    if (dead) return rej(new Error(dead));
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
  });
  return new Promise((res, rej) => {
    ws.onopen = () => { ws.onclose = () => failAll('DevTools connection closed'); res({ send, close: () => ws.close() }); };
    ws.onerror = rej;
  });
}

async function evalAwait(c, expr, timeoutMs) {
  let timer;
  const late = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('no answer after ' + Math.round(timeoutMs / 1000) + ' s')), timeoutMs + 5000); });
  try {
    const r = await Promise.race([c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: timeoutMs }), late]);
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800));
    return r.result && r.result.result ? r.result.result.value : r;
  } finally { clearTimeout(timer); }
}

let pageSeq = 0;
async function openPage(w) {
  const port = (+process.env.PORT_BASE || 9400) + w;
  const prof = mkdtempSync(path.join(tmpdir(), 'lotofuzz-'));
  let log = null, err = 'ignore';
  if (process.env.CHROME_LOG) { mkdirSync(process.env.CHROME_LOG, { recursive: true }); log = path.join(process.env.CHROME_LOG, `chrome-w${w}-${++pageSeq}.log`); err = openSync(log, 'w'); }
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run',
    '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']
    .concat(log ? ['--enable-logging=stderr', '--v=0'] : []).concat(['about:blank']), { stdio: ['ignore', 'ignore', err] });
  const p = { chrome, prof, c: null, log, tail: [] };
  const onEvent = (d) => {
    if (d.method !== 'Runtime.consoleAPICalled' || d.params.type !== 'debug') return;
    const v = d.params.args && d.params.args[0] && d.params.args[0].value;
    if (typeof v === 'string' && v.startsWith('[fuzz] ')) { p.tail.push(v.slice(7)); if (p.tail.length > 40) p.tail.shift(); }
  };
  try {
    p.c = await connect(await cdpTarget(port), onEvent);
    await p.c.send('Page.enable'); await p.c.send('Runtime.enable'); await p.c.send('Inspector.enable');
    await p.c.send('Page.navigate', { url: APP + '?w=' + w });
    await sleep(3500);
    await evalAwait(p.c, `new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/tests/fuzz-harness.js?v=' + Date.now(); s.onload = res; s.onerror = rej; document.body.appendChild(s); })`, 20000);
    return p;
  } catch (e) { await closePage(p); throw e; }
}
async function closePage(p) {
  try { if (p.c) p.c.close(); } catch (e) {}
  p.chrome.kill('SIGKILL');
  await sleep(500);
  try { rmSync(p.prof, { recursive: true, force: true }); } catch (e) {}
}

async function worker(w) {
  const seeds = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number).filter((_, i) => i % +workers === w) : Array.from({ length: +perWorker }, (_, i) => +seedStart + w * +perWorker + i);
  const opts = { steps: +steps, faults: +faults, iUnderstandThisErasesAllData: true, keepTraces: !!process.env.KEEP, streamTrace: true };
  if (uploadTo) opts.uploadTo = uploadTo;
  if (process.env.BACKUP) opts.backup = true;   // the SharePoint backup on, against a flaky stand-in (build 101)
  const out = { violations: [], actions: 0, actionCounts: {}, infos: [], seedTraces: [], heapMB: 0 };
  const t0 = Date.now();
  let p = null;
  try {
    for (const seed of seeds) {
      try {
        if (!p) p = await openPage(w);
        const r = JSON.parse(await evalAwait(p.c, `runFuzz(${JSON.stringify(Object.assign({}, opts, { seeds: [seed] }))}).then(r => JSON.stringify(r))`, SEED_TIMEOUT_MS));
        out.violations.push(...r.violations); out.actions += r.actions;
        out.infos.push(...(r.infos || [])); out.seedTraces.push(...(r.seedTraces || []));
        for (const k of Object.keys(r.actionCounts || {})) out.actionCounts[k] = (out.actionCounts[k] || 0) + r.actionCounts[k];
        if (r.backupStats) { out.backupStats = out.backupStats || {}; for (const k of Object.keys(r.backupStats)) out.backupStats[k] = (out.backupStats[k] || 0) + r.backupStats[k]; }
        try { const h = await p.c.send('Runtime.getHeapUsage'); out.heapMB = Math.max(out.heapMB, Math.round(((h.result && h.result.usedSize) || 0) / 1048576)); } catch (e) {}
      } catch (e) {
        // the page crashed or hung: reported for this seed; the next seed gets a fresh browser
        const tail = p ? p.tail.slice() : [];
        out.violations.push({ inv: 'worker-crash', detail: String((e && e.message) || e).slice(0, 400) + (p && p.log ? ' (browser log: ' + p.log + ')' : ''), seed, step: null, trace: tail.slice(-14), tail });
        if (p) { await closePage(p); p = null; }
      }
    }
  } finally { if (p) await closePage(p); }
  console.log(`worker ${w}: seeds ${seeds[0]}-${seeds[seeds.length - 1]} → ${new Set(out.violations.map(v => v.inv)).size} violation kinds, ${out.actions} actions, ${Math.round((Date.now() - t0) / 1000)} s, heap ≤ ${out.heapMB} MB${out.backupStats ? ', backup compared ' + JSON.stringify(out.backupStats) : ''}`);
  return out;
}

const results = [];
function writeOut() {
  const all = results.flatMap(r => r.violations || []);
  const byInv = {};
  for (const v of all) (byInv[v.inv] = byInv[v.inv] || []).push(v);
  writeFileSync(outJson, JSON.stringify({ byInv, actionCounts: results.map(r => r.actionCounts), backupStats: results.map(r => r.backupStats).filter(Boolean), infos: results.flatMap(r => r.infos || []).slice(0, 400), seedTraces: process.env.KEEP ? results.flatMap(r => r.seedTraces || []) : undefined }, null, 1));
  return byInv;
}
await Promise.all(Array.from({ length: +workers }, (_, w) => worker(w).catch(e => ({ error: String((e && e.stack) || e), violations: [] })).then(r => {
  if (r.error) console.log('worker error:', r.error.slice(0, 400));
  results.push(r); writeOut();
})));
const byInv = writeOut();
console.log('violation kinds:', Object.keys(byInv).map(k => k + ' ×' + byInv[k].length).join(', ') || 'none');
