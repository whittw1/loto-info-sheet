// Two tabs of the web app in ONE browser profile (same IndexedDB/localStorage).
// Build 93: each tab saved its own list over the other's (a unit vanished).
// Build 94: a launch handshake paused the second tab — decided once, so a tab
//   that missed it went on writing its stale list.
// Build 95: the tab opened LAST holds a claim in localStorage and every write
//   checks it; the other tab pauses and writes nothing. "Use this tab instead"
//   reloads (reads what the other saved) and claims. A tab that opens while the
//   other is still writing photos waits for it first.
// Needs the app at http://localhost:8741. Exit code 0 = no unit lost, no
// paused tab wrote, and the photo-write wait held.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', CDP = +(process.env.PORT || 9770);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const prof = mkdtempSync(path.join(tmpdir(), 'loto2t-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
async function tab(url) {
  const t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  const sock = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 }); return r.result && r.result.result ? r.result.result.value : JSON.stringify(r).slice(0, 300); };
  await send('Page.enable');
  return { send, ev, close: () => sock.close() };
}
// fill + Save & New; returns the in-memory list (a paused tab's save changes only its memory)
const save = (name) => `(async () => { window.confirm = () => true; document.getElementById('equipName').value = ${JSON.stringify(name)}; addSource(); Object.assign(sources[sources.length - 1], { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' }); renderSources(); performSaveAndNew(); await new Promise(r => setTimeout(r, 1200)); return savedEquipment.map(e => e.equipName); })()`;
const overlay = `(() => { const o = document.getElementById('tabPausedOverlay'); return o && o.style.display !== 'none' ? (/One moment/.test(o.textContent) ? 'waiting' : 'paused') : 'live'; })()`;
const stored = `(async () => ((await getMetadata('saved_equipment')) || []).map(e => e.equipName))()`;
let code = 1;
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
try {
  await sleep(1500);
  const BASE = process.env.APP_BASE || 'http://localhost:8741';
  const A = await tab(BASE + '/index.html?tab=A');
  await sleep(5000);
  console.log('A saves:', JSON.stringify(await A.ev(save('Unit From Tab A'))));
  const B = await tab(BASE + '/index.html?tab=B');
  await sleep(5000);
  const a1 = await A.ev(overlay), b1 = await B.ev(overlay);
  check(a1 === 'paused' && b1 === 'live', 'B opened last → B live (' + b1 + '), A paused (' + a1 + ')');
  check(JSON.stringify(await B.ev(`savedEquipment.map(e => e.equipName)`)).includes('Unit From Tab A'), 'B sees the unit A saved');
  console.log('B saves:', JSON.stringify(await B.ev(save('Unit From Tab B'))));
  await A.ev(save('Stale From Tab A'));
  let st = await B.ev(stored);
  check(!st.includes('Stale From Tab A'), 'paused A wrote nothing (store: ' + JSON.stringify(st) + ')');
  // A takes over: it reloads, reads what B saved, claims; B pauses
  await A.ev(`takeOverThisTab()`);
  await sleep(6000);
  const a2 = await A.ev(overlay), b2 = await B.ev(overlay);
  check(a2 === 'live' && b2 === 'paused', 'after "Use this tab instead" in A → A live (' + a2 + '), B paused (' + b2 + ')');
  const aSees = await A.ev(`savedEquipment.map(e => e.equipName)`);
  check(aSees.includes('Unit From Tab A') && aSees.includes('Unit From Tab B'), 'A sees both units: ' + JSON.stringify(aSees));
  console.log('A saves:', JSON.stringify(await A.ev(save('Unit From Tab A2'))));
  await B.ev(save('Stale From Tab B'));
  // Photo-write wait: A is mid "Duplicate with photos" when the tech opens C.
  await A.ev(`(window.__w = startPhotoWrite('duplicate'), true)`);
  const C = await tab(BASE + '/index.html?tab=C');
  await sleep(2500);
  const c1 = await C.ev(overlay), a3 = await A.ev(overlay);
  check(c1 === 'waiting' && a3 === 'live', 'C opened while A writes photos → C waits (' + c1 + '), A still live (' + a3 + ')');
  await A.ev(`(endPhotoWrite(window.__w), autoSaveCurrent(), true)`);
  await sleep(4500);
  const c2 = await C.ev(overlay), a4 = await A.ev(overlay);
  check(c2 === 'live' && a4 === 'paused', 'A finished → C takes over (' + c2 + '), A paused (' + a4 + ')');
  await C.send('Page.reload', {}); await sleep(5000);
  const final = await C.ev(`savedEquipment.map(e => e.equipName)`);
  console.log('after reload, storage holds:', JSON.stringify(final));
  const lost = ['Unit From Tab A', 'Unit From Tab B', 'Unit From Tab A2'].filter(n => !final.includes(n));
  check(!lost.length, lost.length ? 'LOST: ' + lost.join(', ') : 'no unit lost');
  check(!final.includes('Stale From Tab A') && !final.includes('Stale From Tab B'), 'no paused tab wrote');
  code = fails.length ? 1 : 0;
  A.close(); B.close(); C.close();
} finally { chrome.kill('SIGKILL'); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
console.log(fails.length ? fails.length + ' FAILED' : 'all checks passed');
process.exit(code);
