// End-to-end check of the SharePoint live backup (build 101), web app side:
// the REAL client code in headless Chrome, talking over the network to the
// REAL api/ functions (backup_e2e_server.mjs: only Microsoft's sign-in, Graph
// and SharePoint are faked). The regression suite checks the backup's rules
// against an in-page stand-in; this checks the pieces fit — the requests, the
// sign-in, the hashes, the upload session.
//   node backup_e2e.mjs           (starts the stand-in on port 8790 itself)
// Exit code 0 = every check passed.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP = +(process.env.PORT || 9780), SITE = +(process.env.SITE_PORT || 8790);
const BASE = 'http://localhost:' + SITE;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };

const server = spawn(process.execPath, [path.join(HERE, 'backup_e2e_server.mjs'), String(SITE)], { stdio: ['ignore', 'inherit', 'inherit'] });
const prof = mkdtempSync(path.join(tmpdir(), 'lotobk-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });

async function page(url) {
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { try { t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json(); } catch (e) { await sleep(250); } }
  const sock = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = new Map();
  sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  await new Promise(r => sock.onopen = r);
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 120000 });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600));
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await send('Page.enable'); await send('Runtime.enable');
  return { send, ev, go: async (u) => { await send('Page.navigate', { url: u }); await sleep(2500); }, close: () => sock.close() };
}
const storeNow = async () => (await fetch(BASE + '/__store')).json();
const appReady = `(async () => { for (let i = 0; i < 100 && !(typeof _bootWipSettled !== 'undefined' && _bootWipSettled); i++) await new Promise(r => setTimeout(r, 100)); return _bootWipSettled; })()`;

try {
  await sleep(1200);
  const P = await page(BASE + '/index.html');
  await sleep(3000);
  check(await P.ev(appReady), 'the app loads from the stand-in');

  // --- web sign-in, as on Azure: /.auth/login/aad, back to the app ---------------
  await P.go(BASE + '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent('/index.html'));
  await P.ev(appReady);
  const who = await P.ev(`(async () => { setBackupOn(true); await refreshBackupUser(); return backupCfg.user; })()`);
  check(who === 'tech@hgsengineeringinc.com', 'signed in on the web as ' + who);

  // --- a unit with a photo, saved; then one backup pass --------------------------
  const unit = await P.ev(`(async () => {
    window.confirm = () => true; window.alert = () => {};
    setHospitalCode('Atlanta');
    document.getElementById('equipName').value = 'E2E Pump';
    addSource(); Object.assign(sources[sources.length - 1], { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls', location: 'Panel P1' });
    renderSources();
    const c = document.createElement('canvas'); c.width = 800; c.height = 600;
    const x = c.getContext('2d'); for (let i = 0; i < 400; i++) { x.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; x.fillRect(Math.random() * 760, Math.random() * 560, 40, 40); }
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    handlePhoto({ files: [new File([blob], 'e2e.jpg', { type: 'image/jpeg' })] }, 'equip_main');
    for (let i = 0; i < 150 && !(photos.equip_main && photos.equip_main.dbKey && photos.equip_main.unsaved === false); i++) await new Promise(r => setTimeout(r, 100));
    performSaveAndNew();
    await new Promise(r => setTimeout(r, 800));
    const e = savedEquipment.find(u => u.equipName === 'E2E Pump');
    return { id: e.id, key: e.photos.equip_main.dbKey, sha: e.photos.equip_main.sha256, day: getEntryDate(e), tag: getCollectorTag(), name: backupPhotoName(e.photos.equip_main.dbKey) };
  })()`);
  check(!!(unit && unit.key && unit.sha), 'a unit saved with a stored photo (' + (unit && unit.name) + ')');
  const pass1 = await P.ev(`(async () => { await drainBackup(); while (_backupBusy) await new Promise(r => setTimeout(r, 50)); return { state: _backupState, error: _backupLastError, badge: document.getElementById('backupBadge').textContent, sent: _backupSent.size }; })()`);
  const st = await storeNow();
  const folder = 'LOTO Backups/Atlanta/' + unit.day;
  const photo = st[folder + '/photos/' + unit.name];
  check(!!photo && photo.sha256 === unit.sha, 'the photo is in SharePoint at ' + folder + '/photos/, byte-identical to the capture (SHA-256 ' + (photo ? photo.sha256.slice(0, 12) : 'missing') + '…)');
  const snaps = (store, name, ext) => Object.keys(store).filter(p => p.startsWith(folder + '/' + name + '_' + unit.tag + '/') && p.endsWith(ext)).sort();
  const units1 = snaps(st, 'units', '.json');
  check(units1.length === 1 && snaps(st, 'photos', '.csv').length === 1, 'the day\'s unit file and photo index are there, as snapshots: ' + (units1[0] || 'missing').slice(folder.length + 1));
  check(/backed up/.test(pass1.badge) && !pass1.error, 'the badge says "' + pass1.badge + '"' + (pass1.error ? ' (last error: ' + pass1.error + ')' : ''));

  // --- Export to SharePoint: the ZIP through an upload session, then "exported" ----
  const exp = await P.ev(`(async () => {
    window.__askChoiceAuto = (o) => (o && o.id === 'export-blank-energy') ? 'export' : ((o && o.defaultValue) || 'cancel');
    showExportDialog();
    const cloud = document.getElementById('exportCloudBtn').style.display !== 'none';
    document.getElementById('exportDateFilter').value = 'all'; populateExportFacilityFilter();
    document.getElementById('exportFacilityFilter').value = 'all';
    document.getElementById('photoSeqStart').value = '1';
    await runCombinedExport({ toSharePoint: true });
    const e = savedEquipment.find(u => u.equipName === 'E2E Pump');
    return { cloud, exportedAt: e.exportedAt || null };
  })()`);
  const st2 = await storeNow();
  const zip = Object.keys(st2).find(p => p.startsWith(folder + '/export/FieldExport_Atlanta_') && p.endsWith('.zip'));
  const sheet = Object.keys(st2).find(p => /\/export\/Information_Sheet_\d{6}_[A-Za-z0-9]+\.xlsx$/.test(p));
  check(exp.cloud, 'the Export dialog offers "Export to SharePoint" once signed in');
  check(!!zip && st2[zip].size > 1000, 'the export ZIP went up through an upload session: ' + (zip || 'missing'));
  check(!!sheet, 'the day\'s Information Sheet is in its day folder: ' + (sheet || 'missing'));
  check(!!exp.exportedAt, 'the unit is marked exported after SharePoint confirmed the ZIP');

  // --- write-once (build 102): nothing already on SharePoint is ever replaced ----------
  const again = await P.ev(`(async () => {
    const e = savedEquipment.find(u => u.equipName === 'E2E Pump');
    e.notes = 'edited after the first backup'; e.savedAt = new Date().toISOString(); await saveAll();
    await drainBackup(); while (_backupBusy) await new Promise(r => setTimeout(r, 50));
    await runCombinedExport({ toSharePoint: true });
    return { error: _backupLastError };
  })()`);
  const st3 = await storeNow();
  const units2 = snaps(st3, 'units', '.json');
  check(units2.length === 2 && units2[0] === units1[0] && st3[units1[0]].sha256 === st[units1[0]].sha256 && !again.error,
    'an edit goes up as a second unit snapshot; the first is still there, unchanged (' + units2.length + ' snapshots)');
  const zips = Object.keys(st3).filter(p => p.startsWith(folder + '/export/FieldExport_Atlanta_') && p.endsWith('.zip'));
  check(zips.length === 2 && st3[zip].sha256 === st2[zip].sha256, 'a second export the same day lands beside the first, which is unchanged (' + zips.length + ' ZIPs)');
  const put = async (name, text) => { const r = await fetch(BASE + '/api/upload', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'e2e_signed_in=1' },
    body: JSON.stringify({ folder: 'Atlanta/' + unit.day, path: name, contentType: 'text/plain', contentBase64: Buffer.from(text).toString('base64'),
      sha256: crypto.createHash('sha256').update(text).digest('hex') }) }); return { status: r.status, body: await r.json() }; };
  const w1 = await put('test_write_once.txt', 'first copy'), w2 = await put('test_write_once.txt', 'first copy'), w3 = await put('test_write_once.txt', 'another copy');
  const over = await put(units1[0].slice(folder.length + 1), '{"units":[]}');
  const st4 = await storeNow(), firstSha = crypto.createHash('sha256').update('first copy').digest('hex');
  check(w1.status === 200 && !w1.body.alreadyThere && w2.status === 200 && w2.body.alreadyThere === true && w2.body.hashChecked === true,
    'the real API: a new name is written; the same bytes again are "already there" (hash checked), not written again');
  check(w3.status === 502 && /already holds/.test(w3.body.error) && st4[folder + '/test_write_once.txt'].sha256 === firstSha
    && over.status === 502 && st4[units1[0]].sha256 === st[units1[0]].sha256,
    'the real API refuses different bytes under a name SharePoint holds (' + w3.status + ': ' + w3.body.error + ') — the file there is untouched, a unit snapshot too');
  check((await (await fetch(BASE + '/__stats')).json()).replaced === 0, 'SharePoint saw no write that would replace a file');

  // --- the iPad sign-in, through the real link page and the real endpoints --------
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const L = await page(BASE + '/backup-link.html?device=E2E-dev1&challenge=' + challenge);
  await sleep(3000);
  const back = await L.ev(`(document.querySelector('a.btn') || {}).href || document.getElementById('msg').textContent`);
  check(/^lotocollector:\/\/backup-link\?code=c1\./.test(back), 'the link page hands back a one-time code: ' + String(back).slice(0, 48) + '…');
  const code = new URL(back).searchParams.get('code');
  const redeem = async (v) => { const r = await fetch(BASE + '/api/device-pass', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, verifier: v }) }); return { status: r.status, body: await r.json() }; };
  const wrong = await redeem(crypto.randomBytes(32).toString('base64url'));
  check(wrong.status === 401, 'the code without the app\'s verifier is refused (' + wrong.status + ')');
  const good = await redeem(verifier);
  check(good.status === 200 && /^v1\./.test(good.body.pass || ''), 'with the verifier it becomes a device pass for ' + good.body.user + ' until ' + good.body.expires);
  const up = await fetch(BASE + '/api/upload', { method: 'POST', headers: { 'content-type': 'application/json', 'x-loto-pass': good.body.pass },
    body: JSON.stringify({ folder: 'Atlanta/' + unit.day, path: 'test_E2E-dev1.txt', contentType: 'text/plain', contentBase64: Buffer.from('pass test').toString('base64'),
      sha256: crypto.createHash('sha256').update('pass test').digest('hex') }) });
  const upj = await up.json();
  check(up.status === 200 && upj.by === 'tech@hgsengineeringinc.com', 'an upload with only the device pass (no web session) is accepted (' + up.status + ')');
  const noPass = await fetch(BASE + '/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  check(noPass.status === 401, 'without a sign-in or a pass: 401');
  L.close();

  // --- the link page when not signed in yet: one trip to the sign-in, then the code --
  const hits = async () => (await (await fetch(BASE + '/__stats')).json()).loginHits;
  await P.go(BASE + '/.auth/logout?post_logout_redirect_uri=' + encodeURIComponent('/index.html'));
  const h0 = await hits();
  const L2 = await page(BASE + '/backup-link.html?device=E2E-dev2&challenge=' + challenge);
  await sleep(4000);
  const back2 = await L2.ev(`(document.querySelector('a.btn') || {}).href || document.getElementById('msg').textContent`);
  check(/^lotocollector:\/\/backup-link\?code=c1\./.test(back2) && (await hits()) - h0 === 1, 'not signed in yet: one trip to the Microsoft sign-in, then the code (' + ((await hits()) - h0) + ' trip)');
  L2.close();
  // --- a setup that refuses the signed-in visitor: it stops and says so, no loop ------
  await fetch(BASE + '/__deny-token?on=1', { method: 'POST' });
  const h1 = await hits();
  const L3 = await page(BASE + '/backup-link.html?device=E2E-dev3&challenge=' + challenge);
  await sleep(5000);
  const msg3 = await L3.ev(`document.getElementById('msg').textContent`);
  const trips = (await hits()) - h1;
  check(trips === 1 && /did not accept/.test(msg3), 'a service that refuses the sign-in: ' + trips + ' trip, then "' + msg3.slice(0, 70) + '…"');
  await fetch(BASE + '/__deny-token?on=0', { method: 'POST' });
  L3.close(); P.close();
} catch (e) {
  check(false, 'exception: ' + (e && e.stack || e));
} finally {
  chrome.kill('SIGKILL'); server.kill('SIGKILL');
  await sleep(400);
  try { rmSync(prof, { recursive: true, force: true }); } catch (e) {}
}
console.log(fails.length ? fails.length + ' check(s) failed' : 'all checks passed');
process.exit(fails.length ? 1 : 0);
