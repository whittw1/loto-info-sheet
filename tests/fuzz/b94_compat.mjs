// A build 94 tab still open when a newer build reaches the web (build 96).
// Build 94 pauses only on its BroadcastChannel messages; build 95 had dropped
// the channel, so an old tab stayed live and wrote its stale list over the new
// tab's saves. Scratch site on a scratch port, real service worker, fresh
// headless-Chrome profile: tab A loads build 94 (from git), the working tree is
// "deployed", tab B opens it. A must pause; A's saves must not reach the store;
// a later tab sees what B saved. Exit code 0 = pass. Nothing real is touched.
import http from 'node:http';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const B94 = process.env.B94 || '56cad33';                     // build 94's commit
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = +(process.env.SITE_PORT || 8793), CDP = +(process.env.PORT || 9793);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log('[' + ((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's]', ...a);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'loto-b94compat-'));
const site = path.join(work, 'site');
fs.mkdirSync(path.join(site, 'vendor'), { recursive: true });
for (const f of ['manifest.json', 'manifest_fl.json']) fs.copyFileSync(path.join(REPO, f), path.join(site, f));
for (const f of fs.readdirSync(path.join(REPO, 'vendor'))) fs.copyFileSync(path.join(REPO, 'vendor', f), path.join(site, 'vendor', f));
const fromGit = (rev, f) => execSync(`git -C "${REPO}" show ${rev}:${f}`, { maxBuffer: 64 << 20 });
fs.writeFileSync(path.join(site, 'index.html'), fromGit(B94, 'index.html'));
fs.writeFileSync(path.join(site, 'sw.js'), fromGit(B94, 'sw.js'));

const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = path.join(site, p);
  if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  // production caching (staticwebapp.config.json): the page and the worker are never cached
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
const prof = path.join(work, 'profile');
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });

async function tab(url) {
  let t = null;
  for (let i = 0; i < 40 && !t; i++) { try { t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json(); } catch (e) { await sleep(250); } }
  const sock = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = new Map();
  sock.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    if (d.method === 'Page.javascriptDialogOpening') sock.send(JSON.stringify({ id: 900000 + (++id), method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
  };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 });
    if (r.result && r.result.exceptionDetails) return 'EXC ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300);
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send('Page.enable');
  return { ev, close: async () => { try { sock.close(); } catch (e) {} try { await fetch(`http://127.0.0.1:${CDP}/json/close/${t.id}`); } catch (e) {} } };
}
async function until(t, expr, ms = 25000) {
  const end = Date.now() + ms; let v;
  while (Date.now() < end) { v = await t.ev(expr); if (v === true) return true; await sleep(250); }
  return false;
}
const loaded = `typeof _bootWipSettled !== 'undefined' && _bootWipSettled === true`;
const build = `(document.querySelector('.header-title h1 span') || {}).textContent || '?'`;
const paused = `(() => { const o = document.getElementById('tabPausedOverlay'); return !!o && o.style.display !== 'none' && !/One moment/.test(o.textContent); })()`;
const save = (name) => `(async () => { window.confirm = () => true; window.alert = () => {}; document.getElementById('equipName').value = ${JSON.stringify(name)}; addSource(); Object.assign(sources[sources.length - 1], { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' }); renderSources(); performSaveAndNew(); await new Promise(r => setTimeout(r, 1500)); return true; })()`;
const stored = `(async () => ((await getMetadata('saved_equipment')) || []).map(e => e.equipName))()`;

const fails = [];
const check = (ok, what) => { log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
let code = 1;
try {
  const url = `http://127.0.0.1:${PORT}/index.html`;
  const A = await tab(url);
  await sleep(3000);                                   // first run: the page's one-time worker purge reloads once
  check(await until(A, loaded), 'tab A (build 94) loaded: ' + await A.ev(build));
  await A.ev(save('A0 (b94)'));
  // "deploy" the working tree
  fs.copyFileSync(path.join(REPO, 'index.html'), path.join(site, 'index.html'));
  fs.copyFileSync(path.join(REPO, 'sw.js'), path.join(site, 'sw.js'));
  const B = await tab(url);
  check(await until(B, loaded), 'tab B loaded the new build: ' + await B.ev(build));
  check(await until(A, paused, 8000), 'the build 94 tab A paused when B opened');
  check(!(await B.ev(paused)), 'tab B is the live one');
  await B.ev(save('U (new build)'));
  await A.ev(save('Z (b94, after B opened)'));
  const st = await B.ev(stored);
  check(Array.isArray(st) && st.includes('U (new build)') && !st.includes('Z (b94, after B opened)'), 'store after both saved: ' + JSON.stringify(st));
  await B.close();
  const C = await tab(url);
  check(await until(C, loaded), 'a later tab C loaded');
  const cSees = await C.ev(`savedEquipment.map(e => e.equipName)`);
  check(Array.isArray(cSees) && cSees.includes('A0 (b94)') && cSees.includes('U (new build)') && !cSees.includes('Z (b94, after B opened)'), 'C sees: ' + JSON.stringify(cSees));
  await A.close(); await C.close();
  code = fails.length ? 1 : 0;
} catch (e) { log('ERROR', e && e.stack || e); }
finally {
  chrome.kill('SIGKILL'); srv.close();
  await sleep(300); try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) {}
}
log(fails.length ? fails.length + ' FAILED' : (code ? 'ERROR' : 'all checks passed'));
process.exit(code);
