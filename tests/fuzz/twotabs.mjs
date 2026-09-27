// Two tabs of the web app in ONE browser profile (same IndexedDB/localStorage).
// Build 93: each tab saved its own list over the other's (a unit vanished).
// Build 94: the second tab pauses; "Use this tab instead" hands over; nothing is lost.
// Needs the app at http://localhost:8741. Exit code 0 = no unit lost.
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
const save = (name) => `(async () => { window.confirm = () => true; document.getElementById('equipName').value = ${JSON.stringify(name)}; addSource(); Object.assign(sources[sources.length - 1], { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' }); renderSources(); performSaveAndNew(); await new Promise(r => setTimeout(r, 1200)); return savedEquipment.map(e => e.equipName); })()`;
const paused = `(() => { const o = document.getElementById('tabPausedOverlay'); return !!o && o.style.display !== 'none'; })()`;
let code = 1;
try {
  await sleep(1500);
  const A = await tab('http://localhost:8741/index.html?tab=A');
  await sleep(5000);
  const B = await tab('http://localhost:8741/index.html?tab=B');
  await sleep(5000);
  const bPaused = await B.ev(paused), aPaused0 = await A.ev(paused);
  console.log('B opened second → B paused:', bPaused, '| A paused:', aPaused0);
  console.log('A saves:', JSON.stringify(await A.ev(save('Unit From Tab A'))));
  // B takes over: A must pause (after writing its form), B reloads from storage
  await B.ev(`takeOverThisTab()`);
  await sleep(6000);
  console.log('after takeover → A paused:', await A.ev(paused), '| B paused:', await B.ev(paused), '| B sees:', JSON.stringify(await B.ev(`savedEquipment.map(e => e.equipName)`)));
  console.log('B saves:', JSON.stringify(await B.ev(save('Unit From Tab B'))));
  console.log('A (paused) tries to save:', JSON.stringify(await A.ev(save('Stale From Tab A'))));
  await sleep(1000);
  await B.send('Page.reload', {}); await sleep(5000);
  const final = await B.ev(`savedEquipment.map(e => e.equipName)`);
  console.log('after reload, storage holds:', JSON.stringify(final));
  const lost = ['Unit From Tab A', 'Unit From Tab B'].filter(n => !final.includes(n));
  console.log(lost.length ? 'LOST: ' + lost.join(', ') : 'no unit lost' + (final.includes('Stale From Tab A') ? ' (but the paused tab wrote!)' : ''));
  code = (lost.length || final.includes('Stale From Tab A') || !bPaused) ? 1 : 0;
  A.close(); B.close();
} finally { chrome.kill('SIGKILL'); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
process.exit(code);
