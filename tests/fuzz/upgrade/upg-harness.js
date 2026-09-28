// Upgrade-chain harness (code review 2026-09-27, execution method).
// Loaded ONLY into throwaway Simulator builds made by run-upg.sh — never the
// project's bundle. Inert without Documents/RUN_UPG ({"phase": ...}).
//   gen  (build 88): June-style numeric-id units (backup import) photographed
//                    the way 83-88 did it, UUID units on earlier days, an
//                    All-dates export, a unit after it, an unsaved form.
//   work (build 90): what the iPad has been doing on b90 — record what it can
//                    read, then edit / retake / add / leave an unsaved form.
//   verify (build 93): every unit, every photo byte, the unsaved form, export
//                    states, and a full All-dates export of it all.
(function () {
  'use strict';
  const FS = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const L = (m) => { log.push(new Date().toISOString().slice(11, 19) + ' ' + String(m).slice(0, 400)); };
  async function wjson(path, obj) { await FS().writeFile({ path, data: JSON.stringify(obj, null, 1), directory: 'DATA', encoding: 'utf8', recursive: true }); }
  async function rjson(path) { try { return JSON.parse((await FS().readFile({ path, directory: 'DATA', encoding: 'utf8' })).data); } catch (e) { return null; } }
  const buildTag = () => { const m = /\bb(\d{2,3})\b/.exec(document.querySelector('h1') ? document.querySelector('h1').textContent : ''); return m ? +m[1] : null; };

  async function idle(ms) {
    const t0 = Date.now();
    for (;;) {
      let busy = false;
      try { busy = (typeof photoWritesBusy === 'function' && photoWritesBusy()); } catch (e) {}
      try { busy = busy || (typeof _capturesInFlight !== 'undefined' && _capturesInFlight > 0); } catch (e) {}
      if (!busy || Date.now() - t0 > (ms || 30000)) break;
      await sleep(60);
    }
    await sleep(600);
  }
  let pn = 0;
  function makePhoto(tag) {
    const n = ++pn;
    return new Promise(resolve => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 240;
      const x = c.getContext('2d');
      x.fillStyle = 'hsl(' + ((n * 53) % 360) + ',55%,40%)'; x.fillRect(0, 0, 320, 240);
      for (let i = 0; i < 8; i++) { x.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); x.fillRect(Math.random() * 290, Math.random() * 210, 30, 30); }
      x.fillStyle = '#fff'; x.font = '18px monospace'; x.fillText(tag + ' ' + Math.random().toString(36).slice(2, 8), 8, 26);
      c.toBlob(b => resolve(new File([b], 'upg_' + n + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.88);
    });
  }
  function h53(u8) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < u8.length; i++) { const c = u8[i]; h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16) + ':' + u8.length;
  }
  function refsOf(photosMap, misc) {
    const out = [];
    for (const k of Object.keys(photosMap || {}).sort()) { const r = photosMap[k]; if (r && r.dbKey) out.push({ slot: k, dbKey: r.dbKey, fileType: r.fileType || 'image/jpeg', marks: r.marks || null }); }
    (misc || []).forEach((m, i) => { if (m && m.dbKey) out.push({ slot: 'misc' + i, dbKey: m.dbKey, fileType: m.fileType || 'image/jpeg' }); });
    return out;
  }
  async function hashKeys(keys) {
    const o = {};
    for (const k of keys) {
      if (k in o) continue;
      try { const b = await loadPhotoBytes(k, 'image/jpeg'); o[k] = b && b.bytes ? h53(b.bytes) : null; } catch (e) { o[k] = 'ERR ' + e.message; }
    }
    return o;
  }
  function snapshot() {
    const v = (id) => (document.getElementById(id) || {}).value || '';
    return {
      entries: savedEquipment.map(e => ({
        id: e.id, idType: typeof e.id, name: e.equipName, savedAt: e.savedAt || null, exportedAt: e.exportedAt || null,
        src: (e.sources || []).map(s => [s.energySource, s.deviceType, s.quantity, s.verification].join('|')),
        refs: refsOf(e.photos, e.miscPhotos),
      })),
      form: { id: (typeof currentEntryId !== 'undefined') ? currentEntryId : null, editing: (typeof editingEntry !== 'undefined' && editingEntry) ? editingEntry.id : null,
        name: v('equipName'), room: v('equipRoom'), src: sources.map(s => [s.energySource, s.deviceType, s.quantity].join('|')), refs: refsOf(photos, miscPhotos) },
    };
  }
  const allKeys = (snap) => Array.from(new Set(snap.entries.flatMap(e => e.refs.map(r => r.dbKey)).concat(snap.form.refs.map(r => r.dbKey))));
  async function fsList() {
    try { const r = await FS().readdir({ path: 'loto_photos', directory: 'DATA' }); return (r.files || []).map(f => typeof f === 'string' ? f : f.name).sort(); }
    catch (e) { return ['ERR ' + e.message]; }
  }
  async function guard() {
    const uri = decodeURIComponent((await FS().getUri({ directory: 'DATA', path: '' })).uri || '');
    if (!/\/Library\/Developer\/CoreSimulator\/Devices\//.test(uri)) throw new Error('refusing: not an iOS Simulator container: ' + uri);
  }
  function hooks() {
    window.confirm = (m) => { L('confirm → OK: ' + String(m).replace(/\s+/g, ' ').slice(0, 220)); return true; };
    window.alert = (m) => { L('alert: ' + String(m).replace(/\s+/g, ' ').slice(0, 220)); };
    if (typeof window.askChoice === 'function') window.askChoice = async (o) => { L('askChoice ' + (o && o.id) + ' → ' + (o && o.defaultValue)); return o && o.defaultValue; };
    const rt = window.showToast;
    window.showToast = function (m, w) { L('toast' + (w ? '!' : '') + ': ' + String(m).replace(/<[^>]+>/g, '').slice(0, 200)); try { return rt.apply(this, arguments); } catch (e) {} };
  }
  async function capture(slot, tag) { handlePhoto({ files: [await makePhoto(tag)] }, slot); await idle(); }
  async function newUnit(name, srcs) {
    document.getElementById('equipName').value = name;
    for (const s of srcs) { addSource(); Object.assign(sources[sources.length - 1], s); }
    renderSources(); await sleep(150);
  }
  async function exportAll() {
    let captured = null;
    const real = window.saveOrShare;
    window.saveOrShare = async (blob, filename) => { captured = { blob, filename }; return { saved: true }; };
    try {
      showExportDialog(); await sleep(400);
      const sel = document.getElementById('exportDateFilter');
      if (sel) { sel.value = 'all'; try { sel.dispatchEvent(new Event('change')); } catch (e) {} }
      await runCombinedExport(); await idle(); await sleep(1500);
    } finally { window.saveOrShare = real; try { closeExportDialog(); } catch (e) {} }
    return captured;
  }
  const badgeText = () => ['integrityBadge', 'headerBadge', 'entryCountBadge'].map(id => { const el = document.getElementById(id); return el ? id + '=' + el.textContent.replace(/\s+/g, ' ').trim() : null; }).filter(Boolean);

  // ---------------------------------------------------------------- build 88
  async function gen() {
    await guard(); hooks();
    if (savedEquipment.length) throw new Error('refusing: not a fresh install (' + savedEquipment.length + ' entries)');
    const june = [0, 1, 2].map(i => ({
      id: 1718712000001 + i, equipName: ['AHU-7', 'HX Left', 'Condensate Pump 2'][i], equipType: ['Air Handler', 'Heat Exchanger', 'Condensate Pump'][i],
      equipBuilding: 'A', equipRoom: '4A1' + i, hospitalCode: 'Atlanta', savedAt: '2026-06-18T1' + (4 + i) + ':30:00.000Z', timestamp: '10:30 AM',
      sources: [{ energySource: 'Electrical 480V', deviceType: 'Disconnect', quantity: 1, location: '', duplicate: 'No', verification: 'Controls', detail: '' },
                { energySource: 'HHW In', deviceType: 'Ball Valve', quantity: 1, location: '', duplicate: 'No', verification: 'Temp Only - Hot', detail: '' }],
      photos: {}, miscPhotos: [], notes: '',
    }));
    handleBackupFile({ target: { files: [new File([JSON.stringify({ version: 2, exported: '2026-06-18T20:00:00.000Z', entries: june })], 'june.json', { type: 'application/json' })] } });
    for (let i = 0; i < 60 && savedEquipment.length < 3; i++) await sleep(100);
    L('imported: ' + savedEquipment.map(e => typeof e.id + ':' + e.id).join(', '));
    for (let i = 0; i < 3; i++) {
      editSaved(savedEquipment.findIndex(e => e.id === june[i].id)); await sleep(500);
      for (const slot of ['equip_main', 'source_0', 'source_1']) await capture(slot, 'J' + i + ' ' + slot);
      handleMiscPhoto({ files: [await makePhoto('J' + i + ' misc')] }); await idle();
      performSaveAndNew(); await idle();
    }
    for (let i = 0; i < 3; i++) {
      await newUnit('Unit U' + i, [{ energySource: 'Electrical 208V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' },
                                   { energySource: 'CHW In', deviceType: 'Butterfly', quantity: 1, verification: 'GaugeOnly - CHW' }]);
      for (const slot of ['equip_main', 'equip_dataplate', 'source_0', 'source_1']) await capture(slot, 'U' + i + ' ' + slot);
      performSaveAndNew(); await idle();
      savedEquipment[savedEquipment.length - 1].savedAt = new Date(Date.now() - (5 - i) * 86400e3).toISOString();
    }
    saveAll(); await sleep(800);
    const ex = await exportAll();
    L('b88 export: ' + (ex ? ex.filename + ' ' + ex.blob.size + ' B' : 'NO FILE'));
    await newUnit('Unit After Export', [{ energySource: 'Natural Gas', deviceType: 'Ball Valve', quantity: 1, verification: 'Controls' }]);
    await capture('equip_main', 'AE main'); await capture('source_0', 'AE src0');
    performSaveAndNew(); await idle();
    await newUnit('WIP Unit', [{ energySource: 'Electrical 120V', deviceType: 'Plug', quantity: 1, verification: 'Controls' }]);
    await capture('equip_main', 'WIP main');
    autoSaveCurrent(); await sleep(2000);
    const snap = snapshot();
    return { phase: 'gen', build: buildTag(), snap, hashes: await hashKeys(allKeys(snap)), fs: await fsList(), badges: badgeText(), log };
  }

  // ---------------------------------------------------------------- build 90
  async function work() {
    await guard(); hooks();
    const g = await rjson('upg_gen.json'); if (!g) throw new Error('no upg_gen.json');
    const before = snapshot();
    const seen = await hashKeys(allKeys(g.snap));
    const unreadable = Object.keys(g.hashes).filter(k => g.hashes[k] && seen[k] !== g.hashes[k]);
    L('b90 cannot read ' + unreadable.length + ' of ' + Object.keys(g.hashes).length + ' photos');
    // the restored unsaved form: add a source photo, then save it
    await capture('source_0', 'WIP src0 (b90)');
    performSaveAndNew(); await idle();
    // retake the main photo of a June unit, and add a data plate
    const j = savedEquipment.findIndex(e => String(e.id) === '1718712000002');
    editSaved(j); await sleep(600);
    await capture('equip_main', 'J1 main RETAKE (b90)'); await capture('equip_dataplate', 'J1 dataplate (b90)');
    performSaveAndNew(); await idle();
    // edit a UUID unit: new data plate photo
    const u = savedEquipment.findIndex(e => e.equipName === 'Unit U1');
    editSaved(u); await sleep(600);
    await capture('equip_dataplate', 'U1 dataplate RETAKE (b90)');
    performSaveAndNew(); await idle();
    // a new unit, and a new unsaved form
    await newUnit('Unit B90', [{ energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls' },
                              { energySource: 'HHW In', deviceType: 'Ball Valve', quantity: 1, verification: 'Temp Only - Hot' }]);
    for (const slot of ['equip_main', 'source_0', 'source_1']) await capture(slot, 'B90 ' + slot);
    performSaveAndNew(); await idle();
    await newUnit('WIP2 Unit', [{ energySource: 'Electrical 208V', deviceType: 'Disconnect', quantity: 1, verification: 'Controls' }]);
    await capture('equip_main', 'WIP2 main'); await capture('source_0', 'WIP2 src0');
    autoSaveCurrent(); await sleep(2000);
    const snap = snapshot();
    return { phase: 'work', build: buildTag(), before, unreadable, snap, hashes: await hashKeys(allKeys(snap)), fs: await fsList(), badges: badgeText(), log };
  }

  // ---------------------------------------------------------------- build 93
  async function verify() {
    await guard(); hooks();
    for (let i = 0; i < 150; i++) { let ok = true; try { ok = (typeof _bootWipSettled === 'undefined') || _bootWipSettled; } catch (e) {} if (ok) break; await sleep(200); }
    await sleep(1500);
    const g = await rjson('upg_gen.json'), w = await rjson('upg_work.json');
    if (!g || !w) throw new Error('missing earlier phase results');
    const want = w.snap, now = snapshot();
    const expHash = (k) => (w.hashes[k] || g.hashes[k] || null);   // b90 couldn't read the June files — b88 recorded them
    const problems = [];
    const byId = new Map(now.entries.map(e => [String(e.id), e]));
    for (const e of want.entries) {
      const n = byId.get(String(e.id));
      if (!n) { problems.push('MISSING entry ' + e.name + ' (' + e.id + ')'); continue; }
      if (n.name !== e.name) problems.push('name changed ' + e.name + ' → ' + n.name);
      if (JSON.stringify(n.src) !== JSON.stringify(e.src)) problems.push('sources changed on ' + e.name);
      const a = e.refs.map(r => r.slot + '=' + r.dbKey).join(','), b = n.refs.map(r => r.slot + '=' + r.dbKey).join(',');
      if (a !== b) problems.push('photo refs changed on ' + e.name + ': ' + a + ' → ' + b);
    }
    for (const n of now.entries) if (!want.entries.some(e => String(e.id) === String(n.id))) problems.push('EXTRA entry ' + n.name + ' (' + n.id + ')');
    if (now.form.name !== want.form.name || JSON.stringify(now.form.refs.map(r => r.dbKey)) !== JSON.stringify(want.form.refs.map(r => r.dbKey))) problems.push('unsaved form not restored: ' + JSON.stringify(now.form).slice(0, 300) + ' vs ' + JSON.stringify(want.form).slice(0, 300));
    const got = await hashKeys(allKeys(want));
    const byteProblems = [];
    for (const k of Object.keys(got)) { const x = expHash(k); if (!x) byteProblems.push('no recorded bytes for ' + k); else if (got[k] !== x) byteProblems.push((got[k] ? 'WRONG BYTES ' : 'UNREADABLE ') + k); }
    const fsNow = await fsList();
    const filesGone = w.fs.filter(f => !fsNow.includes(f));
    const states = savedEquipment.map(e => e.equipName + ' → ' + (typeof entryExportState === 'function' ? entryExportState(e) : '?'));
    await sleep(3000);
    const badges = badgeText();
    let rows = [];
    try { renderSavedPanel(); rows = [...document.querySelectorAll('.saved-item')].map(el => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 170)); } catch (e) { rows = ['ERR ' + e.message]; }
    // the All-dates export: every referenced photo must ship, with its own bytes
    const ex = await exportAll();
    const exp = { file: ex && ex.filename, size: ex && ex.blob.size };
    if (ex) {
      const z = await JSZip.loadAsync(ex.blob);
      const man = JSON.parse(await z.file('manifest.json').async('string'));
      const ej = JSON.parse(await z.file('entries.json').async('string'));
      exp.counts = man.counts; exp.unsafe = man.unsafe; exp.sheets = (man.files || {}).xlsxSheets;
      const fileHash = {};
      for (const p of Object.keys(z.files)) if (/^photos\//.test(p) && !z.files[p].dir) fileHash[p] = h53(await z.file(p).async('uint8array'));
      const shipped = []; const notShipped = [];
      for (const je of ej.entries) {
        (je.sources || []).forEach((s, i) => {
          const snapE = want.entries.find(e => String(e.id) === String(je.id)) || (String(want.form.id) === String(je.id) ? want.form : null);
          const ref = snapE && snapE.refs.find(r => r.slot === 'source_' + i);
          if (!ref) return;
          if (!s.photoFile) notShipped.push(je.equipName + ' source ' + (i + 1));
          else if (fileHash[s.photoFile] !== expHash(ref.dbKey)) notShipped.push('WRONG FILE ' + je.equipName + ' source ' + (i + 1));
          else shipped.push(je.equipName + ' s' + (i + 1));
        });
      }
      exp.sourcePhotosShipped = shipped.length; exp.sourcePhotoProblems = notShipped;
      exp.entries = ej.entries.length;
    }
    const statesAfter = savedEquipment.map(e => e.equipName + ' → ' + (typeof entryExportState === 'function' ? entryExportState(e) : '?'));
    return { phase: 'verify', build: buildTag(), problems, byteProblems, checkedPhotos: Object.keys(got).length, filesGone, states, statesAfter, badges, rows, badgesAfter: badgeText(), export: exp, log };
  }

  const PHASES = { gen, work, verify };
  async function main() {
    const fs = FS(); if (!fs) return;
    let opts;
    try { opts = JSON.parse((await fs.readFile({ path: 'RUN_UPG', directory: 'DATA', encoding: 'utf8' })).data || '{}'); } catch (e) { return; }
    try { await fs.deleteFile({ path: 'RUN_UPG', directory: 'DATA' }); } catch (e) {}
    await sleep(6000);   // launch migrations / restore settle
    let out;
    try { out = await PHASES[opts.phase](opts); } catch (e) { out = { phase: opts.phase, error: String((e && e.stack) || e), log }; }
    await wjson('upg_' + opts.phase + '.json', out);
  }
  if (document.readyState === 'complete') main(); else window.addEventListener('load', main);
})();
