// Offline web check: serve the app from a throwaway HTTP server, let the
// service worker precache it, KILL the server, reload, then save a unit with
// a photo and run a real export. Headless Chrome, fresh profile.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const APPDIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');   // the repo root
const PORT = 8760, CDP = 9750;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: APPDIR, stdio: 'ignore' });
const prof = mkdtempSync(path.join(tmpdir(), 'lotooff-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const out = {};
try {
  await sleep(1200);
  let ws;
  for (let i = 0; i < 80 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch (e) {} if (!ws) await sleep(250); }
  const sock = new WebSocket(ws); let id = 0; const pend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 120000 }); return r.result && r.result.result ? r.result.result.value : JSON.stringify(r).slice(0, 500); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await sleep(6000);   // first load purges old SWs and reloads once, then registers
  out.swReady = await ev(`(async () => { const t0 = Date.now(); while (!navigator.serviceWorker.controller && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 250)); const keys = await caches.keys(); const c = keys.length ? await caches.open(keys[0]) : null; const reqs = c ? (await c.keys()).map(r => new URL(r.url).pathname) : []; return { controller: !!navigator.serviceWorker.controller, caches: keys, cached: reqs }; })()`);
  srv.kill('SIGKILL'); await sleep(800);
  out.serverDown = await ev(`fetch('http://127.0.0.1:${PORT}/sw.js?probe=' + Date.now(), { cache: 'no-store' }).then(r => 'still up ' + r.status, e => 'down')`);
  await send('Page.reload', { ignoreCache: false });
  await sleep(6000);
  out.afterReload = await ev(`({ title: document.title, jszip: typeof JSZip, exceljs: typeof ExcelJS, build: (document.querySelector('h1') || {}).textContent })`);
  out.exportOffline = await ev(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    window.confirm = () => true;
    const c = document.createElement('canvas'); c.width = 200; c.height = 150; const x = c.getContext('2d'); x.fillStyle = '#3a6'; x.fillRect(0, 0, 200, 150);
    const f = await new Promise(r => c.toBlob(b => r(new File([b], 'o.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85));
    document.getElementById('equipName').value = 'Offline Unit';
    addSource(); Object.assign(sources[0], { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' }); renderSources();
    handlePhoto({ files: [f] }, 'source_0');
    for (let i = 0; i < 200 && photoWritesBusy(); i++) await sleep(50); await sleep(300);
    performSaveAndNew(); await sleep(500);
    let cap = null; window.saveOrShare = async (blob, name) => { cap = { blob, name }; return { saved: true }; };
    showExportDialog(); document.getElementById('exportDateFilter').value = 'all';
    await runCombinedExport(); await sleep(800);
    if (!cap) return 'NO EXPORT FILE';
    const z = await JSZip.loadAsync(cap.blob);
    return { file: cap.name, size: cap.blob.size, contents: Object.keys(z.files).filter(p => !z.files[p].dir) };
  })()`);
  sock.close();
} catch (e) { out.error = String(e && e.stack || e); }
finally { try { srv.kill('SIGKILL'); } catch (e) {} chrome.kill('SIGKILL'); await sleep(400); try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
console.log(JSON.stringify(out, null, 1));
