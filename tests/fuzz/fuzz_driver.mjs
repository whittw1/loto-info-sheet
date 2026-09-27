// Drive tests/fuzz-harness.js in headless Chrome over the DevTools protocol
// (no npm dependencies — Node's built-in WebSocket). Each worker is its own
// Chrome with its own profile (separate IndexedDB / localStorage).
//   node fuzz_driver.mjs <workers> <seedStart> <seedsPerWorker> <steps> <faults> <outJson> [uploadTo]
//   SEEDS=1014,7153 KEEP=1 node fuzz_driver.mjs 2 0 0 40 0 replay.json   (replay given seeds with full traces)
// Needs the app at http://localhost:8741 (preview "loto-testflight"); PORT_BASE = first CDP port (9400).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [workers = '4', seedStart = '1', perWorker = '25', steps = '40', faults = '0', outJson = 'fuzz_out.json', uploadTo = ''] = process.argv.slice(2);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP = 'http://localhost:8741/index.html';
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

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  return new Promise((res, rej) => { ws.onopen = () => res({ send, close: () => ws.close() }); ws.onerror = rej; });
}

async function evalAwait(c, expr, timeoutMs) {
  const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: timeoutMs });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800));
  return r.result && r.result.result ? r.result.result.value : r;
}

async function worker(w) {
  const port = (+process.env.PORT_BASE || 9400) + w;
  const prof = mkdtempSync(path.join(tmpdir(), 'lotofuzz-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run',
    '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
  try {
    const c = await connect(await cdpTarget(port));
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Page.navigate', { url: APP + '?w=' + w });
    await sleep(3500);
    await evalAwait(c, `new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/tests/fuzz-harness.js?v=' + Date.now(); s.onload = res; s.onerror = rej; document.body.appendChild(s); })`, 20000);
    const seeds = process.env.SEEDS ? process.env.SEEDS.split(',').map(Number).filter((_, i) => i % +workers === w) : Array.from({ length: +perWorker }, (_, i) => +seedStart + w * +perWorker + i);
    const opts = { seeds, steps: +steps, faults: +faults, iUnderstandThisErasesAllData: true, keepTraces: !!process.env.KEEP };
    if (uploadTo) opts.uploadTo = uploadTo;
    const t0 = Date.now();
    const rep = await evalAwait(c, `runFuzz(${JSON.stringify(opts)}).then(r => JSON.stringify(r))`, 6 * 3600 * 1000);
    const r = JSON.parse(rep);
    console.log(`worker ${w}: seeds ${seeds[0]}-${seeds[seeds.length - 1]} → ${r.violations.length} violation kinds, ${r.actions} actions, ${Math.round((Date.now() - t0) / 1000)} s`);
    c.close();
    return r;
  } finally {
    chrome.kill('SIGKILL');
    await sleep(500);
    try { rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  }
}

const results = await Promise.all(Array.from({ length: +workers }, (_, w) => worker(w).catch(e => ({ error: String(e && e.stack || e), violations: [] }))));
const all = [];
for (const r of results) { if (r.error) console.log('worker error:', r.error.slice(0, 400)); for (const v of r.violations || []) all.push(v); }
const byInv = {};
for (const v of all) { (byInv[v.inv] = byInv[v.inv] || []).push(v); }
writeFileSync(outJson, JSON.stringify({ byInv, actionCounts: results.map(r => r.actionCounts), infos: results.flatMap(r => r.infos || []).slice(0, 60), seedTraces: process.env.KEEP ? results.flatMap(r => r.seedTraces || []) : undefined }, null, 1));
console.log('violation kinds:', Object.keys(byInv).map(k => k + ' ×' + byInv[k].length).join(', ') || 'none');
