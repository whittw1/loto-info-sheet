import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', CDP = 9760;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const prof = mkdtempSync(path.join(tmpdir(), 'lotolay-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
try {
  let ws; for (let i = 0; i < 80 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch (e) {} if (!ws) await sleep(250); }
  const sock = new WebSocket(ws); let id = 0; const pend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : r; };
  await send('Page.enable');
  for (const [w, h, mobile] of [[390, 844, true], [430, 932, true], [768, 1024, true], [820, 1180, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile });
    await send('Page.navigate', { url: (process.env.APP_BASE || 'http://localhost:8741') + '/index.html?lay=' + w });
    await sleep(3500);
    const r = await ev(`(() => { const ha = document.querySelector('.header-actions'); const btns = [...(ha ? ha.children : [])].map(b => { const r = b.getBoundingClientRect(); return (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 10) + '@' + Math.round(r.left) + '-' + Math.round(r.right); }); return { vw: innerWidth, scrollWidth: document.documentElement.scrollWidth, offscreen: btns.filter(s => +s.split('-').pop() > innerWidth), headerActions: btns }; })()`);
    console.log(w + 'x' + h, JSON.stringify(r));
    if (w === 390) { const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(process.argv[2] || tmpdir(), 'iphone_header.png'), Buffer.from(shot.result.data, 'base64')); }
    // the title row at its widest (build 101 added the backup badge): every badge on, long texts
    const t = await ev(`(() => {
      const show = (id, text) => { const e = document.getElementById(id); if (!e) return; e.style.display = 'inline-block'; e.textContent = text; };
      show('headerBadge', '888 saved'); show('facilityBadge', '\u{1F3E5} Atlanta - Fort McPherson'); show('autosaveStatus', '\u{1F4BE} Autosaved 10:42 PM');
      show('backupBadge', '\u2601 888 waiting (offline)'); show('integrityBadge', '\u26A0 88 of 888 photos MISSING');
      document.getElementById('backupBadge').style.background = 'rgba(224,164,74,0.95)';   // as paintBackupBadge paints it (white text)
      const kids = [...document.querySelector('.header-title').children].map(c => { const q = c.getBoundingClientRect(); return { id: c.id || c.tagName, l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top) }; });
      return { vw: innerWidth, scrollWidth: document.documentElement.scrollWidth, offscreen: kids.filter(k => k.r > innerWidth || k.l < 0).map(k => k.id) };
    })()`);
    console.log(w + 'x' + h + ' every title badge', JSON.stringify(t));
    if (w === 390) { const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(process.argv[2] || tmpdir(), 'iphone_header_badges.png'), Buffer.from(shot.result.data, 'base64')); }
  }
  sock.close();
} finally { chrome.kill('SIGKILL'); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
