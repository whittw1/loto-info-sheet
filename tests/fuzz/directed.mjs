// node directed.mjs scenarios/common.js scenarios/<name>.js  — fresh headless Chrome profile,
// app at :8741 (preview "loto-testflight"); the files are concatenated into one async
// function body and its JSON result is printed. PORT env = CDP port (default 9700).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const files = process.argv.slice(2);
const port = +(process.env.PORT || 9700);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const prof = mkdtempSync(path.join(tmpdir(), 'lotodir-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
try {
  let ws;
  for (let i = 0; i < 80 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch (e) {} if (!ws) await sleep(250); }
  const sock = new WebSocket(ws); let id = 0; const pend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === 'Runtime.consoleAPICalled' && process.env.CONSOLE) console.error('[console]', d.params.args.map(a => a.value).join(' ')); };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: (process.env.APP_BASE || 'http://localhost:8741') + '/index.html?directed=' + Date.now() });
  await sleep(4000);
  const body = files.map(f => readFileSync(f, 'utf8')).join('\n');
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${body} })().then(x => JSON.stringify(x, null, 1), e => 'ERROR ' + (e && e.stack || e))`, awaitPromise: true, returnByValue: true, timeout: 600000 });
  console.log(r.result && r.result.result ? r.result.result.value : JSON.stringify(r).slice(0, 2000));
  sock.close();
} finally { chrome.kill('SIGKILL'); await sleep(400); try { rmSync(prof, { recursive: true, force: true }); } catch (e) {} }
