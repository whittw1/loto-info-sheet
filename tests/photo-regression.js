// ============================================================================
// PHOTO STORE REGRESSION SUITE — VA LOTO Collector
// ----------------------------------------------------------------------------
// Runs INSIDE the live app page (load via <script> injection on index.html).
// Drives the real capture → save → export pipeline and hashes the actual ZIP
// output. Encodes the Fix Directive's contracts:
//   T1  same-named entries export byte-distinct photos            (directive a.i)
//   T2  re-export returns byte-identical photos for old entries   (directive a.ii)
//   T3  duplicate-entry photos: UUID-keyed, bytes copied, recorded provenance
//   T4  cross-linked store (two entries share one key) must NOT export silently
//   T5  legacy name-keyed reference must NOT ship bytes silently
//   T6  every stored photo key parses to photo::<owning entry UUID>::…
//   T7  scale: 500 entries / 50 same-named — zero unintended hash collisions
// Results land in window.__PHOTO_TEST_RESULTS and the console.
// ============================================================================
(function () {
  'use strict';

  const results = [];
  const log = (...a) => console.log('[photo-test]', ...a);

  function record(name, pass, detail) {
    results.push({ name, pass: !!pass, detail: detail || '' });
    log((pass ? 'PASS' : 'FAIL') + ' — ' + name + (detail ? ' :: ' + detail : ''));
  }

  // ---------- primitives ----------------------------------------------------
  async function sha256Hex(bytes) {
    const d = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const TINY_THUMB = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  // Distinct-bytes JPEG generator. Seed text + random noise guarantee unique bytes.
  function makePhotoFile(seed) {
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 240;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 320, 240);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        ctx.fillRect(Math.random() * 280, Math.random() * 200, 40, 40);
      }
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(String(seed) + ':' + Math.random().toString(36).slice(2), 8, 24);
      c.toBlob(b => {
        resolve(new File([b], 'test_' + seed + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    });
  }

  function dataUrlFromBytesSeed(seed) {
    // Deterministic-per-call unique "photo bytes" as a data URL (for direct
    // store seeding without the capture pipeline).
    const c = document.createElement('canvas');
    c.width = 64; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 64, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(String(seed), 2, 12);
    ctx.fillText(Math.random().toString(36).slice(2, 8), 2, 26);
    return c.toDataURL('image/jpeg', 0.8);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function waitFor(fn, ms, what) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { if (fn()) return true; } catch (e) {}
      await sleep(60);
    }
    throw new Error('timeout waiting for ' + what);
  }

  // ---------- app-state helpers ---------------------------------------------
  // DESTRUCTIVE: erases every saved entry and every stored photo. The runner
  // refuses to start anywhere real data could live (see runPhotoRegressionSuite).
  async function resetAppState() {
    if (!window.__PHOTO_SUITE_ARMED) throw new Error('resetAppState called outside an armed suite run — refusing to erase data');
    // let any in-flight photo write from the previous test finish first
    const t0 = Date.now();
    while (typeof photoWritesBusy === 'function' && photoWritesBusy() && Date.now() - t0 < 20000) await sleep(100);
    editingEntry = null;
    currentEntryId = null;
    if (typeof _entryStoreUnread !== 'undefined') _entryStoreUnread = false;
    if (typeof beginNewFormSession === 'function') beginNewFormSession();
    savedEquipment = [];
    photos = {};
    miscPhotos = [];
    sources = [];
    try { clearSketchState(); } catch (e) {}
    // remove dialogs the previous test opened — but never the static ones
    // (Export / Bulk delete / Settings live in the HTML and are only hidden)
    const STATIC_OVERLAYS = new Set(['exportOverlay', 'bulkDeleteOverlay', 'settingsOverlay']);
    document.querySelectorAll('.dialog-overlay').forEach(o => { if (STATIC_OVERLAYS.has(o.id)) o.style.display = 'none'; else o.remove(); });
    const dd = document.getElementById('duplicateDialog'); if (dd) dd.remove();
    document.getElementById('equipType').value = '';
    filterTemplateDropdown('');
    document.getElementById('equipTemplate').value = '';
    try { localStorage.removeItem(PHOTO_KEY_MIGRATION_FLAG); } catch (e) {}
    try { localStorage.removeItem('loto_seq_used'); } catch (e) {}
    try { localStorage.removeItem('loto_saved'); localStorage.removeItem('loto_saved_at'); } catch (e) {}
    try { await saveMetadata('photo_hash_index', {}); } catch (e) {}
    saveAll();
    // wipe photo stores (IDB + localStorage fallback + the MOCK filesystem in
    // native-mock runs — the runner refuses to start on a real device)
    const keys = await getAllPhotoKeys();
    await Promise.all(keys.map(k => deletePhotoFromDB(k)));
    if (typeof fsPlugin === 'function' && fsPlugin()) {
      try {
        const r = await fsPlugin().readdir({ path: 'loto_photos', directory: 'DATA' });
        for (const f of ((r && r.files) || [])) { const n = typeof f === 'string' ? f : f.name; try { await fsPlugin().deleteFile({ path: 'loto_photos/' + n, directory: 'DATA' }); } catch (e) {} }
      } catch (e) {}
    }
    const lsKill = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('photo_full_') === 0) lsKill.push(k);
    }
    lsKill.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('photoSeqNext');
    // clear the form exactly as the app does (repaints the photo slots, clears
    // building/room, autosaves the blank form so a relaunch doesn't restore a
    // test form), then refresh the header count
    clearForm(false);
    renderSavedPanel();
    updateHeaderBadge();
  }

  function fillForm(name, opts) {
    opts = opts || {};
    document.getElementById('equipType').value = '';
    filterTemplateDropdown('');
    document.getElementById('equipName').value = name;
    document.getElementById('equipRoom').value = opts.room || 'B100';
    setBuilding(opts.building || 'Main');
    document.getElementById('equipNotes').value = '';
    if (!sources.length) {
      sources.push({
        energySource: 'Electrical', deviceType: 'Breaker', deviceId: '',
        quantity: 1, location: 'Panel LP-1', duplicate: 'No',
        verification: 'Controls', detail: '', valveState: 'normal', noPhoto: false
      });
    }
    renderSources();
  }

  async function captureInto(slotId, file) {
    handlePhoto({ files: [file] }, slotId);
    await waitFor(
      () => photos[slotId] && photos[slotId].dbKey && photos[slotId].unsaved === false,
      15000, 'photo capture ' + slotId
    );
    await waitForPhotoWritesIdle(15000);
    return photos[slotId];
  }

  function saveEntry() {
    const id = (typeof ensureCurrentEntryId === 'function') ? ensureCurrentEntryId() : null;
    performSaveAndNew();
    return (id && savedEquipment.find(e => e.id === id)) || savedEquipment[savedEquipment.length - 1];
  }

  // A form with a name + building/room but NO sources (template tests add their own).
  function fillFormNoSources(name) {
    document.getElementById('equipType').value = '';
    filterTemplateDropdown('');
    document.getElementById('equipName').value = name;
    document.getElementById('equipRoom').value = 'B100';
    setBuilding('Main');
    sources = [];
    renderSources();
  }

  // Close every prompt overlay a template/type change may have opened
  // (voltage, electrical count, template pick) without applying a choice.
  function closeAllPrompts() {
    ['templateVoltageOverlay', 'electricalCountOverlay', 'templatePromptOverlay', 'voltageOverlay', 'templateConfirmOverlay']
      .forEach(id => { const o = document.getElementById(id); if (o) o.remove(); });
  }

  // Run fn with confirm()/alert()/askChoice answered automatically.
  // answers: { confirm: bool | fn(msg), choice: { <dialogId>: value } | fn(opts) }
  async function withDialogs(answers, fn) {
    answers = answers || {};
    const log = [];
    const rc = window.confirm, ra = window.alert, rp = window.__askChoiceAuto;
    window.confirm = (msg) => {
      log.push('[CONFIRM] ' + String(msg));
      return typeof answers.confirm === 'function' ? answers.confirm(String(msg)) : !!answers.confirm;
    };
    window.alert = (msg) => { log.push('[ALERT] ' + String(msg)); };
    window.__askChoiceAuto = (opts) => {
      log.push('[CHOICE ' + (opts && opts.id) + '] ' + String(opts && opts.title));
      if (typeof answers.choice === 'function') return answers.choice(opts);
      return (answers.choice && opts && answers.choice[opts.id] !== undefined) ? answers.choice[opts.id] : 'cancel';
    };
    try { return { result: await fn(), log }; }
    finally { window.confirm = rc; window.alert = ra; window.__askChoiceAuto = rp; }
  }

  // Collect toast messages while fn runs.
  async function withToasts(fn) {
    const msgs = [];
    const real = window.showToast;
    window.showToast = (m, w) => { msgs.push(String(m)); try { real(m, w); } catch (e) {} };
    try { await fn(); } finally { window.showToast = real; }
    return msgs;
  }

  async function waitForPhotoWritesIdle(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 15000)) {
      if (typeof photoWritesBusy !== 'function' ? (typeof _capturesInFlight === 'undefined' || _capturesInFlight === 0) : !photoWritesBusy()) return true;
      await sleep(60);
    }
    return false;
  }

  // Raw IndexedDB access through a FRESH connection — bypasses the app's
  // cached handle so a test can see what is really on disk.
  function rawIdbOpen() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('loto_photos_v3');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function rawIdb(store, mode, op) {
    const db = await rawIdbOpen();
    try {
      return await new Promise((res, rej) => {
        const tx = db.transaction(store, mode);
        const req = op(tx.objectStore(store));
        let out;
        if (req) { req.onsuccess = () => { out = req.result; }; req.onerror = () => rej(req.error); }
        tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
      });
    } finally { db.close(); }
  }
  const rawIdbGet = (store, key) => rawIdb(store, 'readonly', s => s.get(key));
  const rawIdbPut = (store, key, val) => rawIdb(store, 'readwrite', s => s.put(val, key));
  const rawIdbDelete = (store, key) => rawIdb(store, 'readwrite', s => s.delete(key));
  const rawIdbKeys = (store) => rawIdb(store, 'readonly', s => s.getAllKeys());

  // Filesystem test double. Wraps whichever Capacitor Filesystem plugin is live
  // — the REAL native plugin when the suite runs inside the iOS app on the
  // Simulator, the runner's in-memory one in {nativeMock} runs — or, in a plain
  // browser, installs a fresh in-memory plugin. Fault hooks are injected on the
  // way through: faults.writeFile(path, data, api) may return 'throw' (fail the
  // call) or 'handled' (skip the real write); faults.readdir(path) may return
  // 'throw'. The Share plugin is stubbed while installed (no share sheet).
  // Tests read/modify the underlying store through the async helpers
  // get/has/set/del, which bypass the faults.
  const b64dec = (s) => { const b = atob(s || ''); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const b64enc = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const fsNorm = p => String(p || '').replace(/^\/+/, '').replace(/\/+$/, '');
  function makeMemoryFS() {
    const files = new Map();                 // path -> Uint8Array (directories ignored — paths never clash)
    const dirs = new Set();
    const nf = () => { const e = new Error('File does not exist'); e.code = 'OS-PLUG-FILE-0008'; return e; };
    return {
      async writeFile({ path, data }) { path = fsNorm(path); files.set(path, b64dec(data)); return { uri: 'mock://' + path }; },
      async appendFile({ path, data }) {
        path = fsNorm(path);
        const prev = files.get(path) || new Uint8Array(0); const add = b64dec(data);
        const u = new Uint8Array(prev.length + add.length); u.set(prev); u.set(add, prev.length); files.set(path, u);
      },
      async readFile({ path }) { path = fsNorm(path); if (!files.has(path)) throw nf(); return { data: b64enc(files.get(path)) }; },
      async stat({ path }) {
        path = fsNorm(path);
        if (files.has(path)) return { type: 'file', size: files.get(path).length, mtime: Date.now(), ctime: Date.now(), uri: 'mock://' + path };
        if (dirs.has(path) || [...files.keys()].some(k => k.indexOf(path + '/') === 0)) return { type: 'directory', size: 0, mtime: Date.now(), ctime: Date.now(), uri: 'mock://' + path };
        throw nf();
      },
      async readdir({ path }) {
        path = fsNorm(path);
        const pre = path + '/'; const out = [];
        for (const [k, v] of files) if (k.indexOf(pre) === 0 && k.slice(pre.length).indexOf('/') < 0) out.push({ name: k.slice(pre.length), type: 'file', size: v.length, mtime: Date.now(), ctime: Date.now(), uri: 'mock://' + k });
        if (!out.length && !dirs.has(path)) throw nf();
        return { files: out };
      },
      async deleteFile({ path }) { path = fsNorm(path); if (!files.delete(path)) throw nf(); },
      async mkdir({ path }) { path = fsNorm(path); if (dirs.has(path)) throw new Error('Directory exists'); dirs.add(path); },
      async rename({ from, to }) { from = fsNorm(from); to = fsNorm(to); if (!files.has(from)) throw nf(); files.set(to, files.get(from)); files.delete(from); },
      async getUri({ path }) { return { uri: 'mock://' + fsNorm(path) }; },
    };
  }
  function installMockFS(faults) {
    faults = faults || {};
    const calls = [];
    const cap = window.Capacitor;
    const live = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Filesystem);
    const base = live ? cap.Plugins.Filesystem : makeMemoryFS();
    const api = {
      calls, dec: b64dec, enc: b64enc, real: live && !cap.__photoSuiteMock,
      async get(path, directory) { try { const r = await base.readFile({ path, directory: directory || 'DATA' }); return b64dec(r.data); } catch (e) { return null; } },
      async has(path, directory) { try { await base.stat({ path, directory: directory || 'DATA' }); return true; } catch (e) { return false; } },
      async set(path, bytes, directory) { await base.writeFile({ path, data: b64enc(bytes), directory: directory || 'DATA', recursive: true }); },
      async del(path, directory) { try { await base.deleteFile({ path, directory: directory || 'DATA' }); } catch (e) {} },
    };
    const wrapped = {
      async writeFile(o) {
        const path = fsNorm(o.path);
        calls.push({ op: 'writeFile', path, len: String(o.data || '').length });
        if (faults.writeFile) {
          const r = await faults.writeFile(path, o.data, api);
          if (r === 'throw') throw new Error('mock write failed');
          if (r === 'handled') return { uri: 'mock://' + path };
        }
        return base.writeFile(o);
      },
      async appendFile(o) { calls.push({ op: 'appendFile', path: fsNorm(o.path), len: String(o.data || '').length }); return base.appendFile(o); },
      async readFile(o) { calls.push({ op: 'readFile', path: fsNorm(o.path) }); return base.readFile(o); },
      stat: (o) => base.stat(o),
      async readdir(o) {
        const path = fsNorm(o.path);
        calls.push({ op: 'readdir', path });
        if (faults.readdir && faults.readdir(path) === 'throw') throw new Error('mock readdir failed');
        return base.readdir(o);
      },
      async deleteFile(o) { calls.push({ op: 'deleteFile', path: fsNorm(o.path) }); return base.deleteFile(o); },
      mkdir: (o) => base.mkdir(o),
      async rename(o) { calls.push({ op: 'rename', from: fsNorm(o.from), to: fsNorm(o.to) }); return base.rename(o); },
      getUri: (o) => base.getUri(o),
    };
    const shareStub = { share: async () => ({}) };
    if (live) {
      const savedFS = cap.Plugins.Filesystem, savedShare = cap.Plugins.Share;
      cap.Plugins.Filesystem = wrapped;
      cap.Plugins.Share = shareStub;
      api.restore = () => { cap.Plugins.Filesystem = savedFS; cap.Plugins.Share = savedShare; };
    } else {
      const saved = window.Capacitor;
      window.Capacitor = { isNativePlatform: () => true, Plugins: { Filesystem: wrapped, Share: shareStub }, __photoSuiteMock: true };
      api.restore = () => { window.Capacitor = saved; };
    }
    return api;
  }

  // ---------- export driver -------------------------------------------------
  const realSaveOrShare = window.saveOrShare;
  const realConfirm = window.confirm;

  async function runExport(opts) {
    opts = opts || {};
    let captured = null;
    const confirms = [];
    window.saveOrShare = async (blob, filename) => {
      if (opts.onShare) opts.onShare(blob, filename);
      captured = { blob, filename }; return { saved: true };
    };
    window.confirm = (msg) => { confirms.push(String(msg)); return ('confirmResponse' in opts) ? opts.confirmResponse : false; };
    const realAlert = window.alert;
    window.alert = (msg) => { confirms.push('[ALERT] ' + String(msg)); };
    const realChoice = window.__askChoiceAuto;
    window.__askChoiceAuto = (o) => {
      confirms.push('[CHOICE ' + (o && o.id) + '] ' + String(o && o.title));
      return (opts.choice && o && opts.choice[o.id] !== undefined) ? opts.choice[o.id] : ((o && o.defaultValue) || 'cancel');
    };
    try {
      showExportDialog();
      const dsel = document.getElementById('exportDateFilter');
      dsel.value = opts.dateFilter || 'all';
      populateExportFacilityFilter();
      document.getElementById('exportFacilityFilter').value = 'all';
      document.getElementById('photoSeqStart').value = String(opts.start || 1);
      await runCombinedExport();
      // export has async tail work; give the zip a moment if not yet captured
      if (!captured) await sleep(300);
    } finally {
      window.saveOrShare = realSaveOrShare;
      window.confirm = realConfirm;
      window.alert = realAlert;
      window.__askChoiceAuto = realChoice;
    }
    return { zip: captured, confirms };
  }

  async function unzipExport(blob) {
    const z = await JSZip.loadAsync(blob);
    const files = {};   // path -> Uint8Array
    const hashes = {};  // path -> sha256
    for (const path of Object.keys(z.files)) {
      const f = z.files[path];
      if (f.dir) continue;
      files[path] = await f.async('uint8array');
    }
    for (const p of Object.keys(files)) {
      if (p.startsWith('photos/')) hashes[p] = await sha256Hex(files[p]);
    }
    const entriesJson = files['entries.json'] ? JSON.parse(new TextDecoder().decode(files['entries.json'])) : null;
    const manifest = files['manifest.json'] ? JSON.parse(new TextDecoder().decode(files['manifest.json'])) : null;
    return { files, hashes, entriesJson, manifest };
  }

  // The post-fix key contract: photo::<entry-uuid>::<slot-or-sourceId>[::rev]
  const KEY_RE = /^photo::([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})::(.+)$/;
  function keyOwner(dbKey) {
    const m = KEY_RE.exec(String(dbKey || ''));
    return m ? m[1] : null;
  }

  function entryPhotoRefs(entry) {
    const out = [];
    if (entry.photos) for (const slot of Object.keys(entry.photos)) {
      const p = entry.photos[slot];
      if (p && p.dbKey) out.push({ slot, ref: p });
    }
    (entry.miscPhotos || []).forEach((mp, i) => { if (mp && mp.dbKey) out.push({ slot: 'misc-' + i, ref: mp }); });
    return out;
  }

  // Locate an entry's row in exported entries.json by id (fallback: name order).
  function jsonEntryFor(entriesJson, entry) {
    if (!entriesJson) return null;
    return entriesJson.entries.find(e => e.id && entry.id && e.id === entry.id) || null;
  }

  // ---------- TESTS ---------------------------------------------------------

  // T1 — directive (a)(i)
  async function t1_sameNameDistinctExports() {
    await resetAppState();
    fillForm('Emergency');
    await captureInto('equip_main', await makePhotoFile('t1-A'));
    const A = saveEntry();
    fillForm('Emergency');
    await captureInto('equip_main', await makePhotoFile('t1-B'));
    const B = saveEntry();

    const { zip, confirms } = await runExport();
    if (!zip) return record('T1 same-name entries export distinct photos', false,
      'export produced no zip (confirms: ' + confirms.join(' | ') + ')');
    const { hashes, entriesJson } = await unzipExport(zip.blob);
    const ja = jsonEntryFor(entriesJson, A), jb = jsonEntryFor(entriesJson, B);
    if (!ja || !jb || !ja.photoFiles.main || !jb.photoFiles.main)
      return record('T1 same-name entries export distinct photos', false, 'entry rows or main photos missing from export');
    const ha = hashes[ja.photoFiles.main], hb = hashes[jb.photoFiles.main];
    record('T1 same-name entries export distinct photos',
      ha && hb && ha !== hb,
      'A=' + String(ha).slice(0, 12) + ' B=' + String(hb).slice(0, 12));
  }

  // T2 — directive (a)(ii)
  async function t2_reExportStability() {
    await resetAppState();
    fillForm('1');
    await captureInto('equip_main', await makePhotoFile('t2-A'));
    const A = saveEntry();

    const first = await runExport();
    if (!first.zip) return record('T2 re-export byte stability', false, 'first export produced no zip');
    const u1 = await unzipExport(first.zip.blob);
    const ja1 = jsonEntryFor(u1.entriesJson, A);
    const origHash = ja1 && ja1.photoFiles.main ? u1.hashes[ja1.photoFiles.main] : null;
    if (!origHash) return record('T2 re-export byte stability', false, 'A main photo missing from first export');

    fillForm('1'); // same name, later capture
    await captureInto('equip_main', await makePhotoFile('t2-B'));
    saveEntry();

    const second = await runExport();
    if (!second.zip) return record('T2 re-export byte stability', false, 'second export produced no zip');
    const u2 = await unzipExport(second.zip.blob);
    const ja2 = jsonEntryFor(u2.entriesJson, A);
    const againHash = ja2 && ja2.photoFiles.main ? u2.hashes[ja2.photoFiles.main] : null;
    record('T2 re-export byte stability', againHash === origHash,
      'orig=' + String(origHash).slice(0, 12) + ' re=' + String(againHash).slice(0, 12));
  }

  // T3 — duplicate-entry photo integrity
  async function t3_duplicateEntry() {
    await resetAppState();
    fillForm('AHU-1');
    await captureInto('equip_main', await makePhotoFile('t3-A'));
    const A = saveEntry();
    const aKey = A.photos.equip_main.dbKey;

    showDuplicateDialog(0);    // executeDuplicate assumes its dialog exists
    executeDuplicate(0, true); // duplicate WITH photos into the form
    document.getElementById('equipName').value = 'AHU-2';
    await sleep(1200); // allow any async byte-copy the dup path may have queued
    const B = saveEntry();
    const bRef = B.photos && B.photos.equip_main;

    const problems = [];
    if (!bRef || !bRef.dbKey) problems.push('duplicate has no main photo reference');
    if (bRef && bRef.dbKey === aKey) problems.push('duplicate SHARES the original\'s key (mutable cross-link)');
    if (bRef && keyOwner(bRef.dbKey) !== B.id) problems.push('dup key not UUID-owned by duplicate: ' + bRef.dbKey);
    if (bRef && !bRef.dupOf) problems.push('duplicate not recorded as dup (no dupOf provenance)');
    if (bRef && bRef.dbKey) {
      const bytes = await loadPhotoBytes(bRef.dbKey, 'image/jpeg');
      if (!bytes) problems.push('duplicate\'s photo bytes MISSING from store');
      else {
        const aBytes = await loadPhotoBytes(aKey, 'image/jpeg');
        if (aBytes && (await sha256Hex(bytes.bytes)) !== (await sha256Hex(aBytes.bytes)))
          problems.push('duplicate bytes differ from original (copy corrupted)');
      }
    }
    record('T3 duplicate-entry: UUID key + copied bytes + provenance', problems.length === 0, problems.join('; '));
  }

  // T4 — cross-linked store must not export silently
  async function t4_crossLinkGate() {
    await resetAppState();
    const legacyKey = 'Emergency__equip_main';
    await storePhotoBytes(legacyKey, dataUrlFromBytesSeed('t4-shared'));
    const now = new Date().toISOString();
    const mk = (name) => ({
      id: genUuid(), equipType: 'Generator', equipName: name, lotoId: '',
      hospitalCode: '', equipRoom: 'B100', equipBuilding: 'Main', template: '',
      tiedTo: '', tiedToName: '', notes: '', savedAt: now,
      timestamp: '', photoCount: 1,
      sources: [{ sourceId: genUuid(), energySource: 'Electrical', deviceType: 'Breaker', deviceId: '', quantity: 1, location: 'P1', duplicate: 'No', verification: '', detail: '', valveState: 'normal', noPhoto: false }],
      photos: { equip_main: { dbKey: legacyKey, thumbnail: TINY_THUMB, timestamp: now, fileType: 'image/jpeg' } },
      miscPhotos: []
    });
    const A = mk('Emergency'); const B = mk('Emergency');
    savedEquipment.push(A, B); saveAll(); renderSavedPanel();

    const { zip, confirms } = await runExport({ confirmResponse: false });
    let silentCrossLink = false;
    let detail = 'confirms=' + confirms.length;
    if (zip) {
      const u = await unzipExport(zip.blob);
      const ja = jsonEntryFor(u.entriesJson, A), jb = jsonEntryFor(u.entriesJson, B);
      const fa = ja && ja.photoFiles.main, fb = jb && jb.photoFiles.main;
      const sameBytes = fa && fb && u.hashes[fa] && u.hashes[fa] === u.hashes[fb];
      const dupRecorded = !!(ja && jb && (ja.photos_dup_provenance || jb.photos_dup_provenance ||
        (u.manifest && Array.isArray(u.manifest.photos) &&
          u.manifest.photos.some(p => p.entries && p.entries.length > 1 && p.entries.some(e => e.dupOf)))));
      silentCrossLink = !!(sameBytes && !dupRecorded && confirms.length === 0);
      detail += ' fa=' + fa + ' fb=' + fb + ' sameBytes=' + sameBytes + ' dupRecorded=' + dupRecorded;
    } else {
      detail += ' (export blocked — acceptable)';
    }
    record('T4 cross-linked store blocked or flagged at export', !silentCrossLink, detail);
  }

  // T4b — HARD duplicate gate: UUID-keyed byte-identical photos on two
  // entries with NO recorded dup must ABORT the export outright (rule 5).
  async function t4b_hashGateHardAbort() {
    if (typeof window.photoStoreKey !== 'function') {
      return record('T4b hash gate aborts unrecorded byte-identical pair', false, 'photoStoreKey() missing (pre-fix build)');
    }
    await resetAppState();
    const sharedBytes = dataUrlFromBytesSeed('t4b-shared');
    const now = new Date().toISOString();
    const mk = async (name) => {
      const id = genUuid();
      const key = photoStoreKey(id, 'main');
      await storePhotoBytes(key, sharedBytes);
      return {
        id, equipType: 'Pump', equipName: name, lotoId: '', hospitalCode: '',
        equipRoom: 'R1', equipBuilding: 'Main', template: '', tiedTo: '', tiedToName: '',
        notes: '', savedAt: now, timestamp: '', photoCount: 1,
        sources: [{ sourceId: genUuid(), energySource: 'Electrical', deviceType: 'Breaker', deviceId: '', quantity: 1, location: 'P', duplicate: 'No', verification: '', detail: '', valveState: 'normal', noPhoto: false }],
        photos: { equip_main: { dbKey: key, thumbnail: TINY_THUMB, timestamp: now, fileType: 'image/jpeg' } },
        miscPhotos: []
      };
    };
    savedEquipment.push(await mk('Pump-1'), await mk('Pump-2'));
    saveAll(); renderSavedPanel();
    const { zip, confirms } = await runExport({ confirmResponse: true }); // even "OK" must not get past the gate
    const aborted = !zip && confirms.some(c => c.indexOf('[ALERT]') === 0);
    record('T4b hash gate aborts unrecorded byte-identical pair', aborted,
      'zip=' + !!zip + ' notices=' + confirms.length);
  }

  // T5 — legacy name-keyed reference must not ship silently
  async function t5_legacyKeyNotSilent() {
    await resetAppState();
    const legacyKey = 'AHU__equip_main';
    // Store holds LATER bytes at the legacy key (the overwrite catastrophe):
    await storePhotoBytes(legacyKey, dataUrlFromBytesSeed('t5-overwritten-later'));
    const now = new Date().toISOString();
    const A = {
      id: genUuid(), equipType: 'Air Handler', equipName: 'AHU', lotoId: '',
      hospitalCode: '', equipRoom: 'G004', equipBuilding: 'Main', template: '',
      tiedTo: '', tiedToName: '', notes: '', savedAt: now, timestamp: '', photoCount: 1,
      sources: [{ sourceId: genUuid(), energySource: 'Electrical', deviceType: 'Breaker', deviceId: '', quantity: 1, location: 'P2', duplicate: 'No', verification: '', detail: '', valveState: 'normal', noPhoto: false }],
      photos: { equip_main: { dbKey: legacyKey, thumbnail: TINY_THUMB, timestamp: now, fileType: 'image/jpeg' } },
      miscPhotos: []
    };
    savedEquipment.push(A); saveAll(); renderSavedPanel();

    const { zip, confirms } = await runExport({ confirmResponse: false });
    let silentLegacyShip = false;
    let detail = 'confirms=' + confirms.length;
    if (zip) {
      const u = await unzipExport(zip.blob);
      const ja = jsonEntryFor(u.entriesJson, A);
      const shipped = !!(ja && ja.photoFiles.main && u.hashes[ja.photoFiles.main]);
      const flagged = !!(confirms.length ||
        (ja && (ja.photoSuspect || (ja.photoFlags && Object.keys(ja.photoFlags).length))) ||
        (u.manifest && u.manifest.counts && (u.manifest.counts.unsafeRefs || u.manifest.counts.legacyRefs)));
      silentLegacyShip = shipped && !flagged;
      detail += ' shipped=' + shipped + ' flagged=' + flagged;
    } else {
      detail += ' (export blocked — acceptable)';
    }
    record('T5 legacy-keyed photo blocked or flagged at export', !silentLegacyShip, detail);
  }

  // T6 — key format compliance for freshly captured photos
  async function t6_keyFormat() {
    await resetAppState();
    fillForm('Control Air');
    await captureInto('equip_main', await makePhotoFile('t6-main'));
    await captureInto('equip_dataplate', await makePhotoFile('t6-dp'));
    const A = saveEntry();
    const bad = [];
    for (const { slot, ref } of entryPhotoRefs(A)) {
      const owner = keyOwner(ref.dbKey);
      if (owner !== A.id) bad.push(slot + '→' + ref.dbKey);
    }
    record('T6 fresh capture keys are photo::<entryUUID>::…', bad.length === 0, bad.join('; '));
  }

  // T7 — scale test (only meaningful post-fix; needs the app's key minter)
  async function t7_scale() {
    if (typeof window.photoStoreKey !== 'function') {
      return record('T7 scale 500 entries / 50 same-named', false, 'photoStoreKey() missing (pre-fix build)');
    }
    await resetAppState();
    const now = new Date().toISOString();
    const N = 500;
    for (let i = 0; i < N; i++) {
      const id = genUuid();
      const name = i < 50 ? 'Water Source Heat Pump' : 'Unit-' + i;
      const key = photoStoreKey(id, 'main');
      const res = await storePhotoBytes(key, dataUrlFromBytesSeed('t7-' + i));
      if (!res.ok) return record('T7 scale 500 entries / 50 same-named', false, 'store failed at ' + i);
      savedEquipment.push({
        id, equipType: 'Heat Pump', equipName: name, lotoId: '', hospitalCode: '',
        equipRoom: 'R' + i, equipBuilding: 'B' + (i % 4), template: '', tiedTo: '', tiedToName: '',
        notes: '', savedAt: now, timestamp: '', photoCount: 1,
        sources: [{ sourceId: genUuid(), energySource: 'Electrical', deviceType: 'Breaker', deviceId: '', quantity: 1, location: 'P', duplicate: 'No', verification: '', detail: '', valveState: 'normal', noPhoto: false }],
        photos: { equip_main: { dbKey: key, thumbnail: TINY_THUMB, timestamp: now, fileType: 'image/jpeg' } },
        miscPhotos: []
      });
    }
    saveAll(); renderSavedPanel();
    const { zip, confirms } = await runExport();
    if (!zip) return record('T7 scale 500 entries / 50 same-named', false, 'no zip (confirms: ' + confirms.join('|') + ')');
    const u = await unzipExport(zip.blob);
    const photoPaths = Object.keys(u.hashes);
    const distinct = new Set(Object.values(u.hashes));
    const perEntryFiles = u.entriesJson.entries.map(e => e.photoFiles.main).filter(Boolean);
    const pass = photoPaths.length === N && distinct.size === N && perEntryFiles.length === N;
    record('T7 scale 500 entries / 50 same-named',
      pass, photoPaths.length + ' files, ' + distinct.size + ' distinct hashes, ' + perEntryFiles.length + ' entry refs');
  }


  // T8 — edit → retake → DISCARD must leave the saved entry's original bytes intact
  async function t8_retakeThenDiscard() {
    await resetAppState();
    fillForm('AHU-16');
    await captureInto('equip_main', await makePhotoFile('t8-orig'));
    const A = saveEntry();
    const origKey = A.photos.equip_main.dbKey;
    const origBytes = await loadPhotoBytes(origKey, 'image/jpeg');
    if (!origBytes) return record('T8 edit→retake→discard keeps original photo', false, 'original not stored');
    editSaved(0);                                   // form now shares A's photo objects
    await captureInto('equip_main', await makePhotoFile('t8-retake'));
    await sleep(700);                               // let any post-save cleanup run
    window.confirm = () => true; clearForm(true);   // DISCARD the edit
    window.confirm = realConfirm;
    const after = await loadPhotoBytes(A.photos.equip_main.dbKey, 'image/jpeg');
    record('T8 edit→retake→discard keeps original photo', !!after && A.photos.equip_main.dbKey === origKey,
      after ? 'original bytes intact' : 'ORIGINAL BYTES DELETED by retake');
  }

  // T9 — edit → remove a misc photo → DISCARD must leave the saved entry's misc bytes intact
  async function t9_removeMiscThenDiscard() {
    await resetAppState();
    fillForm('Boiler-2');
    handleMiscPhoto({ files: [await makePhotoFile('t9-misc')], value: '' });
    await waitFor(() => miscPhotos.length === 1 && miscPhotos[0].unsaved === false, 15000, 'misc capture');
    const A = saveEntry();
    const key = A.miscPhotos[0].dbKey;
    editSaved(0);
    window.confirm = () => true; removeMiscPhoto(0); await sleep(500); clearForm(true);
    window.confirm = realConfirm;
    const after = await loadPhotoBytes(key, 'image/jpeg');
    record('T9 edit→remove misc→discard keeps original misc photo', !!after,
      after ? 'misc bytes intact' : 'MISC BYTES DELETED by removal during edit');
  }


  // T10 — repair of b83–b86 damage: entry points at a DELETED key while the
  // retaken photo survives as an orphan under the same entry+sourceId key.
  // reattachOrphanedPhotos must re-link the slot to the orphan (by key), and
  // export must then contain the photo.
  async function t10_reattachOrphans() {
    if (typeof window.reattachOrphanedPhotos !== 'function') {
      return record('T10 orphaned retake re-attached to its entry+slot', false, 'reattachOrphanedPhotos() missing (pre-b87 build)');
    }
    await resetAppState();
    fillForm('Heat Exchanger Left');
    sources[0].sourceId = genUuid();
    await captureInto('source_0', await makePhotoFile('t10-orig'));
    const A = saveEntry();
    const src = A.sources[0];
    const deadKey = A.photos.source_0.dbKey;
    // the retake that b86 would have left orphaned: same entry, same sourceId, new rev
    const orphanKey = photoStoreKey(A.id, src.sourceId);
    const orphanBytes = dataUrlFromBytesSeed('t10-retake');
    await storePhotoBytes(orphanKey, orphanBytes);
    // and the b86 deletion of the original
    await deletePhotoFromDB(deadKey);
    if (await loadPhotoBytes(deadKey, 'image/jpeg')) return record('T10 orphaned retake re-attached to its entry+slot', false, 'setup: original not deleted');
    const r = await reattachOrphanedPhotos(false);
    const ref = A.photos.source_0;
    const bytes = ref && ref.dbKey ? await loadPhotoBytes(ref.dbKey, 'image/jpeg') : null;
    const wantHash = await sha256Hex(dataUrlToUint8Array(orphanBytes));
    const gotHash = bytes ? await sha256Hex(bytes.bytes) : null;
    const { zip, confirms } = await runExport({ confirmResponse: false });
    let exported = false;
    if (zip) { const u = await unzipExport(zip.blob); const ja = jsonEntryFor(u.entriesJson, A); exported = !!(ja && ja.sources[0].photoFile); }
    record('T10 orphaned retake re-attached to its entry+slot',
      r.relinked === 1 && ref.dbKey === orphanKey && gotHash === wantHash && exported && confirms.length === 0,
      'relinked=' + r.relinked + ' keyMatch=' + (ref && ref.dbKey === orphanKey) + ' bytesMatch=' + (gotHash === wantHash) + ' exportedCleanly=' + exported + ' dialogs=' + confirms.length);
  }


  // T11 — the Air Handler 16 field scenario: Duplicate a source that has a photo,
  // retake the COPY's photo → the ORIGINAL source keeps its bytes, the copy has
  // its own sourceId, and the carried-over photo was a recorded dup.
  async function t11_duplicateSourceThenRetakeCopy() {
    await resetAppState();
    fillForm('AHU-16');
    sources[0].sourceId = genUuid();
    renderSources();
    await captureInto('source_0', await makePhotoFile('t11-first-device'));
    const origKey = photos.source_0.dbKey;
    duplicateSource(0);                                 // copy source + photo ref
    const copyHadDup = !!(photos.source_1 && photos.source_1.dupOf);
    await captureInto('source_1', await makePhotoFile('t11-second-device'));
    await sleep(700);
    const A = saveEntry();
    const problems = [];
    if (!(await loadPhotoBytes(origKey, 'image/jpeg'))) problems.push('ORIGINAL source photo bytes DELETED');
    if (A.photos.source_0.dbKey !== origKey) problems.push('original slot re-pointed');
    if (A.sources[0].sourceId === A.sources[1].sourceId) problems.push('duplicate sourceIds survived save');
    if (!copyHadDup) problems.push('copied photo was a bare shared reference (no dupOf)');
    const { zip } = await runExport();
    if (!zip) problems.push('export produced no zip');
    else {
      const u = await unzipExport(zip.blob);
      const ja = jsonEntryFor(u.entriesJson, A);
      if (!ja || !ja.sources[0].photoFile || !ja.sources[1].photoFile) problems.push('a source photo is missing from the export');
      else if (u.hashes[ja.sources[0].photoFile] === u.hashes[ja.sources[1].photoFile]) problems.push('both sources exported the SAME photo');
      if (u.manifest && u.manifest.counts && u.manifest.counts.missingPhotos) problems.push('export reported missing photos');
    }
    record('T11 duplicate source → retake copy keeps original (AH16 scenario)', problems.length === 0, problems.join('; '));
  }

  // ==========================================================================
  // BUILD 89 — one test per defect from the 2026-09-24 code review. Each was
  // written BEFORE its fix and fails on build 88.
  // ==========================================================================
  const mkSrc = (es) => ({ energySource: es, deviceType: 'Breaker', deviceId: '', quantity: 1, location: 'P1', duplicate: 'No', verification: 'Controls', detail: '', valveState: 'normal', noPhoto: false, collapsed: true });
  function mkEntry(name, opts) {
    opts = opts || {};
    const now = opts.savedAt || new Date().toISOString();
    return {
      id: opts.id || genUuid(), equipType: 'Pump', equipName: name, lotoId: '', hospitalCode: '',
      equipRoom: opts.room || 'B100', equipBuilding: opts.building || 'Main', template: '', tiedTo: '', tiedToName: '',
      notes: '', savedAt: now, timestamp: '', photoCount: 0,
      sources: opts.sources || [{ sourceId: genUuid(), energySource: 'Electrical', deviceType: 'Breaker', deviceId: '', quantity: 1, location: 'P', duplicate: 'No', verification: '', detail: '', valveState: 'normal', noPhoto: false }],
      photos: {}, miscPhotos: []
    };
  }
  // Every photographed source OBJECT must still be present and still carry
  // exactly its own photo; no other source may carry one of those photos.
  function bindingProblems(shot) {
    const problems = [];
    for (const s of shot) {
      const i = sources.indexOf(s.obj);
      if (i < 0) { problems.push('photographed source "' + s.label + '" was removed'); continue; }
      const ref = photos['source_' + i];
      if (!ref || ref.dbKey !== s.key) problems.push('"' + s.label + '" lost its photo');
    }
    sources.forEach((src, i) => {
      const ref = photos['source_' + i];
      if (!ref || !ref.dbKey) return;
      const owner = shot.find(s => s.key === ref.dbKey);
      if (owner && owner.obj !== src) problems.push('photo of "' + owner.label + '" is now on source #' + (i + 1) + ' "' + (src.energySource || '') + '"');
    });
    Object.keys(photos).forEach(k => {
      const m = /^source_(\d+)$/.exec(k);
      if (m && +m[1] >= sources.length && photos[k]) problems.push('stale photo ref ' + k + ' past the last source (the next Add Source inherits it)');
    });
    return problems;
  }
  const shotOf = (idxs) => idxs.map(i => ({ obj: sources[i], key: photos['source_' + i].dbKey, label: sources[i].energySource }));

  // T12 — RC1: template change after photographing (Water Heater Steam → Electric)
  async function t12_templateChangeKeepsPhotoOnItsSource() {
    const N = 'T12 template change never moves a photo to another source';
    await resetAppState();
    fillFormNoSources('WH-12');
    document.getElementById('equipTemplate').value = 'Water Heater - Steam';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    if (sources.length < 3) return record(N, false, 'setup: template gave ' + sources.length + ' sources');
    await captureInto('source_1', await makePhotoFile('t12-lps'));
    await captureInto('source_2', await makePhotoFile('t12-cond'));
    const shot = shotOf([1, 2]);
    document.getElementById('equipTemplate').value = 'Water Heater - Electric';
    await withDialogs({ confirm: true }, async () => {
      handleTemplateChange();
      if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange('Water Heater - Electric');
    });
    closeAllPrompts();
    const problems = bindingProblems(shot);
    record(N, problems.length === 0, problems.join('; ') || (sources.length + ' sources after the change: ' + sources.map(s => s.energySource).join(', ')));
  }

  // T13 — RC1: equipment-type change must not silently drop photographed sources
  async function t13_equipTypeChangeKeepsPhotographedSources() {
    const N = 'T13 equipment-type change keeps photographed sources';
    await resetAppState();
    fillFormNoSources('Pump-13');
    document.getElementById('equipType').value = 'CHW Pump';
    await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
    closeAllPrompts();
    if (sources.length < 2) return record(N, false, 'setup: CHW Pump gave ' + sources.length + ' sources');
    await captureInto('source_0', await makePhotoFile('t13-a'));
    await captureInto('source_1', await makePhotoFile('t13-b'));
    const shot = shotOf([0, 1]);
    document.getElementById('equipType').value = 'Exhaust Fan';
    await withDialogs({ confirm: true }, async () => {
      handleEquipTypeChange();
      if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange(getTemplate());
    });
    closeAllPrompts();
    const problems = bindingProblems(shot);
    record(N, problems.length === 0, problems.join('; ') || (sources.length + ' sources after the change'));
  }

  // T14 — RC1: a capture belongs to the source it was taken for, even if the
  // sources are reordered while the image is still decoding
  async function t14_captureLandsOnItsSourceAfterReorder() {
    const N = 'T14 capture lands on its own source after a reorder mid-capture';
    await resetAppState();
    fillFormNoSources('Race-14');
    sources.push(mkSrc('Electrical 480V'), mkSrc('LPS 10 PSI'));
    renderSources();
    const A = sources[0], B = sources[1];
    const file = await makePhotoFile('t14');
    handlePhoto({ files: [file] }, 'source_1');   // shot of B (LPS)…
    moveSource(1, -1);                            // …B moves to #1 before the image decodes
    await waitForPhotoWritesIdle(15000); await sleep(250);
    const bRef = photos['source_' + sources.indexOf(B)], aRef = photos['source_' + sources.indexOf(A)];
    const ok = !!(bRef && bRef.dbKey && bRef.unsaved === false) && !(aRef && aRef.dbKey);
    record(N, ok, ok ? 'photo is on LPS' : 'photo landed on ' + (aRef && aRef.dbKey ? 'the ELECTRICAL source' : 'no source'));
  }

  // T15 — RC1: changing the electrical-source count after photographing
  async function t15_electricalCountKeepsPhotoBinding() {
    const N = 'T15 electrical-count change keeps every photo on its source';
    await resetAppState();
    fillFormNoSources('MedAir-15');
    document.getElementById('equipTemplate').value = 'Medical Air';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    applyElectricalCountChoice(2);
    closeAllPrompts();
    const elec = sources.filter(s => s.auto && /^Electrical/.test(s.energySource || ''));
    const cao = sources.find(s => /Compressed Air Out/.test(s.energySource || ''));
    if (elec.length !== 2 || !cao) return record(N, false, 'setup: got ' + sources.map(s => s.energySource).join(', '));
    await captureInto('source_' + sources.indexOf(elec[1]), await makePhotoFile('t15-e2'));
    await captureInto('source_' + sources.indexOf(cao), await makePhotoFile('t15-cao'));
    const shot = shotOf([sources.indexOf(elec[1]), sources.indexOf(cao)]);
    applyElectricalCountChoice(1);
    closeAllPrompts();
    const problems = bindingProblems(shot);
    record(N, problems.length === 0, problems.join('; ') || sources.map(s => s.energySource).join(', '));
  }

  // T16 — RC2: Duplicate-with-photos is still copying when Edit is tapped on another unit
  async function t16_duplicateMidCopyCannotWriteIntoAnotherUnit() {
    const N = 'T16 duplicate mid-copy never writes into another unit';
    await resetAppState();
    fillForm('X-16');
    await captureInto('equip_main', await makePhotoFile('t16-x-main'));
    await captureInto('equip_dataplate', await makePhotoFile('t16-x-dp'));
    await captureInto('source_0', await makePhotoFile('t16-x-s0'));
    const X = saveEntry();
    fillForm('Y-16');
    await captureInto('equip_main', await makePhotoFile('t16-y-main'));
    const Y = saveEntry();
    const ySig = JSON.stringify(Object.keys(Y.photos).sort().map(k => [k, Y.photos[k].dbKey]));
    await withDialogs({ confirm: true }, async () => {
      showDuplicateDialog(savedEquipment.indexOf(X));
      const p = executeDuplicate(savedEquipment.indexOf(X), true);
      await sleep(0);                                 // copy loop is between awaits
      editSaved(savedEquipment.indexOf(Y));           // tap Edit on Y mid-copy
      await p;
    });
    await waitForPhotoWritesIdle(15000); await sleep(300);
    const problems = [];
    const Yn = savedEquipment.find(e => e.id === Y.id);
    if (JSON.stringify(Object.keys(Yn.photos).sort().map(k => [k, Yn.photos[k].dbKey])) !== ySig) problems.push('saved Y photos changed');
    const fid = currentEntryId;
    Object.keys(photos).forEach(k => {
      const r = photos[k];
      if (r && r.dbKey && keyOwner(r.dbKey) !== fid) problems.push('form slot ' + k + ' holds a key owned by another entry');
      if (fid === Y.id && r && r.dupOf && r.dupOf.entryId === X.id) problems.push('Y\'s form got X\'s copy in ' + k);
    });
    record(N, problems.length === 0, problems.join('; ') || ('open form: ' + (fid === Y.id ? 'Y (edit)' : 'the duplicate')));
  }

  // T17 — RC2: Reuse a photo, then Save & New before the copy finishes
  async function t17_reuseThenQuickSaveStaysWithItsUnit() {
    const N = 'T17 reused photo never lands on the next unit';
    await resetAppState();
    fillForm('A-17');
    await captureInto('equip_main', await makePhotoFile('t17-a'));
    const A = saveEntry();
    fillForm('B-17');
    _reuseCandidates = collectTodaysPhotos();
    const idx = _reuseCandidates.findIndex(c => c.dbKey === A.photos.equip_main.dbKey);
    if (idx < 0) return record(N, false, 'setup: A\'s photo not offered for reuse');
    await withDialogs({ confirm: true }, async () => { const p = reusePhotoInto('source_0', idx); performSaveAndNew(); await p; });
    await waitForPhotoWritesIdle(15000); await sleep(300);
    const problems = [];
    if (document.getElementById('equipName').value.trim() !== 'B-17') {
      if (Object.keys(photos).some(k => photos[k] && photos[k].dbKey)) problems.push('the reused photo landed on the NEXT unit\'s form');
      const B = savedEquipment.find(e => e.equipName === 'B-17');
      if (!B || !B.photos || !B.photos.source_0) problems.push('B-17 was saved without its reused photo');
    } else if (!(photos.source_0 && keyOwner(photos.source_0.dbKey) === currentEntryId)) problems.push('reused photo missing from B-17');
    record(N, problems.length === 0, problems.join('; '));
  }

  // T18 — RC2: misc photo, then Save & New before it finishes saving
  async function t18_miscThenQuickSaveStaysWithItsUnit() {
    const N = 'T18 misc photo never lands on the next unit';
    await resetAppState();
    fillForm('M-18');
    const f = await makePhotoFile('t18-misc');
    await withDialogs({ confirm: true }, async () => { handleMiscPhoto({ files: [f], value: '' }); performSaveAndNew(); });
    await waitForPhotoWritesIdle(15000); await sleep(400);
    const problems = [];
    if (document.getElementById('equipName').value.trim() !== 'M-18') {
      if (miscPhotos.length) problems.push('misc photo landed on the NEXT unit\'s form');
      const M = savedEquipment.find(e => e.equipName === 'M-18');
      if (!M || !(M.miscPhotos || []).length) problems.push('M-18 was saved without its misc photo');
    } else if (!(miscPhotos.length === 1 && keyOwner(miscPhotos[0].dbKey) === currentEntryId)) problems.push('misc photo missing from M-18');
    record(N, problems.length === 0, problems.join('; '));
  }

  // T19 — RC2: edit A, retake, then open B (discarding A's edit) mid-capture
  async function t19_discardedRetakeNeverWrittenIntoSavedEntry() {
    const N = 'T19 discarded retake is never written into the saved entry';
    await resetAppState();
    fillForm('A-19');
    await captureInto('equip_main', await makePhotoFile('t19-orig'));
    const A = saveEntry();
    const origKey = A.photos.equip_main.dbKey;
    fillForm('B-19'); const B = saveEntry();
    const retake = await makePhotoFile('t19-retake');
    await withDialogs({ confirm: true }, async () => {
      editSaved(savedEquipment.indexOf(A));
      handlePhoto({ files: [retake] }, 'equip_main');
      editSaved(savedEquipment.indexOf(B));         // "Discard edits to A?" → OK
    });
    await waitForPhotoWritesIdle(15000); await sleep(400);
    const An = savedEquipment.find(e => e.id === A.id);
    const ok = An.photos.equip_main.dbKey === origKey;
    record(N, ok, ok ? 'saved A keeps its original photo' : 'saved A now points at the DISCARDED retake');
  }

  // T20 — RC3: iOS reloads the WebView while an entry is open for edit
  async function t20_reloadMidEditDoesNotDuplicateEntry() {
    const N = 'T20 reload mid-edit then Save & New updates, never duplicates';
    await resetAppState();
    fillForm('R-20');
    await captureInto('equip_main', await makePhotoFile('t20'));
    const A = saveEntry();
    await sleep(300);
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(A)); });
    await sleep(400);
    editingEntry = null; savedEquipment = []; sources = []; photos = {}; miscPhotos = [];   // what a reload loses
    await loadAll();
    document.getElementById('equipNotes').value = 'edited after reload';
    performSaveAndNew();
    const ids = savedEquipment.map(e => e.id);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i).length;
    const ed = savedEquipment.find(e => e.id === A.id);
    record(N, savedEquipment.length === 1 && dups === 0 && ed && ed.notes === 'edited after reload',
      savedEquipment.length + ' entries, ' + dups + ' duplicate ids');
  }

  // T21 — RC3: export while an entry is open for edit
  async function t21_exportWhileEditingShipsEntryOnce() {
    const N = 'T21 export while editing ships the entry once';
    await resetAppState();
    fillForm('E-21');
    await captureInto('equip_main', await makePhotoFile('t21'));
    const A = saveEntry();
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(A)); });
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const n = u.entriesJson.entries.filter(e => e.id === A.id).length;
    record(N, n === 1, 'entry appears ' + n + 'x in entries.json');
  }

  // T22 — RC4: orphan re-attach must never fill an EMPTY slot (a discarded shot)
  async function t22_reattachNeverFillsAnEmptySlot() {
    const N = 'T22 re-attach never fills an empty slot with a discarded photo';
    await resetAppState();
    fillForm('D-22');
    await captureInto('equip_main', await makePhotoFile('t22-main'));
    const A = saveEntry();
    await withDialogs({ confirm: true }, async () => {
      editSaved(savedEquipment.indexOf(A));
      await captureInto('equip_dataplate', await makePhotoFile('t22-wrong-unit'));
      clearForm(true);                                   // discard
    });
    const r = await reattachOrphanedPhotos(false);
    const An = savedEquipment.find(e => e.id === A.id);
    const ok = !(An.photos && An.photos.equip_dataplate);
    record(N, ok, ok ? 'empty slot left empty (relinked ' + r.relinked + ')' : 'DISCARDED photo attached to the empty Data Plate slot');
  }

  // T23 — RC5: an interrupted filesystem write must never be served as the photo
  async function t23_interruptedFsWriteNeverServesPartialBytes() {
    const N = 'T23 interrupted filesystem write never serves partial bytes';
    await resetAppState();
    // every photo write lands HALF its bytes, then fails — an interrupted write
    const fs = installMockFS({
      writeFile: async (path, data, api) => {
        if (path.indexOf('loto_photos/') === 0) { const b = api.dec(data); await api.set(path, b.subarray(0, Math.floor(b.length / 2))); return 'throw'; }
      }
    });
    try {
      const key = photoStoreKey(genUuid(), 'main');
      const du = dataUrlFromBytesSeed('t23');
      const want = await sha256Hex(dataUrlToUint8Array(du));
      const res = await storePhotoBytes(key, du);
      const got = await loadPhotoBytes(key, 'image/jpeg');
      const gh = got ? await sha256Hex(got.bytes) : null;
      record(N, res.ok && gh === want, 'stored in ' + res.where + ', read-back ' + (gh === want ? 'matches' : 'is WRONG (partial file served)'));
    } finally { fs.restore(); }
  }

  // T24 — RC5: a 0-byte file (left by an interrupted old-build write) is not a saved photo
  async function t24_zeroByteFileIsNotCountedAsSaved() {
    const N = 'T24 0-byte photo file counts as MISSING, not saved';
    await resetAppState();
    const fs = installMockFS();
    try {
      fillForm('Z-24');
      await captureInto('equip_main', await makePhotoFile('t24'));
      const A = saveEntry();
      const key = A.photos.equip_main.dbKey;
      const path = photoFsRelPath(key);
      if (!(await fs.has(path))) return record(N, false, 'setup: photo not on the filesystem');
      await fs.set(path, new Uint8Array(0));
      await rawIdbDelete('photos', key).catch(() => {});
      try { localStorage.removeItem('photo_full_' + key); } catch (e) {}
      const r = await runIntegrityCheck(false);
      record(N, r.missing === 1, 'integrity: ' + r.missing + ' missing of ' + r.total);
    } finally { fs.restore(); }
  }

  // T25 — RC5: export checks bytes against the hash recorded at capture
  async function t25_exportVerifiesBytesAgainstCaptureHash() {
    const N = 'T25 export ships the verified copy, not a truncated file';
    await resetAppState();
    const fs = installMockFS();
    try {
      fillForm('P-25');
      await captureInto('equip_main', await makePhotoFile('t25'));
      await sleep(300);
      const A = saveEntry();
      const ref = A.photos.equip_main;
      const path = photoFsRelPath(ref.dbKey);
      const good = await fs.get(path);
      if (!good || !ref.sha256) return record(N, false, 'setup: FS copy=' + !!good + ' capture hash=' + !!ref.sha256);
      await savePhotoToDB(ref.dbKey, good.slice().buffer, 'image/jpeg');
      await fs.set(path, good.slice(0, Math.floor(good.length / 2)));
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
      const u = await unzipExport(zip.blob);
      const ja = jsonEntryFor(u.entriesJson, A);
      const h = ja && ja.photoFiles.main ? u.hashes[ja.photoFiles.main] : null;
      record(N, h === ref.sha256, h === ref.sha256 ? 'exported bytes match the capture hash' : 'exported the TRUNCATED file');
    } finally { fs.restore(); }
  }

  // T26 — RC5: WKWebView drops the IndexedDB connection
  async function t26_droppedIdbConnectionReconnects() {
    const N = 'T26 dropped IndexedDB connection reconnects (no silent fallback)';
    await resetAppState();
    const E = mkEntry('Conn-26');
    savedEquipment.push(E);
    try { photoDB && photoDB.close(); } catch (e) {}
    saveAll();
    await sleep(400);
    const onDisk = await rawIdbGet('metadata', 'saved_equipment');
    const listOk = Array.isArray(onDisk) && onDisk.some(e => e.id === E.id);
    try { photoDB && photoDB.close(); } catch (e) {}
    const key = photoStoreKey(genUuid(), 'main');
    const res = await savePhotoToDB(key, dataUrlToUint8Array(dataUrlFromBytesSeed('t26')).buffer, 'image/jpeg')
      .then(() => ({ where: 'idb' }), () => ({ where: 'failed' }));
    const inIdb = !!(await rawIdbGet('photos', key));
    photoDB = null; idbAvailable = true;     // keep later tests usable on a build that can't reconnect
    try { localStorage.removeItem('loto_saved'); } catch (e) {}
    record(N, listOk && res.where === 'idb' && inIdb, 'entry list reached IndexedDB=' + listOk + ', photo went to ' + res.where);
  }

  // T27 — RC5: the newest copy of the entry list wins at load
  async function t27_loadPrefersNewestEntryStore() {
    const N = 'T27 load picks the NEWEST entry list (stamped)';
    const N2 = 'T27b load picks the newest entry list (pre-b89 unstamped copies)';
    await resetAppState();
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const A = mkEntry('Old-27', { savedAt: hourAgo }), B = mkEntry('New-27');
    await rawIdbPut('metadata', 'saved_equipment', [A]);
    await rawIdbPut('metadata', 'saved_equipment_at', hourAgo);
    localStorage.setItem('loto_saved', JSON.stringify([A, B]));
    localStorage.setItem('loto_saved_at', new Date().toISOString());
    savedEquipment = [];
    await loadAll();
    record(N, savedEquipment.some(e => e.id === B.id), savedEquipment.length + ' entries loaded');
    // b88 wrote no store stamps: the copy with the newest CONTENT must win
    await rawIdbPut('metadata', 'saved_equipment', [A]);
    await rawIdbDelete('metadata', 'saved_equipment_at').catch(() => {});
    localStorage.setItem('loto_saved', JSON.stringify([A, B]));
    localStorage.removeItem('loto_saved_at');
    savedEquipment = [];
    await loadAll();
    record(N2, savedEquipment.some(e => e.id === B.id), savedEquipment.length + ' entries loaded');
    try { localStorage.removeItem('loto_saved'); localStorage.removeItem('loto_saved_at'); } catch (e) {}
  }

  // T28 — RC5: a failed read at launch must not overwrite the intact store
  async function t28_failedEntryReadNeverOverwritesStore() {
    const N = 'T28 failed entry-store read never overwrites it with the snapshot';
    await resetAppState();
    const A = mkEntry('Sketch-28');
    A.sketch = { diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }], labels: [] };
    savedEquipment = [A]; saveAll(); await sleep(400);
    const realGet = IDBObjectStore.prototype.get;
    let failures = 0;
    IDBObjectStore.prototype.get = function (k) {
      if (k === 'saved_equipment' && failures < 8) { failures++; throw new DOMException('Connection to Indexed Database server lost', 'UnknownError'); }
      return realGet.apply(this, arguments);
    };
    try { savedEquipment = []; await loadAll(); }
    finally { IDBObjectStore.prototype.get = realGet; }
    await sleep(400);
    const onDisk = await rawIdbGet('metadata', 'saved_equipment');
    const kept = Array.isArray(onDisk) && onDisk[0] && onDisk[0].sketch && (onDisk[0].sketch.strokes || []).length === 1;
    record(N, kept, kept ? 'intact store untouched (' + failures + ' read failures injected)' : 'store OVERWRITTEN by the stripped snapshot — sketch lost');
    savedEquipment = Array.isArray(onDisk) ? onDisk : [];
    document.querySelectorAll('.container > div').forEach(d => { if (/expected entries|entry store/i.test(d.textContent || '')) d.remove(); });
  }

  // T29 — RC5: a photo whose thumbnail is gone still shows (and guards) its slot
  async function t29_photoWithoutThumbnailStillShowsAsTaken() {
    const N = 'T29 photo without a thumbnail still shows as taken';
    await resetAppState();
    fillForm('NT-29');
    await captureInto('source_0', await makePhotoFile('t29-s'));
    await captureInto('equip_main', await makePhotoFile('t29-m'));
    const A = saveEntry();
    delete A.photos.source_0.thumbnail; delete A.photos.equip_main.thumbnail;
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(A)); });
    sources.forEach(s => { s.collapsed = false; }); renderSources();
    const problems = [];
    const srcEl = document.getElementById('photo_source_0'), mainEl = document.getElementById('photo_equip_main');
    if (!srcEl || !srcEl.classList.contains('has-photo')) problems.push('source slot shows "Tap to capture"');
    if (!mainEl || !mainEl.classList.contains('has-photo')) problems.push('main slot shows "Tap to capture"');
    let cameraOpened = false;
    const inp = document.getElementById('file_source_0');
    const realClick = inp && inp.click;
    if (inp) inp.click = () => { cameraOpened = true; };
    takePhoto('source_0');
    if (inp) inp.click = realClick;
    closePhotoDialog();
    if (cameraOpened) problems.push('tapping the slot opened the camera (a new shot would replace the photo)');
    record(N, problems.length === 0, problems.join('; '));
  }

  // T30 — RC5: a blank canvas ('data:,') is never stored as a photo
  async function t30_blankCanvasIsNotSavedAsAPhoto() {
    const N = 'T30 blank/empty image is never saved as a photo';
    await resetAppState();
    const r1 = await storePhotoBytes(photoStoreKey(genUuid(), 'main'), 'data:,');
    const r2 = await storePhotoBytes(photoStoreKey(genUuid(), 'main'), 'data:image/jpeg;base64,');
    fillForm('Blank-30');
    const file = await makePhotoFile('t30');
    const real = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () { return 'data:,'; };
    try { await withDialogs({}, async () => { handlePhoto({ files: [file] }, 'equip_main'); await sleep(1500); }); }
    finally { HTMLCanvasElement.prototype.toDataURL = real; }
    await waitForPhotoWritesIdle(5000);
    const fakeSaved = !!(photos.equip_main && photos.equip_main.unsaved === false);
    record(N, !r1.ok && !r2.ok && !fakeSaved, 'data:, ok=' + r1.ok + ', empty base64 ok=' + r2.ok + ', blank capture shown as saved=' + fakeSaved);
  }

  // T31 — misc + diagram files of same-named units in one room must not collide
  async function t31_sameNamedUnitsKeepTheirOwnMiscAndDiagramFiles() {
    const N = 'T31 same-named units keep their own misc + diagram files';
    await resetAppState();
    const mk = async (tag, color) => {
      const e = mkEntry('Pump');
      const k = photoStoreKey(e.id, mintMiscSlotToken());
      const du = dataUrlFromBytesSeed('t31-' + tag);
      await storePhotoBytes(k, du);
      e.miscPhotos = [{ dbKey: k, thumbnail: TINY_THUMB, fileType: 'image/jpeg', timestamp: e.savedAt }];
      e.sketch = { diagramKey: 'general', strokes: [{ color, width: 4, points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }] }], labels: [] };
      return { e, hash: await sha256Hex(dataUrlToUint8Array(du)) };
    };
    const a = await mk('a', '#ff0000'), b = await mk('b', '#0000ff');
    savedEquipment.push(a.e, b.e); saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const ja = jsonEntryFor(u.entriesJson, a.e), jb = jsonEntryFor(u.entriesJson, b.e);
    const problems = [];
    const ma = ja && ja.photoFiles.misc[0], mb = jb && jb.photoFiles.misc[0];
    if (!ma || !mb) problems.push('misc file missing');
    else {
      if (ma === mb) problems.push('both units point at one misc file ' + ma);
      if (u.hashes[ma] !== a.hash) problems.push('unit A\'s misc file holds other bytes');
      if (u.hashes[mb] !== b.hash) problems.push('unit B\'s misc file holds other bytes');
    }
    const da = ja && ja.photoFiles.diagram, db = jb && jb.photoFiles.diagram;
    if (!da || !db) problems.push('diagram missing');
    else if (da === db) problems.push('both units point at one diagram file ' + da);
    record(N, problems.length === 0, problems.join('; '));
  }

  // T32 — migration killed mid-run resumes without duplicate copies
  async function t32_interruptedMigrationResumesWithoutDuplicates() {
    const N = 'T32 interrupted key migration resumes without duplicate copies';
    await resetAppState();
    const ents = [];
    for (let i = 0; i < 3; i++) {
      const e = mkEntry('Mig-' + i);
      const legacy = 'Mig-' + i + '__equip_main';
      await storePhotoBytes(legacy, dataUrlFromBytesSeed('t32-' + i));
      e.photos.equip_main = { dbKey: legacy, thumbnail: TINY_THUMB, timestamp: e.savedAt, fileType: 'image/jpeg' };
      ents.push(e);
    }
    savedEquipment = ents; saveAll(); await sleep(400);
    localStorage.removeItem(PHOTO_KEY_MIGRATION_FLAG);
    const realStore = window.storePhotoBytes;
    let n = 0;
    window.storePhotoBytes = async function (k, d) { if (++n === 3) throw new Error('app killed mid-migration'); return realStore(k, d); };
    try { await runPhotoKeyMigration(); } catch (e) {} finally { window.storePhotoBytes = realStore; }
    await sleep(400);
    savedEquipment = (await rawIdbGet('metadata', 'saved_equipment')) || [];   // relaunch: only what was persisted
    await runPhotoKeyMigration();
    const ids = new Set(ents.map(e => e.id));
    const copies = [...(await presentPhotoKeySet())].filter(k => ids.has(keyOwner(k)));
    const allRekeyed = savedEquipment.length === 3 && savedEquipment.every(e => e.photos.equip_main && keyOwner(e.photos.equip_main.dbKey) === e.id);
    record(N, copies.length === 3 && allRekeyed, copies.length + ' stored copies for 3 photos; all re-keyed=' + allRekeyed);
  }

  // T33 — pre-b83 intentional shares (shared:true, no dupOf) must not hard-block export
  async function t33_preB83SharedRefsDoNotBlockExport() {
    const N = 'T33 pre-b83 "Reuse" shares do not hard-block export';
    await resetAppState();
    const du = dataUrlFromBytesSeed('t33-shared');
    const mk = async (name, shared) => {
      const e = mkEntry(name);
      const k = photoStoreKey(e.id, 'main');
      await storePhotoBytes(k, du);
      e.photos.equip_main = { dbKey: k, thumbnail: TINY_THUMB, timestamp: e.savedAt, fileType: 'image/jpeg', legacySuspect: true, migratedFrom: name + '__equip_main' };
      if (shared) e.photos.equip_main.shared = true;
      return e;
    };
    savedEquipment.push(await mk('Orig-33', false), await mk('Reused-33', true)); saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    const blocked = confirms.some(c => /BLOCKED/.test(c));
    record(N, !!zip && !blocked, 'zip=' + !!zip + ' blocked=' + blocked);
  }

  async function importBackupJson(obj, answers) {
    const file = new File([JSON.stringify(obj)], 'LOTO_Backup_test.json', { type: 'application/json' });
    return withDialogs(answers, async () => { handleBackupFile({ target: { files: [file] } }); await sleep(700); });
  }
  // T34 — backup REPLACE keeps the device's (retaken) photo refs
  async function t34_backupReplaceKeepsDevicePhotoRefs() {
    const N = 'T34 backup REPLACE keeps the device\'s current photo refs';
    await resetAppState();
    const A = mkEntry('BK-34');
    const k2 = photoStoreKey(A.id, 'main');
    await storePhotoBytes(k2, dataUrlFromBytesSeed('t34-retake'));
    A.photos.equip_main = { dbKey: k2, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg' };
    savedEquipment = [A]; saveAll();
    const old = JSON.parse(JSON.stringify(A));
    old.photos.equip_main = { dbKey: photoStoreKey(A.id, 'main'), thumbnail: TINY_THUMB, timestamp: '2026-08-01T10:00:00.000Z', fileType: 'image/jpeg' };
    await importBackupJson({ version: 2, entries: [old] }, { confirm: false, choice: { 'backup-import': 'replace' } });
    const An = savedEquipment.find(e => e.id === A.id);
    record(N, !!An && An.photos.equip_main.dbKey === k2, An ? (An.photos.equip_main.dbKey === k2 ? 'device retake kept' : 'REVERTED to the backup\'s older photo') : 'entry gone');
  }
  // T35 — dismissing the backup-import question must change nothing
  async function t35_backupDialogCancelChangesNothing() {
    const N = 'T35 cancelling a backup import changes nothing';
    await resetAppState();
    const A = mkEntry('Keep-35'), B = mkEntry('Keep2-35');
    savedEquipment = [A, B]; saveAll();
    await importBackupJson({ version: 2, entries: [mkEntry('FromBackup-35')] }, { confirm: false, choice: { 'backup-import': 'cancel' } });
    const same = savedEquipment.map(e => e.id).sort().join() === [A.id, B.id].sort().join();
    record(N, same, savedEquipment.length + ' entries after cancel: ' + savedEquipment.map(e => e.equipName).join(', '));
  }

  // T36 — a form holding only photos is not discarded without asking
  async function t36_photoOnlyFormIsNotDiscardedSilently() {
    const N = 'T36 photo-only form is never discarded without asking';
    await resetAppState();
    fillForm('Saved-36'); const A = saveEntry();
    document.getElementById('equipName').value = ''; sources = []; renderSources();
    await captureInto('equip_main', await makePhotoFile('t36'));
    const key = photos.equip_main.dbKey;
    const out = [];
    for (const act of ['Edit', 'Duplicate']) {
      let asked = 0;
      await withDialogs({ confirm: () => { asked++; return false; } }, async () => {
        if (act === 'Edit') editSaved(savedEquipment.indexOf(A)); else duplicateSaved(savedEquipment.indexOf(A));
      });
      const dd = document.getElementById('duplicateDialog'); if (dd) dd.remove();
      const kept = !!(photos.equip_main && photos.equip_main.dbKey === key);
      out.push(act + ': asked=' + (asked > 0) + ' photo kept=' + kept);
      if (!asked || !kept) return record(N, false, out.join(' | '));
    }
    record(N, true, out.join(' | '));
  }

  // T37 — same collector tag on two devices → distinct filenames
  async function t37_sameTagOnTwoDevicesGivesDistinctFilenames() {
    const N = 'T37 same collector tag on two devices never collides';
    const realTag = localStorage.getItem('loto_collector_tag'), realDev = localStorage.getItem('loto_device_id');
    try {
      localStorage.setItem('loto_collector_tag', 'JW');
      localStorage.setItem('loto_device_id', '11111111-1111-4111-8111-111111111111');
      const a = formatPhotoName('0924', 1);
      localStorage.setItem('loto_device_id', '22222222-2222-4222-8222-222222222222');
      const b = formatPhotoName('0924', 1);
      record(N, a !== b && /JW/.test(a), a + ' vs ' + b);
    } finally {
      if (realTag === null) localStorage.removeItem('loto_collector_tag'); else localStorage.setItem('loto_collector_tag', realTag);
      if (realDev === null) localStorage.removeItem('loto_device_id'); else localStorage.setItem('loto_device_id', realDev);
      ensureDeviceId();
    }
  }

  // T38 — photo numbers are reserved before the ZIP leaves the device
  async function t38_sequenceReservedBeforeHandOff() {
    const N = 'T38 photo numbers reserved before the ZIP is handed off';
    const N2 = 'T38b re-typing an already-used start number is caught';
    await resetAppState();
    fillForm('Seq-38');
    await captureInto('equip_main', await makePhotoFile('t38-a'));
    await captureInto('equip_dataplate', await makePhotoFile('t38-b'));
    saveEntry();
    let atShare = null;
    const first = await runExport({ confirmResponse: true, start: 1, onShare: () => { atShare = localStorage.getItem('photoSeqNext'); } });
    record(N, !!first.zip && atShare === '3', 'photoSeqNext at hand-off = ' + atShare + ' (want 3)');
    const second = await runExport({ confirmResponse: true, start: 1, choice: { 'seq-reuse': 'next' } });
    let firstName = null;
    if (second.zip) { const u = await unzipExport(second.zip.blob); firstName = Object.keys(u.hashes).sort()[0] || null; }
    const caught = second.confirms.some(c => /seq-reuse/.test(c));
    record(N2, caught && !!firstName && /_00003\.jpg$/.test(firstName), 'asked=' + caught + ', first file=' + firstName);
  }

  // T39 — linking a source keeps (and exports) its photo; the link carries ids
  async function t39_linkingASourceKeepsItsPhoto() {
    const N = 'T39 linking a source keeps + exports its photo';
    await resetAppState();
    fillForm('Other-39'); const O = saveEntry();
    fillForm('Linked-39');
    await captureInto('source_0', await makePhotoFile('t39'));
    const key = photos.source_0.dbKey;
    showLinkDialog(0);
    applyLink(savedEquipment.indexOf(O), 0);
    closeLinkDialog();
    const kept = !!(photos.source_0 && photos.source_0.dbKey === key);
    const L = saveEntry();
    const { zip } = await runExport({ confirmResponse: true });
    let exported = false, ids = false;
    if (zip) {
      const u = await unzipExport(zip.blob); const jl = jsonEntryFor(u.entriesJson, L);
      exported = !!(jl && jl.sources[0].photoFile);
      ids = !!(jl && jl.sources[0].linkedTo && jl.sources[0].linkedTo.entryId === O.id && jl.sources[0].linkedTo.sourceId === O.sources[0].sourceId);
    }
    record(N, kept && exported && ids, 'photo kept=' + kept + ' exported=' + exported + ' link carries entry+source ids=' + ids);
  }

  // T40 — Save & New must not carry the sketch into the next form's autosave
  async function t40_saveAndNewDoesNotCarrySketchForward() {
    const N = 'T40 Save & New never carries the sketch into the next unit';
    await resetAppState();
    fillForm('Sk-40');
    restoreSketch({ diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.6 }] }], labels: [] });
    await sleep(150);
    performSaveAndNew();
    await sleep(500);
    const wip = await rawIdbGet('metadata', 'current_wip');
    const sk = wip && wip.sketch;
    const carried = !!(sk && ((sk.strokes || []).length || (sk.labels || []).length));
    record(N, !carried, carried ? 'blank form\'s autosave still holds the previous unit\'s drawing' : 'clean');
  }

  // T41 — more than 10 sources: the XLSX can't hold them, so say so
  async function t41_moreThanTenSourcesIsFlagged() {
    const N = 'T41 more than 10 sources is flagged (XLSX holds 10)';
    await resetAppState();
    fillFormNoSources('Big-41');
    for (let i = 0; i < 12; i++) sources.push(mkSrc('Electrical 480V'));
    renderSources();
    const A = saveEntry();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    const warned = confirms.some(c => /\b1[01]\b[^\n]*source|sources? 11|10 sources/i.test(c));
    let all12 = false;
    if (zip) { const u = await unzipExport(zip.blob); const ja = jsonEntryFor(u.entriesJson, A); all12 = !!(ja && ja.sources.length === 12); }
    record(N, warned && all12, 'warned=' + warned + ' entries.json keeps all 12=' + all12);
  }

  // T42 — the last saved entry gets ITS diagram, not the open form's
  async function t42_lastEntryGetsItsOwnDiagram() {
    const N = 'T42 last saved entry exports its own diagram';
    await resetAppState();
    const A = mkEntry('Diag-42');
    A.sketch = { diagramKey: 'general', strokes: [{ color: '#ff0000', width: 5, points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.2 }] }], labels: [] };
    savedEquipment.push(A); saveAll();
    const want = await sha256Hex(dataUrlToUint8Array(await renderSketchOffscreen(A.sketch)));
    fillFormNoSources('Form-42');
    restoreSketch({ diagramKey: 'general', strokes: [{ color: '#0000ff', width: 5, points: [{ x: 0.2, y: 0.8 }, { x: 0.8, y: 0.8 }] }], labels: [] });
    await sleep(250);
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const ja = jsonEntryFor(u.entriesJson, A);
    const f = ja && ja.photoFiles.diagram;
    const got = f && u.files[f] ? await sha256Hex(u.files[f]) : null;
    record(N, got === want, got === want ? 'own drawing' : 'NOT its drawing (open form\'s sketch leaked in)');
  }

  // T43 — entries with pre-UUID numeric ids (Bath, April) export their photos
  async function t43_numericIdEntryExportsItsPhotos() {
    const N = 'T43 numeric-id (pre-UUID) entry exports its photos';
    await resetAppState();
    const A = mkEntry('Bath-43', { id: '1713012345678' });
    savedEquipment.push(A); saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    await captureInto('equip_main', await makePhotoFile('t43'));
    performSaveAndNew();
    const { zip, confirms } = await runExport({ confirmResponse: false });
    let ok = false;
    if (zip) { const u = await unzipExport(zip.blob); const ja = jsonEntryFor(u.entriesJson, A); ok = !!(ja && ja.photoFiles.main); }
    record(N, ok, ok ? 'photo exported' : 'photo excluded / export stopped: ' + confirms.join(' | ').slice(0, 140));
  }

  // T44 — hashing works without WebCrypto (insecure-context web use)
  async function t44_hashingWorksWithoutWebCrypto() {
    const N = 'T44 hashing works without crypto.subtle';
    const proto = window.SubtleCrypto && SubtleCrypto.prototype;
    const real = proto && proto.digest;
    if (!real) return record(N, false, 'no SubtleCrypto to disable');
    const big = new Uint8Array(300 * 1024); for (let i = 0; i < big.length; i++) big[i] = (i * 31 + 7) & 255;
    const wantBig = await sha256Hex(big);
    proto.digest = function () { return Promise.reject(new Error('crypto.subtle unavailable')); };
    let h, hb;
    try { h = await sha256HexOfBytes(new TextEncoder().encode('abc')); hb = await sha256HexOfBytes(big); }
    finally { proto.digest = real; }
    const want = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    record(N, h === want && hb === wantBig, 'sha256("abc")=' + String(h).slice(0, 16) + '… 300KB match=' + (hb === wantBig));
  }

  // T45 — the IndexedDB self-test record is never counted as a photo
  async function t45_idbSelfTestKeyIsNotAPhoto() {
    const N = 'T45 IndexedDB self-test record is not a photo';
    await resetAppState();
    await savePhotoToDB('__idb_test__', new ArrayBuffer(4), 'test');
    const present = await presentPhotoKeySet();
    const leaked = present.has('__idb_test__');
    await deletePhotoFromDB('__idb_test__');
    record(N, !leaked, leaked ? '__idb_test__ counted as a stored photo (shows in quarantine)' : 'excluded');
  }

  // T46 — unreadable photo directory must not strand FS-only legacy photos
  async function t46_unreadableFsNeverStrandsLegacyPhotos() {
    const N = 'T46 unreadable photo folder never strands legacy photos';
    await resetAppState();
    let failReaddir = true;
    const fs = installMockFS({ readdir: () => (failReaddir ? 'throw' : null) });
    try {
      const e = mkEntry('FSOnly-46');
      const legacy = 'FSOnly-46__equip_main';
      await fs.set(photoFsRelPath(legacy), dataUrlToUint8Array(dataUrlFromBytesSeed('t46')));
      e.photos.equip_main = { dbKey: legacy, thumbnail: TINY_THUMB, timestamp: e.savedAt, fileType: 'image/jpeg' };
      savedEquipment = [e]; saveAll();
      localStorage.removeItem(PHOTO_KEY_MIGRATION_FLAG);
      await runPhotoKeyMigration();
      const doneWhileUnreadable = !!localStorage.getItem(PHOTO_KEY_MIGRATION_FLAG);
      failReaddir = false;
      if (!doneWhileUnreadable) await runPhotoKeyMigration();
      const rekeyed = keyOwner(savedEquipment[0].photos.equip_main.dbKey) === e.id;
      record(N, !doneWhileUnreadable && rekeyed, 'marked done while unreadable=' + doneWhileUnreadable + ', re-keyed on retry=' + rekeyed);
    } finally { fs.restore(); }
  }

  // T47 — concurrent hash-index updates are not lost
  async function t47_concurrentHashRecordsAreNotLost() {
    const N = 'T47 concurrent photo-hash records are all kept';
    await resetAppState();
    await saveMetadata('photo_hash_index', {});
    await Promise.all([1, 2, 3, 4].map(i => recordPhotoHash('h' + i, 'e' + i, 'k' + i, false)));
    const idx = await getPhotoHashIndex();
    const n = [1, 2, 3, 4].filter(i => idx['h' + i]).length;
    record(N, n === 4, n + ' of 4 kept');
  }

  // T48 — a capture that fails while processing is reported, not silent
  async function t48_processingFailureIsReported() {
    const N = 'T48 photo-processing failure is reported';
    await resetAppState();
    fillForm('Err-48');
    const file = await makePhotoFile('t48');
    const real = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () { throw new Error('canvas exploded'); };
    let msgs = [];
    try { msgs = await withToasts(async () => { await withDialogs({}, async () => { handlePhoto({ files: [file] }, 'equip_main'); await sleep(1500); }); }); }
    finally { HTMLCanvasElement.prototype.toDataURL = real; }
    const idle = await waitForPhotoWritesIdle(3000);
    const warned = msgs.some(m => /not saved|could not|failed/i.test(m));
    record(N, warned && idle && !(photos.equip_main && photos.equip_main.dbKey), 'warned=' + warned + ' idle=' + idle);
  }

  // T49 — Photo Audit names slots the way the form does
  async function t49_auditUsesHumanSlotNames() {
    const N = 'T49 Photo Audit uses human slot names';
    await resetAppState();
    const du = dataUrlFromBytesSeed('t49');
    for (const n of ['Aud-A', 'Aud-B']) {
      const e = mkEntry(n);
      const k = photoStoreKey(e.id, e.sources[0].sourceId);
      await storePhotoBytes(k, du);
      e.photos.source_0 = { dbKey: k, thumbnail: TINY_THUMB, timestamp: e.savedAt, fileType: 'image/jpeg' };
      savedEquipment.push(e);
    }
    saveAll();
    await runPhotoAudit('all');
    const ov = document.getElementById('photoAuditOverlay');
    const text = ov ? ov.textContent : '';
    if (ov) ov.remove();
    const raw = /\[(source_\d+|equip_main|equip_dataplate|equip_ee|misc_\d+)\]/.test(text);
    record(N, !raw && /Source 1/.test(text), raw ? 'audit shows raw ids like [source_0]' : 'human labels');
  }

  // T50 — two saved rows with one entry id export once (the newest)
  async function t50_sameIdRowsExportOnce() {
    const N = 'T50 two saved copies of one entry export once (newest)';
    await resetAppState();
    const A = mkEntry('Twice-50', { savedAt: new Date(Date.now() - 3600e3).toISOString() });
    const A2 = JSON.parse(JSON.stringify(A)); A2.notes = 'the later save'; A2.savedAt = new Date().toISOString();
    savedEquipment = [A, A2]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const rows = u.entriesJson.entries.filter(e => e.id === A.id);
    record(N, rows.length === 1 && rows[0].notes === 'the later save', rows.length + ' rows' + (rows[0] ? ' (notes "' + rows[0].notes + '")' : ''));
  }

  // T51 — with nothing saved today, the export defaults to the newest day, not All dates
  async function t51_exportDefaultsToNewestDate() {
    const N = 'T51 export defaults to the newest date, not All';
    await resetAppState();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const old = new Date(); old.setDate(old.getDate() - 20);
    savedEquipment = [mkEntry('Yday-51', { savedAt: y.toISOString() }), mkEntry('Old-51', { savedAt: old.toISOString() })];
    saveAll();
    showExportDialog();
    const v = document.getElementById('exportDateFilter').value;
    closeExportDialog();
    record(N, v === localDateStr(y), 'default = ' + v + ' (want ' + localDateStr(y) + ')');
  }

  // T52 — the native save writes the ZIP in chunks (no giant base64 string)
  async function t52_nativeShareWritesZipInChunks() {
    const N = 'T52 native export save is chunked, bytes intact';
    const fs = installMockFS();
    try {
      const big = new Uint8Array(9 * 1024 * 1024); for (let i = 0; i < big.length; i += 997) big[i] = i & 255;
      const r = await saveOrShare(new Blob([big], { type: 'application/zip' }), 'FieldExport_t52.zip', 'application/zip');
      const written = await fs.get('FieldExport_t52.zip', 'CACHE');
      await fs.del('FieldExport_t52.zip', 'CACHE');
      const writes = fs.calls.filter(c => (c.op === 'writeFile' || c.op === 'appendFile') && c.path === 'FieldExport_t52.zip');
      const maxLen = Math.max(0, ...writes.map(c => c.len));
      const same = !!written && written.length === big.length && (await sha256Hex(written)) === (await sha256Hex(big));
      record(N, !!(r && r.saved) && same && maxLen <= 6 * 1024 * 1024, 'intact=' + same + ', largest single write ' + (maxLen / 1048576).toFixed(1) + ' MB');
    } finally { fs.restore(); }
  }

  // T53 — a source photo keyed to a DIFFERENT source never ships silently
  async function t53_sourcePhotoOnWrongSourceIsNotExportedSilently() {
    const N = 'T53 photo bound to the wrong source is not exported silently';
    const N2 = 'T53b a human-confirmed source photo exports';
    await resetAppState();
    const e = mkEntry('Swap-53', { sources: [mkSrc('LPS 10 PSI'), mkSrc('DW In')] });
    e.sources.forEach(s => { s.sourceId = genUuid(); });
    const k0 = photoStoreKey(e.id, e.sources[1].sourceId);   // taken for DW In, sitting on LPS
    const k1 = photoStoreKey(e.id, genUuid());               // taken for a source no longer on the unit
    await storePhotoBytes(k0, dataUrlFromBytesSeed('t53-a')); await storePhotoBytes(k1, dataUrlFromBytesSeed('t53-b'));
    e.photos.source_0 = { dbKey: k0, thumbnail: TINY_THUMB, timestamp: e.savedAt, fileType: 'image/jpeg' };
    e.photos.source_1 = { dbKey: k1, thumbnail: TINY_THUMB, timestamp: e.savedAt, fileType: 'image/jpeg' };
    savedEquipment = [e]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    let shipped = 0, inManifest = false;
    if (zip) {
      const u = await unzipExport(zip.blob); const j = jsonEntryFor(u.entriesJson, e);
      shipped = j ? j.sources.filter(s => s.photoFile).length : 0;
      inManifest = !!(u.manifest && (u.manifest.unsafe || []).length >= 2);
    }
    const warned = confirms.some(c => /different source|no longer on th(is|e) unit|wrong source/i.test(c));
    record(N, warned && shipped === 0 && (!zip || inManifest), 'warned=' + warned + ' shipped=' + shipped + ' listed in manifest=' + inManifest);
    if (typeof window.confirmSourcePhoto !== 'function') return record(N2, false, 'confirmSourcePhoto() missing');
    confirmSourcePhoto(e.id, 'source_0');
    const again = await runExport({ confirmResponse: true });
    let ok = false;
    if (again.zip) { const u = await unzipExport(again.zip.blob); const j = jsonEntryFor(u.entriesJson, e); ok = !!(j && j.sources[0].photoFile && !j.sources[1].photoFile); }
    record(N2, ok, 'confirmed photo exported=' + ok);
  }

  // T54 — regression guard: a pre-b88 duplicated source (shared sourceId) keeps
  // its own photo through the save-time id de-dup and the export binding check
  async function t54_dedupedSourceKeepsItsOwnPhoto() {
    const N = 'T54 de-duplicated source keeps + exports its own photo';
    await resetAppState();
    fillFormNoSources('Dedup-54');
    const S = genUuid();
    sources.push(Object.assign(mkSrc('Electrical 480V'), { sourceId: S }), Object.assign(mkSrc('Electrical 480V'), { sourceId: S }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('t54-a'));
    await captureInto('source_1', await makePhotoFile('t54-b'));
    const A = saveEntry();
    const { zip, confirms } = await runExport({ confirmResponse: false });
    let both = false;
    if (zip) { const u = await unzipExport(zip.blob); const j = jsonEntryFor(u.entriesJson, A); both = !!(j && j.sources[0].photoFile && j.sources[1].photoFile && u.hashes[j.sources[0].photoFile] !== u.hashes[j.sources[1].photoFile]); }
    record(N, both, both ? 'both sources exported with their own photos' : 'export stopped/excluded: ' + confirms.join(' | ').slice(0, 140));
  }

  // T55 — deleting one of two same-id rows must not delete photo bytes
  async function t55_deletingASameIdCopyKeepsPhotos() {
    const N = 'T55 deleting one copy of a twice-saved entry keeps photo bytes';
    await resetAppState();
    const A = mkEntry('Twin-55');
    const k1 = photoStoreKey(A.id, 'main'); await storePhotoBytes(k1, dataUrlFromBytesSeed('t55-1'));
    A.photos.equip_main = { dbKey: k1, thumbnail: TINY_THUMB, timestamp: A.savedAt, fileType: 'image/jpeg' };
    const A2 = JSON.parse(JSON.stringify(A));
    const k2 = photoStoreKey(A.id, 'main'); await storePhotoBytes(k2, dataUrlFromBytesSeed('t55-2'));
    A2.photos.equip_main.dbKey = k2;
    savedEquipment = [A, A2]; saveAll();
    await withDialogs({ confirm: true }, async () => { deleteSaved(0); });
    await sleep(400);
    const still = !!(await loadPhotoBytes(k1, 'image/jpeg'));
    record(N, still, still ? 'bytes kept' : 'photo bytes DELETED while the same entry id is still saved');
  }

  // T56 — a retake that fails to save keeps the previous photo on the slot
  async function t56_failedRetakeKeepsPreviousPhoto() {
    const N = 'T56 failed retake keeps the previous photo';
    await resetAppState();
    fillForm('Retake-56');
    await captureInto('equip_main', await makePhotoFile('t56-good'));
    const good = photos.equip_main.dbKey;
    const bad = await makePhotoFile('t56-bad');
    const realStore = window.storePhotoBytes;
    window.storePhotoBytes = async () => ({ ok: false, where: 'none' });
    try { await withDialogs({}, async () => { handlePhoto({ files: [bad] }, 'equip_main'); await waitForPhotoWritesIdle(15000); await sleep(400); }); }
    finally { window.storePhotoBytes = realStore; }
    const ok = !!(photos.equip_main && photos.equip_main.dbKey === good);
    record(N, ok, ok ? 'previous photo kept' : 'slot now points at the retake that did NOT save');
  }

  // T57 — RC5: "export anyway" must not stamp an entry whose photos didn't ship
  async function t57_incompleteExportIsNotStampedExported() {
    const N = 'T57 export-anyway never marks an incomplete entry exported';
    await resetAppState();
    const good = mkEntry('Good-57'), bad = mkEntry('Bad-57');
    const kg = photoStoreKey(good.id, 'main');
    await storePhotoBytes(kg, dataUrlFromBytesSeed('t57-good'));
    good.photos.equip_main = { dbKey: kg, thumbnail: TINY_THUMB, timestamp: good.savedAt, fileType: 'image/jpeg' };
    bad.photos.equip_main = { dbKey: photoStoreKey(bad.id, 'main'), thumbnail: TINY_THUMB, timestamp: bad.savedAt, fileType: 'image/jpeg' };   // bytes never stored
    savedEquipment = [good, bad]; saveAll();
    const { zip } = await runExport({ confirmResponse: true });   // "OK = export anyway (incomplete)"
    const g = savedEquipment.find(e => e.id === good.id), b = savedEquipment.find(e => e.id === bad.id);
    record(N, !!zip && !!g.exportedAt && !b.exportedAt,
      'zip=' + !!zip + ', complete entry stamped=' + !!g.exportedAt + ', incomplete entry stamped "exported"=' + !!b.exportedAt);
  }

  // T58 — the header photo-integrity badge follows deletes (it only refreshed
  // on capture/launch, so it kept counting — or flagging as MISSING — photos
  // of entries that no longer exist)
  async function t58_integrityBadgeFollowsDeletes() {
    const N = 'T58 photo-integrity badge updates after a delete';
    await resetAppState();
    fillForm('Badge-58');
    await captureInto('equip_main', await makePhotoFile('t58'));
    saveEntry();
    const badge = () => { const b = document.getElementById('integrityBadge'); return !b ? '' : (b.style.display === 'none' ? '(hidden)' : b.textContent); };
    // wait for the debounced check to run AND finish (hidden browser tabs
    // throttle timers, so a fixed sleep can sample it mid-check)
    const settled = async () => {
      await sleep(700);
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        if (!_integrityTimer && !/Checking/.test(badge())) return badge();
        await sleep(100);
      }
      return badge();
    };
    const before = await settled();
    await withDialogs({ confirm: true }, async () => { deleteSaved(0); });
    const after = await settled();
    record(N, /1 photo/.test(before) && after === '(hidden)', 'before delete "' + before + '", after delete "' + after + '"');
  }

  // ---------- runner --------------------------------------------------------
  const ALL_TESTS = [t1_sameNameDistinctExports, t2_reExportStability, t3_duplicateEntry,
    t4_crossLinkGate, t4b_hashGateHardAbort, t5_legacyKeyNotSilent, t6_keyFormat, t8_retakeThenDiscard,
    t9_removeMiscThenDiscard, t10_reattachOrphans, t11_duplicateSourceThenRetakeCopy,
    t12_templateChangeKeepsPhotoOnItsSource, t13_equipTypeChangeKeepsPhotographedSources,
    t14_captureLandsOnItsSourceAfterReorder, t15_electricalCountKeepsPhotoBinding,
    t16_duplicateMidCopyCannotWriteIntoAnotherUnit, t17_reuseThenQuickSaveStaysWithItsUnit,
    t18_miscThenQuickSaveStaysWithItsUnit, t19_discardedRetakeNeverWrittenIntoSavedEntry,
    t20_reloadMidEditDoesNotDuplicateEntry, t21_exportWhileEditingShipsEntryOnce,
    t22_reattachNeverFillsAnEmptySlot, t23_interruptedFsWriteNeverServesPartialBytes,
    t24_zeroByteFileIsNotCountedAsSaved, t25_exportVerifiesBytesAgainstCaptureHash,
    t26_droppedIdbConnectionReconnects, t27_loadPrefersNewestEntryStore,
    t28_failedEntryReadNeverOverwritesStore, t29_photoWithoutThumbnailStillShowsAsTaken,
    t30_blankCanvasIsNotSavedAsAPhoto, t31_sameNamedUnitsKeepTheirOwnMiscAndDiagramFiles,
    t32_interruptedMigrationResumesWithoutDuplicates, t33_preB83SharedRefsDoNotBlockExport,
    t34_backupReplaceKeepsDevicePhotoRefs, t35_backupDialogCancelChangesNothing,
    t36_photoOnlyFormIsNotDiscardedSilently, t37_sameTagOnTwoDevicesGivesDistinctFilenames,
    t38_sequenceReservedBeforeHandOff, t39_linkingASourceKeepsItsPhoto,
    t40_saveAndNewDoesNotCarrySketchForward, t41_moreThanTenSourcesIsFlagged,
    t42_lastEntryGetsItsOwnDiagram, t43_numericIdEntryExportsItsPhotos,
    t44_hashingWorksWithoutWebCrypto, t45_idbSelfTestKeyIsNotAPhoto,
    t46_unreadableFsNeverStrandsLegacyPhotos, t47_concurrentHashRecordsAreNotLost,
    t48_processingFailureIsReported, t49_auditUsesHumanSlotNames, t50_sameIdRowsExportOnce,
    t51_exportDefaultsToNewestDate, t52_nativeShareWritesZipInChunks,
    t53_sourcePhotoOnWrongSourceIsNotExportedSilently, t54_dedupedSourceKeepsItsOwnPhoto,
    t55_deletingASameIdCopyKeepsPhotos, t56_failedRetakeKeepsPreviousPhoto,
    t57_incompleteExportIsNotStampedExported, t58_integrityBadgeFollowsDeletes];

  // Inside the app, the suite may only run on the iOS SIMULATOR: its app
  // container lives under ~/Library/Developer/CoreSimulator/Devices/ on the
  // Mac, a real iPad's under /var/mobile/. Checked from the Filesystem
  // plugin's own path for the DATA directory.
  async function isIosSimulatorInstall() {
    try {
      const FS = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
      const r = await FS.getUri({ path: 'loto_photos', directory: 'DATA' });
      return /\/Library\/Developer\/CoreSimulator\/Devices\//.test(decodeURIComponent(String((r && r.uri) || '')));
    } catch (e) { return false; }
  }
  async function nativePhotoFileCount() {
    try {
      const FS = window.Capacitor.Plugins.Filesystem;
      const r = await FS.readdir({ path: 'loto_photos', directory: 'DATA' });
      return ((r && r.files) || []).length;
    } catch (e) { return 0; }   // folder not created yet
  }

  // DESTRUCTIVE — erases every entry and photo it can reach. In a browser it
  // refuses off localhost or where saved entries exist; inside the app it runs
  // ONLY with {iosSimulator:true}, ONLY on the iOS Simulator (never a device),
  // and ONLY on a fresh install holding no entries and no photo files.
  window.runPhotoRegressionSuite = async function (opts) {
    opts = opts || {};
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    let simulator = false;
    if (native) {
      if (!opts.iosSimulator) throw new Error('REFUSED: never run the photo suite inside the app — it erases every entry and photo');
      if (!(await isIosSimulatorInstall())) throw new Error('REFUSED: this is not the iOS Simulator — the photo suite must never run on a device');
      const stored = await nativePhotoFileCount();
      if (savedEquipment.length > 0 || stored > 0)
        throw new Error('REFUSED: this Simulator install holds ' + savedEquipment.length + ' entries and ' + stored + ' photo files — erase the app (or use a fresh Simulator) first');
      simulator = true;
    } else {
      if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !opts.allowNonLocalhost)
        throw new Error('REFUSED: run the photo suite only against a localhost dev server');
      if (savedEquipment.length > 0 && !opts.iUnderstandThisErasesAllData)
        throw new Error('REFUSED: this browser holds ' + savedEquipment.length + ' saved entries and the suite would ERASE them. Use a fresh browser profile, or pass {iUnderstandThisErasesAllData: true}.');
    }
    results.length = 0;
    window.__PHOTO_TEST_RESULTS = null;
    let tests = ALL_TESTS.slice();
    if (!opts.skipScale) tests.push(t7_scale);
    if (opts.only) tests = tests.filter(t => opts.only.some(p => t.name.indexOf(p) === 0));
    // nativeMock: run EVERY test with the in-memory Filesystem plugin installed,
    // so capture / export / migration go through the native photo store the
    // iPad uses (atomic temp-file writes, directory listings, FS-first reads).
    const nativeMock = (opts.nativeMock && !simulator) ? installMockFS() : null;
    window.__PHOTO_SUITE_ARMED = true;
    try {
      for (const t of tests) {
        try { await t(); }
        catch (e) { record(t.name, false, 'EXCEPTION: ' + (e && e.message)); }
        closeAllPrompts();
      }
      await resetAppState();
    } finally {
      window.__PHOTO_SUITE_ARMED = false;
      if (nativeMock) nativeMock.restore();
    }
    const summary = {
      pass: results.filter(r => r.pass).length,
      fail: results.filter(r => !r.pass).length,
      results: results.slice()
    };
    summary.mode = simulator ? 'iOS Simulator app (REAL native filesystem)' : (opts.nativeMock ? 'native filesystem (mock)' : 'web (IndexedDB)');
    window.__PHOTO_TEST_RESULTS = summary;
    log('SUITE DONE (' + summary.mode + '):', summary.pass + ' pass / ' + summary.fail + ' fail');
    return summary;
  };

  log('photo-regression suite loaded — call runPhotoRegressionSuite()');
})();
