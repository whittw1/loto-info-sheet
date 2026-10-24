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
//   T8–T58  data-loss regressions of builds 83–90 (see ARCHITECTURE.md §6)
//   T59–T77 build 91: one per defect of the 2026-09-25 review (numeric-id
//           photos, b83–88 filenames, no-photo drops, web save, failed-read
//           overwrites, write-outage losses, XLSX valve state, Duplicate
//           races, template data, voltage Cancel, diagrams, sketch leaks,
//           name/room autosave, SW purge, Cooling Tower)
//   T79–T85 build 92: valve marks (tap the valve in a source photo → the
//           mark rides on that photo's reference into entries.json, the
//           Information Sheet XLSX col 12 and the CSV; loto-web's layout)
//   T86–T99 build 93: one per finding of the 2026-09-26 review (old export
//           stamps vs delete, copied device tags, launch autosave, In/Out
//           marks, marks vs quantity, Settings on small screens, stale water
//           checks, bundled libraries, evicted store, per-date sheets, blank
//           energy sources, Condensate Pump, template keep rule, photo size)
//   T100–T110 build 94: one per finding of the 2026-09-27 execution-based
//           review (deleting the unit open for edit, two tabs, In/Out link
//           count, phone header, names as HTML, copy-source marks, undated
//           open unit, linked Detail cell, save message) + the two known items
//           it re-found (CSV line breaks, unreadable unit-in-progress)
//   T111–T124 build 95: one per finding of the 2026-09-27 review of build 94
//   T125–T133 build 96: the medium findings of the 2026-09-28 review of build 95;
//   T134 build 96: found by its fault campaign (a deleted unit back as a recovered draft)
//   T135–T140 build 97: the low findings of the 2026-09-28 review of build 95
//   T141 build 98: the 2026-09-28 quick review of build 97 (multi-line toast time)
//   T142–T153 build 99: the 2026-09-28 medium + high reviews of builds 96–98
//   T154 build 99: found by its fault campaign (a failed fallback write removed the fallback)
//   T155 build 99: found finishing it (an unreadable re-save record let an older delete win)
//   T156–T157 build 100: the 2026-09-28 low review of build 99
//   T158–T179 build 101: SharePoint live backup
//   T180–T185 build 102: Panel ID scan, a warning for a source without its photo; its medium review; marks for an old shape
//   T186–T190 build 102's high review: write-once — nothing on SharePoint replaced (day-file snapshots, own export
//             names, the form every 5 min, build 101's days), a scan asks before replacing a typed value
//   T191      build 102's medium review: new collector initials never empty the old initials' files
//   T192      build 103: with the backup off, Settings shows only its switch (no Sign in / Test / …)
//   T193      build 104: Save & New warns about a unit without its Main Photo (never the Data Plate / EE Number)
//   T194      build 106: one Device ID per unit when Quantity is 2+ (saved as one "a; b" string; Split 1 takes the last tag)
//   T195      build 107: no Kinetic on pumps; a fan unit's Kinetic row names its fan (Supply / Return / Exhaust)
//   T196      build 107: Save & New flags a missing Electrical source, only on kinds of equipment that always have one
//   T197      build 108: Fire Pump is a template of its own (exported as the template; a jockey pump stays Standard Pump)
//   T198      build 108: a saved unit keeps its template on edit when its type's list no longer offers it
//   T199      build 108: Lab Vacuum — the receiver and every pump on it (a pump-count prompt), exported as "Lab Vacuum"
//   T200–T213 build 109: the field-app side of the 2026-10-08 gap review — the "Equipment Type" cell (3.3),
//             template Cancel, saved values off their lists, custom boxes keeping focus, Valve State on valves
//             and In/Out splits, scans bound to their form, Cancel edit / Discard, the survey date and "Not yet
//             exported" (4.3), Duplicate following Reuse (3.2), the turning photo size, the capture time in the
//             JPEG, empty slots with a photo taken for them (4.4), app-lists.json (3.4)
//   T214–T215 build 109's code review: Cancel after an app-made template pick, Copy Source on a reused
//             photo, "changed since export", a half-typed survey year, Duplicate on a linked source
//   T216–T227 build 110: the 2026-10-15 review of build 109 — an automatic Duplicate = Yes without its
//             photo, a ";" in a per-unit Device ID, a custom source's shown verification, a big export,
//             picking the shared photo later, Split keeping extra tags, settling the unattached-shot
//             warning (+ misc), Today / Yesterday by survey date, misc capture times, a desktop file
//             pick, the automatic Yes on every path, the survey-date question box
//   T228      build 111: loto-web's Medical Vacuum Pump, Chemical Pump, Compressed Air Tank, Blower, Switchgear and
//             Electrical with Stored Energy can be picked (new types Compressed Air Tank, Blower, Switchgear, VFD)
//   T229–T231 build 112: what a vacuum record covers (one question, three answers) and the pump's exhaust valve;
//             a Kinetic row per AHU fan; a room that already has the other kind of medical vacuum record
//   T232–T235 build 113: the 2026-10-18 medium review of builds 110–112 — a lower count keeps the user's rows
//             (and a count copy carries no tag), custom-name words at a word start, the template's follow-ups
//             after its voltage from one place, the vacuum list pick without a detour
//   T236      build 114: Dental Vacuum (the fourth answer) and the one-pump answer's "a valve for this pump?"
//   T237      build 115: Dental Air Compressor (the compressor, its discharge, the duplex dryers' inlets and discharges)
//   T238      build 116: DA Tank is a template of its own (the Heat Exchanger - Steam rows, sketch and no-Electrical rule)
//   T239      build 117: Overhead Door type and template (a panel breaker, Potential, Kinetic; no voltage prompt)
//   T248–T251 build 119: the existing LOTO tag (Atlanta) — the prompt follows the unit's facility (one box per
//             unit, scan, No tag), copies start not checked and Split moves the last unit's, the Save & New
//             warning, the sheet's column 16 and entries.json existingTag
//   T252–T255 build 120: damper actuators (Atlanta) — the setting per facility and the types that ask, the row's
//             fields and copies, the Can't tell note and "No damper actuators", column 17 / U7 / entries.json
//   T256–T259 build 121: the label discharge wait — which rows ask (VFD / Stored Electrical Energy, not Chiller /
//             Mini Split / linked) and the per-unit boxes; the label photo bound to its row; copies, Split and the
//             Save & New warning; columns 10 / 18 / 19 and entries.json
//   T260–T268 build 122: loto-web's 2026-10-24 sync spec — a drive's feeder and its own disconnect (the device
//             pick, Save & New, copies), the arc flash label (slot, box, question, export), a transformer's
//             secondary main / other sources / survey (prompts, section, U3/U4/U7/U8), the release question for
//             every medium (setting, labels, no code rewrite, Drains To), columns 13 / 20 / 21, the build bump
//   T269–T277 the build 122 review (2026-10-24): feeders matched as loto-web does, one breaker never two rows,
//             a Duplicate's own breakers, "<panel> bkr <n>", the arc flash photo / No label, a shared tag's unit, D5,
//             a row's role (T261 holds the Save & New list no longer repeating the drives)
//   T278–T283 the second review: Copy Source / a non-Electrical change / the card's button clear a row's role, an
//             untagged drive takes its feeder's tag, the card's suggestion, an untagged drive's feeder kept,
//             a closed transformer question says so (T271 holds the Duplicate message naming only what stayed)
//           (stale unit-in-progress copy, merge-before-save, the tab claim,
//           paused-tab launch, backup Replace, twin delete, marks messages and
//           In/Out shape, undated edit, emergency-copy banner, bottom-bar
//           warning, canary escaping sweep)
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
    if (typeof unitAnswers !== 'undefined') unitAnswers = {};   // build 118: the answers for loto-web
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
    // build 110: no photo marked "don't warn again", and the one-time misc baseline already taken
    try { localStorage.removeItem('loto_unattached_ok'); localStorage.setItem('loto_unattached_misc_baseline', '1'); } catch (e) {}
    try { localStorage.removeItem('loto_saved'); localStorage.removeItem('loto_saved_at'); localStorage.removeItem('loto_saved_deleted'); localStorage.removeItem('loto_wip_superseded'); } catch (e) {}
    try { await saveMetadata('photo_hash_index', {}); } catch (e) {}
    // build 101: the SharePoint backup off, its records empty, its API real again
    if (typeof backupCfg !== 'undefined') {
      Object.assign(backupCfg, { on: false, user: '', pass: '', passExpires: '', root: '' });
      try { localStorage.removeItem('loto_backup_cfg'); } catch (e) {}
      _backupSent = new Map(); _backupDays = new Map(); _backupRetry.clear(); _backupPauseUntil = 0; _backupLastError = '';
      _backupSignInNeeded = false; _backupState = { waiting: 0, unreadable: 0, checked: false };
      if (typeof _backupWrongAccount !== 'undefined') _backupWrongAccount = false;
      clearTimeout(_backupSoon);
      if (window.__realBackupTransport) Object.assign(backupTransport, window.__realBackupTransport);
      try { await saveMetadataMany({ backup_sent: {}, backup_days: {} }); } catch (e) {}
    }
    // build 95: saveAll merges a list another writer stored — a test's raw
    // write of the store is not "another writer" for the reset
    try { if (typeof _entryStoreAt !== 'undefined') _entryStoreAt = (await rawIdbGet('metadata', 'saved_equipment_at')) || null; } catch (e) {}
    try {
      if (typeof resetTombstoneMemory === 'function') resetTombstoneMemory();
      else if (typeof _tombAdds !== 'undefined') { Object.keys(_tombAdds).forEach(k => delete _tombAdds[k]); _tombClears.clear(); }
    } catch (e) {}
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
    if (typeof loadUnitAnswers === 'function') loadUnitAnswers({});   // a fresh unit's answers, as clearForm gives (build 118)
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

  // ======================================================================
  // BUILD 91 — one test per defect of the 2026-09-25 review (+ Cooling
  // Tower). Each was written first and run against build 90 to prove it
  // fails there.
  // ======================================================================

  // Remove the red load banners a storage-fault test provokes.
  function dropLoadBanners() {
    document.querySelectorAll('.container > div, #storageFailBanner, .sticky-banner, #wipReadBanner').forEach(d => {
      if (d.id === 'storageFailBanner' || d.id === 'wipReadBanner' || d.classList.contains('sticky-banner') ||
          /expected entries|entry store|could NOT be written|Recovered|emergency copy/i.test(d.textContent || '')) d.remove();
    });
  }
  // Decode a PNG data URL and sample one pixel at fractional (fx, fy).
  async function pngPixel(dataUrl, fx, fy) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(Math.round(fx * (img.width - 1)), Math.round(fy * (img.height - 1)), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] };
  }

  // T59 — pre-UUID ids are JS NUMBERS in real data (Date.now()); their photos
  // must export (T43 only ever used a string id)
  async function t59_numberTypedIdEntryExportsItsPhotos() {
    const N = 'T59 entry with a NUMBER id (pre-UUID) exports its photos, reshoots included';
    await resetAppState();
    const A = mkEntry('Num-59', { id: 1781725580060 });
    const k = photoStoreKey(A.id, 'main');
    await storePhotoBytes(k, dataUrlFromBytesSeed('t59-a'));
    A.photos.equip_main = { dbKey: k, thumbnail: TINY_THUMB, timestamp: A.savedAt, fileType: 'image/jpeg' };
    savedEquipment = [A]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    await captureInto('equip_dataplate', await makePhotoFile('t59-dp'));
    performSaveAndNew();
    const owned = photoKeyOwnedBy(k, 1781725580060) && photoKeyOwnedBy(k, '1781725580060');
    const { zip, confirms } = await runExport({ confirmResponse: false });
    let main = false, dp = false;
    if (zip) {
      const u = await unzipExport(zip.blob);
      const ja = u.entriesJson.entries.find(e => String(e.id) === '1781725580060');
      main = !!(ja && ja.photoFiles.main); dp = !!(ja && ja.photoFiles.dataplate);
    }
    record(N, main && dp && owned, 'main=' + main + ' reshoot=' + dp + ' owned=' + owned + (zip ? '' : ' | export stopped: ' + confirms.join(' | ').slice(0, 140)));
  }

  // T60 — builds 83-88 stored numeric-owner photos under the LEGACY filename
  // (their regex couldn't parse the key); build 89 moved where it looks
  async function t60_numericKeyFileFromB83to88IsFound() {
    const N = 'T60 photo stored by builds 83-88 under the legacy filename (numeric owner) is found + exported';
    await resetAppState();
    const fs = installMockFS();
    try {
      const id = '1781725580060';
      const A = mkEntry('Legacy-60', { id });
      const key = 'photo::' + id + '::main::abcd1234';
      await fs.set('loto_photos/' + key.replace(/[^A-Za-z0-9_.-]/g, '_') + '.jpg', dataUrlToUint8Array(dataUrlFromBytesSeed('t60')));
      A.photos.equip_main = { dbKey: key, thumbnail: TINY_THUMB, timestamp: A.savedAt, fileType: 'image/jpeg' };
      savedEquipment = [A]; saveAll();
      const read = await loadPhotoBytes(key, 'image/jpeg');
      const present = await presentPhotoKeySet();
      const { zip } = await runExport({ confirmResponse: false });
      let exported = false;
      if (zip) { const u = await unzipExport(zip.blob); const ja = jsonEntryFor(u.entriesJson, A); exported = !!(ja && ja.photoFiles.main); }
      record(N, !!read && present.has(key) && exported, 'read=' + !!read + ' listed=' + present.has(key) + ' exported=' + exported);
    } finally { fs.restore(); }
  }

  // T61 — a photographed source's photo is never silently dropped by noPhoto
  async function t61_photographedSourceNeverSilentlyDroppedByNoPhoto() {
    const N = 'T61 photographed source keeps + exports its photo through an energy-source mis-pick';
    const N2 = 'T61b "Hide photo slot" never drops an attached photo from the export';
    const N3 = 'T61c a hidden (no-photo) slot stays hidden after a reload';
    await resetAppState();
    fillFormNoSources('NoPhoto-61');
    sources.push(mkSrc('Electrical 480V')); renderSources();
    await captureInto('source_0', await makePhotoFile('t61'));
    handleEnergySourceChange(0, 'Stored Electrical Energy');
    handleEnergySourceChange(0, 'Electrical 480V');
    const visible = !sources[0].noPhoto;
    const A = saveEntry();
    let exported = false;
    { const { zip } = await runExport({ confirmResponse: false }); if (zip) { const u = await unzipExport(zip.blob); const j = jsonEntryFor(u.entriesJson, A); exported = !!(j && j.sources[0].photoFile); } }
    record(N, visible && exported, 'slot visible=' + visible + ' exported=' + exported);

    await resetAppState();
    fillFormNoSources('Hide-61');
    sources.push(Object.assign(mkSrc('Kinetic'), { deviceType: 'Rotating' })); renderSources();
    await captureInto('source_0', await makePhotoFile('t61b'));
    await withDialogs({ confirm: true }, async () => { togglePhotoSlot(0); });
    const B = saveEntry();
    let exportedB = false;
    { const { zip } = await runExport({ confirmResponse: false }); if (zip) { const u = await unzipExport(zip.blob); const j = jsonEntryFor(u.entriesJson, B); exportedB = !!(j && j.sources[0].photoFile); } }
    record(N2, exportedB, 'photo exported after Hide=' + exportedB);

    await resetAppState();
    const C = mkEntry('Hidden-61', { sources: [Object.assign(mkSrc('Kinetic'), { sourceId: genUuid(), noPhoto: true })] });
    savedEquipment = [C]; saveAll(); await sleep(300);
    savedEquipment = []; await loadAll(); await sleep(200);
    const c = savedEquipment.find(e => e.id === C.id);
    record(N3, !!(c && c.sources[0].noPhoto === true), 'noPhoto after reload=' + (c && c.sources[0].noPhoto));
    dropLoadBanners();
  }

  // T62 — the web build can't tell whether a download happened; it must not
  // claim "saved" (and stamp entries exported) unless the save is confirmed
  async function t62_webSaveNeverClaimsAnUnconfirmedDownload() {
    const N = 'T62 web save is not "saved" unless the user confirms the file saved';
    const cap = window.Capacitor;
    const realClick = HTMLAnchorElement.prototype.click;
    const ownCanShare = Object.prototype.hasOwnProperty.call(navigator, 'canShare');
    let rNo, rYes;
    window.Capacitor = undefined;
    HTMLAnchorElement.prototype.click = function () {};                          // no real download in the test browser
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });   // force the download path
    try {
      rNo = (await withDialogs({ choice: { 'web-save': 'save', 'web-save-confirm': 'no' } }, () => saveOrShare(new Blob(['t62']), 't62.zip', 'application/zip'))).result;
      rYes = (await withDialogs({ choice: { 'web-save': 'save', 'web-save-confirm': 'yes' } }, () => saveOrShare(new Blob(['t62']), 't62.zip', 'application/zip'))).result;
    } finally {
      HTMLAnchorElement.prototype.click = realClick;
      window.Capacitor = cap;
      if (!ownCanShare) delete navigator.canShare;
    }
    record(N, !!rNo && rNo.saved !== true && !!rYes && rYes.saved === true, 'declined → ' + JSON.stringify(rNo) + ', confirmed → ' + JSON.stringify(rYes));
  }

  // T63 — T28 again, with the entry shapes that made loadAll's migration
  // write fire (a no-photo Stored Electrical source, a legacy "CA In" name)
  async function t63_failedReadWithMigratableEntryNeverOverwritesStore() {
    const N = 'T63 failed entry-store read never overwrites the store (entry the launch migrations touch)';
    await resetAppState();
    const A = mkEntry('Sketch-63', { sources: [
      Object.assign(mkSrc('Stored Electrical Energy'), { sourceId: genUuid(), deviceType: 'Capacitor', noPhoto: true, auto: true }),
      Object.assign(mkSrc('CA In'), { sourceId: genUuid(), deviceType: 'Ball Valve' })] });
    A.sketch = { diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }], labels: [] };
    savedEquipment = [A]; saveAll(); await sleep(400);
    const realGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) {
      if (k === 'saved_equipment') throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
      return realGet.apply(this, arguments);
    };
    try { savedEquipment = []; await loadAll(); await sleep(400); }
    finally { IDBObjectStore.prototype.get = realGet; }
    const onDisk = await rawIdbGet('metadata', 'saved_equipment');
    const kept = Array.isArray(onDisk) && onDisk[0] && onDisk[0].sketch && (onDisk[0].sketch.strokes || []).length === 1;
    record(N, kept, kept ? 'intact store untouched' : 'store OVERWRITTEN by the stripped snapshot — sketch lost');
    _entryStoreUnread = false;
    savedEquipment = Array.isArray(onDisk) ? onDisk : [];
    dropLoadBanners();
  }

  // T64 — a session that could never read the store must not overwrite it
  // at the NEXT launch through its localStorage fallback copy
  async function t64_unreadSessionFallbackNeverOverwritesStore() {
    const N = 'T64 a session that could not read the store never overwrites it at the next launch';
    await resetAppState();
    const A = mkEntry('Keep-64');
    A.sketch = { diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }], labels: [] };
    savedEquipment = [A]; saveAll(); await sleep(400);
    const realGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) {
      if (k === 'saved_equipment') throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
      return realGet.apply(this, arguments);
    };
    const B = mkEntry('New-64');
    try {
      savedEquipment = []; await loadAll(); await sleep(300);    // launch 1: unreadable
      savedEquipment.push(B); saveAll(); await sleep(600);      // a unit saved that session
    } finally { IDBObjectStore.prototype.get = realGet; }
    _entryStoreUnread = false;
    savedEquipment = []; await loadAll(); await sleep(500);     // launch 2: readable again
    const onDisk = (await rawIdbGet('metadata', 'saved_equipment')) || [];
    const a = onDisk.find(e => e.id === A.id), b = onDisk.find(e => e.id === B.id);
    const aOk = !!(a && a.sketch && (a.sketch.strokes || []).length === 1);
    record(N, aOk && !!b, 'A keeps its sketch=' + aOk + ', B (saved that session) kept=' + !!b);
    dropLoadBanners();
  }

  // T65 — a failed read of the unit in progress must not be overwritten by
  // the blank form the launch autosaves
  async function t65_failedWipReadNeverOverwritesTheUnitInProgress() {
    const N = 'T65 a failed read of the in-progress unit never overwrites it';
    await resetAppState();
    const wip = { at: new Date().toISOString(), entryId: genUuid(), equipType: '', equipName: 'Draft-65', lotoId: '', equipRoom: 'R1', equipBuilding: 'Main',
      template: '', tiedTo: '', tiedToName: '', notes: '', sources: [mkSrc('Electrical 480V')], photos: {}, miscPhotos: [], sketch: null };
    await rawIdbPut('metadata', 'current_wip', wip);
    try { localStorage.removeItem('loto_current'); } catch (e) {}
    const realGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) {
      if (k === 'current_wip') throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
      return realGet.apply(this, arguments);
    };
    try { savedEquipment = []; await loadAll(); renderSources(); autoSaveCurrent(); await sleep(500); }
    finally { IDBObjectStore.prototype.get = realGet; }
    savedEquipment = []; await loadAll(); await sleep(300);    // next launch
    const nameNow = document.getElementById('equipName').value;
    const recovered = savedEquipment.some(e => e.equipName === 'Draft-65');
    record(N, nameNow === 'Draft-65' || recovered, 'form name after relaunch="' + nameNow + '", kept as a recovered entry=' + recovered);
    dropLoadBanners();
  }

  // T66 — units saved while IndexedDB writes fail (and the full-list
  // fallback is over quota) must survive the relaunch AND the next save
  async function t66_unitsSavedDuringAWriteOutageSurvive() {
    const N = 'T66 units saved while storage writes fail survive the relaunch and the next save';
    await resetAppState();
    const A = mkEntry('Before-66'); savedEquipment = [A]; saveAll(); await sleep(400);
    const realPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, k) {
      if (k === 'saved_equipment' || k === 'saved_equipment_at') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return realPut.apply(this, arguments);
    };
    const realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'loto_saved') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return realSet.apply(this, arguments);
    };
    const B = mkEntry('During-66');
    try { savedEquipment.push(B); saveAll(); await sleep(600); }
    finally { IDBObjectStore.prototype.put = realPut; Storage.prototype.setItem = realSet; }
    savedEquipment = []; await loadAll(); await sleep(300);     // relaunch: the store is readable but older
    const afterLoad = savedEquipment.some(e => e.id === B.id);
    saveAll(); await sleep(400);                               // e.g. the export's stamping save
    const onDisk = (await rawIdbGet('metadata', 'saved_equipment')) || [];
    const kept = onDisk.some(e => e.id === B.id);
    record(N, afterLoad && kept, 'in memory after relaunch=' + afterLoad + ', in the store after the next save=' + kept);
    dropLoadBanners();
  }

  // T67 — the Information Sheet XLSX (the office import path) carries valve state
  async function t67_xlsxCarriesValveState() {
    const N = 'T67 the Information Sheet XLSX carries Normally Closed';
    await resetAppState();
    const A = mkEntry('NC-67', { sources: [
      Object.assign(mkSrc('LPS 10 PSI'), { sourceId: genUuid(), deviceType: 'Gate Valve', valveState: 'normally_closed' }),
      Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid() })] });
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    if (!xpath) return record(N, false, 'no XLSX in the ZIP');
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
    const ws = wb.worksheets[0];
    let nc = null, normal = null, label = null;
    ws.eachRow(row => {
      const a = String(row.getCell(1).value || '');
      if (a === 'LPS 10 PSI') nc = String(row.getCell(11).value || '');
      if (a === 'Electrical 480V') normal = String(row.getCell(11).value || '');
      if (a === 'Energy Source #1') label = String(row.getCell(11).value || '');
    });
    record(N, /normally closed/i.test(nc || '') && !/normally closed/i.test(normal || '') && /valve state/i.test(label || ''),
      'header col 11="' + label + '", NC source="' + nc + '", normal source="' + normal + '"');
  }

  // T68 — Duplicate With Photos vs a capture / a delete during the copy
  async function t68_duplicateCopyNeverOverwritesACaptureOrLosesPhotos() {
    const N = 'T68 a photo taken during a Duplicate-with-photos copy is never replaced by the copy';
    const N2 = 'T68b deleting the original during the copy is refused — no photo lost';
    await resetAppState();
    fillFormNoSources('Orig-68'); sources.push(mkSrc('Electrical 480V'), mkSrc('LPS 10 PSI')); renderSources();
    await captureInto('source_0', await makePhotoFile('t68-o0'));
    await captureInto('source_1', await makePhotoFile('t68-o1'));
    await captureInto('equip_main', await makePhotoFile('t68-om'));
    const O = saveEntry();
    const f = await makePhotoFile('t68-new');            // ready before the copy starts
    const realLoad = window.loadPhotoBytes;
    window.loadPhotoBytes = async function () { await sleep(700); return realLoad.apply(this, arguments); };
    let myKey = null, stillThere = false;
    try {
      const dupP = executeDuplicate(savedEquipment.indexOf(O), true);
      await sleep(50);
      await withDialogs({}, async () => { handlePhoto({ files: [f] }, 'source_1'); });
      // the capture lands (or is refused) well before the copy reaches source_1 (~1.4 s)
      const t0 = Date.now();
      while (Date.now() - t0 < 1200) { const r = photos.source_1; if (r && r.dbKey && !r.dupOf) { myKey = r.dbKey; break; } await sleep(40); }
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.indexOf(O)); });
      stillThere = savedEquipment.some(e => e.id === O.id);
      await dupP;
      await waitForPhotoWritesIdle(20000);
    } finally { window.loadPhotoBytes = realLoad; }
    const s1 = photos.source_1;
    const ok = myKey ? !!(s1 && s1.dbKey === myKey) : !!(s1 && s1.dupOf && !s1.unsaved);
    record(N, ok, myKey ? ('capture accepted during the copy; the slot ' + (s1 && s1.dbKey === myKey ? 'kept it' : 'was OVERWRITTEN by the copy')) : ('capture refused during the copy; copy landed=' + !!(s1 && s1.dupOf)));
    const lost = ['source_0', 'equip_main'].filter(k => !photos[k] || photos[k].unsaved);
    record(N2, stillThere && lost.length === 0, 'original still saved=' + stillThere + (lost.length ? ', copies FAILED: ' + lost.join(',') : ''));
  }

  // T69 — typed data on template sources is never silently discarded
  async function t69_templateOrTypeChangeNeverDropsTypedSourceData() {
    const N = 'T69 template change never silently drops data typed into template sources';
    const N2 = 'T69b equipment-type change keeps template sources the user filled in';
    await resetAppState();
    fillFormNoSources('WH-69');
    document.getElementById('equipTemplate').value = 'Water Heater - Electric';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    let i = sources.findIndex(s => /^Electrical/.test(s.energySource || ''));
    if (i < 0) return record(N, false, 'setup: no electrical source (' + sources.map(s => s.energySource).join(',') + ')');
    updateSource(i, 'deviceId', 'DISC-14');
    document.getElementById('equipTemplate').value = 'Water Heater - Steam';
    let confirmShown = false;
    await withDialogs({ confirm: true }, async () => {
      handleTemplateChange();
      if (document.getElementById('templateConfirmOverlay')) { confirmShown = true; confirmTemplateChange('Water Heater - Steam'); }
    });
    closeAllPrompts();
    const kept = sources.some(s => s.deviceId === 'DISC-14');
    record(N, confirmShown && kept, 'confirm shown=' + confirmShown + ', typed source kept=' + kept);

    await resetAppState();
    fillFormNoSources('Pump-69');
    document.getElementById('equipType').value = 'CHW Pump';
    await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
    closeAllPrompts();
    i = sources.findIndex(s => /^Electrical/.test(s.energySource || ''));
    if (i < 0) return record(N2, false, 'setup: no electrical source');
    updateSource(i, 'deviceId', 'VFD-3');
    document.getElementById('equipType').value = 'Heating HW Pump';
    await withDialogs({ confirm: true }, async () => {
      handleEquipTypeChange();
      if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange(document.getElementById('equipTemplate').value);
    });
    closeAllPrompts();
    record(N2, sources.some(s => s.deviceId === 'VFD-3'), 'sources now: ' + sources.map(s => s.energySource + (s.deviceId ? ' [' + s.deviceId + ']' : '')).join(', '));
  }

  // T70 — Cancel on the Chiller/ATS/Generator voltage prompt must leave the
  // cards on screen matching `sources` (their inline handlers use the index)
  async function t70_voltageCancelKeepsCardsInSync() {
    const N = 'T70 cancelling the voltage prompt leaves the source cards matching the sources';
    await resetAppState();
    fillFormNoSources('Chiller-70');
    sources.push(Object.assign(mkSrc('Electrical 208V'), { auto: true, collapsed: false }), Object.assign(mkSrc('Condenser Water In'), { collapsed: false }));
    renderSources();
    equipTypeChanged('Chiller');
    closeVoltageDialog();
    const cards = [...document.querySelectorAll('#sourcesContainer .source-card')];
    const shown = cards.map(c => {
      const sel = c.querySelector('select[id^="src_energy_"]'); if (sel) return sel.value || '';
      const st = c.querySelector('.source-summary-text strong'); return st ? st.textContent.trim() : '?';
    });
    const want = sources.map(s => s.energySource || 'Empty source');
    record(N, cards.length === sources.length && shown.every((v, k) => v === want[k]), 'cards=' + JSON.stringify(shown) + ' sources=' + JSON.stringify(want));
  }

  // T71 — exported diagrams: ink where it was drawn; the eraser removes ink only
  async function t71_exportedDiagramInkLandsWhereDrawn() {
    const N = 'T71 exported diagram: pen ink lands where it was drawn';
    const N2 = 'T71b exported diagram: the eraser never cuts holes in the equipment drawing';
    await resetAppState();
    fillFormNoSources('Ink-71');
    // the sketch section is hidden unless the facility opted in — opt in for this test
    const prefsBefore = localStorage.getItem('loto_sketch_prefs');
    setSketchPrefForFacility(getHospitalCode(), true);
    restoreSketch({ diagramKey: 'general', strokes: [], labels: [] });
    applySketchVisibility();
    setSketchSectionExpanded(true);
    // Wait for the canvas to be laid out (its diagram loads first). Polled, not
    // a fixed sleep: a background tab throttles timers and lost that race.
    const cv = document.getElementById('sketchCanvas');
    let r = cv.getBoundingClientRect();
    for (const t0 = Date.now(); !r.width && Date.now() - t0 < 5000; r = cv.getBoundingClientRect()) await sleep(100);
    await sleep(100);
    r = cv.getBoundingClientRect();
    try { if (prefsBefore === null) localStorage.removeItem('loto_sketch_prefs'); else localStorage.setItem('loto_sketch_prefs', prefsBefore); } catch (e) {}
    if (!r.width) { record(N, false, 'setup: sketch canvas not laid out'); }
    else {
      const ev = (type, fx, fy) => ({ type, pointerId: 1, clientX: r.left + fx * r.width, clientY: r.top + fy * r.height, preventDefault() {}, stopPropagation() {} });
      const realCap = cv.setPointerCapture;
      cv.setPointerCapture = () => {};
      try {
        setSketchTool('pen'); sketchColor = '#ff0000'; sketchLineWidth = 10;
        sketchPointerDown(ev('pointerdown', 0.93, 0.2)); sketchPointerMove(ev('pointermove', 0.93, 0.5)); sketchPointerMove(ev('pointermove', 0.93, 0.8)); sketchPointerUp(ev('pointerup', 0.93, 0.8));
      } finally { cv.setPointerCapture = realCap; }
      const sk = JSON.parse(JSON.stringify(getSketchData()));
      const png = await renderSketchOffscreen(sk);
      const px = png ? await pngPixel(png, 0.93, 0.5) : null;
      record(N, !!(px && px.r > 180 && px.g < 90 && px.b < 90), 'canvas ' + Math.round(r.width) + 'px wide; exported pixel at the drawn spot = ' + JSON.stringify(px));
    }
    // A pen line through the centre, then the eraser over the centre — as
    // stored by builds up to 90 (screen pixels, no unit marker).
    const sk2 = { diagramKey: 'general', labels: [], strokes: [
      { color: '#ff0000', width: 12, points: [{ x: 250, y: 250 }, { x: 362, y: 250 }] },
      { color: '#ffffff', width: 40, isEraser: true, points: [{ x: 300, y: 250 }, { x: 312, y: 250 }] }] };
    const png2 = await renderSketchOffscreen(sk2);
    const cpx = png2 ? await pngPixel(png2, 0.5, 0.5) : null;
    record(N2, !!(cpx && cpx.a === 255), 'pixel under the eraser = ' + JSON.stringify(cpx));
  }

  // T72 — the open form's diagram is exported from its snapshot, never a
  // 0-byte PNG (collapsed sketch section)
  async function t72_openFormDiagramExportsWithSectionCollapsed() {
    const N = 'T72 the open form\'s diagram exports (never a 0-byte PNG), sketch section collapsed';
    await resetAppState();
    fillForm('Form-72');
    restoreSketch({ diagramKey: 'general', strokes: [{ color: '#ff0000', width: 6, points: [{ x: 10, y: 10 }, { x: 200, y: 200 }] }], labels: [{ x: 0.5, y: 0.5, text: 'E-1', color: '#d94a4a' }] });
    await sleep(250);
    setSketchSectionExpanded(false);
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const j = (u.entriesJson.entries || []).find(e => e.equipName === 'Form-72');
    const f = j && j.photoFiles && j.photoFiles.diagram;
    const len = f && u.files[f] ? u.files[f].length : 0;
    record(N, len > 1000, 'diagram file=' + (f || '(none)') + ' bytes=' + len);
  }

  // T73 — sketch edits in a discarded edit never reach the saved entry
  async function t73_discardedEditNeverChangesSavedSketch() {
    const N = 'T73 sketch changes in a discarded edit never reach the saved entry';
    await resetAppState();
    const A = mkEntry('SkA-73');
    A.sketch = { diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 5, y: 5 }, { x: 50, y: 50 }] }], labels: [{ x: 0.2, y: 0.2, text: 'E-1', color: '#d94a4a' }] };
    const B = mkEntry('SkB-73');
    savedEquipment = [A, B]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    sketchUndo();
    sketchLabels.push({ x: 0.7, y: 0.7, text: 'S-1', color: '#000' });
    if (sketchLabels[0]) sketchLabels[0].x = 0.9;
    await withDialogs({ confirm: true }, async () => { editSaved(1); });
    const a = savedEquipment.find(e => e.id === A.id);
    const ok = a.sketch.strokes.length === 1 && a.sketch.labels.length === 1 && a.sketch.labels[0].x === 0.2;
    record(N, ok, 'saved A now: ' + a.sketch.strokes.length + ' stroke(s), labels ' + a.sketch.labels.map(l => l.text + '@' + l.x).join(','));
  }

  // T74 — Duplicate starts with a clean drawing, and never writes into
  // another entry's saved sketch
  async function t74_duplicateNeverInheritsTheOpenFormsSketch() {
    const N = 'T74 Duplicate never inherits (or writes into) another unit\'s drawing';
    await resetAppState();
    const A = mkEntry('DupA-74'); A.template = 'AHU - Steam'; A.equipType = 'Air Handler';
    const B = mkEntry('EditB-74'); B.template = 'Chilled Water Pump'; B.equipType = 'CHW Pump';
    B.sketch = { diagramKey: 'pump', strokes: [{ color: '#00f', width: 3, points: [{ x: 5, y: 5 }, { x: 60, y: 60 }] }], labels: [{ x: 0.3, y: 0.3, text: 'W-4', color: '#00f' }] };
    savedEquipment = [A, B]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(1); });
    await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
    const clean = sketchStrokes.length === 0 && sketchLabels.length === 0;
    sketchLabels.push({ x: 0.5, y: 0.5, text: 'E-1', color: '#d94a4a' });
    const b = savedEquipment.find(e => e.id === B.id);
    const bIntact = b.sketch.labels.length === 1 && b.sketch.strokes.length === 1;
    record(N, clean && bIntact, 'duplicate starts clean=' + clean + ', B untouched=' + bIntact);
  }

  // T75 — typing a name / room autosaves (an iOS reload restores the autosave)
  async function t75_typedNameAndRoomAreAutosaved() {
    const N = 'T75 a typed equipment name and room are autosaved';
    await resetAppState();
    fillForm('Before-75');
    autoSaveCurrent(); await sleep(300);
    const nameEl = document.getElementById('equipName'), roomEl = document.getElementById('equipRoom');
    nameEl.value = 'AHU-7'; nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    roomEl.value = 'B-121'; roomEl.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(500);
    const wip = await rawIdbGet('metadata', 'current_wip');
    record(N, !!(wip && wip.equipName === 'AHU-7' && wip.equipRoom === 'B-121'), 'autosaved name="' + (wip && wip.equipName) + '" room="' + (wip && wip.equipRoom) + '"');
  }

  // T76 — the web build's service-worker purge runs once per device, and
  // never while offline (it used to run on every cold start)
  async function t76_serviceWorkerPurgeIsOncePerDevice() {
    const N = 'T76 service-worker purge runs once per device, never offline';
    if (typeof window.shouldPurgeServiceWorkers !== 'function') return record(N, false, 'no purge policy — the purge is keyed to sessionStorage and runs on every cold start');
    const had = localStorage.getItem('sw_purged_v1');
    try {
      localStorage.setItem('sw_purged_v1', '1');
      const again = shouldPurgeServiceWorkers(true);
      localStorage.removeItem('sw_purged_v1');
      const offline = shouldPurgeServiceWorkers(false);
      const first = shouldPurgeServiceWorkers(true);
      record(N, !again && !offline && first, 'after a purge=' + again + ', offline=' + offline + ', first online launch=' + first);
    } finally { if (had) localStorage.setItem('sw_purged_v1', had); else localStorage.removeItem('sw_purged_v1'); }
  }

  // T77 — Cooling Tower keeps its electrical disconnect (its template used to
  // replace the type's Kinetic + Electrical with Kinetic alone)
  async function t77_coolingTowerKeepsItsElectricalDisconnect() {
    const N = 'T77 Cooling Tower keeps its electrical disconnect';
    await resetAppState();
    fillFormNoSources('CT-77');
    document.getElementById('equipType').value = 'Cooling Tower';
    await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
    const promptOpen = !!document.getElementById('templateVoltageOverlay');
    closeAllPrompts();
    const elec = sources.filter(s => /^Electrical/.test(s.energySource || ''));
    record(N, elec.length >= 1, 'sources: ' + sources.map(s => s.energySource).join(', ') + ' | voltage prompt offered=' + promptOpen);
  }

  // T78 — guard for build 91's load-time merge: an emergency snapshot that
  // stopped updating (quota) must never resurrect entries deleted since, on a
  // store last written before build 89 (no store stamp; deletes don't change
  // the remaining entries' own dates)
  async function t78_staleSnapshotNeverResurrectsDeletedEntries() {
    const N = 'T78 a frozen emergency snapshot never brings back deleted entries (unstamped store)';
    await resetAppState();
    const old = new Date(Date.now() - 5 * 86400e3).toISOString();
    const A = mkEntry('Kept-78', { savedAt: old }), D = mkEntry('Deleted-78', { savedAt: old });
    await rawIdbPut('metadata', 'saved_equipment', [A]);
    await rawIdbDelete('metadata', 'saved_equipment_at').catch(() => {});
    await rawIdbDelete('metadata', 'deleted_ids').catch(() => {});
    localStorage.removeItem('loto_deleted_ids');
    const slim = [A, D].map(e => { const c = JSON.parse(JSON.stringify(e)); delete c.sketch; return c; });
    localStorage.setItem('loto_saved_snapshot', JSON.stringify(slim));
    localStorage.setItem('loto_saved_snapshot_at', new Date(Date.now() - 86400e3).toISOString());
    savedEquipment = []; await loadAll(); await sleep(300);
    const back = savedEquipment.some(e => e.id === D.id), kept = savedEquipment.some(e => e.id === A.id);
    record(N, kept && !back, 'kept A=' + kept + ', deleted D came back=' + back);
    dropLoadBanners();
  }

  // ---------- valve marks (build 92) -----------------------------------------
  // The mark dialog is driven the way a finger does: a click at a fraction of
  // the photo box.
  async function markDialogReady() {
    await waitFor(() => {
      const w = document.getElementById('valveMarkWrap');
      const r = w && w.getBoundingClientRect();
      return !!(r && r.width > 20 && r.height > 20);
    }, 8000, 'valve mark dialog laid out');
    return document.getElementById('valveMarkWrap');
  }
  function tapMark(fx, fy) {
    const w = document.getElementById('valveMarkWrap');
    const r = w.getBoundingClientRect();
    w.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + fx * r.width, clientY: r.top + fy * r.height }));
  }
  function clickById(id) {
    const b = document.getElementById(id);
    if (!b) throw new Error('no element #' + id);
    b.click();
  }
  const nearMark = (m, x, y) => !!m && Math.abs(m.x - x) <= 0.012 && Math.abs(m.y - y) <= 0.012;
  const marksText = (marks) => (marks || []).map(m => m.x.toFixed(3) + ',' + m.y.toFixed(3)).join('; ');
  // The last field of one CSV line (quoted or not).
  function csvFields(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }
  const artifacts = () => (window.__PHOTO_SUITE_ARTIFACTS = window.__PHOTO_SUITE_ARTIFACTS || {});

  // T79 — tap the valve → the mark is on the source photo's reference and in
  // every export loto-web can read
  async function t79_valveMarkIsSavedAndExported() {
    const N = 'T79 a valve mark is saved on its source photo and exported (entries.json, XLSX col 12, CSV)';
    await resetAppState();
    if (typeof openValveMarkDialog !== 'function') return record(N, false, 'this build has no valve-mark dialog');
    fillFormNoSources('VM-79');
    sources.push(Object.assign(mkSrc('LPS 10 PSI'), { deviceType: 'Gate Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('Electrical 480V'), { collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm79a'));
    await captureInto('source_1', await makePhotoFile('vm79b'));
    openValveMarkDialog('source_0');
    await markDialogReady();
    tapMark(0.7, 0.4);
    clickById('valveMarkSave');
    const ref = photos.source_0;
    const okRef = !!(ref && Array.isArray(ref.marks) && ref.marks.length === 1 && nearMark(ref.marks[0], 0.7, 0.4));
    const want = marksText(ref && ref.marks);
    const A = saveEntry();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = jsonEntryFor(u.entriesJson, A);
    const pm0 = je && je.sources[0] && je.sources[0].photoMarks;
    const pm1 = je && je.sources[1] && je.sources[1].photoMarks;
    const okJson = Array.isArray(pm0) && marksText(pm0) === want && Array.isArray(pm1) && pm1.length === 0;
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    let xCell = null, xLabel = null, xOther = null;
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      wb.worksheets[0].eachRow(row => {
        const a = String(row.getCell(1).value || '');
        if (a === 'LPS 10 PSI') xCell = String(row.getCell(12).value || '');
        if (a === 'Electrical 480V') xOther = String(row.getCell(12).value || '');
        if (a === 'Energy Source #1') xLabel = String(row.getCell(12).value || '');
      });
      artifacts()['t79_Information_Sheet.xlsx'] = u.files[xpath];
      artifacts()['t79_entries.json'] = u.files['entries.json'];
    }
    const okX = xCell === want && xOther === '' && /valve mark/i.test(xLabel || '');
    const cpath = Object.keys(u.files).find(p => /\.csv$/.test(p));
    const lines = cpath ? new TextDecoder().decode(u.files[cpath]).split('\n').filter(Boolean) : [];
    // the "Valve Marks" column by its header (build 122 added "Arc Flash Photo Filename" after it)
    const csvHeads = lines.length ? csvFields(lines[0]) : [];
    const vmCol = csvHeads.findIndex(h => /^valve marks?$/i.test(h));
    const csvHead = vmCol >= 0 ? csvHeads[vmCol] : '';
    const csvRow = lines.find(l => l.indexOf('LPS 10 PSI') >= 0);
    const csvVal = (csvRow && vmCol >= 0) ? csvFields(csvRow)[vmCol] : 'no row';
    const okCsv = /valve marks?/i.test(csvHead) && !!csvRow && csvVal === want;
    record(N, okRef && okJson && okX && okCsv,
      'ref=' + JSON.stringify(ref && ref.marks) + ' | json=' + JSON.stringify(pm0) + '/' + JSON.stringify(pm1) +
      ' | xlsx col12 label="' + xLabel + '" value="' + xCell + '" other="' + xOther + '" | csv head="' + csvHead + '" value="' + csvVal + '"');
  }

  // T79b — a source with 2 devices takes 2 marks; a third tap moves the
  // nearest one; Clear + Save removes them
  async function t79b_quantityTwoTakesTwoMarks() {
    const N = 'T79b a quantity-2 source takes one mark per device; a further tap moves the nearest';
    await resetAppState();
    if (typeof openValveMarkDialog !== 'function') return record(N, false, 'this build has no valve-mark dialog');
    fillFormNoSources('VM-79b');
    sources.push(Object.assign(mkSrc('HHW In/Out'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm79b'));
    openValveMarkDialog('source_0');
    await markDialogReady();
    tapMark(0.3, 0.5); tapMark(0.7, 0.5); tapMark(0.72, 0.56);
    clickById('valveMarkSave');
    const m = photos.source_0 && photos.source_0.marks;
    const two = Array.isArray(m) && m.length === 2 && nearMark(m[0], 0.3, 0.5) && nearMark(m[1], 0.72, 0.56);
    openValveMarkDialog('source_0');
    await markDialogReady();
    clickById('valveMarkClear');
    clickById('valveMarkSave');
    const cleared = !(photos.source_0.marks && photos.source_0.marks.length);
    record(N, two && cleared, 'after 3 taps: ' + JSON.stringify(m) + ' | cleared=' + cleared);
  }

  // T80 — the prompt opens by itself after a SOURCE photo (setting on — the
  // default), never after an equipment photo, never when turned off
  async function t80_markPromptFollowsASourcePhoto() {
    const N = 'T80 the mark prompt opens after a source photo (default on), not after equipment photos or when off; 📍 Mark appears with the photo';
    await resetAppState();
    if (typeof valveMarkPromptEnabled !== 'function') return record(N, false, 'this build has no valve-mark prompt');
    const had = localStorage.getItem('loto_ask_valve_mark');
    const open = () => !!document.getElementById('valveMarkOverlay');
    const close = () => { const o = document.getElementById('valveMarkOverlay'); if (o) o.remove(); };
    try {
      localStorage.removeItem('loto_ask_valve_mark');
      const defaultOn = valveMarkPromptEnabled();
      fillFormNoSources('VM-80');
      sources.push(Object.assign(mkSrc('LPS 10 PSI'), { deviceType: 'Gate Valve', collapsed: false }));
      renderSources();
      const btn = () => document.getElementById('markbtn_source_0');
      const hiddenBefore = !!btn() && btn().style.display === 'none';
      await captureInto('source_0', await makePhotoFile('vm80a'));
      const shownAfter = !!btn() && btn().style.display !== 'none';
      let afterSource = false;
      try { await waitFor(open, 4000, 'mark prompt'); afterSource = true; } catch (e) {}
      close();
      await captureInto('equip_main', await makePhotoFile('vm80b'));
      await sleep(600);
      const afterEquip = open(); close();
      localStorage.setItem('loto_ask_valve_mark', '0');
      await captureInto('source_0', await makePhotoFile('vm80c'));
      await sleep(600);
      const whenOff = open(); close();
      record(N, defaultOn && afterSource && !afterEquip && !whenOff && hiddenBefore && shownAfter,
        'default on=' + defaultOn + ', after source photo=' + afterSource + ', after equipment photo=' + afterEquip + ', when off=' + whenOff +
        ' | Mark button hidden before the photo=' + hiddenBefore + ', shown after=' + shownAfter);
    } finally {
      close();
      if (had === null) localStorage.setItem('loto_ask_valve_mark', '0'); else localStorage.setItem('loto_ask_valve_mark', had);
    }
  }

  // T81 — a retake is a new photo: the old photo's mark must not carry over
  async function t81_retakeDropsTheOldMark() {
    const N = 'T81 a retaken source photo starts without the old photo\'s mark';
    await resetAppState();
    if (typeof openValveMarkDialog !== 'function') return record(N, false, 'this build has no valve-mark dialog');
    fillFormNoSources('VM-81');
    sources.push(Object.assign(mkSrc('LPS 10 PSI'), { deviceType: 'Gate Valve', collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm81a'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.6, 0.6); clickById('valveMarkSave');
    const marked = !!(photos.source_0.marks && photos.source_0.marks.length === 1);
    await captureInto('source_0', await makePhotoFile('vm81b'));
    const after = photos.source_0.marks;
    record(N, marked && !(after && after.length), 'marked before retake=' + marked + ', after retake=' + JSON.stringify(after || null));
  }

  // T82 — marking during an edit that is then discarded never changes the
  // saved entry (the form shares photo references with it until saved)
  async function t82_discardedEditNeverChangesSavedMarks() {
    const N = 'T82 a mark placed in a discarded edit never reaches the saved entry';
    await resetAppState();
    if (typeof openValveMarkDialog !== 'function') return record(N, false, 'this build has no valve-mark dialog');
    fillFormNoSources('VM-82');
    sources.push(Object.assign(mkSrc('LPS 10 PSI'), { deviceType: 'Gate Valve', collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm82'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.25, 0.25); clickById('valveMarkSave');
    const A = saveEntry();
    const B = mkEntry('Other-82'); savedEquipment.push(B); saveAll();
    const before = JSON.stringify(A.photos.source_0.marks);
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(A)); });
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.8, 0.8); clickById('valveMarkSave');
    const formMoved = nearMark(photos.source_0.marks && photos.source_0.marks[0], 0.8, 0.8);
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(B)); });
    const a = savedEquipment.find(e => e.id === A.id);
    const after = JSON.stringify(a.photos.source_0.marks);
    record(N, formMoved && after === before, 'saved before=' + before + ', form moved=' + formMoved + ', saved after discard=' + after);
  }

  // T83 — Duplicate Source is a DIFFERENT device on the same photo: it starts
  // unmarked (the original keeps its mark); Duplicate Entry keeps marks
  async function t83_duplicatedSourceStartsUnmarked() {
    const N = 'T83 a duplicated source starts unmarked; the original keeps its mark';
    await resetAppState();
    if (typeof openValveMarkDialog !== 'function') return record(N, false, 'this build has no valve-mark dialog');
    fillFormNoSources('VM-83');
    sources.push(Object.assign(mkSrc('LPS 10 PSI'), { deviceType: 'Gate Valve', collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm83'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.4, 0.6); clickById('valveMarkSave');
    duplicateSource(0);
    const orig = photos.source_0 && photos.source_0.marks, copy = photos.source_1 && photos.source_1.marks;
    record(N, !!(orig && orig.length === 1) && !(copy && copy.length) && !!(photos.source_1 && photos.source_1.dbKey),
      'original=' + JSON.stringify(orig || null) + ', copy=' + JSON.stringify(copy || null));
  }

  // T84 — the placement rule is loto-web's, value for value (golden values
  // from app/services/valve_marks.py; scripts/smoke_valve_marks.py asserts
  // the same numbers)
  async function t84_markLayoutMatchesLotoWeb() {
    const N = 'T84 the valve-mark layout matches loto-web\'s (golden values)';
    if (typeof layoutValveMarks !== 'function') return record(N, false, 'this build has no layoutValveMarks');
    const CASES = {
      G1: [{ x: 0.7, y: 0.4 }],
      G2: [{ x: 0.2, y: 0.8 }],
      G3: [{ x: 0.55, y: 0.5 }, { x: 0.65, y: 0.5 }],
      G4: [{ x: 0.5, y: 0.45 }, { x: 0.5, y: 0.55 }],
      G5: [{ x: 0.02, y: 0.02 }, { x: 0.98, y: 0.98 }],
      G6: [{ x: 0.3, y: 0.3 }, { x: 0.35, y: 0.35 }, { x: 0.7, y: 0.7 }],
    };
    const GOLDEN = {"G1":[{"box_x":0.13,"box_y":0.335,"arrow_x":0.45,"arrow_y":0.345,"arrow_dir":"right","arrow_len":0.25}],"G2":[{"box_x":0.45,"box_y":0.735,"arrow_x":0.2,"arrow_y":0.745,"arrow_dir":"left","arrow_len":0.25}],"G3":[{"box_x":0.0,"box_y":0.435,"arrow_x":0.32,"arrow_y":0.445,"arrow_dir":"right","arrow_len":0.23},{"box_x":0.49,"box_y":0.12,"arrow_x":0.595,"arrow_y":0.25,"arrow_dir":"down","arrow_len":0.25}],"G4":[{"box_x":0.0,"box_y":0.385,"arrow_x":0.32,"arrow_y":0.395,"arrow_dir":"right","arrow_len":0.18},{"box_x":0.68,"box_y":0.485,"arrow_x":0.5,"arrow_y":0.495,"arrow_dir":"left","arrow_len":0.18}],"G5":[{"box_x":0.27,"box_y":0.0,"arrow_x":0.02,"arrow_y":0.0,"arrow_dir":"left","arrow_len":0.25},{"box_x":0.41,"box_y":0.87,"arrow_x":0.73,"arrow_y":0.89,"arrow_dir":"right","arrow_len":0.25}],"G6":[{"box_x":0.14,"box_y":0.0,"arrow_x":0.245,"arrow_y":0.13,"arrow_dir":"down","arrow_len":0.17},{"box_x":0.19,"box_y":0.6,"arrow_x":0.295,"arrow_y":0.35,"arrow_dir":"up","arrow_len":0.25},{"box_x":0.54,"box_y":0.32,"arrow_x":0.645,"arrow_y":0.45,"arrow_dir":"down","arrow_len":0.25}]};
    const bad = [];
    for (const k of Object.keys(CASES)) {
      const got = layoutValveMarks(CASES[k]);
      if (JSON.stringify(got) !== JSON.stringify(GOLDEN[k])) bad.push(k + ' got ' + JSON.stringify(got));
    }
    record(N, !bad.length, bad.length ? bad.join(' | ') : Object.keys(CASES).length + ' cases identical');
  }

  // T85 — two sources marked on ONE shared photo are previewed together, the
  // way loto-web lays them out (no stacked boxes)
  async function t85_sharedPhotoMarksAreLaidOutTogether() {
    const N = 'T85 marks of two sources on one shared photo are laid out together (no overlapping boxes)';
    await resetAppState();
    if (typeof openValveMarkDialog !== 'function' || typeof valveMarkGroupFor !== 'function') return record(N, false, 'this build has no shared-photo mark layout');
    fillFormNoSources('VM-85');
    sources.push(Object.assign(mkSrc('HHW Supply'), { deviceType: 'Ball Valve', collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm85'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.5, 0.45); clickById('valveMarkSave');
    duplicateSource(0);                                   // HHW Return — same photo, a different valve
    sources[1].energySource = 'HHW Return';
    openValveMarkDialog('source_1'); await markDialogReady(); tapMark(0.5, 0.55); clickById('valveMarkSave');
    const g = valveMarkGroupFor(photos.source_1);
    const shapes = g && g.layout;
    let overlap = false;
    if (shapes && shapes.length === 2) {
      const rect = (o, kind) => {
        if (kind === 'box') return [o.box_x, o.box_y, 0.32, 0.13];
        const vert = o.arrow_dir === 'up' || o.arrow_dir === 'down';
        return [o.arrow_x, o.arrow_y, vert ? 0.11 : o.arrow_len, vert ? o.arrow_len : 0.11];
      };
      const ov = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
      const r0 = [rect(shapes[0], 'box'), rect(shapes[0], 'arrow')], r1 = [rect(shapes[1], 'box'), rect(shapes[1], 'arrow')];
      overlap = r0.some(a => r1.some(b => ov(a, b)));
    }
    record(N, !!shapes && shapes.length === 2 && !overlap, 'group of ' + (shapes ? shapes.length : 0) + ': ' + JSON.stringify(shapes));
  }

  // ---------- build 93 — the 2026-09-26 review -------------------------------
  // The unit names on one exported Information Sheet, in order.
  async function sheetUnits(bytes) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(bytes);
    const out = []; let prevHeader = false;
    wb.worksheets[0].eachRow(row => {
      const a = String(row.getCell(1).value || '');
      if (prevHeader) out.push(a);
      prevHeader = a === 'Equipment ID/Name';
    });
    return out;
  }

  // T86 — an export stamp from builds 83–88 on a pre-UUID (numeric-id) entry is
  // not proof its photos left: those builds excluded every such photo but
  // stamped the entry. Delete must not treat it as exported (b91 made delete
  // really erase those files).
  async function t86_oldExportStampIsNotProofForNumericIdPhotos() {
    const N = 'T86 an old export stamp on a numeric-id entry never counts as "exported" for delete';
    await resetAppState();
    const id = '1718612345678';
    const key = photoStoreKey(id, 'main');
    await storePhotoBytes(key, dataUrlFromBytesSeed('t86'));
    const E = mkEntry('June-86', { id });
    E.photos = { equip_main: { dbKey: key, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg' } };
    E.exportedAt = '2026-09-01T12:00:00.000Z';        // a b83–b88 "Export anyway" stamp
    savedEquipment = [E]; saveAll();
    const before = typeof entryExportState === 'function' ? entryExportState(E) : 'n/a';
    showBulkDeleteDialog();
    const warn = document.getElementById('bulkDeleteWarn');
    const warned = !!warn && warn.style.display !== 'none' && /\b1\b/.test(warn.textContent || '');
    closeBulkDeleteDialog();
    const badge = (document.getElementById('savedPanelBody') || {}).innerHTML || '';
    renderSavedPanel();
    const listHtml = (document.getElementById('savedPanelBody') || {}).innerHTML || badge;
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const after = typeof entryExportState === 'function' ? entryExportState(savedEquipment[0]) : 'n/a';
    record(N, before !== 'exported' && before !== 'n/a' && warned && after === 'exported' && !/&#10003; exported/.test(listHtml),
      'state before=' + before + ', bulk-delete warned=' + warned + ', list shows ✓ exported=' + /&#10003; exported/.test(listHtml) + ', state after a fresh export=' + after);
  }

  // T87 — a Device ID (and the LOTO ID) names ONE physical device: Duplicate,
  // Dup on a source and Split must not copy it onto another device
  async function t87_copiesNeverCarryADeviceTag() {
    const N = 'T87 Duplicate / Dup source / Split never copy a Device ID (or the LOTO ID) to another device';
    await resetAppState();
    const A = mkEntry('EF-1', { sources: [Object.assign(mkSrc('Electrical 208V'), { sourceId: genUuid(), deviceType: 'Breaker', deviceId: 'LP-2 CKT 14' })] });
    A.lotoId = 'ATL-LOTO-001';
    savedEquipment = [A]; saveAll();
    await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
    const dupDev = sources[0] && sources[0].deviceId;
    const dupLoto = document.getElementById('equipLotoId').value;
    sources[0].deviceId = 'V-7'; sources[0].quantity = 2; renderSources();
    duplicateSource(0);
    const dupSrcDev = sources[1] && sources[1].deviceId;
    splitSource(0);
    const splitDev = sources[1] && sources[1].deviceId;
    record(N, !dupDev && !dupLoto && !dupSrcDev && !splitDev && sources[0].deviceId === 'V-7',
      'duplicate entry deviceId=' + JSON.stringify(dupDev) + ' lotoId=' + JSON.stringify(dupLoto) +
      ', dup source=' + JSON.stringify(dupSrcDev) + ', split valve=' + JSON.stringify(splitDev) + ', original kept=' + sources[0].deviceId);
  }

  // T88 — at launch the form is blank until loadAll restores the unit in
  // progress; an autosave in that window (backgrounding, a keystroke, a photo
  // tap) wrote the blank form over it
  async function t88_launchAutosaveNeverWipesTheUnitInProgress() {
    const N = 'T88 an autosave during launch (before the restore) never overwrites the unit in progress';
    await resetAppState();
    fillForm('WIP-88');
    await captureInto('source_0', await makePhotoFile('wip88'));
    autoSaveCurrent(); await sleep(400);
    const id = currentEntryId;
    const hasFlag = typeof _bootWipSettled !== 'undefined';
    try {
      if (hasFlag) _bootWipSettled = false;
      beginNewFormSession(); currentEntryId = null; sources = []; photos = {}; miscPhotos = [];
      document.getElementById('equipName').value = ''; document.getElementById('equipRoom').value = '';
      autoSaveCurrent();                 // backgrounded during the load window
      await sleep(400);
      await loadAll(); await sleep(200);
    } finally { if (hasFlag) _bootWipSettled = true; }
    const name = document.getElementById('equipName').value;
    const ok = sameEntryId(currentEntryId, id) && name === 'WIP-88' && !!(photos.source_0 && photos.source_0.dbKey);
    record(N, ok, 'restored name="' + name + '", same unit=' + sameEntryId(currentEntryId, id) + ', photo=' + !!(photos.source_0 && photos.source_0.dbKey));
    dropLoadBanners();
  }

  // T89 — loto-web makes an In/Out pair's FIRST device the "In" and binds
  // mark[0] to it; the dialog must ask for the In valve first
  async function t89_inOutMarksAskForTheInValveFirst() {
    const N = 'T89 an In/Out source\'s mark dialog asks for the IN valve first, then OUT';
    await resetAppState();
    fillFormNoSources('IO-89');
    sources.push(Object.assign(mkSrc('HHW In/Out'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('io89'));
    openValveMarkDialog('source_0'); await markDialogReady();
    const txt = (document.getElementById('valveMarkOverlay') || {}).textContent || '';
    const asksIn = /tap the IN valve first/i.test(txt);
    tapMark(0.3, 0.5);
    const cnt = (document.getElementById('valveMarkCount') || {}).textContent || '';
    const asksOut = /\bOUT\b/.test(cnt);
    clickById('valveMarkSkip');
    record(N, asksIn && asksOut, 'asks IN first=' + asksIn + ', then OUT=' + asksOut + ' ("' + cnt + '")');
  }

  // T90 — marks are one per device; when the device count drops (Split, the
  // Quantity box) nobody knows which mark left, so they must be cleared, not
  // silently trimmed to the first-tapped ones
  async function t90_deviceCountDropClearsTheMarks() {
    const N = 'T90 a Split or a lower quantity clears the source\'s valve marks (no arrow on the wrong valve)';
    await resetAppState();
    fillFormNoSources('Q-90');
    // a PLAIN two-valve row: which marked valve a Split takes is unknown. (An
    // In/Out pair splits by direction and keeps the In valve's mark since
    // build 109 — T204.)
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    sources.push(Object.assign(mkSrc('CHW In/Out'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('q90a'));
    await captureInto('source_1', await makePhotoFile('q90b'));
    for (const sl of ['source_0', 'source_1']) { openValveMarkDialog(sl); await markDialogReady(); tapMark(0.3, 0.5); tapMark(0.7, 0.5); clickById('valveMarkSave'); }
    const before = [(photos.source_0.marks || []).length, (photos.source_1.marks || []).length].join(',');
    splitSource(0);                                   // HHW: 2 → 1, split valve at index 1, CHW → index 2
    const afterSplit = photos.source_0 && photos.source_0.marks;
    updateSource(2, 'quantity', 1);                   // CHW: 2 → 1
    const afterQty = photos.source_2 && photos.source_2.marks;
    record(N, before === '2,2' && !(afterSplit && afterSplit.length) && !(afterQty && afterQty.length),
      'marks before=' + before + ', after Split=' + JSON.stringify(afterSplit || null) + ', after quantity 2→1=' + JSON.stringify(afterQty || null));
  }

  // T91 — Settings was taller than a landscape iPad / an iPhone with no scroll
  // and no way out but Save (off-screen)
  async function t91_settingsFitsTheScreenAndCloses() {
    const N = 'T91 Settings scrolls within the screen and can be closed without saving';
    showSettings();
    const ov = document.getElementById('settingsOverlay');
    const dlg = ov && ov.querySelector('.dialog');
    const cs = dlg ? getComputedStyle(dlg) : null;
    const scrolls = !!cs && (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && cs.maxHeight !== 'none';
    const h = dlg ? Math.round(dlg.getBoundingClientRect().height) : 0;
    const fits = !!dlg && h <= window.innerHeight + 1;
    const closeBtn = document.getElementById('settingsCloseBtn');
    if (closeBtn) closeBtn.click();
    const closed = !!ov && ov.style.display === 'none';
    if (ov) ov.style.display = 'none';
    record(N, scrolls && fits && !!closeBtn && closed, 'scrolls=' + scrolls + ', fits ' + window.innerHeight + 'px screen=' + fits + ' (' + h + 'px), close button=' + !!closeBtn + ', closed=' + closed);
  }

  // T92 — a water check auto-filled for a water source must not survive a
  // switch to Electrical (it exported a temperature check for a disconnect)
  async function t92_waterCheckNeverStaysOnAnElectricalSource() {
    const N = 'T92 switching a source from water to Electrical drops the water verification';
    await resetAppState();
    fillFormNoSources('V-92');
    addSource();
    handleEnergySourceChange(0, 'HHW In');
    renderSources();
    const wv = sources[0].verification || '';
    handleEnergySourceChange(0, 'Electrical 208V');
    handleDeviceTypeChange(0, 'Disconnect');
    renderSources();
    const ev = sources[0].verification || '';
    const pw = parseWaterVerification(wv), pe = parseWaterVerification(ev);
    const scenario = pw.recognized && !pw.blank;
    const clean = !(pe.recognized && !pe.blank);
    record(N, scenario && clean, 'water check first="' + wv + '", after switching to Electrical/Disconnect="' + ev + '"');
  }

  // T93 — the ZIP and Excel libraries ship with the app: the iOS app used to
  // fetch them from CDNs, so an offline launch after iOS purged its cache
  // could not export at all
  async function t93_exportLibrariesAreBundled() {
    const N = 'T93 JSZip + ExcelJS are bundled with the app (not CDN) and precached';
    const srcs = Array.from(document.querySelectorAll('script[src]')).map(x => x.getAttribute('src') || '');
    const z = srcs.find(x => /jszip/i.test(x)) || '', x = srcs.find(y => /exceljs/i.test(y)) || '';
    let sw = '';
    try { sw = await (await fetch('sw.js', { cache: 'no-store' })).text(); } catch (e) {}
    const local = !!z && !!x && !/^https?:/i.test(z) && !/^https?:/i.test(x);
    const precached = /vendor\/jszip/.test(sw) && /vendor\/exceljs/.test(sw) && !/cdnjs\.cloudflare|cdn\.jsdelivr/.test(sw);
    record(N, local && precached && typeof JSZip === 'function' && typeof ExcelJS === 'object',
      'jszip src=' + z + ', exceljs src=' + x + ', sw precaches vendor copies=' + precached + ', loaded=' + (typeof JSZip) + '/' + (typeof ExcelJS));
  }

  // T94 — the entry store evicted (IndexedDB readable, list gone) while the
  // emergency copy survives: say so loudly (b90 did; b91 went silent and the
  // next save made the loss of every sketch permanent)
  async function t94_evictedStoreIsAnnounced() {
    const N = 'T94 an evicted entry store restored from the emergency copy is announced (EXPORT NOW)';
    await resetAppState();
    const A = mkEntry('Evict-94');
    A.sketch = { diagramKey: 'general', strokes: [], labels: [{ x: 0.2, y: 0.2, text: 'E-1', color: '#d94a4a' }] };
    savedEquipment = [A]; saveAll(); await sleep(400);
    await rawIdbDelete('metadata', 'saved_equipment');
    await rawIdbDelete('metadata', 'saved_equipment_at').catch(() => {});
    const msgs = await withToasts(async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    const said = msgs.some(m => /EMPTY|evict/i.test(m) && /EXPORT NOW/i.test(m));
    record(N, savedEquipment.length === 1 && said, 'entries back=' + savedEquipment.length + ', toasts=' + JSON.stringify(msgs));
    dropLoadBanners();
  }

  // T95 — loto-web reads the survey date from the sheet's filename; an "All
  // dates" export must write one sheet per survey date, never one sheet named
  // with today's date holding every day's units
  async function t95_allDatesExportWritesOneSheetPerSurveyDate() {
    const N = 'T95 an "All dates" export writes one Information Sheet per survey date';
    await resetAppState();
    const A = mkEntry('EF-1', { savedAt: new Date(2026, 8, 22, 10).toISOString() });
    const B = mkEntry('EF-12', { savedAt: new Date(2026, 8, 24, 10).toISOString() });
    savedEquipment = [A, B]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true, dateFilter: 'all' });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const sheets = Object.keys(u.files).filter(q => /^info_sheets\/Information_Sheet_.*\.xlsx$/.test(q)).sort();
    const units = {};
    for (const q of sheets) units[q.replace('info_sheets/', '')] = await sheetUnits(u.files[q]);
    const ok = JSON.stringify(units) === JSON.stringify({ 'Information_Sheet_092226.xlsx': ['EF-1'], 'Information_Sheet_092426.xlsx': ['EF-12'] });
    record(N, ok, JSON.stringify(units));
  }

  // T96 — a source with no Energy Source used to export as a blank row that
  // loto-web's import skips (with its photo); linked sources were never even
  // flagged
  async function t96_blankEnergySourceIsFlaggedAndKept() {
    const N = 'T96 a source with no Energy Source is flagged and never exported as a row the office import drops';
    await resetAppState();
    const T = mkEntry('MCC-96', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Breaker', deviceId: 'MCC-2A #7' })] });
    savedEquipment = [T]; saveAll();
    fillFormNoSources('EF-96');
    addSource();
    pendingLinkSourceIndex = 0; applyLink(0, 0);
    const filled = sources[0].energySource || '';
    sources[0].energySource = ''; renderSources();          // …and if it is blank anyway
    const flagged = collectIncompleteFields().some(m => /Source #1/.test(m) && /Energy Source/.test(m));
    const E = saveEntry();
    const { zip, confirms } = await runExport({ confirmResponse: true, choice: { 'export-blank-energy': 'export' } });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const xpath = Object.keys(u.files).find(q => /Information_Sheet_.*\.xlsx$/.test(q));
    let col1 = null;
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      let inUnit = false, prevHeader = false;
      wb.worksheets[0].eachRow(row => {
        const a = String(row.getCell(1).value || '');
        if (prevHeader) inUnit = a === 'EF-96';
        prevHeader = a === 'Equipment ID/Name';
        if (inUnit && col1 === null && a === 'Energy Source #1') col1 = '__next__';
        else if (col1 === '__next__') col1 = a;
      });
    }
    const prompted = confirms.some(c => /export-blank-energy/.test(c));
    record(N, filled === 'Electrical 480V' && flagged && !!col1 && col1 !== '__next__' && prompted,
      'link filled energy="' + filled + '", flagged=' + flagged + ', XLSX col 1="' + col1 + '", export asked=' + prompted + (E ? '' : ' (not saved)'));
  }

  // T97 — Condensate Pump reuses the HHW pump template, which gained an HHW In
  // source (build 22) that a condensate pump doesn't have
  async function t97_condensatePumpHasNoHhwSupply() {
    const N = 'T97 a new Condensate Pump gets no phantom HHW In source (and, since build 107, no Kinetic — just its Electrical)';
    await resetAppState();
    fillFormNoSources('CP-97');
    document.getElementById('equipType').value = 'Condensate Pump';
    await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
    closeAllPrompts();
    const names = sources.map(x => x.energySource);
    record(N, !names.some(n => /^HHW In/.test(n || '')) && !names.some(n => /^Kinetic/.test(n || ''))
      && names.some(n => /^Electrical/.test(n || '')), 'sources: ' + names.join(', '));
  }

  // T98 — the template-change dialog promises that sources holding the user's
  // data are KEPT; sources saved before build 91 carry no userEdited flag and
  // were dropped anyway. And a Generator's voltage source, pushed while the
  // dialog was still open, was dropped by the confirmed template change.
  async function t98_templateChangeKeepsWhatItPromises() {
    const N = 'T98 a template / type change keeps pre-b91 sources holding data, and the Generator voltage source';
    await resetAppState();
    fillFormNoSources('Old-98');
    document.getElementById('equipType').value = 'Air Handler'; filterTemplateDropdown('Air Handler');
    sources.push(Object.assign(mkSrc('Natural Gas'), { deviceType: 'Ball Valve', location: 'Mech Rm 2', auto: false }));
    sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', deviceId: 'VFD-3', auto: true }));
    sources.forEach(x => { delete x.userEdited; });
    renderSources();
    document.getElementById('equipTemplate').value = 'AHU - HHW';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange('AHU - HHW');
    closeAllPrompts();
    const keptGas = sources.some(x => x.energySource === 'Natural Gas' && x.location === 'Mech Rm 2');
    const keptTag = sources.some(x => x.deviceId === 'VFD-3');
    // Generator: a user source already on the form → the template confirm opens
    await resetAppState();
    fillFormNoSources('Gen-98');
    sources.push(Object.assign(mkSrc('Fuel Oil'), { deviceType: 'Ball Valve', location: 'Day tank', auto: false }));
    renderSources();
    document.getElementById('equipType').value = 'Generator';
    await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
    if (document.getElementById('voltageOverlay')) applyVoltageChoice('480V');
    if (document.getElementById('templateConfirmOverlay')) {
      const t = (EQUIPMENT_TEMPLATE_MAP.Generator || [])[0];
      confirmTemplateChange(t);
    }
    closeAllPrompts();
    const genElec = sources.some(x => /^Electrical 480V/.test(x.energySource || ''));
    record(N, keptGas && keptTag && genElec, 'kept gas source=' + keptGas + ', kept typed Device ID=' + keptTag + ', Generator 480V source=' + genElec + ' (' + sources.map(x => x.energySource).join(', ') + ')');
  }

  // T99 — a mistyped custom photo size ("192") became every later photo's size
  async function t99_customPhotoSizeIsClamped() {
    const N = 'T99 a mistyped custom photo size is clamped, not applied to every later capture';
    let had = null;
    try { had = localStorage.getItem('loto_photo_settings'); } catch (e) {}
    try {
      showSettings();
      document.getElementById('photoPreset').value = 'custom';
      applyPhotoPreset();
      document.getElementById('photoMaxW').value = '192';
      document.getElementById('photoMaxH').value = '-5';
      savePhotoSettings();
      const st = getPhotoSettings();
      record(N, st.maxWidth >= 640 && st.maxHeight >= 480, 'saved maxWidth=' + st.maxWidth + ', maxHeight=' + st.maxHeight);
    } finally {
      try { if (had === null) localStorage.removeItem('loto_photo_settings'); else localStorage.setItem('loto_photo_settings', had); } catch (e) {}
      const ov = document.getElementById('settingsOverlay'); if (ov) ov.style.display = 'none';
    }
  }


  // ======================================================================
  // Build 94 — one test per finding of the 2026-09-27 execution-based review
  // (random-action fuzzer, export → loto-web differential, Simulator, two tabs,
  // phone widths) plus the two known items it re-found (CSV line breaks, an
  // unreadable unit-in-progress). Each failed on build 93.
  // ======================================================================

  // A CSV parser that honours quoted cells (line breaks inside quotes stay in the cell).
  function parseCsvRows(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* CRLF */ }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.length > 1 || r[0]);
  }
  // The cells (1..13) of unit `name`'s source #n data row on an Information Sheet, plus its label row.
  async function sheetSourceRow(bytes, name, n) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(bytes);
    let inUnit = false, prevHeader = false, want = false, out = null, label = null;
    wb.worksheets[0].eachRow(row => {
      const cells = []; for (let c = 1; c <= 13; c++) { const v = row.getCell(c).value; cells.push(v == null ? '' : String(v)); }
      const a = cells[0];
      if (want && out === null) { out = cells; want = false; }
      if (prevHeader) inUnit = a === name;
      prevHeader = a === 'Equipment ID/Name';
      if (inUnit && out === null && a === 'Energy Source #' + n) { want = true; label = cells; }
    });
    return { row: out, label };
  }

  // T100 — the ✕ on the row marked EDITING deleted the unit but the form kept
  // editing it: Clear then promised "the original saved entry will be
  // preserved" (it wasn't), and Save re-created it dated today
  async function t100_deletingTheUnitOpenForEditClosesTheForm() {
    const N = 'T100 deleting the unit that is open for edit says so and closes the form (single + bulk delete)';
    await resetAppState();
    fillForm('Edit-100');
    await captureInto('source_0', await makePhotoFile('e100'));
    const E = saveEntry();
    editSaved(savedEquipment.findIndex(e => e.id === E.id)); await sleep(100);
    const { log } = await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.id === E.id)); });
    const warned = log.some(m => /open (in the form|for edit)/i.test(m));
    const closed = !editingEntry && !sameEntryId(currentEntryId, E.id) && document.getElementById('equipName').value === '';
    let clearPrompt = null;
    await withDialogs({ confirm: (m) => { clearPrompt = m; return false; } }, async () => { clearForm(true); });
    // bulk delete while the unit is open
    fillForm('Edit-100b'); const F = saveEntry();
    editSaved(savedEquipment.findIndex(e => e.id === F.id)); await sleep(100);
    showBulkDeleteDialog();
    document.getElementById('bulkDeleteDateFilter').value = 'all';
    document.getElementById('bulkDeleteConfirmInput').value = 'DELETE';
    updateBulkDeleteSummary();
    const said = ((document.getElementById('bulkDeleteSummary') || {}).textContent || '') + ' ' + ((document.getElementById('bulkDeleteWarn') || {}).textContent || '');
    confirmBulkDelete();
    const bulkClosed = !editingEntry && !sameEntryId(currentEntryId, F.id) && document.getElementById('equipName').value === '';
    record(N, warned && closed && !clearPrompt && /open in the form/i.test(said) && bulkClosed,
      'delete warned it is open=' + warned + ', form closed=' + closed + ', later Clear prompt=' + JSON.stringify(clearPrompt) +
      ', bulk summary says open=' + /open in the form/i.test(said) + ', bulk closed the form=' + bulkClosed);
  }

  // T101 — two tabs of the web app share one storage and each wrote its own
  // list over the other's: a unit saved in one tab vanished when the other saved.
  // Build 95: the tab that opened last holds a claim in localStorage; the other
  // one is told (storage event) and pauses — and writes nothing.
  async function t101_aSecondTabPausesInsteadOfOverwriting() {
    const N = 'T101 another tab takes the claim → this one pauses and writes nothing (no lost saves)';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    const KEY = 'loto_tab_claim';
    let had = null; try { had = localStorage.getItem(KEY); } catch (e) {}
    try {
      savedEquipment = [mkEntry('Keep-101')]; saveAll(); await sleep(400);
      const v = JSON.stringify({ id: 'TEST-OTHER-TAB', at: new Date().toISOString() });
      localStorage.setItem(KEY, v);
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: v }));
      await sleep(200);
      const ov = document.getElementById('tabPausedOverlay');
      const shown = !!ov && ov.style.display !== 'none' && /another tab/i.test(ov.textContent || '');
      savedEquipment.push(mkEntry('Stale-101')); saveAll(); await sleep(500);
      const stored = await rawIdbGet('metadata', 'saved_equipment');
      const wrote = Array.isArray(stored) && stored.some(e => e && e.equipName === 'Stale-101');
      record(N, shown && !wrote, 'paused overlay=' + shown + ', paused tab still wrote=' + wrote);
    } finally {
      try { if (had === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, had); } catch (e) {}
      try { _tabPaused = false; } catch (e) {}
      if (typeof claimThisTab === 'function') claimThisTab();
      const o = document.getElementById('tabPausedOverlay'); if (o) o.remove();
    }
  }

  // T102 — a link fills a blank source from the shared point (b93), but took
  // "HHW In/Out" without its device count: exported ×1, loto-web made one
  // water-out point and no In valve
  async function t102_linkToAnInOutPairTakesItsDeviceCount() {
    const N = 'T102 linking a blank source to an In/Out pair takes the pair\'s device count (2)';
    await resetAppState();
    const T = mkEntry('Pair-102', { sources: [Object.assign(mkSrc('HHW In/Out'), { sourceId: genUuid(), deviceType: 'Ball Valve', quantity: 2, verification: 'Temp Only - Hot' })] });
    savedEquipment = [T]; saveAll();
    fillFormNoSources('Link-102'); addSource();
    pendingLinkSourceIndex = 0; applyLink(0, 0);
    record(N, sources[0].energySource === 'HHW In/Out' && sources[0].quantity === 2, 'energy="' + sources[0].energySource + '", quantity=' + sources[0].quantity);
  }

  // T103 — on an iPhone the header's six buttons ran off the right edge
  // (Import / Backup / Log / Export unreachable without sideways scrolling)
  async function t103_headerFitsAPhoneScreen() {
    const N = 'T103 the header fits a 375-px phone screen (every button on screen, no sideways scroll)';
    const hdr = document.querySelector('.header');
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:0;top:0;width:375px;visibility:hidden;z-index:-1;';
    const clone = hdr.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.style.position = 'static';
    box.appendChild(clone); document.body.appendChild(box);
    try {
      const right = box.getBoundingClientRect().right;
      const btns = [...clone.querySelectorAll('.header-actions button')];
      const off = btns.filter(b => b.getBoundingClientRect().right > right + 0.5).map(b => b.textContent.trim());
      const w = clone.scrollWidth;
      record(N, btns.length >= 6 && !off.length && w <= 375.5, 'off-screen buttons: ' + (off.join(', ') || 'none') + ', header content ' + w + 'px wide');
    } finally { box.remove(); }
  }

  // T104 — names and source fields went into the page as HTML: "Fan <B> & C"
  // showed "Fan  & C", a name with <img onerror> ran script, and a Device ID
  // with an inch mark (6" gate) was cut to 6 in its box
  async function t104_namesAndFieldsShowExactlyAsTyped() {
    const N = 'T104 names and source fields show exactly as typed (no HTML, no script, inch marks kept)';
    await resetAppState();
    window.__xss104 = 0;
    const evil = 'Pump <img src=x onerror="window.__xss104=1">';
    const A = mkEntry('Fan <B> & C', { room: 'Rm <b>2</b>', sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Breaker', deviceId: '6" gate', location: 'Panel <b2>' })] });
    const B = mkEntry(evil);
    savedEquipment = [A, B]; saveAll();
    try { savedFilter = 'all'; savedSearchTerm = ''; } catch (e) {}
    renderSavedPanel(); await sleep(200);
    const listed = [...document.querySelectorAll('.saved-item-name')].map(el => el.textContent);
    const listOk = listed.some(t => t.indexOf('Fan <B> & C') === 0) && listed.some(t => t.indexOf(evil) === 0);
    fillFormNoSources('Card-104');
    sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Breaker', deviceId: '6" gate', location: 'Panel <b2>', collapsed: false }));
    renderSources();
    const idBox = document.getElementById('src_deviceId_0');
    const boxOk = !!idBox && idBox.value === '6" gate';
    sources[0].collapsed = true; renderSources();
    const cardTxt = (document.querySelector('.source-card') || {}).textContent || '';
    const cardOk = cardTxt.indexOf('(6" gate)') >= 0 && cardTxt.indexOf('Panel <b2>') >= 0;
    showCopySourceDialog(0);
    const copyTxt = (document.getElementById('copySourceOverlay') || {}).textContent || '';
    closeCopySourceDialog();
    showLinkDialog(0); setLinkScope('all');          // the default scope is the form's own room
    const linkOv = document.getElementById('linkDialogOverlay');
    const linkTxt = (linkOv || {}).textContent || '';
    if (typeof closeLinkDialog === 'function') closeLinkDialog(); else if (linkOv) linkOv.remove();
    await sleep(200);
    const ok = listOk && boxOk && cardOk && copyTxt.indexOf('Fan <B> & C') >= 0 && linkTxt.indexOf('Fan <B> & C') >= 0 && !window.__xss104;
    record(N, ok, 'saved list=' + JSON.stringify(listed.map(t => t.slice(0, 40))) + ', Device ID box=' + JSON.stringify(idBox && idBox.value) +
      ', card shows tag+location=' + cardOk + ', copy dialog name=' + (copyTxt.indexOf('Fan <B> & C') >= 0) + ', link dialog name=' + (linkTxt.indexOf('Fan <B> & C') >= 0) + ', script ran=' + !!window.__xss104);
    savedEquipment = []; saveAll(); renderSavedPanel();
  }

  // T105 — Copy source changes the device count but kept every valve mark
  // (the b93 marks-vs-quantity rule missed this path)
  async function t105_copySourceThatLowersTheCountClearsMarks() {
    const N = 'T105 Copy source that lowers the device count clears the valve marks (like Split / Quantity)';
    await resetAppState();
    const S = mkEntry('Src-105', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Breaker', quantity: 1 })] });
    savedEquipment = [S]; saveAll();
    fillFormNoSources('Copy-105');
    sources.push(Object.assign(mkSrc('CHW In/Out'), { deviceType: 'Butterfly', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('c105'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.3, 0.5); tapMark(0.7, 0.5); clickById('valveMarkSave');
    const before = ((photos.source_0 || {}).marks || []).length;
    showCopySourceDialog(0); applyCopySource(0, 0);
    const after = ((photos.source_0 || {}).marks || []).length;
    record(N, before === 2 && sources[0].quantity === 1 && after === 0, 'marks before=' + before + ', quantity after the copy=' + sources[0].quantity + ', marks after=' + after);
  }

  // T106 — an unsaved unit with no photos counts as today's work in the export
  // filter but went on Information_Sheet_undated.xlsx (no date for loto-web)
  async function t106_unsavedUnitWithoutPhotosIsOnTodaysSheet() {
    const N = 'T106 an unsaved unit with no photos goes on TODAY\'s Information Sheet in an "All dates" export';
    await resetAppState();
    savedEquipment = [mkEntry('Old-106', { savedAt: new Date(2026, 8, 22, 10).toISOString() })]; saveAll();
    fillForm('Open-106');
    const { zip, confirms } = await runExport({ confirmResponse: true, dateFilter: 'all' });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const units = {};
    for (const q of Object.keys(u.files).filter(x => /^info_sheets\/Information_Sheet_.*\.xlsx$/.test(x)).sort()) units[q.replace('info_sheets/', '')] = await sheetUnits(u.files[q]);
    const today = 'Information_Sheet_' + getDateStamp(new Date()) + '.xlsx';
    record(N, (units[today] || []).includes('Open-106') && !units['Information_Sheet_undated.xlsx'], JSON.stringify(units));
  }

  // T107 — a linked source's Detail cell carried "LINKED → <unit> Src#N | L";
  // loto-web stored that as the photo detail (arrow side lost, shared-ID key
  // polluted). The link now has its own column the office importer ignores.
  async function t107_linkedSourceKeepsItsDetailCellClean() {
    const N = 'T107 a linked source\'s Detail cell holds only its detail; the link is in a "Linked To" column';
    await resetAppState();
    const T = mkEntry('MCC-107', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Breaker', deviceId: 'MCC-2A #7' })] });
    savedEquipment = [T]; saveAll();
    fillFormNoSources('Fan-107'); addSource();
    pendingLinkSourceIndex = 0; applyLink(0, 0);
    sources[0].detail = 'L'; renderSources();
    saveEntry();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const xp = Object.keys(u.files).find(q => /Information_Sheet_.*\.xlsx$/.test(q));
    const { row, label } = await sheetSourceRow(u.files[xp], 'Fan-107', 1);
    const ok = !!row && row[6] === 'L' && /MCC-107/.test(row[12]) && !!label && label[12] === 'Linked To';
    record(N, ok, 'Detail cell=' + JSON.stringify(row && row[6]) + ', col 13=' + JSON.stringify(row && row[12]) + ', col 13 label=' + JSON.stringify(label && label[12]));
  }

  // T108 — the Save & New message read '&#10004; Saved "X" "" 5 total'
  async function t108_saveMessageReadsCleanly() {
    const N = 'T108 the Save & New message reads cleanly (no "&#10004;", no stray quotes)';
    await resetAppState();
    fillForm('Toast-108');
    performSaveAndNew();
    const shown = (document.getElementById('toast') || {}).textContent || '';
    record(N, /Toast-108/.test(shown) && !/&#|&[a-z]+;|""/.test(shown), 'toast shows ' + JSON.stringify(shown));
  }

  // T109 — KNOWN since the b92 review: a value with a line break (notes) wasn't
  // quoted in the CSV, so every source row of that unit split in two
  async function t109_csvKeepsALineBreakInsideItsCell() {
    const N = 'T109 a note with a line break stays inside its CSV cell (rows don\'t split)';
    await resetAppState();
    const A = mkEntry('Note-109', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid() }), Object.assign(mkSrc('Natural Gas'), { sourceId: genUuid() })] });
    A.notes = 'Line 1\nLine 2\r\nLine 3';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const cp = Object.keys(u.files).find(q => /\.csv$/.test(q));
    const rows = parseCsvRows(new TextDecoder().decode(u.files[cp]));
    const widths = Array.from(new Set(rows.map(r => r.length)));
    record(N, rows.length === 3 && widths.length === 1 && /Line 2/.test((rows[1] || [])[9] || ''), 'CSV rows=' + rows.length + ' (want 3), widths=' + widths.join(','));
  }

  // T110 — KNOWN since the b92 review: when the stored unit-in-progress can't
  // be read at launch the form came up blank with no word — even when this
  // device held a newer local copy of it — and the unit reappeared launches
  // later as a "Recovered draft"
  async function t110_unreadableUnitInProgressUsesItsLocalCopyAndSaysSo() {
    const N = 'T110 an unreadable unit-in-progress comes back from its local copy, with a warning';
    await resetAppState();
    const id = genUuid();
    const older = { at: new Date(Date.now() - 60000).toISOString(), entryId: id, equipType: '', equipName: 'Old-110', lotoId: '', equipRoom: 'R1', equipBuilding: 'Main',
      template: '', tiedTo: '', tiedToName: '', notes: '', sources: [mkSrc('Electrical 480V')], photos: {}, miscPhotos: [], sketch: null };
    await rawIdbPut('metadata', 'current_wip', older);
    try { localStorage.setItem('loto_current', JSON.stringify(Object.assign({}, older, { at: new Date().toISOString(), equipName: 'Draft-110' }))); } catch (e) {}
    const realGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) {
      if (k === 'current_wip') throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
      return realGet.apply(this, arguments);
    };
    let msgs = [];
    try { msgs = await withToasts(async () => { savedEquipment = []; await loadAll(); await sleep(300); }); }
    finally { IDBObjectStore.prototype.get = realGet; }
    const name = document.getElementById('equipName').value;
    const warned = msgs.some(m => /couldn.t read|could not read/i.test(m));
    savedEquipment = []; await loadAll(); await sleep(300);     // next launch reads normally
    record(N, name === 'Draft-110' && warned, 'form at launch="' + name + '", warned=' + warned + ' ' + JSON.stringify(msgs));
    dropLoadBanners();
  }


  // ======================================================================
  // Build 95 — one test per finding of the 2026-09-27 review of build 94
  // (the b94 fixes' own regressions: the unit-in-progress restore, the tab
  // lock, marks, backup Replace, the emergency-copy warning, the phone header)
  // ======================================================================
  const wipOf = (name, id, extra) => Object.assign({ at: new Date().toISOString(), entryId: id, equipType: '', equipName: name, lotoId: '',
    equipRoom: 'R1', equipBuilding: 'Main', template: '', tiedTo: '', tiedToName: '', notes: '', sources: [mkSrc('Electrical 480V')],
    photos: {}, miscPhotos: [], sketch: null }, extra || {});
  async function withUnreadable(keys, fn) {
    const realGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) {
      if (keys === '*' || keys.includes(k)) throw new DOMException('Connection to Indexed Database server lost', 'UnknownError');
      return realGet.apply(this, arguments);
    };
    try { return await fn(); } finally { IDBObjectStore.prototype.get = realGet; }
  }
  async function clearWipSlots() {
    try { localStorage.removeItem('loto_current'); localStorage.removeItem('loto_current_alt'); localStorage.removeItem('loto_wip_superseded'); } catch (e) {}
    await rawIdbDelete('metadata', 'current_wip').catch(() => {});
    await rawIdbDelete('metadata', 'current_wip_alt').catch(() => {});
    _wipUnread = false;
  }

  // T111 — b94 restored an unreadable unit-in-progress from its local copy but
  // left the unreadable (older) copy in place: once the unit was saved, the
  // next normal launch reopened that older copy as an EDIT of the saved unit —
  // an export shipped it and Save & New overwrote the unit with it
  async function t111_restoredUnitNeverComesBackAsItsOlderCopy() {
    const N = 'T111 a unit restored from its local copy and then saved never comes back as its older stored copy';
    await resetAppState(); await clearWipSlots();
    const id = genUuid();
    await rawIdbPut('metadata', 'current_wip', wipOf('Pump-111', id, { at: new Date(Date.now() - 120000).toISOString(), notes: 'OLD' }));
    localStorage.setItem('loto_current', JSON.stringify(wipOf('Pump-111', id, { notes: 'NEW', sources: [mkSrc('Electrical 480V'), mkSrc('Natural Gas')] })));
    await withUnreadable(['current_wip'], async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    const restored = document.getElementById('equipNotes').value === 'NEW';
    performSaveAndNew(); await sleep(500);
    // next launch: storage healthy again
    const msgs = await withToasts(async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    const name = document.getElementById('equipName').value, edit = !!editingEntry;
    const saved = savedEquipment.find(e => sameEntryId(e.id, id));
    // …and when current_wip is STILL unreadable, no false "couldn't read" alarm for a unit that was saved
    await clearWipSlots();
    await rawIdbPut('metadata', 'current_wip', wipOf('Pump-111b', id, { at: new Date(Date.now() - 120000).toISOString() }));
    localStorage.setItem('loto_current', JSON.stringify(wipOf('Pump-111b', id, { notes: 'NEW' })));
    await withUnreadable(['current_wip'], async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    performSaveAndNew(); await sleep(500);
    dropLoadBanners();
    await withUnreadable(['current_wip'], async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    const falseAlarm = !!document.getElementById('wipReadBanner');
    const ok = restored && name === '' && !edit && !!saved && saved.notes === 'NEW' && (saved.sources || []).length === 2 && !falseAlarm;
    record(N, ok, 'launch 1 restored the newer copy=' + restored + '; after saving, next launch form="' + name + '" editing=' + edit +
      ', saved notes=' + (saved && saved.notes) + ' sources=' + (saved && (saved.sources || []).length) + '; still-unreadable launch shows false banner=' + falseAlarm + ' ' + JSON.stringify(msgs));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T112 — saveAll wrote this tab's in-memory list over the store: units
  // another tab (or an older build still open) saved in the meantime were lost
  async function t112_saveMergesUnitsAnotherWriterSaved() {
    const N = 'T112 saving never overwrites units another tab saved in the meantime';
    await resetAppState();
    savedEquipment = [mkEntry('Mine-112')]; saveAll(); await sleep(500);
    const stored = (await rawIdbGet('metadata', 'saved_equipment')) || [];
    await rawIdbPut('metadata', 'saved_equipment', stored.concat([mkEntry('Other-112')]));
    await rawIdbPut('metadata', 'saved_equipment_at', new Date(Date.now() + 5000).toISOString());
    fillForm('New-112'); performSaveAndNew(); await sleep(800);
    const names = (((await rawIdbGet('metadata', 'saved_equipment')) || []).map(e => e.equipName)).sort();
    record(N, names.includes('Other-112') && names.includes('New-112') && names.includes('Mine-112'), 'stored after the save: ' + JSON.stringify(names));
  }

  // T113 — the b94 lock was decided once at launch: a tab that missed the
  // other tab's message (suspended, blocked in a dialog) went on writing its
  // stale list. Every write now checks the claim itself.
  async function t113_aTabThatLostTheClaimWritesNothing() {
    const N = 'T113 a tab whose claim another tab took (even with no message delivered) pauses and writes nothing';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    const KEY = 'loto_tab_claim';
    let had = null; try { had = localStorage.getItem(KEY); } catch (e) {}
    try {
      savedEquipment = [mkEntry('Keep-113')]; saveAll(); await sleep(400);
      localStorage.setItem(KEY, JSON.stringify({ id: 'TEST-OTHER-TAB', at: new Date().toISOString() }));   // no event: it was missed
      savedEquipment.push(mkEntry('Stale-113')); saveAll(); await sleep(500);
      fillForm('Form-113'); autoSaveCurrent(); await sleep(300);
      const stored = await rawIdbGet('metadata', 'saved_equipment');
      const wrote = Array.isArray(stored) && stored.some(e => e && e.equipName === 'Stale-113');
      const wip = await rawIdbGet('metadata', 'current_wip');
      const wipWrote = !!wip && wip.equipName === 'Form-113';
      const ov = document.getElementById('tabPausedOverlay');
      const paused = !!ov && ov.style.display !== 'none';
      record(N, !wrote && !wipWrote && paused, 'list written=' + wrote + ', unit-in-progress written=' + wipWrote + ', paused=' + paused);
    } finally {
      try { if (had === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, had); } catch (e) {}
      try { _tabPaused = false; } catch (e) {}
      if (typeof claimThisTab === 'function') claimThisTab();
      const o = document.getElementById('tabPausedOverlay'); if (o) o.remove();
    }
  }

  // T114 — a tab paused during launch still resolved the unit-in-progress
  // copies (deleted the alternate slot, rewrote current_wip) while the save of
  // the "recovered draft" it made was a no-op — that unit was lost
  async function t114_aPausedTabNeverTouchesTheUnitInProgressCopies() {
    const N = 'T114 a tab paused at launch never rewrites or deletes the stored unit-in-progress copies';
    await resetAppState(); await clearWipSlots();
    await rawIdbPut('metadata', 'current_wip', wipOf('X-114', genUuid(), { at: new Date(Date.now() - 60000).toISOString() }));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('Y-114', genUuid()));
    try { _tabPaused = true; savedEquipment = []; await loadAll(); await sleep(400); }
    finally { try { _tabPaused = false; } catch (e) {} const o = document.getElementById('tabPausedOverlay'); if (o) o.remove(); }
    const cw = await rawIdbGet('metadata', 'current_wip'), ca = await rawIdbGet('metadata', 'current_wip_alt');
    record(N, !!cw && cw.equipName === 'X-114' && !!ca && ca.equipName === 'Y-114', 'current_wip=' + (cw && cw.equipName) + ', current_wip_alt=' + (ca && ca.equipName));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T115 — Import → "Replace the saved list" removed the unit open for edit but
  // left the form editing it (the b94 delete fix didn't cover this path)
  async function t115_backupReplaceClosesTheUnitItRemoves() {
    const N = 'T115 Import → Replace closes the form when the unit open for edit is not in the backup';
    await resetAppState();
    fillForm('Open-115'); const E = saveEntry();
    editSaved(savedEquipment.findIndex(e => e.id === E.id)); await sleep(100);
    const file = new File([JSON.stringify({ version: 2, entries: [mkEntry('Other-115')] })], 'b.json', { type: 'application/json' });
    await withDialogs({ confirm: true, choice: { 'backup-import': 'replace' } }, async () => {
      handleBackupFile({ target: { files: [file] } });
      await waitFor(() => savedEquipment.some(e => e.equipName === 'Other-115'), 8000, 'replace applied');
      await sleep(200);
    });
    const closed = !editingEntry && document.getElementById('equipName').value === '';
    record(N, closed && !savedEquipment.some(e => e.id === E.id), 'form closed=' + closed + ', form name="' + document.getElementById('equipName').value + '"');
  }

  // T116 — a unit SAVED TWICE (two rows, one id): deleting the copy that is
  // NOT open for edit discarded the edit in progress on the other copy
  async function t116_deletingTheOtherTwinKeepsTheEdit() {
    const N = 'T116 deleting the other copy of a unit saved twice keeps the edit in progress';
    await resetAppState();
    const A = mkEntry('Twin-116'); const B = Object.assign(JSON.parse(JSON.stringify(A)), { notes: 'copy B' });
    savedEquipment = [A, B]; saveAll();
    editSaved(0); await sleep(100);
    document.getElementById('equipNotes').value = 'edited-116';
    const { log } = await withDialogs({ confirm: true }, async () => { deleteSaved(1); });
    const kept = !!editingEntry && document.getElementById('equipNotes').value === 'edited-116' && document.getElementById('equipName').value === 'Twin-116';
    record(N, kept && !log.some(m => /OPEN in the form/i.test(m)), 'edit kept=' + kept + ', confirm=' + JSON.stringify(log[0] || ''));
  }

  // T117 — Copy source / Link cleared the valve marks and the next message
  // (same tick, one toast) hid the "marks cleared" warning
  async function t117_marksClearedMessageIsTheOneShown() {
    const N = 'T117 Copy source that clears valve marks says so in the message the tech sees';
    await resetAppState();
    savedEquipment = [mkEntry('Src-117', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), quantity: 1 })] })]; saveAll();
    fillFormNoSources('Copy-117');
    sources.push(Object.assign(mkSrc('CHW In/Out'), { deviceType: 'Butterfly', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('c117'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.3, 0.5); tapMark(0.7, 0.5); clickById('valveMarkSave');
    showCopySourceDialog(0); applyCopySource(0, 0);
    const shown = (document.getElementById('toast') || {}).textContent || '';
    record(N, /valve mark/i.test(shown) && !((photos.source_0 || {}).marks || []).length, 'toast shows ' + JSON.stringify(shown));
  }

  // T118 — marks tapped on a source that later BECOMES an In/Out pair were kept
  // (count unchanged) and exported in tap order — loto-web points the IN arrow
  // at whichever valve was tapped first
  async function t118_marksPlacedBeforeAnInOutChangeAreDropped() {
    const N = 'T118 marks placed before a source became an In/Out pair are cleared, never exported as In/Out in tap order';
    await resetAppState();
    fillFormNoSources('IO-118');
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('io118'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.8, 0.5); tapMark(0.2, 0.5); clickById('valveMarkSave');
    const before = ((photos.source_0 || {}).marks || []).length;
    handleEnergySourceChange(0, 'HHW In/Out');
    const after = ((photos.source_0 || {}).marks || []).length;
    const exported = sourceMarksForExport({ sources: sources, photos: photos }, 0).length;
    record(N, before === 2 && after === 0 && exported === 0, 'marks before=' + before + ', after the switch to HHW In/Out=' + after + ', exported=' + exported);
  }

  // T119 — b94's "the open form is today's work" also moved an open EDIT of an
  // undated saved unit onto today's Information Sheet
  // Build 109: the export now ASKS the day of a unit with none (T208); left
  // undated it stays on the undated sheet — never quietly on today's.
  async function t119_undatedUnitOpenForEditStaysUndated() {
    const N = 'T119 an undated saved unit open for edit is never put on today\'s Information Sheet: the export asks its day, and left undated it stays on the undated sheet';
    await resetAppState();
    const U = mkEntry('Undated-119'); delete U.savedAt;
    const D = mkEntry('Dated-119', { savedAt: new Date(2026, 8, 22, 10).toISOString() });
    savedEquipment = [U, D]; saveAll();
    editSaved(0); await sleep(100);
    const { zip, confirms } = await runExport({ confirmResponse: true, dateFilter: 'all', choice: { 'survey-date': 'undated' } });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const units = {};
    for (const q of Object.keys(u.files).filter(x => /^info_sheets\/Information_Sheet_.*\.xlsx$/.test(x)).sort()) units[q.replace('info_sheets/', '')] = await sheetUnits(u.files[q]);
    const asked = confirms.some(m => /CHOICE survey-date/.test(m));
    record(N, asked && (units['Information_Sheet_undated.xlsx'] || []).includes('Undated-119'), 'asked=' + asked + '; ' + JSON.stringify(units));
  }

  // T120 — with IndexedDB failing, the "emergency copy — export now" warning
  // was a toast the unit-in-progress toast replaced 2 ms later
  async function t120_emergencyCopyWarningStaysOnScreen() {
    const N = 'T120 "showing the emergency copy — export now" stays on screen when the unit in progress can\'t be read either';
    await resetAppState(); await clearWipSlots();
    savedEquipment = [mkEntry('E-120')]; saveAll(); await sleep(500);
    dropLoadBanners();
    await withUnreadable('*', async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    const txt = Array.from(document.querySelectorAll('.container > div')).map(d => d.textContent || '').join(' | ');
    const ok = /emergency copy/i.test(txt) && /export/i.test(txt);
    record(N, ok, 'on-screen banners: ' + JSON.stringify(txt.slice(0, 300)));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200); dropLoadBanners();
  }

  // T121 — on a phone the header (with the "⚠ Storage issue" chip and the
  // photo badge) is no longer pinned: the warning must stay on screen
  async function t121_storageWarningIsInTheBottomBar() {
    const N = 'T121 a storage problem shows in the always-visible bottom bar (phones included)';
    try {
      setAutosaveStatus('error');
      const el = document.getElementById('bottomAlert');
      const shown = !!el && getComputedStyle(el).display !== 'none' && /storage/i.test(el.textContent || '');
      setAutosaveStatus('saved');
      const cleared = !el || getComputedStyle(el).display === 'none' || !/storage/i.test(el.textContent || '');
      record(N, shown && cleared, 'shown on error=' + shown + ', cleared after a good save=' + cleared);
    } finally { setAutosaveStatus('saved'); }
  }

  // T122 — escaping is by hand at every interpolation (b94 added ~80 calls):
  // this guard renders every user-facing builder with markup in every field
  // and fails if any of it becomes a live element (it passes on b94 — it is
  // the net for the NEXT builder that forgets)
  async function t122_noUserValueEverBecomesMarkup() {
    const N = 'T122 no user value becomes live markup in any list, card or dialog (canary sweep)';
    await resetAppState();
    const C = '<i class="cnry">x</i>&"\'';
    const leaks = [];
    const check = (where) => { const n = document.querySelectorAll('.cnry').length; if (n) leaks.push(where + ' (' + n + ')'); };
    window.__cnry122 = 0;
    const evil = C + '<img src=x onerror="window.__cnry122=1">';
    const srcC = () => Object.assign(mkSrc(C), { sourceId: genUuid(), energySource: C, deviceType: C, deviceId: C, location: C, detail: C, verification: C,
      _customEnergy: true, _customDevice: true, _customLoc: true });
    const A = mkEntry(evil, { room: C, building: C, sources: [srcC()] });
    A.equipType = C; A.template = C; A.lotoId = C; A.notes = C; A.tiedToName = C;
    savedEquipment = [A, mkEntry('Plain-122')]; saveAll();
    try { savedFilter = 'all'; savedSearchTerm = ''; } catch (e) {}
    renderSavedPanel(); check('saved list');
    try { savedSearchTerm = C + 'zz'; renderSavedPanel(); check('search summary'); } finally { try { savedSearchTerm = ''; } catch (e) {} renderSavedPanel(); }
    fillFormNoSources('Card-122');
    const s = srcC(); s.collapsed = false;
    s.linkedTo = { equipName: C, equipType: C, equipBuilding: C, equipRoom: C, sourceIndex: 0, sourceLabel: C, entryId: A.id, sourceId: '' };
    sources.push(s); renderSources(); check('source card (open)');
    sources[0].collapsed = true; renderSources(); check('source card (collapsed)');
    showCopySourceDialog(0); check('copy source — units'); pickCopySourceEntry(0); check('copy source — sources'); closeCopySourceDialog();
    showLinkDialog(0); setLinkScope('all'); check('link — units'); showLinkSourcePicker(0); check('link — sources');
    if (typeof closeLinkDialog === 'function') closeLinkDialog();
    showIncompleteWarning([C]); check('incomplete warning'); closeIncompleteWarning();
    await withDialogs({ confirm: true }, async () => { try { duplicateSaved(0); await sleep(50); check('duplicate dialog'); } catch (e) {} });
    const dd = document.getElementById('duplicateDialog'); if (dd) dd.remove();
    try { showTemplatePrompt(C, [C]); check('template prompt'); } catch (e) {}
    closeAllPrompts();
    await sleep(150);
    record(N, !leaks.length && !window.__cnry122, leaks.length ? 'markup leaked in: ' + leaks.join(', ') : 'no leaks; script ran=' + !!window.__cnry122);
    savedEquipment = []; saveAll(); renderSavedPanel();
  }

  // T123 — build 95 renders user values through html`` (escape by default).
  // The opposite mistake is now the visible one: a value escaped twice, or a
  // piece of this code's own markup escaped, shows "&amp;" / "&mdash;" / "<b>"
  // as text. Every converted builder is rendered with a value full of the
  // characters that matter; each must show it VERBATIM and show no entity.
  async function t123_everyBuilderShowsUserTextVerbatim() {
    const N = 'T123 lists, cards and dialogs show user text verbatim — never as markup, never double-escaped';
    await resetAppState();
    const V = 'A&B <b>x</b> "q" \'z\' 5/8"';
    const ENT = /&(?:amp|lt|gt|quot|#39|#\d+|#x[0-9a-f]+|mdash|middot|hellip|larr|rarr|times|nbsp);/i;
    const bad = [];
    const look = (where, root) => {
      if (!root) { bad.push(where + ': not rendered'); return; }
      const t = root.textContent || '';
      if (!t.includes(V)) bad.push(where + ': value not shown verbatim');
      const m = ENT.exec(t); if (m) bad.push(where + ': shows "' + m[0] + '" as text');
      if (root.querySelector('b') && Array.from(root.querySelectorAll('b')).some(b => b.textContent === 'x')) bad.push(where + ': value became markup');
    };
    const srcV = () => Object.assign(mkSrc(V), { sourceId: genUuid(), energySource: V, deviceType: V, deviceId: V, location: V, detail: V, verification: V,
      _customEnergy: true, _customDevice: true, _customLoc: true });
    const A = mkEntry(V, { room: V, building: V, sources: [srcV()] });
    A.equipType = V; A.template = V; A.lotoId = V; A.notes = V; A.tiedToName = V;
    savedEquipment = [A, mkEntry('Plain-123')]; saveAll();
    try { savedFilter = 'all'; savedSearchTerm = ''; } catch (e) {}
    renderSavedPanel(); look('saved list', document.getElementById('savedPanelBody'));
    fillFormNoSources('Card-123');
    const s = srcV(); s.collapsed = true;
    s.linkedTo = { equipName: V, equipType: V, equipBuilding: V, equipRoom: V, sourceIndex: 0, sourceLabel: V, entryId: A.id, sourceId: '' };
    sources.push(s); renderSources(); look('source card (collapsed)', document.getElementById('sourcesContainer'));
    sources[0].collapsed = false; renderSources(); look('source card (open)', document.getElementById('sourcesContainer'));
    const inputs = ['src_energy_custom_0', 'src_device_custom_0', 'src_deviceId_0', 'src_loc_custom_0'];
    inputs.forEach(id => { const el = document.getElementById(id); if (!el || el.value !== V) bad.push('input ' + id + ' = ' + JSON.stringify(el && el.value)); });
    showCopySourceDialog(0); look('copy source — units', document.getElementById('copySourceOverlay'));
    pickCopySourceEntry(0); look('copy source — sources', document.getElementById('copySourceOverlay')); closeCopySourceDialog();
    showLinkDialog(0); setLinkScope('all'); look('link — units', document.getElementById('linkDialogOverlay'));
    showLinkSourcePicker(0); look('link — sources', document.getElementById('linkDialogOverlay'));
    if (typeof closeLinkDialog === 'function') closeLinkDialog();
    showIncompleteWarning([V]); look('incomplete warning', document.getElementById('incompleteWarningOverlay')); closeIncompleteWarning();
    await withDialogs({ confirm: true }, async () => { try { duplicateSaved(0); await sleep(50); } catch (e) {} });
    look('duplicate dialog', document.getElementById('duplicateDialog'));
    const dd = document.getElementById('duplicateDialog'); if (dd) dd.remove();
    showTemplatePrompt(V, [V]); look('template prompt', document.getElementById('templatePromptOverlay'));
    closeAllPrompts();
    // an inline handler receives the value itself (jsArg)
    let got = null; const real = window.applyTemplatePromptChoice;
    try {
      window.applyTemplatePromptChoice = (v) => { got = v; };
      showTemplatePrompt(V, [V]);
      const btn = document.querySelector('#templatePromptOverlay .btn-primary'); if (btn) btn.click();
    } finally { window.applyTemplatePromptChoice = real; closeAllPrompts(); }
    if (got !== V) bad.push('template button handed ' + JSON.stringify(got));
    record(N, !bad.length, bad.length ? bad.join('; ') : 'verbatim everywhere; handler got the exact value');
    savedEquipment = []; saveAll(); renderSavedPanel(); sources = []; renderSources();
  }

  // T124 — found by the build-95 fault campaign (seed 8034; the path exists
  // since build 91): the launch could not read the entry store, the tech bulk-
  // deleted units, and the localStorage write of the deleted ids failed. The
  // next save merged the stored list back in — the deleted units returned with
  // their photos already erased. This session's deletions now live in memory
  // too.
  async function t124_aDeleteSurvivesAFailedTombstoneWrite() {
    const N = 'T124 a unit deleted while its deletion record cannot be written never comes back at the next save';
    await resetAppState();
    const A = mkEntry('Gone-124'), B = mkEntry('Stay-124');
    savedEquipment = [A, B]; saveAll(); await sleep(500);
    await withUnreadable(['saved_equipment'], async () => { savedEquipment = []; await loadAll(); await sleep(200); });
    dropLoadBanners();
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'loto_deleted_ids') { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; throw e; } return si.call(this, k, v); };
    try {
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.id === A.id)); });
    } finally { Storage.prototype.setItem = si; }
    await sleep(600);
    const stored = ((await rawIdbGet('metadata', 'saved_equipment')) || []).map(e => e.equipName);
    const mem = savedEquipment.map(e => e.equipName);
    record(N, !stored.includes('Gone-124') && !mem.includes('Gone-124') && stored.includes('Stay-124'),
      'stored=' + JSON.stringify(stored) + ', on screen=' + JSON.stringify(mem));
    _entryStoreUnread = false;
  }

  // ======================================================================
  // Build 96 — one test per medium finding of the 2026-09-28 review of build 95
  // ======================================================================
  // What a real relaunch starts without: this session's memory of deletes /
  // re-saves, the stamp it last read or wrote, the "store unread" flag.
  function forgetSessionMemory() {
    try {
      if (typeof resetTombstoneMemory === 'function') resetTombstoneMemory();
      else if (typeof _tombAdds !== 'undefined') { Object.keys(_tombAdds).forEach(k => delete _tombAdds[k]); if (typeof _tombClears !== 'undefined') _tombClears.clear(); }
    } catch (e) {}
    try { if (typeof _entryStoreAt !== 'undefined') _entryStoreAt = null; } catch (e) {}
    try { _entryStoreUnread = false; } catch (e) {}
  }
  // The next list save's commit fails once AFTER every put was issued — what a
  // quota error at commit, or WebKit dropping the IndexedDB connection, does.
  async function withCommitFailureOnce(fn) {
    const rp = IDBObjectStore.prototype.put; let left = 1;
    IDBObjectStore.prototype.put = function (v, k) {
      const req = rp.apply(this, arguments);
      if (k === 'deleted_ids' && left > 0) { left--; try { this.transaction.abort(); } catch (e) {} }
      return req;
    };
    try { return await fn(); } finally { IDBObjectStore.prototype.put = rp; }
  }
  const storedNames = async () => ((await rawIdbGet('metadata', 'saved_equipment')) || []).map(e => e && e.equipName);
  const otherTabClaims = () => { try { localStorage.setItem('loto_tab_claim', JSON.stringify({ id: 'TEST-OTHER-TAB', at: new Date().toISOString() })); } catch (e) {} };
  function releaseOtherTabClaim(had) {
    try { if (had === null) localStorage.removeItem('loto_tab_claim'); else localStorage.setItem('loto_tab_claim', had); } catch (e) {}
    try { _tabPaused = false; } catch (e) {}
    if (typeof claimThisTab === 'function') claimThisTab();
    const o = document.getElementById('tabPausedOverlay'); if (o) o.remove();
  }

  // T125 — b95 kept this session's deletes in memory (T124), but the durable
  // record of a delete whose localStorage write failed — the IndexedDB mirror
  // — was never read back: after a relaunch that couldn't read the store, the
  // first save merged the frozen emergency copy back in, and the unit came
  // back for good with its photos already erased
  async function t125_aDeleteStaysDeletedAcrossARelaunch() {
    const N = 'T125 a unit deleted while localStorage is full stays deleted after a relaunch (store unreadable at that launch)';
    await resetAppState();
    const A = mkEntry('Keep-125'), D = mkEntry('Gone-125');
    savedEquipment = [A, D]; saveAll(); await sleep(500);                 // store + emergency copy hold [A, D]
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'loto_deleted_ids' || k === 'loto_saved_snapshot' || k === 'loto_saved_snapshot_at') { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; throw e; }
      return si.call(this, k, v);
    };
    try {
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.id === D.id)); });
      await sleep(600);                                                   // the list write commits; localStorage didn't take the delete
    } finally { Storage.prototype.setItem = si; }
    const afterDelete = await storedNames();
    forgetSessionMemory();                                                // relaunch …
    await withUnreadable(['saved_equipment', 'saved_equipment_at', 'deleted_ids', 'restored_ids'], async () => { savedEquipment = []; await loadAll(); await sleep(200); });
    dropLoadBanners();
    savedEquipment.push(mkEntry('New-125')); saveAll(); await sleep(700); // … and the first save once the store answers again
    const stored = await storedNames(), mem = savedEquipment.map(e => e.equipName);
    record(N, !stored.includes('Gone-125') && !mem.includes('Gone-125') && stored.includes('Keep-125') && stored.includes('New-125'),
      'after the delete: ' + JSON.stringify(afterDelete) + '; after the relaunch and a save: stored=' + JSON.stringify(stored) + ', on screen=' + JSON.stringify(mem));
    _entryStoreUnread = false;
  }

  // T126 — the list save that failed at commit was re-run by withPhotoDB, but
  // its stamp had already been recorded: the retry "saw another writer" and
  // merged the tab's own older list back — deleting the newer copy of a unit
  // saved twice silently put that copy's content back
  async function t126_aFailedCommitNeverMergesTheTabsOwnOldList() {
    const N = 'T126 deleting one copy of a unit saved twice survives a failed commit + retry (the deleted copy never comes back)';
    await resetAppState();
    const A1 = mkEntry('Twin-126', { savedAt: new Date(Date.now() - 3600000).toISOString() }); A1.notes = 'kept-copy';
    const A2 = Object.assign(JSON.parse(JSON.stringify(A1)), { notes: 'deleted-copy', updatedAt: new Date(Date.now() - 60000).toISOString() });
    savedEquipment = [mkEntry('Other-126'), A1, A2]; saveAll(); await sleep(500);
    await withCommitFailureOnce(async () => {
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.indexOf(A2)); });
      await sleep(900);
    });
    const stored = ((await rawIdbGet('metadata', 'saved_equipment')) || []).filter(e => e && e.id === A1.id).map(e => e.notes);
    const mem = savedEquipment.filter(e => e.id === A1.id).map(e => e.notes);
    record(N, JSON.stringify(stored) === '["kept-copy"]' && JSON.stringify(mem) === '["kept-copy"]', 'stored copies=' + JSON.stringify(stored) + ', on screen=' + JSON.stringify(mem));
  }

  // T127 — same retry after a launch that couldn't read the store: the first
  // attempt merged the stored units into memory, the retry "merged nothing",
  // so the list, the header count and the emergency copy stayed on the
  // pre-merge list while the "units not shown" banner was taken down
  async function t127_aRetriedSaveStillShowsWhatItMerged() {
    const N = 'T127 after an unreadable launch, a save whose first commit fails still shows (and snapshots) the units it merged back';
    await resetAppState();
    savedEquipment = [mkEntry('A-127'), mkEntry('B-127'), mkEntry('C-127')]; saveAll(); await sleep(500);
    try { localStorage.removeItem('loto_saved_snapshot'); localStorage.removeItem('loto_saved_snapshot_at'); localStorage.setItem('loto_entry_count', '0'); } catch (e) {}
    forgetSessionMemory();
    await withUnreadable(['saved_equipment', 'saved_equipment_at', 'deleted_ids', 'restored_ids'], async () => { savedEquipment = []; await loadAll(); await sleep(200); });
    dropLoadBanners();
    await withCommitFailureOnce(async () => { fillForm('New-127'); performSaveAndNew(); await sleep(1000); });
    let snap = []; try { snap = JSON.parse(localStorage.getItem('loto_saved_snapshot') || '[]').map(e => e.equipName); } catch (e) {}
    const rows = document.querySelectorAll('#savedPanelBody .saved-item').length;
    const stored = await storedNames();
    record(N, snap.length === 4 && rows === 4 && stored.length === 4, 'stored=' + JSON.stringify(stored) + ', emergency copy=' + JSON.stringify(snap) + ', rows on screen=' + rows);
    _entryStoreUnread = false;
  }

  // T128 — b95's "superseded" marker also silenced the warning when the
  // alternate slot — where the unit now lives — couldn't be read: blank form,
  // no word, and the launch's own autosave wrote the blank over the unit
  async function t128_anUnreadableAlternateSlotIsNeverSilentOrOverwritten() {
    const N = 'T128 when neither unit-in-progress slot can be read, the launch warns and never autosaves over the unread copy';
    await resetAppState(); await clearWipSlots();
    const id = genUuid(), ago = (s) => new Date(Date.now() - s * 1000).toISOString();
    await rawIdbPut('metadata', 'current_wip', wipOf('Pump-128', id, { at: ago(300), notes: 'v0' }));
    localStorage.setItem('loto_current', JSON.stringify(wipOf('Pump-128', id, { at: ago(200), notes: 'v1' })));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('Pump-128', id, { at: ago(100), notes: 'v2-latest' }));
    localStorage.setItem('loto_wip_superseded', JSON.stringify({ at: ago(200), entryId: id }));
    let msgs = [];
    await withUnreadable(['current_wip', 'current_wip_alt'], async () => {
      msgs = await withToasts(async () => { savedEquipment = []; await loadAll(); await sleep(300); });
      autoSaveCurrent(); await sleep(400);                                // what init's first render does
    });
    const warned = !!document.getElementById('wipReadBanner') || msgs.some(m => /couldn.t read|could not read/i.test(m));
    const altNow = await rawIdbGet('metadata', 'current_wip_alt');
    dropLoadBanners();
    // … and a second launch that can read neither slot again still knows where the unit is
    let msgs2 = [];
    await withUnreadable(['current_wip', 'current_wip_alt'], async () => {
      msgs2 = await withToasts(async () => { savedEquipment = []; await loadAll(); await sleep(300); });
      autoSaveCurrent(); await sleep(400);
    });
    const warned2 = !!document.getElementById('wipReadBanner') || msgs2.some(m => /couldn.t read|could not read/i.test(m));
    const altNow2 = await rawIdbGet('metadata', 'current_wip_alt');
    dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(300);              // the next launch reads fine
    const notes = document.getElementById('equipNotes').value;
    record(N, warned && warned2 && !!altNow && altNow.notes === 'v2-latest' && !!altNow2 && altNow2.notes === 'v2-latest' && notes === 'v2-latest',
      'warned=' + warned + '/' + warned2 + ', unread copy after each launch autosave=' + JSON.stringify(altNow && altNow.notes) + '/' + JSON.stringify(altNow2 && altNow2.notes) + ', next launch shows=' + JSON.stringify(notes));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T129 — loadAll checked the claim BEFORE awaiting the unit-in-progress
  // reads; a tab that lost the claim during them still deleted the alternate
  // slot and rewrote current_wip after its recovered-draft save was refused
  async function t129_aTabThatLosesTheClaimMidLaunchLeavesBothSlots() {
    const N = 'T129 a tab that loses the claim while reading the unit in progress never drops the older unit';
    await resetAppState(); await clearWipSlots();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    await rawIdbPut('metadata', 'current_wip', wipOf('X-129', genUuid(), { at: new Date(Date.now() - 60000).toISOString() }));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('Y-129', genUuid()));
    let had = null; try { had = localStorage.getItem('loto_tab_claim'); } catch (e) {}
    const realGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) { if (k === 'current_wip_alt') otherTabClaims(); return realGet.apply(this, arguments); };
    try { savedEquipment = []; await loadAll(); await sleep(700); }
    finally { IDBObjectStore.prototype.get = realGet; releaseOtherTabClaim(had); }
    const list = await storedNames();
    const cw = await rawIdbGet('metadata', 'current_wip'), ca = await rawIdbGet('metadata', 'current_wip_alt');
    const durable = list.includes('X-129') || [cw, ca].some(w => w && w.equipName === 'X-129');
    record(N, durable, 'X is in: list=' + list.includes('X-129') + ', current_wip=' + (cw && cw.equipName) + ', current_wip_alt=' + (ca && ca.equipName));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T130 — deleteSaved erased the photos and wrote the tombstone before its
  // first claim check; the claim can move while its native confirm() is open
  async function t130_aDeleteConfirmedAfterTheClaimMovedChangesNothing() {
    const N = 'T130 a delete confirmed after another tab took the claim erases no photo and records no deletion';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    fillForm('Gone-130'); await captureInto('equip_main', await makePhotoFile('d130')); const E = saveEntry(); await sleep(400);
    const key = E.photos.equip_main.dbKey;
    let had = null; try { had = localStorage.getItem('loto_tab_claim'); } catch (e) {}
    try {
      await withDialogs({ confirm: () => { otherTabClaims(); return true; } }, async () => { deleteSaved(savedEquipment.findIndex(e => e.id === E.id)); });
      await sleep(500);
    } finally { releaseOtherTabClaim(had); }
    const bytes = await photoBytesExist(key);
    let tomb = {}; try { tomb = JSON.parse(localStorage.getItem('loto_deleted_ids') || '{}'); } catch (e) {}
    const list = await storedNames();
    record(N, bytes && !tomb[String(E.id)] && list.includes('Gone-130'), 'photo bytes kept=' + bytes + ', deletion recorded=' + !!tomb[String(E.id)] + ', still stored=' + list.includes('Gone-130'));
  }

  // T131 — the 20 s "storage is slow — keep working" launch: the guard meant
  // for it was unreachable, so the late load restored the stored unit over the
  // form in use and replaced units saved meanwhile with their stripped copy
  async function t131_aLateLaunchNeverOverwritesTheFormInUse() {
    const N = 'T131 a launch that finishes after the 20 s timeout keeps the form in use and the units saved meanwhile';
    await resetAppState(); await clearWipSlots();
    await rawIdbPut('metadata', 'current_wip', wipOf('U-131', genUuid(), { notes: 'stored' }));
    // saved during the slow window: full in memory, only the stripped emergency copy on disk
    const W = mkEntry('W-131'); W.sketch = { diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.4 }] }], labels: [] };
    const stripped = Object.assign({}, W); delete stripped.sketch;
    await rawIdbPut('metadata', 'saved_equipment', []);
    await rawIdbPut('metadata', 'saved_equipment_at', new Date(Date.now() - 120000).toISOString());
    try { localStorage.setItem('loto_saved_snapshot', JSON.stringify([stripped])); localStorage.setItem('loto_saved_snapshot_at', new Date().toISOString()); localStorage.setItem('loto_entry_count', '1'); } catch (e) {}
    forgetSessionMemory();
    _bootLoadTimedOut = true; _bootWipSettled = true; _wipUnread = true;   // what the 20 s timer does: the form is the tech's now
    savedEquipment = [W];
    fillForm('V-131'); document.getElementById('equipNotes').value = 'live';
    try { await loadAll(); await sleep(400); }
    finally { _bootLoadTimedOut = false; _bootWipSettled = true; }
    const name = document.getElementById('equipName').value, notes = document.getElementById('equipNotes').value;
    const w = savedEquipment.find(e => e.equipName === 'W-131');
    const u = savedEquipment.find(e => e.equipName === 'U-131');
    const wSketch = !!(w && w.sketch && (w.sketch.strokes || []).length === 1);
    record(N, name === 'V-131' && notes === 'live' && wSketch && !!u,
      'form=' + JSON.stringify(name) + '/' + JSON.stringify(notes) + ', unit saved meanwhile keeps its sketch=' + wSketch + ', stored unit kept as a recovered draft=' + !!u);
    _wipUnread = false;
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T132 — a stored copy of a SAVED unit written before that unit's last save
  // is not the unit in progress; the marker covered one path only and the
  // stale copy still reopened as an edit (export / Save & New then wrote it
  // over the newer save)
  async function t132_aStaleCopyOfASavedUnitNeverReopens() {
    const N = 'T132 a unit-in-progress copy older than the unit\'s last save never reopens as an edit of it';
    await resetAppState(); await clearWipSlots();
    const U = mkEntry('U-132', { savedAt: new Date(Date.now() - 3600000).toISOString() });
    U.updatedAt = new Date(Date.now() - 60000).toISOString(); U.notes = 'E2-saved';
    savedEquipment = [U]; saveAll(); await sleep(400);
    await rawIdbPut('metadata', 'current_wip', wipOf('U-132', U.id, { at: new Date(Date.now() - 600000).toISOString(), notes: 'E1-stale' }));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('', genUuid(), { sources: [], equipRoom: 'B100', equipBuilding: 'Main' }));
    savedEquipment = []; await loadAll(); await sleep(300);
    const notes = document.getElementById('equipNotes').value;
    record(N, !editingEntry && notes !== 'E1-stale', 'editing=' + !!editingEntry + ', form notes=' + JSON.stringify(notes));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T133 — after a launch that couldn't read the store, the entry count stayed
  // at its old maximum when the save's merge changed nothing (e.g. every unit
  // deleted): the next launch showed "device storage may have evicted data"
  async function t133_theEntryCountFollowsTheListAfterAnUnreadLaunch() {
    const N = 'T133 deleting every unit after an unreadable launch leaves no false "evicted data" warning';
    await resetAppState();
    savedEquipment = [mkEntry('A-133'), mkEntry('B-133'), mkEntry('C-133')]; saveAll(); await sleep(500);
    forgetSessionMemory();
    await withUnreadable(['saved_equipment', 'saved_equipment_at', 'deleted_ids', 'restored_ids'], async () => { savedEquipment = []; await loadAll(); await sleep(200); });
    dropLoadBanners();
    showBulkDeleteDialog();
    document.getElementById('bulkDeleteConfirmInput').value = 'DELETE';
    await withDialogs({ confirm: true }, async () => { confirmBulkDelete(); await sleep(800); });
    const count = (() => { try { return localStorage.getItem('loto_entry_count'); } catch (e) { return '?'; } })();
    dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
    const banner = document.getElementById('entryCountBanner');
    record(N, count === '0' && !banner, 'entry count after the delete=' + count + ', next launch warns of eviction=' + !!banner);
    dropLoadBanners(); _entryStoreUnread = false;
  }

  // T134 — found by build 96's fault campaign (the path exists since build
  // 91): an unsaved edit of saved unit X sat in the unreadable main slot, the
  // tech went on in the alternate slot and DELETED X (its photos erased). The
  // next healthy launch kept the older edit as a "recovered draft": the
  // deleted unit came back, pointing at photos that no longer exist
  async function t134_aUnitDeletedAfterItsStoredEditNeverComesBack() {
    const N = 'T134 a unit deleted after its unsaved edit was stored never comes back as a recovered draft';
    await resetAppState(); await clearWipSlots();
    fillForm('X-134'); await captureInto('equip_main', await makePhotoFile('x134')); const X = saveEntry(); await sleep(400);
    await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.id === X.id)); });
    await sleep(500);
    // the edit stored before the delete (the slot that launch couldn't read), and the unit in progress since
    await rawIdbPut('metadata', 'current_wip', wipOf('X-134', X.id, { at: new Date(Date.now() - 60000).toISOString(), notes: 'unsaved edit' }));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('Y-134', genUuid(), { at: new Date(Date.now() - 5000).toISOString() }));
    forgetSessionMemory();
    savedEquipment = []; await loadAll(); await sleep(600);
    const mem = savedEquipment.map(e => e.equipName), stored = await storedNames();
    const form = document.getElementById('equipName').value;
    record(N, !mem.includes('X-134') && !stored.includes('X-134') && form === 'Y-134',
      'on screen=' + JSON.stringify(mem) + ', stored=' + JSON.stringify(stored) + ', form=' + JSON.stringify(form));
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // ======================================================================
  // Build 97 — one test per low finding of the 2026-09-28 review of build 95
  // ======================================================================
  // T135 — Import → Replace kept the FIRST row of a unit saved twice and
  // closed the form holding the other one: the edit in progress was discarded
  // with no warning (b94 kept it — Save & New wrote it onto the kept row)
  async function t135_replaceKeepsTheEditOfATwinCopy() {
    const N = 'T135 Import → Replace keeps the edit of the other copy of a unit saved twice (the form moves to the copy that stays)';
    await resetAppState();
    const R1 = mkEntry('Twin-135'); R1.notes = 'copy one';
    const R2 = Object.assign(JSON.parse(JSON.stringify(R1)), { notes: 'copy two' });
    savedEquipment = [R1, R2]; saveAll(); await sleep(300);
    editSaved(1); await sleep(100);
    document.getElementById('equipNotes').value = 'edited-135';
    const file = new File([JSON.stringify({ version: 2, entries: [R1, mkEntry('Other-135')] })], 'b.json', { type: 'application/json' });
    await withDialogs({ confirm: true, choice: { 'backup-import': 'replace' } }, async () => {
      handleBackupFile({ target: { files: [file] } });
      await waitFor(() => savedEquipment.some(e => e.equipName === 'Other-135'), 8000, 'replace applied');
      await sleep(200);
    });
    const kept = document.getElementById('equipNotes').value === 'edited-135' && !!editingEntry && savedEquipment.includes(editingEntry);
    performSaveAndNew(); await sleep(500);
    const rows = savedEquipment.filter(e => e.id === R1.id).map(e => e.notes);
    record(N, kept && JSON.stringify(rows) === '["edited-135"]', 'edit kept after Replace=' + kept + ', that unit after Save & New=' + JSON.stringify(rows));
  }

  // T136 — another tab's launch took the claim between Save & New's check and
  // its list write: the write was refused, but the blank form still committed
  // over current_wip — the unit's only full copy — and the next launch had the
  // stripped emergency copy (no sketch)
  async function t136_aSaveCutShortByAnotherTabKeepsTheUnitWhole() {
    const N = 'T136 a Save & New cut short by another tab taking over keeps the unit whole (its sketch survives)';
    await resetAppState(); await clearWipSlots();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    fillForm('Sk-136');
    restoreSketch({ diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.6 }] }], labels: [] });
    autoSaveCurrent(); await sleep(400);
    let had = null; try { had = localStorage.getItem('loto_tab_claim'); } catch (e) {}
    const realGet = IDBObjectStore.prototype.get; let fired = false;
    IDBObjectStore.prototype.get = function (k) { if (k === 'saved_equipment_at' && !fired) { fired = true; otherTabClaims(); } return realGet.apply(this, arguments); };
    try { performSaveAndNew(); await sleep(800); }
    finally { IDBObjectStore.prototype.get = realGet; }
    const cw = await rawIdbGet('metadata', 'current_wip');
    releaseOtherTabClaim(had);                                             // … the other tab's launch
    forgetSessionMemory();
    savedEquipment = []; await loadAll(); await sleep(400);
    const u = savedEquipment.find(e => e.equipName === 'Sk-136');
    const sk = !!(u && u.sketch && (u.sketch.strokes || []).length === 1);
    record(N, !!cw && cw.equipName === 'Sk-136' && sk, 'current_wip after the cut-short save=' + JSON.stringify(cw && cw.equipName) + ', next launch lists it=' + !!u + ', with its sketch=' + sk);
    dropLoadBanners(); await clearWipSlots();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T137 — the "still writing photos" flag was never cleared when the page
  // went away and never refreshed while writing: a refresh right after a photo
  // held the next launch up to 60 s, and a copy running over 60 s could be
  // taken over mid-copy
  async function t137_thePhotoBusyFlagFollowsTheWritesItGuards() {
    const N = 'T137 the "still writing photos" flag is cleared when the page goes away, refreshed while writing, and a dead one stops blocking soon';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    const flag = () => { try { return JSON.parse(localStorage.getItem('loto_tab_busy') || 'null'); } catch (e) { return null; } };
    let t = startPhotoWrite('test-137');
    const set = !!flag();
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    const clearedOnHide = !flag();
    endPhotoWrite(t); await sleep(1700);
    t = startPhotoWrite('test-137b');
    const at1 = (flag() || {}).at || '';
    await sleep(6500);
    const at2 = (flag() || {}).at || '';
    endPhotoWrite(t); await sleep(1700);
    const refreshed = !!at1 && !!at2 && at2 > at1;
    try { localStorage.setItem('loto_tab_busy', JSON.stringify({ id: 'TEST-DEAD-TAB', at: new Date(Date.now() - 25000).toISOString() })); } catch (e) {}
    const deadBlocks = otherTabBusy();
    try { localStorage.removeItem('loto_tab_busy'); } catch (e) {}
    record(N, set && clearedOnHide && refreshed && !deadBlocks, 'flag set=' + set + ', cleared on pagehide=' + clearedOnHide + ', refreshed while writing=' + refreshed + ', a flag 25 s old still blocks=' + deadBlocks);
  }

  // T138 — marks placed with builds 92–94 carry no record of the shape they
  // were placed for, so b95's rule never cleared them when their source
  // became an In/Out pair: exported In/Out in tap order
  async function t138_legacyMarksAreClearedWhenTheSourceBecomesAnInOutPair() {
    const N = 'T138 marks saved by builds 92–94 are cleared when their source becomes an In/Out pair';
    await resetAppState();
    const E = mkEntry('Legacy-138', { sources: [Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', quantity: 2, sourceId: genUuid() })] });
    E.photos = { source_0: { dbKey: 'photo::' + E.id + '::' + E.sources[0].sourceId + '::a1b2c3d4', fileType: 'image/jpeg', timestamp: new Date().toISOString(),
      marks: [{ x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 }] } };                  // no marksFor: placed before build 95
    savedEquipment = [E]; saveAll(); await sleep(400);
    forgetSessionMemory();
    savedEquipment = []; await loadAll(); await sleep(300);              // relaunch with the new build
    editSaved(savedEquipment.findIndex(e => e.id === E.id)); await sleep(100);
    handleEnergySourceChange(0, 'HHW In/Out');
    const left = ((photos.source_0 || {}).marks || []).length;
    const exported = sourceMarksForExport({ sources: sources, photos: photos }, 0).length;
    record(N, left === 0 && exported === 0, 'marks left after the switch to HHW In/Out=' + left + ', exported=' + exported);
    clearForm(false);
  }

  // T139 — the "superseded" marker was written on the first alternate-slot
  // write whatever the form held: after a Save & New that failed everywhere,
  // the blank form's write marked the restored unit's stored copies
  // superseded (and Clear had removed its local copy) — the unit was gone
  async function t139_aRestoredUnitWhoseSaveFailedIsNeverMarkedSuperseded() {
    const N = 'T139 a unit restored from its local copy whose Save & New failed everywhere comes back at the next launch';
    await resetAppState(); await clearWipSlots();
    const id = genUuid(), ago = (s) => new Date(Date.now() - s * 1000).toISOString();
    await rawIdbPut('metadata', 'current_wip', wipOf('U-139', id, { at: ago(300), notes: 'v0' }));
    localStorage.setItem('loto_current', JSON.stringify(wipOf('U-139', id, { at: ago(200), notes: 'v1' })));
    await withUnreadable(['current_wip'], async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    dropLoadBanners();
    const restored = document.getElementById('equipNotes').value;
    const realW = writeEntryListMerged, si = Storage.prototype.setItem;
    writeEntryListMerged = () => Promise.reject(new Error('IndexedDB write failed (test)'));
    Storage.prototype.setItem = function (k, v) {
      if (/^loto_saved/.test(String(k))) { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; throw e; }
      return si.call(this, k, v);
    };
    try { await withDialogs({ confirm: true }, async () => { performSaveAndNew(); await sleep(900); }); }
    finally { writeEntryListMerged = realW; Storage.prototype.setItem = si; }
    const marker = localStorage.getItem('loto_wip_superseded');
    dropLoadBanners(); setStorageFailBanner(false);
    forgetSessionMemory(); _wipUnread = false;
    savedEquipment = []; await loadAll(); await sleep(300);              // the next launch reads fine
    const name = document.getElementById('equipName').value, notes = document.getElementById('equipNotes').value;
    const inList = savedEquipment.some(e => e.equipName === 'U-139');
    record(N, restored === 'v1' && ((name === 'U-139' && notes === 'v1') || inList),
      'restored at launch 1=' + JSON.stringify(restored) + ', marker after the failed save=' + JSON.stringify(marker) + ', next launch form=' + JSON.stringify(name + '/' + notes) + ', in the list=' + inList);
    await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T140 — Split's "Valve marks cleared" note was replaced in the same tick by
  // the 10-source heads-up, and a toast raised 1.9 s after another was hidden
  // at 2 s by the first one's timer
  async function t140_noWarningIsHiddenByTheNextMessage() {
    const N = 'T140 Split\'s "marks cleared" note stays visible with the 10-source heads-up, and a later toast gets its full time';
    await resetAppState();
    fillFormNoSources('Split-140');
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    for (let i = 1; i < 10; i++) sources.push(mkSrc('Electrical 480V'));
    renderSources();
    await captureInto('source_0', await makePhotoFile('s140'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.3, 0.5); tapMark(0.7, 0.5); clickById('valveMarkSave');
    await sleep(2300);                                                    // earlier toasts gone
    splitSource(0);
    const shown = (document.getElementById('toast') || {}).textContent || '';
    const marksNote = /valve marks cleared/i.test(shown), limitNote = /heads-up/i.test(shown);
    await sleep(2300);
    showToast('First toast (test)', true); await sleep(1900);
    showToast('Second toast (test)', true); await sleep(300);
    const el = document.getElementById('toast');
    const secondVisible = !!el && /\bshow\b/.test(el.className) && /Second toast/.test(el.textContent || '');
    record(N, marksNote && limitNote && secondVisible, 'after Split the toast reads ' + JSON.stringify(shown) + '; a toast raised 1.9 s after another is still visible 0.3 s later=' + secondVisible);
    await sleep(2300);
    clearForm(false);
  }

  // T141 — build 97's toast gave a multi-line message 4 s by counting
  // messages, not lines: Split's one three-line warning (marks cleared +
  // 10-source heads-up) was up for 2 s only
  async function t141_aMultiLineWarningGetsTheLongerTime() {
    const N = 'T141 a warning composed of several lines stays up for the longer time';
    await resetAppState();
    await sleep(2300);                                                    // earlier toasts gone
    showToast('Line one (test)\nLine two (test)\nLine three (test)', true);
    await sleep(2600);
    const el = document.getElementById('toast');
    const visible = !!el && /\bshow\b/.test(el.className) && /Line three/.test(el.textContent || '');
    record(N, visible, 'a three-line warning still visible after 2.6 s=' + visible);
    await sleep(1800);
  }

  // ======================================================================
  // Build 99 — the 2026-09-28 medium + high reviews of builds 96–98
  // ======================================================================
  // T142 — a re-save stamped while the device clock ran ahead outranked every
  // later delete of that unit: it stayed "re-saved" and any stored copy
  // brought it back
  async function t142_aDeleteAfterAFutureStampedReSaveStillDeletes() {
    const N = 'T142 a delete after a re-save stamped by a clock that ran ahead still deletes the unit';
    await resetAppState();
    const X = mkEntry('Skew-142');
    savedEquipment = [mkEntry('Keep-142'), X]; saveAll(); await sleep(400);
    try {
      const del = JSON.parse(localStorage.getItem('loto_deleted_ids') || '{}'), res = JSON.parse(localStorage.getItem('loto_restored_ids') || '{}');
      del[X.id] = new Date(Date.now() - 3600000).toISOString();         // deleted once …
      res[X.id] = new Date(Date.now() + 86400000).toISOString();        // … re-saved while the clock was a day ahead
      localStorage.setItem('loto_deleted_ids', JSON.stringify(del)); localStorage.setItem('loto_restored_ids', JSON.stringify(res));
    } catch (e) {}
    await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.id === X.id)); });   // clock right again
    await sleep(500);
    const dead = !!getTombstones()[String(X.id)];
    const back = mergeEntryCopies([], [[X]], getTombstones()).list.some(e => e.id === X.id);   // a stale copy that still lists it
    record(N, dead && !back, 'delete recorded as the latest event=' + dead + ', a stale copy brings it back=' + back);
  }

  // T143 — the 20 s late-launch path made the recovered draft from the MAIN
  // slot first; a newer copy of the same unit in the alternate slot was then
  // refused (its id taken) and dropped without a word
  async function t143_aLateLaunchKeepsTheNewerCopyOfAUnit() {
    const N = 'T143 a launch that finishes after the timeout keeps the NEWER of two stored copies of the same unit';
    await resetAppState(); await clearWipSlots();
    // Both copies are from an EARLIER session: timed before this page loaded
    // (build 109 — "300 s ago" was this session's own copy once the page had
    // been open over 5 minutes, and the test failed on a second run).
    const base = Date.parse(PAGE_LOADED_AT) || Date.now();
    const id = genUuid(), ago = (s) => new Date(base - s * 1000).toISOString();
    await rawIdbPut('metadata', 'current_wip', wipOf('U-143', id, { at: ago(600), notes: 'old' }));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('U-143', id, { at: ago(300), notes: 'new' }));
    forgetSessionMemory();
    _bootLoadTimedOut = true; _bootWipSettled = true; _wipUnread = true;   // the form is the tech's; nothing typed yet
    try { savedEquipment = []; await loadAll(); await sleep(500); }
    finally { _bootLoadTimedOut = false; }
    const rows = savedEquipment.filter(e => sameEntryId(e.id, id)).map(e => e.notes);
    record(N, JSON.stringify(rows) === '["new"]', 'recovered copies of that unit=' + JSON.stringify(rows));
    _wipUnread = false; await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T144 — the launch stored the snapshot-only unit (sketch filled in as none)
  // BEFORE the unit-in-progress section gave its sketch back; the second save
  // failing left the sketch recorded as "none" for good
  async function t144_aSketchRestoredAtLaunchIsSavedWithTheUnit() {
    const N = 'T144 a sketch the launch restores to a unit that exists only as the emergency copy is stored in the same save';
    await resetAppState(); await clearWipSlots();
    const X = mkEntry('Snap-144');
    X.sketch = { diagramKey: 'general', strokes: [{ color: '#f00', width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.6 }] }], labels: [] };
    X.savedAt = X.updatedAt = new Date(Date.now() - 60000).toISOString();
    const stripped = Object.assign({}, X); delete stripped.sketch;
    await rawIdbPut('metadata', 'saved_equipment', []);
    await rawIdbPut('metadata', 'saved_equipment_at', new Date(Date.now() - 120000).toISOString());
    try { localStorage.setItem('loto_saved_snapshot', JSON.stringify([stripped])); localStorage.setItem('loto_saved_snapshot_at', X.savedAt); } catch (e) {}
    await rawIdbPut('metadata', 'current_wip', wipOf('Snap-144', X.id, { at: new Date(Date.now() - 90000).toISOString(), sketch: X.sketch }));
    forgetSessionMemory();
    const real = writeEntryListMerged; let calls = 0;
    writeEntryListMerged = function () { calls++; return calls === 1 ? real.apply(this, arguments) : Promise.reject(new Error('IndexedDB write failed (test)')); };
    try { savedEquipment = []; await loadAll(); await sleep(800); }
    finally { writeEntryListMerged = real; }
    const stored = ((await rawIdbGet('metadata', 'saved_equipment')) || []).find(e => e && e.id === X.id);
    const sk = !!(stored && stored.sketch && (stored.sketch.strokes || []).length === 1);
    record(N, sk, 'the stored copy has its sketch=' + sk + ' (list writes: ' + calls + ')');
    dropLoadBanners(); setStorageFailBanner(false);
    try { localStorage.removeItem('loto_saved'); localStorage.removeItem('loto_saved_at'); localStorage.removeItem('loto_saved_deleted'); } catch (e) {}
    await clearWipSlots(); savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T145 — Import → Replace kept the FIRST row of a unit saved twice, not the
  // newest: the newer copy's content left the list without a word
  async function t145_replaceKeepsTheNewerCopyOfATwin() {
    const N = 'T145 Import → Replace keeps the newer copy of a unit saved twice';
    await resetAppState();
    const R1 = mkEntry('Twin-145', { savedAt: new Date(Date.now() - 7200000).toISOString() }); R1.notes = 'older copy';
    const R2 = Object.assign(JSON.parse(JSON.stringify(R1)), { notes: 'newer copy', updatedAt: new Date(Date.now() - 60000).toISOString() });
    savedEquipment = [R1, R2]; saveAll(); await sleep(300);
    const file = new File([JSON.stringify({ version: 2, entries: [R1, mkEntry('Other-145')] })], 'b.json', { type: 'application/json' });
    await withDialogs({ confirm: true, choice: { 'backup-import': 'replace' } }, async () => {
      handleBackupFile({ target: { files: [file] } });
      await waitFor(() => savedEquipment.some(e => e.equipName === 'Other-145'), 8000, 'replace applied');
      await sleep(200);
    });
    const rows = savedEquipment.filter(e => e.id === R1.id).map(e => e.notes);
    record(N, JSON.stringify(rows) === '["newer copy"]', 'kept=' + JSON.stringify(rows));
  }

  // T146 — after the 20 s timeout the form kept autosaving into the alternate
  // slot even when that slot couldn't be read — over whatever it held — and
  // the launch said nothing
  async function t146_aLateLaunchNeverAutosavesOverAnUnreadableAlternateSlot() {
    const N = 'T146 after the 20 s timeout, an unreadable alternate slot is never autosaved over, and the launch says so';
    await resetAppState(); await clearWipSlots();
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('Unread-146', genUuid(), { at: new Date(Date.now() - 300000).toISOString(), notes: 'kept' }));
    forgetSessionMemory();
    _bootLoadTimedOut = true; _bootWipSettled = true; _wipUnread = true;
    let msgs = [];
    try {
      await withUnreadable(['current_wip_alt'], async () => {
        msgs = await withToasts(async () => { savedEquipment = []; await loadAll(); await sleep(400); });
        fillForm('Live-146'); autoSaveCurrent(); await sleep(500);
      });
    } finally { _bootLoadTimedOut = false; }
    const alt = await rawIdbGet('metadata', 'current_wip_alt');
    const warned = !!document.getElementById('wipReadBanner') || msgs.some(m => /couldn.t (be )?read/i.test(m));
    record(N, !!alt && alt.notes === 'kept' && warned, 'unread copy after the form autosaved=' + JSON.stringify(alt && alt.notes) + ', warned=' + warned);
    _wipUnread = false; await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T147 — the build-94 channel: an old tab's launch "hello" is answered with
  // "live"; after an old tab releases, a form nobody has written since this
  // launch is reloaded from storage (the old tab's final autosave) instead of
  // written over it; a form the tech has worked on goes back over it
  async function t147_theBuild94ChannelAnswersAndHandsTheFormBack() {
    const N = 'T147 a build-94 tab\'s hello is answered "live"; after it releases, an untouched form reloads its last save and a worked-on form is written back';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tabs');
    if (typeof BroadcastChannel !== 'function') return record(N, true, 'no BroadcastChannel');
    const ch = new BroadcastChannel('loto-collector-tabs'); const got = [];
    ch.onmessage = (ev) => got.push(ev.data || {});
    ch.postMessage({ t: 'hello', from: 'OLD-TAB-147', since: 0 });
    await sleep(400);
    const answered = got.some(m => m && m.t === 'live' && m.to === 'OLD-TAB-147');
    const realReload = window.reloadFromStorage; let reloads = 0;
    window.reloadFromStorage = () => { reloads++; };                      // the real one reloads the page
    let untouchedOk = false, touchedOk = false;
    try {
      await rawIdbPut('metadata', 'current_wip', wipOf('Flushed-147', genUuid(), { notes: 'final keystrokes' }));
      try { _wipWrittenSinceBoot = false; _bootWipJson = wipJson(buildWipState()); } catch (e) {}   // the launch just finished: nothing changed or written since
      ch.postMessage({ t: 'released', from: 'OLD-TAB-147', to: TAB_ID });
      await sleep(500);
      const cw = await rawIdbGet('metadata', 'current_wip');
      untouchedOk = reloads === 1 && !!cw && cw.notes === 'final keystrokes';
      fillForm('Mine-147'); autoSaveCurrent(); await sleep(300);           // the tech works here
      ch.postMessage({ t: 'released', from: 'OLD-TAB-147', to: TAB_ID });
      await sleep(500);
      const cw2 = await rawIdbGet('metadata', 'current_wip');
      touchedOk = reloads === 1 && !!cw2 && cw2.equipName === 'Mine-147';
    } finally { window.reloadFromStorage = realReload; ch.close(); }
    record(N, answered && untouchedOk && touchedOk, 'hello answered=' + answered + ', untouched form reloaded (old tab\'s save kept)=' + untouchedOk + ', worked-on form written back=' + touchedOk);
    await clearWipSlots();
  }

  // T148 — a launch waited up to 10 min behind another tab's photo writes with
  // no way out; and it knew them only by a localStorage flag, never by a lock
  // the browser lets go of when that tab closes or crashes
  async function t148_waitingForAnotherTabsPhotosHasAWayOut() {
    const N = 'T148 a launch waiting for another tab\'s photos can be opened anyway, and waits on a Web Lock that tab holds';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tabs');
    if (typeof waitForOtherTabsPhotos !== 'function') return record(N, false, 'no waitForOtherTabsPhotos: the launch waits with no way out');
    const beat = () => { try { localStorage.setItem('loto_tab_busy', JSON.stringify({ id: 'OTHER-148', at: new Date().toISOString() })); } catch (e) {} };
    beat(); const iv = setInterval(beat, 2000);
    let resolvedA = false, btn = null;
    try {
      waitForOtherTabsPhotos({ openAnywayAfterMs: 400 }).then(() => { resolvedA = true; });
      await sleep(800);
      btn = [...document.querySelectorAll('#tabPausedOverlay button')].find(b => /open anyway/i.test(b.textContent || ''));
      if (btn) btn.click();
      await sleep(500);
    } finally { clearInterval(iv); try { localStorage.removeItem('loto_tab_busy'); } catch (e) {} }
    let lockOk = true, lockDetail = 'no Web Locks here';
    if (navigator.locks && navigator.locks.request) {
      let release = null;
      await new Promise(r => { navigator.locks.request('loto-photo-writes', () => new Promise(res => { release = res; r(); })); });
      let resolvedB = false;
      waitForOtherTabsPhotos({ openAnywayAfterMs: 60000 }).then(() => { resolvedB = true; });
      await sleep(900);
      const waited = !resolvedB;
      release(); await sleep(900);
      lockOk = waited && resolvedB; lockDetail = 'waited while the lock was held=' + waited + ', opened once released=' + resolvedB;
    }
    hideTabOverlay();
    record(N, !!btn && resolvedA && lockOk, '"Open anyway" offered=' + !!btn + ', it opened the tab=' + resolvedA + '; ' + lockDetail);
  }

  // T149 — the deleted / re-saved records were read in the same transaction
  // as the list: one unreadable record made the whole list "unreadable" at
  // every launch, and every save went to the localStorage fallback
  async function t149_anUnreadableDeleteRecordNeverHidesTheList() {
    const N = 'T149 an unreadable deleted / re-saved record never makes the saved list unreadable or pushes saves off the store';
    await resetAppState();
    const A = mkEntry('A-149'); A.sketch = { diagramKey: 'general', strokes: [{ color: '#00f', width: 3, points: [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }] }], labels: [] };
    savedEquipment = [A, mkEntry('B-149')]; saveAll(); await sleep(400);
    forgetSessionMemory();
    let banner = true;
    await withUnreadable(['deleted_ids', 'restored_ids'], async () => {
      savedEquipment = []; await loadAll(); await sleep(200);
      banner = !!document.getElementById('entryStoreBanner');
      _entryStoreAt = 'another-writer-149';                               // a save that has to merge the store first
      savedEquipment.push(mkEntry('C-149')); await saveAll(); await sleep(300);
    });
    const stored = await storedNames();
    const fallback = (() => { try { return localStorage.getItem('loto_saved'); } catch (e) { return 'x'; } })();
    const a = savedEquipment.find(e => e.equipName === 'A-149');
    record(N, !banner && stored.includes('C-149') && !fallback && !!(a && a.sketch),
      'list shown as unreadable=' + banner + ', stored=' + JSON.stringify(stored) + ', went to the fallback=' + !!fallback + ', A keeps its sketch=' + !!(a && a.sketch));
    dropLoadBanners(); _entryStoreUnread = false;
    try { localStorage.removeItem('loto_saved'); localStorage.removeItem('loto_saved_at'); localStorage.removeItem('loto_saved_deleted'); } catch (e) {}
  }

  // T150 — the localStorage fallback carried the whole delete history in the
  // same write as the list, the write that runs when storage is near full
  async function t150_theFallbackCarriesOnlyTheDeletesTheStoreLacks() {
    const N = 'T150 the localStorage fallback carries the deletes the store hasn\'t recorded, not the whole history';
    await resetAppState();
    const old = {}, t0 = new Date(Date.now() - 30 * 86400000).toISOString();
    for (let i = 0; i < 2000; i++) old['old-150-' + i] = t0;
    try { localStorage.setItem('loto_deleted_ids', JSON.stringify(old)); } catch (e) {}
    savedEquipment = [mkEntry('Keep-150'), mkEntry('Gone-150')]; saveAll(); await sleep(500);   // the store has them all
    const gone = savedEquipment.find(e => e.equipName === 'Gone-150');
    const real = writeEntryListMerged;
    writeEntryListMerged = () => Promise.reject(new Error('IndexedDB write failed (test)'));
    try { await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.indexOf(gone)); await sleep(500); }); }
    finally { writeEntryListMerged = real; }
    const side = readLsJson('loto_saved_deleted'), obj = readLsJson('loto_saved');
    const del = (side && side.deleted) || (obj && !Array.isArray(obj) && obj.deleted) || {};
    const n = Object.keys(del).length;
    record(N, !!del[gone.id] && n < 50, 'the fallback carries the new delete=' + !!del[gone.id] + ', deletes carried=' + n);
    setStorageFailBanner(false);
    try { ['loto_saved', 'loto_saved_at', 'loto_saved_deleted', 'loto_deleted_ids'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  // T151 — the photo-hash index is read-modify-write, and the claim was
  // checked before the write was queued, not when it ran: a tab that lost the
  // claim in between wrote its stale index over the live tab's
  async function t151_theHashIndexIsNeverWrittenAfterTheClaimMoved() {
    const N = 'T151 a photo-hash record is never written by a tab that lost the claim before the write ran';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tab claim');
    await saveMetadata('photo_hash_index', {}); await sleep(300);
    let had = null; try { had = localStorage.getItem('loto_tab_claim'); } catch (e) {}
    const realTx = IDBDatabase.prototype.transaction; let armed = true;
    IDBDatabase.prototype.transaction = function (names, mode) {
      if (armed && mode === 'readwrite' && [].concat(names).includes('metadata')) { armed = false; otherTabClaims(); }
      return realTx.apply(this, arguments);
    };
    try { await recordPhotoHash('hash-151', 'entry-151', 'photo::entry-151::main::x151', false); await sleep(200); }
    finally { IDBDatabase.prototype.transaction = realTx; releaseOtherTabClaim(had); }
    const idx = (await rawIdbGet('metadata', 'photo_hash_index')) || {};
    record(N, !idx['hash-151'], 'record written by the tab that lost the claim=' + !!idx['hash-151']);
  }

  // T152 — build 96 made the fallback list an object ({list, deleted,
  // restored}); builds up to 95 read only a list, so installing an older build
  // dropped every unit that lived only in the fallback
  async function t152_theFallbackListStaysAPlainList() {
    const N = 'T152 the localStorage fallback stays a plain list older builds read, and a delete saved with it still holds at the next launch';
    await resetAppState();
    savedEquipment = [mkEntry('Keep-152'), mkEntry('Gone-152')]; saveAll(); await sleep(400);
    const gone = savedEquipment.find(e => e.equipName === 'Gone-152');
    const realW = writeEntryListMerged, si = Storage.prototype.setItem;
    writeEntryListMerged = () => Promise.reject(new Error('IndexedDB write failed (test)'));
    Storage.prototype.setItem = function (k, v) {
      if (k === 'loto_deleted_ids') { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; throw e; }
      return si.call(this, k, v);
    };
    try { await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.indexOf(gone)); await sleep(500); }); }
    finally { writeEntryListMerged = realW; Storage.prototype.setItem = si; }
    const raw = readLsJson('loto_saved');
    const plain = Array.isArray(raw) && raw.some(e => e && e.equipName === 'Keep-152') && !raw.some(e => e && e.equipName === 'Gone-152');
    forgetSessionMemory();
    savedEquipment = []; await loadAll(); await sleep(300);              // the store still lists it; only the fallback knows
    const back = savedEquipment.some(e => e.equipName === 'Gone-152');
    record(N, plain && !back, 'fallback is a plain list=' + plain + ', deleted unit back at the next launch=' + back);
    setStorageFailBanner(false); dropLoadBanners();
    try { ['loto_saved', 'loto_saved_at', 'loto_saved_deleted'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  // T153 — build 97/98's toast kept a warning only for 0.6 s: a message 0.8 s
  // later still replaced it before its time was up
  async function t153_aWarningIsNeverReplacedBeforeItsTime() {
    const N = 'T153 a warning is never replaced by a message that comes before its time is up';
    await resetAppState();
    await sleep(2300);
    showToast('Warning first (test)', true); await sleep(800);
    showToast('Info later (test)'); await sleep(100);
    const el = document.getElementById('toast');
    const both = !!el && /Warning first/.test(el.textContent || '') && /Info later/.test(el.textContent || '');
    record(N, both, 'toast reads ' + JSON.stringify(el && el.textContent));
    await sleep(4300);
  }

  // T154 — found by build 99's fault campaign (seed 99611; the path exists
  // since build 89): when a later write of the localStorage fallback failed,
  // the fallback that was already there was removed with it — even the list
  // just written, when only its timestamp failed — and a unit whose store and
  // emergency-copy writes had failed too was gone at the next launch
  async function t154_aFailedFallbackWriteNeverRemovesTheUnitsItHolds() {
    const N = 'T154 a fallback write that fails part-way never removes units that live only in the fallback';
    await resetAppState();
    savedEquipment = [mkEntry('Keep-154')]; saveAll(); await sleep(400);
    const realW = writeEntryListMerged, si = Storage.prototype.setItem;
    const quota = () => { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; return e; };
    writeEntryListMerged = () => Promise.reject(new Error('IndexedDB write failed (test)'));
    let failKeys = [];
    Storage.prototype.setItem = function (k, v) { if (failKeys.includes(k)) throw quota(); return si.call(this, k, v); };
    try {
      // (a) only the fallback's timestamp can't be written: U1 lives only in the fallback list
      failKeys = ['loto_saved_snapshot', 'loto_saved_snapshot_at', 'loto_saved_at'];
      savedEquipment.push(mkEntry('U1-154')); await saveAll(); await sleep(200);
      // (b) the next fallback can't even take the list: the one already there still holds U1
      failKeys = ['loto_saved_snapshot', 'loto_saved_snapshot_at', 'loto_saved'];
      savedEquipment.push(mkEntry('U2-154')); await saveAll(); await sleep(200);
    } finally { writeEntryListMerged = realW; Storage.prototype.setItem = si; }
    const kept = Array.isArray(readLsJson('loto_saved')) && readLsJson('loto_saved').some(e => e && e.equipName === 'U1-154');
    forgetSessionMemory();
    savedEquipment = []; await loadAll(); await sleep(300);              // the next launch
    const back = savedEquipment.some(e => e.equipName === 'U1-154');
    record(N, kept && back, 'U1 still in the fallback after the failed writes=' + kept + ', U1 at the next launch=' + back);
    setStorageFailBanner(false); dropLoadBanners();
    try { ['loto_saved', 'loto_saved_at', 'loto_saved_deleted'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  // T155 — found while finishing build 99 (its T149 change reads the re-save
  // record on its own): a launch that couldn't read that record let an older
  // delete win again. A unit deleted and then saved again while localStorage
  // was full — the re-save recorded only in the store — vanished at that
  // launch without a word, and the next save made it permanent
  async function t155_aReSavedUnitSurvivesALaunchThatCantReadItsReSaveRecord() {
    const N = 'T155 a unit deleted and saved again survives a launch (or a merging save) that can\'t read its re-save record';
    const setUp = async (tag) => {
      await resetAppState();
      savedEquipment = [mkEntry('U-' + tag), mkEntry('Other-' + tag)]; saveAll(); await sleep(400);
      const u = savedEquipment.find(e => e.equipName === 'U-' + tag);
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.indexOf(u)); await sleep(400); });
      // saved again while localStorage is full: only the store records the re-save
      const si = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === 'loto_deleted_ids' || k === 'loto_restored_ids') { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; throw e; }
        return si.call(this, k, v);
      };
      try { clearTombstones([u.id]); savedEquipment.push(Object.assign({}, u, { updatedAt: new Date().toISOString() })); await saveAll(); await sleep(300); }
      finally { Storage.prototype.setItem = si; }
      forgetSessionMemory();
    };
    const relaunch = async () => { forgetSessionMemory(); savedEquipment = []; await loadAll(); await sleep(300); return savedEquipment.map(e => e.equipName); };
    // (a) the launch can't read the re-save record; the tech saves again
    await setUp('155');
    let first = [];
    await withUnreadable(['restored_ids'], async () => {
      savedEquipment = []; await loadAll(); await sleep(300);
      first = savedEquipment.map(e => e.equipName);
      savedEquipment.push(mkEntry('Next-155')); await saveAll(); await sleep(300);
    });
    const later = await relaunch();                                              // a later, healthy launch
    // (b) the launch couldn't read the list either: the first save merges the
    // store — and can't read the re-save record
    await setUp('155b');
    await withUnreadable(['saved_equipment', 'restored_ids'], async () => { savedEquipment = []; await loadAll(); await sleep(300); });
    await withUnreadable(['restored_ids'], async () => { savedEquipment.push(mkEntry('Next-155b')); await saveAll(); await sleep(300); });
    const merged = await relaunch();
    record(N, first.includes('U-155') && later.includes('U-155') && merged.includes('U-155b'),
      '(a) at the launch that couldn\'t read it: ' + JSON.stringify(first) + ', at the next: ' + JSON.stringify(later) + '; (b) after the merging save: ' + JSON.stringify(merged));
    dropLoadBanners(); _entryStoreUnread = false;
  }

  // T156 — build 99's late launch: with the alternate slot unreadable (or
  // holding an edit left for later) and the main slot's unit kept as a
  // recovered draft, the form autosaved into the alternate slot until that
  // draft's save landed — and for the rest of the session when it failed
  async function t156_aLateLaunchWaitsForTheKeptUnitBeforeItsSlotTakesTheForm() {
    const N = 'T156 after the 20 s timeout, the form never goes over an unreadable alternate slot, nor over the main slot\'s kept unit before that unit is saved';
    await resetAppState(); await clearWipSlots();
    const mId = genUuid();
    await rawIdbPut('metadata', 'current_wip', wipOf('Main-156', mId, { at: new Date(Date.now() - 600000).toISOString(), notes: 'main unit' }));
    await rawIdbPut('metadata', 'current_wip_alt', wipOf('Unread-156', genUuid(), { at: new Date(Date.now() - 300000).toISOString(), notes: 'kept' }));
    forgetSessionMemory();
    const realW = writeEntryListMerged, si = Storage.prototype.setItem;
    const quota = () => { const e = new Error('QuotaExceededError (test)'); e.name = 'QuotaExceededError'; return e; };
    writeEntryListMerged = () => Promise.reject(new Error('IndexedDB write failed (test)'));   // the launch's save fails everywhere
    Storage.prototype.setItem = function (k, v) { if (k === 'loto_saved_deleted' || k === 'loto_saved') throw quota(); return si.call(this, k, v); };
    _bootLoadTimedOut = true; _bootWipSettled = true; _wipUnread = true;   // what the 20 s timer does
    let during = null;
    try {
      await withUnreadable(['current_wip_alt'], async () => { savedEquipment = []; await loadAll(); await sleep(400); });
      fillForm('Live-156'); autoSaveCurrent(); await sleep(500);
      during = { alt: await rawIdbGet('metadata', 'current_wip_alt'), main: await rawIdbGet('metadata', 'current_wip') };
    } finally { writeEntryListMerged = realW; Storage.prototype.setItem = si; _bootLoadTimedOut = false; }
    // storage is back: the next autosave retries the list save, which lands
    try { _wipHoldRetryAt = 0; } catch (e) {}                            // (its retry is due)
    autoSaveCurrent(); await sleep(800);
    const alt = await rawIdbGet('metadata', 'current_wip_alt'), main = await rawIdbGet('metadata', 'current_wip');
    const kept = savedEquipment.some(e => sameEntryId(e.id, mId));
    const okDuring = !!during.alt && during.alt.notes === 'kept' && !!during.main && during.main.notes === 'main unit';
    const okAfter = !!alt && alt.notes === 'kept' && !!main && main.equipName === 'Live-156' && kept;
    record(N, okDuring && okAfter, 'while its save was failing: alternate=' + JSON.stringify(during.alt && during.alt.notes) + ', main=' + JSON.stringify(during.main && (during.main.notes || during.main.equipName)) +
      '; once saved: alternate=' + JSON.stringify(alt && alt.notes) + ', main=' + JSON.stringify(main && main.equipName) + ', kept unit in the list=' + kept);
    setStorageFailBanner(false); _wipUnread = false; await clearWipSlots(); dropLoadBanners();
    savedEquipment = []; await loadAll(); await sleep(200);
  }

  // T157 — build 99 reloaded this tab when a build-94 tab released whenever no
  // autosave had been WRITTEN since launch: a change still waiting on its
  // autosave (or with its write in flight) was reloaded away
  async function t157_aChangeNotYetAutosavedIsNeverReloadedAway() {
    const N = 'T157 when a build-94 tab releases, a form changed since launch is written back, not reloaded away — even before its autosave has landed';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tabs');
    if (typeof BroadcastChannel !== 'function') return record(N, true, 'no BroadcastChannel');
    const ch = new BroadcastChannel('loto-collector-tabs');
    const realReload = window.reloadFromStorage; let reloads = 0;
    window.reloadFromStorage = () => { reloads++; };                      // the real one reloads the page
    let cw = null;
    try {
      await rawIdbPut('metadata', 'current_wip', wipOf('Old-157', genUuid(), { notes: 'old tab' }));
      try { _wipWrittenSinceBoot = false; _bootWipJson = wipJson(buildWipState()); } catch (e) {}   // the launch just finished
      document.getElementById('equipName').value = 'Typed-157';          // typed; its autosave hasn't run yet
      ch.postMessage({ t: 'released', from: 'OLD-TAB-157', to: TAB_ID });
      await sleep(500);
      cw = await rawIdbGet('metadata', 'current_wip');
    } finally { window.reloadFromStorage = realReload; ch.close(); }
    record(N, reloads === 0 && !!cw && cw.equipName === 'Typed-157', 'reloaded=' + reloads + ', stored form=' + JSON.stringify(cw && cw.equipName));
    document.getElementById('equipName').value = ''; await clearWipSlots();
  }

  // ---------- SharePoint live backup (build 101) --------------------------------
  // A stand-in for the backup API and SharePoint: keeps every file it is sent
  // and answers as the real API does — the SHA-256 of the bytes it got, their
  // size; an upload session that takes chunks and reports the finished file's
  // size and QuickXorHash — unless told to misbehave.
  function backupStub(opts) {
    opts = opts || {};
    if (!window.__realBackupTransport) window.__realBackupTransport = { api: backupTransport.api, session: backupTransport.session };
    const files = new Map(), posts = [], sessions = new Map(), overwrites = [];
    backupTransport.api = async (method, path, body) => {
      posts.push({ method, path, folder: body && body.folder, file: body && body.path });
      if (opts.offline) throw new Error('offline (test)');
      if (opts.status) return { status: opts.status, body: { ok: false, error: 'test ' + opts.status } };
      if (path === '/api/upload' && method === 'GET') return { status: 200, body: { ok: true, configured: true, signedInAs: 'tech@hgsengineeringinc.com', targets: [{ key: 'default', label: 'LOTO Backups', root: 'LOTO Backups' }] } };
      if (path === '/api/upload') {
        const bytes = base64ToUint8Array(body.contentBase64);
        const sha = await sha256HexOfBytes(bytes);
        if (body.sha256 !== sha) return { status: 400, body: { ok: false, error: 'damaged on the way (test)' } };
        if (opts.refuse && opts.refuse(body)) return { status: 502, body: { ok: false, error: 'SharePoint refused the file (test)' } };
        // write-once, like the API (build 102): a name that exists is never replaced
        const had = files.get(body.folder + '/' + body.path);
        if (had) {
          const same = had.bytes.length === bytes.length && had.bytes.every((x, i) => x === bytes[i]);
          overwrites.push({ path: body.folder + '/' + body.path, same });
          return same ? { status: 200, body: { ok: true, alreadyThere: true, size: bytes.length, sha256: sha } }
                      : { status: 502, body: { ok: false, error: 'SharePoint already holds a different file (test)' } };
        }
        files.set(body.folder + '/' + body.path, { bytes, text: /json|csv|text/.test(body.contentType) ? new TextDecoder().decode(bytes) : null });
        if (opts.lose && opts.lose(body)) throw new Error('the answer was lost (test)');   // stored — the device never hears
        return { status: 200, body: { ok: true, size: opts.shortSize ? bytes.length - 1 : bytes.length, sha256: opts.wrongSha ? '0'.repeat(64) : sha } };
      }
      if (path === '/api/upload-session') {
        if (opts.sessionStatus) return { status: opts.sessionStatus, body: { ok: false, error: 'test ' + opts.sessionStatus } };
        if (files.has(body.folder + '/' + body.path)) {   // write-once: SharePoint refuses the session (the API answers 502)
          overwrites.push({ path: body.folder + '/' + body.path, same: false, session: true });
          return { status: 502, body: { ok: false, error: 'SharePoint already holds a file with that name (test)' } };
        }
        const url = 'stub://session/' + (sessions.size + 1);
        sessions.set(url, { folder: body.folder, path: body.path, size: body.size, buf: new Uint8Array(body.size), got: 0, puts: 0 });
        return { status: 200, body: { ok: true, uploadUrl: url } };
      }
      if (path === '/api/device-pass') {
        if (!opts.verifier || body.verifier !== opts.verifier) return { status: 401, body: { ok: false, error: 'that sign-in did not come from this device (test)' } };
        return { status: 200, body: { ok: true, pass: 'v1.test.pass', user: 'tech@hgsengineeringinc.com', expires: new Date(Date.now() + 30 * 86400000).toISOString() } };
      }
      return { status: 404, body: { ok: false } };
    };
    backupTransport.session = async (url, method, bytes, range) => {
      const s = sessions.get(url);
      if (!s) return { status: 404, body: {} };
      if (method === 'GET') return { status: 200, body: { nextExpectedRanges: [s.got + '-'] } };
      s.puts++;
      const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range), from = +m[1], to = +m[2];
      if (opts.dropPut && opts.dropPut(s.puts)) throw new Error('connection lost (test)');   // the piece never landed
      if (from !== s.got) return { status: 416, body: {} };
      s.buf.set(bytes, from); s.got = to + 1;
      if (s.got < s.size) return { status: 202, body: { nextExpectedRanges: [s.got + '-'] } };
      if (files.has(s.folder + '/' + s.path)) { overwrites.push({ path: s.folder + '/' + s.path, same: false, session: true }); return { status: 409, body: {} }; }   // the name appeared meanwhile
      files.set(s.folder + '/' + s.path, { bytes: s.buf });
      const qxh = opts.badHash ? 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=' : uint8ToBase64(qxhCreate().update(s.buf).digest());
      return { status: 201, body: { size: s.size, file: { hashes: { quickXorHash: qxh } } } };
    };
    return { files, posts, sessions, overwrites, restore() { Object.assign(backupTransport, window.__realBackupTransport); } };
  }
  function backupTestOn() {
    Object.assign(backupCfg, { on: true, user: 'tech@hgsengineeringinc.com', pass: 'v1.test.pass',
      passExpires: new Date(Date.now() + 86400000).toISOString(), root: 'LOTO Backups' });
    _backupListTrusted = true; _backupRecordsLoaded = true; _backupSent = new Map(); _backupDays = new Map();
    _backupRetry.clear(); _backupPauseUntil = 0; _backupLastError = ''; _backupSignInNeeded = false; _backupWrongAccount = false;
    _backupState = { waiting: 0, unreadable: 0, checked: false };
    window.__backupWipEvery = 0;   // the unit-on-the-form snapshot's 5-minute spacing off (T188 checks it)
    clearTimeout(_backupSoon);
  }
  function backupTestOff(stub) {
    if (stub) stub.restore();
    delete window.__backupWipEvery;
    Object.assign(backupCfg, { on: false, user: '', pass: '', passExpires: '' });
    clearTimeout(_backupSoon);
    try { localStorage.removeItem('loto_backup_cfg'); } catch (e) {}
    setHospitalCode('');
  }
  async function backupPass() { while (_backupBusy) await sleep(20); await drainBackup(); while (_backupBusy) await sleep(20); }
  // Build 102: a day file lives as write-once snapshots — units_<tag>.json is
  // the folder units_<tag>/ of <time>_<h>.json files; the newest is current.
  const logicalOf = (folder, file) => { const m = /^((?:units|photos|inprogress)_[^/]+)\/[^/]+(\.json|\.csv)$/.exec(String(file || '')); return folder + '/' + (m ? m[1] + m[2] : file); };
  const latestOf = (stub, logical) => { const pre = logical.replace(/\.(json|csv)$/, '') + '/'; let best = null; for (const k of stub.files.keys()) if (k.startsWith(pre) && (!best || k > best)) best = k; return best ? stub.files.get(best) : null; };
  const unitsFile = (stub, folder) => { const f = latestOf(stub, folder + '/units_' + getCollectorTag() + '.json'); return f ? JSON.parse(f.text) : null; };
  const wipFile = (stub, folder) => { const f = latestOf(stub, folder + '/inprogress_' + getCollectorTag() + '.json'); return f ? JSON.parse(f.text) : null; };
  const unitNames = (j) => (j && j.units || []).map(u => u.equipName).sort();

  // T158 — a stored photo goes up, and counts only once SharePoint confirmed it
  async function t158_aStoredPhotoGoesUpAndCountsOnlyWhenConfirmed() {
    const N = 'T158 a stored photo goes to its unit\'s facility / day-taken folder under its key name, and is backed up only once SharePoint confirmed those bytes';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-158');
    await captureInto('equip_main', await makePhotoFile('t158'));
    const A = saveEntry(), ref = A.photos.equip_main, day = localDateStr(ref.timestamp);
    const folder = 'Atlanta/' + day, name = 'photos/' + backupPhotoName(ref.dbKey);
    let stub = backupStub({ shortSize: true });            // SharePoint "confirms" a short copy
    backupTestOn();
    let short = null, good = null, same = false, badge = '', units = null, csv = '';
    try {
      await backupPass();
      short = { counted: _backupSent.has(ref.dbKey), badge: document.getElementById('backupBadge').textContent };
      stub.restore(); stub = backupStub(); _backupRetry.clear();
      await backupPass();
      const got = stub.files.get(folder + '/' + name), pd = await loadPhotoBytes(ref.dbKey, 'image/jpeg');
      same = !!(got && pd && got.bytes.length === pd.bytes.length && got.bytes.every((b, i) => b === pd.bytes[i]));
      good = _backupSent.get(ref.dbKey);
      badge = document.getElementById('backupBadge').textContent;
      units = unitsFile(stub, folder);
      csv = (latestOf(stub, folder + '/photos_' + getCollectorTag() + '.csv') || {}).text || '';
    } finally { backupTestOff(stub); }
    const ok = short && !short.counted && /waiting/.test(short.badge) && same && !!good && good.f === folder && good.s === (await sha256HexOfBytes((await loadPhotoBytes(ref.dbKey, 'image/jpeg')).bytes))
      && /backed up/.test(badge) && unitNames(units).join() === 'Pump-158' && csv.indexOf(backupPhotoName(ref.dbKey)) >= 0 && csv.indexOf('Pump-158') >= 0
      && units.units[0].photos.equip_main.backupFile === folder + '/' + name && !('thumbnail' in units.units[0].photos.equip_main);
    record(N, ok, 'short copy counted=' + (short && short.counted) + ' (badge "' + (short && short.badge) + '"); stored at ' + folder + '/' + name + ' byte-identical=' + same
      + '; counted after a true confirmation=' + !!good + '; badge "' + badge + '"; unit file lists ' + JSON.stringify(unitNames(units)) + '; index lists it=' + (csv.indexOf('Pump-158') >= 0));
  }

  // T159 — filed by each unit's own facility and day, never the one on screen
  async function t159_filedByEachUnitsOwnFacilityAndDay() {
    const N = 'T159 units and photos file by each unit\'s own facility and day — not the facility on screen; the unit in progress goes into its own file in today\'s folder';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('AHU-159');
    await captureInto('equip_main', await makePhotoFile('t159'));
    const A = saveEntry();
    const old = mkEntry('June-159', { savedAt: '2026-06-15T14:00:00.000Z' }); old.hospitalCode = 'Atlanta';
    savedEquipment.push(old); await saveAll();
    setHospitalCode('Marion');                                // the tech moves on to Marion
    fillForm('Form-159');
    await captureInto('equip_main', await makePhotoFile('t159-form'));
    const today = localDateStr(new Date()), aDay = getEntryDate(A), junDay = getEntryDate(old);
    const stub = backupStub();
    backupTestOn();
    let atl = null, jun = null, mar = null, marW = null, formPhotoAt = '', aPhotoAt = '';
    try {
      await backupPass();
      atl = unitsFile(stub, 'Atlanta/' + aDay); jun = unitsFile(stub, 'Atlanta/' + junDay); mar = unitsFile(stub, 'Marion/' + today); marW = wipFile(stub, 'Marion/' + today);
      const find = (k) => Array.from(stub.files.keys()).find(p => p.endsWith('/photos/' + backupPhotoName(k))) || '';
      aPhotoAt = find(A.photos.equip_main.dbKey); formPhotoAt = find(photos.equip_main.dbKey);
    } finally { backupTestOff(stub); }
    const ok = unitNames(atl).join() === 'AHU-159' && unitNames(jun).join() === 'June-159' && !!(marW && marW.unit && marW.unit.equipName === 'Form-159')
      && !mar && aPhotoAt.indexOf('Atlanta/') === 0 && formPhotoAt.indexOf('Marion/' + today + '/') === 0;
    record(N, ok, 'Atlanta ' + aDay + ': ' + JSON.stringify(unitNames(atl)) + '; Atlanta ' + junDay + ': ' + JSON.stringify(unitNames(jun))
      + '; Marion today in progress: ' + JSON.stringify(marW && marW.unit && marW.unit.equipName) + ' (a units file there: ' + !!mar + '); saved unit\'s photo at ' + aPhotoAt + '; form photo at ' + formPhotoAt);
  }

  // T160 — a delete rewrites the day's file; an unchanged file isn't sent again
  async function t160_aDeletedUnitsDayFileIsRewrittenWithoutIt() {
    const N = 'T160 a deleted unit\'s day file is rewritten without it (empty when it was the last); an unchanged file is not sent again';
    await resetAppState();
    setHospitalCode('Atlanta');
    const a = mkEntry('A-160'), b = mkEntry('B-160'); a.hospitalCode = b.hospitalCode = 'Atlanta';
    savedEquipment.push(a, b); await saveAll();
    const folder = 'Atlanta/' + getEntryDate(a), unitsPath = folder + '/units_' + getCollectorTag() + '.json';
    const stub = backupStub();
    backupTestOn();
    let first = null, resends = -1, afterB = null, afterA = null;
    try {
      await backupPass();
      first = unitNames(unitsFile(stub, folder));
      const n = stub.posts.filter(x => logicalOf(x.folder, x.file) === unitsPath).length;
      await backupPass();
      resends = stub.posts.filter(x => logicalOf(x.folder, x.file) === unitsPath).length - n;
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === 'B-160')); await sleep(300); });
      await backupPass();
      afterB = unitNames(unitsFile(stub, folder));
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === 'A-160')); await sleep(300); });
      await backupPass();
      afterA = unitsFile(stub, folder);
    } finally { backupTestOff(stub); }
    const ok = first.join() === 'A-160,B-160' && resends === 0 && afterB.join() === 'A-160' && !!afterA && Array.isArray(afterA.units) && afterA.units.length === 0;
    record(N, ok, 'first ' + JSON.stringify(first) + ', sent again unchanged ' + resends + '×, after deleting B ' + JSON.stringify(afterB) + ', after deleting A ' + JSON.stringify(afterA && afterA.units));
  }

  // T161 — a photo that can't be read waits (said so); an orphan is never sent
  async function t161_anUnreadablePhotoWaitsAndAnOrphanIsNeverSent() {
    const N = 'T161 a photo whose bytes can\'t be read stays waiting and the badge says so; a stored photo nothing refers to is never sent';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-161');
    await captureInto('equip_main', await makePhotoFile('t161'));
    const A = saveEntry(), key = A.photos.equip_main.dbKey;
    const pd = await loadPhotoBytes(key, 'image/jpeg');
    await deletePhotoFromDB(key); await sleep(200);           // the bytes are gone (for now)
    const orphan = photoStoreKey(genUuid(), 'main', 'x161');
    await storePhotoBytes(orphan, 'data:image/jpeg;base64,' + uint8ToBase64(pd.bytes));
    const stub = backupStub();
    backupTestOn();
    let waiting = null, tip = '', orphanSent = false, laterSent = false;
    try {
      await backupPass();
      waiting = { sent: _backupSent.has(key), unreadable: _backupState.unreadable, badge: document.getElementById('backupBadge').textContent };
      tip = document.getElementById('backupBadge').title;
      await storePhotoBytes(key, 'data:image/jpeg;base64,' + uint8ToBase64(pd.bytes)); await sleep(200);   // readable again
      await backupPass();
      laterSent = _backupSent.has(key);
      orphanSent = Array.from(stub.files.keys()).some(p => p.indexOf(backupPhotoName(orphan)) >= 0);
    } finally { backupTestOff(stub); }
    const ok = waiting && !waiting.sent && waiting.unreadable === 1 && /waiting/.test(waiting.badge) && /could not be read/.test(tip) && laterSent && !orphanSent;
    record(N, ok, 'while unreadable: sent=' + (waiting && waiting.sent) + ', unreadable=' + (waiting && waiting.unreadable) + ', badge "' + (waiting && waiting.badge) + '" ("' + tip + '"); once readable: sent=' + laterSent + '; orphan sent=' + orphanSent);
  }

  // T162 — a file SharePoint keeps refusing waits; the rest still go up
  async function t162_aRefusedFileWaitsWhileTheRestGoUp() {
    const N = 'T162 a photo SharePoint refuses (or confirms with the wrong fingerprint) is not counted and is tried again later; the other photos still go up';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-162');
    await captureInto('equip_main', await makePhotoFile('t162-a'));
    await captureInto('equip_dataplate', await makePhotoFile('t162-b'));
    const A = saveEntry(), bad = A.photos.equip_main.dbKey, good = A.photos.equip_dataplate.dbKey;
    let stub = backupStub({ refuse: (b) => b.path.indexOf(backupPhotoName(bad)) >= 0 });
    backupTestOn();
    let first = null, wrong = null, fixed = false;
    try {
      await backupPass();
      first = { bad: _backupSent.has(bad), good: _backupSent.has(good), retry: backupRetryWaiting('photo:' + bad), waiting: _backupState.waiting };
      stub.restore(); stub = backupStub({ wrongSha: true }); _backupRetry.clear();
      await backupPass();
      wrong = _backupSent.has(bad);
      stub.restore(); stub = backupStub(); _backupRetry.clear();
      await backupPass();
      fixed = _backupSent.has(bad);
    } finally { backupTestOff(stub); }
    const ok = first && !first.bad && first.good && first.retry && first.waiting === 1 && !wrong && fixed;
    record(N, ok, 'refused: counted=' + (first && first.bad) + ', the other photo counted=' + (first && first.good) + ', tried again later=' + (first && first.retry)
      + ', waiting=' + (first && first.waiting) + '; wrong fingerprint counted=' + wrong + '; accepted later=' + fixed);
  }

  // T163 — no signal is not a sign-in problem; a refusal is
  async function t163_noSignalIsNotASignInProblem() {
    const N = 'T163 no signal leaves the backup waiting (not "sign in"); a refused account says sign in; an expired iPad pass asks to sign in again';
    await resetAppState();
    setHospitalCode('Atlanta');
    const a = mkEntry('A-163'); a.hospitalCode = 'Atlanta'; savedEquipment.push(a); await saveAll();
    let stub = backupStub({ offline: true });
    backupTestOn();
    let offline = null, refused = null, lapsed = null;
    try {
      await backupPass();
      offline = { badge: document.getElementById('backupBadge').textContent, signIn: _backupSignInNeeded, paused: _backupPauseUntil > Date.now() };
      stub.restore(); stub = backupStub({ status: 401 }); _backupPauseUntil = 0;
      await backupPass();
      refused = { badge: document.getElementById('backupBadge').textContent, signIn: _backupSignInNeeded };
      Object.assign(backupCfg, { pass: 'v1.old.pass', passExpires: new Date(Date.now() - 1000).toISOString() });
      lapsed = backupPassValid();
    } finally { backupTestOff(stub); }
    const ok = offline && /waiting/.test(offline.badge) && !offline.signIn && offline.paused && refused && refused.signIn && /sign in/.test(refused.badge) && lapsed === false;
    record(N, ok, 'offline: badge "' + (offline && offline.badge) + '", sign-in asked=' + (offline && offline.signIn) + '; refused: badge "' + (refused && refused.badge) + '"; expired pass valid=' + lapsed);
  }

  // T164 — only the tab that holds the claim backs up
  async function t164_onlyTheTabThatMaySaveBacksUp() {
    const N = 'T164 a tab that lost the claim to another tab sends nothing to SharePoint';
    await resetAppState();
    if (typeof tabLockActive === 'function' && !tabLockActive()) return record(N, true, 'single-window app (iOS) — no tabs');
    setHospitalCode('Atlanta');
    const a = mkEntry('A-164'); a.hospitalCode = 'Atlanta'; savedEquipment.push(a); await saveAll();
    const stub = backupStub();
    backupTestOn();
    let paused = -1, live = -1, had = null;
    try {
      try { had = localStorage.getItem('loto_tab_claim'); } catch (e) {}
      otherTabClaims();
      await backupPass();
      paused = stub.posts.length;
      releaseOtherTabClaim(had);
      await backupPass();
      live = stub.posts.length;
    } finally { backupTestOff(stub); }
    record(N, paused === 0 && live > 0, 'sent while another tab held the claim: ' + paused + '; after it came back: ' + live);
  }

  // T165 — Export to SharePoint: pieces, a dropped piece, and only then "exported"
  async function t165_exportToSharePointMarksExportedOnlyWhenConfirmed() {
    const N = 'T165 Export to SharePoint lands in the facility/day export folder (each day\'s sheet too), resumes after a dropped piece, and marks units exported only once SharePoint confirmed the file';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-165');
    await captureInto('equip_main', await makePhotoFile('t165'));
    const A = saveEntry();
    const runCloud = async (stub) => {
      const real = { c: window.confirm, a: window.alert, ch: window.__askChoiceAuto };
      window.confirm = () => true; window.alert = () => {};
      window.__askChoiceAuto = (o) => (o && o.id === 'export-blank-energy') ? 'export' : ((o && o.defaultValue) || 'cancel');
      try {
        showExportDialog();
        document.getElementById('exportDateFilter').value = 'all'; populateExportFacilityFilter();
        document.getElementById('exportFacilityFilter').value = 'all';
        document.getElementById('photoSeqStart').value = '1';
        return await withToasts(async () => { await runCombinedExport({ toSharePoint: true }); });
      } finally { window.confirm = real.c; window.alert = real.a; window.__askChoiceAuto = real.ch; }
    };
    // (a) the service refuses to start: nothing marked
    let stub = backupStub({ sessionStatus: 503 });
    backupTestOn();
    let refusedMsgs = [], refusedStamp = true, zipAt = '', sheetAt = '', stamped = false, big = null, badHashErr = '';
    try {
      refusedMsgs = await runCloud(stub);
      refusedStamp = !!savedEquipment.find(e => e.id === A.id).exportedAt;
      // (b) it works: the ZIP and the day's sheet land, then the unit is marked
      stub.restore(); stub = backupStub();
      await runCloud(stub);
      const today = localDateStr(new Date());
      zipAt = Array.from(stub.files.keys()).find(p => /^Atlanta\/\d{4}-\d{2}-\d{2}\/export\/FieldExport_Atlanta_.*\.zip$/.test(p)) || '';
      // the facility follows the date in a sheet's name since build 118 (one sheet per facility per day)
      sheetAt = Array.from(stub.files.keys()).find(p => /\/export\/Information_Sheet_\d{6}_Atlanta_[A-Za-z0-9]+\.xlsx$/.test(p)) || '';
      stamped = !!savedEquipment.find(e => e.id === A.id).exportedAt && zipAt.indexOf('Atlanta/' + today + '/') === 0;
      // (c) a 12 MB file in 5 MiB pieces, the second piece lost once: resumed, and its hash checked
      stub.restore(); stub = backupStub({ dropPut: (n) => n === 2 });
      const bytes = new Uint8Array(12 * 1048576); for (let i = 0; i < bytes.length; i += 4093) bytes[i] = (i * 31) & 255;
      const res = await backupUploadBig(new Blob([bytes]), 'Atlanta/' + today, 'export/big.zip');
      const got = stub.files.get('Atlanta/' + today + '/export/big.zip');
      big = { checked: res.hashChecked, same: !!got && got.bytes.length === bytes.length && got.bytes.every((b, i) => b === bytes[i]), puts: Array.from(stub.sessions.values())[0].puts };
      // (d) SharePoint's hash differs: not accepted
      stub.restore(); stub = backupStub({ badHash: true });
      try { await backupUploadBig(new Blob([bytes.subarray(0, 100000)]), 'Atlanta/' + today, 'export/bad.zip'); } catch (e) { badHashErr = e.message; }
    } finally { backupTestOff(stub); }
    const ok = refusedMsgs.some(m => /Not sent to SharePoint/.test(m)) && !refusedStamp && !!zipAt && !!sheetAt && stamped
      && big && big.checked && big.same && big.puts === 4 && /does not match/.test(badHashErr);
    record(N, ok, 'refused: said "' + (refusedMsgs.find(m => /SharePoint/.test(m)) || '') + '", marked exported=' + refusedStamp + '; sent: ' + zipAt + ' + ' + sheetAt + ', marked exported=' + stamped
      + '; 12 MB with a lost piece: complete=' + (big && big.same) + ' in ' + (big && big.puts) + ' puts, hash checked=' + (big && big.checked) + '; wrong hash: "' + badHashErr + '"');
  }

  // T166 — Send everything again sends everything, and asks first
  async function t166_sendEverythingAgainResendsAll() {
    const N = 'T166 "Send everything again" asks first, then sends every photo and unit file again — confirmed ones included';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-166');
    await captureInto('equip_main', await makePhotoFile('t166'));
    saveEntry();
    const stub = backupStub();
    backupTestOn();
    let declined = -1, again = -1, asked = '';
    try {
      await backupPass();
      const n0 = stub.posts.filter(x => x.method === 'POST').length;
      await withDialogs({ confirm: false }, async () => { backupEverythingAgain(); await backupPass(); });
      declined = stub.posts.filter(x => x.method === 'POST').length - n0;
      const r = await withDialogs({ confirm: true }, async () => { backupEverythingAgain(); await sleep(50); await backupPass(); });
      asked = (r.log[0] || '');
      again = stub.posts.filter(x => x.method === 'POST').length - n0;
    } finally { backupTestOff(stub); }
    record(N, declined === 0 && again >= 3 && /Check all 1 photo/.test(asked), 'declined: sent ' + declined + '; agreed: sent ' + again + ' (photo, unit file, index) after "' + asked.slice(0, 70) + '…"');
  }

  // T167 — the iPad sign-in: only the verifier this app made turns the code into a pass
  async function t167_theIPadSignInNeedsTheVerifierThisAppMade() {
    const N = 'T167 the sign-in code becomes a pass only with the verifier this app made; a code this app didn\'t ask for, or one from a sign-in started over 10 minutes ago, is refused before the server is asked';
    await resetAppState();
    const verifier = 'V'.repeat(43);
    const stub = backupStub({ verifier });
    let stray = null, stale = null, asked = -1, good = null, pass = '';
    try {
      Object.assign(backupCfg, { on: true, user: '', pass: '', passExpires: '' });
      _backupPkce = null;
      stray = await finishBackupSignIn('lotocollector://backup-link?code=c1.a.b&user=x');   // nothing started here
      _backupPkce = { verifier, at: Date.now() - 11 * 60000 };                           // started long ago
      stale = await finishBackupSignIn('lotocollector://backup-link?code=c1.a.b&user=x');
      asked = stub.posts.filter(x => x.path === '/api/device-pass').length;
      _backupPkce = { verifier, at: Date.now() };
      good = await finishBackupSignIn('lotocollector://backup-link?code=c1.a.b&user=tech');
      pass = backupCfg.pass;
    } finally { backupTestOff(stub); }
    record(N, stray === false && stale === false && asked === 0 && good === true && pass === 'v1.test.pass',
      'stray code accepted=' + stray + '; stale sign-in accepted=' + stale + ' (server asked ' + asked + '×); own sign-in accepted=' + good + ', pass kept=' + (pass === 'v1.test.pass'));
  }

  // T168 — a list the launch couldn't read in full never rewrites the unit files
  async function t168_aPartialListNeverRewritesTheUnitFiles() {
    const N = 'T168 while the saved list may be partial (the store unread, or a failed launch) photos still go up but no unit file is rewritten';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-168');
    await captureInto('equip_main', await makePhotoFile('t168'));
    const A = saveEntry();
    const b = mkEntry('B-168'); b.hospitalCode = 'Atlanta'; savedEquipment.push(b); await saveAll();
    const folder = 'Atlanta/' + getEntryDate(A), unitsPath = folder + '/units_' + getCollectorTag() + '.json';
    const stub = backupStub();
    backupTestOn();
    let before = null, unread = -1, untrusted = -1, photoWent = false;
    try {
      await backupPass();
      before = unitNames(unitsFile(stub, folder));
      const n = () => stub.posts.filter(x => logicalOf(x.folder, x.file) === unitsPath).length;
      const n0 = n();
      const keep = savedEquipment.slice();
      savedEquipment = savedEquipment.filter(e => e.equipName !== 'B-168');   // a partial list in memory
      _entryStoreUnread = true;
      _backupSent.delete(A.photos.equip_main.dbKey);
      await backupPass();
      unread = n() - n0; photoWent = _backupSent.has(A.photos.equip_main.dbKey);
      _entryStoreUnread = false; _backupListTrusted = false;
      await backupPass();
      untrusted = n() - n0;
      savedEquipment = keep;
    } finally { _entryStoreUnread = false; _backupListTrusted = true; backupTestOff(stub); }
    record(N, before.join() === 'B-168,Pump-168' && unread === 0 && untrusted === 0 && photoWent,
      'unit file first ' + JSON.stringify(before) + '; rewritten while the store was unread: ' + unread + '×, after a failed launch: ' + untrusted + '×; the photo still went=' + photoWent);
  }

  // T169 — "backed up" means in the folder it belongs in now
  async function t169_aPhotoWhoseFacilityChangesGoesAgain() {
    const N = 'T169 a photo backed up before its unit\'s facility was chosen goes again, to that facility\'s folder, once it is; nothing in the old folder still claims it';
    await resetAppState();
    setHospitalCode('');                                    // not chosen yet
    fillForm('Pump-169');
    await captureInto('equip_main', await makePhotoFile('t169'));
    const key = photos.equip_main.dbKey, day = localDateStr(photos.equip_main.timestamp), name = 'photos/' + backupPhotoName(key);
    const stub = backupStub();
    backupTestOn();
    let first = false, second = false, units = null, oldCsv = null, oldWip = null, sentTo = '';
    try {
      await backupPass();                                   // the form's photo goes, under "No facility"
      first = stub.files.has('No facility/' + day + '/' + name);
      setHospitalCode('Atlanta');                           // then the facility is chosen and the unit saved
      const A = saveEntry();
      await backupPass();
      second = stub.files.has('Atlanta/' + day + '/' + name);
      units = unitsFile(stub, 'Atlanta/' + getEntryDate(A));
      oldCsv = (latestOf(stub, 'No facility/' + day + '/photos_' + getCollectorTag() + '.csv') || {}).text;
      oldWip = wipFile(stub, 'No facility/' + day);
      sentTo = (_backupSent.get(key) || {}).f;
    } finally { backupTestOff(stub); }
    const ref = units && units.units && units.units[0] && units.units[0].photos.equip_main;
    record(N, first && second && !!ref && ref.backupFile === 'Atlanta/' + day + '/' + name && sentTo === 'Atlanta/' + day
      && (oldCsv == null || oldCsv.indexOf(backupPhotoName(key)) < 0) && !!oldWip && oldWip.unit === null,
      'first under No facility=' + first + '; again under Atlanta=' + second + '; the unit file points to ' + (ref && ref.backupFile) + '; recorded at ' + sentTo
      + '; the old folder\'s index lists it=' + (oldCsv == null ? '(no index)' : oldCsv.indexOf(backupPhotoName(key)) >= 0)
      + ', its in-progress file now holds ' + JSON.stringify(oldWip && oldWip.unit && oldWip.unit.equipName));
  }

  // T170 — a day file is remembered before it is sent
  async function t170_aDayFileIsRememberedBeforeItIsSent() {
    const N = 'T170 a day file is remembered on the device before it is sent: SharePoint stored it but the answer was lost, the app restarted, the day\'s units were deleted — the file is still written again empty';
    await resetAppState();
    setHospitalCode('Marion');
    const a = mkEntry('A-170'); a.hospitalCode = 'Marion';
    savedEquipment.push(a); await saveAll();
    const folder = 'Marion/' + getEntryDate(a), unitsPath = folder + '/units_' + getCollectorTag() + '.json';
    let stub = backupStub({ lose: (b) => logicalOf(b.folder, b.path) === unitsPath });
    backupTestOn();
    let stored = null, after = null;
    try {
      await backupPass();
      stored = unitNames(unitsFile(stub, folder));
      // closed and opened again: the backup's records come from the device
      const had = stub.files; stub.restore(); stub = backupStub(); had.forEach((v, k) => stub.files.set(k, v));
      _backupRecordsLoaded = false; _backupSent = new Map(); _backupDays = new Map(); _backupPauseUntil = 0; _backupRetry.clear();
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === 'A-170')); await sleep(300); });
      await backupPass();
      after = unitsFile(stub, folder);
    } finally { backupTestOff(stub); }
    record(N, stored.join() === 'A-170' && !!after && Array.isArray(after.units) && after.units.length === 0,
      'stored with the answer lost: ' + JSON.stringify(stored) + '; after a restart and deleting it, SharePoint\'s file lists ' + JSON.stringify(after && after.units));
  }

  // T171 — records of photos no longer on the device go; never on a partial list
  async function t171_sentRecordsFollowTheListNeverAPartialOne() {
    const N = 'T171 a deleted unit\'s photos leave the device\'s backup record; while the saved list may be partial the record keeps them (no mass re-upload)';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('A-171'); await captureInto('equip_main', await makePhotoFile('t171a')); const A = saveEntry();
    fillForm('B-171'); await captureInto('equip_main', await makePhotoFile('t171b')); const B = saveEntry();
    const ka = A.photos.equip_main.dbKey, kb = B.photos.equip_main.dbKey;
    const stub = backupStub();
    backupTestOn();
    let both = false, keptWhileUnread = false, afterDelete = null, resent = -1;
    try {
      await backupPass();
      both = _backupSent.has(ka) && _backupSent.has(kb);
      const keep = savedEquipment.slice();
      savedEquipment = savedEquipment.filter(e => e.equipName !== 'B-171');   // a partial list in memory
      _entryStoreUnread = true;
      await backupPass();
      keptWhileUnread = _backupSent.has(kb);
      savedEquipment = keep; _entryStoreUnread = false;
      const n = stub.posts.length;
      await backupPass();
      resent = stub.posts.filter((x, i) => i >= n && String(x.file || '').startsWith('photos/')).length;
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === 'B-171')); await sleep(300); });
      await backupPass();
      afterDelete = { a: _backupSent.has(ka), b: _backupSent.has(kb) };
    } finally { _entryStoreUnread = false; backupTestOff(stub); }
    record(N, both && keptWhileUnread && resent === 0 && !!afterDelete && afterDelete.a && !afterDelete.b,
      'both recorded=' + both + '; B kept while the list was partial=' + keptWhileUnread + '; photos sent again once it was whole: ' + resent + '; after deleting B ' + JSON.stringify(afterDelete));
  }

  // T172 — typing re-sends the unit in progress, never the whole day
  async function t172_editingTheFormSendsOnlyItsOwnFile() {
    const N = 'T172 editing the unit on the form sends only its own small file (and a new photo) — never the day\'s units file or photo index again; saving it moves it into them and empties its file';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('A-172'); await captureInto('equip_main', await makePhotoFile('t172a')); saveEntry();
    fillForm('Form-172'); await captureInto('equip_main', await makePhotoFile('t172f'));
    const folder = 'Atlanta/' + localDateStr(new Date()), tag = getCollectorTag();
    const unitsName = 'units_' + tag + '.json', csvName = 'photos_' + tag + '.csv', wipName = 'inprogress_' + tag + '.json';
    const stub = backupStub();
    backupTestOn();
    let first = null, typed = [], wip = null, saved = [], units = [], wipAfter;
    try {
      await backupPass();
      first = { units: unitNames(unitsFile(stub, folder)), wip: ((wipFile(stub, folder) || {}).unit || {}).equipName };
      const n1 = stub.posts.length;
      document.getElementById('equipName').value = 'Form-172 typed'; autoSaveCurrent();
      await captureInto('equip_dataplate', await makePhotoFile('t172g'));
      await sleep(300);
      await backupPass();
      typed = stub.posts.slice(n1).map(x => logicalOf('', x.file).slice(1));
      wip = wipFile(stub, folder);
      const n2 = stub.posts.length;
      saveEntry();
      await sleep(300);
      await backupPass();
      saved = stub.posts.slice(n2).map(x => logicalOf('', x.file).slice(1));
      units = unitNames(unitsFile(stub, folder));
      wipAfter = (wipFile(stub, folder) || {}).unit;
    } finally { backupTestOff(stub); }
    const ok = first && first.units.join() === 'A-172' && first.wip === 'Form-172'
      && typed.includes(wipName) && typed.some(f => /^photos\//.test(f)) && !typed.includes(unitsName) && !typed.includes(csvName)
      && !!(wip && wip.unit && wip.unit.equipName === 'Form-172 typed')
      && saved.includes(unitsName) && saved.includes(csvName) && saved.includes(wipName)
      && units.join() === 'A-172,Form-172 typed' && wipAfter === null;
    record(N, ok, 'first pass: units ' + JSON.stringify(first && first.units) + ', in progress ' + JSON.stringify(first && first.wip)
      + '; typing + a photo sent ' + JSON.stringify(Array.from(new Set(typed))) + '; saving sent ' + JSON.stringify(Array.from(new Set(saved)))
      + ' — units ' + JSON.stringify(units) + ', in progress now ' + JSON.stringify(wipAfter));
  }

  // T173 — a confirmation the device never saved leaves no older one standing
  async function t173_anUnsavedConfirmationNeverLeavesAnOlderOneStanding() {
    const N = 'T173 a day file SharePoint confirmed but the device never recorded (the app closed first) is sent again after the restart — even when the day goes back to text an older record says SharePoint has';
    await resetAppState();
    setHospitalCode('Marion');
    const a = mkEntry('A-173'); a.hospitalCode = 'Marion';
    savedEquipment.push(a); await saveAll();
    const folder = 'Marion/' + getEntryDate(a), unitsPath = folder + '/units_' + getCollectorTag() + '.json';
    let stub = backupStub();
    backupTestOn();
    const realSave = window.saveMetadataMany;
    let emptied = null, withB = null, after = null;
    try {
      await backupPass();                                    // [A]
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === 'A-173')); await sleep(300); });
      await backupPass();                                    // [] — confirmed and recorded
      emptied = unitNames(unitsFile(stub, folder));
      const b = mkEntry('B-173'); b.hospitalCode = 'Marion'; b.savedAt = a.savedAt;
      savedEquipment.push(b); await saveAll();
      // SharePoint confirms [B]; the app is closed before it saves that confirmation
      let closed = false;
      const had = stub.files; stub.restore(); stub = backupStub({ lose: (x) => { if (logicalOf(x.folder, x.path) === unitsPath) closed = true; return false; } });
      had.forEach((v, k) => stub.files.set(k, v));
      window.saveMetadataMany = function (o) { if (closed && o && ('backup_sent' in o || 'backup_days' in o)) return Promise.reject(new Error('the app was closed (test)')); return realSave.apply(this, arguments); };
      await backupPass();
      withB = unitNames(unitsFile(stub, folder));
      window.saveMetadataMany = realSave;
      // opened again: the records come from the device; B is deleted — the day is back to []
      _backupRecordsLoaded = false; _backupSent = new Map(); _backupDays = new Map(); _backupPauseUntil = 0; _backupRetry.clear(); _backupSentDirty = false; _backupDaysDirty = false;
      await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === 'B-173')); await sleep(300); });
      await backupPass();
      after = unitNames(unitsFile(stub, folder));
    } finally { window.saveMetadataMany = realSave; backupTestOff(stub); }
    record(N, emptied && emptied.length === 0 && withB && withB.join() === 'B-173' && after && after.length === 0,
      'emptied first: ' + JSON.stringify(emptied) + '; then SharePoint confirmed ' + JSON.stringify(withB) + ' but the app closed before recording it; after the restart and deleting B, SharePoint lists ' + JSON.stringify(after));
  }

  // T174 — the web sign-in / sign-out never leave the page mid photo write
  async function t174_webSignInWaitsForAPhotoStillSaving() {
    const N = 'T174 on the web, Sign in / Sign out with Microsoft never leave the page while a photo is still being written — they say so and stay';
    await resetAppState();
    const realNative = window.backupNative, realGo = window.backupGo, went = [];
    window.backupNative = () => false;                     // the web app
    window.backupGo = (u) => { went.push(u); };            // leaving the page, recorded instead
    let busyIn = -1, busyOut = -1, kept = '', msgs = [], freeIn = -1;
    const t = startPhotoWrite('t174');
    try {
      Object.assign(backupCfg, { on: true, user: 'tech@hgsengineeringinc.com' });
      msgs = await withToasts(async () => { await signInForBackup(); busyIn = went.length; signOutBackup(); busyOut = went.length; });
      kept = backupCfg.user;
      endPhotoWrite(t);
      await signInForBackup(); freeIn = went.length;
    } finally { endPhotoWrite(t); window.backupNative = realNative; window.backupGo = realGo; backupTestOff(); }
    record(N, busyIn === 0 && busyOut === 0 && kept === 'tech@hgsengineeringinc.com' && msgs.filter(m => /still saving/.test(m)).length === 2
        && freeIn === 1 && /^\/\.auth\/login\/aad/.test(went[0] || ''),
      'while a photo was saving: left the page ' + busyIn + '× (sign in), ' + (busyOut - busyIn) + '× (sign out), account kept=' + (kept === 'tech@hgsengineeringinc.com')
      + ', said so ' + msgs.filter(m => /still saving/.test(m)).length + '×; once saved, sign in went to ' + JSON.stringify(went[0] || ''));
  }

  // T175 — an account that may not back up stays shown, with its Sign out
  async function t175_aRefusedAccountStaysShownSoItCanBeSwitched() {
    const N = 'T175 an account SharePoint backup refuses (403) stays shown — "account not allowed", with Sign out to switch; a lapsed sign-in (401) asks to sign in again';
    await resetAppState();
    setHospitalCode('Atlanta');
    const a = mkEntry('A-175'); a.hospitalCode = 'Atlanta'; savedEquipment.push(a); await saveAll();
    const realNative = window.backupNative;
    window.backupNative = () => false;                     // the web app
    let stub = backupStub({ status: 403 });
    backupTestOn();
    let wrong = null, lapsed = null;
    try {
      await backupPass();
      paintBackupSettings(true);
      const out = document.getElementById('backupSignOutBtn');
      wrong = { user: backupCfg.user, badge: document.getElementById('backupBadge').textContent, signOut: !!out && out.style.display !== 'none',
        who: (document.getElementById('backupWho') || {}).textContent || '' };
      stub.restore(); stub = backupStub({ status: 401 }); _backupPauseUntil = 0;
      await backupPass();
      lapsed = { user: backupCfg.user, badge: document.getElementById('backupBadge').textContent };
    } finally { window.backupNative = realNative; backupTestOff(stub); }
    record(N, !!wrong && wrong.user === 'tech@hgsengineeringinc.com' && /not allowed/.test(wrong.badge) && wrong.signOut && /may not back up/.test(wrong.who)
        && !!lapsed && lapsed.user === '' && /sign in/.test(lapsed.badge),
      'refused: account ' + JSON.stringify(wrong && wrong.user) + ', badge "' + (wrong && wrong.badge) + '", Sign out shown=' + (wrong && wrong.signOut)
      + '; lapsed: account ' + JSON.stringify(lapsed && lapsed.user) + ', badge "' + (lapsed && lapsed.badge) + '"');
  }

  // T176 — an iPad sign-in that can't be prepared says so
  async function t176_anIPadSignInThatCannotBePreparedSaysSo() {
    const N = 'T176 when the device can\'t hash the sign-in challenge, the iPad sign-in says so — no sheet opened, nothing half-started, nothing thrown';
    await resetAppState();
    const realNative = window.backupNative, realHash = window.sha256HexOfBytes, realCap = window.Capacitor;
    let opened = 0, threw = '', msgs = [];
    window.backupNative = () => true;                      // the iPad app
    window.Capacitor = Object.assign({}, realCap || {}, { Plugins: Object.assign({}, (realCap && realCap.Plugins) || {}, { Browser: { open: async () => { opened++; }, close: async () => {} } }) });
    window.sha256HexOfBytes = async () => null;            // hashing unavailable
    try {
      _backupPkce = null;
      msgs = await withToasts(async () => { try { await signInForBackup(); } catch (e) { threw = String(e && e.message || e); } });
    } finally { window.sha256HexOfBytes = realHash; window.Capacitor = realCap; window.backupNative = realNative; backupTestOff(); }
    record(N, !threw && opened === 0 && _backupPkce === null && msgs.some(m => /sign-in/.test(m)),
      'threw: ' + JSON.stringify(threw) + '; sheet opened ' + opened + '×; sign-in half-started=' + (_backupPkce !== null) + '; said: ' + JSON.stringify(msgs));
  }

  // T177 — the service failing pauses everything; it never sends every photo to fail
  async function t177_aServiceWideRefusalPausesEverything() {
    const N = 'T177 when the backup service itself fails (503: a setting to fix; 429: busy) the pass stops at the first file and pauses — it never sends every photo only to fail';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('A-177'); await captureInto('equip_main', await makePhotoFile('t177a')); saveEntry();
    fillForm('B-177'); await captureInto('equip_main', await makePhotoFile('t177b')); saveEntry();
    let stub = backupStub({ status: 503 });
    backupTestOn();
    let s503 = null, s429 = null;
    try {
      await backupPass();
      s503 = { posts: stub.posts.length, minutes: Math.round((_backupPauseUntil - Date.now()) / 60000), perFile: _backupRetry.size };
      stub.restore(); stub = backupStub({ status: 429 }); _backupPauseUntil = 0;
      await backupPass();
      s429 = { posts: stub.posts.length, seconds: Math.round((_backupPauseUntil - Date.now()) / 1000), perFile: _backupRetry.size };
    } finally { backupTestOff(stub); }
    record(N, !!s503 && s503.posts === 1 && s503.minutes >= 9 && s503.perFile === 0 && !!s429 && s429.posts === 1 && s429.seconds > 30 && s429.seconds <= 60 && s429.perFile === 0,
      '503: ' + JSON.stringify(s503) + '; 429: ' + JSON.stringify(s429));
  }

  // T178 — no day file goes while the device can't record it
  async function t178_dayFilesWaitWhileTheDeviceCannotRecordThem() {
    const N = 'T178 while the device can\'t write its backup record, no day file is sent — neither in the pass whose mark failed nor in the next; once it can, they go';
    await resetAppState();
    setHospitalCode('Marion');
    const a = mkEntry('A-178'); a.hospitalCode = 'Marion'; savedEquipment.push(a); await saveAll();
    const folder = 'Marion/' + getEntryDate(a), unitsPath = folder + '/units_' + getCollectorTag() + '.json';
    const stub = backupStub();
    backupTestOn();
    const realSave = window.saveMetadataMany;
    let during = -1, after = null;
    try {
      window.saveMetadataMany = function (o) { if (o && ('backup_sent' in o || 'backup_days' in o)) return Promise.reject(new Error('storage full (test)')); return realSave.apply(this, arguments); };
      await backupPass();                                   // marks, can't record them
      await backupPass();                                   // still can't
      during = stub.posts.filter(x => logicalOf(x.folder, x.file) === unitsPath).length;
      window.saveMetadataMany = realSave;
      await backupPass();
      after = unitNames(unitsFile(stub, folder));
    } finally { window.saveMetadataMany = realSave; backupTestOff(stub); }
    record(N, during === 0 && !!after && after.join() === 'A-178',
      'sent while the record could not be written: ' + during + '×; once it could, SharePoint lists ' + JSON.stringify(after));
  }

  // T179 — a day-file mark writes the small day record, not the photo record
  async function t179_aDayFileMarkWritesOnlyTheDayRecord() {
    const N = 'T179 a pass that only sends the unit in progress writes only the small day record — never the whole photo record again';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('A-179'); await captureInto('equip_main', await makePhotoFile('t179')); saveEntry();
    const stub = backupStub();
    backupTestOn();
    const realSave = window.saveMetadataMany, writes = [];
    let sentIt = false;
    try {
      await backupPass();                                   // the photo and the day files: both records
      window.saveMetadataMany = function (o) { if (o && ('backup_sent' in o || 'backup_days' in o)) writes.push(Object.keys(o).sort().join('+')); return realSave.apply(this, arguments); };
      fillForm('Form-179'); autoSaveCurrent(); await sleep(200);   // only the unit on the form changes
      const n = stub.posts.length;
      await backupPass();
      sentIt = stub.posts.slice(n).some(x => /^inprogress_/.test(String(x.file || '')));
    } finally { window.saveMetadataMany = realSave; backupTestOff(stub); }
    record(N, sentIt && writes.length > 0 && writes.every(w => w === 'backup_days'),
      'the unit in progress went=' + sentIt + '; records written: ' + JSON.stringify(writes));
  }

  // T180 — Scan the Panel / MCC ID off its label
  async function t180_panelIdScansOffTheLabel() {
    const N = 'T180 the Panel / MCC ID has a Scan button: the label\'s ID line lands in the source\'s location without the word "Panel" / "MCC"';
    await resetAppState();
    fillForm('Pump-180');
    sources[0].location = 'Panel'; sources.push(Object.assign({}, sources[0], { location: 'MCC', sourceId: undefined }));
    renderSources();
    const button = (i) => { const inp = document.getElementById('src_locid_' + i); return !!(inp && inp.parentElement && inp.parentElement.querySelector('.scan-btn')); };
    const buttons = [button(0), button(1)];
    const realCap = window.Capacitor, labels = [
      { text: 'PANEL\nLP-1A\n120/208V 3PH 4W', blocks: [{ text: 'PANEL' }, { text: 'LP-1A' }, { text: '120/208V 3PH 4W' }] },
      { text: 'MCC-3B', blocks: [{ text: 'MCC-3B' }] },
    ];
    let n = 0, threw = '';
    window.Capacitor = { isNativePlatform: () => true, Plugins: Object.assign({}, (realCap && realCap.Plugins) || {}, {
      Camera: { getPhoto: async () => ({ base64String: 'AAAA' }) },
      TextRecognition: { recognizeText: async () => labels[n++] },
    }) };
    try {
      await scanTextToField('src_locid_0', 'locationId');
      await scanTextToField('src_locid_1', 'locationId');
    } catch (e) { threw = String(e && e.message || e); }
    finally { window.Capacitor = realCap; }
    record(N, buttons[0] && buttons[1] && !threw && sources[0].location === 'Panel LP-1A' && sources[1].location === 'MCC 3B',
      'scan buttons ' + JSON.stringify(buttons) + '; locations ' + JSON.stringify([sources[0].location, sources[1].location]) + (threw ? '; threw ' + threw : ''));
  }

  // T181 — Save & New warns about a source whose photo slot is empty
  async function t181_aSourceWithoutItsPhotoIsFlagged() {
    const N = 'T181 Save & New flags each source whose photo slot is shown but empty — never a duplicate, a linked source, a kind that needs no photo, or one set to "no photo"; the source card shows exactly those slots';
    await resetAppState();
    fillForm('Pump-181');
    const base = sources[0];
    sources.length = 0;
    sources.push(
      Object.assign({}, base, { energySource: 'Electrical 480V', sourceId: undefined }),                                    // #1 expects a photo — none
      Object.assign({}, base, { energySource: 'Electrical 480V', sourceId: undefined }),                                    // #2 has one
      Object.assign({}, base, { energySource: 'Gravity/Potential', deviceType: 'Potential', verification: 'Block', sourceId: undefined }),   // #3 needs none
      Object.assign({}, base, { energySource: 'Electrical 480V', duplicate: 'Yes', sourceId: undefined }),                  // #4 duplicate
      Object.assign({}, base, { energySource: 'Kinetic', deviceType: 'Belt', noPhoto: true, sourceId: undefined }),         // #5 set to no photo
      Object.assign({}, base, { energySource: 'Kinetic', deviceType: 'Belt', sourceId: undefined }));                       // #6 toggleable, slot shown — none
    sources.forEach(ensureSourceId);
    renderSources();
    await captureInto('source_1', await makePhotoFile('t181'));
    const flagged = collectIncompleteFields().filter(m => /^Source #/.test(m) && /Photo/.test(m));   // the Main Photo is T193's
    const flaggedNums = flagged.map(m => +(/Source #(\d+)/.exec(m) || [])[1]).sort();
    // the card shows a photo slot exactly where a photo is expected (or held)
    renderSources();
    const slotShown = sources.map((src, i) => !!document.getElementById('photo_source_' + i));
    const expected = sources.map((src, i) => sourceExpectsPhoto(src) || sourcePhotoTaken(i));
    // Save & New stops with the warning; Save anyway saves
    let overlay = false, saved = false;
    await withDialogs({ confirm: true }, async () => {
      saveAndNew();
      overlay = !!document.getElementById('incompleteWarningOverlay') && /Photo/.test(document.getElementById('incompleteWarningOverlay').textContent);
      closeIncompleteWarning(); performSaveAndNew(); await sleep(200);
      saved = savedEquipment.some(e => e.equipName === 'Pump-181');
    });
    record(N, flaggedNums.join() === '1,6' && overlay && saved && expected.join() === 'true,true,false,false,false,true' && slotShown.join() === expected.join(),
      'flagged ' + JSON.stringify(flagged) + '; photo expected per source ' + JSON.stringify(expected) + ', slot shown ' + JSON.stringify(slotShown)
      + '; warning shown=' + overlay + ', saved anyway=' + saved);
  }

  // T182 — "Clear all data" never empties the backup
  async function t182_clearAllDataNeverEmptiesTheBackup() {
    const N = 'T182 "Clear all data" stops the backup and never mirrors the clear — SharePoint keeps its last copy of every day, even once the backup is turned on again';
    await resetAppState();
    setHospitalCode('Atlanta');
    const a = mkEntry('A-182'); a.hospitalCode = 'Atlanta'; savedEquipment.push(a); await saveAll();
    const folder = 'Atlanta/' + getEntryDate(a), path = folder + '/units_' + getCollectorTag() + '.json';
    const stub = backupStub();
    backupTestOn();
    let before = null, on = null, after = null;
    try {
      await backupPass();
      before = unitNames(unitsFile(stub, folder));
      await withDialogs({ confirm: true }, async () => { clearAllData(); await sleep(300); });
      on = backupCfg.on;
      await backupPass();                                   // (off: nothing)
      // turned on and signed in again — the cleared device's records are gone, so nothing is emptied
      Object.assign(backupCfg, { on: true, user: 'tech@hgsengineeringinc.com', pass: 'v1.test.pass', passExpires: new Date(Date.now() + 86400000).toISOString() });
      _backupListTrusted = true;
      await backupPass();
      const f = latestOf(stub, path); after = f ? unitNames(JSON.parse(f.text)) : null;
    } finally { backupTestOff(stub); }
    record(N, !!before && before.join() === 'A-182' && on === false && !!after && after.join() === 'A-182',
      'before the clear SharePoint listed ' + JSON.stringify(before) + '; the backup after the clear on=' + on + '; after turning it on again SharePoint lists ' + JSON.stringify(after));
  }

  // T183 — the Panel ID read top to bottom; "MCC3"; a label with no ID says so
  async function t183_panelIdReadTopToBottom() {
    const N = 'T183 the Panel / MCC ID scan reads the label top to bottom whatever order OCR gives its lines (one row left to right), splits "MCC3", and says so when the label has no ID';
    const cases = [
      [[{ text: '120/208V 3PH', x: 0.1, y: 0.2, h: 0.1 }, { text: 'LP-1A', x: 0.1, y: 0.5, h: 0.1 }, { text: 'PANEL', x: 0.1, y: 0.8, h: 0.1 }], 'LP-1A'],
      [[{ text: 'LP-1A', x: 0.5, y: 0.805, h: 0.1 }, { text: 'PANEL', x: 0.1, y: 0.8, h: 0.1 }, { text: '480V', x: 0.1, y: 0.4, h: 0.1 }], 'LP-1A'],
      [[{ text: 'MCC3', x: 0.1, y: 0.5, h: 0.1 }], '3'],
      [[{ text: 'PNL1A', x: 0.1, y: 0.5, h: 0.1 }], '1A'],
      [[{ text: 'MCCB-12', x: 0.1, y: 0.5, h: 0.1 }], 'MCCB-12'],
    ];
    const got = cases.map(([b]) => pickLocationIdFromScan(b.map(x => x.text).join('\n'), b));
    await resetAppState();
    fillForm('Pump-183'); sources[0].location = 'Panel'; renderSources();
    const realCap = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: Object.assign({}, (realCap && realCap.Plugins) || {}, {
      Camera: { getPhoto: async () => ({ base64String: 'AAAA' }) },
      TextRecognition: { recognizeText: async () => ({ text: 'PANEL', blocks: [{ text: 'PANEL', x: 0.1, y: 0.5, h: 0.1 }] }) },
    }) };
    let msgs = [];
    try { msgs = await withToasts(async () => { await scanTextToField('src_locid_0', 'locationId'); }); }
    finally { window.Capacitor = realCap; }
    record(N, got.join('|') === cases.map(c => c[1]).join('|') && msgs.some(m => /no ID on it/.test(m)) && sources[0].location === 'Panel',
      'picked ' + JSON.stringify(got) + '; a label with only the word said ' + JSON.stringify(msgs) + '; location still ' + JSON.stringify(sources[0].location));
  }

  // T184 — the same sign-in coming back twice is not an error
  async function t184_aSecondReturnLinkIsNotAnError() {
    const N = 'T184 the iPad sign-in coming back a second time (the page\'s link, then its button) keeps the pass and shows no "not started here" warning';
    await resetAppState();
    const verifier = 'V'.repeat(43);
    const stub = backupStub({ verifier });
    let first = null, second = null, pass = '', msgs = [];
    try {
      Object.assign(backupCfg, { on: true, user: '', pass: '', passExpires: '' });
      _backupPkce = { verifier, at: Date.now() };
      msgs = await withToasts(async () => {
        first = await finishBackupSignIn('lotocollector://backup-link?code=c1.a.b&user=tech');
        second = await finishBackupSignIn('lotocollector://backup-link?code=c1.a.b&user=tech');
      });
      pass = backupCfg.pass;
    } finally { backupTestOff(stub); }
    record(N, first === true && second === false && pass === 'v1.test.pass' && !msgs.some(m => /not started here/.test(m)),
      'first ' + first + ', second ' + second + ', pass kept=' + (pass === 'v1.test.pass') + '; said ' + JSON.stringify(msgs));
  }

  // T185 — marks placed while the source changed shape are not saved against the new one
  async function t185_marksPlacedForAnOldShapeAreNotSaved() {
    const N = 'T185 valve marks placed while the source changed shape (an In/Out pair became one kind of valve) are not saved against the new shape — the tech is told to mark again; an unchanged source keeps both';
    await resetAppState();
    fillFormNoSources('VM-185');
    sources.push(Object.assign(mkSrc('Geothermal Water In/Out'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    sources.push(Object.assign(mkSrc('Geothermal Water In/Out'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }));
    renderSources();
    await captureInto('source_0', await makePhotoFile('vm185a'));
    await captureInto('source_1', await makePhotoFile('vm185b'));
    const slots = valveMarkSlots(sources[0]);
    let msgs = [];
    msgs = await withToasts(async () => {
      openValveMarkDialog('source_0'); await markDialogReady();
      tapMark(0.3, 0.4); tapMark(0.7, 0.4);
      updateSource(0, 'energySource', 'Chemical In');     // the source changes while the dialog is open
      clickById('valveMarkSave');
      openValveMarkDialog('source_1'); await markDialogReady();   // control: nothing changes
      tapMark(0.3, 0.4); tapMark(0.7, 0.4);
      clickById('valveMarkSave');
    });
    const changed = cleanValveMarks(photos.source_0 && photos.source_0.marks).length;
    const control = cleanValveMarks(photos.source_1 && photos.source_1.marks).length;
    record(N, slots === 2 && changed === 0 && control === 2 && msgs.some(m => /changed while you were marking/.test(m)),
      'slots when opened ' + slots + '; marks kept after the change ' + changed + ' (source now ' + sources[0].energySource + ', ' + valveMarkSlots(sources[0]) + ' slot(s)); control kept ' + control + '; said ' + JSON.stringify(msgs));
  }

  // ---------- write-once (build 102, the high review) ----------------------------
  // T186 — a whole day's history: every change a new snapshot, nothing replaced
  async function t186_nothingOnSharePointIsEverReplaced() {
    const N = 'T186 nothing on SharePoint is ever replaced: each change to a day (saved, on the form, deleted, emptied, sent again, cleared and collected again) goes up as a new snapshot beside the earlier ones — the device never even tries to write different bytes under a name already there';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('A-186'); await captureInto('equip_main', await makePhotoFile('t186a')); saveEntry();
    const folder = 'Atlanta/' + localDateStr(new Date()), tag = getCollectorTag();
    const stub = backupStub();
    backupTestOn();
    const del = async (name) => { await withDialogs({ confirm: true }, async () => { deleteSaved(savedEquipment.findIndex(e => e.equipName === name)); await sleep(300); }); await backupPass(); };
    let history = [], wips = 0, bare = [], replaced = [], alreadyThere = 0, againSent = 0, after = null, newTag = '';
    try {
      await backupPass();                                                                        // [A]
      fillForm('B-186'); await captureInto('equip_main', await makePhotoFile('t186b'));
      await sleep(300); await backupPass();                                                      // B on the form
      saveEntry(); await sleep(300); await backupPass();                                        // [A, B]
      await del('A-186');                                                                        // [B]
      await del('B-186');                                                                        // []
      const n0 = stub.posts.length;
      await withDialogs({ confirm: true }, async () => { backupEverythingAgain(); await sleep(50); await backupPass(); });
      againSent = stub.posts.slice(n0).filter(x => x.method === 'POST').length;
      await withDialogs({ confirm: true }, async () => { clearAllData(); await sleep(300); });
      Object.assign(backupCfg, { on: true, user: 'tech@hgsengineeringinc.com', pass: 'v1.test.pass', passExpires: new Date(Date.now() + 86400000).toISOString() });
      _backupListTrusted = true;
      setHospitalCode('Atlanta');
      fillForm('A-186'); saveEntry(); await sleep(300); await backupPass();                    // a new A, the same day and name
      newTag = getCollectorTag();                                                               // (the clear gave the device a new id)
      after = unitNames(unitsFile(stub, folder));
      const keys = Array.from(stub.files.keys()).sort();
      history = keys.filter(k => k.startsWith(folder + '/units_' + tag + '/')).map(k => unitNames(JSON.parse(stub.files.get(k).text)).join('+') || '(none)');
      wips = keys.filter(k => k.startsWith(folder + '/inprogress_' + tag + '/')).length;
      bare = stub.posts.filter(x => x.method === 'POST' && /^(units|photos|inprogress)_[^/]+\.(json|csv)$/.test(x.file || '')).map(x => x.file);
      replaced = stub.overwrites.filter(o => !o.same).map(o => o.path);
      alreadyThere = stub.overwrites.filter(o => o.same).length;
    } finally { backupTestOff(stub); }
    const want = 'A-186 → A-186+B-186 → B-186 → (none)' + (newTag === tag ? ' → A-186' : '');
    record(N, history.join(' → ') === want && wips >= 2 && bare.length === 0 && replaced.length === 0 && againSent > 0 && alreadyThere > 0 && !!after && after.join() === 'A-186',
      'the day\'s unit snapshots: ' + history.join(' → ') + ' (want ' + want + '), all still there after the clear; collected again as ' + newTag + ': ' + JSON.stringify(after)
      + '; form snapshots ' + wips + '; files sent under a plain day-file name ' + JSON.stringify(bare)
      + '; tried to replace ' + JSON.stringify(replaced) + '; "Send everything again" sent ' + againSent + ', ' + alreadyThere + ' found already there');
  }

  // T187 — two exports the same day keep both ZIPs and both sheets
  async function t187_twoExportsTheSameDayKeepBoth() {
    const N = 'T187 two Export to SharePoint runs on the same day each land under their own name — the second never replaces the first ZIP or Information Sheet (and a name SharePoint already holds is refused, not replaced)';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Pump-187a'); await captureInto('equip_main', await makePhotoFile('t187a')); saveEntry();
    const runCloud = async () => {
      const real = { c: window.confirm, a: window.alert, ch: window.__askChoiceAuto };
      window.confirm = () => true; window.alert = () => {};
      window.__askChoiceAuto = (o) => (o && o.id === 'export-blank-energy') ? 'export' : ((o && o.defaultValue) || 'cancel');
      try {
        showExportDialog();
        document.getElementById('exportDateFilter').value = 'all'; populateExportFacilityFilter();
        document.getElementById('exportFacilityFilter').value = 'all';
        document.getElementById('photoSeqStart').value = '1';
        return await withToasts(async () => { await runCombinedExport({ toSharePoint: true }); });
      } finally { window.confirm = real.c; window.alert = real.a; window.__askChoiceAuto = real.ch; }
    };
    const stub = backupStub();
    backupTestOn();
    let m1 = [], m2 = [], zips = [], sheets = [], replaced = [], dupErr = '';
    const race = { err: '', ms: -1, kept: false };
    try {
      m1 = await runCloud();
      fillForm('Pump-187b'); await captureInto('equip_main', await makePhotoFile('t187b')); saveEntry();
      m2 = await runCloud();
      const keys = Array.from(stub.files.keys());
      zips = keys.filter(k => /\/export\/FieldExport_[^/]*\.zip$/.test(k));
      sheets = keys.filter(k => /\/export\/Information_Sheet_[^/]*\.xlsx$/.test(k));
      replaced = stub.overwrites.filter(o => !o.same).map(o => o.path);
      // a name already there: refused, and the file there is untouched
      const at = zips[0], before = at && stub.files.get(at).bytes.length;
      try { await backupUploadBig(new Blob([new Uint8Array(1000)]), at.slice(0, at.indexOf('/export/')), at.slice(at.indexOf('/export/') + 1)); } catch (e) { dupErr = e.message; }
      dupErr += at && stub.files.get(at).bytes.length === before ? '' : ' — AND THE FILE CHANGED';
      // the name appears while the pieces go (another device): the last piece is refused — said at once, the other file untouched
      const folder = at.slice(0, at.indexOf('/export/')), realSession = backupTransport.session;
      backupTransport.session = async (url, method, bytes, range) => {
        const s = stub.sessions.get(url);
        if (s && method === 'PUT' && s.path === 'export/race.zip' && !stub.files.has(folder + '/export/race.zip')) stub.files.set(folder + '/export/race.zip', { bytes: new Uint8Array(7) });
        return realSession(url, method, bytes, range);
      };
      const t0 = Date.now();
      try { await backupUploadBig(new Blob([new Uint8Array(1000)]), folder, 'export/race.zip'); } catch (e) { race.err = e.message; }
      race.ms = Date.now() - t0; race.kept = stub.files.get(folder + '/export/race.zip').bytes.length === 7;
    } finally { backupTestOff(stub); }
    const sent = (m) => m.some(x => /In SharePoint/.test(x) && !/not sent/.test(x));
    record(N, sent(m1) && sent(m2) && zips.length === 2 && sheets.length === 2 && replaced.length === 0 && /already holds/.test(dupErr) && !/CHANGED/.test(dupErr)
      && /already holds race\.zip/.test(race.err) && race.ms >= 0 && race.ms < 3000 && race.kept,
      'first export sent=' + sent(m1) + ', second sent=' + sent(m2) + '; ZIPs ' + JSON.stringify(zips.map(z => z.split('/').pop())) + '; sheets ' + JSON.stringify(sheets.map(z => z.split('/').pop()))
      + '; names the exports tried to replace ' + JSON.stringify(replaced.map(z => z.split('/').pop())) + '; sending over an existing ZIP on purpose said "' + dupErr + '"'
      + '; a name that appeared mid-upload: said "' + race.err + '" after ' + race.ms + ' ms, the other file kept=' + race.kept);
  }

  // T188 — the unit on the form: a snapshot at most every 5 minutes
  async function t188_theFormIsSnapshottedAtMostEveryFiveMinutes() {
    const N = 'T188 the unit on the form goes up as a snapshot at most every 5 minutes while the same unit keeps changing — typing never floods SharePoint with files; the latest still goes once the 5 minutes are up (the badge counts it waiting until then, never "backed up"); a saved unit, the emptied form and the next unit never wait';
    await resetAppState();
    setHospitalCode('Atlanta');
    fillForm('Form-188');
    const folder = 'Atlanta/' + localDateStr(new Date()), wipLogical = folder + '/inprogress_' + getCollectorTag() + '.json';
    const stub = backupStub();
    backupTestOn(); delete window.__backupWipEvery;                                             // the real spacing
    const snaps = () => Array.from(stub.files.keys()).filter(k => k.startsWith(wipLogical.replace(/\.json$/, '/'))).length;
    let s1 = 0, s2 = 0, s3 = 0, latest = null, units = null, badgeHeld = '', badgeAfter = '', afterSave = null, nextUnit = null;
    const badge = () => (document.getElementById('backupBadge') || {}).textContent || '';
    try {
      await backupPass(); s1 = snaps();                                                         // the first: at once
      for (const t of ['Form-188 a', 'Form-188 ab', 'Form-188 abc']) { document.getElementById('equipName').value = t; autoSaveCurrent(); await sleep(150); await backupPass(); }
      s2 = snaps();                                                                             // inside 5 minutes: no more
      badgeHeld = badge();                                                                      // ...and the badge says so
      const d = _backupDays.get(wipLogical);
      _backupDays.set(wipLogical, Object.assign({}, d, { at: d.at - BACKUP_WIP_EVERY - 1000 }));  // 5 minutes on
      await backupPass(); s3 = snaps(); badgeAfter = badge();
      latest = ((wipFile(stub, folder) || {}).unit || {}).equipName;
      document.getElementById('equipName').value = 'Form-188 saved'; saveEntry(); await sleep(300); await backupPass();
      units = unitNames(unitsFile(stub, folder));
      afterSave = { wip: (wipFile(stub, folder) || {}).unit, badge: badge() };   // the form emptied: goes at once, no wait
      fillForm('Form-188 next'); await sleep(300); await backupPass();
      nextUnit = ((wipFile(stub, folder) || {}).unit || {}).equipName;          // a new unit on the form: its first snapshot at once
    } finally { backupTestOff(stub); }
    record(N, s1 === 1 && s2 === 1 && s3 === 2 && latest === 'Form-188 abc' && !!units && units.join() === 'Form-188 saved'
      && /1 waiting/.test(badgeHeld) && /backed up/.test(badgeAfter)
      && !!afterSave && afterSave.wip === null && /backed up/.test(afterSave.badge) && nextUnit === 'Form-188 next',
      'form snapshots: first pass ' + s1 + ', after three edits inside 5 minutes ' + s2 + ' (badge ' + JSON.stringify(badgeHeld) + '), 5 minutes on ' + s3
      + ' (latest ' + JSON.stringify(latest) + ', badge ' + JSON.stringify(badgeAfter) + '); saved at once: ' + JSON.stringify(units)
      + ' — the emptied form went at once (' + JSON.stringify(afterSave) + '), the next unit\'s first snapshot too (' + JSON.stringify(nextUnit) + ')');
  }

  // T189 — a scan never replaces a typed value without asking
  async function t189_aScanAsksBeforeReplacingATypedValue() {
    const N = 'T189 a scan never replaces a value already typed without asking — declined, the typed value stays (the Panel ID too); an empty field, or the same text, is filled without a question';
    await resetAppState();
    fillForm('Pump-189');
    sources[0].location = 'Panel LP-9'; renderSources();
    const realCap = window.Capacitor; let reads = [];
    window.Capacitor = { isNativePlatform: () => true, Plugins: Object.assign({}, (realCap && realCap.Plugins) || {}, {
      Camera: { getPhoto: async () => ({ base64String: 'AAAA' }) },
      TextRecognition: { recognizeText: async () => reads.shift() },
    }) };
    const scan = async (id, pick, read, answer) => { reads = [read]; const r = await withDialogs({ confirm: answer }, async () => { await scanTextToField(id, pick); }); return r.log.filter(m => /^\[CONFIRM\]/.test(m)); };
    const val = (id) => document.getElementById(id).value;
    const r = {};
    try {
      const declined = await scan('equipName', undefined, { text: 'AHU-7' }, false);
      r.declined = { asked: declined.some(m => /Pump-189/.test(m) && /AHU-7/.test(m)), value: val('equipName') };
      await scan('equipName', undefined, { text: 'AHU-7' }, true);
      r.accepted = val('equipName');
      r.same = (await scan('equipName', undefined, { text: 'AHU-7' }, false)).length;
      document.getElementById('equipLotoId').value = '';
      r.empty = { asked: (await scan('equipLotoId', undefined, { text: 'LOTO-12' }, false)).length, value: val('equipLotoId') };
      const panel = await scan('src_locid_0', 'locationId', { text: 'PANEL\nLP-1A', blocks: [{ text: 'PANEL' }, { text: 'LP-1A' }] }, false);
      r.panel = { asked: panel.some(m => /LP-9/.test(m) && /LP-1A/.test(m)), location: sources[0].location };
    } finally { window.Capacitor = realCap; }
    record(N, r.declined && r.declined.asked && r.declined.value === 'Pump-189' && r.accepted === 'AHU-7' && r.same === 0
      && r.empty && r.empty.asked === 0 && r.empty.value === 'LOTO-12' && r.panel && r.panel.asked && r.panel.location === 'Panel LP-9', JSON.stringify(r));
  }

  // T190 — a day build 101 backed up gets its first snapshot after the update
  async function t190_aDayBackedUpByBuild101GetsItsFirstSnapshot() {
    const N = 'T190 after the update from build 101, a day build 101 backed up (under its one plain name) and unchanged since gets its first snapshot — the newest snapshot is the current list for every day; the plain file is left as it was';
    await resetAppState();
    setHospitalCode('Atlanta');
    const a = mkEntry('A-190'); a.hospitalCode = 'Atlanta'; savedEquipment.push(a); await saveAll();
    const folder = 'Atlanta/' + getEntryDate(a), tag = getCollectorTag();
    const stub = backupStub();
    backupTestOn();
    let snap = null, plain = false, tried = [], left = [];
    try {
      // what build 101 left: each day file under its plain name, confirmed in the device's records as { h, sha }
      for (const f of backupDayFiles(backupPhotoList())) {
        const bytes = new TextEncoder().encode(f.text);
        stub.files.set(f.folder + '/' + f.path, { bytes, text: f.text });
        _backupDays.set(f.folder + '/' + f.path, { h: backupTextHash(f.text), sha: await sha256HexOfBytes(bytes) });
        left.push(f.path);
      }
      await backupPass();
      snap = unitsFile(stub, folder);
      plain = stub.files.has(folder + '/units_' + tag + '.json');
      tried = stub.overwrites.map(o => o.path);
    } finally { backupTestOff(stub); }
    record(N, left.length > 0 && !!snap && unitNames(snap).join() === 'A-190' && plain && tried.length === 0,
      'build 101 left ' + JSON.stringify(left) + '; after one pass the newest snapshot lists ' + JSON.stringify(snap && unitNames(snap)) + '; the plain file still there=' + plain + '; tried to replace ' + JSON.stringify(tried));
  }

  // T191 — new collector initials never empty the old initials' files
  async function t191_aNewCollectorTagNeverEmptiesTheOldTagsFiles() {
    const N = 'T191 changing the collector initials (or losing the device id) never writes the old initials\' day files empty — their newest snapshot still lists the units, which go on under the new initials';
    await resetAppState();
    setHospitalCode('Atlanta');
    let realTag = null; try { realTag = localStorage.getItem('loto_collector_tag'); } catch (e) {}
    try { localStorage.setItem('loto_collector_tag', 'AB'); } catch (e) {}
    const a = mkEntry('A-191'); a.hospitalCode = 'Atlanta'; savedEquipment.push(a); await saveAll();
    const folder = 'Atlanta/' + getEntryDate(a), oldTag = getCollectorTag();
    const stub = backupStub();
    backupTestOn();
    let before = null, oldAfter = null, newAfter = null, newTag = '', emptied = [];
    try {
      await backupPass();
      before = unitNames(unitsFile(stub, folder));
      try { localStorage.setItem('loto_collector_tag', 'CD'); } catch (e) {}
      newTag = getCollectorTag();
      await backupPass();
      const f = latestOf(stub, folder + '/units_' + oldTag + '.json'); oldAfter = f ? unitNames(JSON.parse(f.text)) : null;
      newAfter = unitNames(unitsFile(stub, folder));
      emptied = Array.from(stub.files.keys()).filter(k => k.indexOf('_' + oldTag + '/') > 0 && /"units": \[\]|"unit": null/.test(stub.files.get(k).text || ''));
    } finally {
      backupTestOff(stub);
      try { if (realTag == null) localStorage.removeItem('loto_collector_tag'); else localStorage.setItem('loto_collector_tag', realTag); } catch (e) {}
    }
    record(N, !!before && before.join() === 'A-191' && !!oldAfter && oldAfter.join() === 'A-191' && !!newAfter && newAfter.join() === 'A-191' && oldTag !== newTag && emptied.length === 0,
      'as ' + oldTag + ': ' + JSON.stringify(before) + '; after the change to ' + newTag + ' the old newest snapshot lists ' + JSON.stringify(oldAfter) + ', the new one ' + JSON.stringify(newAfter)
      + '; empty snapshots under the old initials: ' + JSON.stringify(emptied));
  }

  // T192 — with the backup off, Settings shows only its switch (build 103)
  async function t192_theBackupsButtonsShowOnlyWhileItIsOn() {
    const N = 'T192 with the SharePoint backup off, Settings shows only its switch and "Off" — no Sign in, Sign out, Test or Send everything again (they appear once it is turned on and go again when it is turned off); where the backup can\'t work, the switch and why';
    await resetAppState();
    const vis = (el) => !!el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
    const state = () => {
      const who = document.getElementById('backupWho');
      return { actions: vis(document.getElementById('backupActions')), signIn: vis(document.getElementById('backupSignInBtn')),
        signOut: vis(document.getElementById('backupSignOutBtn')), who: vis(who) ? who.textContent : '', status: (document.getElementById('backupStatus') || {}).textContent || '' };
    };
    const realAvail = window.backupAvailable;
    let off = null, onState = null, offAgain = null, unavailable = null;
    try {
      Object.assign(backupCfg, { on: false, user: '', pass: '', passExpires: '' });
      showSettings(); await sleep(100);
      off = state();
      await withToasts(async () => { setBackupOn(true); await sleep(50); });
      onState = state();
      setBackupOn(false); await sleep(50);
      offAgain = state();
      closeSettings();
      window.backupAvailable = () => false;                   // e.g. the GitHub Pages copy
      showSettings(); await sleep(100);
      unavailable = state();
      closeSettings();
    } finally { window.backupAvailable = realAvail; backupTestOff(null); }
    const hidden = (x) => !!x && !x.actions && !x.signIn && !x.signOut;
    record(N, hidden(off) && off.who === '' && /^Off\./.test(off.status)
      && !!onState && onState.actions && onState.signIn && /Not signed in/.test(onState.who) && !/^Off\./.test(onState.status)
      && hidden(offAgain) && offAgain.who === ''
      && hidden(unavailable) && /not in this copy/.test(unavailable.who),
      'off: ' + JSON.stringify(off) + '; turned on: ' + JSON.stringify(onState) + '; off again: ' + JSON.stringify(offAgain) + '; unavailable: ' + JSON.stringify(unavailable));
  }

  // T193 — Save & New warns about a unit without its Main Photo (build 104)
  async function t193_aUnitWithoutItsMainPhotoIsFlagged() {
    const N = 'T193 Save & New warns when the Main Photo is missing, even with everything else filled in, and when it did not save — never about the Data Plate or EE Number photos; with the Main Photo taken it saves at once';
    await resetAppState();
    fillForm('EF-193');
    document.getElementById('equipType').value = 'Exhaust Fan';
    filterTemplateDropdown('Exhaust Fan');
    document.getElementById('equipTemplate').value = 'Exhaust Fan';
    sources.forEach(ensureSourceId);
    renderSources();
    await captureInto('source_0', await makePhotoFile('t193-src'));
    const setup = getEquipType() + ' / ' + getTemplate() + ' / ' + getBuilding() + ' / source photo ' + sourcePhotoTaken(0);
    const overlayText = () => { const o = document.getElementById('incompleteWarningOverlay'); return o ? o.textContent.replace(/\s+/g, ' ').trim() : ''; };
    const named = 'EF-193';
    // everything but the Main Photo (the Data Plate and EE Number slots are empty too)
    const noMain = collectIncompleteFields();
    let warnNoMain = '';
    await withDialogs({ confirm: true }, async () => { saveAndNew(); warnNoMain = overlayText(); closeIncompleteWarning(); await sleep(100); });
    const savedEarly = savedEquipment.some(e => e.equipName === named);
    // a Main Photo whose save failed ("NOT SAVED" on the slot) is still missing
    const realStore = window.storePhotoBytes;
    window.storePhotoBytes = async () => ({ ok: false, where: 'none' });
    try { await withDialogs({}, async () => { handlePhoto({ files: [await makePhotoFile('t193-bad')] }, 'equip_main'); await waitForPhotoWritesIdle(15000); await sleep(400); }); }
    finally { window.storePhotoBytes = realStore; }
    const failedRef = !!(photos.equip_main && photos.equip_main.dbKey && photos.equip_main.unsaved);
    const unsavedMain = collectIncompleteFields();
    // the Main Photo taken: nothing flagged, Save & New saves without asking
    const main = await captureInto('equip_main', await makePhotoFile('t193-main'));
    const withMain = collectIncompleteFields();
    let warnWithMain = '';
    await withDialogs({ confirm: true }, async () => { saveAndNew(); warnWithMain = overlayText(); closeIncompleteWarning(); await sleep(200); });
    const saved = savedEquipment.find(e => e.equipName === named);
    const savedMain = !!(saved && saved.photos && saved.photos.equip_main && saved.photos.equip_main.dbKey === main.dbKey);
    const only = (list) => JSON.stringify(list) === JSON.stringify(['Main info — Main Photo']);
    record(N, setup === 'Exhaust Fan / Exhaust Fan / Main / source photo true'
      && only(noMain) && /1 item is still missing/.test(warnNoMain) && /Main info — Main Photo/.test(warnNoMain) && !savedEarly
      && failedRef && only(unsavedMain)
      && withMain.length === 0 && warnWithMain === '' && savedMain,
      'setup ' + setup + '; without the Main Photo flagged ' + JSON.stringify(noMain) + ', warning "' + warnNoMain + '", saved anyway=' + savedEarly
      + '; Main Photo not saved (ref unsaved=' + failedRef + ') flagged ' + JSON.stringify(unsavedMain)
      + '; with it flagged ' + JSON.stringify(withMain) + ', warning "' + warnWithMain + '", saved with its Main Photo=' + savedMain);
  }

  // T194 — one Device ID per unit when Quantity is 2+ (build 106)
  async function t194_eachUnitGetsItsOwnDeviceId() {
    const N = 'T194 Quantity 2+ shows one Device ID box per unit (unit 1 first, In before Out) and saves them as one "a; b" string; a pasted list fills the boxes; a typed space survives; Quantity 1 keeps the single box; Split 1 gives the split-off source the last unit\'s tag';
    await resetAppState();
    fillForm('AHU-194');
    sources.length = 0;
    sources.push({ energySource: 'Electrical 480V', deviceType: 'VFD', quantity: 2, location: 'On Wall', verification: '', duplicate: 'No' });
    sources.push({ energySource: 'CHW In/Out', deviceType: 'Butterfly Valve', quantity: 2, location: 'Front of Equipment', verification: '', duplicate: 'No' });
    sources.forEach(ensureSourceId);
    renderSources();
    const box = (s, k) => document.getElementById('src_deviceId_' + s + '_' + k);
    const label = (s, k) => { const b = box(s, k); const sp = b && b.parentElement.querySelector('span'); return sp ? sp.textContent.replace(/\s+/g, ' ').trim() : ''; };
    const type = (s, k, v) => { const b = box(s, k); b.value = v; b.dispatchEvent(new Event('input', { bubbles: true })); };
    const labels = [label(0, 0), label(0, 1), label(1, 0), label(1, 1)].join(' | ');
    const single = !document.getElementById('src_deviceId_0');
    type(0, 0, '3-SF-50'); const one = sources[0].deviceId;
    type(0, 1, '3-RF-50'); const both = sources[0].deviceId;
    type(1, 0, 'BV-1; BV-2'); await sleep(100);
    const pasted = sources[1].deviceId + ' / boxes ' + [box(1, 0) && box(1, 0).value, box(1, 1) && box(1, 1).value].join(',');
    type(1, 1, 'Pump '); const typing = sources[1].deviceId;
    sources[1].quantity = 1; renderSources();
    const qty1 = !!document.getElementById('src_deviceId_1') && !box(1, 0);
    sources[1].quantity = 2; renderSources();
    await withDialogs({ confirm: true }, async () => { splitSource(0); await sleep(300); });
    const split = sources.slice(0, 2).map(x => (x.quantity || 1) + ':' + (x.deviceId || '')).join(' / ');
    record(N, labels === 'Unit 1 #1.1 | Unit 2 #1.2 | In #2 | Out #2' && single
      && one === '3-SF-50' && both === '3-SF-50; 3-RF-50'
      && pasted === 'BV-1; BV-2 / boxes BV-1,BV-2' && typing === 'BV-1; Pump '
      && qty1 && split === '1:3-SF-50 / 1:3-RF-50',
      'labels ' + labels + '; single box gone=' + single + '; typed ' + JSON.stringify(one) + ' then ' + JSON.stringify(both)
      + '; pasted ' + pasted + '; typing a space ' + JSON.stringify(typing) + '; Quantity 1 single box=' + qty1 + '; after Split 1 ' + split);
  }

  // T195 — no Kinetic on pumps; a fan unit's Kinetic row names its fan (build 107)
  async function t195_pumpsGetNoKineticAndFansNameTheirFan() {
    const N = 'T195 pump types and pump templates add no Kinetic (a custom "Booster Pump" too); an AHU template starts its Kinetic row "At Supply Fan" and a second one added by hand "At Return Fan"; an Exhaust Fan starts "At Exhaust Fan"; a Unit Heater keeps "On Equipment"; the location list offers Exhaust and Relief fans';
    await resetAppState();
    const pumpTypes = ['CHW Pump', 'Heating HW Pump', 'Domestic HW Pump', 'Domestic Water Pump', 'Condensate Pump', 'Chemical Feed Pump', 'Vacuum Pump', 'Chemical Pump'];
    const pumpTemplates = ['Medical Vacuum', 'Lab Vacuum', 'Chilled Water Pump', 'Heating Hot Water Pump', 'Standard Pump', 'Fire Pump', 'Feedwater Pump', 'Glycol Pump'];
    const typeK = pumpTypes.filter(t => (EQUIPMENT_AUTO_SOURCES[t] || []).some(x => x.energySource === 'Kinetic'));
    const tmplK = pumpTemplates.filter(t => (TEMPLATE_AUTO_SOURCES[t] || []).some(x => x.energySource === 'Kinetic'));
    const kinetic = () => sources.filter(x => x.energySource === 'Kinetic').map(x => x.location).join(',');
    // a custom pump type picks the Standard Pump template
    fillFormNoSources('BP-195');
    document.getElementById('equipType').value = '** New Equipment Type **';
    document.getElementById('equipTypeCustom').value = 'Booster Pump';
    await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
    closeAllPrompts();
    const custom = getTemplate() + ': ' + sources.map(x => x.energySource).join(', ');
    // an AHU template; then a second Kinetic row added by hand
    fillFormNoSources('AHU-195');
    document.getElementById('equipType').value = 'Air Handler'; filterTemplateDropdown('Air Handler');
    document.getElementById('equipTemplate').value = 'AHU - HHW';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    const ahu = kinetic();
    addSource();
    handleEnergySourceChange(sources.length - 1, 'Kinetic');
    const ahuTwo = kinetic();
    // an Exhaust Fan
    fillFormNoSources('EF-195');
    document.getElementById('equipType').value = 'Exhaust Fan'; filterTemplateDropdown('Exhaust Fan');
    document.getElementById('equipTemplate').value = 'Exhaust Fan';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    const ef = kinetic();
    // a non-fan unit keeps the old default, by hand too
    fillFormNoSources('UH-195');
    document.getElementById('equipType').value = 'Unit Heater'; filterTemplateDropdown('Unit Heater');
    addSource();
    handleEnergySourceChange(sources.length - 1, 'Kinetic');
    const uh = kinetic();
    const offered = ['At Supply Fan', 'At Return Fan', 'At Exhaust Fan', 'At Relief Fan'].every(l => DATA.locations.includes(l));
    record(N, typeK.length === 0 && tmplK.length === 0
      && /^Standard Pump: /.test(custom) && !/Kinetic/.test(custom) && /Electrical/.test(custom)
      && ahu === 'At Supply Fan' && ahuTwo === 'At Supply Fan,At Return Fan' && ef === 'At Exhaust Fan' && uh === 'On Equipment' && offered,
      'pump types with Kinetic ' + JSON.stringify(typeK) + '; pump templates with Kinetic ' + JSON.stringify(tmplK) + '; custom ' + custom
      + '; AHU ' + ahu + ' then ' + ahuTwo + '; Exhaust Fan ' + ef + '; Unit Heater ' + uh + '; fan locations offered=' + offered);
  }

  // T196 — a missing Electrical source is flagged only where the kind always has one (build 107)
  async function t196_aMissingElectricalSourceIsFlaggedOnlyWhereExpected() {
    const N = 'T196 Save & New flags "no Electrical source" for an Air Handler, an electric Condensate Return Unit, a steam Domestic Water Heater and a custom "Booster Pump" — not for a steam Condensate Return Unit, a Heat Exchanger, a DA Tank or a custom "Expansion Tank"; any voltage or a linked Electrical source clears it, Stored Electrical Energy does not; a blank type is flagged as before, without the electrical item; the warning shows and nothing saves';
    await resetAppState();
    const valve = () => ({ energySource: 'LPS 10 PSI', deviceType: 'Gate Valve', quantity: 1, location: 'Above Equipment', verification: 'Temp Only - Hot', duplicate: 'No' });
    const elec = (v, extra) => Object.assign({ energySource: 'Electrical ' + v, deviceType: 'Disconnect', quantity: 1, location: 'Panel LP-1', verification: 'Controls', duplicate: 'No' }, extra || {});
    const cap = () => ({ energySource: 'Stored Electrical Energy', deviceType: 'Capacitor', quantity: 1, location: 'At Capacitor Bank', verification: '', duplicate: 'No' });
    const setUnit = (type, template, srcs) => {
      fillFormNoSources('U-196');
      const known = DATA.equipmentTypes.includes(type);
      document.getElementById('equipType').value = known ? type : (type ? '** New Equipment Type **' : '');
      document.getElementById('equipTypeCustom').value = known ? '' : type;
      filterTemplateDropdown(known ? type : '');
      document.getElementById('equipTemplate').value = template;
      sources = srcs; sources.forEach(ensureSourceId); renderSources();
    };
    const flagged = () => collectIncompleteFields().filter(m => /^Energy sources/.test(m));
    const cases = [
      ['Air Handler', 'AHU - Steam', () => [valve()], true],
      ['Condensate Return Unit', 'Condensate Return Unit', () => [valve()], true],
      ['Condensate Return Unit', 'Condensate Return Unit - Steam', () => [valve()], false],
      ['Domestic Water Heater', 'Water Heater - Steam', () => [valve()], true],
      ['Heat Exchanger', 'Heat Exchanger - Steam', () => [valve()], false],
      ['DA Tank', '', () => [valve()], false],
      ['Booster Pump', 'Standard Pump', () => [valve()], true],
      ['Expansion Tank', '', () => [valve()], false],
      ['Air Handler', 'AHU - Steam', () => [valve(), elec('480V')], false],
      ['Air Handler', 'AHU - Steam', () => [valve(), elec('208V', { linkedTo: 'other-unit-source' })], false],
      ['Condensing Unit', 'Condensing Unit', () => [cap()], true],
    ];
    const wrong = [];
    for (const [type, template, srcs, expect] of cases) {
      setUnit(type, template, srcs());
      const f = flagged();
      const want = expect ? ['Energy sources — no Electrical source (expected for ' + type + ')'] : [];
      if (JSON.stringify(f) !== JSON.stringify(want) || getTemplate() !== template) wrong.push(type + ' / ' + getTemplate() + ': ' + JSON.stringify(f));
    }
    // a blank type: the old Equipment Type item, never the electrical one
    setUnit('', '', [valve()]);
    const blank = collectIncompleteFields();
    const blankOk = blank.includes('Main info — Equipment Type') && !blank.some(m => /^Energy sources/.test(m));
    // the dialog lists it, and "Go back" saves nothing
    setUnit('Air Handler', 'AHU - Steam', [valve()]);
    const overlayText = () => { const o = document.getElementById('incompleteWarningOverlay'); return o ? o.textContent.replace(/\s+/g, ' ').trim() : ''; };
    let warn = '';
    await withDialogs({ confirm: true }, async () => { saveAndNew(); warn = overlayText(); closeIncompleteWarning(); await sleep(100); });
    const saved = savedEquipment.some(e => e.equipName === 'U-196');
    record(N, wrong.length === 0 && blankOk && /Energy sources — no Electrical source \(expected for Air Handler\)/.test(warn) && !saved,
      'wrong cases ' + JSON.stringify(wrong) + '; blank type flagged ' + JSON.stringify(blank) + '; warning "' + warn + '"; saved=' + saved);
  }

  // T197 — Fire Pump is a template of its own (build 108)
  async function t197_firePumpIsItsOwnTemplate() {
    const N = 'T197 a Fire Pump unit picks the new Fire Pump template (its Electrical feed and the suction / discharge lines, no Kinetic) and exports "Fire Pump" as the template on the sheet and in entries.json; a Fire Jockey Pump stays a Standard Pump; a custom "Diesel Fire Pump" gets Fire Pump, a custom "Fire Pump Jockey" and "Booster Pump" Standard Pump; both fire pump kinds still expect an Electrical source';
    await resetAppState();
    const names = () => sources.map(x => x.energySource);
    const pickType = async (name, type) => {
      fillFormNoSources(name);
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = type;
      await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
      closeAllPrompts();
      return { template: getTemplate(), names: names(),
               offered: [...document.getElementById('equipTemplate').options].map(o => o.value).filter(v => v && v !== '** New Template **') };
    };
    const fp = await pickType('FP-197', 'Fire Pump');
    const jockey = await pickType('FJP-197', 'Fire Jockey Pump');
    const shapeOk = (r, template) => r.template === template && r.offered.join() === template
      && r.names.some(n => /^Electrical /.test(n)) && r.names.includes('DW In') && r.names.includes('DW Out')
      && !r.names.some(n => /^Kinetic/.test(n));
    // custom equipment type names
    const custom = async (typed) => {
      fillFormNoSources('C-197');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = '** New Equipment Type **';
      document.getElementById('equipTypeCustom').value = typed;
      await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
      closeAllPrompts();
      return getTemplate();
    };
    const customs = { 'Diesel Fire Pump': await custom('Diesel Fire Pump'), 'Fire Pump Jockey': await custom('Fire Pump Jockey'),
                      'Booster Pump': await custom('Booster Pump') };
    const customOk = customs['Diesel Fire Pump'] === 'Fire Pump' && customs['Fire Pump Jockey'] === 'Standard Pump'
      && customs['Booster Pump'] === 'Standard Pump';
    const elecOk = expectsElectricalSource('Fire Pump', 'Fire Pump') && expectsElectricalSource('Diesel Fire Pump', 'Fire Pump');
    // the export carries the template loto-web stores as the unit's type (an
    // empty form, so the export holds this one unit only)
    await resetAppState();
    const A = mkEntry('Fire Pump 1', { sources: [
      Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect', location: 'FP Controller' }),
      Object.assign(mkSrc('DW In'), { sourceId: genUuid(), deviceType: 'Ball Valve' }),
      Object.assign(mkSrc('DW Out'), { sourceId: genUuid(), deviceType: 'Ball Valve' })] });
    A.equipType = 'Fire Pump'; A.template = 'Fire Pump';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheetTemplates = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => {
        if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheetTemplates.push(String(ws.getRow(row.number + 1).getCell(8).value || ''));
      });
    }
    record(N, shapeOk(fp, 'Fire Pump') && shapeOk(jockey, 'Standard Pump') && customOk && elecOk
      && ((u.entriesJson && u.entriesJson.entries) || []).length === 1 && je.template === 'Fire Pump' && sheetTemplates.join() === 'Fire Pump',
      'Fire Pump ' + JSON.stringify(fp) + '; Fire Jockey Pump ' + JSON.stringify(jockey) + '; custom ' + JSON.stringify(customs)
      + '; expects Electrical=' + elecOk + '; entries.json template "' + je.template + '"; sheet templates ' + JSON.stringify(sheetTemplates));
  }

  // T198 — a saved unit keeps its template when its type's list no longer offers it (build 108)
  async function t198_editKeepsATemplateItsTypeNoLongerOffers() {
    const N = 'T198 a Fire Pump saved on the Standard Pump template before build 108 opens for edit on Standard Pump (Fire Pump offered beside it) and saves back unchanged; Duplicate and a reload mid-edit keep it the same way';
    await resetAppState();
    const A = mkEntry('FP-198', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect', location: 'FP Controller' })] });
    A.equipType = 'Fire Pump'; A.template = 'Standard Pump';
    savedEquipment = [A]; saveAll();
    const sel = () => document.getElementById('equipTemplate');
    const offered = () => [...sel().options].map(o => o.value).filter(v => v && v !== '** New Template **').join(',');
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    const onEdit = sel().value, onEditOffered = offered();
    // a reload mid-edit restores it from the unit in progress
    autoSaveCurrent();
    await sleep(400);
    editingEntry = null; savedEquipment = []; sources = []; photos = {}; miscPhotos = [];   // what a reload loses
    await loadAll();
    const afterReload = sel().value;
    document.getElementById('equipNotes').value = 'edited';
    performSaveAndNew();
    const saved = savedEquipment.find(e => e.id === A.id) || {};
    // Duplicate
    let dupTemplate = null;
    await withDialogs({ confirm: true }, async () => { await executeDuplicate(savedEquipment.indexOf(saved), false); });
    dupTemplate = sel().value;
    record(N, onEdit === 'Standard Pump' && /Fire Pump/.test(onEditOffered) && /Standard Pump/.test(onEditOffered)
      && afterReload === 'Standard Pump' && saved.template === 'Standard Pump' && saved.notes === 'edited' && dupTemplate === 'Standard Pump',
      'on edit "' + onEdit + '" (offered ' + onEditOffered + '); after reload "' + afterReload + '"; saved template "' + saved.template
      + '", notes "' + saved.notes + '"; duplicate "' + dupTemplate + '"');
  }

  // T199 — Lab Vacuum: one unit = the receiver and every pump on it (build 108)
  async function t199_labVacuumRecordsEveryPump() {
    const N = 'T199 a Lab Vacuum unit picks the Lab Vacuum template and asks how many pumps are on the receiver — 3 gives three Disconnect / SW (Hand/Off/Auto) Electrical rows plus the receiver\'s Vacuum Air In ball valve (Gauge/Drain), no Kinetic, no Thermal; the Vacuum Pump type offers Lab Vacuum beside Medical Vacuum; custom "Lab Vac Pump" and "Laboratory Vacuum System" get Lab Vacuum, "Booster Pump" Standard Pump; an Electrical source is expected; the export says "Lab Vacuum"';
    await resetAppState();
    fillFormNoSources('LV-199');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = 'Lab Vacuum';
    let countAsk = '';
    await withDialogs({ confirm: true }, async () => {
      handleEquipTypeChange();
      const volt = !!document.getElementById('templateVoltageOverlay');
      applyTemplateVoltageChoice('480V');
      const o = document.getElementById('electricalCountOverlay');
      countAsk = (volt ? 'voltage asked; ' : 'NO voltage prompt; ') + (o ? o.textContent.replace(/\s+/g, ' ').trim() : 'NO count prompt');
      applyElectricalCountChoice(3);
    });
    closeAllPrompts();
    const template = getTemplate();
    const elec = sources.filter(x => /^Electrical /.test(x.energySource || ''));
    const vac = sources.filter(x => /^Vacuum Air/.test(x.energySource || ''));
    const rows = sources.map(x => [x.energySource, x.deviceType, x.verification].join('/'));
    const shapeOk = template === 'Lab Vacuum' && elec.length === 3
      && elec.every(x => x.energySource === 'Electrical 480V' && x.deviceType === 'Disconnect' && x.verification === 'SW (Hand/Off/Auto)')
      && new Set(elec.map(x => x.sourceId).filter(Boolean)).size === elec.filter(x => x.sourceId).length
      && vac.length === 1 && vac[0].energySource === 'Vacuum Air In' && vac[0].deviceType === 'Ball Valve' && vac[0].verification === 'Gauge/Drain'
      && sources.length === 4 && !sources.some(x => /kinetic|thermal/i.test(x.energySource || ''));
    const askOk = /pumps are on this receiver/i.test(countAsk) && /each one gets its own disconnect/i.test(countAsk);
    // the Vacuum Pump type offers it; the medical template is untouched
    const vpOffers = (EQUIPMENT_TEMPLATE_MAP['Vacuum Pump'] || []).join();
    const medOk = vpOffers === 'Vacuum Pump,Medical Vacuum,Medical Vacuum Pump,Lab Vacuum,Dental Vacuum'   // + Medical Vacuum Pump since build 111, Dental Vacuum since 114
      && (TEMPLATE_AUTO_SOURCES['Medical Vacuum'] || []).map(x => x.energySource).join() === 'Electrical 208V';
    // custom type names
    const custom = async (typed) => {
      fillFormNoSources('C-199');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = '** New Equipment Type **';
      document.getElementById('equipTypeCustom').value = typed;
      await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
      closeAllPrompts();
      return getTemplate();
    };
    const customs = { 'Lab Vac Pump': await custom('Lab Vac Pump'), 'Laboratory Vacuum System': await custom('Laboratory Vacuum System'),
                      'Booster Pump': await custom('Booster Pump') };
    const customOk = customs['Lab Vac Pump'] === 'Lab Vacuum' && customs['Laboratory Vacuum System'] === 'Lab Vacuum'
      && customs['Booster Pump'] === 'Standard Pump';
    const elecOk = expectsElectricalSource('Lab Vacuum', 'Lab Vacuum') && expectsElectricalSource('Vacuum Pump', 'Lab Vacuum');
    // the export (an empty form, so it holds this one unit only)
    await resetAppState();
    const A = mkEntry('Vacuum Pump MVP-01-SB-04', { sources: [
      Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect', location: 'LAB VAC PUMP 1' }),
      Object.assign(mkSrc('Vacuum Air In'), { sourceId: genUuid(), deviceType: 'Ball Valve' })] });
    A.equipType = 'Lab Vacuum'; A.template = 'Lab Vacuum';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheetTemplates = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => {
        if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheetTemplates.push(String(ws.getRow(row.number + 1).getCell(8).value || ''));
      });
    }
    record(N, shapeOk && askOk && medOk && customOk && elecOk && je.template === 'Lab Vacuum' && sheetTemplates.join() === 'Lab Vacuum',
      'template "' + template + '"; rows ' + JSON.stringify(rows) + '; prompts: ' + countAsk + '; Vacuum Pump offers ' + vpOffers
      + '; custom ' + JSON.stringify(customs) + '; expects Electrical=' + elecOk + '; entries.json "' + je.template + '"; sheet ' + JSON.stringify(sheetTemplates));
  }

  // ==========================================================================
  // BUILD 109 — the field-app side of the 2026-10-08 gap review (fixes 3.2,
  // 3.3, 3.4, 4.3, 4.4; loto-web's side is done there). Each test was written
  // before its fix and fails on build 108.
  // ==========================================================================
  // Every row of an export's Information Sheets: { sheet, n, cells[13] }
  async function sheetRowsOf(u) {
    const out = [];
    for (const xp of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p)).sort()) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xp]);
      wb.worksheets[0].eachRow(row => {
        const cells = [];
        for (let c = 1; c <= 13; c++) { const v = row.getCell(c).value; cells.push(v == null ? '' : String(v)); }
        out.push({ sheet: xp.replace('info_sheets/', ''), n: row.number, cells });
      });
    }
    return out;
  }
  const dayAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d); };
  const sheetName = (isoDay) => 'Information_Sheet_' + getDateStamp(exportDateFrom(isoDay)) + '.xlsx';

  // T200 — 3.3: the type's cell said "Details"; loto-web stored it as the main photo's position
  async function t200_equipmentTypeCellIsLabelledEquipmentType() {
    const N = 'T200 the equipment row\'s col-6 header reads "Equipment Type" (it read "Details") over the surveyed type; the labels loto-web matches are unchanged';
    await resetAppState();
    const A = mkEntry('AHU-200', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect' })] });
    A.equipType = 'Air Handler'; A.template = 'AHU - Steam';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const rows = await sheetRowsOf(await unzipExport(zip.blob));
    const hdr = rows.find(r => r.cells[0] === 'Equipment ID/Name');
    const data = hdr && rows.find(r => r.sheet === hdr.sheet && r.n === hdr.n + 1);
    const srcLabel = rows.find(r => r.cells[0] === 'Energy Source #1');
    record(N, !!hdr && hdr.cells[5] === 'Equipment Type' && !!data && data.cells[5] === 'Air Handler' && data.cells[0] === 'AHU-200'
      && !!srcLabel && srcLabel.cells[2] === 'Device ID',
      'header ' + JSON.stringify(hdr && hdr.cells.slice(0, 6)) + '; data ' + JSON.stringify(data && data.cells.slice(0, 6)) + '; source label ' + JSON.stringify(srcLabel && srcLabel.cells.slice(0, 3)));
  }

  // T201 — 4.3 c: Cancel on "Change Template?" blanked the template
  async function t201_cancellingATemplateChangeKeepsTheTemplate() {
    const N = 'T201 Cancel on "Change Template?" keeps the template the unit had — a listed one and a custom one — and the unit saves with it, never with none';
    await resetAppState();
    fillFormNoSources('T-201');
    const sel = document.getElementById('equipTemplate');
    sel.dispatchEvent(new Event('focus'));
    sel.value = 'Standard Pump';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    if (!sources.length) return record(N, false, 'Standard Pump gave no sources');
    sources[0].deviceId = 'P-201'; sources[0].userEdited = true;
    const n0 = sources.length;
    sel.dispatchEvent(new Event('focus'));
    sel.value = 'Chilled Water Pump';
    handleTemplateChange();
    const asked = !!document.getElementById('templateConfirmOverlay');
    cancelTemplateChange();
    const listed = { sel: sel.value, tmpl: getTemplate(), n: sources.length, tag: sources[0].deviceId };
    sel.dispatchEvent(new Event('focus'));
    sel.value = '** New Template **';
    handleTemplateChange();
    document.getElementById('equipTemplateCustom').value = 'Booster Skid 201';
    sel.dispatchEvent(new Event('focus'));
    sel.value = 'Chilled Water Pump';
    handleTemplateChange();
    cancelTemplateChange();
    const custom = { sel: sel.value, tmpl: getTemplate(), shown: document.getElementById('customTemplateGroup').style.display };
    performSaveAndNew();
    const saved = savedEquipment.find(e => e.equipName === 'T-201') || {};
    record(N, asked && listed.sel === 'Standard Pump' && listed.tmpl === 'Standard Pump' && listed.n === n0 && listed.tag === 'P-201'
      && custom.sel === '** New Template **' && custom.tmpl === 'Booster Skid 201' && custom.shown === 'flex' && saved.template === 'Booster Skid 201',
      'asked=' + asked + '; after Cancel ' + JSON.stringify(listed) + '; custom after Cancel ' + JSON.stringify(custom) + '; saved template ' + JSON.stringify(saved.template));
  }

  // T202 — 4.3 e: a saved value its list lacked showed as "-- Select --"
  async function t202_savedValuesOffTheListShowAsThemselves() {
    const N = 'T202 a saved value its list lacks shows as itself, not "-- Select --" (Energy Source "Electrical", Location "At Capacitor Bank" and a typed one, Quantity 12, Tied To) and saves back unchanged; "At Capacitor Bank" and "Button (Start/Stop)" are in the lists';
    await resetAppState();
    const A = mkEntry('ATS-202', { sources: [
      Object.assign(mkSrc('Electrical'), { sourceId: genUuid(), deviceType: 'Breaker', location: 'On Wall', collapsed: false }),
      Object.assign(mkSrc('Stored Electrical Energy'), { sourceId: genUuid(), deviceType: 'Capacitor', location: 'At Capacitor Bank', collapsed: false }),
      Object.assign(mkSrc('DW In'), { sourceId: genUuid(), deviceType: 'Ball Valve', location: 'Behind the Lab Sink', quantity: 12, collapsed: false })] });
    A.tiedTo = 'Shut down boiler first';
    savedEquipment = [A]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    sources.forEach(s => { s.collapsed = false; }); renderSources();
    const val = id => (document.getElementById(id) || {}).value;
    const shown = { energy0: val('src_energy_0'), loc1: val('src_loc_1'), loc2: val('src_loc_2'), tied: val('equipTiedTo') };
    const card2 = document.querySelectorAll('#sourcesContainer > .source-card')[2];
    const qty = card2 ? [...card2.querySelectorAll('select')].map(x => x.value).find(v => v === '12') || '' : '';
    performSaveAndNew();
    const s = savedEquipment.find(e => e.id === A.id) || {};
    const kept = (s.sources || []).map(x => x.energySource + '|' + x.location + '|' + x.quantity).join(' / ');
    record(N, shown.energy0 === 'Electrical' && shown.loc1 === 'At Capacitor Bank' && shown.loc2 === 'Behind the Lab Sink' && shown.tied === 'Shut down boiler first' && qty === '12'
      && s.tiedTo === 'Shut down boiler first' && kept === 'Electrical|On Wall|1 / Stored Electrical Energy|At Capacitor Bank|1 / DW In|Behind the Lab Sink|12'
      && DATA.locations.includes('At Capacitor Bank') && DATA.verificationTypes.includes('Button (Start/Stop)'),
      'shown ' + JSON.stringify(shown) + ', quantity ' + JSON.stringify(qty) + '; saved tiedTo ' + JSON.stringify(s.tiedTo) + ', sources ' + kept);
  }

  // T203 — 4.3 a: the custom boxes were rebuilt on every keystroke (focus lost on the iPad)
  async function t203_customBoxesAreNotRebuiltWhileTyping() {
    const N = 'T203 typing in a custom Energy Source / Device box keeps the same box (it was rebuilt on every keystroke, losing focus on the iPad); leaving it refreshes the Device list and Valve State in place';
    await resetAppState();
    fillFormNoSources('C-203');
    sources.push(Object.assign(mkSrc(''), { deviceType: '', verification: '', location: '', collapsed: false }));
    renderSources();
    handleEnergySourceChange(0, '** Custom Energy **');
    const box = document.getElementById('src_energy_custom_0');
    if (!box) return record(N, false, 'no custom energy box');
    let same = true;
    for (const t of ['S', 'St', 'Steam 5', 'Steam 50 PSI']) {
      box.value = t; box.dispatchEvent(new Event('input', { bubbles: true }));
      if (document.getElementById('src_energy_custom_0') !== box) same = false;
    }
    const devSel = document.getElementById('src_device_0');
    box.dispatchEvent(new Event('change', { bubbles: true }));
    const stillSame = document.getElementById('src_energy_custom_0') === box && document.getElementById('src_device_0') === devSel;
    const devOpts = [...document.getElementById('src_device_0').options].map(o => o.value);
    const valveListed = devOpts.includes('Gate Valve') && !devOpts.includes('Breaker');
    handleDeviceTypeChange(0, '** Custom Device **');
    const dbox = document.getElementById('src_device_custom_0');
    let dsame = !!dbox;
    for (const t of ['W', 'Wheel', 'Wheel Valve']) {
      if (!dbox) break;
      dbox.value = t; dbox.dispatchEvent(new Event('input', { bubbles: true }));
      if (document.getElementById('src_device_custom_0') !== dbox) dsame = false;
    }
    if (dbox) dbox.dispatchEvent(new Event('change', { bubbles: true }));
    const vs = !!document.getElementById('src_valvestate_0');
    record(N, same && stillSame && valveListed && dsame && document.getElementById('src_device_custom_0') === dbox && vs
      && sources[0].energySource === 'Steam 50 PSI' && sources[0].deviceType === 'Wheel Valve',
      'energy box kept=' + same + ', after leaving it=' + stillSame + ', device list ' + JSON.stringify(devOpts.slice(0, 6)) + '; device box kept=' + dsame + ', Valve State shown=' + vs + '; saved ' + sources[0].energySource + ' / ' + sources[0].deviceType);
  }

  // T204 — 4.3 f: Valve State on every row; an In/Out pair split into two "In/Out" rows
  async function t204_valveStateOnValvesAndInOutSplitsByDirection() {
    const N = 'T204 Valve State shows on valve rows only (never on a breaker or a Kinetic row unless it already holds Normally Closed); a Split of "HHW In/Out" x2 gives "HHW In" + "HHW Out" (tags and the In valve\'s mark follow, the Out valve keeps the pair\'s state); a plain valve row still splits off a Normally Closed valve, a breaker row never does';
    await resetAppState();
    fillFormNoSources('V-204');
    sources.push(Object.assign(mkSrc('Electrical 208V'), { deviceType: 'Breaker', collapsed: false }));
    sources.push(Object.assign(mkSrc('Kinetic'), { deviceType: 'Rotating', collapsed: false }));
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', valveState: 'normally_closed', collapsed: false }));
    renderSources();
    const shown = [0, 1, 2, 3].map(i => !!document.getElementById('src_valvestate_' + i)).join(',');
    await resetAppState();
    fillFormNoSources('S-204');
    sources.push(Object.assign(mkSrc('HHW In/Out'), { deviceType: 'Ball Valve', quantity: 2, deviceId: 'V-IN; V-OUT', collapsed: false }));
    sources.push(Object.assign(mkSrc('CHW In'), { deviceType: 'Ball Valve', quantity: 3, collapsed: false }));
    sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Breaker', quantity: 2, collapsed: false }));
    sources.forEach(ensureSourceId);
    renderSources();
    await captureInto('source_0', await makePhotoFile('s204'));
    openValveMarkDialog('source_0'); await markDialogReady(); tapMark(0.25, 0.5); tapMark(0.75, 0.5); clickById('valveMarkSave');
    const inMark = (photos.source_0.marks || [])[0];
    splitSource(0);
    const a = sources[0], b = sources[1];
    const ref0 = photos.source_0 || {};
    const pairOk = a.energySource === 'HHW In' && a.quantity === 1 && a.deviceId === 'V-IN'
      && b.energySource === 'HHW Out' && b.quantity === 1 && b.deviceId === 'V-OUT' && (b.valveState || 'normal') === 'normal'
      && (ref0.marks || []).length === 1 && !!inMark && ref0.marks[0].x === inMark.x && !photos.source_1;
    splitSource(2);
    const plain = sources[3];
    splitSource(4);
    const brk = sources[5];
    record(N, shown === 'false,false,true,true' && pairOk && plain.energySource === 'CHW In' && plain.valveState === 'normally_closed' && (brk.valveState || 'normal') === 'normal',
      'Valve State on breaker,Kinetic,valve,NC disconnect = ' + shown + '; after the pair split ' + JSON.stringify(sources.slice(0, 2).map(x => [x.energySource, x.quantity, x.deviceId, x.valveState]))
      + ', In row marks ' + JSON.stringify(ref0.marks || null) + '; plain split ' + (plain && plain.energySource) + ' ' + (plain && plain.valveState) + '; breaker split ' + (brk && brk.valveState));
  }

  // T205 — 4.3 b: a scan finishing after Save & New wrote into the next unit
  async function t205_aScanNeverLandsOnAnotherUnitOrSource() {
    const N = 'T205 a label scan still reading when the form changes (Save & New) is dropped, not written into the next unit; a scan for a source\'s box follows that source when it moves';
    await resetAppState();
    const realPlugins = window.scanPlugins;
    let release = null;
    window.scanPlugins = () => ({
      Camera: { getPhoto: async () => ({ base64String: 'AAAA' }) },
      TextRecognition: { recognizeText: () => new Promise(r => { release = r; }) }
    });
    try {
      fillForm('A-205');
      const msgs = await withToasts(async () => {
        const p = scanTextToField('equipName');
        await waitFor(() => !!release, 3000, 'the OCR call');
        performSaveAndNew();
        release({ text: 'SCANNED 205' }); release = null;
        await p;
      });
      const nextName = document.getElementById('equipName').value;
      const savedName = (savedEquipment.find(e => e.equipName === 'A-205') || {}).equipName;
      fillFormNoSources('B-205');
      sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', collapsed: false }));
      sources.push(Object.assign(mkSrc('DW In'), { deviceType: 'Ball Valve', collapsed: false }));
      renderSources();
      const target = sources[1];
      const p2 = scanTextToField('src_deviceId_1');
      await waitFor(() => !!release, 3000, 'the second OCR call');
      moveSource(1, -1);
      release({ text: 'BV-9' }); release = null;
      await p2;
      record(N, nextName === '' && savedName === 'A-205' && msgs.some(m => /scan not used/i.test(m))
        && target.deviceId === 'BV-9' && sources.indexOf(target) === 0 && !sources[1].deviceId,
        'next unit name ' + JSON.stringify(nextName) + ', messages ' + JSON.stringify(msgs.slice(-2)) + '; moved source tag ' + JSON.stringify(target.deviceId) + ', the other ' + JSON.stringify(sources[1] && sources[1].deviceId));
    } finally { window.scanPlugins = realPlugins; }
  }

  // T206 — 4.3 d: no way out of an Edit but to save it again
  async function t206_cancelEditLeavesTheSavedUnitAsItWas() {
    const N = 'T206 "Cancel edit" leaves the saved unit exactly as it was (notes, photos, exported stamp) and blanks the form; a photo taken in the discarded edit stays on the device (and is flagged at export); "Discard" clears a new unit only when confirmed';
    await resetAppState();
    fillForm('E-206');
    await captureInto('equip_main', await makePhotoFile('e206'));
    document.getElementById('equipNotes').value = 'orig';
    const A = saveEntry();
    A.exportedAt = new Date().toISOString(); A.exportedAllPhotos = true; A.exportId = 'x206'; saveAll();
    const btn = () => document.getElementById('discardFormBtn');
    const hiddenBlank = btn().style.display === 'none';
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(A)); });
    const label = btn().style.display !== 'none' ? btn().textContent : '(hidden)';
    document.getElementById('equipNotes').value = 'changed';
    const dp = await captureInto('equip_dataplate', await makePhotoFile('e206dp'));
    const dpKey = dp && dp.dbKey;
    const { log } = await withDialogs({ confirm: true }, async () => { discardForm(); });
    const a = savedEquipment.find(e => e.id === A.id) || {};
    const kept = a.notes === 'orig' && !(a.photos && a.photos.equip_dataplate) && entryExportState(a) === 'exported';
    const formBlank = !document.getElementById('equipName').value && !editingEntry && btn().style.display === 'none';
    const bytes = dpKey ? await loadPhotoBytes(dpKey, 'image/jpeg') : null;
    const flagged = await emptySlotsWithUnattachedShots([a]);
    fillForm('N-206'); autoSaveCurrent();
    const newLabel = btn().textContent;
    await withDialogs({ confirm: false }, async () => { discardForm(); });
    const keptNew = document.getElementById('equipName').value === 'N-206';
    await withDialogs({ confirm: true }, async () => { discardForm(); });
    const clearedNew = !document.getElementById('equipName').value && !sources.length;
    record(N, hiddenBlank && /cancel edit/i.test(label) && log.some(m => /stays exactly as it was/i.test(m)) && kept && formBlank && !!(bytes && bytes.bytes)
      && flagged.some(f => /Data Plate/.test(f.slot)) && /discard/i.test(newLabel) && keptNew && clearedNew,
      'button hidden on a blank form=' + hiddenBlank + ', on edit ' + JSON.stringify(label) + '; saved notes ' + JSON.stringify(a.notes) + ', data plate ' + !!(a.photos && a.photos.equip_dataplate)
      + ', export state ' + entryExportState(a) + '; form blank=' + formBlank + '; discarded shot on device=' + !!(bytes && bytes.bytes) + ', flagged ' + JSON.stringify(flagged)
      + '; new unit button ' + JSON.stringify(newLabel) + ', kept on No=' + keptNew + ', cleared on Yes=' + clearedNew);
  }

  // T207 — 4.3 g: the survey date was the first-save date and could not be changed
  async function t207_theSurveyDateIsOnTheFormAndKeptOnEdit() {
    const N = 'T207 the Survey Date box sets the unit\'s date (blank = the day it is saved) and so its sheet; a future day is refused; changing it on a unit already exported asks first and says to change loto-web too (never for a unit not exported yet); the first export stays known through an edit';
    await resetAppState();
    const box = () => document.getElementById('equipSurveyDate');
    fillForm('D-207a'); box().value = dayAgo(1); box().dispatchEvent(new Event('change'));
    const A = saveEntry();
    fillForm('D-207b');
    const B = saveEntry();
    fillForm('D-207c'); box().dispatchEvent(new Event('focus')); box().value = dayAgo(-2); box().dispatchEvent(new Event('change'));
    const future = box().value;
    clearForm(false);
    const { zip } = await runExport({ confirmResponse: true, dateFilter: 'all' });
    const u = zip ? await unzipExport(zip.blob) : { files: {} };
    const sheets = Object.keys(u.files).filter(p => /Information_Sheet_/.test(p)).map(p => p.replace('info_sheets/', '')).sort();
    const exportedOnce = !!(A.firstExportedAt && B.firstExportedAt);
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(B)); });
    const shownDay = box().value;
    box().dispatchEvent(new Event('focus'));
    box().value = dayAgo(3);
    const r1 = await withDialogs({ confirm: false }, async () => { handleSurveyDateChange(); });
    const reverted = box().value;
    box().value = dayAgo(3);
    await withDialogs({ confirm: true }, async () => { handleSurveyDateChange(); });
    document.getElementById('equipNotes').value = 'edited';
    performSaveAndNew();
    const b = savedEquipment.find(e => e.id === B.id) || {};
    fillForm('D-207d'); const D = saveEntry();
    await withDialogs({ confirm: true }, async () => { editSaved(savedEquipment.indexOf(D)); });
    box().dispatchEvent(new Event('focus'));
    box().value = dayAgo(2);
    const r3 = await withDialogs({ confirm: false }, async () => { handleSurveyDateChange(); });
    const dKept = box().value;
    clearForm(false);
    record(N, A.surveyDate === dayAgo(1) && B.surveyDate === dayAgo(0) && future !== dayAgo(-2) && exportedOnce
      && sheets.join() === [sheetName(dayAgo(1)), sheetName(dayAgo(0))].sort().join()
      && shownDay === dayAgo(0) && r1.log.some(m => /already exported/i.test(m) && /loto-web/i.test(m)) && reverted === dayAgo(0)
      && b.surveyDate === dayAgo(3) && !b.exportedAt && !!b.firstExportedAt && changedSinceExport(b)
      && !r3.log.length && dKept === dayAgo(2),
      'saved dates ' + A.surveyDate + ', ' + B.surveyDate + '; future box ' + JSON.stringify(future) + '; sheets ' + JSON.stringify(sheets)
      + '; edit shows ' + shownDay + ', asked ' + JSON.stringify(r1.log) + ', after No ' + reverted + '; saved ' + b.surveyDate + ' exportedAt=' + !!b.exportedAt + ' first=' + !!b.firstExportedAt
      + '; not-exported unit asked ' + JSON.stringify(r3.log) + ', kept ' + dKept);
  }

  // T208 — 4.3 g: units edited today but first saved earlier were left out; undated units went on a sheet loto-web refuses
  async function t208_notYetExportedSendsWholeDaysAndUndatedUnitsGetADate() {
    const N = 'T208 "Not yet exported" sends every date holding an unexported unit as its whole sheet (no other day; today stays the default) and says a change to a unit already in loto-web must be made there too; a unit with no date gets one at export instead of the undated sheet';
    await resetAppState();
    const at = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(10, 0, 0, 0); return d.toISOString(); };
    const X1 = mkEntry('X1-208', { savedAt: at(1) }); X1.exportedAt = at(1); X1.exportedAllPhotos = true; X1.firstExportedAt = at(1);
    const X2 = mkEntry('X2-208', { savedAt: at(1) });
    const X3 = mkEntry('X3-208', { savedAt: at(2) }); X3.exportedAt = at(2); X3.exportedAllPhotos = true; X3.firstExportedAt = at(2);
    const X4 = mkEntry('X4-208', { savedAt: at(0) });
    const X5 = mkEntry('X5-208', { savedAt: at(3) }); X5.firstExportedAt = at(3);   // exported, then edited
    savedEquipment = [X1, X2, X3, X4, X5]; saveAll();
    showExportDialog();
    const dsel = document.getElementById('exportDateFilter');
    const opts = [...dsel.options].map(o => o.value);
    const dflt = dsel.value;
    dsel.value = 'unexported'; updateExportDateSummary();
    const summary = (document.getElementById('exportDateSummary') || {}).textContent || '';
    closeExportDialog();
    const { zip } = await runExport({ confirmResponse: true, dateFilter: 'unexported' });
    const units = {};
    if (zip) { const u = await unzipExport(zip.blob); for (const q of Object.keys(u.files).filter(x => /Information_Sheet_.*\.xlsx$/.test(x)).sort()) units[q.replace('info_sheets/', '')] = await sheetUnits(u.files[q]); }
    const want = [sheetName(dayAgo(0)), sheetName(dayAgo(1)), sheetName(dayAgo(3))].sort().join();
    const got = Object.values(units).flat().sort().join();
    await resetAppState();
    const U = mkEntry('U-208'); delete U.savedAt;
    savedEquipment = [U]; saveAll();
    const r = await runExport({ confirmResponse: true, dateFilter: 'all', choice: { 'survey-date': dayAgo(5) } });
    const uSheets = r.zip ? Object.keys((await unzipExport(r.zip.blob)).files).filter(x => /Information_Sheet_/.test(x)).map(x => x.replace('info_sheets/', '')) : [];
    const asked = r.confirms.some(m => /CHOICE survey-date/.test(m));
    record(N, opts.includes('unexported') && dflt === dayAgo(0) && /not yet exported/i.test(summary) && /make the same change there/i.test(summary)
      && !!zip && Object.keys(units).sort().join() === want && got === ['X1-208', 'X2-208', 'X4-208', 'X5-208'].sort().join()
      && asked && uSheets.join() === sheetName(dayAgo(5)) && U.surveyDate === dayAgo(5),
      'options ' + JSON.stringify(opts) + ', default ' + dflt + '; summary ' + JSON.stringify(summary) + '; sheets ' + JSON.stringify(units) + '; undated unit asked=' + asked + ', sheets ' + JSON.stringify(uSheets) + ', its date ' + U.surveyDate);
  }

  // T209 — 3.2: Duplicate didn't follow Reuse, and a hand-set Yes didn't say which photo
  async function t209_duplicateFollowsReuseAndAHandSetYesPicksThePhoto() {
    const N = 'T209 Reuse sets Duplicate = Yes and the card names whose photo it is; its sheet row says Yes, names the owner\'s file and keeps its own mark; a retake puts an automatic Yes back to No, never a Yes set by hand; a hand-set Yes on a source with no photo opens the picker (Skip keeps it); Duplicate Source marks its shared photo Yes';
    await resetAppState();
    fillFormNoSources('R-209');
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('HHW Out'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('CHW In'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.forEach(ensureSourceId);
    renderSources();
    await captureInto('source_0', await makePhotoFile('r209'));
    const cands = collectTodaysPhotos();
    _reuseCandidates = cands;
    await reusePhotoInto('source_1', cands.findIndex(c => c.dbKey === photos.source_0.dbKey));
    await waitForPhotoWritesIdle(10000);
    const autoYes = sources[1].duplicate === 'Yes' && sources[1].dupAuto === true;
    const cardText = (document.querySelectorAll('#sourcesContainer > .source-card')[1] || {}).textContent || '';
    const named = /Photo from .*Source 1/.test(cardText);
    photos.source_1 = Object.assign({}, photos.source_1, { marks: [{ x: 0.6, y: 0.4 }], marksFor: { qty: 1, inOut: false } });
    updateSource(2, 'duplicate', 'Yes');
    const picker = document.getElementById('reusePickerOverlay');
    const skipBtn = picker && [...picker.querySelectorAll('button')].find(x => /skip/i.test(x.textContent));
    if (skipBtn) skipBtn.click();
    const handYes = sources[2].duplicate === 'Yes' && !sources[2].dupAuto && !document.getElementById('reusePickerOverlay');
    autoSaveCurrent();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    let rowsOk = false, rowDetail = '';
    if (zip) {
      const rows = await sheetRowsOf(await unzipExport(zip.blob));
      const r1 = rows.find(r => r.cells[0] === 'HHW In'), r2 = rows.find(r => r.cells[0] === 'HHW Out');
      rowsOk = !!(r1 && r2) && !!r1.cells[5] && r2.cells[5] === r1.cells[5] && r2.cells[7] === 'Yes' && r1.cells[7] === 'No' && r2.cells[11] === '0.600,0.400';
      rowDetail = JSON.stringify([r1 && r1.cells.slice(0, 12), r2 && r2.cells.slice(0, 12)]);
    }
    await captureInto('source_1', await makePhotoFile('r209b'));
    await captureInto('source_2', await makePhotoFile('r209c'));
    const afterRetake = [sources[1].duplicate, sources[2].duplicate].join(',');
    duplicateSource(0);
    const dupSrc = sources[1];
    record(N, autoYes && named && !!skipBtn && handYes && rowsOk && afterRetake === 'No,Yes' && dupSrc.duplicate === 'Yes' && dupSrc.dupAuto === true,
      'auto Yes=' + autoYes + ', card names owner=' + named + '; picker Skip=' + !!skipBtn + ', hand Yes kept=' + handYes
      + '; sheet rows ' + rowDetail + (zip ? '' : ' (no zip: ' + confirms.join(' | ') + ')') + '; after retakes ' + afterRetake + '; Duplicate Source -> ' + dupSrc.duplicate);
  }

  // T210 — 4.4 a: a fixed landscape size box cut portrait photos to 810 x 1080
  async function t210_thePhotoSizeLimitTurnsWithThePhoto() {
    const N = 'T210 the photo size limit turns with the photo (a portrait shot gets the long side); the default is 2560 x 1440, and a device still on the old 1920 x 1080 default moves to it once (a later 1920 pick and a custom size are kept)';
    const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#468'; x.fillRect(0, 0, w, h); return c; };
    const box = { maxWidth: 400, maxHeight: 225, quality: 0.8 };
    const land = renderCapture(cv(800, 600), box), port = renderCapture(cv(600, 800), box);
    const dflt = renderCapture(cv(1512, 2016), { quality: 0.8 });
    let had = null, hadFlag = null, moved = null, keptLater = null, keptCustom = null;
    try { had = localStorage.getItem('loto_photo_settings'); hadFlag = localStorage.getItem(PHOTO_DEFAULT_MOVE_FLAG); } catch (e) {}
    try {
      localStorage.removeItem(PHOTO_DEFAULT_MOVE_FLAG);
      localStorage.setItem('loto_photo_settings', JSON.stringify({ maxWidth: 1920, maxHeight: 1080, quality: 0.8, preset: '1920x1080' }));
      moved = getPhotoSettings();
      localStorage.setItem('loto_photo_settings', JSON.stringify({ maxWidth: 1920, maxHeight: 1080, quality: 0.8, preset: '1920x1080' }));
      keptLater = getPhotoSettings();
      localStorage.removeItem(PHOTO_DEFAULT_MOVE_FLAG);
      localStorage.setItem('loto_photo_settings', JSON.stringify({ maxWidth: 1600, maxHeight: 900, quality: 0.7, preset: 'custom' }));
      keptCustom = getPhotoSettings();
    } finally {
      try { if (had === null) localStorage.removeItem('loto_photo_settings'); else localStorage.setItem('loto_photo_settings', had); } catch (e) {}
      try { if (hadFlag === null) localStorage.removeItem(PHOTO_DEFAULT_MOVE_FLAG); else localStorage.setItem(PHOTO_DEFAULT_MOVE_FLAG, hadFlag); } catch (e) {}
    }
    record(N, !!land && land.w === 300 && land.h === 225 && !!port && port.w === 225 && port.h === 300 && !!dflt && dflt.w === 1440 && dflt.h === 1920
      && !!moved && moved.maxWidth === 2560 && moved.maxHeight === 1440 && !!keptLater && keptLater.maxWidth === 1920 && !!keptCustom && keptCustom.maxWidth === 1600,
      'landscape ' + (land && land.w + 'x' + land.h) + ', portrait ' + (port && port.w + 'x' + port.h) + ', default portrait ' + (dflt && dflt.w + 'x' + dflt.h)
      + '; old default -> ' + JSON.stringify(moved) + '; 1920 picked later -> ' + (keptLater && keptLater.maxWidth) + '; custom -> ' + (keptCustom && keptCustom.maxWidth));
  }

  // T211 — 4.4 b: no capture time survived the re-encode
  async function t211_newPhotosCarryTheirCaptureTime() {
    const N = 'T211 a new photo carries its capture time inside the stored JPEG (EXIF DateTimeOriginal + offset, Orientation 1, no GPS): the original\'s own time when it has one, else the camera\'s now; a library pick without one gets none; the export ships those bytes and lists the time in manifest.json and entries.json; an older photo ships unchanged';
    await resetAppState();
    const toDataUrl = (blob) => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const fileOf = async (du, name) => new File([await (await fetch(du)).blob()], name, { type: 'image/jpeg' });
    const exifTags = (b) => {
      const out = { tags: [], orientation: null };
      if (!b || b[0] !== 0xFF || b[1] !== 0xD8) return out;
      let p = 2;
      while (p + 4 <= b.length && b[p] === 0xFF) {
        const m = b[p + 1], len = (b[p + 2] << 8) | b[p + 3];
        if (m === 0xDA) break;
        if (m === 0xE1 && b[p + 4] === 0x45 && b[p + 5] === 0x78) {
          const t = p + 10, le = b[t] === 0x49;
          const u16 = o => le ? (b[t + o] | (b[t + o + 1] << 8)) : ((b[t + o] << 8) | b[t + o + 1]);
          const u32 = o => le ? ((b[t + o] | (b[t + o + 1] << 8) | (b[t + o + 2] << 16) | (b[t + o + 3] << 24)) >>> 0) : (((b[t + o] << 24) | (b[t + o + 1] << 16) | (b[t + o + 2] << 8) | b[t + o + 3]) >>> 0);
          const ifd = u32(4), n = u16(ifd);
          for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12, tag = u16(e); out.tags.push(tag); if (tag === 0x0112) out.orientation = u16(e + 8); }
          return out;
        }
        p += 2 + len;
      }
      return out;
    };
    const plainDu = await toDataUrl(await makePhotoFile('t211'));
    // The iPad's encoder (WebKit) writes its OWN EXIF block — color space and
    // size, no time — into every canvas JPEG; a desktop browser writes none.
    // Ours must replace it, not be skipped because of it (the Simulator run
    // of build 109 stored no time at all).
    const exifBlocks = (b) => { let n = 0, p = 2; while (b && p + 4 <= b.length && b[p] === 0xFF && b[p + 1] !== 0xDA) { if (b[p + 1] === 0xE1 && b[p + 4] === 0x45 && b[p + 5] === 0x78) n++; p += 2 + ((b[p + 2] << 8) | b[p + 3]); } return n; };
    const encoderStyle = jpegWithExif(plainDu, null);   // an EXIF block without a time, like WebKit's
    const replaced = dataUrlToUint8Array(jpegWithExif(encoderStyle, { dt: '2026:01:02 03:04:05', offset: '+00:00' }));
    const replacedOk = exifBlocks(dataUrlToUint8Array(encoderStyle)) === 1 && exifBlocks(replaced) === 1
      && (readJpegExifTime(replaced) || {}).dt === '2026:01:02 03:04:05';
    fillForm('P-211');
    await captureInto('equip_main', await fileOf(jpegWithExif(plainDu, { dt: '2026:09:15 10:20:30', offset: '-05:00' }), 'exif.jpg'));
    const before = Date.now();
    // a camera shot needs a device that opens a camera for the input (build 110:
    // a desktop browser opens a file chooser instead) — this run plays the iPad
    const realCam = window.deviceCameraCapture;
    window.deviceCameraCapture = () => true;
    try { await captureInto('equip_dataplate', await makePhotoFile('t211b')); } finally { window.deviceCameraCapture = realCam; }
    handlePhoto({ files: [await makePhotoFile('t211c')], hasAttribute: () => false }, 'equip_ee');   // the library picker's input: no capture attribute
    await waitFor(() => photos.equip_ee && photos.equip_ee.dbKey && photos.equip_ee.unsaved === false, 15000, 'the library pick');
    await waitForPhotoWritesIdle(15000);
    const bytesOf = async slot => { const r = await loadPhotoBytes(photos[slot].dbKey, 'image/jpeg', photos[slot].sha256 || undefined); return r && r.bytes; };
    const mainB = await bytesOf('equip_main'), dpB = await bytesOf('equip_dataplate'), eeB = await bytesOf('equip_ee');
    const tMain = readJpegExifTime(mainB), tDp = readJpegExifTime(dpB), tEe = readJpegExifTime(eeB);
    const dpAt = Date.parse(photos.equip_dataplate.capturedAt || '');
    const exifOk = !!tMain && tMain.dt === '2026:09:15 10:20:30' && tMain.offset === '-05:00'
      && photos.equip_main.capturedAt === '2026-09-15T10:20:30-05:00' && photos.equip_main.capturedFrom === 'exif'
      && !!tDp && photos.equip_dataplate.capturedFrom === 'camera' && Math.abs(dpAt - before) < 120000 && tDp.offset === tzOffsetText(new Date())
      && !tEe && !photos.equip_ee.capturedAt
      && [mainB, dpB, eeB].every(b => { const x = exifTags(b); return x.orientation === 1 && !x.tags.includes(0x8825); });
    const old = mkEntry('Old-211');
    const oldKey = photoStoreKey(old.id, 'main');
    const oldDu = dataUrlFromBytesSeed('t211-old');
    await storePhotoBytes(oldKey, oldDu);
    const oldHash = await sha256HexOfDataUrl(oldDu);
    old.photos = { equip_main: { dbKey: oldKey, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg', sha256: oldHash } };
    savedEquipment = [old]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = (u.entriesJson.entries || []).find(e => e.equipName === 'P-211') || {};
    const mainFile = je.photoFiles && je.photoFiles.main;
    const mainRec = (u.manifest.photos || []).find(r => 'photos/' + r.filename === mainFile) || {};
    const shipped = mainFile && u.files[mainFile];
    const oldJe = (u.entriesJson.entries || []).find(e => e.equipName === 'Old-211') || {};
    const oldFile = oldJe.photoFiles && oldJe.photoFiles.main;
    const exportOk = !!shipped && (readJpegExifTime(shipped) || {}).dt === '2026:09:15 10:20:30'
      && mainRec.capturedAt === '2026-09-15T10:20:30-05:00' && mainRec.capturedFrom === 'exif'
      && !!(je.photoCaptured && je.photoCaptured.main) && je.photoCaptured.main.capturedAt === '2026-09-15T10:20:30-05:00' && je.photoCaptured.ee === null
      && !u.manifest.counts.hashMismatches && !!oldFile && u.hashes[oldFile] === oldHash && !readJpegExifTime(u.files[oldFile]);
    record(N, replacedOk && exifOk && exportOk, 'an encoder\'s own EXIF block replaced=' + replacedOk + '; stored: main ' + JSON.stringify(tMain) + ' ' + photos.equip_main.capturedAt + '; camera ' + JSON.stringify(tDp) + ' ' + photos.equip_dataplate.capturedAt
      + '; library ' + JSON.stringify(tEe) + '; exported main record ' + JSON.stringify({ at: mainRec.capturedAt, from: mainRec.capturedFrom }) + ', entries.json ' + JSON.stringify(je.photoCaptured)
      + ', hash mismatches ' + (u.manifest.counts || {}).hashMismatches + ', older photo unchanged=' + (!!oldFile && u.hashes[oldFile] === oldHash));
  }

  // T212 — 4.4 d: nothing flagged a photo taken for a slot that stayed empty
  async function t212_anEmptySlotWithAPhotoTakenForItIsFlaggedAtExport() {
    const N = 'T212 the export warns when a unit\'s empty photo slot has a photo taken for it on the device (it never attached), never for a retaken slot\'s older shot, and Cancel stops it; the 11+ sources warning no longer says nothing is lost';
    await resetAppState();
    const A = mkEntry('U-212', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect' }), Object.assign(mkSrc('DW In'), { sourceId: genUuid(), deviceType: 'Ball Valve' })] });
    await storePhotoBytes(photoStoreKey(A.id, A.sources[1].sourceId), dataUrlFromBytesSeed('t212-lost'));
    const k1old = photoStoreKey(A.id, A.sources[0].sourceId), k1new = photoStoreKey(A.id, A.sources[0].sourceId);
    await storePhotoBytes(k1old, dataUrlFromBytesSeed('t212-old'));
    const du = dataUrlFromBytesSeed('t212-new'); await storePhotoBytes(k1new, du);
    A.photos = { source_0: { dbKey: k1new, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg', sha256: await sha256HexOfDataUrl(du) } };
    savedEquipment = [A]; saveAll();
    const stop = await runExport({ confirmResponse: true, choice: { 'export-unattached': 'cancel' } });
    const asked = stop.confirms.filter(m => /CHOICE export-unattached/.test(m));
    const flagged = await emptySlotsWithUnattachedShots([A]);
    const go = await runExport({ confirmResponse: true });
    await resetAppState();
    const B = mkEntry('Big-212', { sources: Array.from({ length: 11 }, (_, i) => Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), location: 'P' + i })) });
    savedEquipment = [B]; saveAll();
    const big = await runExport({ confirmResponse: true });
    const bigMsg = big.confirms.find(m => /more than 10 energy sources/i.test(m)) || '';
    record(N, !stop.zip && asked.length === 1 && flagged.length === 1 && /^Source #2/.test(flagged[0].slot) && !!go.zip
      && /will NOT reach loto-web/.test(bigMsg) && !/nothing is lost/i.test(bigMsg),
      'asked ' + JSON.stringify(asked) + ', zip after Cancel=' + !!stop.zip + '; flagged ' + JSON.stringify(flagged) + '; zip by default=' + !!go.zip + '; 11+ message ' + JSON.stringify(bigMsg.slice(0, 220)));
  }

  // T213 — 3.4: loto-web compared its lists with an August copy of the app
  async function t213_appListsJsonMatchesTheApp() {
    const N = 'T213 app-lists.json (the lists loto-web checks its own against) matches this build\'s lists — run node tools/gen-app-lists.js (npm run sync does) when they change';
    if (typeof appListsSnapshot !== 'function') return record(N, false, 'the app has no appListsSnapshot');
    let text = null;
    try { const r = await fetch('app-lists.json', { cache: 'no-store' }); if (r.ok) text = await r.text(); } catch (e) {}
    if (text === null || text.trim().charAt(0) !== '{') return record(N, true, 'not served here (the app bundle) — checked in the browser runs');
    const label = /b(\d+)/.exec((document.querySelector('h1 span') || {}).textContent || '');
    const want = JSON.stringify(appListsSnapshot(label ? parseInt(label[1], 10) : null), null, 2) + '\n';
    const lists = JSON.parse(text);
    record(N, text === want && lists.templates.length === DATA.templates.length - 1,
      text === want ? 'matches (build ' + (label && label[1]) + ', ' + lists.templates.length + ' templates)' : 'STALE: the file has ' + text.length + ' chars, the app ' + want.length);
  }


  // ---------- build 109's code review (medium, 2026-10-09) ------------------
  // T214 — review #1: a template the APP picked (a custom type's keyword, a
  // type's only template, the template prompt, the voltage choice) asked
  // "Change Template?" and Cancel put back what an EARLIER tap on the list had
  // recorded — possibly on another unit — instead of this unit's template
  async function t214_cancelAfterAnAppMadeTemplatePickKeepsThisUnitsTemplate() {
    const N = 'T214 Cancel on "Change Template?" after a template the APP picked puts back this unit\'s own template (here none), never one an earlier tap on the list recorded on another unit';
    await resetAppState();
    fillFormNoSources('A-214');
    const sel = document.getElementById('equipTemplate');
    sel.value = 'Chilled Water Pump';
    sel.dispatchEvent(new Event('focus'));                 // recorded on unit A
    const B = mkEntry('B-214', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect', deviceId: 'D-214', userEdited: true })] });
    B.equipType = 'Booster Pump'; B.template = '';           // a custom type, no template yet
    savedEquipment = [B]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    let asked = false;
    await withDialogs({ confirm: true }, async () => {
      handleCustomEquipTypeChange();                         // "pump" → the app picks Standard Pump and asks
      asked = !!document.getElementById('templateConfirmOverlay');
      if (asked) cancelTemplateChange();
    });
    closeAllPrompts();
    const after = { sel: sel.value, tmpl: getTemplate(), tag: (sources[0] || {}).deviceId };
    record(N, asked && after.sel === '' && after.tmpl === '' && after.tag === 'D-214',
      'asked=' + asked + '; after Cancel ' + JSON.stringify(after));
  }

  // T215 — review #2-#5: Copy Source onto a source with a reused photo dropped
  // its Duplicate; an incomplete export never edited counted as "changed";
  // typing a year in the Survey Date box acted on 0002 / 0202; Duplicate = Yes
  // on a linked source opened the photo picker
  async function t215_reviewFixesForDuplicateDatesAndLinks() {
    const N = 'T215 Copy Source keeps Duplicate = Yes on a source whose photo is a reuse; an incomplete export never edited is not "changed"; a half-typed year in the Survey Date box asks nothing and is put back when the box is left; Duplicate = Yes on a linked source opens no picker';
    await resetAppState();
    // (a) Copy Source onto a reused photo
    const X = mkEntry('X-215', { sources: [Object.assign(mkSrc('CHW In'), { sourceId: genUuid(), deviceType: 'Ball Valve', duplicate: 'No' })] });
    savedEquipment = [X]; saveAll();
    fillFormNoSources('R-215');
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('HHW Out'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', collapsed: false }));
    sources.forEach(ensureSourceId); renderSources();
    await captureInto('source_0', await makePhotoFile('r215'));
    const cands = collectTodaysPhotos(); _reuseCandidates = cands;
    await reusePhotoInto('source_1', cands.findIndex(c => c.dbKey === photos.source_0.dbKey));
    await waitForPhotoWritesIdle(10000);
    showCopySourceDialog(1);
    applyCopySource(0, 0);
    const copied = { dup: sources[1].duplicate, auto: !!sources[1].dupAuto, es: sources[1].energySource };
    // (d) a linked source: Duplicate = Yes opens no picker
    sources[2].linkedTo = { entryId: X.id, sourceId: X.sources[0].sourceId, equipName: 'X-215', sourceIndex: 0, sourceLabel: 'CHW In' };
    renderSources();
    updateSource(2, 'duplicate', 'Yes');
    const pickerOnLinked = !!document.getElementById('reusePickerOverlay');
    closeReusePicker();
    // (b) "changed since export"
    const inc = { firstExportedAt: '2026-10-01T10:00:00Z', exportIncompleteAt: '2026-10-01T10:00:00Z', exportId: 'e1' };
    const edited = { firstExportedAt: '2026-10-01T10:00:00Z' };
    const changedOk = !changedSinceExport(inc) && changedSinceExport(edited) && !changedSinceExport({ exportedAt: '2026-10-01T10:00:00Z', exportedAllPhotos: true });
    // (c) typing a year: no question until the date is whole; a half-typed one is put back on leaving
    await resetAppState();
    const E = mkEntry('E-215', { savedAt: new Date(Date.now() - 2 * 86400000).toISOString() });
    E.exportedAt = new Date(Date.now() - 86400000).toISOString(); E.exportedAllPhotos = true; E.firstExportedAt = E.exportedAt;
    savedEquipment = [E]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    const box = document.getElementById('equipSurveyDate');
    const orig = box.value;
    box.dispatchEvent(new Event('focus'));
    const typing = await withDialogs({ confirm: true }, async () => {
      for (const v of ['0002-10-05', '0020-10-05', '0202-10-05']) { box.value = v; box.dispatchEvent(new Event('change')); }
    });
    box.dispatchEvent(new Event('blur'));
    const settled = box.value;
    clearForm(false);
    record(N, copied.dup === 'Yes' && copied.auto && copied.es === 'CHW In' && !pickerOnLinked && changedOk
      && typing.log.length === 0 && settled === orig && isIsoDay(orig),
      'after Copy Source ' + JSON.stringify(copied) + '; picker on a linked source=' + pickerOnLinked + '; changedSinceExport ok=' + changedOk
      + '; questions while typing the year ' + JSON.stringify(typing.log) + '; box after leaving ' + JSON.stringify(settled) + ' (was ' + JSON.stringify(orig) + ')');
  }

  // ---------- build 110: the 2026-10-15 review of build 109 (xhigh) ----------
  const typeInto = (id, v) => { const b = document.getElementById(id); if (!b) return false; b.value = v; b.dispatchEvent(new Event('input', { bubbles: true })); return true; };
  // a source on the form whose photo came by Reuse from source_0 (an automatic Duplicate = Yes)
  async function formWithReusedSourcePhoto(name, energies) {
    fillFormNoSources(name);
    energies.forEach(es => sources.push(Object.assign(mkSrc(es), { deviceType: 'Ball Valve', collapsed: false })));
    sources.forEach(ensureSourceId); renderSources();
    await captureInto('source_0', await makePhotoFile(name));
    const cands = collectTodaysPhotos(); _reuseCandidates = cands;
    await reusePhotoInto('source_1', cands.findIndex(c => c.dbKey === photos.source_0.dbKey));
    await waitForPhotoWritesIdle(10000);
  }

  // T216 — review #1: Duplicate → Info Only kept an automatic Yes with no photo
  async function t216_aDuplicateNeverKeepsAnAutomaticYesWithoutItsPhoto() {
    const N = 'T216 Duplicate → Info Only of a unit whose source got its photo by Reuse leaves that source Duplicate = No with its photo slot shown and flagged when empty (it kept an automatic Yes: no camera, no warning, a Y row with no Photo #); With Photos keeps the Yes on the copied photo; a saved unit already holding such a Yes exports "No"';
    await resetAppState();
    await formWithReusedSourcePhoto('R-216', ['HHW In', 'HHW Out']);
    const A = saveEntry();
    const autoBefore = !!(A.sources[1] && A.sources[1].duplicate === 'Yes' && A.sources[1].dupAuto);
    await executeDuplicate(savedEquipment.indexOf(A), false);
    sources.forEach(s => { s.collapsed = false; }); renderSources();
    const info = { dup: sources[1].duplicate, auto: !!sources[1].dupAuto, slot: !!document.getElementById('photo_source_1'),
      warned: collectIncompleteFields().some(m => /^Source #2/.test(m) && /Photo/.test(m)) };
    clearForm(false);
    await executeDuplicate(savedEquipment.indexOf(A), true);
    await waitForPhotoWritesIdle(15000);
    renderSources();
    const withP = { dup: sources[1].duplicate, dupOf: !!(photos.source_1 && photos.source_1.dbKey && photos.source_1.dupOf) };
    clearForm(false);
    await resetAppState();
    const S = mkEntry('S-216', { sources: [
      Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect' }),
      Object.assign(mkSrc('DW In'), { sourceId: genUuid(), deviceType: 'Ball Valve', duplicate: 'Yes', dupAuto: true })] });
    savedEquipment = [S]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    let rowDup = null, jsonDup = null;
    if (zip) {
      const u = await unzipExport(zip.blob);
      const row = (await sheetRowsOf(u)).find(r => r.cells[0] === 'DW In');
      rowDup = row ? row.cells[7] : null;
      const je = (u.entriesJson.entries || []).find(e => e.equipName === 'S-216') || {};
      jsonDup = ((je.sources || [])[1] || {}).duplicate;
    }
    record(N, autoBefore && info.dup === 'No' && !info.auto && info.slot && info.warned && withP.dup === 'Yes' && withP.dupOf && rowDup === 'No' && jsonDup === 'No',
      'saved auto Yes=' + autoBefore + '; Info Only ' + JSON.stringify(info) + '; With Photos ' + JSON.stringify(withP)
      + '; saved stale Yes exports: sheet ' + JSON.stringify(rowDup) + ', entries.json ' + JSON.stringify(jsonDup) + (zip ? '' : ' (no zip: ' + confirms.join(' | ') + ')'));
  }

  // T217 — review #2: a ";" typed in a per-unit Device ID box replaced the next units' tags
  async function t217_aSemicolonNeverReplacesAnotherUnitsTag() {
    const N = 'T217 a ";" typed in a per-unit Device ID box never replaces or blanks a tag already in a later unit\'s box (it stays in this unit as a comma); a pasted "a; b; c" still fills boxes that are empty';
    await resetAppState();
    fillFormNoSources('D-217');
    sources.push(Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Breaker', quantity: 3, deviceId: 'BKR-1; BKR-2; BKR-3', collapsed: false }));
    sources.push(Object.assign(mkSrc('CHW In'), { deviceType: 'Ball Valve', quantity: 3, deviceId: '', collapsed: false }));
    renderSources();
    typeInto('src_deviceId_0_0', 'BKR-1;');
    const a = splitUnitIds(sources[0].deviceId);
    typeInto('src_deviceId_0_0', 'BKR-1;3;5');
    const b = splitUnitIds(sources[0].deviceId);
    typeInto('src_deviceId_1_0', 'V-1; V-2; V-3');
    const c = splitUnitIds(sources[1].deviceId);
    record(N, a[1] === 'BKR-2' && a[2] === 'BKR-3' && !/;/.test(a[0]) && /^BKR-1/.test(a[0])
      && b[1] === 'BKR-2' && b[2] === 'BKR-3' && b[0] === 'BKR-1,3,5'
      && c.join('|') === 'V-1|V-2|V-3',
      'after typing ";" ' + JSON.stringify(a) + '; after "BKR-1;3;5" ' + JSON.stringify(b) + '; pasted into empty boxes ' + JSON.stringify(c));
  }

  // T218 — review #3: a custom energy source showed a verification it didn't hold
  async function t218_aCustomEnergySourceSavesTheVerificationItShows() {
    const N = 'T218 leaving a custom Energy Source box stores the verification the card then shows ("Saves as: …"), and renaming it hot ↔ chilled moves the suffix — the card never shows a value the unit doesn\'t hold';
    await resetAppState();
    let had = null;
    try { had = localStorage.getItem('loto_simple_verification'); localStorage.setItem('loto_simple_verification', '1'); } catch (e) {}
    try {
      fillFormNoSources('C-218');
      sources.push(Object.assign(mkSrc(''), { deviceType: '', verification: '', location: 'On Wall', collapsed: false }));
      renderSources();
      handleEnergySourceChange(0, '** Custom Energy **');
      const leave = (v) => { const box = document.getElementById('src_energy_custom_0'); box.value = v; box.dispatchEvent(new Event('input', { bubbles: true })); box.dispatchEvent(new Event('change', { bubbles: true })); };
      const shown = () => { const m = /Saves as:\s*([^\n]+?)\s*More options/.exec(((document.querySelectorAll('#sourcesContainer > .source-card')[0] || {}).textContent || '').replace(/\s+/g, ' ')); return m ? m[1].trim() : null; };
      leave('Chilled glycol loop');
      const cold = { stored: sources[0].verification, shown: shown() };
      leave('Hot glycol loop');
      const hot = { stored: sources[0].verification, shown: shown() };
      record(N, cold.stored === 'Temp Only - CHW' && cold.shown === cold.stored && hot.stored === 'Temp Only - Hot' && hot.shown === hot.stored,
        'chilled ' + JSON.stringify(cold) + '; hot ' + JSON.stringify(hot));
    } finally {
      try { if (had === null) localStorage.removeItem('loto_simple_verification'); else localStorage.setItem('loto_simple_verification', had); } catch (e) {}
    }
  }

  // T219 — review #4: a big export was packed in memory without a word
  async function t219_aBigExportAsksBeforeItIsPacked() {
    const N = 'T219 an export whose photos pass the safe size asks before the ZIP is packed (Cancel stops it, nothing marked exported); under the size it asks nothing';
    if (typeof EXPORT_BIG_BYTES === 'undefined') return record(N, false, 'the export has no size check');
    await resetAppState();
    fillForm('B-219');
    await captureInto('equip_main', await makePhotoFile('b219'));
    const A = saveEntry();
    const was = EXPORT_BIG_BYTES;
    let stop, go, small;
    try {
      EXPORT_BIG_BYTES = 1000;
      stop = await runExport({ confirmResponse: true, choice: { 'export-big': 'cancel' } });
      const stampedAfterCancel = !!A.exportedAt;
      go = await runExport({ confirmResponse: true, choice: { 'export-big': 'export' } });
      EXPORT_BIG_BYTES = was;
      small = await runExport({ confirmResponse: true });
      record(N, !stop.zip && stop.confirms.some(m => /CHOICE export-big/.test(m)) && !stampedAfterCancel && !!go.zip && !!small.zip && !small.confirms.some(m => /CHOICE export-big/.test(m)),
        'asked ' + JSON.stringify(stop.confirms.filter(m => /export-big/.test(m))) + ', zip after Cancel=' + !!stop.zip + ', stamped=' + stampedAfterCancel + '; zip on Export=' + !!(go && go.zip) + '; small export asked=' + small.confirms.some(m => /export-big/.test(m)));
    } finally { EXPORT_BIG_BYTES = was; }
  }

  // T220 — review #5: Skip on the "which photo" question left no way back; it opened on no-photo rows
  async function t220_aYesWithoutItsPhotoCanStillPickIt() {
    const N = 'T220 a Duplicate = Yes source with no photo keeps a "Pick the shared photo" button that opens the picker (after Skip there was no way back but No → Yes); a row that needs no photo (Stored Electrical Energy) never opens the picker';
    await resetAppState();
    fillFormNoSources('P-220');
    sources.push(Object.assign(mkSrc('CHW In'), { deviceType: 'Ball Valve', collapsed: false }));
    sources.push(Object.assign(mkSrc('Stored Electrical Energy'), { deviceType: 'Capacitor', location: 'At Capacitor Bank', verification: '', noPhoto: true, collapsed: false }));
    sources.forEach(ensureSourceId); renderSources();
    await captureInto('equip_main', await makePhotoFile('p220'));
    updateSource(0, 'duplicate', 'Yes');
    const first = document.getElementById('reusePickerOverlay');
    const skip = first && [...first.querySelectorAll('button')].find(x => /skip/i.test(x.textContent));
    if (skip) skip.click();
    const btn = document.getElementById('dupPhotoBtn_0');
    if (btn) btn.click();
    const again = document.getElementById('reusePickerOverlay');
    const reopened = !!again && /which photo/i.test(again.textContent);
    closeReusePicker();
    updateSource(1, 'duplicate', 'Yes');
    const onNoPhoto = !!document.getElementById('reusePickerOverlay');
    closeReusePicker();
    record(N, !!skip && !!btn && reopened && !onNoPhoto,
      'Skip=' + !!skip + ', button after Skip=' + !!btn + ', picker reopened=' + reopened + '; picker on the capacitor row=' + onNoPhoto);
  }

  // T221 — review #6: Split 1 dropped tags past the quantity
  async function t221_splitKeepsExtraTags() {
    const N = 'T221 Split 1 on a row holding more Device IDs than its quantity keeps the extra tags on the original row (they were deleted without a word); the split-off valve still takes the last unit\'s tag';
    await resetAppState();
    fillFormNoSources('S-221');
    sources.push(Object.assign(mkSrc('CHW In'), { deviceType: 'Ball Valve', quantity: 2, deviceId: 'V-1; V-2; V-3', collapsed: false }));
    sources.forEach(ensureSourceId); renderSources();
    splitSource(0);
    const orig = splitUnitIds(sources[0].deviceId), off = sources[1] && sources[1].deviceId;
    record(N, orig.includes('V-1') && orig.includes('V-3') && !orig.includes('V-2') && off === 'V-2',
      'original ' + JSON.stringify(sources[0].deviceId) + ', split-off ' + JSON.stringify(off));
  }

  // T222 — review #7: the unattached-shot warning could never be cleared; misc photos weren't checked
  async function t222_theUnattachedShotWarningCanBeSettled() {
    const N = 'T222 the "photo on this iPad but not on the unit" warning offers "Don\'t warn about these again" and then stops asking for those photos; a misc photo that never attached is flagged too, never one the tech removed, and misc photos from before this build are not';
    await resetAppState();
    const A = mkEntry('U-222', { sources: [Object.assign(mkSrc('DW In'), { sourceId: genUuid(), deviceType: 'Ball Valve' })] });
    await storePhotoBytes(photoStoreKey(A.id, A.sources[0].sourceId), dataUrlFromBytesSeed('t222-lost'));
    await storePhotoBytes(photoStoreKey(A.id, mintMiscSlotToken()), dataUrlFromBytesSeed('t222-misc'));
    savedEquipment = [A]; saveAll();
    const flagged = await emptySlotsWithUnattachedShots([A]);
    const r1 = await runExport({ confirmResponse: true, choice: { 'export-unattached': 'forget' } });
    const r2 = await runExport({ confirmResponse: true });
    const askedAgain = r2.confirms.some(m => /CHOICE export-unattached/.test(m));
    // a misc photo the tech removed is theirs to remove
    await resetAppState();
    fillForm('M-222');
    handleMiscPhoto({ files: [await makePhotoFile('m222')], hasAttribute: () => false });
    await waitFor(() => miscPhotos.length === 1 && miscPhotos[0].unsaved === false, 15000, 'the misc photo');
    await waitForPhotoWritesIdle(15000);
    await withDialogs({ confirm: true }, async () => { removeMiscPhoto(0); });
    const M = saveEntry();
    const removedFlagged = (await emptySlotsWithUnattachedShots([M])).length;
    // misc photos left from before this build: settled once, quietly
    await resetAppState();
    try { localStorage.removeItem('loto_unattached_misc_baseline'); } catch (e) {}
    const B = mkEntry('B-222');
    await storePhotoBytes(photoStoreKey(B.id, mintMiscSlotToken()), dataUrlFromBytesSeed('t222-old'));
    savedEquipment = [B]; saveAll();
    const oldFlagged = (await emptySlotsWithUnattachedShots([B])).length;
    record(N, flagged.length === 2 && flagged.some(f => /^Source #1/.test(f.slot)) && flagged.some(f => /misc/i.test(f.slot))
      && !!r1.zip && r1.confirms.some(m => /CHOICE export-unattached/.test(m)) && !!r2.zip && !askedAgain && removedFlagged === 0 && oldFlagged === 0,
      'flagged ' + JSON.stringify(flagged) + '; zip on "don\'t warn again"=' + !!r1.zip + ', asked on the next export=' + askedAgain + '; removed misc flagged=' + removedFlagged + '; pre-build misc flagged=' + oldFlagged);
  }

  // T223 — review #9: Today / Yesterday and Reuse went by the day a unit was SAVED
  async function t223_todayAndYesterdayFollowTheSurveyDate() {
    const N = 'T223 the saved list\'s Today / Yesterday follow the survey date (the day the unit goes out on), and Reuse offers the photos TAKEN today — also on an older unit — never an older photo of a unit saved today';
    await resetAppState();
    const at = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(10, 0, 0, 0); return d.toISOString(); };
    const U1 = mkEntry('U1-223', { savedAt: at(0) }); U1.surveyDate = dayAgo(1);
    const U2 = mkEntry('U2-223', { savedAt: at(3) }); U2.surveyDate = dayAgo(0);
    const k1 = photoStoreKey(U1.id, 'main'), k2 = photoStoreKey(U2.id, 'main');
    await storePhotoBytes(k1, dataUrlFromBytesSeed('u1-223')); await storePhotoBytes(k2, dataUrlFromBytesSeed('u2-223'));
    U1.photos = { equip_main: { dbKey: k1, thumbnail: TINY_THUMB, timestamp: at(3), fileType: 'image/jpeg' } };
    U2.photos = { equip_main: { dbKey: k2, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg' } };
    savedEquipment = [U1, U2]; saveAll();
    const listed = (f) => { setSavedFilter(f); return document.getElementById('savedPanelBody').textContent; };
    const today = listed('today'), yday = listed('yesterday');
    setSavedFilter('all');
    const offered = collectTodaysPhotos().map(p => p.dbKey);
    record(N, /U2-223/.test(today) && !/U1-223/.test(today) && /U1-223/.test(yday) && !/U2-223/.test(yday) && offered.includes(k2) && !offered.includes(k1),
      'Today lists ' + JSON.stringify((today.match(/U\d-223/g) || [])) + ', Yesterday ' + JSON.stringify((yday.match(/U\d-223/g) || [])) + '; Reuse offers today\'s photo=' + offered.includes(k2) + ', the older one=' + offered.includes(k1));
  }

  // T224 — review #8: entries.json's misc capture times stopped lining up with its misc files
  async function t224_miscCaptureTimesLineUpWithTheirFiles() {
    const N = 'T224 entries.json lists a capture time for each misc photo FILE it ships, in the same order — a misc photo missing from the export no longer shifts the times';
    await resetAppState();
    const M = mkEntry('M-224');
    const kGone = photoStoreKey(M.id, mintMiscSlotToken()), kOk = photoStoreKey(M.id, mintMiscSlotToken());
    const du = dataUrlFromBytesSeed('m224'); await storePhotoBytes(kOk, du);
    M.miscPhotos = [
      { dbKey: kGone, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg', unsaved: false, capturedAt: '2026-10-01T08:00:00-04:00', capturedFrom: 'camera' },
      { dbKey: kOk, thumbnail: TINY_THUMB, timestamp: new Date().toISOString(), fileType: 'image/jpeg', unsaved: false, sha256: await sha256HexOfDataUrl(du), capturedAt: '2026-10-02T09:00:00-04:00', capturedFrom: 'camera' }];
    savedEquipment = [M]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const je = ((await unzipExport(zip.blob)).entriesJson.entries || []).find(e => e.equipName === 'M-224') || {};
    const files = (je.photoFiles || {}).misc || [], caps = (je.photoCaptured || {}).misc || [];
    record(N, files.length === 1 && caps.length === 1 && !!caps[0] && caps[0].capturedAt === '2026-10-02T09:00:00-04:00',
      'misc files ' + JSON.stringify(files) + '; misc times ' + JSON.stringify(caps));
  }

  // T225 — review #10: a file picked on a desktop got "now" as a camera time
  async function t225_aFilePickedOnADesktopIsNotACameraShot() {
    const N = 'T225 a picture picked through a photo slot on a desktop browser (it opens a file chooser for capture="environment") with no time inside gets no capture time — never "now" as a camera shot; on the iPad a camera shot still does';
    await resetAppState();
    fillForm('W-225');
    const real = window.deviceCameraCapture;
    const shoot = async (slot, seed) => {
      handlePhoto({ files: [await makePhotoFile(seed)], hasAttribute: (a) => a === 'capture' }, slot);
      await waitFor(() => photos[slot] && photos[slot].dbKey && photos[slot].unsaved === false, 15000, 'the ' + slot + ' photo');
      await waitForPhotoWritesIdle(15000);
      return { at: photos[slot].capturedAt || '', from: photos[slot].capturedFrom || '' };
    };
    let desk, ipad;
    try {
      window.deviceCameraCapture = () => false;
      desk = await shoot('equip_main', 'w225a');
      window.deviceCameraCapture = () => true;
      ipad = await shoot('equip_dataplate', 'w225b');
    } finally { window.deviceCameraCapture = real; }
    record(N, !desk.at && !desk.from && ipad.from === 'camera' && !!ipad.at,
      'desktop pick ' + JSON.stringify(desk) + '; iPad camera ' + JSON.stringify(ipad));
  }

  // T226 — review #11: the automatic Yes was kept in step by hand, path by path
  async function t226_anAutomaticYesFollowsItsPhotoOnEveryPath() {
    const N = 'T226 an automatic Duplicate = Yes holds only while its source\'s photo is a borrowed one, on every path — here the pump-count copies of an Electrical row whose photo came by Reuse are No (they copied the Yes with no photo), the photographed row stays Yes';
    await resetAppState();
    fillFormNoSources('M-226');
    await captureInto('equip_main', await makePhotoFile('m226'));
    const sel = document.getElementById('equipTemplate');
    sel.value = 'Medical Vacuum';
    await withDialogs({ confirm: true }, async () => { handleTemplateChange(); });
    closeAllPrompts();
    const i0 = sources.findIndex(s => /^Electrical/.test(s.energySource || ''));
    if (i0 < 0) return record(N, false, 'Medical Vacuum gave no Electrical row');
    const cands = collectTodaysPhotos(); _reuseCandidates = cands;
    await reusePhotoInto('source_' + i0, cands.findIndex(c => c.dbKey === photos.equip_main.dbKey));
    await waitForPhotoWritesIdle(10000);
    const before = sources[i0].duplicate + '/' + !!sources[i0].dupAuto;
    applyElectricalCountChoice(3);
    const elec = sources.map((s, i) => ({ s, i })).filter(x => /^Electrical/.test(x.s.energySource || ''));
    const states = elec.map(x => x.s.duplicate + (x.s.dupAuto ? '(auto)' : '') + (photos['source_' + x.i] && photos['source_' + x.i].dbKey ? '+photo' : ''));
    record(N, before === 'Yes/true' && elec.length === 3 && states[0] === 'Yes(auto)+photo' && states[1] === 'No' && states[2] === 'No',
      'reused row before ' + before + '; Electrical rows after 3 pumps ' + JSON.stringify(states));
  }

  // T227 — review #12: the survey-date question was a second copy of the question box
  async function t227_theSurveyDateQuestionIsTheAppsQuestionBox() {
    const N = 'T227 the "no survey date" question at export is the app\'s own question box with a date field (Use this date stays off until a whole date up to today is entered), and answers with that date';
    await resetAppState();
    const rp = window.__askChoiceAuto;
    window.__askChoiceAuto = undefined;
    let got = null, ov = null, offAtFirst = null, onAfter = null;
    try {
      const p = askSurveyDate([mkEntry('Q-227')]);
      ov = document.getElementById('choiceDialogOverlay');
      const input = ov && ov.querySelector('input[type="date"]');
      const use = ov && [...ov.querySelectorAll('button')].find(b => /use this date/i.test(b.textContent));
      offAtFirst = !!(use && use.disabled);
      if (input && use) {
        input.value = dayAgo(2); input.dispatchEvent(new Event('input', { bubbles: true }));
        onAfter = !use.disabled;
        use.click();
      } else {
        const any = document.getElementById('surveyDateCancel') || (ov && ov.querySelector('button'));
        if (any) any.click();
      }
      got = await Promise.race([p, sleep(2000).then(() => 'timeout')]);
    } finally {
      window.__askChoiceAuto = rp;
      ['choiceDialogOverlay', 'surveyDateOverlay'].forEach(id => { const o = document.getElementById(id); if (o) o.remove(); });
    }
    record(N, !!ov && offAtFirst === true && onAfter === true && got === dayAgo(2),
      'question box ' + (ov ? ov.id : 'none (a separate dialog)') + '; Use this date off at first=' + offAtFirst + ', on after a date=' + onAfter + '; answered ' + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 111 — loto-web's templates the app could not pick (2026-10-18):
  // Medical Vacuum Pump, Chemical Pump, Compressed Air Tank, Blower,
  // Switchgear and Electrical with Stored Energy. Fails on build 110.
  // ==========================================================================

  // T228 — every one of them can be picked, with its own rows, and exports
  // under loto-web's name
  async function t228_everyLotoWebTemplateCanBePicked() {
    const N = 'T228 loto-web\'s six templates the app lacked: the Vacuum Pump type offers Medical Vacuum Pump (one pump on a shared receiver: its Hand/Off/Auto disconnect at the picked voltage and the Vacuum Air In ball valve, no pump-count prompt); Chemical Feed Pump and Chemical Pump pick Chemical Pump (120V default kept on the Chemical Pump type); the new Compressed Air Tank type picks its template (one Compressed Air In ball valve, no Electrical row, no voltage prompt, no Electrical expected — also on the Air Compressor type); the new Blower type picks Blower (a disconnect, no Kinetic); the new Switchgear and VFD types pick Switchgear and Electrical with Stored Energy (one Meter-verified feed up to 4160V, no Stored Electrical Energy row); Transformer asks between Standard Electrical and Electrical with Stored Energy; custom names follow loto-web\'s words; every type\'s choices are on the template list; the export says each name';
    await resetAppState();
    const rowsOf = () => sources.map(x => [x.energySource, x.deviceType, x.verification].join('/'));
    // Pick a type; answer the template prompt with `template` and the voltage prompt with `volt`.
    const pickType = async (type, template, volt) => {
      fillFormNoSources('T228-' + type);
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = type;
      const seen = { choices: null, volts: null, count: false };
      // build 112: the Vacuum Pump type asks what the record covers (the answer = the template)
      await withDialogs({ confirm: true, choice: { 'vacuum-cover': template || 'cancel', 'pump-inlet-valve': 'yes' } }, async () => {
        handleEquipTypeChange();
        await sleep(0);
        const tp = document.getElementById('templatePromptOverlay');
        if (tp) {
          seen.choices = [...tp.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => !/skip/i.test(t));
          if (template) applyTemplatePromptChoice(template);
        }
        if (document.getElementById('templateConfirmOverlay') && template) confirmTemplateChange(template);
        const vo = document.getElementById('templateVoltageOverlay');
        if (vo) {
          seen.volts = [...vo.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /^\d+V$/.test(t));
          if (volt) applyTemplateVoltageChoice(volt);
        }
        seen.count = !!document.getElementById('electricalCountOverlay');
      });
      closeAllPrompts();
      return Object.assign(seen, { template: getTemplate(), rows: rowsOf(),
        offered: [...document.getElementById('equipTemplate').options].map(o => o.value).filter(v => v && v !== '** New Template **') });
    };
    const r = {};
    r.mvp = await pickType('Vacuum Pump', 'Medical Vacuum Pump', '480V');
    r.cfp = await pickType('Chemical Feed Pump', null, '208V');
    r.cp = await pickType('Chemical Pump', null, null);
    r.tank = await pickType('Compressed Air Tank', null, null);
    r.acTank = await pickType('Air Compressor', 'Compressed Air Tank', null);
    r.blower = await pickType('Blower', null, '480V');
    r.swgr = await pickType('Switchgear', null, '4160V');
    r.vfd = await pickType('VFD', null, '480V');
    r.xfmr = await pickType('Transformer', 'Electrical with Stored Energy', '480V');
    const fails = [];
    const want = (ok, what) => { if (!ok) fails.push(what); };
    want(r.mvp.template === 'Medical Vacuum Pump' && r.mvp.offered.join() === 'Vacuum Pump,Medical Vacuum,Medical Vacuum Pump,Lab Vacuum,Dental Vacuum'
      && r.mvp.rows.join('|') === 'Electrical 480V/Disconnect/SW (Hand/Off/Auto)|Vacuum Air In/Ball Valve/Gauge/Drain' && !r.mvp.count
      && (r.mvp.volts || []).join() === '120V,208V,240V,480V', 'Medical Vacuum Pump');
    want(r.cfp.template === 'Chemical Pump' && r.cfp.offered.join() === 'Chemical Pump' && r.cfp.rows.join('|') === 'Electrical 208V//', 'Chemical Feed Pump');
    want(r.cp.template === 'Chemical Pump' && r.cp.offered.join() === 'Chemical Pump' && r.cp.rows.join('|') === 'Electrical 120V//' && !!r.cp.volts, 'Chemical Pump type');
    want(r.tank.template === 'Compressed Air Tank' && r.tank.rows.join('|') === 'Compressed Air In/Ball Valve/Gauge/Drain' && !r.tank.volts, 'Compressed Air Tank type');
    want(r.acTank.template === 'Compressed Air Tank' && r.acTank.offered.join() === 'Air Compressor,Medical Air,Dental Air Compressor,Compressed Air Tank'
      && !r.acTank.rows.some(x => /^Electrical|^Kinetic/.test(x)) && !r.acTank.volts, 'Air Compressor -> Compressed Air Tank');
    want(!expectsElectricalSource('Compressed Air Tank', 'Compressed Air Tank') && !expectsElectricalSource('Air Compressor', 'Compressed Air Tank')
      && expectsElectricalSource('Air Compressor', 'Air Compressor'), 'tank expects no Electrical');
    want(r.blower.template === 'Blower' && r.blower.rows.join('|') === 'Electrical 480V/Disconnect/Controls' && expectsElectricalSource('Blower', 'Blower'), 'Blower');
    want(r.swgr.template === 'Switchgear' && r.swgr.rows.join('|') === 'Electrical 4160V//Meter' && (r.swgr.volts || []).includes('4160V')
      && expectsElectricalSource('Switchgear', 'Switchgear'), 'Switchgear');
    want(r.vfd.template === 'Electrical with Stored Energy' && r.vfd.rows.join('|') === 'Electrical 480V//Meter'
      && !r.vfd.rows.some(x => /^Stored/.test(x)) && expectsElectricalSource('VFD', 'Electrical with Stored Energy'), 'VFD');
    want(r.xfmr.template === 'Electrical with Stored Energy' && (r.xfmr.choices || []).length === 2
      && (r.xfmr.choices || []).some(t => /capacitor bank/i.test(t)) && r.xfmr.rows.join('|') === 'Electrical 480V//Meter', 'Transformer');
    // custom equipment type names
    const custom = async (typed) => {
      fillFormNoSources('C-228');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = '** New Equipment Type **';
      document.getElementById('equipTypeCustom').value = typed;
      await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
      closeAllPrompts();
      return getTemplate();
    };
    const customs = {};
    for (const typed of ['Boiler Chemical Feed Pump', 'Chem Feed Pump 2', 'Air Receiver 2', 'Medical Air Receiver Tank', 'Pneumatic Tube Blower',
                         'AHU-3 Supply VFD', 'Main Switchgear', 'Medical Vacuum Pump 2', 'Booster Pump']) customs[typed] = await custom(typed);
    want(customs['Boiler Chemical Feed Pump'] === 'Chemical Pump' && customs['Chem Feed Pump 2'] === 'Chemical Pump'
      && customs['Air Receiver 2'] === 'Compressed Air Tank' && customs['Medical Air Receiver Tank'] !== 'Compressed Air Tank'
      && customs['Pneumatic Tube Blower'] === 'Blower' && customs['AHU-3 Supply VFD'] === 'Electrical with Stored Energy'
      && customs['Main Switchgear'] === 'Switchgear' && customs['Medical Vacuum Pump 2'] !== 'Medical Vacuum Pump'
      && customs['Booster Pump'] === 'Standard Pump', 'custom names');
    // every type's choices are templates the list (and app-lists.json) carries
    const offList = [];
    Object.keys(EQUIPMENT_TEMPLATE_MAP).forEach(t => EQUIPMENT_TEMPLATE_MAP[t].forEach(x => { if (!DATA.templates.includes(x)) offList.push(t + ' -> ' + x); }));
    ['Compressed Air Tank', 'Blower', 'Switchgear', 'VFD'].forEach(t => { if (!DATA.equipmentTypes.includes(t)) offList.push('type ' + t); });
    want(!offList.length, 'off the list: ' + offList.join(', '));
    // the export carries each name exactly (an empty form, so it holds these units only)
    await resetAppState();
    const NEW = [['Vacuum Pump', 'Medical Vacuum Pump', 'Vacuum Air In'], ['Chemical Feed Pump', 'Chemical Pump', 'Electrical 120V'],
                 ['Compressed Air Tank', 'Compressed Air Tank', 'Compressed Air In'], ['Blower', 'Blower', 'Electrical 208V'],
                 ['Switchgear', 'Switchgear', 'Electrical 480V'], ['VFD', 'Electrical with Stored Energy', 'Electrical 480V']];
    savedEquipment = NEW.map(([type, template, src], i) => {
      const e = mkEntry('T228 Unit ' + (i + 1), { sources: [Object.assign(mkSrc(src), { sourceId: genUuid(), deviceType: /^Electrical/.test(src) ? 'Disconnect' : 'Ball Valve' })] });
      e.equipType = type; e.template = template;
      return e;
    });
    saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const jeTemplates = ((u.entriesJson && u.entriesJson.entries) || []).map(e => e.template).sort();
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheetTemplates = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => {
        if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheetTemplates.push(String(ws.getRow(row.number + 1).getCell(8).value || ''));
      });
    }
    sheetTemplates.sort();
    const wantNames = NEW.map(x => x[1]).sort().join();
    want(jeTemplates.join() === wantNames && sheetTemplates.join() === wantNames, 'export');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(r) + '; custom ' + JSON.stringify(customs)
      + '; entries.json ' + JSON.stringify(jeTemplates) + '; sheet ' + JSON.stringify(sheetTemplates));
  }

  // ==========================================================================
  // BUILD 112 — loto-web's prompts it can use today (2026-10-18). Each test
  // fails on build 111.
  // ==========================================================================

  // T229 — one question says what a vacuum record covers; a medical vacuum
  // pump's own exhaust valve gets a row; its disconnect is on the panel
  async function t229_aVacuumRecordSaysWhatItCovers() {
    const N = 'T229 the Vacuum Pump type asks "What does this record cover?" (Patient care: one pump on a shared receiver / Patient care: the receiver and all its pumps / Laboratory: the receiver and all its pumps / Choose later) and the answer is the template; Medical Vacuum Pump starts its disconnect at "Panel" and, after the voltage, asks about the exhaust — "its own valve" adds a Vacuum Air Out ball valve row, "no" adds none; Laboratory gives Lab Vacuum and its pump count; Choose later leaves no template; a vacuum template picked from the list asks too (the answer wins, Cancel keeps the unit\'s template, a Lab Vacuum type with one choice does not ask)';
    await resetAppState();
    const rows = () => sources.map(x => [x.energySource, x.deviceType, x.location, x.verification].join('/'));
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const viaType = async (answer, exhaust) => {
      fillFormNoSources('VP-229');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = 'Vacuum Pump';
      let asked = null, count = false, exhaustAsked = false;
      await withDialogs({ confirm: true, choice: (o) => {
        if (o.id === 'vacuum-cover') { asked = o; return answer; }
        if (o.id === 'pump-inlet-valve') return 'yes';   // build 114
        if (o.id === 'vacuum-exhaust') { exhaustAsked = true; return exhaust || 'cancel'; }
        return 'cancel';
      } }, async () => {
        handleEquipTypeChange();
        await sleep(0);
        if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('480V');
        await sleep(0);
        count = !!document.getElementById('electricalCountOverlay');
      });
      closeAllPrompts();
      return { labels: asked ? asked.choices.map(c => c.label) : null, values: asked ? asked.choices.map(c => c.value) : null,
               template: getTemplate(), rows: rows(), count, exhaustAsked, templatePrompt: !!document.getElementById('templatePromptOverlay') };
    };
    got.own = await viaType('Medical Vacuum Pump', 'own');
    want((got.own.labels || []).join('|') === 'Patient care: one pump on a shared receiver|Patient care: the receiver and all its pumps|Laboratory: the receiver and all its pumps|Dental: the tank and all its pumps|Choose later'
      && (got.own.values || []).slice(0, 4).join() === 'Medical Vacuum Pump,Medical Vacuum,Lab Vacuum,Dental Vacuum', 'the question');   // Dental since build 114
    want(got.own.template === 'Medical Vacuum Pump' && got.own.exhaustAsked && !got.own.count
      && got.own.rows.join('|') === 'Electrical 480V/Disconnect/Panel/SW (Hand/Off/Auto)|Vacuum Air In/Ball Valve//Gauge/Drain|Vacuum Air Out/Ball Valve//', 'own exhaust valve');
    got.no = await viaType('Medical Vacuum Pump', 'no');
    want(got.no.template === 'Medical Vacuum Pump' && got.no.rows.length === 2 && !got.no.rows.some(x => /Vacuum Air Out/.test(x)), 'no exhaust valve');
    got.lab = await viaType('Lab Vacuum');
    want(got.lab.template === 'Lab Vacuum' && got.lab.count && !got.lab.exhaustAsked, 'laboratory');
    got.later = await viaType('cancel');
    want(got.later.template === '' && !got.later.templatePrompt, 'choose later');
    got.system = await viaType('Medical Vacuum');
    want(got.system.template === 'Medical Vacuum' && !got.system.exhaustAsked, 'the receiver and all its pumps');
    // picked from the list: the form is on Medical Vacuum (got.system) with its rows
    const pickFromList = async (value, answer) => {
      let asked = null;
      await withDialogs({ confirm: true, choice: (o) => { if (o.id === 'vacuum-cover') { asked = o; return answer; } if (o.id === 'pump-inlet-valve') return 'yes'; return 'cancel'; } }, async () => {
        rememberTemplateBefore();
        document.getElementById('equipTemplate').value = value;
        await onTemplateSelectChange();
        await sleep(0);
      });
      closeAllPrompts();
      return { asked: !!asked, primary: asked ? (asked.choices.find(c => c.primary) || {}).value : null, template: getTemplate(), rows: rows() };
    };
    const sysRows = rows().join('|');
    got.listKeep = await pickFromList('Medical Vacuum Pump', 'Medical Vacuum');
    want(got.listKeep.asked && got.listKeep.primary === 'Medical Vacuum Pump' && got.listKeep.template === 'Medical Vacuum' && got.listKeep.rows.join('|') === sysRows, 'list pick, answer keeps the template');
    got.listCancel = await pickFromList('Lab Vacuum', 'cancel');
    want(got.listCancel.asked && got.listCancel.template === 'Medical Vacuum' && got.listCancel.rows.join('|') === sysRows, 'list pick, Cancel');
    got.listTake = await pickFromList('Medical Vacuum Pump', 'Medical Vacuum Pump');
    want(got.listTake.asked && got.listTake.template === 'Medical Vacuum Pump', 'list pick, answer taken');
    // a template that is not a vacuum one: no question
    got.listOther = await pickFromList('Vacuum Pump', 'Medical Vacuum');
    want(!got.listOther.asked && got.listOther.template === 'Vacuum Pump', 'list pick of plain Vacuum Pump');
    // the Lab Vacuum type offers one answer: no question
    fillFormNoSources('LV-229');
    document.getElementById('equipType').value = 'Lab Vacuum';
    filterTemplateDropdown('Lab Vacuum');
    document.getElementById('equipTemplate').value = '';
    got.labType = await pickFromList('Lab Vacuum', 'Medical Vacuum Pump');
    want(!got.labType.asked && got.labType.template === 'Lab Vacuum', 'Lab Vacuum type');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T230 — an AHU's count prompt gives a Kinetic row per fan
  async function t230_anAhuGetsAKineticRowPerFan() {
    const N = 'T230 the AHU count prompt adds a Kinetic row per fan, not just Electrical rows: AHU - Steam with 2 gives two Electrical and two Kinetic rows ("At Supply Fan", then "At Return Fan", each its own row); 1 keeps one of each; going back from 2 to 1 removes the added Kinetic row; Medical Air with 3 keeps its single Kinetic row';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const kin = () => sources.filter(x => x.energySource === 'Kinetic');
    const elec = () => sources.filter(x => /^Electrical /.test(x.energySource || ''));
    const setup = async (type, template, n) => {
      fillFormNoSources('AHU-230');
      document.getElementById('equipType').value = type;
      filterTemplateDropdown(type);
      await withDialogs({ confirm: true }, async () => {
        pickTemplate(template);
        if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('480V');
        if (document.getElementById('electricalCountOverlay')) applyElectricalCountChoice(n);
      });
      closeAllPrompts();
      return { kin: kin().map(x => x.location), elec: elec().length, distinct: new Set(kin()).size === kin().length };
    };
    got.two = await setup('Air Handler', 'AHU - Steam', 2);
    const k2 = kin();
    want(got.two.elec === 2 && got.two.kin.join() === 'At Supply Fan,At Return Fan' && got.two.distinct
      && (!k2[1].sourceId || k2[1].sourceId !== k2[0].sourceId), 'two fans');
    applyElectricalCountChoice(1);
    got.back = { kin: kin().map(x => x.location), elec: elec().length };
    want(got.back.elec === 1 && got.back.kin.join() === 'At Supply Fan', 'back to one');
    got.one = await setup('Air Handler', 'AHU - HHW', 1);
    want(got.one.elec === 1 && got.one.kin.join() === 'At Supply Fan', 'one fan');
    got.geo = await setup('Air Handler', 'AHU - Geothermal', 2);
    want(got.geo.elec === 2 && got.geo.kin.length === 2, 'geothermal');
    got.medAir = await setup('Air Compressor', 'Medical Air', 3);
    want(got.medAir.elec === 3 && got.medAir.kin.length === 1, 'medical air');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T231 — a room that already has the other kind of medical vacuum record
  async function t231_theSameRoomRecordedBothWaysIsNoticed() {
    const N = 'T231 Save & New notices a medical vacuum record whose room (same facility and building; case, spaces and dashes ignored) already has the other kind — "This room already has Medical Vacuum: the receiver and all its pumps. Keep both only if the site wants both procedures." for a pump record, the mirror for a system record — and lists it under "Check before saving"; another room, another facility, the same kind, the unit itself or a Lab Vacuum gives none';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const saved = (template, building, room, hospitalCode) => Object.assign(mkEntry('MV ' + template, { building, room }),
      { equipType: 'Vacuum Pump', template, hospitalCode: hospitalCode || '' });
    const formAs = (template, building, room) => {
      fillFormNoSources('MV-231');
      document.getElementById('equipType').value = 'Vacuum Pump';
      filterTemplateDropdown('Vacuum Pump');
      document.getElementById('equipTemplate').value = template;
      setBuilding(building);
      document.getElementById('equipRoom').value = room;
    };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('Kansas City');
      savedEquipment = [saved('Medical Vacuum', 'Bldg 1', 'VB-720', 'Kansas City')];
      formAs('Medical Vacuum Pump', 'bldg 1', 'vb 720');
      got.pump = collectSaveNotices();
      want(got.pump.join() === 'This room already has Medical Vacuum: the receiver and all its pumps. Keep both only if the site wants both procedures.', 'pump record');
      formAs('Medical Vacuum Pump', 'Bldg 1', 'VB-721');
      want(!collectSaveNotices().length, 'another room');
      formAs('Medical Vacuum Pump', 'Bldg 26', 'VB-720');
      want(!collectSaveNotices().length, 'another building');
      formAs('Lab Vacuum', 'Bldg 1', 'VB-720');
      want(!collectSaveNotices().length, 'lab vacuum');
      savedEquipment = [saved('Medical Vacuum', 'Bldg 1', 'VB-720', 'Marion')];
      formAs('Medical Vacuum Pump', 'Bldg 1', 'VB-720');
      want(!collectSaveNotices().length, 'another facility');
      savedEquipment = [saved('Medical Vacuum Pump', 'Bldg 1', 'VB720', 'Kansas City')];
      formAs('Medical Vacuum', 'BLDG 1', 'VB - 720');
      got.system = collectSaveNotices();
      want(got.system.join() === 'This room already has Medical Vacuum Pump: one pump on a shared receiver. Keep both only if the site wants both procedures.', 'system record');
      formAs('Medical Vacuum Pump', 'Bldg 1', 'VB-720');
      want(!collectSaveNotices().length, 'the same kind');
      // the unit itself, on Edit
      const self = saved('Medical Vacuum', 'Bldg 1', 'VB-720', 'Kansas City');
      savedEquipment = [self];
      formAs('Medical Vacuum Pump', 'Bldg 1', 'VB-720');
      currentEntryId = self.id;
      want(!collectSaveNotices().length, 'the unit itself');
      currentEntryId = null;
      // the dialog
      showIncompleteWarning([], ['This room already has X.']);
      const o = document.getElementById('incompleteWarningOverlay');
      got.dialog = o ? o.textContent.replace(/\s+/g, ' ').trim() : '';
      want(/Check before saving/.test(got.dialog) && /This room already has X\./.test(got.dialog) && !/still missing/.test(got.dialog) && /Go back Save anyway/.test(got.dialog), 'dialog');
      closeIncompleteWarning();
      showIncompleteWarning(['Main info — Room'], ['This room already has X.']);
      const o2 = document.getElementById('incompleteWarningOverlay');
      got.dialog2 = o2 ? o2.textContent.replace(/\s+/g, ' ').trim() : '';
      want(/Incomplete entry/.test(got.dialog2) && /1 item is still missing/.test(got.dialog2) && /This room already has X\./.test(got.dialog2), 'dialog with gaps');
      closeIncompleteWarning();
    } finally {
      setHospitalCode(prevCode);
      savedEquipment = [];
    }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 113 — the 2026-10-18 medium review of builds 110–112.
  // ==========================================================================

  // T232 — a lower count never removes a row holding the user's data; a count
  // copy carries no tag or edit mark of the row it copies
  async function t232_aLowerCountKeepsTheUsersRows() {
    const N = 'T232 the count prompt: a copy of the first disconnect carries none of its Device ID or edit mark; going from 2 back to 1 keeps a second Electrical row with a typed Device ID and a second Kinetic row with a typed location (and says so), and still removes rows nobody touched';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const elec = () => sources.filter(x => /^Electrical /.test(x.energySource || ''));
    const kin = () => sources.filter(x => x.energySource === 'Kinetic');
    const setup = async () => {
      fillFormNoSources('AHU-232');
      document.getElementById('equipType').value = 'Air Handler';
      filterTemplateDropdown('Air Handler');
      await withDialogs({ confirm: true }, async () => {
        pickTemplate('AHU - Steam');
        if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('480V');
      });
      closeAllPrompts();
    };
    await setup();
    updateSource(sources.indexOf(elec()[0]), 'deviceId', 'VFD-1');
    applyElectricalCountChoice(2);
    got.copy = { tag: elec()[1].deviceId || '', edited: !!elec()[1].userEdited, first: elec()[0].deviceId };
    want(elec().length === 2 && !got.copy.tag && !got.copy.edited && got.copy.first === 'VFD-1', 'the copy');
    updateSource(sources.indexOf(elec()[1]), 'deviceId', 'VFD-2');
    updateSource(sources.indexOf(kin()[1]), 'location', 'Return fan plenum');
    const toasts = await withToasts(async () => { applyElectricalCountChoice(1); });
    got.kept = { elec: elec().map(x => x.deviceId || ''), kin: kin().map(x => x.location), toasts };
    want(got.kept.elec.join() === 'VFD-1,VFD-2' && got.kept.kin.join() === 'At Supply Fan,Return fan plenum', 'edited rows kept');
    // untouched rows still go
    await setup();
    applyElectricalCountChoice(2);
    applyElectricalCountChoice(1);
    got.plain = { elec: elec().length, kin: kin().length };
    want(got.plain.elec === 1 && got.plain.kin === 1, 'untouched rows removed');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T233 — custom-name words count at the start of a word
  async function t233_customNameWordsStartAWord() {
    const N = 'T233 a custom equipment type picks a template from a word only at a word start: "Repair Tank 2" and "Hair Tank" get none, "Air Tank 3" Compressed Air Tank, "Booster Pumps" Standard Pump, "AHU-3 VFD" and "VFD-12" Electrical with Stored Energy, "Main Switchgear-2" Switchgear, "Tube Blower" Blower, "Lab Vac 2" Lab Vacuum';
    await resetAppState();
    const custom = async (typed) => {
      fillFormNoSources('C-233');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = '** New Equipment Type **';
      filterTemplateDropdown('');
      document.getElementById('equipTypeCustom').value = typed;
      await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
      closeAllPrompts();
      return getTemplate();
    };
    const wantMap = { 'Repair Tank 2': '', 'Hair Tank': '', 'Air Tank 3': 'Compressed Air Tank', 'Booster Pumps': 'Standard Pump',
      'AHU-3 VFD': 'Electrical with Stored Energy', 'VFD-12': 'Electrical with Stored Energy', 'Main Switchgear-2': 'Switchgear',
      'Tube Blower': 'Blower', 'Lab Vac 2': 'Lab Vacuum' };
    const got = {};
    for (const typed of Object.keys(wantMap)) got[typed] = await custom(typed);
    const wrong = Object.keys(wantMap).filter(k => got[k] !== wantMap[k]);
    record(N, !wrong.length, (wrong.length ? 'WRONG: ' + wrong.join(', ') + ' — ' : '') + JSON.stringify(got));
  }

  // T234 — the template's follow-ups after its voltage come from one place
  async function t234_theTemplatesFollowUpsComeFromOnePlace() {
    const N = 'T234 after a template\'s voltage — picked, kept by default, or with no voltage prompt — its count prompt and a medical vacuum pump\'s exhaust question come from one place (afterTemplateVoltage); a template change that keeps the user\'s own Electrical row still asks for the voltage and then the count';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    got.hook = typeof afterTemplateVoltage === 'function';
    want(got.hook, 'afterTemplateVoltage');
    // an AHU whose own Electrical row (a typed Device ID) is kept through a template change
    fillFormNoSources('AHU-234');
    document.getElementById('equipType').value = 'Air Handler';
    filterTemplateDropdown('Air Handler');
    await withDialogs({ confirm: true }, async () => { pickTemplate('AHU - HHW'); });
    closeAllPrompts();
    const e0 = sources.findIndex(x => /^Electrical /.test(x.energySource || ''));
    updateSource(e0, 'deviceId', 'AHU-234-DISC');
    await withDialogs({ confirm: true }, async () => {
      pickTemplate('AHU - Steam');
      if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange('AHU - Steam');
      got.voltage = !!document.getElementById('templateVoltageOverlay');
      if (got.voltage) keepDefaultVoltage();
      got.count = !!document.getElementById('electricalCountOverlay');
    });
    closeAllPrompts();
    want(getTemplate() === 'AHU - Steam' && got.voltage && got.count && sources.some(x => x.deviceId === 'AHU-234-DISC'), 'kept row, voltage then count');
    // straight from the hook: the count prompt for an AHU, the exhaust question for a medical vacuum pump
    if (got.hook) {
      afterTemplateVoltage();
      got.hookCount = !!document.getElementById('electricalCountOverlay');
      closeAllPrompts();
      let asked = false;
      fillFormNoSources('MVP-234');
      document.getElementById('equipType').value = 'Vacuum Pump';
      filterTemplateDropdown('Vacuum Pump');
      await withDialogs({ confirm: true }, async () => { pickTemplate('Medical Vacuum Pump'); });
      closeAllPrompts();
      await withDialogs({ choice: (o) => { if (o.id === 'vacuum-exhaust') asked = true; return 'cancel'; } }, async () => { afterTemplateVoltage(); await sleep(0); });
      got.hookExhaust = asked;
      want(got.hookCount && got.hookExhaust, 'the hook');
    }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T235 — the vacuum list pick takes the answer directly
  async function t235_theVacuumListPickTakesTheAnswerDirectly() {
    const N = 'T235 a vacuum template picked from the list: answering with the template the unit already has puts the list back and writes nothing (no "Change Template?", the typed Device ID kept); answering with the picked one goes straight to "Change Template?" (the unit has data), whose Cancel restores Medical Vacuum Pump; no autosave in between ever sees a blank template';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('MVP-235');
    document.getElementById('equipType').value = 'Vacuum Pump';
    filterTemplateDropdown('Vacuum Pump');
    await withDialogs({ confirm: true }, async () => { pickTemplate('Medical Vacuum Pump'); });
    closeAllPrompts();
    updateSource(sources.findIndex(x => /^Electrical /.test(x.energySource || '')), 'deviceId', 'MVP-235-DISC');
    const realSave = window.autoSaveCurrent;
    const saves = [];
    window.autoSaveCurrent = function () { saves.push(getTemplate()); return realSave.apply(this, arguments); };
    try {
      const pick = async (value, answer) => {
        await withDialogs({ confirm: true, choice: (o) => o.id === 'vacuum-cover' ? answer : (o.id === 'pump-inlet-valve' ? 'yes' : 'cancel') }, async () => {
          rememberTemplateBefore();
          document.getElementById('equipTemplate').value = value;
          await onTemplateSelectChange();
          await sleep(0);
        });
      };
      await pick('Medical Vacuum', 'Medical Vacuum Pump');
      got.same = { template: getTemplate(), confirm: !!document.getElementById('templateConfirmOverlay'), saves: saves.slice(),
                   tag: sources.some(x => x.deviceId === 'MVP-235-DISC') };
      want(got.same.template === 'Medical Vacuum Pump' && !got.same.confirm && !got.same.saves.length && got.same.tag, 'answer = the unit\'s template');
      saves.length = 0;
      await pick('Medical Vacuum', 'Medical Vacuum');
      got.change = { confirm: !!document.getElementById('templateConfirmOverlay'), saves: saves.slice() };
      cancelTemplateChange();
      got.change.after = getTemplate();
      got.change.tag = sources.some(x => x.deviceId === 'MVP-235-DISC');
      want(got.change.confirm && got.change.after === 'Medical Vacuum Pump' && got.change.tag && !got.change.saves.includes(''), 'answer = the pick');
    } finally {
      window.autoSaveCurrent = realSave;
      closeAllPrompts();
    }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 114 — Dental Vacuum and "a valve for this pump?" (loto-web 2026-10-18)
  // ==========================================================================

  // T236 — a fourth answer, dental; the one-pump answer asks for the pump's own valve
  async function t236_dentalVacuumAndThePumpsOwnValve() {
    const N = 'T236 the vacuum question has a fourth answer, "Dental: the tank and all its pumps" → Dental Vacuum (an Electrical 208V Disconnect / SW (Hand/Off/Auto) per pump from "How many pumps are on this vacuum tank?" and the tank\'s Vacuum Air In ball valve); "one pump on a shared receiver" asks "Is there a valve between the receiver and this pump?" — Yes gives Medical Vacuum Pump, No Medical Vacuum (and says so), Cancel no template; the same from the list; custom "Dental Vac Pump" → Dental Vacuum; the export says "Dental Vacuum"';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const rows = () => sources.map(x => [x.energySource, x.deviceType, x.verification].join('/'));
    const viaType = async (answer, valve) => {
      fillFormNoSources('VP-236');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = 'Vacuum Pump';
      let valveAsked = false, countText = '';
      const toasts = await withToasts(async () => {
        await withDialogs({ confirm: true, choice: (o) => {
          if (o.id === 'vacuum-cover') return answer;
          if (o.id === 'pump-inlet-valve') { valveAsked = true; return valve || 'cancel'; }
          return 'cancel';
        } }, async () => {
          handleEquipTypeChange();
          await sleep(0); await sleep(0);
          if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('208V');
          await sleep(0);
          const o = document.getElementById('electricalCountOverlay');
          countText = o ? o.textContent.replace(/\s+/g, ' ').trim() : '';
          if (o) applyElectricalCountChoice(2);
        });
      });
      closeAllPrompts();
      return { template: getTemplate(), rows: rows(), valveAsked, countText, toasts };
    };
    got.dental = await viaType('Dental Vacuum');
    want(got.dental.template === 'Dental Vacuum' && !got.dental.valveAsked && /pumps are on this vacuum tank/i.test(got.dental.countText)
      && got.dental.rows.join('|') === 'Electrical 208V/Disconnect/SW (Hand/Off/Auto)|Electrical 208V/Disconnect/SW (Hand/Off/Auto)|Vacuum Air In/Ball Valve/Gauge/Drain', 'dental');
    got.yes = await viaType('Medical Vacuum Pump', 'yes');
    want(got.yes.valveAsked && got.yes.template === 'Medical Vacuum Pump', 'one pump, its own valve');
    got.no = await viaType('Medical Vacuum Pump', 'no');
    want(got.no.valveAsked && got.no.template === 'Medical Vacuum' && got.no.toasts.some(t => /receiver and all its pumps/i.test(t)), 'one pump, no valve');
    got.cancel = await viaType('Medical Vacuum Pump', 'cancel');
    want(got.cancel.valveAsked && got.cancel.template === '', 'valve question cancelled');
    got.lab = await viaType('Lab Vacuum');
    want(got.lab.template === 'Lab Vacuum' && !got.lab.valveAsked, 'lab asks no valve question');
    // from the list, on a Medical Vacuum unit: one pump without a valve stays the whole system, untouched
    got.system = await viaType('Medical Vacuum');
    const before = rows().join('|');
    await withDialogs({ confirm: true, choice: (o) => o.id === 'vacuum-cover' ? 'Medical Vacuum Pump' : (o.id === 'pump-inlet-valve' ? 'no' : 'cancel') }, async () => {
      rememberTemplateBefore();
      document.getElementById('equipTemplate').value = 'Medical Vacuum Pump';
      await onTemplateSelectChange();
      await sleep(0); await sleep(0);
    });
    closeAllPrompts();
    got.list = { template: getTemplate(), same: rows().join('|') === before, confirm: !!document.getElementById('templateConfirmOverlay') };
    want(got.system.template === 'Medical Vacuum' && got.list.template === 'Medical Vacuum' && got.list.same && !got.list.confirm, 'list pick');
    // custom name
    fillFormNoSources('C-236');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = '** New Equipment Type **';
    filterTemplateDropdown('');
    document.getElementById('equipTypeCustom').value = 'Dental Vac Pump';
    await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
    closeAllPrompts();
    got.custom = getTemplate();
    want(got.custom === 'Dental Vacuum', 'custom name');
    // the export
    await resetAppState();
    const A = mkEntry('Dental Vacuum 1', { sources: [
      Object.assign(mkSrc('Electrical 208V'), { sourceId: genUuid(), deviceType: 'Disconnect' }),
      Object.assign(mkSrc('Vacuum Air In'), { sourceId: genUuid(), deviceType: 'Ball Valve' })] });
    A.equipType = 'Vacuum Pump'; A.template = 'Dental Vacuum';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheet = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => { if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheet.push(String(ws.getRow(row.number + 1).getCell(8).value || '')); });
    }
    got.export = { json: je.template, sheet };
    want(je.template === 'Dental Vacuum' && sheet.join() === 'Dental Vacuum', 'export');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 115 — Dental Air Compressor (loto-web 2026-10-19, KC-LOTO-285)
  // ==========================================================================

  // T237 — the Air Compressor type offers Dental Air Compressor, with its dryers
  async function t237_dentalAirCompressorAndItsDryers() {
    const N = 'T237 the Air Compressor type offers Dental Air Compressor; it starts with the compressor\'s Electrical (voltage prompted 120–480V) Disconnect / Controls, its Compressed Air Out ball valve (Gauge/Drain), and two rows of two Compressed Air Out ball valves "Below Air Dryers" (the inlets, typed Out as wilkins enters them) and "Above Air Dryers" (the discharges) — no Kinetic, no count prompt — the dryer locations show as themselves on the cards; a custom "Dental Air Plant" gets it; the export says "Dental Air Compressor"';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('DAC-237');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = 'Air Compressor';
    await withDialogs({ confirm: true }, async () => {
      handleEquipTypeChange();
      const tp = document.getElementById('templatePromptOverlay');
      got.choices = tp ? [...tp.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => !/skip/i.test(t)) : null;
      if (tp) applyTemplatePromptChoice('Dental Air Compressor');
      const vo = document.getElementById('templateVoltageOverlay');
      got.volts = vo ? [...vo.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /^\d+V$/.test(t)) : null;
      if (vo) applyTemplateVoltageChoice('480V');
      got.count = !!document.getElementById('electricalCountOverlay');
    });
    closeAllPrompts();
    got.template = getTemplate();
    got.rows = sources.map(x => [x.energySource, x.deviceType, x.quantity, x.location, x.verification].join('/'));
    [2, 3].forEach(i => { if (sources[i]) sources[i].collapsed = false; });   // template rows start collapsed
    renderSources();
    got.shown = [2, 3].map(i => { const el = document.getElementById('src_loc_' + i); return el ? el.value : null; });
    want((got.choices || []).join() === 'Air Compressor,Medical Air,Dental Air Compressor,Compressed Air Tank', 'offered');
    want(got.template === 'Dental Air Compressor' && (got.volts || []).join() === '120V,208V,240V,480V' && !got.count, 'template, voltage, no count');
    want(got.rows.join('|') === 'Electrical 480V/Disconnect/1//Controls|Compressed Air Out/Ball Valve/1//Gauge/Drain|Compressed Air Out/Ball Valve/2/Below Air Dryers/|Compressed Air Out/Ball Valve/2/Above Air Dryers/', 'rows');
    want(got.shown.join() === 'Below Air Dryers,Above Air Dryers', 'dryer locations on the cards');
    // custom name
    fillFormNoSources('C-237');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = '** New Equipment Type **';
    filterTemplateDropdown('');
    document.getElementById('equipTypeCustom').value = 'Dental Air Plant';
    await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
    closeAllPrompts();
    got.custom = getTemplate();
    want(got.custom === 'Dental Air Compressor', 'custom name');
    // the export
    await resetAppState();
    const A = mkEntry('Dental Air Compressor 1', { sources: [
      Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), deviceType: 'Disconnect' }),
      Object.assign(mkSrc('Compressed Air Out'), { sourceId: genUuid(), deviceType: 'Ball Valve', quantity: 2, location: 'Below Air Dryers' })] });
    A.equipType = 'Air Compressor'; A.template = 'Dental Air Compressor';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheet = [], locs = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => {
        if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheet.push(String(ws.getRow(row.number + 1).getCell(8).value || ''));
        if (String(row.getCell(1).value || '') === 'Compressed Air Out') locs.push(String(row.getCell(5).value || ''));
      });
    }
    got.export = { json: je.template, sheet, locs };
    want(je.template === 'Dental Air Compressor' && sheet.join() === 'Dental Air Compressor' && locs.join() === 'Below Air Dryers', 'export');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 116 — DA Tank template (loto-web 2026-10-21, KC-LOTO-163)
  // ==========================================================================

  // T238 — the DA Tank type picks its own DA Tank template with what it had
  async function t238_daTankIsATemplateOfItsOwn() {
    const N = 'T238 the DA Tank type picks the new DA Tank template (the only one offered) with exactly the rows, sketch and no-Electrical rule it had on Heat Exchanger - Steam (LPS 10 PSI gate valve; Condensate Out gate valve Below Equipment, Temp Only - Hot; no voltage prompt; no "no Electrical source" item); the Heat Exchanger type still offers Heat Exchanger - Steam; a DA Tank saved on Heat Exchanger - Steam opens for Edit on it (DA Tank offered beside it); the export says "DA Tank"';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('DA-238');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = 'DA Tank';
    await withDialogs({ confirm: true }, async () => {
      handleEquipTypeChange();
      got.voltage = !!document.getElementById('templateVoltageOverlay');
    });
    closeAllPrompts();
    const rowsOf = rs => (rs || []).map(x => [x.energySource, x.deviceType, x.location, x.verification].join('/')).join('|');
    got.template = getTemplate();
    got.offered = [...document.getElementById('equipTemplate').options].map(o => o.value).filter(v => v && v !== '** New Template **');
    got.rows = rowsOf(sources);
    want(got.template === 'DA Tank' && got.offered.join() === 'DA Tank' && !got.voltage, 'type picks DA Tank');
    // what the same form shows on Heat Exchanger - Steam (the simplified verification fills the LPS row)
    fillFormNoSources('HX-238');
    document.getElementById('equipType').value = 'Heat Exchanger';
    filterTemplateDropdown('Heat Exchanger');
    await withDialogs({ confirm: true }, async () => { pickTemplate('Heat Exchanger - Steam'); });
    closeAllPrompts();
    got.hxRows = rowsOf(sources);
    want(got.rows === got.hxRows && /^LPS 10 PSI\/Gate Valve\/\/.*\|Condensate Out\/Gate Valve\/Below Equipment\/Temp Only - Hot$/.test(got.rows), 'the same rows');
    want(TEMPLATE_DIAGRAM_MAP['DA Tank'] === TEMPLATE_DIAGRAM_MAP['Heat Exchanger - Steam'], 'the same sketch');
    want(!expectsElectricalSource('DA Tank', 'DA Tank') && !expectsElectricalSource('Deaerator 2', 'DA Tank'), 'no Electrical expected');
    want((EQUIPMENT_TEMPLATE_MAP['Heat Exchanger'] || []).join() === 'Heat Exchanger - Steam,Heat Exchanger - CHW/Glycol', 'Heat Exchanger type unchanged');
    // a DA Tank saved on Heat Exchanger - Steam before build 116
    await resetAppState();
    const A = mkEntry('DA Tank 1', { sources: [Object.assign(mkSrc('LPS 10 PSI'), { sourceId: genUuid(), deviceType: 'Gate Valve' })] });
    A.equipType = 'DA Tank'; A.template = 'Heat Exchanger - Steam';
    savedEquipment = [A]; saveAll();
    await withDialogs({ confirm: true }, async () => { editSaved(0); });
    const sel = document.getElementById('equipTemplate');
    got.edit = { value: sel.value, offered: [...sel.options].map(o => o.value).filter(v => v && v !== '** New Template **') };
    want(got.edit.value === 'Heat Exchanger - Steam' && got.edit.offered.includes('DA Tank'), 'old unit keeps its template');
    // the export
    await resetAppState();
    const B = mkEntry('DA Tank 2', { sources: [Object.assign(mkSrc('LPS 10 PSI'), { sourceId: genUuid(), deviceType: 'Gate Valve' })] });
    B.equipType = 'DA Tank'; B.template = 'DA Tank';
    savedEquipment = [B]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheet = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => { if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheet.push(String(ws.getRow(row.number + 1).getCell(8).value || '')); });
    }
    got.export = { json: je.template, sheet };
    want(je.template === 'DA Tank' && sheet.join() === 'DA Tank', 'export');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 117 — Overhead Door (loto-web 2026-10-21, MA-LOTO-335)
  // ==========================================================================

  // T239 — the Overhead Door type picks the Overhead Door template
  async function t239_overheadDoorTypeAndTemplate() {
    const N = 'T239 the new Overhead Door type picks the Overhead Door template (the only one) with no voltage prompt and three rows — Electrical 208V Breaker at Panel / Controls (the door\'s feed), Gravity/Potential (no photo) and Kinetic / Rotating — expects an Electrical source; the Elevator type is unchanged; a custom "Overhead Door Bay 2" gets it; the export says "Overhead Door" as template and type';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('OD-239');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = 'Overhead Door';
    await withDialogs({ confirm: true }, async () => {
      handleEquipTypeChange();
      got.voltage = !!document.getElementById('templateVoltageOverlay');
      got.prompt = !!document.getElementById('templatePromptOverlay');
    });
    closeAllPrompts();
    got.template = getTemplate();
    got.offered = [...document.getElementById('equipTemplate').options].map(o => o.value).filter(v => v && v !== '** New Template **');
    got.rows = sources.map(x => [x.energySource, x.deviceType, x.location, x.verification, x.noPhoto ? 'noPhoto' : ''].join('/'));
    want(got.template === 'Overhead Door' && got.offered.join() === 'Overhead Door' && !got.voltage && !got.prompt, 'type picks the template, no prompts');
    want(got.rows.join('|') === 'Electrical 208V/Breaker/Panel/Controls/|Gravity/Potential/Potential/On Equipment/Block/noPhoto|Kinetic/Rotating/On Equipment/Rotating/', 'rows');
    want(expectsElectricalSource('Overhead Door', 'Overhead Door'), 'Electrical expected');
    want((EQUIPMENT_TEMPLATE_MAP['Elevator'] || []).join() === 'Elevator - Traction,Elevator - Hydraulic', 'Elevator type unchanged');
    // custom name
    fillFormNoSources('C-239');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = '** New Equipment Type **';
    filterTemplateDropdown('');
    document.getElementById('equipTypeCustom').value = 'Overhead Door Bay 2';
    await withDialogs({ confirm: true }, async () => { handleCustomEquipTypeChange(); });
    closeAllPrompts();
    got.custom = getTemplate();
    want(got.custom === 'Overhead Door', 'custom name');
    // the export
    await resetAppState();
    const A = mkEntry('Overhead Door Bay 1', { sources: [Object.assign(mkSrc('Electrical 120V'), { sourceId: genUuid(), deviceType: 'Breaker', location: 'Panel RP-A' })] });
    A.equipType = 'Overhead Door'; A.template = 'Overhead Door';
    savedEquipment = [A]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
    const xpath = Object.keys(u.files).find(p => /Information_Sheet_.*\.xlsx$/.test(p));
    const sheet = [], types = [];
    if (xpath) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      ws.eachRow(row => {
        if (String(row.getCell(1).value || '') === 'Tied to Equipment') sheet.push(String(ws.getRow(row.number + 1).getCell(8).value || ''));
        if (String(row.getCell(1).value || '') === 'Overhead Door Bay 1') types.push(String(row.getCell(6).value || ''));
      });
    }
    got.export = { json: je.template, sheet, types };
    want(je.template === 'Overhead Door' && sheet.join() === 'Overhead Door' && types.join() === 'Overhead Door', 'export');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ---------- build 118 — loto-web's 2026-10-22 sync spec ---------------------
  // Each unit block of an exported sheet as loto-web numbers it: base = the
  // "Equipment ID/Name" header row − 2; row 24 the summary labels, 25 their
  // values, 26 "Notes:", 27 the notes; source n's header row 2n+2, its data 2n+3.
  async function sheetBlocks(bytes) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(bytes);
    const ws = wb.worksheets[0];
    const v = (r, c) => { const x = ws.getRow(r).getCell(c).value; return x == null ? '' : String(x); };
    const out = {};
    ws.eachRow(row => {
      if (v(row.number, 1) !== 'Equipment ID/Name') return;
      const base = row.number - 2;
      const b = { base, at24: v(base + 24, 1), labels: {}, values: {}, src: [] };
      for (const [slot, [r, c]] of Object.entries(UNIT_SHEET_SLOTS)) { b.labels[slot] = v(base + r, c); b.values[slot] = v(base + r + 1, c); }
      for (let n = 1; n <= 10; n++) b.src.push({ head: v(base + 2 * n + 2, 14) + '/' + v(base + 2 * n + 2, 15), es: v(base + 2 * n + 3, 1), drain: v(base + 2 * n + 3, 14), lock: v(base + 2 * n + 3, 15) });
      out[v(base + 3, 1)] = b;
    });
    return out;
  }

  // T240 — the sheet contract, cell by cell (spec §1.2–1.4).
  async function t240_theAnswersSitUnderTheirLabels() {
    const N = 'T240 the answers for loto-web sit under their own labels on the Information Sheet: Shop and Change Later on every block; UV Lights / Confined Space on an AHU, ATS Make / Backfeed on an ATS, Capacitors on a chiller, Exhaust / Union/Flange on a medical vacuum pump, Refrigerant / PSI wherever there is refrigerant; a source\'s Drain Location and Lock Open under their headers in columns 14–15 (only on the rows that take them); automatic change-later notes; the same answers in entries.json';
    await resetAppState();
    setHospitalCode('');
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const S = (es, extra) => Object.assign(mkSrc(es), { sourceId: genUuid() }, extra || {});
    const ahu = mkEntry('AHU-240', { sources: [
      S('HHW In', { deviceType: 'Gate Valve', verification: 'Drain Only - Hot', drainLocation: { where: 'Between this valve and the equipment', text: ' low point of  coil return ' } }),
      S('HHW Out', { deviceType: 'Gate Valve', verification: 'Temp Only - Hot', drainLocation: { where: 'None found', text: '' } }),
      S('CHW In', { deviceType: 'Gate Valve', verification: 'Temp Only - CHW', lockOpen: true, drainLocation: { where: 'On this valve', text: '' } }),
      S('Electrical 480V', { deviceType: 'Disconnect', lockOpen: true, drainLocation: { where: 'On the equipment', text: 'x' } })
    ] });
    Object.assign(ahu, { equipType: 'Air Handler', template: 'AHU - HHW',
      unitAnswers: { shop: 'Plumbing Shop', uvLights: 'Yes', confinedSpace: 'No', changeLater: 'Feeder not\nfound' } });
    const ats = mkEntry('ATS-240');
    Object.assign(ats, { equipType: 'ATS', template: 'ATS - Generic', unitAnswers: { atsMake: 'Zenith', atsBackfeed: ['PV or battery storage', 'UPS'] } });
    const ch = mkEntry('CH-240');
    Object.assign(ch, { equipType: 'Chiller', template: 'Chiller', unitAnswers: { capacitors: 'No', refrigerant: 'R-134a', refrigerantPsi: '185' } });
    const mvp = mkEntry('MVP-240');
    Object.assign(mvp, { equipType: 'Vacuum Pump', template: 'Medical Vacuum Pump', unitAnswers: { vacuumExhaust: 'Shared line, no valve', reliefJoint: 'No' } });
    const ice = mkEntry('ICE-240', { sources: [S('Electrical 120V'), S('Refrigerant', { deviceType: 'Ball Valve', verification: '' })] });
    Object.assign(ice, { equipType: 'Ice Machine', template: '',
      unitAnswers: { shop: 'Other', shopOther: ' Clinical Eng East ', refrigerant: 'Other', refrigerantOther: 'R-1234ze', refrigerantPsi: ' 200 psi' } });
    const p = mkEntry('P-240');
    savedEquipment = [ahu, ats, ch, mvp, ice, p]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const xpath = Object.keys(u.files).find(q => /Information_Sheet_.*\.xlsx$/.test(q));
    const B = xpath ? await sheetBlocks(u.files[xpath]) : {};
    const cells = (name) => { const b = B[name]; return b ? Object.keys(UNIT_SHEET_SLOTS).map(s => s + '=' + b.labels[s] + ':' + b.values[s]).join('|') : 'missing'; };
    const expect = {
      'AHU-240': 'U1=Shop:Plumbing Shop|U2=Change Later:Feeder not; found | No drain found for source #2 (HHW Out)|U3=UV Lights:Yes|U4=Confined Space:No|U5=:|U6=:|U7=:|U8=:',
      'ATS-240': 'U1=Shop:|U2=Change Later:|U3=ATS Make:Zenith|U4=Backfeed:UPS; PV or battery storage|U5=:|U6=:|U7=:|U8=:',
      'CH-240': 'U1=Shop:|U2=Change Later:|U3=Capacitors:No|U4=:|U5=Refrigerant:R-134a|U6=Refrigerant PSI:185|U7=:|U8=:',
      'MVP-240': 'U1=Shop:|U2=Change Later:' + RELIEF_JOINT_NOTE + '|U3=Exhaust:Shared line, no valve|U4=Union/Flange:No|U5=:|U6=:|U7=:|U8=:',
      'ICE-240': 'U1=Shop:Clinical Eng East|U2=Change Later:|U3=:|U4=:|U5=Refrigerant:R-1234ze|U6=Refrigerant PSI:200|U7=:|U8=:',
      'P-240': 'U1=Shop:|U2=Change Later:|U3=:|U4=:|U5=:|U6=:|U7=:|U8=:'
    };
    got.cells = {};
    for (const name of Object.keys(expect)) { got.cells[name] = cells(name); want(got.cells[name] === expect[name], name + ' cells'); }
    want(Object.keys(B).length === 6 && Object.values(B).every(b => b.at24 === 'Tied to Equipment'), 'row 24 of every block is its summary label row');
    got.psi = ['185.5', '450/250', 'HI 450 LO 250', ' 200 psi', ''].map(v => refrigerantPsiValue({ refrigerantPsi: v })).join(',');
    want(got.psi === '185,450,450,200,', 'the PSI is the first whole number in the box');
    got.ahuSrc = (B['AHU-240'] || { src: [] }).src.slice(0, 4).map(x => [x.head, x.es, x.drain, x.lock].join('|'));
    want(JSON.stringify(got.ahuSrc) === JSON.stringify([
      'Drain Location/Lock Open|HHW In|Between this valve and the equipment: low point of coil return|',
      'Drain Location/Lock Open|HHW Out|None found|',
      'Drain Location/Lock Open|CHW In||Yes',
      'Drain Location/Lock Open|Electrical 480V||']), 'AHU source columns 14–15');
    const je = {}; ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = e; });
    const j = (n) => je[n] || {};
    got.json = {
      ahu: [j('AHU-240').shop, j('AHU-240').uvLights, j('AHU-240').confinedSpace, (j('AHU-240').changeLater || {}).auto, 'atsMake' in j('AHU-240')].join(),
      ats: JSON.stringify(j('ATS-240').atsBackfeed), ch: [j('CH-240').capacitors, JSON.stringify(j('CH-240').refrigerant)].join(),
      mvp: [j('MVP-240').vacuumExhaust, j('MVP-240').reliefJoint].join(),
      src: JSON.stringify(((j('AHU-240').sources || [])[0] || {}).drainLocation), lock: ((j('AHU-240').sources || [])[2] || {}).lockOpen
    };
    want(got.json.ahu === 'Plumbing Shop,Yes,No,true,false', 'entries.json: the AHU\'s answers');
    want(got.json.ats === '["UPS","PV or battery storage"]', 'entries.json: the backfeed picks in the list\'s order');
    want(got.json.ch === 'No,{"type":"R-134a","psi":"185"}' && got.json.mvp === 'Shared line, no valve,No', 'entries.json: chiller and pump');
    want(/Between this valve/.test(got.json.src || '') && got.json.lock === true, 'entries.json: the source answers');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T241 — item 23 (one sheet per facility per day) and item 22 (the build, unique ZIP names).
  async function t241_oneSheetPerFacilityPerDay() {
    const N = 'T241 one Information Sheet per facility per survey date (the facility follows the date in its name; a unit with no facility keeps the plain name), each sheet\'s Facility banner names its own facility and the build, manifest.json records the build, the ZIP name ends with the export\'s id, and the header label is APP_BUILD';
    await resetAppState();
    setHospitalCode('');
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const A = mkEntry('MAIN-241'); A.hospitalCode = 'Atlanta';
    const F = mkEntry('FTM-241'); F.hospitalCode = 'Atlanta - Fort McPherson';
    const F2 = mkEntry('FTM-241b'); F2.hospitalCode = 'Atlanta - Fort McPherson';
    const X = mkEntry('NOFAC-241');
    savedEquipment = [A, F, X, F2]; saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) return record(N, false, 'no zip: ' + confirms.join(' | '));
    const u = await unzipExport(zip.blob);
    const stamp = getDateStamp(new Date());
    const sheets = {};
    for (const q of Object.keys(u.files).filter(x => /^info_sheets\/Information_Sheet_.*\.xlsx$/.test(x)).sort()) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[q]);
      sheets[q.replace('info_sheets/', '')] = { units: (await sheetUnits(u.files[q])).join(), banner: String(wb.worksheets[0].getRow(1).getCell(2).value || ''),
        bannerRow: String(wb.worksheets[0].getRow(1).getCell(1).value || '') === 'Facility' };
    }
    got.sheets = sheets;
    const s = (fac) => sheets['Information_Sheet_' + stamp + fac + '.xlsx'] || {};
    want(Object.keys(sheets).sort().join() === ['Information_Sheet_' + stamp + '.xlsx', 'Information_Sheet_' + stamp + '_Atlanta.xlsx', 'Information_Sheet_' + stamp + '_Atlanta_Fort_McPherson.xlsx'].sort().join(), 'three sheets, named by date and facility');
    want(s('_Atlanta').units === 'MAIN-241' && s('_Atlanta_Fort_McPherson').units === 'FTM-241,FTM-241b' && s('').units === 'NOFAC-241', 'each sheet holds only its facility\'s units');
    // the build is the page's own (APP_BUILD) since build 119 — it was the literal 118
    const bTail = ' · VA LOTO Collector build ' + APP_BUILD;
    want((s('_Atlanta').banner || '').endsWith('[Atlanta]' + bTail) && (s('_Atlanta_Fort_McPherson').banner || '').endsWith('[Atlanta - Fort McPherson]' + bTail), 'each banner names its facility and the build');
    want(s('').bannerRow === false, 'the sheet of units with no facility has no banner (never another sheet\'s facility)');
    const m = u.manifest || {};
    got.manifest = { appBuild: m.appBuild, sheets: ((m.files || {}).xlsxSheets || []).length };
    want(m.appBuild === APP_BUILD && APP_BUILD >= 118 && got.manifest.sheets === 3, 'manifest.json');
    const ex8 = String(m.exportId || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
    got.zipName = zip.filename;
    want(!!ex8 && new RegExp('^FieldExport_NoFacility_\\d{6}_[A-Za-z0-9]{8}_' + ex8 + '\\.zip$').test(zip.filename || ''), 'the ZIP name ends with the export id');
    const label = /b(\d+)/.exec((document.querySelector('.header-title h1 span') || {}).textContent || '');
    want(!!label && +label[1] === APP_BUILD, 'the header label is APP_BUILD');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T242 — the type voltage box: ATS feeds, a chiller's capacitors, "Other voltage…".
  async function t242_theTypeVoltageQuestions() {
    const N = 'T242 after a type\'s voltage: an ATS asks its emergency then normal feed (rows "Emergency Feed: …" then "Normal Feed", a blank keeping the bare label); a chiller asks "Capacitor bank?" (No: no Stored Electrical Energy row; Yes / Can\'t tell: the row; closed: the row, nothing recorded); the box offers "Other voltage…" (the full list, no blank voltage)';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const typeVoltage = async (type, name, choice, voltage) => {
      await resetAppState();
      fillFormNoSources(name);
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = type;
      let buttons = [];
      await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
      const ov = document.getElementById('voltageOverlay');
      buttons = ov ? [...ov.querySelectorAll('button')].map(b => b.textContent.trim()) : [];
      await withDialogs({ confirm: true, choice: choice }, async () => { await applyVoltageChoice(voltage); await sleep(0); });
      closeAllPrompts();
      return buttons;
    };
    got.buttons = await typeVoltage('ATS', 'ATS-242', { 'ats-emergency-feed': '  EDP-1   bkr 3 ', 'ats-normal-feed': '' }, '480V');
    want(got.buttons.includes('Other voltage…') && !got.buttons.some(t => /leave blank/i.test(t)), 'the box offers Other voltage…, no blank');
    got.ats = sources.filter(s => s.deviceType === 'Breaker').map(s => s.energySource + '|' + s.location).join(' / ');
    want(got.ats === 'Electrical 480V|Emergency Feed: EDP-1 bkr 3 / Electrical 480V|Normal Feed', 'the ATS rows name their feeds');
    const chiller = async (answer) => {
      await typeVoltage('Chiller', 'CH-242', { 'chiller-capacitors': answer }, '480V');
      return sources.filter(s => s.energySource === 'Stored Electrical Energy').length + ':' + (unitAnswers.capacitors || '');
    };
    got.chiller = { no: await chiller('No'), yes: await chiller('Yes'), cantTell: await chiller('Can\'t tell'), closed: await chiller('cancel') };
    want(got.chiller.no === '0:No' && got.chiller.yes === '1:Yes' && got.chiller.cantTell === '1:Can\'t tell' && got.chiller.closed === '1:', 'the chiller\'s capacitor row follows the answer');
    // the form's answer moves an untouched row too; a row with a Device ID stays, and Save & New notes it
    const caps = () => sources.filter(s => s.energySource === 'Stored Electrical Energy').length;
    setUnitAnswer('capacitors', 'No'); const afterNo = caps();
    setUnitAnswer('capacitors', 'Can\'t tell'); const afterCant = caps();
    sources.find(s => s.energySource === 'Stored Electrical Energy').deviceId = 'CAP-1';
    setUnitAnswer('capacitors', 'No'); const typedKept = caps();
    const noted = collectSaveNotices().some(n => /Capacitor bank is No/.test(n));
    got.chillerForm = [afterNo, afterCant, typedKept, noted].join('/');
    want(got.chillerForm === '0/1/1/true', 'the form\'s capacitor answer moves an untouched row; a typed one stays and is noted');
    await resetAppState();
    fillFormNoSources('GEN-242');
    document.getElementById('equipTemplate').value = '';
    document.getElementById('equipType').value = 'Generator';
    await withDialogs({ confirm: true }, async () => { handleEquipTypeChange(); });
    let offered = [];
    await withDialogs({ confirm: true, choice: (o) => { if (o.id === 'other-voltage') { offered = o.choices.map(c => c.value); return '277V'; } return o.defaultValue || 'cancel'; } },
      async () => { await chooseOtherVoltage(); await sleep(0); });
    closeAllPrompts();
    got.other = { offered: offered.join(), rows: sources.filter(s => /^Electrical/.test(s.energySource)).map(s => s.energySource).join() };
    want(got.other.offered === '24V,120V,208V,240V,277V,480V,4160V,back' && got.other.rows === 'Electrical 277V', 'Other voltage… picks from the full list');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T243 — a medical vacuum pump: the exhaust's four answers and the inlet union / flange.
  async function t243_theVacuumPumpsExhaustAndJoint() {
    const N = 'T243 a medical vacuum pump\'s exhaust takes the four answers loto-web asked for (only "Own valve" adds the Vacuum Air Out row), then the union or flange at the inlet (Yes by default; No writes the change-later note); a unit that answered is not asked again; the form shows both answers';
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const run = async (exhaust, joint) => {
      await resetAppState();
      fillFormNoSources('MVP-243');
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = 'Vacuum Pump';
      const asked = [];
      await withDialogs({ confirm: true, choice: (o) => {
        asked.push(o.id);
        if (o.id === 'vacuum-cover') return 'Medical Vacuum Pump';
        if (o.id === 'pump-inlet-valve') return 'yes';
        if (o.id === 'vacuum-exhaust') return exhaust;
        if (o.id === 'vacuum-relief-joint') return joint;
        return 'cancel';
      } }, async () => {
        handleEquipTypeChange();
        await sleep(0); await sleep(0);
        if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('208V');
        for (let k = 0; k < 6; k++) await sleep(0);
      });
      closeAllPrompts();
      return { template: getTemplate(), exhaust: unitAnswers.vacuumExhaust || '', joint: unitAnswers.reliefJoint || '',
        outRow: sources.some(s => s.energySource === 'Vacuum Air Out'), asked: asked.filter(x => /^vacuum-(exhaust|relief)/.test(x)).join(),
        form: [(document.getElementById('uq_vacuumExhaust') || {}).value, (document.getElementById('uq_reliefJoint') || {}).value].join('|'),
        note: changeLaterSheetText(formEntryLike()) };
    };
    got.shared = await run('shared', 'No');
    want(got.shared.template === 'Medical Vacuum Pump' && got.shared.exhaust === 'Shared line, no valve' && !got.shared.outRow && got.shared.joint === 'No'
      && got.shared.form === 'Shared line, no valve|No' && got.shared.note === RELIEF_JOINT_NOTE, 'shared line, no joint');
    got.own = await run('own', 'Yes');
    want(got.own.exhaust === 'Own valve' && got.own.outRow && got.own.joint === 'Yes' && got.own.note === '', 'own valve, a joint');
    // the app's exhaust row dropped (as a template change drops it): Save & New
    // notes it, and the next ask puts it back for "Own valve" without asking
    sources = sources.filter(s => s.energySource !== 'Vacuum Air Out'); renderSources();
    got.ownNotice = collectSaveNotices().some(n => /no Vacuum Air Out row/.test(n));
    const asked2 = [];
    await withDialogs({ choice: (o) => { asked2.push(o.id); return 'cancel'; } }, async () => { await maybeAskVacuumExhaust(); });
    got.ownBack = hasVacuumExhaustRow() + '/' + asked2.join();
    want(got.ownNotice && got.ownBack === 'true/', '"Own valve" brings its row back');
    // the form's exhaust answer moves the untouched row
    setUnitAnswer('vacuumExhaust', 'Shared line, no valve'); const gone = !hasVacuumExhaustRow();
    setUnitAnswer('vacuumExhaust', 'Own valve'); const back = hasVacuumExhaustRow();
    got.formMoves = gone + '/' + back;
    want(got.formMoves === 'true/true', 'the form\'s answer takes the row away and back');
    got.closed = await run('cancel', 'cancel');
    want(got.closed.exhaust === '' && !got.closed.outRow && got.closed.joint === 'Yes', 'closed: no exhaust answer, the joint keeps its default');
    // answered: not asked again
    const again = [];
    await withDialogs({ choice: (o) => { again.push(o.id); return 'cancel'; } }, async () => { unitAnswers.vacuumExhaust = 'Can\'t see'; await maybeAskVacuumExhaust(); });
    got.again = again.join();
    want(got.again === '', 'an answered pump is not asked again');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T244 — the lists build 118 changed.
  async function t244_theListsLotoWebAskedFor() {
    const N = 'T244 the lists build 118 changed: Battery 12/24/48/125V DC (Bag / On Equipment / Controls, family E); no Thermal; Quick Disconnect only on compressed air, vacuum air, natural gas, propane and chemical lines, with the line\'s own checks; no Refrigerant source on the five refrigerant templates; Glycol HW takes "- Hot"; a cooling tower\'s Kinetic row is "At Fan Assembly"; every template has a Shop hint; app-lists.json carries the answers\' choices';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('B-244');
    addSource();
    handleEnergySourceChange(0, 'Battery 24V DC');
    got.battery = [sources[0].deviceType, sources[0].location, sources[0].verification, ENERGY_LABEL_PREFIX['Battery'], getSourceColorClass('Battery 24V DC')].join('/');
    want(got.battery === 'Bag/On Equipment/Controls/E/source-electrical', 'a battery\'s defaults');
    want(['Battery 12V DC', 'Battery 24V DC', 'Battery 48V DC', 'Battery 125V DC'].every(s => DATA.energySources.includes(s)) && !DATA.energySources.includes('Thermal'), 'the source list');
    got.qd = {};
    ['Electrical 480V', 'Compressed Air In', 'Vacuum Air Out', 'Natural Gas', 'Propane', 'Chemical In', 'Pneumatic', 'Fuel Oil In', 'Battery 12V DC']
      .forEach(es => { got.qd[es] = getFilteredDevices(es).includes('Quick Disconnect'); });
    want(JSON.stringify(got.qd) === JSON.stringify({ 'Electrical 480V': false, 'Compressed Air In': true, 'Vacuum Air Out': true, 'Natural Gas': true, 'Propane': true, 'Chemical In': true, 'Pneumatic': false, 'Fuel Oil In': false, 'Battery 12V DC': false }), 'where Quick Disconnect is offered');
    got.qdChecks = getFilteredVerifications('Quick Disconnect', 'Natural Gas').join();
    want(got.qdChecks === getFilteredVerifications('Ball Valve', 'Natural Gas').join() && !/SW \(|Button/.test(got.qdChecks), 'a fitting takes the line\'s checks (a valve\'s, not a switch\'s)');
    const offered = (template) => {
      sources = [Object.assign(mkSrc('Electrical 208V'), { collapsed: false })];
      keepTemplateOption(template); document.getElementById('equipTemplate').value = template;
      renderSources();
      const sel = document.getElementById('src_energy_0');
      return sel ? [...sel.options].some(o => o.value === 'Refrigerant') : null;
    };
    got.refrigerant = {};
    ['Chiller', 'Condensing Unit', 'Mini Split', 'Refrigerator', 'Air Dryer', 'Standard Pump'].forEach(t => { got.refrigerant[t] = offered(t); });
    want(JSON.stringify(got.refrigerant) === JSON.stringify({ 'Chiller': false, 'Condensing Unit': false, 'Mini Split': false, 'Refrigerator': false, 'Air Dryer': false, 'Standard Pump': true }), 'no Refrigerant source on the five templates');
    want(getTempSuffixFor('Glycol HW In/Out') === 'hot' && getTempSuffixFor('Glycol CHW In/Out') === 'chw', 'Glycol HW takes - Hot');
    got.tower = [EQUIPMENT_AUTO_SOURCES['Cooling Tower'][0].location, TEMPLATE_AUTO_SOURCES['Cooling Tower'][0].location].join('|');
    document.getElementById('equipType').value = 'Cooling Tower';
    got.towerKinetic = kineticDefaultLocation();
    want(got.tower === 'At Fan Assembly|At Fan Assembly' && got.towerKinetic === 'At Fan Assembly' && DATA.locations.includes('At Fan Assembly'), 'the cooling tower\'s Kinetic row');
    got.noShop = DATA.templates.filter(t => t !== '** New Template **' && !defaultShopFor(t, []));
    want(!got.noShop.length && defaultShopFor('Glycol Pump', [{ energySource: 'Glycol HW In/Out' }]) === 'HVAC Shop' && defaultShopFor('Glycol Pump', []) === 'Plumbing Shop' && defaultShopFor('Day Tank', []) === 'Electric Shop', 'the Shop hints');
    const lists = appListsSnapshot(APP_BUILD);
    want(lists.build === APP_BUILD && (lists.answers || {}).vacuumExhaust && lists.answers.vacuumExhaust.join() === DATA.vacuumExhaust.join() && lists.answers.atsBackfeed.length === 6 && lists.answers.refrigerants.includes('R-410A'), 'app-lists.json answers');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T245 — drain location and lock-open on a source.
  async function t245_drainLocationAndLockOpen() {
    const N = 'T245 a valve row of a water, steam, condensate, glycol or compressed-air line asks "Drain for this isolation point" (a found drain gives its code a drain: Temp Only - Hot → Drain Only - Hot, GaugeOnly → Gauge/Drain; None found leaves a code the tech set, takes back a Drain box the app pre-ticked, and writes the change-later note) and offers "Locked open" (which takes the drain question away); an electrical row gets neither; the typed detail rides along';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('AHU-245');
    sources = [
      Object.assign(mkSrc('HHW In'), { deviceType: 'Gate Valve', verification: 'Temp Only - Hot', collapsed: false }),
      Object.assign(mkSrc('Compressed Air In'), { deviceType: 'Ball Valve', verification: 'GaugeOnly', collapsed: false }),
      Object.assign(mkSrc('CHW Out'), { deviceType: 'Gate Valve', verification: 'Zero Flow', collapsed: false }),
      Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', collapsed: false })
    ];
    renderSources();
    got.asks = [0, 1, 2, 3].map(i => [!!document.getElementById('src_drainwhere_' + i), !!document.getElementById('src_lockopen_' + i)].join('/')).join(' ');
    want(got.asks === 'true/true true/true true/true false/false', 'which rows ask');
    updateDrainWhere(0, 'Between this valve and the equipment');
    updateDrainText(0, 'low point of coil return');
    updateDrainWhere(1, 'On this valve');
    updateDrainWhere(2, 'On the equipment');
    got.codes = sources.slice(0, 3).map(s => s.verification).join(' / ');
    want(got.codes === 'Drain Only - Hot / Gauge/Drain / Zero Flow', 'a found drain gives the code a drain');
    updateDrainWhere(1, 'None found');
    got.none = [sources[1].verification, changeLaterAutoNotes(formEntryLike()).join(' | ')].join(' || ');
    want(got.none === 'GaugeOnly || No drain found for source #2 (Compressed Air In)', 'None found puts back the code the answer changed, and writes the note');
    got.text = drainLocationSheetText(sources[0]);
    want(got.text === 'Between this valve and the equipment: low point of coil return', 'the detail rides along');
    // another found choice keeps the drain; a code the tech changed since is not put back
    updateDrainWhere(0, 'On this valve');
    const stillOurs = sources[0].verification;
    updateSource(0, 'verification', 'Gauge/Drain - Hot');
    updateDrainWhere(0, 'None found');
    got.manual = stillOurs + ' → ' + sources[0].verification;
    want(got.manual === 'Drain Only - Hot → Gauge/Drain - Hot', 'a code the tech changed is kept');
    updateDrainWhere(0, 'Between this valve and the equipment');
    updateLockOpen(0, true);
    got.locked = [!!document.getElementById('src_drainwhere_0'), lockOpenSheetText(sources[0]), drainLocationSheetText(sources[0])].join('/');
    want(got.locked === 'false/Yes/', 'locked open takes the drain question away');
    updateDrainWhere(1, '');
    want(!sources[1].drainLocation && !changeLaterAutoNotes(formEntryLike()).length, 'a cleared answer drops its note');
    // A source change re-derives the code's suffix; the code is still the answer's (loto-web review 2026-10-23).
    sources.push(Object.assign(mkSrc('HHW In'), { deviceType: 'Gate Valve', verification: 'Temp Only - Hot', collapsed: false }));
    renderSources();
    const k = sources.length - 1;
    updateDrainWhere(k, 'Between this valve and the equipment');
    sources[k].energySource = 'CHW In'; sources[k].verification = 'Drain Only - CHW';
    updateDrainWhere(k, 'None found');
    got.resuffixed = sources[k].verification;
    want(got.resuffixed === 'Temp Only - CHW', 'None found puts back the code before the answer, with the row\'s new suffix');
    // A Drain box the app pre-ticked (an AHU's CHW / HHW row) is taken back by None found; one the tech ticked stays (loto-web review 2026-10-23).
    document.getElementById('equipType').value = 'Air Handler';
    sources.push(Object.assign(mkSrc('CHW In/Out'), { deviceType: 'Ball Valve', verification: '', collapsed: false }));
    sources.push(Object.assign(mkSrc('HHW In/Out'), { deviceType: 'Ball Valve', verification: '', collapsed: false }));
    renderSources();
    const c = sources.length - 2, h = sources.length - 1;
    got.preticked = sources[c].verification + ' / ' + sources[h].verification;
    updateSimpleVerif(h, 'drain', false); updateSimpleVerif(h, 'drain', true);
    updateDrainWhere(c, 'None found'); updateDrainWhere(h, 'None found');
    got.noneFound = sources[c].verification + ' / ' + sources[h].verification;
    updateDrainWhere(c, 'On this valve');
    got.refound = sources[c].verification;
    updateDrainWhere(c, 'None found'); updateDrainWhere(c, '');
    got.cleared = sources[c].verification;
    want(got.preticked === 'Drain Only - CHW / Drain Only - Hot' && got.noneFound === 'Temp Only - CHW / Drain Only - Hot'
      && got.refound === 'Drain Only - CHW' && got.cleared === 'Drain Only - CHW',
      'None found takes back a Drain box the app pre-ticked, never the tech\'s; a found drain or a cleared answer gives it back');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T246 — a drive's feeder.
  async function t246_aDrivesFeeder() {
    const N = 'T246 a VFD row offers "+ Add the breaker that feeds this drive": it adds an Electrical Breaker row on the drive\'s source, Location "Feeder: <panel> bkr <n> (<drive tag>)" in loto-web\'s format (the tag filled from the drive row, the next untagged one for a second drive; "No number" leaves the bkr out; Cancel adds nothing)';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('AHU-246');
    sources = [Object.assign(mkSrc('Electrical 480V'), { deviceType: 'VFD', deviceId: 'VFD-1; VFD-2', quantity: 2, collapsed: false })];
    renderSources();
    got.button = !!document.getElementById('src_addfeeder_0');
    let tagOffered = [];
    const add = (choice) => withDialogs({ choice: (o) => { if (o.id === 'feeder-drive') tagOffered.push(o.input && o.input.value); return choice[o.id] !== undefined ? choice[o.id] : 'cancel'; } },
      async () => { await addFeederForDrive(0); });
    await add({ 'feeder-panel': 'MCC-2A', 'feeder-breaker': '14', 'feeder-drive': 'VFD-1' });
    await add({ 'feeder-panel': ' MCC-2A ', 'feeder-breaker': '', 'feeder-drive': 'VFD-2' });
    await add({ 'feeder-panel': 'cancel' });
    got.rows = sources.slice(1).map(s => [s.energySource, s.deviceType, s.location].join('|'));
    got.tagOffered = tagOffered.join();
    want(got.button && got.rows.join(' / ') === 'Electrical 480V|Breaker|Feeder: MCC-2A bkr 14 (VFD-1) / Electrical 480V|Breaker|Feeder: MCC-2A (VFD-2)', 'the feeder rows');
    want(got.tagOffered === 'VFD-1,VFD-2', 'the drive tag is offered, the next one second');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T247 — the answers travel with the unit.
  async function t247_theAnswersTravelWithTheUnit() {
    const N = 'T247 the answers travel with the unit: saved by Save & New, back on the form on Edit, copied by Duplicate (all but the change-later note), kept in the unit-in-progress copy across a reload, cleared by a new form; a marked unit shows FOR THE OFFICE in the list; Save & New notes a name that is still the type; + NOTE / + CAUTION start a line in Notes';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    fillFormNoSources('AHU-247');
    keepTemplateOption('AHU - HHW'); document.getElementById('equipTemplate').value = 'AHU - HHW';
    document.getElementById('equipType').value = 'Air Handler';
    sources = [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid() })];
    renderSources();
    setUnitAnswer('shop', 'Boiler Plant');
    setUnitAnswer('uvLights', 'No');
    const ta = document.getElementById('uq_changeLater');   // typed, as the tech would
    if (ta) { ta.value = 'Panel locked'; setUnitText('changeLater', ta.value); }
    got.formShows = [(document.getElementById('uq_shop') || {}).value, (document.getElementById('uq_uvLights') || {}).value, (document.getElementById('uq_changeLater') || {}).value].join('|');
    want(got.formShows === 'Boiler Plant|No|Panel locked', 'the form shows the answers');
    // the section follows a template change made without redrawing the rows, and
    // the box being typed in keeps its focus and caret through the rebuild
    if (ta) { ta.focus(); ta.setSelectionRange(5, 5); }
    keepTemplateOption('Chiller'); document.getElementById('equipTemplate').value = 'Chiller';
    autoSaveCurrent();
    got.follows = [!!document.getElementById('uq_capacitors'), !!document.getElementById('uq_refrigerant'), !document.getElementById('uq_uvLights') ? 'noUV' : 'uv',
      (document.activeElement || {}).id, (document.activeElement || {}).selectionStart].join('/');
    keepTemplateOption('AHU - HHW'); document.getElementById('equipTemplate').value = 'AHU - HHW';
    autoSaveCurrent();
    want(got.follows === 'true/true/uv/uq_changeLater/5', 'the section follows the template; typing keeps its focus');
    got.wip = JSON.stringify(buildWipState().unitAnswers);
    want(got.wip === JSON.stringify({ shop: 'Boiler Plant', uvLights: 'No', changeLater: 'Panel locked' }), 'the unit-in-progress copy holds them');
    await withDialogs({ confirm: true }, async () => { performSaveAndNew(); });
    const saved = savedEquipment.find(e => e.equipName === 'AHU-247') || {};
    got.saved = JSON.stringify(saved.unitAnswers);
    want(got.saved === got.wip && Object.keys(unitAnswers).length === 0, 'saved, and the new form is clear');
    renderSavedPanel();
    got.badge = !!document.querySelector('.office-mark-badge');
    want(got.badge, 'the list marks the unit for the office');
    editSaved(savedEquipment.indexOf(saved));
    got.edit = [(document.getElementById('uq_shop') || {}).value, (document.getElementById('uq_changeLater') || {}).value].join('|');
    want(got.edit === 'Boiler Plant|Panel locked', 'Edit puts them back');
    clearForm(false);
    await withDialogs({ confirm: true, choice: (o) => o.defaultValue || 'cancel' }, async () => { await executeDuplicate(savedEquipment.indexOf(saved), false); });
    got.dup = JSON.stringify(unitAnswers);
    want(got.dup === JSON.stringify({ shop: 'Boiler Plant', uvLights: 'No' }), 'Duplicate copies all but the note');
    clearForm(false);
    document.getElementById('equipType').value = 'Air Handler';
    document.getElementById('equipName').value = 'Air Handler';
    got.notice = collectSaveNotices().some(n => /still the type/.test(n));
    document.getElementById('equipName').value = 'AHU-3';
    got.noNotice = !collectSaveNotices().some(n => /still the type/.test(n));
    want(got.notice && got.noNotice, 'a name that is still the type is noted');
    document.getElementById('equipNotes').value = 'Shares a header';
    addNoteLine('NOTE'); document.getElementById('equipNotes').value += 'Pump 2 shares the suction header';
    addNoteLine('CAUTION');
    got.notes = document.getElementById('equipNotes').value;
    want(got.notes === 'Shares a header\nNOTE: Pump 2 shares the suction header\nCAUTION: ', '+ NOTE / + CAUTION');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 119 — the existing LOTO tag (Atlanta, loto-web 2026-10-22 spec).
  // Each test fails on build 118.
  // ==========================================================================
  async function withTagSetting(fn) {
    const prevCode = getHospitalCode();
    let prevPrefs = null;
    try { prevPrefs = localStorage.getItem('loto_existing_tag_prefs'); localStorage.removeItem('loto_existing_tag_prefs'); } catch (e) {}
    try { return await fn(); } finally {
      setHospitalCode(prevCode);
      try { if (prevPrefs === null) localStorage.removeItem('loto_existing_tag_prefs'); else localStorage.setItem('loto_existing_tag_prefs', prevPrefs); } catch (e) {}
    }
  }

  // T248 — the prompt follows the unit's own facility; one box per unit
  async function t248_theExistingTagPromptFollowsTheUnitsFacility() {
    const N = 'T248 the existing-tag question is on by default for the three Atlanta facilities and off elsewhere, a Settings change per facility wins; it follows the UNIT\'s facility (an Atlanta unit opened while the setting is Marion still asks); each row gets one box per unit (In/Out names on a pair) with a scan button, the hint "e.g. E-1" and a painted "No tag" box; a typed tag loses its ";" and never touches Device ID; No tag disables the box and a typed tag disables No tag; off, a row that holds an answer still shows it; a linked row asks too and never takes its target\'s tag';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withTagSetting(async () => {
      got.defaults = ['Atlanta', 'Atlanta - Fort McPherson', 'Atlanta - Trinka Davis', 'Marion', 'Kansas City', ''].map(c => existingTagPromptOn(c));
      want(got.defaults.join() === 'true,true,true,false,false,false', 'defaults');
      setExistingTagPrefForFacility('Atlanta', false); setExistingTagPrefForFacility('Marion', true);
      want(!existingTagPromptOn('Atlanta') && existingTagPromptOn('Marion') && existingTagPromptOn('Atlanta - Trinka Davis'), 'Settings override');
      try { localStorage.removeItem('loto_existing_tag_prefs'); } catch (e) {}
      setHospitalCode('Atlanta');
      fillFormNoSources('ET-248');
      sources = [Object.assign(mkSrc('Electrical 480V'), { collapsed: false }),
                 Object.assign(mkSrc('HHW In/Out'), { deviceType: 'Ball Valve', quantity: 2, collapsed: false }),
                 Object.assign(mkSrc('Electrical 208V'), { quantity: 3, collapsed: false })];
      renderSources();
      got.boxes = [0, 1, 2].map(i => document.querySelectorAll('[id^="src_extag_' + i + '_"]').length);
      want(got.boxes.join() === '1,2,3', 'one box per unit');
      const g1 = document.getElementById('extagGroup_1');
      got.pair = g1 ? g1.textContent.replace(/\s+/g, ' ').trim() : '';
      want(/\bIn\b/.test(got.pair) && /\bOut\b/.test(got.pair) && !/Unit 1/.test(got.pair), 'In/Out names');
      const none00 = document.getElementById('src_extagnone_0_0');
      want(!!none00 && none00.classList.contains('painted-check') && !!document.getElementById('src_extagscan_0_0')
        && document.getElementById('src_extag_0_0').placeholder === 'e.g. E-1', 'scan, hint, painted No tag');
      updateExistingTag(0, 0, 'E-1;x');
      got.typed = { box: document.getElementById('src_extag_0_0').value, cell: existingTagCellText(sources[0]), deviceId: sources[0].deviceId, noneDisabled: document.getElementById('src_extagnone_0_0').disabled };
      want(got.typed.box === 'E-1 x' && got.typed.cell === 'E-1 x' && got.typed.deviceId === '' && got.typed.noneDisabled, 'typed tag');
      setExistingTagNone(1, 1, true);
      got.none = { list: JSON.stringify(sources[1].existingTag), boxDisabled: document.getElementById('src_extag_1_1').disabled, cell: existingTagCellText(sources[1]) };
      want(got.none.list === '[null,{"none":true}]' && got.none.boxDisabled && got.none.cell === '; No tag', 'No tag');
      // off at this facility: the answered rows still show, the others don't ask
      setHospitalCode('Marion');
      renderSources();
      got.off = ['extagGroup_0', 'extagGroup_1', 'extagGroup_2'].map(id => !!document.getElementById(id));
      want(got.off.join() === 'true,true,false', 'off keeps answers visible');
      // the unit's own facility: an Atlanta unit opened while the setting is Marion
      const A = Object.assign(mkEntry('ET-248-A', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid() })] }), { hospitalCode: 'Atlanta' });
      const T = Object.assign(mkEntry('ET-248-T', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), existingTag: [{ tag: 'E-9' }] })] }), { hospitalCode: 'Atlanta' });
      savedEquipment = [A, T]; saveAll();
      await withDialogs({ confirm: true }, async () => { editSaved(0); });
      sources.forEach(x => { x.collapsed = false; });
      renderSources();
      got.ownFacility = !!document.getElementById('extagGroup_0');
      want(got.ownFacility, 'follows the unit\'s facility');
      // a linked row asks too and takes nothing of its target's tag
      showLinkDialog(0);
      applyLink(1, 0);
      closeLinkDialog();
      sources[0].collapsed = false;
      renderSources();
      got.linked = { linked: !!sources[0].linkedTo, tag: sources[0].existingTag === undefined, shown: !!document.getElementById('extagGroup_0') };
      want(got.linked.linked && got.linked.tag && got.linked.shown, 'linked row');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T249 — copies start not checked; Split moves the last unit's answer
  async function t249_copiesStartNotCheckedAndSplitMovesTheTag() {
    const N = 'T249 a Duplicate of the unit, Duplicate source and the count prompt\'s copies start with no existing tag (loto-web Q6), Copy Source never carries one; Split gives the split-off valve the last unit\'s answer and the original keeps the others (an In/Out pair: In keeps unit 1\'s, Out takes unit 2\'s)';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withTagSetting(async () => {
      setHospitalCode('Atlanta');
      const A = Object.assign(mkEntry('ET-249', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid(), existingTag: [{ tag: 'E-1' }] })] }), { hospitalCode: 'Atlanta' });
      savedEquipment = [A]; saveAll();
      await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
      got.dupUnit = sources.map(x => x.existingTag === undefined);
      want(got.dupUnit.length === 1 && got.dupUnit[0], 'Duplicate unit');
      fillFormNoSources('ET-249b');
      sources = [Object.assign(mkSrc('Electrical 480V'), { existingTag: [{ tag: 'E-1' }] })];
      duplicateSource(0);
      got.dupSrc = sources.map(x => JSON.stringify(x.existingTag || null));
      want(got.dupSrc.join('|') === '[{"tag":"E-1"}]|null', 'Duplicate source');
      got.countCopy = countCopyOf({ energySource: 'Electrical 480V', existingTag: [{ tag: 'E-1' }] }).existingTag === undefined;
      want(got.countCopy, 'count copy');
      // Copy Source from another unit
      const B = Object.assign(mkEntry('ET-249-B', { sources: [Object.assign(mkSrc('Electrical 208V'), { sourceId: genUuid(), existingTag: [{ tag: 'E-7' }] })] }), { hospitalCode: 'Atlanta' });
      savedEquipment = [B];
      fillFormNoSources('ET-249c');
      sources = [mkSrc('Electrical 480V')];
      renderSources();
      if (typeof showCopySourceDialog === 'function') showCopySourceDialog(0);
      await withDialogs({ confirm: true }, async () => { applyCopySource(0, 0); });
      if (typeof closeCopySourceDialog === 'function') closeCopySourceDialog();
      got.copySrc = { energy: sources[0].energySource, tag: sources[0].existingTag === undefined };
      want(got.copySrc.energy === 'Electrical 208V' && got.copySrc.tag, 'Copy Source');
      // Split
      fillFormNoSources('ET-249d');
      sources = [Object.assign(mkSrc('Electrical 480V'), { quantity: 3, existingTag: [{ tag: 'E-1' }, { none: true }, { tag: 'E-3' }] }),
                 Object.assign(mkSrc('HHW In/Out'), { deviceType: 'Ball Valve', quantity: 2, existingTag: [{ tag: 'W-1' }, { none: true }] })];
      renderSources();
      await withDialogs({ confirm: true }, async () => { splitSource(1); });
      await withDialogs({ confirm: true }, async () => { splitSource(0); });
      got.split = sources.map(x => x.energySource + '=' + JSON.stringify(x.existingTag || null));
      want(got.split.join('|') === 'Electrical 480V=[{"tag":"E-1"},{"none":true}]|Electrical 480V=[{"tag":"E-3"}]|HHW In=[{"tag":"W-1"}]|HHW Out=[{"none":true}]', 'Split');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T250 — Save & New warns about an unanswered unit where the question is on
  async function t250_saveAndNewWarnsAboutAnUnansweredTag() {
    const N = 'T250 where the unit\'s facility asks, Save & New lists each row with a unit that has neither a tag nor No tag ("Existing LOTO tag", with the units of a multi-unit row, a linked row too); answered rows and a facility that doesn\'t ask list nothing; it only warns';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withTagSetting(async () => {
      setHospitalCode('Atlanta');
      fillFormNoSources('ET-250');
      sources = [mkSrc('Electrical 480V'),
                 Object.assign(mkSrc('Electrical 208V'), { quantity: 2, existingTag: [{ tag: 'E-2' }] }),
                 Object.assign(mkSrc('Electrical 120V'), { linkedTo: { equipName: 'X', sourceIndex: 0, sourceLabel: 'Electrical 120V' } })];
      renderSources();
      const tagItems = () => collectIncompleteFields().filter(m => /Existing LOTO tag/.test(m));
      got.on = tagItems();
      want(got.on.length === 3 && /^Source #1 \(Electrical 480V\) — .*Existing LOTO tag$/.test(got.on[0])
        && /^Source #2 \(Electrical 208V\) — .*Existing LOTO tag \(Unit 2\)$/.test(got.on[1])
        && /^Source #3 \(linked\) — Existing LOTO tag$/.test(got.on[2]), 'listed');
      sources[0].existingTag = [{ none: true }];
      sources[1].existingTag = [{ tag: 'E-2' }, { tag: 'E-3' }];
      sources[2].existingTag = [{ tag: 'E-4' }];
      got.answered = tagItems();
      want(!got.answered.length, 'answered');
      sources[0].existingTag = null; sources[1].existingTag = null; sources[2].existingTag = null;
      setHospitalCode('Marion');
      got.off = tagItems();
      want(!got.off.length, 'facility off');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T251 — column 16 and entries.json
  async function t251_theExistingTagTravelsInColumn16() {
    const N = 'T251 the export writes "Existing Tag" in column 16 of every source label row of a unit where the question applies (an Atlanta unit; a Marion unit with an answer) and leaves it blank elsewhere; each data row holds one position per unit joined "; " ("e-1" for a qty-2 row with unit 2 unchecked, "No tag", "No tag; E 3", a blank for an unchecked row, only Quantity positions); entries.json carries existingTag per unit ({tag} / {none:true} / null) only where it applies; column 16 is formatted';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withTagSetting(async () => {
      setHospitalCode('Marion');
      const S = (es, extra) => Object.assign(mkSrc(es), { sourceId: genUuid() }, extra || {});
      const A = Object.assign(mkEntry('ET-251-ATL', { sources: [
        S('Electrical 480V', { quantity: 2, existingTag: [{ tag: 'e-1' }, null] }),
        S('Electrical 208V', { existingTag: [{ none: true }] }),
        S('Electrical 120V', { quantity: 2, existingTag: [{ none: true }, { tag: 'E  3' }] }),
        S('Electrical 277V'),
        S('Electrical 24V', { existingTag: [{ tag: 'E-4' }, { tag: 'E-5' }] })] }), { hospitalCode: 'Atlanta' });
      const M = Object.assign(mkEntry('ET-251-MAR', { sources: [S('Electrical 480V')] }), { hospitalCode: 'Marion' });
      const M2 = Object.assign(mkEntry('ET-251-MAR2', { sources: [S('Electrical 480V', { existingTag: [{ tag: 'E-8' }] })] }), { hospitalCode: 'Marion' });
      savedEquipment = [A, M, M2]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const byName = {};
      for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
        const ws = wb.worksheets[0];
        let cur = null;
        ws.eachRow(row => {
          const a = String(row.getCell(1).value || '');
          if (a === 'Equipment ID/Name') { cur = String(ws.getRow(row.number + 1).getCell(1).value || ''); byName[cur] = { headers: [], values: [], width: ws.getColumn(16).width, fill: !!(row.getCell(16).fill) }; }
          if (cur && /^Energy Source #\d+$/.test(a)) {
            byName[cur].headers.push(String(row.getCell(16).value || ''));
            const d = ws.getRow(row.number + 1);
            if (String(d.getCell(1).value || '')) byName[cur].values.push(String(d.getCell(16).value || ''));
            if (row.number === 0) {}
            byName[cur].labelFill = byName[cur].labelFill || !!(row.getCell(16).fill && row.getCell(16).fill.fgColor);
          }
        });
      }
      got.sheet = byName;
      const atl = byName['ET-251-ATL'] || {}, mar = byName['ET-251-MAR'] || {}, mar2 = byName['ET-251-MAR2'] || {};
      want((atl.headers || []).length === 10 && atl.headers.every(h => h === 'Existing Tag'), 'Atlanta headers');
      want(JSON.stringify(atl.values) === JSON.stringify(['e-1', 'No tag', 'No tag; E 3', '', 'E-4']), 'Atlanta values');
      want((mar.headers || []).length === 10 && mar.headers.every(h => h === '') && JSON.stringify(mar.values) === '[""]', 'Marion blank');
      want((mar2.headers || []).every(h => h === 'Existing Tag') && JSON.stringify(mar2.values) === '["E-8"]', 'Marion with an answer');
      want(atl.width === 22 && atl.labelFill, 'column 16 formatted');
      const je = {};
      ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = (e.sources || []).map(x => ('existingTag' in x) ? x.existingTag : 'NO KEY'); });
      got.json = je;
      want(JSON.stringify(je['ET-251-ATL']) === JSON.stringify([[{ tag: 'e-1' }, null], [{ none: true }], [{ none: true }, { tag: 'E 3' }], [null], [{ tag: 'E-4' }]]), 'entries.json Atlanta');
      want(JSON.stringify(je['ET-251-MAR']) === '["NO KEY"]' && JSON.stringify(je['ET-251-MAR2']) === '[[{"tag":"E-8"}]]', 'entries.json Marion');
      // the cell read back as loto-web's existing_tags.parse_sheet_cell reads it
      const parse = (text, qty) => { const parts = String(text).split(';'); return Array.from({ length: qty }, (_, i) => { const t = (parts[i] || '').replace(/;/g, ' ').split(/\s+/).filter(Boolean).join(' ').toUpperCase(); return !t ? null : (t.toLowerCase() === 'no tag' ? { none: true } : { tag: t }); }); };
      got.parsed = parse(atl.values[2], 2);
      want(JSON.stringify(got.parsed) === '[{"none":true},{"tag":"E 3"}]' && JSON.stringify(parse(atl.values[0], 2)) === '[{"tag":"E-1"},null]', 'parsed as loto-web');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 120 — damper actuators: spring return (loto-web 2026-10-23 spec).
  // Each test fails on build 119.
  // ==========================================================================
  async function withDamperSetting(fn) {
    const prevCode = getHospitalCode();
    let prev = null;
    try { prev = localStorage.getItem('loto_damper_prefs'); localStorage.removeItem('loto_damper_prefs'); } catch (e) {}
    try { return await fn(); } finally {
      setHospitalCode(prevCode);
      try { if (prev === null) localStorage.removeItem('loto_damper_prefs'); else localStorage.setItem('loto_damper_prefs', prev); } catch (e) {}
    }
  }
  function formOfType(name, type, template) {
    fillFormNoSources(name);
    document.getElementById('equipType').value = type;
    filterTemplateDropdown(type);
    if (template) document.getElementById('equipTemplate').value = template;
  }

  // T252 — the setting per facility, and which types ask
  async function t252_theDamperQuestionFollowsFacilityAndType() {
    const N = 'T252 the damper actuator question is on by default for the three Atlanta facilities and off elsewhere (a Settings change per facility wins, in its own Settings box); it asks only on Air Handlers, Exhaust Fans and Boilers, and follows the unit\'s facility; where it asks, the Energy Source list offers "Damper Actuator", elsewhere not';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withDamperSetting(async () => {
      got.defaults = ['Atlanta', 'Atlanta - Fort McPherson', 'Atlanta - Trinka Davis', 'Marion', 'Kansas City', ''].map(c => damperPromptOn(c));
      want(got.defaults.join() === 'true,true,true,false,false,false', 'defaults');
      setDamperPrefForFacility('Atlanta', false); setDamperPrefForFacility('Marion', true);
      want(!damperPromptOn('Atlanta') && damperPromptOn('Marion') && existingTagPromptOn('Atlanta'), 'Settings override, separate from the tags');
      try { localStorage.removeItem('loto_damper_prefs'); } catch (e) {}
      want(!!document.getElementById('settingsDampers'), 'Settings box');
      setHospitalCode('Atlanta');
      const offers = (type) => { formOfType('D-252', type); return offeredEnergySources().includes('Damper Actuator'); };
      got.types = {};
      ['Air Handler', 'Exhaust Fan', 'Boiler', 'Chiller', 'Heating HW Pump', 'Unit Heater'].forEach(t => { got.types[t] = offers(t); });
      want(got.types['Air Handler'] && got.types['Exhaust Fan'] && got.types['Boiler'] && !got.types['Chiller'] && !got.types['Heating HW Pump'] && !got.types['Unit Heater'], 'which types ask');
      setHospitalCode('Marion');
      got.marion = offers('Air Handler');
      want(!got.marion, 'off at Marion');
      // the unit's own facility: an Atlanta AHU opened while the setting is Marion
      const A = Object.assign(mkEntry('D-252-A', { sources: [Object.assign(mkSrc('Electrical 480V'), { sourceId: genUuid() })] }), { hospitalCode: 'Atlanta', equipType: 'Air Handler', template: 'AHU - Steam' });
      savedEquipment = [A]; saveAll();
      await withDialogs({ confirm: true }, async () => { editSaved(0); });
      got.own = offeredEnergySources().includes('Damper Actuator');
      want(got.own, 'follows the unit\'s facility');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T253 — the Damper Actuator row's fields, Save & New, links and copies
  async function t253_theDamperActuatorRow() {
    const N = 'T253 a Damper Actuator row offers the Electric / Pneumatic Actuator devices, the damper locations plus "Other…", and a required Spring return (Yes / No / Can\'t tell) with the nameplate hint; Save & New lists an unanswered Spring return (also on a linked row) and asks no Verification of it; a link never takes its target\'s answer; Duplicate source, a count copy and a Duplicate of the unit start unanswered';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withDamperSetting(async () => {
      setHospitalCode('Atlanta');
      formOfType('D-253', 'Air Handler', 'AHU - Steam');
      sources = [Object.assign(mkSrc('Damper Actuator'), { deviceType: 'Electric Actuator', location: 'Outside Air Damper', verification: '', collapsed: false })];
      renderSources();
      got.devices = getFilteredDevices('Damper Actuator').join();
      want(got.devices === 'Electric Actuator,Pneumatic Actuator', 'devices');
      const loc = document.getElementById('src_loc_0');
      got.locations = loc ? [...loc.options].map(o => o.textContent.trim()).filter(t => t && !/Select/.test(t)) : [];
      want(got.locations.join('|') === 'Outside Air Damper|Return Air Damper|Exhaust / Relief Damper|Mixed Air Damper|Isolation Damper|Backdraft Damper|Combustion Air Damper|Flue Damper|Other…', 'locations');
      const sel = document.getElementById('src_spring_0');
      got.spring = sel ? [...sel.options].map(o => o.textContent.trim()) : [];
      want(got.spring.join('|') === "-- Not answered --|Yes|No|Can't tell", 'spring return choices');
      const grp = document.getElementById('springGroup_0');
      want(!!grp && /nameplate/i.test(grp.textContent) && /model number shows spring return/i.test(grp.textContent), 'nameplate hint');
      const items = () => collectIncompleteFields().filter(m => /^Source #/.test(m));
      got.unanswered = items();
      want(got.unanswered.some(m => /^Source #1 \(Damper Actuator\) — .*Spring return/.test(m)) && !got.unanswered.some(m => /Verification/.test(m)), 'Save & New: Spring return, no Verification');
      updateSpringReturn(0, 'yes');
      want(sources[0].springReturn === 'yes' && !items().some(m => /Spring return/.test(m)), 'answered');
      // copies
      duplicateSource(0);
      got.dup = sources.map(x => x.springReturn || null);
      want(got.dup.join() === 'yes,', 'Duplicate source');
      want(countCopyOf({ energySource: 'Damper Actuator', springReturn: 'yes' }).springReturn === undefined, 'count copy');
      const U = Object.assign(mkEntry('D-253-U', { sources: [Object.assign(mkSrc('Damper Actuator'), { sourceId: genUuid(), springReturn: 'no' })] }), { hospitalCode: 'Atlanta', equipType: 'Air Handler' });
      const T = Object.assign(mkEntry('D-253-T', { sources: [Object.assign(mkSrc('Damper Actuator'), { sourceId: genUuid(), springReturn: 'yes' })] }), { hospitalCode: 'Atlanta', equipType: 'Air Handler' });
      savedEquipment = [U, T]; saveAll();
      await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
      got.dupUnit = sources.map(x => x.springReturn === undefined);
      want(got.dupUnit.join() === 'true', 'Duplicate unit');
      // a linked damper row
      formOfType('D-253-L', 'Air Handler', 'AHU - Steam');
      sources = [mkSrc('')];
      renderSources();
      showLinkDialog(0); applyLink(1, 0); closeLinkDialog();
      got.linked = { energy: sources[0].energySource, spring: sources[0].springReturn === undefined,
                     item: collectIncompleteFields().some(m => /^Source #1 \(linked\) — .*Spring return/.test(m)) };
      want(got.linked.energy === 'Damper Actuator' && got.linked.spring && got.linked.item, 'linked row');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T254 — "Can't tell" writes the change-later note; "No damper actuators"
  async function t254_cantTellNoteAndNoDampers() {
    const N = 'T254 "Can\'t tell" adds "Damper actuator #N: spring return not determined" (N among the unit\'s damper rows) to the change-later note; a unit asked about dampers with no Damper Actuator row shows "No damper actuators on this unit" (not at Marion, not once a damper row exists), Save & New asks for one or the other, and the choice fills U7 "Damper Actuators" = "None" only while the unit has no damper row';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withDamperSetting(async () => {
      setHospitalCode('Atlanta');
      const el = (srcs, a) => ({ equipType: 'Air Handler', template: 'AHU - Steam', sources: srcs, unitAnswers: a || {} });
      got.note = changeLaterAutoNotes(el([mkSrc('Electrical 480V'), Object.assign(mkSrc('Damper Actuator'), { springReturn: 'yes' }), Object.assign(mkSrc('Damper Actuator'), { springReturn: 'cant_tell' })]));
      want(got.note.join() === 'Damper actuator #2: spring return not determined', 'the note');
      want(/Damper actuator #2: spring return not determined/.test(changeLaterSheetText(el([Object.assign(mkSrc('Damper Actuator'), { springReturn: 'no' }), Object.assign(mkSrc('Damper Actuator'), { springReturn: 'cant_tell' })]))), 'in the sheet text');
      // the None choice
      formOfType('D-254', 'Exhaust Fan', 'Exhaust Fan');
      sources = [mkSrc('Electrical 208V')];
      renderSources(); loadUnitAnswers({});
      got.shown = !!document.getElementById('uq_dampersNone');
      got.itemBefore = collectIncompleteFields().some(m => /^Damper actuators/.test(m));
      setUnitFlag('dampersNone', true);
      got.itemAfter = collectIncompleteFields().some(m => /^Damper actuators/.test(m));
      want(got.shown && got.itemBefore && !got.itemAfter && unitAnswers.dampersNone === true, 'None choice and Save & New');
      got.u7 = unitSheetCells(formEntryLike()).U7;
      want(JSON.stringify(got.u7) === '["Damper Actuators","None"]', 'U7');
      sources.push(Object.assign(mkSrc('Damper Actuator'), { springReturn: 'no' }));
      renderSources(); renderUnitQuestions(true);
      got.withRow = { shown: !!document.getElementById('uq_dampersNone'), u7: unitSheetCells(formEntryLike()).U7 || null };
      want(!got.withRow.shown && got.withRow.u7 === null, 'a damper row hides it');
      setHospitalCode('Marion');
      formOfType('D-254-M', 'Exhaust Fan', 'Exhaust Fan');
      sources = [mkSrc('Electrical 208V')];
      renderSources(); loadUnitAnswers({});
      got.marion = { shown: !!document.getElementById('uq_dampersNone'), item: collectIncompleteFields().some(m => /^Damper actuators/.test(m)) };
      want(!got.marion.shown && !got.marion.item, 'not at Marion');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T255 — column 17, U7 and entries.json
  async function t255_springReturnTravelsInColumn17AndU7() {
    const N = 'T255 the export writes "Spring Return" in column 17 of every source label row of a unit with a Damper Actuator row (Yes / Can\'t tell on those rows, blank on others; col 1 "Damper Actuator", col 2 the device, col 5 the location), and nothing in column 17 elsewhere; an Exhaust Fan marked "No damper actuators" gets U7 (26,12) "Damper Actuators" / "None"; a Marion AHU gets neither; entries.json carries springReturn on damper rows and dampersNone on the unit; the change-later cell holds the Can\'t tell note';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withDamperSetting(async () => {
      setHospitalCode('Marion');
      const S = (es, extra) => Object.assign(mkSrc(es), { sourceId: genUuid() }, extra || {});
      const A = Object.assign(mkEntry('D-255-AHU', { sources: [S('Electrical 480V'),
        S('Damper Actuator', { deviceType: 'Electric Actuator', location: 'Outside Air Damper', verification: '', springReturn: 'yes' }),
        S('Damper Actuator', { deviceType: 'Pneumatic Actuator', location: 'Return Air Damper', verification: '', springReturn: 'cant_tell' })] }),
        { hospitalCode: 'Atlanta', equipType: 'Air Handler', template: 'AHU - Steam' });
      const F = Object.assign(mkEntry('D-255-EF', { sources: [S('Electrical 208V')] }), { hospitalCode: 'Atlanta', equipType: 'Exhaust Fan', template: 'Exhaust Fan', unitAnswers: { dampersNone: true } });
      const M = Object.assign(mkEntry('D-255-MAR', { sources: [S('Electrical 480V')] }), { hospitalCode: 'Marion', equipType: 'Air Handler', template: 'AHU - Steam' });
      savedEquipment = [A, F, M]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const by = {};
      for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
        const ws = wb.worksheets[0];
        let cur = null;
        ws.eachRow(row => {
          const a = String(row.getCell(1).value || '');
          if (a === 'Equipment ID/Name') { cur = String(ws.getRow(row.number + 1).getCell(1).value || ''); by[cur] = { h17: [], v17: [], rows: [], width: ws.getColumn(17).width }; }
          if (!cur) return;
          if (/^Energy Source #\d+$/.test(a)) {
            by[cur].h17.push(String(row.getCell(17).value || ''));
            const d = ws.getRow(row.number + 1);
            if (String(d.getCell(1).value || '')) {
              by[cur].v17.push(String(d.getCell(17).value || ''));
              by[cur].rows.push([1, 2, 5].map(c => String(d.getCell(c).value || '')).join('/'));
            }
          }
          if (a === 'Notes:') { by[cur].u7 = [String(row.getCell(12).value || ''), String(ws.getRow(row.number + 1).getCell(12).value || '')]; }
          if (a === 'Tied to Equipment') { by[cur].changeLater = String(ws.getRow(row.number + 1).getCell(11).value || ''); }
        });
      }
      got.sheet = by;
      const ahu = by['D-255-AHU'] || {}, ef = by['D-255-EF'] || {}, mar = by['D-255-MAR'] || {};
      want((ahu.h17 || []).length === 10 && ahu.h17.every(h => h === 'Spring Return'), 'AHU column 17 header');
      want(JSON.stringify(ahu.v17) === JSON.stringify(['', 'Yes', "Can't tell"]), 'AHU values');
      want(JSON.stringify(ahu.rows) === JSON.stringify(['Electrical 480V/Breaker/P1', 'Damper Actuator/Electric Actuator/Outside Air Damper', 'Damper Actuator/Pneumatic Actuator/Return Air Damper']), 'damper rows');
      want(/Damper actuator #2: spring return not determined/.test(ahu.changeLater || ''), 'change-later cell');
      want(JSON.stringify(ahu.u7) === '["",""]', 'AHU no U7');
      want((ef.h17 || []).every(h => h === '') && JSON.stringify(ef.u7) === '["Damper Actuators","None"]', 'Exhaust Fan U7');
      want((mar.h17 || []).every(h => h === '') && JSON.stringify(mar.u7) === '["",""]', 'Marion AHU neither');
      want(ahu.width === 14, 'column 17 width');
      const je = {};
      ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = { spring: (e.sources || []).map(x => ('springReturn' in x) ? x.springReturn : 'NO KEY'), none: e.dampersNone }; });
      got.json = je;
      want(JSON.stringify(je['D-255-AHU']) === JSON.stringify({ spring: ['NO KEY', 'yes', 'cant_tell'] }), 'entries.json AHU');
      want(JSON.stringify(je['D-255-EF']) === JSON.stringify({ spring: ['NO KEY'], none: true }) && JSON.stringify(je['D-255-MAR']) === JSON.stringify({ spring: ['NO KEY'] }), 'entries.json EF / Marion');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 121 — the label discharge wait (agreed with loto-web 2026-10-23).
  // Each test fails on build 120.
  // ==========================================================================
  function lwForm(name, type, template, srcs) {
    fillFormNoSources(name);
    document.getElementById('equipType').value = type;
    filterTemplateDropdown(type);
    if (template) document.getElementById('equipTemplate').value = template;
    sources = srcs.map(x => Object.assign({}, x, { collapsed: false }));
    renderSources();
  }
  const VFDROW = (extra) => Object.assign(mkSrc('Electrical 480V'), { deviceType: 'VFD', location: 'MCC' }, extra || {});
  const SEEROW = (extra) => Object.assign(mkSrc('Stored Electrical Energy'), { deviceType: 'Capacitor', location: 'At Capacitor Bank', verification: '', noPhoto: true }, extra || {});
  async function takeLabelPhoto(index, seed) {
    const inp = document.getElementById('file_misc_photo');
    const realClick = inp.click;
    inp.click = () => {};
    try {
      const before = miscPhotos.length;
      addLabelPhoto(index);
      handleMiscPhoto({ files: [await makePhotoFile(seed)], value: '' });
      await waitFor(() => miscPhotos.length === before + 1 && miscPhotos[before].unsaved === false, 15000, 'label photo');
      await waitForPhotoWritesIdle(15000);
    } finally { inp.click = realClick; }
  }

  // T256 — which rows ask, and the per-unit boxes
  async function t256_theLabelWaitIsAskedOnDrivesAndCapacitorBanks() {
    const N = 'T256 the label discharge wait is asked at every facility on an Electrical row with Device VFD and on a Stored Electrical Energy row — not a Disconnect row, not a linked row, not on a Chiller or Mini Split; per unit a minutes box (digits only, 1–240), a scan button that takes the label\'s first number, a painted "No label" box (exclusive with typed minutes) and an optional DC bus V (12–1500)';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('Marion');
      lwForm('LW-256', 'Air Handler', 'AHU - Steam', [VFDROW({ quantity: 2 }), Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect' }), SEEROW(),
        VFDROW({ linkedTo: { equipName: 'X', sourceIndex: 0, sourceLabel: 'Electrical 480V' } })]);
      got.rows = [0, 1, 2, 3].map(i => !!document.getElementById('lwGroup_' + i));
      want(got.rows.join() === 'true,false,true,false', 'which rows (Marion too)');
      got.boxes = document.querySelectorAll('[id^="src_lwmin_0_"]').length;
      want(got.boxes === 2 && !!document.getElementById('src_dcv_0_1') && document.getElementById('src_lwnone_0_0').classList.contains('painted-check')
        && /'number'/.test(document.getElementById('src_lwscan_0_0').getAttribute('onclick') || ''), 'per-unit boxes, scan, painted No label');
      updateLabelMinutes(0, 0, '15 min');
      got.typed = { box: document.getElementById('src_lwmin_0_0').value, list: JSON.stringify(sources[0].labelWait), noneDisabled: document.getElementById('src_lwnone_0_0').disabled };
      want(got.typed.box === '15' && got.typed.list === '[{"minutes":15}]' && got.typed.noneDisabled, 'minutes');
      updateLabelMinutes(0, 0, '300');
      want(!sources[0].labelWait, 'out of range is not kept');
      updateLabelMinutes(0, 0, '15');
      setLabelWaitNone(0, 1, true);
      got.none = { list: JSON.stringify(sources[0].labelWait), boxDisabled: document.getElementById('src_lwmin_0_1').disabled, cell: labelWaitCellText(sources[0]) };
      want(got.none.list === '[{"minutes":15},{"noLabel":true}]' && got.none.boxDisabled && got.none.cell === '15; No label', 'No label');
      updateDcBusV(0, 0, '650'); updateDcBusV(2, 0, '5');
      got.dc = { a: JSON.stringify(sources[0].dcBusV), b: sources[2].dcBusV === undefined, cell: dcBusCellText(sources[0]) };
      want(got.dc.a === '[650]' && got.dc.b && got.dc.cell === '650', 'DC bus V');
      // Chiller and Mini Split units keep their template waits
      lwForm('LW-256-CH', 'Chiller', 'Chiller', [VFDROW(), SEEROW()]);
      got.chiller = [0, 1].map(i => !!document.getElementById('lwGroup_' + i));
      lwForm('LW-256-MS', 'Mini Split', 'Mini Split', [SEEROW()]);
      got.mini = !!document.getElementById('lwGroup_0');
      want(got.chiller.join() === 'false,false' && !got.mini, 'not Chiller / Mini Split');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T257 — the label photo is a misc photo bound to its row
  async function t257_theLabelPhotoIsBoundToItsRow() {
    const N = 'T257 "Photograph the label" stores the photo as a misc photo bound to the row\'s sourceId (shown on the card, captioned "Label #n"); a retake binds the new one and leaves the old one as a misc photo; moving rows keeps the binding; deleting the row leaves the photo as an ordinary misc photo';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    lwForm('LW-257', 'Air Handler', 'AHU - Steam', [Object.assign(mkSrc('Electrical 208V'), { deviceType: 'Disconnect' }), VFDROW()]);
    await takeLabelPhoto(1, 'lw257a');
    const sid = sources[1].sourceId;
    got.first = { bound: miscPhotos[0].labelFor === sid && !!sid, card: !!document.querySelector('#lwGroup_1 img'), btn: (document.getElementById('src_lwphoto_1') || {}).textContent || '', caption: miscCaption(miscPhotos[0], 0) };
    want(got.first.bound && got.first.card && /Retake/.test(got.first.btn) && got.first.caption === 'Label #2', 'bound and shown');
    await takeLabelPhoto(1, 'lw257b');
    got.retake = { old: miscPhotos[0].labelFor === undefined, now: miscPhotos[1].labelFor === sid, idx: labelPhotoIndexOf(sources[1]) };
    want(got.retake.old && got.retake.now && got.retake.idx === 1, 'retake');
    moveSource(1, -1);
    got.moved = { idx: labelPhotoIndexOf(sources[0]), caption: miscCaption(miscPhotos[1], 1) };
    want(got.moved.idx === 1 && got.moved.caption === 'Label #1', 'moving rows');
    await withDialogs({ confirm: true }, async () => { removeSource(0); });
    renderMiscPhotos();
    got.deleted = { photos: miscPhotos.length, caption: miscCaption(miscPhotos[1], 1) };
    want(got.deleted.photos === 2 && got.deleted.caption === 'Misc 2', 'a deleted row leaves the photo');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T258 — copies, Split and the Save & New warning
  async function t258_labelWaitCopiesSplitAndWarning() {
    const N = 'T258 Duplicate source, a count copy and a Duplicate of the unit start with no label wait or voltage; Split gives the split-off drive the last unit\'s answers; Save & New warns softly about a unit nobody checked (none once answered or No label)';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    lwForm('LW-258', 'Air Handler', 'AHU - Steam', [VFDROW({ labelWait: [{ minutes: 15 }], dcBusV: [650] })]);
    duplicateSource(0);
    got.dup = sources.map(x => JSON.stringify([x.labelWait || null, x.dcBusV || null]));
    want(got.dup.join('|') === '[[{"minutes":15}],[650]]|[null,null]', 'Duplicate source');
    const cc = countCopyOf(VFDROW({ labelWait: [{ minutes: 5 }], dcBusV: [325] }));
    want(cc.labelWait === undefined && cc.dcBusV === undefined, 'count copy');
    const U = Object.assign(mkEntry('LW-258-U', { sources: [Object.assign(VFDROW({ labelWait: [{ minutes: 15 }], dcBusV: [650] }), { sourceId: genUuid() })] }), { equipType: 'Air Handler', template: 'AHU - Steam' });
    savedEquipment = [U]; saveAll();
    await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
    got.dupUnit = sources.map(x => x.labelWait === undefined && x.dcBusV === undefined);
    want(got.dupUnit.join() === 'true', 'Duplicate unit');
    lwForm('LW-258-S', 'Air Handler', 'AHU - Steam', [VFDROW({ quantity: 3, labelWait: [{ minutes: 10 }, { noLabel: true }, { minutes: 20 }], dcBusV: [650, null, 325] })]);
    await withDialogs({ confirm: true }, async () => { splitSource(0); });
    got.split = sources.map(x => JSON.stringify([x.labelWait || null, x.dcBusV || null]));
    want(got.split.join('|') === '[[{"minutes":10},{"noLabel":true}],[650]]|[[{"minutes":20}],[325]]', 'Split');
    lwForm('LW-258-W', 'Air Handler', 'AHU - Steam', [VFDROW({ quantity: 2, labelWait: [{ minutes: 15 }] }), SEEROW()]);
    const items = () => collectIncompleteFields().filter(m => /Label discharge wait/.test(m));
    got.warn = items();
    want(got.warn.length === 2 && /^Source #1 \(Electrical 480V\) — .*Label discharge wait \(Unit 2\)/.test(got.warn[0]) && /^Source #2 \(Stored Electrical Energy\) — .*Label discharge wait$/.test(got.warn[1]), 'warned');
    sources[0].labelWait = [{ minutes: 15 }, { noLabel: true }]; sources[1].labelWait = [{ minutes: 5 }];
    got.answered = items();
    want(!got.answered.length, 'answered');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T259 — columns 10 / 18 / 19 and entries.json
  async function t259_theLabelWaitTravelsInColumns10_18_19() {
    const N = 'T259 on a unit with a row that takes the question, every source label row carries "Label Wait" (18) and "DC Bus V" (19); its rows that take it write the minutes / No label and volts per unit and the label photo\'s sequence-numbered file name in column 10 (that file in photos/, not in the misc list), the others leave 10 / 18 / 19 empty; a Chiller unit and a unit without such rows carry neither header; entries.json labelWait / dcBusV / labelPhotoFile on those rows only';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    // the label photo, taken through the form
    lwForm('LW-259-AHU', 'Air Handler', 'AHU - Steam', [Object.assign(mkSrc('Electrical 208V'), { deviceType: 'Disconnect' }),
      VFDROW({ quantity: 2, labelWait: [{ minutes: 15 }, { noLabel: true }], dcBusV: [650] }), SEEROW({ labelWait: [{ minutes: 5 }] })]);
    await takeLabelPhoto(1, 'lw259');
    document.getElementById('equipName').value = 'LW-259-AHU';
    const A = saveEntry();
    A.equipType = 'Air Handler'; A.template = 'AHU - Steam';
    const S = (x) => Object.assign(x, { sourceId: genUuid() });
    const C = Object.assign(mkEntry('LW-259-CH', { sources: [S(VFDROW({ labelWait: [{ minutes: 9 }] })), S(SEEROW())] }), { equipType: 'Chiller', template: 'Chiller' });
    const P = Object.assign(mkEntry('LW-259-P', { sources: [S(mkSrc('Electrical 208V'))] }), { equipType: 'CHW Pump', template: 'Chilled Water Pump' });
    savedEquipment = [A, C, P].map((e, k) => k === 0 ? savedEquipment.find(x => x.id === A.id) || A : e);
    savedEquipment[0].equipType = 'Air Handler'; savedEquipment[0].template = 'AHU - Steam';
    saveAll();
    const { zip, confirms } = await runExport({ confirmResponse: true });
    if (!zip) { record(N, false, 'no zip: ' + confirms.join(' | ')); return; }
    const u = await unzipExport(zip.blob);
    const by = {};
    for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      let cur = null;
      ws.eachRow(row => {
        const a = String(row.getCell(1).value || '');
        if (a === 'Equipment ID/Name') { cur = String(ws.getRow(row.number + 1).getCell(1).value || ''); by[cur] = { h: [], v: [], misc: String(ws.getRow(row.number + 1).getCell(12).value || ''), w: [ws.getColumn(18).width, ws.getColumn(19).width] }; }
        if (cur && /^Energy Source #\d+$/.test(a)) {
          by[cur].h.push(String(row.getCell(18).value || '') + '|' + String(row.getCell(19).value || '') + '|' + String(row.getCell(10).value || ''));
          const d = ws.getRow(row.number + 1);
          if (String(d.getCell(1).value || '')) by[cur].v.push([10, 18, 19].map(c => String(d.getCell(c).value || '')).join('|'));
        }
      });
    }
    got.sheet = by;
    const ahu = by['LW-259-AHU'] || {}, ch = by['LW-259-CH'] || {}, pump = by['LW-259-P'] || {};
    const photoName = ((ahu.v || [])[1] || '').split('|')[0];
    want((ahu.h || []).length === 10 && ahu.h.every(h => /^Label Wait\|DC Bus V\|Verification Photo #\d+$/.test(h)), 'AHU headers');
    want((ahu.v || [])[0] === '||' && /^[^|]+\.jpg\|15; No label\|650$/.test((ahu.v || [])[1] || '') && (ahu.v || [])[2] === '|5|', 'AHU values');
    want(!!photoName && !!u.files['photos/' + photoName] && !/Misc/.test(photoName) && !(ahu.misc || '').includes(photoName), 'the label photo file');
    want((ch.h || []).every(h => /^\|\|Verification Photo/.test(h)) && (ch.v || []).every(v => v === '||'), 'Chiller has neither');
    want((pump.h || []).every(h => /^\|\|Verification Photo/.test(h)), 'a unit without such rows');
    want((ahu.w || []).join() === '12,10', 'widths');
    const je = {};
    ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = (e.sources || []).map(x => ('labelWait' in x) ? [x.labelWait, x.dcBusV, x.labelPhotoFile] : 'NO KEY'); });
    got.json = je;
    const ja = je['LW-259-AHU'] || [];
    want(ja[0] === 'NO KEY' && JSON.stringify(ja[1].slice(0, 2)) === '[[{"minutes":15},{"noLabel":true}],[650,null]]' && ja[1][2] === 'photos/' + photoName
      && JSON.stringify(ja[2]) === '[[{"minutes":5}],[null],""]', 'entries.json AHU');
    want(JSON.stringify(je['LW-259-CH']) === '["NO KEY","NO KEY"]', 'entries.json Chiller');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ==========================================================================
  // BUILD 122 — loto-web's 2026-10-24 sync spec, field-app half: a drive's
  // feeder and its own disconnect, the arc flash label, the transformer
  // section, the release question for every medium. Each test fails on build 121.
  // ==========================================================================
  const settle = async (n) => { for (let k = 0; k < (n || 8); k++) await sleep(0); };
  async function withReleaseSetting(fn) {
    const prevCode = getHospitalCode();
    let prevPrefs = null;
    try { prevPrefs = localStorage.getItem('loto_release_prefs'); localStorage.removeItem('loto_release_prefs'); } catch (e) {}
    try { return await fn(); } finally {
      setHospitalCode(prevCode);
      try { if (prevPrefs === null) localStorage.removeItem('loto_release_prefs'); else localStorage.setItem('loto_release_prefs', prevPrefs); } catch (e) {}
    }
  }
  const DRIVE = (extra) => Object.assign(mkSrc('Electrical 480V'), { deviceType: 'VFD', location: 'MCC', collapsed: false }, extra || {});
  const FEEDER = (loc) => Object.assign(mkSrc('Electrical 480V'), { location: loc, verification: 'Meter' });
  const unq = (t) => String(t == null ? '' : t).replace(/&rsquo;/g, "'");

  // T260 — Device = VFD: the feeder, then the question, per drive
  async function t260_aDriveIsAskedItsFeederAndItsDisconnect() {
    const N = 'T260 picking Device = VFD on an Electrical row asks, per drive (Quantity 2 = two drives), for the feeder (panel, breaker, the drive tag offered) and then "Does drive <tag>\'s own disconnect isolate all incoming power?" (Yes / No / Can\'t tell / Cancel, with the lockable-handle hint); the answer lands in driveIsolates in Device ID order; a drive with a feeder is asked only the question, and Can\'t tell writes the change-later note; Cancel stops; an untagged drive takes the tag typed at the feeder; a tag not in the list takes the first unanswered unit (the card\'s feeder button asks the question after the feeder); nothing on a linked or non-Electrical row; the card shows one answer per drive; a spare feeder counts only for an untagged drive';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const run = async (srcs, answers, fn) => {
      fillFormNoSources('AHU-260');
      sources = srcs; renderSources();
      const asked = [];
      const q = JSON.parse(JSON.stringify(answers));
      await withDialogs({ choice: (o) => {
        asked.push(o.id === 'feeder-drive' ? 'tag=' + (o.input && o.input.value) : (o.id === 'drive-isolates' ? 'Q:' + unq(o.title) : o.id));
        if (o.id === 'drive-isolates') { got.choices = o.choices.map(c => c.label).join('/'); got.hint = String(o.html); }
        const list = q[o.id];
        if (Array.isArray(list) && list.length) return list.shift();
        if (o.id === 'feeder-drive') return (o.input && o.input.value) || 'cancel';
        return 'cancel';
      } }, async () => { await fn(); await settle(); });
      return asked;
    };
    const Q = (tag) => 'Q:Does drive ' + tag + "'s own disconnect isolate all incoming power?";
    // two drives, nothing recorded: feeder 1 and its question, then feeder 2 and its question
    got.two = await run([DRIVE({ deviceType: 'Disconnect', deviceId: 'VFD-1; VFD-2', quantity: 2 })],
      { 'feeder-panel': ['MCC-2A', 'MCC-2A'], 'feeder-breaker': ['14', '15'], 'drive-isolates': ['yes', 'no'] },
      async () => { handleDeviceTypeChange(0, 'VFD'); });
    got.twoRows = sources.map(s => [s.energySource, s.deviceType, s.location].join('|'));
    got.twoAns = JSON.stringify(sources[0].driveIsolates);
    want(got.two.join(' > ') === ['feeder-panel', 'feeder-breaker', 'tag=VFD-1', Q('VFD-1'), 'feeder-panel', 'feeder-breaker', 'tag=VFD-2', Q('VFD-2')].join(' > '), 'the order');
    want(got.twoRows.join(' / ') === 'Electrical 480V|VFD|MCC / Electrical 480V|Breaker|Feeder: MCC-2A bkr 14 (VFD-1) / Electrical 480V|Breaker|Feeder: MCC-2A bkr 15 (VFD-2)'
      && got.twoAns === '["yes","no"]', 'rows and answers');
    want(got.choices === 'Yes/No/Can’t tell/Cancel' && /lockable handle on the drive that switches the incoming line/.test(got.hint || ''), 'buttons and hint');
    // a drive that already has its feeder: only the question; Can't tell writes the note
    got.fed = await run([DRIVE({ deviceType: 'Disconnect', deviceId: 'VFD-3' }), FEEDER('Feeder: MCC-1 bkr 2 (VFD-3)')],
      { 'drive-isolates': ['cant_tell'] }, async () => { handleDeviceTypeChange(0, 'VFD'); });
    got.fedNote = changeLaterAutoNotes(formEntryLike()).join(' | ');
    want(got.fed.join(' > ') === Q('VFD-3') && JSON.stringify(sources[0].driveIsolates) === '["cant_tell"]'
      && got.fedNote === "Drive VFD-3: can't tell whether its disconnect isolates all incoming power"
      && /Drive VFD-3: can't tell whether its disconnect isolates all incoming power/.test(changeLaterSheetText(formEntryLike())), 'a fed drive: the question only, and the note');
    // Cancel stops the flow
    got.cancel = await run([DRIVE({ deviceType: 'Disconnect', quantity: 2 })], {}, async () => { handleDeviceTypeChange(0, 'VFD'); });
    want(got.cancel.join() === 'feeder-panel' && sources.length === 1 && !sources[0].driveIsolates, 'Cancel stops');
    // nothing asked on a linked row, on a non-Electrical row, or when the drive is complete
    got.linked = await run([DRIVE({ deviceType: 'Disconnect', linkedTo: { equipName: 'X', sourceIndex: 0, sourceLabel: 'Electrical 480V' } })], {}, async () => { handleDeviceTypeChange(0, 'VFD'); });
    got.gas = await run([Object.assign(mkSrc('Natural Gas'), { deviceType: 'Ball Valve', collapsed: false })], {}, async () => { handleDeviceTypeChange(0, 'VFD'); });
    got.done = await run([DRIVE({ deviceType: 'Disconnect', deviceId: 'VFD-4', driveIsolates: ['yes'] }), FEEDER('Feeder: P1 (VFD-4)')], {}, async () => { handleDeviceTypeChange(0, 'VFD'); });
    want(!got.linked.length && !got.gas.length && !got.done.length, 'nothing asked: ' + JSON.stringify([got.linked, got.gas, got.done]));
    // an untagged drive takes the tag typed at the feeder; "No number" leaves the bkr out
    got.untagged = await run([DRIVE({ deviceType: 'Disconnect' })],
      { 'feeder-panel': ['LP-4'], 'feeder-breaker': [''], 'feeder-drive': ['VFD-9'], 'drive-isolates': ['no'] }, async () => { handleDeviceTypeChange(0, 'VFD'); });
    want(!!sources[1] && sources[1].location === 'Feeder: LP-4 (VFD-9)' && JSON.stringify(sources[0].driveIsolates) === '["no"]'
      && got.untagged.join(' > ') === ['feeder-panel', 'feeder-breaker', 'tag=', Q('VFD-9')].join(' > '), 'untagged');
    // the card's feeder button: a tag not in the Device ID list takes the first unanswered unit
    got.card = await run([DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2, driveIsolates: [null, 'yes'] })],
      { 'feeder-panel': ['MCC-9'], 'feeder-breaker': ['3'], 'feeder-drive': ['VFD-1X'], 'drive-isolates': ['no'] }, async () => { await addFeederFromCard(0); });
    want(JSON.stringify(sources[0].driveIsolates) === '["no","yes"]' && got.card.join(' > ') === ['feeder-panel', 'feeder-breaker', 'tag=VFD-1', Q('VFD-1X')].join(' > '), 'a tag not in the list');
    got.pos = [driveAnswerPosition(DRIVE({ deviceId: 'A; B', quantity: 2, driveIsolates: ['yes'] }), 'Z'),
      driveAnswerPosition(DRIVE({ deviceId: 'A; B', quantity: 2 }), 'Z', 1), driveAnswerPosition(DRIVE({ deviceId: 'A; B', quantity: 2 }), 'B', 0),
      driveAnswerPosition(DRIVE({ deviceId: 'A', quantity: 2, driveIsolates: ['no'] }), 'A')].join();
    want(got.pos === '1,1,1,1', 'answer positions');
    // the card: one answer per drive, changed by hand
    renderSources();
    got.boxes = [0, 1].map(k => (document.getElementById('src_driveiso_0_' + k) || {}).value);
    updateDriveIsolates(0, 1, 'cant_tell'); updateDriveIsolates(0, 0, '');
    got.byHand = JSON.stringify(sources[0].driveIsolates);
    want(got.boxes.join() === 'no,yes' && got.byHand === '[null,"cant_tell"]', 'the card');
    sources = [DRIVE({ linkedTo: { equipName: 'X', sourceIndex: 0, sourceLabel: 'E' } }), Object.assign(mkSrc('Electrical 208V'), { deviceType: 'Disconnect', collapsed: false })];
    renderSources();
    want(!document.getElementById('src_driveiso_0_0') && !document.getElementById('src_driveiso_1_0'), 'no answer box on a linked or non-drive row');
    // which drives have a feeder: a tagged one by its tag; a spare feeder only for an untagged drive
    const fed = (list) => unitDrives(list).map(d => (d.tag || '-') + ':' + (d.fed ? 1 : 0)).join(',');
    got.fedRule = [fed([DRIVE({ quantity: 2 }), FEEDER('Feeder: X (VFD-A)')]),
      fed([DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2 }), FEEDER('Feeder: X (VFD-1)'), FEEDER('Feeder: Y (VFD-9)')]),
      fed([DRIVE({ deviceId: 'VFD-1', quantity: 2 }), FEEDER('Feeder: X bkr 1 (VFD-1)')])];
    want(got.fedRule.join(' / ') === '-:1,-:0 / VFD-1:1,VFD-2:0 / VFD-1:1,VFD-1:1', 'the feeder rule');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T261 — Save & New asks about each drive; copies carry no answer
  async function t261_saveAndNewAsksAboutEachDrive() {
    const N = 'T261 Save & New asks about each drive without its feeder ("Drive VFD-1 has no feeder recorded") or its answer ("… has no answer about its disconnect"): Record it now runs the feeder steps and the question, Not now goes on to the list, which does not name the drives again (build 122 review: they were just asked); closing the question saves nothing; a unit whose drives are complete gets the list at once (Save & New runs straight through); Duplicate source, Copy Source, a count copy and a Duplicate of the unit carry no answer, Split moves the last unit\'s';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      const overlayText = () => { const o = document.getElementById('incompleteWarningOverlay'); return o ? o.textContent.replace(/\s+/g, ' ').trim() : ''; };
      const form = (srcs) => { formOfType('AHU-261', 'Air Handler', 'AHU - Steam'); sources = srcs; sources.forEach(ensureSourceId); renderSources(); };
      form([DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2 })]);
      const asked = [];
      const q = { 'drive-save': ['record', 'later'], 'feeder-panel': ['MCC-2A'], 'feeder-breaker': ['14'], 'drive-isolates': ['yes'] };
      await withDialogs({ confirm: true, choice: (o) => {
        asked.push(o.id + (o.id === 'drive-save' ? ':' + unq(o.title) : ''));
        if (o.id === 'drive-save') got.saveChoices = o.choices.map(c => c.label).join('/');
        const l = q[o.id]; if (l && l.length) return l.shift();
        if (o.id === 'feeder-drive') return (o.input && o.input.value) || 'cancel';
        return 'cancel';
      } }, async () => { await saveAndNew(); });
      got.asked = asked.join(' > ');
      got.warn = overlayText(); closeIncompleteWarning();
      want(got.asked === 'drive-save:Drive VFD-1 has no feeder recorded > feeder-panel > feeder-breaker > feeder-drive > drive-isolates > drive-save:Drive VFD-2 has no feeder recorded'
        && got.saveChoices === 'Record it now/Not now', 'the questions');
      want(!!got.warn && !/Feeder for|Drive disconnect answer/.test(got.warn) && !savedEquipment.length
        && JSON.stringify(sources[0].driveIsolates) === '["yes"]' && /^Feeder: MCC-2A bkr 14 \(VFD-1\)$/.test((sources[1] || {}).location || ''), 'the list names what is left');
      // closed: back to the form, nothing saved, no list
      form([DRIVE({ deviceId: 'VFD-7' })]);
      await withDialogs({ choice: () => 'cancel' }, async () => { await saveAndNew(); });
      got.closed = [!!document.getElementById('incompleteWarningOverlay'), savedEquipment.length].join();
      want(got.closed === 'false,0', 'closed');
      // the answer only
      form([DRIVE({ deviceId: 'VFD-8' }), FEEDER('Feeder: P2 bkr 1 (VFD-8)')]);
      const asked2 = [];
      await withDialogs({ choice: (o) => { asked2.push(unq(o.title)); return o.id === 'drive-save' ? 'record' : (o.id === 'drive-isolates' ? 'no' : 'cancel'); } }, async () => { await saveAndNew(); });
      closeIncompleteWarning();
      want(asked2[0] === 'Drive VFD-8 has no answer about its disconnect' && JSON.stringify(sources[0].driveIsolates) === '["no"]', 'the answer only: ' + JSON.stringify(asked2));
      // complete drives: no question, and the list at once
      form([DRIVE({ deviceId: 'VFD-5', driveIsolates: ['no'] }), FEEDER('Feeder: P1 bkr 3 (VFD-5)')]);
      let sync = null;
      await withDialogs({ choice: () => { sync = 'asked'; return 'cancel'; } }, async () => { const p = saveAndNew(); if (sync === null) sync = !!document.getElementById('incompleteWarningOverlay'); await p; });
      closeIncompleteWarning();
      want(sync === true && !collectIncompleteFields().some(m => /Feeder for|Drive disconnect/.test(m)), 'complete: no question, the list at once');
      // copies carry no answer; Split moves the last unit's
      form([DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2, driveIsolates: ['yes', 'no'] })]);
      duplicateSource(0);
      got.dup = sources.map(s => JSON.stringify(s.driveIsolates || null)).join('|');
      want(got.dup === '["yes","no"]|null', 'Duplicate source');
      want(countCopyOf(DRIVE({ driveIsolates: ['yes'] })).driveIsolates === undefined, 'count copy');
      const U = Object.assign(mkEntry('AHU-261-U', { sources: [Object.assign(DRIVE({ driveIsolates: ['cant_tell'] }), { sourceId: genUuid() })] }), { equipType: 'Air Handler', template: 'AHU - Steam' });
      savedEquipment = [U]; saveAll();
      form([Object.assign(mkSrc(''), { collapsed: false })]);
      showCopySourceDialog(0); applyCopySource(0, 0);
      got.copy = [sources[0].deviceType, sources[0].driveIsolates === undefined].join('/');
      want(got.copy === 'VFD/true', 'Copy Source');
      await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
      want(sources.length === 1 && sources.every(s => s.driveIsolates === undefined), 'Duplicate unit');
      form([DRIVE({ deviceId: 'VFD-1; VFD-2; VFD-3', quantity: 3, driveIsolates: ['yes', null, 'cant_tell'] })]);
      await withDialogs({ confirm: true }, async () => { splitSource(0); });
      got.split = sources.map(s => s.deviceId + '=' + JSON.stringify(s.driveIsolates || null)).join(' | ');
      want(got.split === 'VFD-1; VFD-2=["yes"] | VFD-3=["cant_tell"]', 'Split');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T262 — the arc flash label's slot, its box and the Save & New question
  async function t262_theArcFlashLabelSlot() {
    const N = 'T262 the "Arc Flash Label" slot follows EE Number and shows only on ATS, Generator and Transformer units (and wherever it holds a photo), with "No arc flash label on this equipment"; a photo clears the box, which can\'t be ticked over a photo; the key token is "arcflash" ("Arc Flash Label"), an orphan reattaches to it and a shot that never attached is flagged at export; Save & New on those types asks "Arc flash label" when neither is there — Take the photo stays on the form, No label on it ticks the box and goes on, Save without it goes on — and not once the box is ticked';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const slot = () => document.getElementById('arcFlashSlot');
    const shown = () => !!slot() && slot().style.display !== 'none';
    got.types = {};
    for (const t of ['ATS', 'Generator', 'Transformer', 'Air Handler', 'Switchgear', 'VFD']) { formOfType('AF-262', t); autoSaveCurrent(); got.types[t] = shown(); }
    want(JSON.stringify(got.types) === '{"ATS":true,"Generator":true,"Transformer":true,"Air Handler":false,"Switchgear":false,"VFD":false}', 'which types');
    got.order = [...document.querySelectorAll('.photo-row .photo-capture')].map(e => e.id).join();
    want(got.order === 'photo_equip_main,photo_equip_dataplate,photo_equip_ee,photo_equip_arcflash', 'after EE Number');
    formOfType('GEN-262', 'Generator', 'Emergency Generator'); autoSaveCurrent();
    setArcFlashNone(true);
    got.none = [unitAnswers.arcFlashNone === true, document.getElementById('arcFlashNone').checked].join();
    await captureInto('equip_arcflash', await makePhotoFile('t262'));
    got.afterPhoto = [unitAnswers.arcFlashNone === undefined, document.getElementById('arcFlashNoneLabel').style.display === 'none'].join();
    setArcFlashNone(true);
    got.refused = unitAnswers.arcFlashNone === undefined;
    const pk = parsePhotoKey(photos.equip_arcflash.dbKey);
    got.token = [pk && pk.slotToken, slotTokenFor('equip_arcflash'), photoSlotLabel('equip_arcflash')].join('|');
    want(got.none === 'true,true' && got.afterPhoto === 'true,true' && got.refused && got.token === 'arcflash|arcflash|Arc Flash Label', 'the box and the photo');
    document.getElementById('equipType').value = 'Air Handler'; autoSaveCurrent();
    want(shown(), 'a held photo keeps the slot on another type');
    // the Save & New question
    const ask = async (answer, pre) => {
      clearForm(false);
      formOfType('GEN-262b', 'Generator', 'Emergency Generator');
      sources = [Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', sourceId: genUuid() })]; renderSources();
      if (pre) pre();
      let opts = null;
      await withDialogs({ confirm: true, choice: (o) => { if (o.id === 'arc-flash-save') { opts = o; return answer; } return 'cancel'; } }, async () => { await saveAndNew(); });
      const warn = !!document.getElementById('incompleteWarningOverlay'); closeIncompleteWarning();
      return { asked: !!opts, title: opts && unq(opts.title), text: opts && unq(opts.html), choices: opts && opts.choices.map(c => c.label).join('/'), warn, none: unitAnswers.arcFlashNone === true };
    };
    got.photo = await ask('photo'); got.noLabel = await ask('none'); got.without = await ask('save');
    got.ticked = await ask('save', () => setArcFlashNone(true));
    want(got.photo.asked && got.photo.title === 'Arc flash label' && got.photo.text === 'Photograph the arc flash label on this generator.'
      && got.photo.choices === 'Take the photo/No label on it/Save without it' && !got.photo.warn && !got.photo.none, 'Take the photo stays on the form');
    want(got.noLabel.asked && got.noLabel.warn && got.noLabel.none, 'No label on it ticks the box and goes on');
    want(got.without.asked && got.without.warn && !got.without.none, 'Save without it goes on');
    want(!got.ticked.asked && got.ticked.warn, 'not asked once the box is ticked');
    // an orphan reattaches to the slot; a shot that never attached is flagged at export
    const E = Object.assign(mkEntry('ATS-262'), { equipType: 'ATS' });
    E.photos = { equip_arcflash: { dbKey: photoStoreKey(E.id, 'arcflash'), timestamp: new Date().toISOString(), fileType: 'image/jpeg', thumbnail: TINY_THUMB } };
    const orphan = photoStoreKey(E.id, 'arcflash');
    const F = Object.assign(mkEntry('ATS-262b'), { equipType: 'ATS' });
    const loose = photoStoreKey(F.id, 'arcflash');
    clearForm(false);
    savedEquipment = [E, F]; saveAll();
    await storePhotoBytes(orphan, dataUrlFromBytesSeed('t262o'));
    await storePhotoBytes(loose, dataUrlFromBytesSeed('t262l'));
    const re = await findReattachCandidates();
    got.reattach = (re.candidates || []).filter(c => c.slotKey === 'equip_arcflash').map(c => c.e.equipName + ':' + (c.key === orphan)).join();
    got.unattached = (await emptySlotsWithUnattachedShots([F])).map(m => m.name + ':' + m.slot).join();
    want(got.reattach === 'ATS-262:true' && got.unattached === 'ATS-262b:Arc Flash Label', 'reattach and the unattached shot');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T263 — the arc flash label in the export
  async function t263_theArcFlashLabelInTheExport() {
    const N = 'T263 the export numbers the arc flash label photo after EE Number and before the sources, ships it under manifest slot "arcflash", in entries.json photoFiles.arcflash / photoCaptured.arcflash and the CSV\'s last column "Arc Flash Photo Filename"; the name row\'s column 13 is headed "Arc Flash Label" on ATS, Generator and Transformer blocks only, with the file name, "No label" or blank; the unit is stamped exported with every photo';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('ATS-263', 'ATS', 'ATS - Generic');
      sources = [Object.assign(mkSrc('Electrical 480V'), { location: 'Emergency Feed: EDP-1 bkr 3', verification: 'Meter', collapsed: false })];
      renderSources();
      await captureInto('equip_main', await makePhotoFile('t263m'));
      await captureInto('equip_arcflash', await makePhotoFile('t263a'));
      await captureInto('source_0', await makePhotoFile('t263s'));
      const A = saveEntry();
      const S = (es) => Object.assign(mkSrc(es), { sourceId: genUuid() });
      const G = Object.assign(mkEntry('GEN-263', { sources: [S('Electrical 480V')] }), { equipType: 'Generator', template: 'Emergency Generator', unitAnswers: { arcFlashNone: true } });
      const X = Object.assign(mkEntry('XF-263', { sources: [S('Electrical 480V')] }), { equipType: 'Transformer', template: 'Standard Electrical' });
      const P = Object.assign(mkEntry('P-263', { sources: [S('Electrical 208V')] }), { equipType: 'CHW Pump', template: 'Chilled Water Pump', unitAnswers: { arcFlashNone: true } });
      savedEquipment = [savedEquipment.find(e => e.id === A.id) || A, G, X, P]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const by = {};
      for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
        const ws = wb.worksheets[0];
        ws.eachRow(row => {
          if (String(row.getCell(1).value || '') !== 'Equipment ID/Name') return;
          const d = ws.getRow(row.number + 1);
          by[String(d.getCell(1).value || '')] = { h13: String(row.getCell(13).value || ''), v13: String(d.getCell(13).value || ''), main: String(d.getCell(5).value || '') };
        });
      }
      got.sheet = by;
      const ats = by['ATS-263'] || {};
      want(ats.h13 === 'Arc Flash Label' && /\.jpg$/.test(ats.v13 || '') && !!u.files['photos/' + ats.v13], 'ATS: its file');
      want((by['GEN-263'] || {}).h13 === 'Arc Flash Label' && by['GEN-263'].v13 === 'No label', 'Generator: No label');
      want((by['XF-263'] || {}).h13 === 'Arc Flash Label' && by['XF-263'].v13 === '', 'Transformer: not checked');
      want((by['P-263'] || {}).h13 === '' && by['P-263'].v13 === '', 'a pump has neither (a leftover No label too)');
      const je = {}; ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = e; });
      const ja = je['ATS-263'] || { sources: [{}], photoFiles: {}, photoCaptured: {} };
      const num = (f) => +((/_(\d+)\.jpg$/.exec(String(f || '')) || [])[1] || 0);
      const srcFile = String(ja.sources[0].photoFile || '').replace('photos/', '');
      got.seq = [num(ats.main), num(ats.v13), num(srcFile)].join();
      want(num(ats.main) + 1 === num(ats.v13) && num(ats.v13) + 1 === num(srcFile), 'numbered after the equipment photos, before the sources');
      want(ja.photoFiles.arcflash === 'photos/' + ats.v13 && ('arcflash' in ja.photoCaptured) && (je['GEN-263'] || {}).arcFlashNone === true
        && (je['GEN-263'].photoFiles || {}).arcflash === '' && ((je['GEN-263'].unitAnswers || {}).arcFlashNone === true) && !('arcFlashNone' in (je['P-263'] || {})), 'entries.json');
      const rec = ((u.manifest || {}).photos || []).find(r => r.filename === ats.v13);
      want(!!rec && rec.entries.some(e => e.slot === 'arcflash'), 'manifest slot');
      const cp = Object.keys(u.files).find(q => /\.csv$/.test(q));
      const rows = parseCsvRows(new TextDecoder().decode(u.files[cp]));
      const last = r => r[r.length - 1];
      got.csv = { head: last(rows[0] || []), ats: rows.filter(r => r[2] === 'ATS-263').map(last).join(), gen: rows.filter(r => r[2] === 'GEN-263').map(last).join() };
      want(got.csv.head === 'Arc Flash Photo Filename' && got.csv.ats === ats.v13 && got.csv.gen === '', 'the CSV\'s last column');
      want((savedEquipment.find(e => e.equipName === 'ATS-263') || {}).exportedAllPhotos === true, 'stamped exported with every photo');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T264 — a transformer's secondary main and other sources, after the voltage
  async function t264_aTransformerAsksItsSecondaryMainAndOtherSources() {
    const N = 'T264 after a Transformer\'s template voltage the app asks for the secondary main (the panel or switch, then its breaker or No number, then 208V / 240V / 480V / Other… / Skip — build 122 review: the Location reads "<panel> bkr <n>" as a feeder\'s does) and the other sources that can energize the secondary (six tick boxes and an exclusive None found); each answer adds an Electrical breaker row, Meter-verified, not automatic, Located "Secondary Main: <panel> bkr <n>" / "Alternate Source (<kind>): <panel> bkr <n>", with its role on the row; Other… picks from the other voltages; None found records the date; a template change keeps the rows and asks neither again; the VFD type, which shares Electrical with Stored Energy, asks nothing';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const rowsOf = () => sources.map(s => [s.energySource, s.deviceType, s.location, s.verification, s.auto ? 'auto' : ''].join('|'));
    const pickXfmr = async (name, template, answer) => {
      fillFormNoSources(name);
      document.getElementById('equipTemplate').value = '';
      document.getElementById('equipType').value = 'Transformer';
      const asked = [];
      await withDialogs({ confirm: true, choice: (o) => { asked.push(o.id + (o.kind ? '(' + o.kind + ')' : '')); return answer(o); } }, async () => {
        handleEquipTypeChange();
        await sleep(0);
        if (document.getElementById('templatePromptOverlay')) applyTemplatePromptChoice(template);
        if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange(template);
        if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('480V');
        await settle(12);
      });
      closeAllPrompts();
      return asked;
    };
    got.asked = await pickXfmr('XF-264', 'Standard Electrical', (o) => {
      const buttons = o.choices.map(c => c.label).join('/');
      if (o.id === 'xfmr-secondary-main') { got.mainQ = { title: unq(o.title), text: unq(o.html), buttons, input: !!o.input }; return ' MDP-2 '; }
      if (o.id === 'xfmr-secondary-main-breaker') { got.bkrQ = buttons; return ' 1 '; }
      if (o.id === 'xfmr-secondary-main-voltage') { got.voltQ = buttons; return '208V'; }
      if (o.id === 'xfmr-other-sources') { got.otherQ = { title: unq(o.title), checks: (o.checks || []).map(c => c.label + (c.exclusive ? '*' : '')).join('/'), buttons }; return { value: 'ok', checked: ['Generator connection', 'UPS output'] }; }
      if (o.id === 'xfmr-alternate') return o.kind === 'UPS output' ? 'UPS-1 output' : 'GEN-CONN-1';
      if (o.id === 'xfmr-alternate-breaker') return o.kind === 'UPS output' ? '3' : '';
      if (o.id === 'xfmr-alternate-voltage') return o.kind === 'UPS output' ? 'other' : '480V';
      if (o.id === 'other-voltage') return '120V';
      return 'cancel';
    });
    got.rows = rowsOf();
    want(got.asked.join(' > ') === 'xfmr-secondary-main > xfmr-secondary-main-breaker > xfmr-secondary-main-voltage > xfmr-other-sources'
      + ' > xfmr-alternate(UPS output) > xfmr-alternate-breaker(UPS output) > xfmr-alternate-voltage(UPS output) > other-voltage'
      + ' > xfmr-alternate(Generator connection) > xfmr-alternate-breaker(Generator connection) > xfmr-alternate-voltage(Generator connection)', 'the questions, in order');
    want(got.rows.join(' / ') === 'Electrical 480V|||Meter|auto / Electrical 208V|Breaker|Secondary Main: MDP-2 bkr 1|Meter| / Electrical 120V|Breaker|Alternate Source (UPS output): UPS-1 output bkr 3|Meter| / Electrical 480V|Breaker|Alternate Source (Generator connection): GEN-CONN-1|Meter|', 'the rows');
    got.roles = sources.map(s => (s.role || '') + (s.altKind ? '(' + s.altKind + ')' : '')).join('/');
    want(got.roles === '/secondaryMain/alternate(UPS output)/alternate(Generator connection)', 'the rows carry their role');
    want(!!got.mainQ && got.mainQ.title === 'Secondary main' && /panel or switch the secondary feeds, as labelled/.test(got.mainQ.text)
      && got.mainQ.buttons === 'Next/Skip' && got.mainQ.input && got.bkrQ === 'Next/No number/Skip' && got.voltQ === '208V/240V/480V/Other…/Skip', 'the secondary main questions');
    want(!!got.otherQ && got.otherQ.title === 'Other sources that can energize the secondary'
      && got.otherQ.checks === 'ATS/UPS output/Generator connection/Tie breaker/Another transformer/PV or battery/None found*' && got.otherQ.buttons === 'OK/Skip', 'the other sources question');
    // a template change keeps the rows and asks neither again
    const asked2 = [];
    await withDialogs({ confirm: true, choice: (o) => { asked2.push(o.id); return 'cancel'; } }, async () => {
      pickTemplate('Electrical with Stored Energy');
      if (document.getElementById('templateConfirmOverlay')) confirmTemplateChange('Electrical with Stored Energy');
      if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('480V');
      await settle(12);
    });
    closeAllPrompts();
    got.kept = rowsOf().filter(r => /Secondary Main|Alternate Source/.test(r)).length;
    want(getTemplate() === 'Electrical with Stored Energy' && got.kept === 3 && !asked2.some(id => /^xfmr-/.test(id)), 'a template change keeps them, asks neither again: ' + JSON.stringify(asked2));
    // None found records the date; Skip records nothing
    got.none = await pickXfmr('XF-264b', 'Standard Electrical', (o) => o.id === 'xfmr-secondary-main' ? 'skip' : (o.id === 'xfmr-other-sources' ? { value: 'ok', checked: ['none'] } : 'cancel'));
    want(unitAnswers.xfmrAltNone === localDateStr(new Date()) && !sources.some(isSecondaryMainRow) && xfmrAltSheetText(formEntryLike()) === 'None found (' + localDateStr(new Date()) + ')', 'None found');
    got.skip = await pickXfmr('XF-264c', 'Standard Electrical', () => 'skip');
    want(got.skip.join(' > ') === 'xfmr-secondary-main > xfmr-other-sources' && sources.length === 1 && !unitAnswers.xfmrAltNone, 'Skip both');
    // the VFD type shares Electrical with Stored Energy and asks none of it
    fillFormNoSources('VFD-264'); document.getElementById('equipTemplate').value = ''; document.getElementById('equipType').value = 'VFD';
    const asked4 = [];
    await withDialogs({ confirm: true, choice: (o) => { asked4.push(o.id); return 'cancel'; } }, async () => {
      handleEquipTypeChange(); await sleep(0);
      if (document.getElementById('templateVoltageOverlay')) applyTemplateVoltageChoice('480V');
      await settle(12);
    });
    closeAllPrompts();
    want(getTemplate() === 'Electrical with Stored Energy' && !asked4.some(id => /^xfmr-/.test(id)) && !unitKinds('VFD', 'Electrical with Stored Energy', []).xfmr && unitKinds('Transformer', 'Electrical with Stored Energy', []).xfmr, 'the VFD type asks nothing');
    // the question boxes themselves: a typed panel (Next waits for it), its breaker, a voltage button; tick boxes with an exclusive None found
    formOfType('XF-264d', 'Transformer', 'Standard Electrical');
    sources = []; renderSources(); loadUnitAnswers({});
    const rp = window.__askChoiceAuto; window.__askChoiceAuto = undefined;
    try {
      const typeAndNext = async (text) => {
        await sleep(0);
        const o = document.getElementById('choiceDialogOverlay');
        const input = o && o.querySelector('input[type="text"]');
        const next = o && [...o.querySelectorAll('button')].find(b => b.textContent === 'Next');
        const off = !!(next && next.disabled);
        if (input) { input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); }
        const on = !!(next && !next.disabled);
        if (next) next.click();
        return off && on;
      };
      const p1 = addSecondaryMain();
      got.dlgOff = await typeAndNext('SWBD-2');
      got.dlgOn = await typeAndNext('4');
      await sleep(0);
      let ov = document.getElementById('choiceDialogOverlay');
      const b240 = ov && [...ov.querySelectorAll('button')].find(b => b.textContent === '240V');
      if (b240) b240.click();
      await Promise.race([p1, sleep(2000)]);
      const m = sources.find(isSecondaryMainRow) || {};
      got.dlgRow = m.energySource + ' ' + m.location;
      const p2 = askXfmrOtherSources();
      ov = document.getElementById('choiceDialogOverlay');
      const boxes = ov ? [...ov.querySelectorAll('input[type="checkbox"]')] : [];
      if (boxes.length === 7) { boxes[0].click(); boxes[6].click(); }
      got.exclusive = boxes.map(b => (b.checked ? 1 : 0)).join('');
      const ok = ov && [...ov.querySelectorAll('button')].find(b => b.textContent === 'OK');
      if (ok) ok.click();
      await Promise.race([p2, sleep(2000)]);
      got.dlgNone = unitAnswers.xfmrAltNone;
    } finally { window.__askChoiceAuto = rp; const o = document.getElementById('choiceDialogOverlay'); if (o) o.remove(); }
    want(got.dlgOff && got.dlgOn && got.dlgRow === 'Electrical 240V Secondary Main: SWBD-2 bkr 4' && got.exclusive === '0000001' && got.dlgNone === localDateStr(new Date()), 'the dialogs');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T265 — the transformer's "For loto-web" questions and its sheet slots
  async function t265_theTransformerSectionAndItsSheetSlots() {
    const N = 'T265 a Transformer\'s "For loto-web" section adds the secondary main and alternate sources (the Add button goes once its row exists; None found goes, and is cleared, once an alternate is added), asks terminal access, the nameplate (scan buttons, a data plate hint) and SPD / capacitors / grounding; the sheet writes U3 "Alternate Sources", U4 "Terminal Access", U7 "Transformer Nameplate", U8 "SPD / Capacitors / Grounding" in the spec\'s "key: value; key: value" form, blank parts left out, and a leftover "No damper actuators" never takes U7; Save & New lists the secondary main, the alternate sources (or None found) and the nameplate softly; entries.json carries the same';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('XF-265', 'Transformer', 'Standard Electrical');
      sources = [Object.assign(mkSrc('Electrical 480V'), { location: 'MDP-1 bkr 12', verification: 'Meter', collapsed: true })];
      renderSources(); renderUnitQuestions(true);
      const ids = ['uq_xfmrAddMain', 'uq_xfmrAddAlt', 'uq_xfmrAltNone', 'uq_xfmrTermPrimary', 'uq_xfmrTermSecondary', 'uq_xfmrTermCovers', 'uq_xfmrKva', 'uq_xfmrPrimaryV',
        'uq_xfmrSecondaryV', 'uq_xfmrConnection', 'uq_xfmrTaps', 'uq_xfmrImpedance', 'uq_xfmrTempRise', 'uq_xfmrKFactor', 'uq_xfmrSpd', 'uq_xfmrCaps', 'uq_xfmrGround'];
      got.missing = ids.filter(id => !document.getElementById(id));
      want(!got.missing.length, 'the questions');
      got.scan = ['uq_xfmrKva', 'uq_xfmrPrimaryV', 'uq_xfmrSecondaryV', 'uq_xfmrTaps', 'uq_xfmrImpedance', 'uq_xfmrKFactor'].every(id => { const el = document.getElementById(id); return !!(el && el.parentElement.querySelector('.scan-btn')); });
      got.hint = /photograph the data plate/i.test(document.getElementById('unitQuestions').textContent);
      got.lists = [[...document.getElementById('uq_xfmrConnection').options].map(o => o.textContent.trim()).slice(1).join('/'),
        [...document.getElementById('uq_xfmrTempRise').options].map(o => o.textContent.trim()).slice(1).join('/'),
        [...document.getElementById('uq_xfmrGround').options].map(o => o.textContent.trim()).slice(1).join('/')];
      want(got.scan && got.hint && got.lists.join(' | ') === 'Delta-Wye/Delta-Delta/Wye-Wye/Wye-Delta/Single-phase/Other… | 80 C/115 C/150 C/Other… | Ground bus/Ground studs/None/Can\'t tell', 'scan buttons, hint and lists');
      const items = () => collectIncompleteFields().filter(m => /^Transformer —/.test(m));
      got.itemsBefore = items();
      want(got.itemsBefore.join(' | ') === 'Transformer — secondary main | Transformer — alternate sources (or None found) | Transformer — nameplate', 'the Save & New items');
      setXfmrAltNone(true);
      got.u3None = unitSheetCells(formEntryLike()).U3;
      const altAnswers = { 'xfmr-alternate-kind': 'Tie breaker', 'xfmr-alternate': 'SWBD-1 tie', 'xfmr-alternate-breaker': '', 'xfmr-alternate-voltage': '480V' };
      await withDialogs({ choice: (o) => (o.id in altAnswers) ? altAnswers[o.id] : 'cancel' }, async () => { await addAlternateSource(); });
      got.afterAlt = { none: unitAnswers.xfmrAltNone === undefined, box: !document.getElementById('uq_xfmrAltNone'), list: (document.getElementById('uq_xfmrAltKinds') || {}).textContent || '', u3: unitSheetCells(formEntryLike()).U3 };
      want(JSON.stringify(got.u3None) === JSON.stringify(['Alternate Sources', 'None found (' + localDateStr(new Date()) + ')']) && got.afterAlt.none && got.afterAlt.box
        && /Recorded: Tie breaker/.test(got.afterAlt.list) && JSON.stringify(got.afterAlt.u3) === '["Alternate Sources","Tie breaker"]'
        && sources.some(s => s.location === 'Alternate Source (Tie breaker): SWBD-1 tie' && s.energySource === 'Electrical 480V'), 'None found, then an alternate');
      sources.push(Object.assign(mkSrc('Electrical 208V'), { location: 'Secondary Main: MDP-2 bkr 1', verification: 'Meter', collapsed: true }));
      renderSources();
      want(!document.getElementById('uq_xfmrAddMain') && /Secondary Main: MDP-2 bkr 1/.test((document.getElementById('uq_xfmrMain') || {}).textContent || ''), 'the Add button goes once the row exists');
      setUnitAnswer('xfmrTermPrimary', 'Yes'); setUnitAnswer('xfmrTermSecondary', 'No'); setUnitText('xfmrTermCovers', ' Bolted  front cover ');
      setUnitText('xfmrKva', '75'); setUnitText('xfmrPrimaryV', '480'); setUnitText('xfmrSecondaryV', '208Y/120'); setUnitAnswer('xfmrConnection', 'Delta-Wye');
      setUnitText('xfmrTaps', '2 x 2.5% FCAN; 2 x 2.5% FCBN'); setUnitText('xfmrImpedance', '5.1'); setUnitAnswer('xfmrTempRise', '150 C'); setUnitText('xfmrKFactor', '4');
      setUnitAnswer('xfmrSpd', 'Yes'); setUnitText('xfmrSpdWhere', 'secondary bus'); setUnitAnswer('xfmrCaps', 'No'); setUnitText('xfmrCapsWhere', 'ignored');
      setUnitAnswer('xfmrGround', 'Ground bus'); setUnitText('xfmrGroundWhere', 'bottom rear');
      got.whereBoxes = [!!document.getElementById('uq_xfmrSpdWhere'), !!document.getElementById('uq_xfmrCapsWhere'), !!document.getElementById('uq_xfmrGroundWhere')].join();
      const STR = { U4: 'Terminal Access=Primary: Yes; Secondary: No; Covers: Bolted front cover',
        U7: 'Transformer Nameplate=kVA: 75; Primary V: 480; Secondary V: 208Y/120; Connection: Delta-Wye; Taps: 2 x 2.5% FCAN, 2 x 2.5% FCBN; Impedance: 5.1%; Temperature Rise: 150 C; K-Factor: 4',
        U8: 'SPD / Capacitors / Grounding=SPD: Yes (secondary bus); Capacitors: No; Grounding: Ground bus (bottom rear)' };
      const cells = unitSheetCells(formEntryLike());
      got.cells = ['U4', 'U7', 'U8'].map(s => cells[s].join('='));
      want(got.cells.join(' | ') === [STR.U4, STR.U7, STR.U8].join(' | ') && got.whereBoxes === 'true,false,true', 'the strings: ' + got.cells.join(' | '));
      want(!items().length, 'the items clear');
      got.sparse = [xfmrNameplateText({ xfmrKva: '75 kVA', xfmrConnection: 'Other', xfmrConnectionOther: 'Zig-zag', xfmrTempRise: 'Other', xfmrTempRiseOther: '220 C', xfmrImpedance: '4.5 %' }),
        xfmrTerminalText({ xfmrTermSecondary: "Can't tell" }), xfmrStoredText({ xfmrCaps: "Can't tell", xfmrCapsWhere: 'filter bank', xfmrGround: 'None', xfmrGroundWhere: 'x' })];
      want(got.sparse.join(' | ') === "kVA: 75; Connection: Other: Zig-zag; Impedance: 4.5%; Temperature Rise: Other: 220 C | Secondary: Can't tell | Capacitors: Can't tell (filter bank); Grounding: None", 'blank parts left out');
      unitAnswers.dampersNone = true;
      want(unitSheetCells(formEntryLike()).U7[0] === 'Transformer Nameplate'
        && JSON.stringify(unitSheetCells({ equipType: 'Air Handler', template: 'AHU - Steam', sources: [], unitAnswers: { dampersNone: true } }).U7) === '["Damper Actuators","None"]', 'U7 is the nameplate');
      delete unitAnswers.dampersNone;
      document.getElementById('equipName').value = 'XF-265';
      const X = saveEntry();
      formOfType('AHU-265', 'Air Handler', 'AHU - Steam'); renderUnitQuestions(true);
      want(!document.getElementById('uq_xfmrKva') && !document.getElementById('uq_xfmrAddMain'), 'only on transformers');
      clearForm(false);
      savedEquipment = [savedEquipment.find(e => e.id === X.id) || X]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const xpath = Object.keys(u.files).find(q => /Information_Sheet_.*\.xlsx$/.test(q));
      const B = xpath ? await sheetBlocks(u.files[xpath]) : {};
      const b = B['XF-265'] || { labels: {}, values: {} };
      got.sheet = ['U3', 'U4', 'U7', 'U8'].map(s => b.labels[s] + '=' + b.values[s]);
      want(got.sheet.join(' | ') === ['Alternate Sources=Tie breaker', STR.U4, STR.U7, STR.U8].join(' | '), 'the sheet');
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
      const ws = wb.worksheets[0];
      got.locs = [1, 2, 3].map(n => String(ws.getRow(b.base + 2 * n + 3).getCell(5).value || '') + '|' + String(ws.getRow(b.base + 2 * n + 3).getCell(1).value || '') + '|' + String(ws.getRow(b.base + 2 * n + 3).getCell(2).value || ''));
      want(got.locs.join(' / ') === 'MDP-1 bkr 12|Electrical 480V|Breaker / Alternate Source (Tie breaker): SWBD-1 tie|Electrical 480V|Breaker / Secondary Main: MDP-2 bkr 1|Electrical 208V|Breaker', 'the rows\' Locations');
      const je = ((u.entriesJson && u.entriesJson.entries) || [])[0] || {};
      got.json = [je.alternateSources, je.terminalAccess, je.transformerNameplate, je.spdCapacitorsGrounding, (je.unitAnswers || {}).xfmrKva, (je.unitAnswers || {}).xfmrConnection].join(' | ');
      want(got.json === ['Tie breaker', STR.U4.split('=')[1], STR.U7.split('=')[1], STR.U8.split('=')[1], '75', 'Delta-Wye'].join(' | '), 'entries.json');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T266 — the release question on every medium (the form)
  async function t266_theReleaseQuestionOnEveryMedium() {
    const N = 'T266 the release question for every medium is on by default for the three Atlanta facilities (its own Settings box, per facility); there it asks on valve rows (or no device yet), not locked open, of fuel oil, chemical, geothermal, natural gas, propane, vacuum and refrigerant lines — "Drain…" / "Purge point…" / "Vent to atmosphere…" / "Recovery port for this isolation point" with each medium\'s choice labels, the stored values canonical; a found answer never changes their code (D5) while a water row keeps its rewrite; None found names the point in the change-later note; "Drains to" (Containment / Floor drain / Hose / Other…) on a found fuel oil or chemical drain only, kept through the answer\'s changes; off (Marion) nothing new shows but a row that holds an answer';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withReleaseSetting(async () => {
      got.defaults = ['Atlanta', 'Atlanta - Fort McPherson', 'Atlanta - Trinka Davis', 'Marion', 'Kansas City', ''].map(c => releasePromptOn(c));
      want(got.defaults.join() === 'true,true,true,false,false,false', 'defaults');
      setHospitalCode('Atlanta');
      showSettings();
      const box = document.getElementById('settingsRelease');
      got.settings = [!!box, !!(box && box.checked)].join();
      if (box) { box.checked = false; savePhotoSettings(); }
      got.afterSave = [releasePromptOn('Atlanta'), existingTagPromptOn('Atlanta'), damperPromptOn('Atlanta')].join();
      document.getElementById('settingsOverlay').style.display = 'none';
      try { localStorage.removeItem('loto_release_prefs'); } catch (e) {}
      want(got.settings === 'true,true' && got.afterSave === 'false,true,true', 'the Settings box');
      const V = (es, extra) => Object.assign(mkSrc(es), { deviceType: 'Ball Valve', verification: '', location: 'Above Equipment', collapsed: false }, extra || {});
      const rows = () => [V('Fuel Oil In'), V('Chemical In'), V('Geothermal Water In/Out', { quantity: 2 }), V('Natural Gas', { deviceId: 'G-1', verification: 'Controls' }),
        V('Propane', { deviceType: 'Gate Valve' }), V('Vacuum Air In', { verification: 'Gauge/Drain' }), V('Refrigerant'),
        V('Natural Gas', { deviceType: 'Quick Disconnect' }), V('Fuel Oil Out', { lockOpen: true }), V('Fuel Oil Out', { deviceType: '' }),
        Object.assign(mkSrc('Electrical 480V'), { deviceType: 'Disconnect', collapsed: false }), V('HHW In', { deviceType: 'Gate Valve', verification: 'Temp Only - Hot' })];
      setHospitalCode('Atlanta');
      formOfType('P-266', 'Domestic Water Pump', 'Standard Pump');
      sources = rows(); sources.forEach(noteDefaultDrain); renderSources();
      const asks = () => sources.map((s, i) => (document.getElementById('src_drainwhere_' + i) ? 1 : 0)).join('');
      got.atlanta = asks();
      want(got.atlanta === '111111100101', 'which rows ask at Atlanta: ' + got.atlanta);
      const label = (i) => { const g = document.getElementById('drainLocGroup_' + i); const l = g && g.querySelector('label'); return l ? l.textContent.trim() : ''; };
      const opts = (i) => { const s = document.getElementById('src_drainwhere_' + i); return s ? [...s.options].slice(1).map(o => o.value + '=' + o.textContent.trim()) : []; };
      got.labels = [0, 1, 2, 3, 4, 5, 6, 11].map(label);
      want(got.labels.join(' | ') === 'Drain for this isolation point | Drain for this isolation point | Drain for this isolation point | Purge point for this isolation point | Purge point for this isolation point | Vent to atmosphere for this isolation point | Recovery port for this isolation point | Drain for this isolation point', 'the labels');
      got.gas = opts(3).join(' | '); got.vac = opts(5).join(' | '); got.ref = opts(6).join(' | '); got.fuel = opts(0).join(' | ');
      want(got.gas === 'On this valve=On this valve (purge port) | Between this valve and the equipment=Between this valve and the equipment | On the equipment=On the equipment | None found=None found', 'gas choices');
      want(got.vac === 'On this valve=On this valve (vent port) | Between this valve and the equipment=Between this valve and the equipment | On the equipment=On the equipment | None found=None found', 'vacuum choices');
      want(got.ref === 'On this valve=On this valve (service port) | Between this valve and the equipment=Between this valve and the equipment | On the equipment=On the equipment (access port) | None found=None found', 'refrigerant choices');
      want(got.fuel === 'On this valve=On this valve (drain or bleed port) | Between this valve and the equipment=Between this valve and the equipment | On the equipment=On the equipment (casing, coil, strainer or tank) | None found=None found', 'fuel oil choices (as today)');
      const codesBefore = [0, 2, 3, 5, 6].map(i => sources[i].verification).join(' / ');
      updateDrainWhere(0, 'Between this valve and the equipment'); updateDrainText(0, 'casing plug');
      updateDrainWhere(2, 'On the equipment'); updateDrainWhere(3, 'On this valve'); updateDrainWhere(5, 'None found'); updateDrainWhere(6, 'On this valve');
      updateDrainWhere(11, 'On this valve');
      got.codes = [0, 2, 3, 5, 6].map(i => sources[i].verification).join(' / ') + ' || ' + sources[11].verification;
      want(got.codes === codesBefore + ' || Drain Only - Hot' && sources[5].verification === 'Gauge/Drain' && sources[5]._drainDefault === true,
        'no code rewrite on the new media (D5) — not even None found on a pre-ticked vacuum drain; the water row keeps its rewrite: ' + got.codes + ' (before ' + codesBefore + ')');
      want(drainLocationSheetText(sources[0]) === 'Between this valve and the equipment: casing plug' && sources[3].drainLocation.where === 'On this valve', 'stored canonical');
      updateDrainWhere(3, 'None found'); updateDrainWhere(6, 'None found'); updateDrainWhere(1, 'None found');
      got.notes = changeLaterAutoNotes(formEntryLike()).join(' | ');
      want(got.notes === 'No drain found for source #2 (Chemical In) | No purge point found for source #4 (Natural Gas, G-1) | No vent found for source #6 (Vacuum Air In) | No recovery port found for source #7 (Refrigerant)', 'the notes name the point: ' + got.notes);
      renderSources();
      got.drainsTo = [!!document.getElementById('src_drainto_0'), !!document.getElementById('src_drainto_3'), !!document.getElementById('src_drainto_1')].join();
      const toSel = document.getElementById('src_drainto_0');
      got.toOpts = toSel ? [...toSel.options].slice(1).map(o => o.textContent.trim()).join('|') : '';
      want(got.drainsTo === 'true,false,false' && got.toOpts === 'Containment (drip pan or bucket)|Floor drain|Hose|Other…', 'Drains to on a found fuel oil / chemical drain only');
      updateDrainTo(0, 'Containment');
      const a1 = drainsToSheetText(sources[0]);
      updateDrainTo(0, 'Other'); updateDrainToText(0, 'sump pit');
      const a2 = [sources[0].drainLocation.to, drainsToSheetText(sources[0]), !!document.getElementById('src_draintotext_0')].join('|');
      updateDrainWhere(0, 'On the equipment'); const a3 = drainsToSheetText(sources[0]);
      updateDrainWhere(0, 'None found'); const a4 = [sources[0].drainLocation.to, drainsToSheetText(sources[0])].join('|');
      updateDrainWhere(0, 'On this valve'); const a5 = drainsToSheetText(sources[0]);
      updateDrainTo(0, 'Other'); updateDrainToText(0, '');
      const a6 = drainsToSheetText(sources[0]);
      got.to = [a1, a2, a3, a4, a5, a6];
      want(JSON.stringify(got.to) === JSON.stringify(['Containment', 'Other: sump pit|Other: sump pit|true', 'Other: sump pit', 'Other: sump pit|', 'Other: sump pit', '']), 'Drains to rides through the answer: ' + JSON.stringify(got.to));
      setHospitalCode('Marion');
      sources = rows(); sources[9].drainLocation = { where: 'On this valve', text: '' };
      renderSources();
      got.marion = asks();
      want(got.marion === '000000000101', 'off: the water row and a row that holds an answer: ' + got.marion);
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T267 — columns 20 / 21 (and 14 on the new media), entries.json
  async function t267_drainsToAndDriveIsolatesTravelInColumns20And21() {
    const N = 'T267 column 20 "Drains To" is headed on the label rows of fuel oil and chemical rows that take the release question (where it drains, from a found drain only), column 21 "Drive Isolates" on the label rows of drive rows at every facility (Yes / No / Can\'t tell per unit in Device ID order, an empty position not checked) and nowhere else; column 14 carries the new media\'s answers by the unit\'s facility (none at Marion, but a held answer ships); widths 18 / 14; entries.json driveIsolates on drive rows only and drainLocation.to';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    await withReleaseSetting(async () => {
      setHospitalCode('');
      const S = (es, extra) => Object.assign(mkSrc(es), { sourceId: genUuid() }, extra || {});
      const V = (es, extra) => S(es, Object.assign({ deviceType: 'Ball Valve', verification: '', location: 'Above Equipment' }, extra || {}));
      const A = Object.assign(mkEntry('FOP-267', { sources: [S('Electrical 208V', { deviceType: 'Disconnect' }),
        V('Fuel Oil In', { drainLocation: { where: 'Between this valve and the equipment', text: 'casing plug', to: 'Containment' } }),
        V('Fuel Oil Out', { drainLocation: { where: 'None found', text: '', to: 'Hose' } }),
        V('Chemical In', { drainLocation: { where: 'On this valve', text: '', to: 'Other: sump' } }),
        V('Chemical Out'),
        V('Natural Gas', { drainLocation: { where: 'On this valve', text: 'purge cock' } })] }),
        { hospitalCode: 'Atlanta', equipType: 'Fuel Oil Pump', template: 'Standard Pump' });
      const D = Object.assign(mkEntry('AHU-267', { sources: [S('Electrical 480V', { deviceType: 'VFD', deviceId: 'VFD-1; VFD-2', quantity: 2, driveIsolates: ['yes', 'no'] }),
        S('Electrical 480V', { location: 'Feeder: MCC-2A bkr 14 (VFD-1)', verification: 'Meter' }), S('Electrical 480V', { location: 'Feeder: MCC-2A bkr 15 (VFD-2)', verification: 'Meter' }),
        S('Electrical 480V', { deviceType: 'VFD', deviceId: 'VFD-3' }),
        S('Electrical 480V', { deviceType: 'VFD', linkedTo: { equipName: 'X', sourceIndex: 0, sourceLabel: 'Electrical 480V' } }),
        S('Electrical 208V', { deviceType: 'Disconnect' })] }), { hospitalCode: 'Atlanta', equipType: 'Air Handler', template: 'AHU - Steam' });
      const M = Object.assign(mkEntry('FOP-267-MAR', { sources: [V('Fuel Oil In'), S('Electrical 480V', { deviceType: 'VFD', quantity: 2, driveIsolates: [null, 'cant_tell'] })] }),
        { hospitalCode: 'Marion', equipType: 'Fuel Oil Pump', template: 'Standard Pump' });
      const H = Object.assign(mkEntry('FOP-267-HELD', { sources: [V('Fuel Oil In', { drainLocation: { where: 'On this valve', text: '', to: 'Hose' } })] }),
        { hospitalCode: 'Marion', equipType: 'Fuel Oil Pump', template: 'Standard Pump' });
      savedEquipment = [A, D, M, H]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const by = {};
      for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
        const ws = wb.worksheets[0];
        let cur = null;
        ws.eachRow(row => {
          const a = String(row.getCell(1).value || '');
          if (a === 'Equipment ID/Name') { cur = String(ws.getRow(row.number + 1).getCell(1).value || ''); by[cur] = { h: [], v: [], w: [ws.getColumn(20).width, ws.getColumn(21).width] }; }
          if (!cur || !/^Energy Source #\d+$/.test(a)) return;
          const d = ws.getRow(row.number + 1);
          if (!String(d.getCell(1).value || '')) return;
          by[cur].h.push(String(row.getCell(20).value || '') + '|' + String(row.getCell(21).value || ''));
          by[cur].v.push([14, 20, 21].map(c => String(d.getCell(c).value || '')).join('|'));
        });
      }
      got.sheet = by;
      const a = by['FOP-267'] || {}, d = by['AHU-267'] || {}, m = by['FOP-267-MAR'] || {}, h = by['FOP-267-HELD'] || {};
      want(JSON.stringify(a.h) === JSON.stringify(['|', 'Drains To|', 'Drains To|', 'Drains To|', 'Drains To|', '|']), 'Drains To headers');
      want(JSON.stringify(a.v) === JSON.stringify(['||', 'Between this valve and the equipment: casing plug|Containment|', 'None found||', 'On this valve|Other: sump|', '||', 'On this valve: purge cock||']), 'columns 14 / 20');
      want(JSON.stringify(d.h) === JSON.stringify(['|Drive Isolates', '|', '|', '|Drive Isolates', '|', '|']) && JSON.stringify(d.v) === JSON.stringify(['||Yes; No', '||', '||', '||', '||', '||']), 'Drive Isolates on drive rows only');
      want(JSON.stringify(m.h) === JSON.stringify(['|', '|Drive Isolates']) && JSON.stringify(m.v) === JSON.stringify(['||', "||; Can't tell"]), 'Marion: no release question; the drive answer at every facility');
      want(JSON.stringify(h.h) === JSON.stringify(['Drains To|']) && JSON.stringify(h.v) === JSON.stringify(['On this valve|Hose|']), 'a held answer still ships');
      want((a.w || []).join() === '18,14', 'widths');
      const je = {}; ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = e; });
      got.json = { drives: ((je['AHU-267'] || {}).sources || []).map(s => ('driveIsolates' in s) ? JSON.stringify(s.driveIsolates) : 'NO KEY'),
                   to: ((((je['FOP-267'] || {}).sources || [])[1] || {}).drainLocation || {}).to, mar: ((je['FOP-267-MAR'] || {}).sources || []).map(s => ('driveIsolates' in s) ? JSON.stringify(s.driveIsolates) : 'NO KEY') };
      want(JSON.stringify(got.json.drives) === JSON.stringify(['["yes","no"]', 'NO KEY', 'NO KEY', '[null]', 'NO KEY', 'NO KEY']) && got.json.to === 'Containment'
        && JSON.stringify(got.json.mar) === JSON.stringify(['NO KEY', '[null,"cant_tell"]']), 'entries.json');
    });
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T268 — the build bump
  async function t268_build122() {
    const N = 'T268 build 122: APP_BUILD and the header label say 122, the service worker\'s cache is loto-collector-v7.118, Xcode\'s CURRENT_PROJECT_VERSION is 122 in both entries, app-lists.json carries the new lists, and the Finger Lakes copy is the same page';
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const label = /b(\d+)/.exec((document.querySelector('.header-title h1 span') || {}).textContent || '');
    want(APP_BUILD === 122 && !!label && +label[1] === 122, 'the build');
    const fetchText = async (p) => { try { const r = await fetch(p, { cache: 'no-store' }); return r.ok ? await r.text() : null; } catch (e) { return null; } };
    const sw = await fetchText('sw.js');
    got.sw = sw === null ? 'not served' : ((/const CACHE_NAME = '([^']+)'/.exec(sw) || [])[1] || '');
    want(sw === null || got.sw === 'loto-collector-v7.118', 'sw.js');
    const pbx = await fetchText('ios/App/App.xcodeproj/project.pbxproj');
    got.pbx = (pbx === null || !/CURRENT_PROJECT_VERSION/.test(pbx)) ? 'not served' : (pbx.match(/CURRENT_PROJECT_VERSION = \d+;/g) || []).join();
    want(got.pbx === 'not served' || got.pbx === 'CURRENT_PROJECT_VERSION = 122;,CURRENT_PROJECT_VERSION = 122;', 'Xcode');
    const lists = appListsSnapshot(APP_BUILD).answers;
    want(lists.drainsTo.join() === 'Containment,Floor drain,Hose' && lists.xfmrAltKinds.join() === 'ATS,UPS output,Generator connection,Tie breaker,Another transformer,PV or battery'
      && lists.xfmrConnections.join() === 'Delta-Wye,Delta-Delta,Wye-Wye,Wye-Delta,Single-phase' && lists.xfmrTempRises.join() === '80 C,115 C,150 C'
      && lists.groundingChoices.join() === "Ground bus,Ground studs,None,Can't tell", 'app-lists');
    const page = await fetchText('index.html'), fl = await fetchText('FingerLakes_Information_Sheet.html');
    got.copy = (page === null || fl === null) ? 'not served' : (page === fl ? 'same' : 'DIFFERENT');
    want(got.copy !== 'DIFFERENT', 'the Finger Lakes copy');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ---- Build 122 review (2026-10-24): one test per bug fixed --------------------

  // T269 — a drive's feeder is matched as loto-web matches it
  async function t269_aDrivesFeederIsMatchedAsLotoWebMatchesIt() {
    const N = 'T269 build 122 review: a drive is fed by a Feeder row naming its tag as a whole word in any case inside its closing "( … )" ("VFD-1" is not "VFD-10"; a tag "26" is not "bkr 26"), "(VFD-1, VFD-2)" feeds both, and Feeder rows that name no drive of the unit count for its drives (loto-web\'s feeders_for) — so "VFD1" under a "(VFD-1)" feeder is not asked again at Save & New and gets no second feeder row; the card\'s "+ Add the breaker" offers the next drive without a feeder by the same rule';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      const fed = (srcs) => unitDrives(srcs).map(d => (d.tag || '-') + ':' + (d.fed ? 'fed' : 'no')).join(' ');
      got.mismatch = fed([DRIVE({ deviceId: 'VFD1' }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)')]);
      got.lower = fed([DRIVE({ deviceId: 'vfd-1' }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)')]);
      got.shared = fed([DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2 }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1, VFD-2)')]);
      got.whole = fed([DRIVE({ deviceId: 'VFD-1' }), DRIVE({ deviceId: 'VFD-10' }), FEEDER('Feeder: MCC-2A bkr 10 (VFD-10)')]);
      // inside the closing parentheses only: a drive tagged "26" is not fed by "bkr 26"
      got.paren = fed([DRIVE({ deviceId: '26' }), DRIVE({ deviceId: 'VFD-1' }), FEEDER('Feeder: MCC-2A bkr 26 (VFD-1)')]);
      want(got.mismatch === 'VFD1:fed' && got.lower === 'vfd-1:fed' && got.shared === 'VFD-1:fed VFD-2:fed' && got.whole === 'VFD-1:no VFD-10:fed'
        && got.paren === '26:no VFD-1:fed', 'the rule');
      // Save & New: not asked again, no second feeder row
      formOfType('AHU-269', 'Air Handler', 'AHU - Steam');
      sources = [DRIVE({ deviceId: 'VFD1', driveIsolates: ['yes'] }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)')]; sources.forEach(ensureSourceId); renderSources();
      const asked = [];
      await withDialogs({ confirm: true, choice: (o) => { asked.push(o.id); return o.defaultValue || 'cancel'; } }, async () => { await saveAndNew(); });
      closeIncompleteWarning();
      got.asked = asked.join(' > ');
      want(!asked.some(id => /^(drive-save|feeder-)/.test(id)) && sources.filter(isFeederRow).length === 1, 'Save & New does not ask again: ' + got.asked);
      // the card's suggestion: the next drive without a feeder, by the same rule
      formOfType('AHU-269b', 'Air Handler', 'AHU - Steam');
      sources = [DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2 }), FEEDER('Feeder: MCC-2A bkr 14 (vfd-1)')]; sources.forEach(ensureSourceId); renderSources();
      let offered = null;
      await withDialogs({ choice: (o) => {
        if (o.id === 'feeder-drive') { offered = o.input && o.input.value; return 'cancel'; }
        return ({ 'feeder-panel': 'MCC-2A', 'feeder-breaker': '15' })[o.id] || 'cancel';
      } }, async () => { await addFeederFromCard(0); });
      got.offered = offered;
      want(offered === 'VFD-2', 'the card offers the drive without a feeder');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T270 — one breaker is never recorded twice
  async function t270_oneBreakerIsNeverRecordedTwice() {
    const N = 'T270 build 122 review: a feeder on a breaker already recorded as one (same panel and breaker, any case or spacing) joins that row — "Feeder: MCC-2A bkr 14 (VFD-1, VFD-2)" — instead of a second row; a Feeder row left naming no drive of the unit (its drive retagged) is offered first and Yes renames it, No records a new row (with its role); for an untagged drive, Yes takes the feeder\'s tag as its Device ID';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      const form = (srcs) => { formOfType('AHU-270', 'Air Handler', 'AHU - Steam'); sources = srcs; sources.forEach(ensureSourceId); renderSources(); };
      // the same breaker
      form([DRIVE({ deviceId: 'VFD-1; VFD-2', quantity: 2 }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)')]);
      await withDialogs({ choice: (o) => ({ 'feeder-panel': ' mcc-2a ', 'feeder-breaker': '14', 'feeder-drive': 'VFD-2' })[o.id] || 'cancel' },
        async () => { await recordDrive(unitDrives(sources).find(d => d.k === 1)); });
      got.same = sources.map(s => s.location).join(' | ');
      want(sources.length === 2 && sources[1].location === 'Feeder: MCC-2A bkr 14 (VFD-1, VFD-2)' && unitDrives(sources).every(d => d.fed), 'the same breaker joins its row');
      // a retagged drive: its old feeder first
      const retagged = () => [DRIVE({ deviceId: 'VFD-1' }), DRIVE({ deviceId: 'AHU-1-VFD' }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), FEEDER('Feeder: MCC-2A bkr 15 (VFD-2)')];
      form(retagged());
      const asked = [];
      await withDialogs({ choice: (o) => { asked.push(o.id + ':' + unq(o.html)); return o.id === 'feeder-orphan' ? 'reuse' : 'cancel'; } },
        async () => { await recordDrive(unitDrives(sources).find(d => d.tag === 'AHU-1-VFD')); });
      got.retag = sources.map(s => s.location).join(' | ');
      want(sources.length === 4 && sources[3].location === 'Feeder: MCC-2A bkr 15 (AHU-1-VFD)' && /^feeder-orphan:.*names no drive on this unit now/.test(asked[0] || '')
        && unitDrives(sources).every(d => d.fed), 'a retagged drive takes its old feeder: ' + JSON.stringify(asked));
      form(retagged());
      await withDialogs({ choice: (o) => ({ 'feeder-orphan': 'new', 'feeder-panel': 'MCC-3', 'feeder-breaker': '2', 'feeder-drive': 'AHU-1-VFD' })[o.id] || 'cancel' },
        async () => { await recordDrive(unitDrives(sources).find(d => d.tag === 'AHU-1-VFD')); });
      want(sources.length === 5 && sources[4].location === 'Feeder: MCC-3 bkr 2 (AHU-1-VFD)' && sources[4].role === 'feeder', 'No: a new row, with its role');
      // an untagged drive next to tagged ones: the feeder's tag is offered as its Device ID
      form([DRIVE({ deviceId: 'VFD-1' }), DRIVE({ deviceId: '' }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), FEEDER('Feeder: MCC-2A bkr 15 (VFD-2)')]);
      const dU = unitDrives(sources).find(d => !d.tag);
      got.untaggedFed = !!(dU && dU.fed);
      const asked2 = [];
      await withDialogs({ choice: (o) => { asked2.push(unq(o.html)); return o.id === 'feeder-orphan' ? 'reuse' : 'cancel'; } }, async () => { await recordDrive(dU); });
      got.untagged = sources.map(s => s.deviceId || '-').join(' | ');
      want(!got.untaggedFed && sources[1].deviceId === 'VFD-2' && sources.length === 4 && /is the feeder for VFD-2\. Is this drive VFD-2\?/.test(asked2[0] || '')
        && unitDrives(sources).every(d => d.fed), 'an untagged drive: ' + JSON.stringify(asked2));
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T271 — a Duplicate records its own breakers
  async function t271_aDuplicateRecordsItsOwnBreakers() {
    const N = 'T271 build 122 review: a Duplicate of a unit copies none of its Feeder, Secondary Main or Alternate Source rows (their Location names the original\'s own breakers — by role, or by Location alone for a row typed by hand) nor their photos; the copy then asks for its own (Save & New lists the transformer\'s secondary main and alternate sources; a drive is asked its feeder), and the message says so, naming only the kinds left behind (second review)';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    const prevToast = window.showToast;
    try {
      setHospitalCode('');
      formOfType('XF-271', 'Transformer', 'Standard Electrical');
      sources = [Object.assign(mkSrc('Electrical 480V'), { location: 'MDP-1 bkr 12', verification: 'Meter', collapsed: false }),
        Object.assign(mkSrc('Electrical 208V'), { location: 'Secondary Main: MDP-2 bkr 1', role: 'secondaryMain', verification: 'Meter' }),
        Object.assign(mkSrc('Electrical 208V'), { location: 'Alternate Source (UPS output): UPS-1 bkr 3', role: 'alternate', altKind: 'UPS output', verification: 'Meter' }),
        Object.assign(mkSrc('Electrical 208V'), { location: 'Alternate Source (ATS): ATS-1', verification: 'Meter' })];
      sources.forEach(ensureSourceId); renderSources();
      await captureInto('source_0', await makePhotoFile('t271p'));
      await captureInto('source_1', await makePhotoFile('t271s'));
      const X = saveEntry();
      const toasts = [];
      window.showToast = (m) => { toasts.push(String(m)); };
      await withDialogs({ confirm: true }, async () => { await executeDuplicate(savedEquipment.findIndex(e => e.id === X.id), true); });
      got.rows = sources.map(s => s.location).join(' | ');
      got.photos = Object.keys(photos).filter(k => /^source_/.test(k) && photos[k] && photos[k].dbKey).join();
      got.toast = toasts.filter(t => /Duplicated/.test(t)).join(' / ');
      want(got.rows === 'MDP-1 bkr 12' && got.photos === 'source_0', 'rows and photos');
      want(/record its own secondary main \/ alternate source breakers$/.test(got.toast) && !/FAILED/.test(got.toast), 'the message names the kinds left behind');
      const miss = collectIncompleteFields();
      want(miss.includes('Transformer — secondary main') && miss.includes('Transformer — alternate sources (or None found)'), 'the copy asks for its own: ' + JSON.stringify(miss));
      // a drive's feeder stays behind too, and the copy's drive is asked
      const A = Object.assign(mkEntry('AHU-271', { sources: [Object.assign(DRIVE({ deviceId: 'VFD-1', driveIsolates: ['yes'] }), { sourceId: genUuid() }),
        Object.assign(FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), { sourceId: genUuid(), role: 'feeder' })] }), { equipType: 'Air Handler', template: 'AHU - Steam' });
      savedEquipment = [A]; saveAll();
      toasts.length = 0;
      await withDialogs({ confirm: true }, async () => { await executeDuplicate(0, false); });
      got.drive = [sources.length, sources.some(isFeederRow), drivesToAskAtSave().length].join();
      got.toast2 = toasts.filter(t => /Duplicated/.test(t)).join(' / ');
      want(got.drive === '1,false,1' && /record its own feeder breaker$/.test(got.toast2), 'a drive asks its own feeder; the message says feeder only');
    } finally { window.showToast = prevToast; setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T272 — a transformer's row reads "<panel> bkr <n>"; Back never drops what was typed
  async function t272_aTransformerRowReadsPanelBkrN() {
    const N = 'T272 build 122 review: a transformer\'s secondary main and alternate sources are asked as a feeder\'s are — the panel or switch, its breaker (or No number), then the voltage — so the Location reads "<panel> bkr <n>" (no " bkr" with No number, spaces collapsed); Other… → Back returns to the voltage as often as the tech likes, the panel and breaker kept; a voltage never picked ends with a message, not silently; Skip adds nothing';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevToast = window.showToast;
    try {
      const toasts = [];
      window.showToast = (m) => { toasts.push(String(m)); };
      const run = async (answers) => {
        const asked = []; let r;
        await withDialogs({ choice: (o) => {
          asked.push(o.id);
          const l = answers[o.id];
          if (Array.isArray(l)) return l.length > 1 ? l.shift() : l[0];
          return l !== undefined ? l : 'cancel';
        } }, async () => { r = await askXfmrFeed({ id: 'xfmr-secondary-main', title: 'Secondary main', html: '', placeholder: '' }); });
        return { r, asked };
      };
      const a = await run({ 'xfmr-secondary-main': ' SWBD  2 ', 'xfmr-secondary-main-breaker': ' 4 ', 'xfmr-secondary-main-voltage': '240V' });
      const b = await run({ 'xfmr-secondary-main': 'SWBD-2', 'xfmr-secondary-main-breaker': '', 'xfmr-secondary-main-voltage': '480V' });
      const c = await run({ 'xfmr-secondary-main': 'SWBD-2', 'xfmr-secondary-main-breaker': '7',
        'xfmr-secondary-main-voltage': ['other', 'other', 'other', 'other', 'other', 'other', '480V'], 'other-voltage': ['back'] });
      const d = await run({ 'xfmr-secondary-main': 'SWBD-2', 'xfmr-secondary-main-breaker': 'skip' });
      const e = await run({ 'xfmr-secondary-main': 'SWBD-2', 'xfmr-secondary-main-breaker': '9', 'xfmr-secondary-main-voltage': ['other'], 'other-voltage': ['back'] });
      got.r = [a.r, b.r, c.r, d.r, e.r].map(x => x ? x.text + '@' + x.voltage : 'null');
      got.backs = c.asked.filter(x => x === 'other-voltage').length;
      got.toast = toasts.join(' / ');
      want(got.r[0] === 'SWBD 2 bkr 4@240V' && got.r[1] === 'SWBD-2@480V', 'the Location');
      want(got.r[2] === 'SWBD-2 bkr 7@480V' && got.backs === 6, 'six Backs: nothing dropped');
      want(got.r[3] === 'null' && got.r[4] === 'null' && /Not added: no voltage was picked for SWBD-2 bkr 9/.test(got.toast), 'Skip; never a voltage: a message');
    } finally { window.showToast = prevToast; }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T273 — an arc flash photo is named on the sheet whatever the unit's type now
  async function t273_anArcFlashPhotoIsNamedWhateverTheType() {
    const N = 'T273 build 122 review: a unit holding an arc flash photo whose type is no longer ATS, Generator or Transformer still has column 13 headed "Arc Flash Label" with the photo\'s file name (the photo ships in photos/ and is never left unnamed); a leftover "No label" on such a type stays blank';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('ATS-273', 'ATS', 'ATS - Generic');
      sources = [Object.assign(mkSrc('Electrical 480V'), { location: 'EDP-1 bkr 3', verification: 'Meter', collapsed: false })];
      renderSources();
      await captureInto('equip_arcflash', await makePhotoFile('t273a'));
      const A = saveEntry();
      const saved = savedEquipment.find(e => e.id === A.id) || A;
      saved.equipType = 'Switchgear';   // the type corrected after the photo
      const P = Object.assign(mkEntry('P-273', { sources: [Object.assign(mkSrc('Electrical 208V'), { sourceId: genUuid() })] }), { equipType: 'CHW Pump', template: 'Chilled Water Pump', unitAnswers: { arcFlashNone: true } });
      savedEquipment = [saved, P]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const by = {};
      for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
        const ws = wb.worksheets[0];
        ws.eachRow(row => {
          if (String(row.getCell(1).value || '') !== 'Equipment ID/Name') return;
          const d = ws.getRow(row.number + 1);
          by[String(d.getCell(1).value || '')] = String(row.getCell(13).value || '') + '|' + String(d.getCell(13).value || '');
        });
      }
      got.sheet = by;
      const [h, v] = String(by['ATS-273'] || '|').split('|');
      want(h === 'Arc Flash Label' && /\.jpg$/.test(v) && !!u.files['photos/' + v], 'the photo is named');
      want(by['P-273'] === '|', 'a leftover No label on a pump stays blank');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T274 — "No label" holds while the arc flash slot holds only a ref that never saved
  async function t274_noLabelHoldsOverAnUnsavedRef() {
    const N = 'T274 build 122 review: an arc flash slot holding a ref whose bytes never saved (unsaved) still shows "No arc flash label on this equipment", and it — or Save & New\'s "No label on it" — is kept; a saved photo still overrules it';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('ATS-274', 'ATS', 'ATS - Generic');
      sources = [Object.assign(mkSrc('Electrical 480V'), { location: 'EDP-1 bkr 3', verification: 'Meter', collapsed: false })]; renderSources();
      const id = ensureCurrentEntryId();
      photos.equip_arcflash = { dbKey: photoStoreKey(id, 'arcflash', 'deadbeef'), unsaved: true, timestamp: new Date().toISOString() };
      syncArcFlashSlot();
      got.shown = document.getElementById('arcFlashNoneLabel').style.display !== 'none';
      setArcFlashNone(true);
      got.box = [unitAnswers.arcFlashNone === true, document.getElementById('arcFlashNone').checked].join();
      want(got.shown && got.box === 'true,true', 'the box');
      setArcFlashNone(false);
      await withDialogs({ confirm: true, choice: (o) => o.id === 'arc-flash-save' ? 'none' : 'cancel' }, async () => { await saveAndNew(); });
      closeIncompleteWarning();
      want(unitAnswers.arcFlashNone === true, 'Save & New\'s No label on it');
      // a saved photo overrules it
      setArcFlashNone(false);
      await captureInto('equip_arcflash', await makePhotoFile('t274a'));
      setArcFlashNone(true);
      want(!unitAnswers.arcFlashNone && document.getElementById('arcFlashNoneLabel').style.display === 'none', 'a saved photo');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T275 — a shared tag says which unit
  async function t275_aSharedTagSaysWhichUnit() {
    const N = 'T275 build 122 review: a Quantity-2 drive row with one Device ID for both drives names each by its unit — "Drive VFD-1 (unit 2) has no answer about its disconnect", "Does drive VFD-1 (unit 2)\'s own disconnect…", the card\'s "VFD-1 (unit 1)" / "VFD-1 (unit 2)", the change-later note — so each answer lands on its own unit; distinct tags read as before';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('AHU-275', 'Air Handler', 'AHU - Steam');
      sources = [DRIVE({ deviceId: 'VFD-1', quantity: 2 }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)')]; sources.forEach(ensureSourceId); renderSources();
      const titles = [];
      const answers = ['yes', 'no'];
      await withDialogs({ confirm: true, choice: (o) => {
        titles.push(o.id + ':' + unq(o.title));
        return o.id === 'drive-save' ? 'record' : (o.id === 'drive-isolates' ? answers.shift() : 'cancel');
      } }, async () => { await saveAndNew(); });
      closeIncompleteWarning();
      got.titles = titles;
      want(JSON.stringify(titles.slice(0, 4)) === JSON.stringify([
        'drive-save:Drive VFD-1 (unit 1) has no answer about its disconnect', "drive-isolates:Does drive VFD-1 (unit 1)'s own disconnect isolate all incoming power?",
        'drive-save:Drive VFD-1 (unit 2) has no answer about its disconnect', "drive-isolates:Does drive VFD-1 (unit 2)'s own disconnect isolate all incoming power?"]), 'the questions');
      want(JSON.stringify(sources[0].driveIsolates) === '["yes","no"]', 'each answer on its unit');
      renderSources();
      got.labels = [...document.querySelectorAll('#driveIsoGroup_0 .scan-input-row > span')].map(e => e.textContent.trim()).join(' / ');
      want(got.labels === 'VFD-1 (unit 1) / VFD-1 (unit 2)', 'the card');
      sources[0].driveIsolates = ['yes', 'cant_tell'];
      want(changeLaterAutoNotes(formEntryLike()).includes("Drive VFD-1 (unit 2): can't tell whether its disconnect isolates all incoming power"), 'the note');
      sources[0].deviceId = 'VFD-1; VFD-2'; renderSources();
      got.distinct = [...document.querySelectorAll('#driveIsoGroup_0 .scan-input-row > span')].map(e => e.textContent.trim()).join(' / ');
      want(got.distinct === 'VFD-1 / VFD-2', 'distinct tags');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T276 — D5: a drain answer kept from before the medium changed never rewrites the code
  async function t276_aKeptDrainAnswerNeverRewritesANewMediumsCode() {
    const N = 'T276 build 122 review (D5): a found drain recorded while a row was hot water changes its code as before, and None found puts it back; once the row\'s medium is a build 122 one (fuel oil), None found or a blank answer leaves the code as it is';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    formOfType('AHU-276', 'Air Handler', 'AHU - HHW');
    const V = () => Object.assign(mkSrc('HHW In'), { deviceType: 'Ball Valve', verification: 'GaugeOnly - Hot', collapsed: false });
    sources = [V(), V()]; renderSources();
    updateDrainWhere(0, 'On this valve'); updateDrainWhere(1, 'On this valve');
    got.found = [sources[0].verification, sources[1].verification].join();
    updateDrainWhere(1, 'None found');
    got.water = sources[1].verification;
    sources[0].energySource = 'Fuel Oil In';   // the medium changed, the code kept
    updateDrainWhere(0, 'None found');
    got.fuelNone = sources[0].verification;
    updateDrainWhere(0, '');
    got.fuelBlank = sources[0].verification;
    want(got.found === 'Gauge/Drain - Hot,Gauge/Drain - Hot' && got.water === 'GaugeOnly - Hot', 'water as before');
    want(got.fuelNone === 'Gauge/Drain - Hot' && got.fuelBlank === 'Gauge/Drain - Hot', 'fuel oil: the code stays');
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T277 — a row's role outlives an edit of its Location
  async function t277_aRowsRoleOutlivesALocationEdit() {
    const N = 'T277 build 122 review: the rows the app adds for a unit\'s own breakers carry their role (feeder / secondaryMain / alternate + kind); a Location edited without its prefix still counts as that row in the app, and the sheet, the CSV and entries.json write the prefix back so loto-web reads the same row; a prefix typed in the Location wins over the stored kind, and one an edit broke is mended (loto-web reads it with its colon); rows typed by hand still go by their Location';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      got.app = [isSecondaryMainRow({ role: 'secondaryMain', location: 'MDP-2 bkr 1' }), alternateSourceKindOf({ role: 'alternate', altKind: 'UPS output', location: 'UPS-1 bkr 3' }),
        alternateSourceKindOf({ role: 'alternate', altKind: 'UPS output', location: 'Alternate Source (ATS): ATS-1' }), isFeederRow({ role: 'feeder', location: 'MCC-2A bkr 14 (VFD-1)' }),
        isSecondaryMainRow({ location: 'Secondary Main: X' }), isFeederRow({ location: 'Panel LP-2 bkr 14' })].join();
      want(got.app === 'true,UPS output,ATS,true,true,false', 'the app');
      // loto-web reads the prefix with its colon: one an edit only broke is mended, a row typed without it is not that row
      got.mend = [sourceLocationForExport({ role: 'secondaryMain', location: 'Secondary Main MDP-2 bkr 1' }),
        sourceLocationForExport({ role: 'alternate', altKind: 'ATS', location: 'Alternate Source (ATS) ATS-1' }),
        String(isSecondaryMainRow({ location: 'Secondary Main MDP-2' }))].join(' | ');
      want(got.mend === 'Secondary Main: MDP-2 bkr 1 | Alternate Source (ATS): ATS-1 | false', 'a broken prefix');
      const S = (loc, extra) => Object.assign(mkSrc('Electrical 208V'), { sourceId: genUuid(), location: loc, verification: 'Meter' }, extra || {});
      const X = Object.assign(mkEntry('XF-277', { sources: [S('MDP-1 bkr 12'), S('MDP-2 bkr 1', { role: 'secondaryMain' }), S('UPS-1 bkr 3', { role: 'alternate', altKind: 'UPS output' })] }),
        { equipType: 'Transformer', template: 'Standard Electrical' });
      const A = Object.assign(mkEntry('AHU-277', { sources: [S('MCC', { energySource: 'Electrical 480V', deviceType: 'VFD', deviceId: 'VFD-1' }), S('MCC-2A bkr 14 (VFD-1)', { role: 'feeder' })] }),
        { equipType: 'Air Handler', template: 'AHU - Steam' });
      savedEquipment = [X, A]; saveAll();
      const { zip, confirms } = await runExport({ confirmResponse: true });
      if (!zip) { fails.push('no zip: ' + confirms.join(' | ')); return; }
      const u = await unzipExport(zip.blob);
      const sheet = {};
      for (const xpath of Object.keys(u.files).filter(p => /Information_Sheet_.*\.xlsx$/.test(p))) {
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(u.files[xpath]);
        const ws = wb.worksheets[0];
        let cur = null;
        ws.eachRow(row => {
          const a = String(row.getCell(1).value || '');
          if (a === 'Equipment ID/Name') { cur = String(ws.getRow(row.number + 1).getCell(1).value || ''); sheet[cur] = { locs: [], u3: '' }; }
          if (!cur) return;
          if (/^Energy Source #\d+$/.test(a)) { const d = ws.getRow(row.number + 1); if (String(d.getCell(1).value || '')) sheet[cur].locs.push(String(d.getCell(5).value || '')); }
          if (String(row.getCell(12).value || '') === 'Alternate Sources') sheet[cur].u3 = String(ws.getRow(row.number + 1).getCell(12).value || '');
        });
      }
      got.sheet = sheet;
      want(JSON.stringify((sheet['XF-277'] || {}).locs) === JSON.stringify(['MDP-1 bkr 12', 'Secondary Main: MDP-2 bkr 1', 'Alternate Source (UPS output): UPS-1 bkr 3'])
        && (sheet['XF-277'] || {}).u3 === 'UPS output', 'the sheet (transformer)');
      want(JSON.stringify((sheet['AHU-277'] || {}).locs) === JSON.stringify(['MCC', 'Feeder: MCC-2A bkr 14 (VFD-1)']), 'the sheet (feeder)');
      const cp = Object.keys(u.files).find(q => /\.csv$/.test(q));
      const rows = parseCsvRows(new TextDecoder().decode(u.files[cp]));
      const li = (rows[0] || []).indexOf('Location');
      got.csv = rows.filter(r => r[2] === 'XF-277' || r[2] === 'AHU-277').map(r => r[li]);
      want(JSON.stringify(got.csv) === JSON.stringify(['MDP-1 bkr 12', 'Secondary Main: MDP-2 bkr 1', 'Alternate Source (UPS output): UPS-1 bkr 3', 'MCC', 'Feeder: MCC-2A bkr 14 (VFD-1)']), 'the CSV');
      const je = {}; ((u.entriesJson && u.entriesJson.entries) || []).forEach(e => { je[e.equipName] = e; });
      got.json = ((je['XF-277'] || {}).sources || []).map(s => s.location);
      want(JSON.stringify(got.json) === JSON.stringify(['MDP-1 bkr 12', 'Secondary Main: MDP-2 bkr 1', 'Alternate Source (UPS output): UPS-1 bkr 3']), 'entries.json');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // ---- Build 122 second review (2026-10-24): one test per bug fixed -------------

  // T278 — Copy Source onto a role row: the copy is that source, not the row's role
  async function t278_copySourceOntoARoleRowDropsTheRole() {
    const N = 'T278 build 122 second review: Copy Source of an ordinary source onto a row that was a Feeder (or a transformer\'s Secondary Main) leaves no role behind — the app no longer reads it as one and the export writes its own Location, not "Feeder: …"; a copied Location that says a role still reads as one, as typed';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      const S = (x) => Object.assign(mkSrc(x.energySource || 'Electrical 208V'), { sourceId: genUuid(), verification: 'Meter' }, x);
      const O = Object.assign(mkEntry('P-278', { sources: [S({ deviceType: 'Disconnect', location: 'On Equipment' }), S({ location: 'Feeder: MCC-9 bkr 2 (VFD-9)' })] }), { equipType: 'CHW Pump', template: 'Chilled Water Pump' });
      savedEquipment = [O]; saveAll();
      formOfType('AHU-278', 'Air Handler', 'AHU - Steam');
      sources = [Object.assign(FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), { role: 'feeder', collapsed: false }),
        Object.assign(mkSrc('Electrical 208V'), { location: 'Secondary Main: MDP-2 bkr 1', role: 'secondaryMain', collapsed: false })];
      sources.forEach(ensureSourceId); renderSources();
      showCopySourceDialog(0); applyCopySource(0, 0);
      showCopySourceDialog(1); applyCopySource(0, 0);
      got.rows = sources.map(s => [s.location, s.role || '-', isFeederRow(s), isSecondaryMainRow(s), sourceLocationForExport(s)].join('|'));
      want(got.rows[0] === 'On Equipment|-|false|false|On Equipment' && got.rows[1] === 'On Equipment|-|false|false|On Equipment', 'the role goes');
      // a copied Location that says a role still reads as one
      showCopySourceDialog(0); applyCopySource(0, 1);
      got.typed = [sources[0].location, sources[0].role || '-', isFeederRow(sources[0])].join('|');
      want(got.typed === 'Feeder: MCC-9 bkr 2 (VFD-9)|-|true', 'a copied feeder Location');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T279 — a row's role shows on its card and can be cleared
  async function t279_aRowsRoleShowsAndCanBeCleared() {
    const N = 'T279 build 122 second review: a Feeder / Secondary Main / Alternate Source row says on its card how loto-web reads it ("loto-web reads this row as the breaker that feeds a drive") with a "Not a feeder" (…) button that makes it ordinary — role and Location prefix gone, exported as typed; a row whose energy source stops being Electrical loses its role the same way; an ordinary row shows nothing';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('XF-279', 'Transformer', 'Standard Electrical');
      sources = [Object.assign(mkSrc('Electrical 480V'), { location: 'MDP-1 bkr 12', verification: 'Meter', collapsed: false }),
        Object.assign(FEEDER('MCC-2A bkr 14 (VFD-1)'), { role: 'feeder', collapsed: false }),
        Object.assign(mkSrc('Electrical 208V'), { location: 'Secondary Main: MDP-2 bkr 1', role: 'secondaryMain', verification: 'Meter', collapsed: false }),
        Object.assign(mkSrc('Electrical 208V'), { location: 'UPS-1 bkr 3', role: 'alternate', altKind: 'UPS output', verification: 'Meter', collapsed: false })];
      sources.forEach(ensureSourceId); renderSources();
      const card = (i) => { const g = document.getElementById('roleGroup_' + i); return g && g.style.display !== 'none' ? g.textContent.replace(/\s+/g, ' ').trim() : ''; };
      got.cards = [0, 1, 2, 3].map(card);
      want(got.cards[0] === '' && /reads this row as the breaker that feeds a drive\. Not a feeder$/.test(got.cards[1])
        && /secondary main\. Not the secondary main$/.test(got.cards[2]) && /alternate source \(UPS output\)\. Not an alternate source$/.test(got.cards[3]), 'the cards: ' + JSON.stringify(got.cards));
      document.getElementById('src_clearrole_1').click();
      document.getElementById('src_clearrole_3').click();
      got.cleared = [1, 3].map(i => [sources[i].location, sources[i].role || '-', sourceRoleOf(sources[i]) || '-', sourceLocationForExport(sources[i])].join('|'));
      want(got.cleared[0] === 'MCC-2A bkr 14 (VFD-1)|-|-|MCC-2A bkr 14 (VFD-1)' && got.cleared[1] === 'UPS-1 bkr 3|-|-|UPS-1 bkr 3' && card(1) === '' && card(3) === '', 'cleared: ' + JSON.stringify(got.cleared));
      // a row no longer Electrical
      handleEnergySourceChange(2, 'Natural Gas');
      got.gas = [sources[2].location, sources[2].role || '-', sourceRoleOf(sources[2]) || '-'].join('|');
      want(got.gas === 'MDP-2 bkr 1|-|-', 'Natural Gas: ' + got.gas);
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T280 — a drive recorded without a tag takes the one typed at its feeder
  async function t280_anUntaggedDriveTakesItsFeedersTag() {
    const N = 'T280 build 122 second review: recording the feeder of a drive whose Device ID box is blank writes the tag typed for it ("Feeder: the drive") into that box, so the drive is fed by the app\'s and loto-web\'s rule even beside a tagged drive; a tag another drive of the unit already carries is never written there; the message says so';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    const prevToast = window.showToast;
    try {
      setHospitalCode('');
      const toasts = []; window.showToast = (m) => { toasts.push(String(m)); };
      const form = (srcs) => { formOfType('AHU-280', 'Air Handler', 'AHU - Steam'); sources = srcs; sources.forEach(ensureSourceId); renderSources(); };
      form([DRIVE({ deviceId: 'VFD-1' }), Object.assign(FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), { role: 'feeder' }), DRIVE({ deviceId: '' })]);
      await withDialogs({ choice: (o) => ({ 'feeder-panel': 'MCC-2A', 'feeder-breaker': '15', 'feeder-drive': 'VFD-2', 'drive-isolates': 'yes' })[o.id] || 'cancel' },
        async () => { await promptDriveFeeder(2); });
      got.second = [sources[2].deviceId, unitDrives(sources).map(d => d.fed).join(), toasts.some(t => /and tagged the drive VFD-2/.test(t))].join('|');
      want(got.second === 'VFD-2|true,true|true', 'the second drive: ' + got.second);
      // a tag the other drive carries: not written into the blank box
      form([DRIVE({ deviceId: 'VFD-1' }), Object.assign(FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), { role: 'feeder' }), DRIVE({ deviceId: '' })]);
      await withDialogs({ choice: (o) => ({ 'feeder-panel': 'MCC-3', 'feeder-breaker': '1', 'feeder-drive': 'vfd-1' })[o.id] || 'cancel' },
        async () => { await promptDriveFeeder(2); });
      want(sources[2].deviceId === '', 'another drive\'s tag stays out: ' + JSON.stringify(sources[2].deviceId));
    } finally { window.showToast = prevToast; setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T281 — the card's suggestion for an untagged drive is blank
  async function t281_theCardOffersNoTagForAnUntaggedDrive() {
    const N = 'T281 build 122 second review: on a row "VFD-1; " (unit 2 untagged) with VFD-1 fed, the card\'s "+ Add the breaker" offers no tag — never VFD-1, which has its feeder — and an orphan feeder is offered as this drive\'s ("Is this drive VFD-7?"), never as VFD-1\'s; with every drive fed it offers the row\'s first tag';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      const offer = async (srcs) => {
        formOfType('AHU-281', 'Air Handler', 'AHU - Steam'); sources = srcs; sources.forEach(ensureSourceId); renderSources();
        const asked = []; let offered = null;
        await withDialogs({ choice: (o) => { asked.push(o.id + (o.id === 'feeder-orphan' ? ':' + unq(o.html) : '')); if (o.id === 'feeder-drive') { offered = o.input && o.input.value; return 'cancel'; } return ({ 'feeder-panel': 'MCC-2A', 'feeder-breaker': '20' })[o.id] || (o.id === 'feeder-orphan' ? 'new' : 'cancel'); } },
          async () => { await addFeederFromCard(0); });
        return { offered, asked };
      };
      const a = await offer([DRIVE({ deviceId: 'VFD-1; ', quantity: 2 }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)'), FEEDER('Feeder: MCC-2A bkr 15 (VFD-7)')]);
      const b = await offer([DRIVE({ deviceId: 'VFD-1' }), FEEDER('Feeder: MCC-2A bkr 14 (VFD-1)')]);
      got.a = a; got.b = b;
      const orphanQ = a.asked.find(x => /^feeder-orphan:/.test(x)) || '';
      want(a.offered === '' && /Is this drive VFD-7\? Its Device ID is blank\.$/.test(orphanQ) && !/feeds VFD-1/.test(orphanQ), 'unit 2 untagged: no tag; the orphan offered as its own: ' + orphanQ);
      want(b.offered === 'VFD-1', 'every drive fed: the first tag');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T282 — a feeder an untagged drive may own is never offered away
  async function t282_anUntaggedDrivesFeederIsNotOfferedAway() {
    const N = 'T282 build 122 second review: while another drive of the unit has no tag, a Feeder row naming no tagged drive may be that drive\'s own, so recording a tagged drive\'s feeder offers it no orphan question and the untagged drive keeps its feeder; with no untagged drive the orphan is offered as before';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevCode = getHospitalCode();
    try {
      setHospitalCode('');
      formOfType('AHU-282', 'Air Handler', 'AHU - Steam');
      // A untagged with its own feeder (recorded before its Device ID); C fed by name, so B (VFD-9) is unfed
      sources = [DRIVE({ deviceId: '' }), FEEDER('Feeder: MCC-2A bkr 15 (VFD-5)'), DRIVE({ deviceId: 'VFD-9' }),
        DRIVE({ deviceId: 'VFD-3' }), FEEDER('Feeder: MCC-2A bkr 16 (VFD-3)')];
      sources.forEach(ensureSourceId); renderSources();
      const dB = unitDrives(sources).find(d => d.tag === 'VFD-9');
      got.bFed = dB.fed;
      got.orphansBlank = orphanFeederRows(sources, dB).length;
      const asked = [];
      await withDialogs({ choice: (o) => { asked.push(o.id); return o.id === 'feeder-orphan' ? 'reuse' : 'cancel'; } },
        async () => { await recordDrive(dB); });
      got.asked = asked.join(' > ');
      want(!got.bFed && got.orphansBlank === 0 && asked[0] === 'feeder-panel' && sources[1].location === 'Feeder: MCC-2A bkr 15 (VFD-5)', 'no question while a drive is untagged: ' + got.asked);
      sources[0].deviceId = 'VFD-4'; renderSources();
      got.orphansTagged = orphanFeederRows(sources, unitDrives(sources).find(d => d.tag === 'VFD-9')).map(s => s.location);
      want(JSON.stringify(got.orphansTagged) === JSON.stringify(['Feeder: MCC-2A bkr 15 (VFD-5)']), 'every drive tagged: offered as before');
    } finally { setHospitalCode(prevCode); }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
  }

  // T283 — closing the transformer's question says what wasn't added
  async function t283_closingATransformerQuestionSaysWhatWasntAdded() {
    const N = 'T283 build 122 second review: closing the breaker or voltage step of a transformer\'s secondary main / alternate source (tapping outside) says "Not added: Secondary main (MDP-2 bkr 1) — the question was closed"; Skip, a choice the tech made, adds nothing quietly';
    await resetAppState();
    const fails = [], got = {};
    const want = (ok, what) => { if (!ok) fails.push(what); };
    const prevToast = window.showToast;
    try {
      const toasts = []; window.showToast = (m) => { toasts.push(String(m)); };
      const run = async (answers) => { let r; await withDialogs({ choice: (o) => (o.id in answers) ? answers[o.id] : 'cancel' }, async () => { r = await askXfmrFeed({ id: 'xfmr-secondary-main', title: 'Secondary main', html: '', placeholder: '' }); }); return r; };
      const v = await run({ 'xfmr-secondary-main': 'MDP-2', 'xfmr-secondary-main-breaker': '1', 'xfmr-secondary-main-voltage': 'cancel' });
      const b = await run({ 'xfmr-secondary-main': 'MDP-3', 'xfmr-secondary-main-breaker': 'cancel' });
      const n0 = toasts.length;
      const sk = await run({ 'xfmr-secondary-main': 'MDP-4', 'xfmr-secondary-main-breaker': '2', 'xfmr-secondary-main-voltage': 'skip' });
      got.toasts = toasts;
      want(v === null && b === null && sk === null, 'nothing added');
      want(toasts[0] === 'Not added: Secondary main (MDP-2 bkr 1) — the question was closed' && toasts[1] === 'Not added: Secondary main (MDP-3) — the question was closed' && toasts.length === n0, 'the messages');
    } finally { window.showToast = prevToast; }
    record(N, !fails.length, (fails.length ? 'FAILED: ' + fails.join('; ') + ' — ' : '') + JSON.stringify(got));
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
    t57_incompleteExportIsNotStampedExported, t58_integrityBadgeFollowsDeletes,
    t59_numberTypedIdEntryExportsItsPhotos, t60_numericKeyFileFromB83to88IsFound,
    t61_photographedSourceNeverSilentlyDroppedByNoPhoto, t62_webSaveNeverClaimsAnUnconfirmedDownload,
    t63_failedReadWithMigratableEntryNeverOverwritesStore, t64_unreadSessionFallbackNeverOverwritesStore,
    t65_failedWipReadNeverOverwritesTheUnitInProgress, t66_unitsSavedDuringAWriteOutageSurvive,
    t67_xlsxCarriesValveState, t68_duplicateCopyNeverOverwritesACaptureOrLosesPhotos,
    t69_templateOrTypeChangeNeverDropsTypedSourceData, t70_voltageCancelKeepsCardsInSync,
    t71_exportedDiagramInkLandsWhereDrawn, t72_openFormDiagramExportsWithSectionCollapsed,
    t73_discardedEditNeverChangesSavedSketch, t74_duplicateNeverInheritsTheOpenFormsSketch,
    t75_typedNameAndRoomAreAutosaved, t76_serviceWorkerPurgeIsOncePerDevice,
    t77_coolingTowerKeepsItsElectricalDisconnect, t78_staleSnapshotNeverResurrectsDeletedEntries,
    t79_valveMarkIsSavedAndExported, t79b_quantityTwoTakesTwoMarks, t80_markPromptFollowsASourcePhoto,
    t81_retakeDropsTheOldMark, t82_discardedEditNeverChangesSavedMarks, t83_duplicatedSourceStartsUnmarked,
    t84_markLayoutMatchesLotoWeb, t85_sharedPhotoMarksAreLaidOutTogether,
    t86_oldExportStampIsNotProofForNumericIdPhotos, t87_copiesNeverCarryADeviceTag,
    t88_launchAutosaveNeverWipesTheUnitInProgress, t89_inOutMarksAskForTheInValveFirst,
    t90_deviceCountDropClearsTheMarks, t91_settingsFitsTheScreenAndCloses,
    t92_waterCheckNeverStaysOnAnElectricalSource, t93_exportLibrariesAreBundled,
    t94_evictedStoreIsAnnounced, t95_allDatesExportWritesOneSheetPerSurveyDate,
    t96_blankEnergySourceIsFlaggedAndKept, t97_condensatePumpHasNoHhwSupply,
    t98_templateChangeKeepsWhatItPromises, t99_customPhotoSizeIsClamped,
    t100_deletingTheUnitOpenForEditClosesTheForm, t101_aSecondTabPausesInsteadOfOverwriting,
    t102_linkToAnInOutPairTakesItsDeviceCount, t103_headerFitsAPhoneScreen,
    t104_namesAndFieldsShowExactlyAsTyped, t105_copySourceThatLowersTheCountClearsMarks,
    t106_unsavedUnitWithoutPhotosIsOnTodaysSheet, t107_linkedSourceKeepsItsDetailCellClean,
    t108_saveMessageReadsCleanly, t109_csvKeepsALineBreakInsideItsCell,
    t110_unreadableUnitInProgressUsesItsLocalCopyAndSaysSo,
    t111_restoredUnitNeverComesBackAsItsOlderCopy, t112_saveMergesUnitsAnotherWriterSaved,
    t113_aTabThatLostTheClaimWritesNothing, t114_aPausedTabNeverTouchesTheUnitInProgressCopies,
    t115_backupReplaceClosesTheUnitItRemoves, t116_deletingTheOtherTwinKeepsTheEdit,
    t117_marksClearedMessageIsTheOneShown, t118_marksPlacedBeforeAnInOutChangeAreDropped,
    t119_undatedUnitOpenForEditStaysUndated, t120_emergencyCopyWarningStaysOnScreen,
    t121_storageWarningIsInTheBottomBar, t122_noUserValueEverBecomesMarkup, t123_everyBuilderShowsUserTextVerbatim, t124_aDeleteSurvivesAFailedTombstoneWrite, t125_aDeleteStaysDeletedAcrossARelaunch, t126_aFailedCommitNeverMergesTheTabsOwnOldList, t127_aRetriedSaveStillShowsWhatItMerged, t128_anUnreadableAlternateSlotIsNeverSilentOrOverwritten, t129_aTabThatLosesTheClaimMidLaunchLeavesBothSlots, t130_aDeleteConfirmedAfterTheClaimMovedChangesNothing, t131_aLateLaunchNeverOverwritesTheFormInUse, t132_aStaleCopyOfASavedUnitNeverReopens, t133_theEntryCountFollowsTheListAfterAnUnreadLaunch,
    t134_aUnitDeletedAfterItsStoredEditNeverComesBack, t135_replaceKeepsTheEditOfATwinCopy, t136_aSaveCutShortByAnotherTabKeepsTheUnitWhole,
    t137_thePhotoBusyFlagFollowsTheWritesItGuards, t138_legacyMarksAreClearedWhenTheSourceBecomesAnInOutPair,
    t139_aRestoredUnitWhoseSaveFailedIsNeverMarkedSuperseded, t140_noWarningIsHiddenByTheNextMessage, t141_aMultiLineWarningGetsTheLongerTime,
    t142_aDeleteAfterAFutureStampedReSaveStillDeletes, t143_aLateLaunchKeepsTheNewerCopyOfAUnit, t144_aSketchRestoredAtLaunchIsSavedWithTheUnit,
    t145_replaceKeepsTheNewerCopyOfATwin, t146_aLateLaunchNeverAutosavesOverAnUnreadableAlternateSlot, t147_theBuild94ChannelAnswersAndHandsTheFormBack,
    t148_waitingForAnotherTabsPhotosHasAWayOut, t149_anUnreadableDeleteRecordNeverHidesTheList, t150_theFallbackCarriesOnlyTheDeletesTheStoreLacks,
    t151_theHashIndexIsNeverWrittenAfterTheClaimMoved, t152_theFallbackListStaysAPlainList, t153_aWarningIsNeverReplacedBeforeItsTime,
    t154_aFailedFallbackWriteNeverRemovesTheUnitsItHolds, t155_aReSavedUnitSurvivesALaunchThatCantReadItsReSaveRecord,
    t156_aLateLaunchWaitsForTheKeptUnitBeforeItsSlotTakesTheForm, t157_aChangeNotYetAutosavedIsNeverReloadedAway,
    t158_aStoredPhotoGoesUpAndCountsOnlyWhenConfirmed, t159_filedByEachUnitsOwnFacilityAndDay, t160_aDeletedUnitsDayFileIsRewrittenWithoutIt,
    t161_anUnreadablePhotoWaitsAndAnOrphanIsNeverSent, t162_aRefusedFileWaitsWhileTheRestGoUp, t163_noSignalIsNotASignInProblem,
    t164_onlyTheTabThatMaySaveBacksUp, t165_exportToSharePointMarksExportedOnlyWhenConfirmed, t166_sendEverythingAgainResendsAll,
    t167_theIPadSignInNeedsTheVerifierThisAppMade, t168_aPartialListNeverRewritesTheUnitFiles,
    t169_aPhotoWhoseFacilityChangesGoesAgain, t170_aDayFileIsRememberedBeforeItIsSent, t171_sentRecordsFollowTheListNeverAPartialOne,
    t172_editingTheFormSendsOnlyItsOwnFile, t173_anUnsavedConfirmationNeverLeavesAnOlderOneStanding,
    t174_webSignInWaitsForAPhotoStillSaving, t175_aRefusedAccountStaysShownSoItCanBeSwitched, t176_anIPadSignInThatCannotBePreparedSaysSo,
    t177_aServiceWideRefusalPausesEverything, t178_dayFilesWaitWhileTheDeviceCannotRecordThem, t179_aDayFileMarkWritesOnlyTheDayRecord,
    t180_panelIdScansOffTheLabel, t181_aSourceWithoutItsPhotoIsFlagged,
    t182_clearAllDataNeverEmptiesTheBackup, t183_panelIdReadTopToBottom, t184_aSecondReturnLinkIsNotAnError,
    t185_marksPlacedForAnOldShapeAreNotSaved, t186_nothingOnSharePointIsEverReplaced, t187_twoExportsTheSameDayKeepBoth,
    t188_theFormIsSnapshottedAtMostEveryFiveMinutes, t189_aScanAsksBeforeReplacingATypedValue, t190_aDayBackedUpByBuild101GetsItsFirstSnapshot,
    t191_aNewCollectorTagNeverEmptiesTheOldTagsFiles, t192_theBackupsButtonsShowOnlyWhileItIsOn,
    t193_aUnitWithoutItsMainPhotoIsFlagged, t194_eachUnitGetsItsOwnDeviceId,
    t195_pumpsGetNoKineticAndFansNameTheirFan, t196_aMissingElectricalSourceIsFlaggedOnlyWhereExpected,
    t197_firePumpIsItsOwnTemplate, t198_editKeepsATemplateItsTypeNoLongerOffers, t199_labVacuumRecordsEveryPump,
    t200_equipmentTypeCellIsLabelledEquipmentType, t201_cancellingATemplateChangeKeepsTheTemplate,
    t202_savedValuesOffTheListShowAsThemselves, t203_customBoxesAreNotRebuiltWhileTyping,
    t204_valveStateOnValvesAndInOutSplitsByDirection, t205_aScanNeverLandsOnAnotherUnitOrSource,
    t206_cancelEditLeavesTheSavedUnitAsItWas, t207_theSurveyDateIsOnTheFormAndKeptOnEdit,
    t208_notYetExportedSendsWholeDaysAndUndatedUnitsGetADate, t209_duplicateFollowsReuseAndAHandSetYesPicksThePhoto,
    t210_thePhotoSizeLimitTurnsWithThePhoto, t211_newPhotosCarryTheirCaptureTime,
    t212_anEmptySlotWithAPhotoTakenForItIsFlaggedAtExport, t213_appListsJsonMatchesTheApp,
    t214_cancelAfterAnAppMadeTemplatePickKeepsThisUnitsTemplate, t215_reviewFixesForDuplicateDatesAndLinks,
    t216_aDuplicateNeverKeepsAnAutomaticYesWithoutItsPhoto, t217_aSemicolonNeverReplacesAnotherUnitsTag,
    t218_aCustomEnergySourceSavesTheVerificationItShows, t219_aBigExportAsksBeforeItIsPacked,
    t220_aYesWithoutItsPhotoCanStillPickIt, t221_splitKeepsExtraTags, t222_theUnattachedShotWarningCanBeSettled,
    t223_todayAndYesterdayFollowTheSurveyDate, t224_miscCaptureTimesLineUpWithTheirFiles,
    t225_aFilePickedOnADesktopIsNotACameraShot, t226_anAutomaticYesFollowsItsPhotoOnEveryPath,
    t227_theSurveyDateQuestionIsTheAppsQuestionBox, t228_everyLotoWebTemplateCanBePicked,
    t229_aVacuumRecordSaysWhatItCovers, t230_anAhuGetsAKineticRowPerFan, t231_theSameRoomRecordedBothWaysIsNoticed,
    t232_aLowerCountKeepsTheUsersRows, t233_customNameWordsStartAWord, t234_theTemplatesFollowUpsComeFromOnePlace,
    t235_theVacuumListPickTakesTheAnswerDirectly, t236_dentalVacuumAndThePumpsOwnValve,
    t237_dentalAirCompressorAndItsDryers, t238_daTankIsATemplateOfItsOwn,
    t239_overheadDoorTypeAndTemplate,
    t240_theAnswersSitUnderTheirLabels, t241_oneSheetPerFacilityPerDay, t242_theTypeVoltageQuestions,
    t243_theVacuumPumpsExhaustAndJoint, t244_theListsLotoWebAskedFor, t245_drainLocationAndLockOpen,
    t246_aDrivesFeeder, t247_theAnswersTravelWithTheUnit,
    t248_theExistingTagPromptFollowsTheUnitsFacility, t249_copiesStartNotCheckedAndSplitMovesTheTag,
    t250_saveAndNewWarnsAboutAnUnansweredTag, t251_theExistingTagTravelsInColumn16,
    t252_theDamperQuestionFollowsFacilityAndType, t253_theDamperActuatorRow, t254_cantTellNoteAndNoDampers,
    t255_springReturnTravelsInColumn17AndU7,
    t256_theLabelWaitIsAskedOnDrivesAndCapacitorBanks, t257_theLabelPhotoIsBoundToItsRow,
    t258_labelWaitCopiesSplitAndWarning, t259_theLabelWaitTravelsInColumns10_18_19,
    t260_aDriveIsAskedItsFeederAndItsDisconnect, t261_saveAndNewAsksAboutEachDrive, t262_theArcFlashLabelSlot,
    t263_theArcFlashLabelInTheExport, t264_aTransformerAsksItsSecondaryMainAndOtherSources,
    t265_theTransformerSectionAndItsSheetSlots, t266_theReleaseQuestionOnEveryMedium,
    t267_drainsToAndDriveIsolatesTravelInColumns20And21, t268_build122,
    t269_aDrivesFeederIsMatchedAsLotoWebMatchesIt, t270_oneBreakerIsNeverRecordedTwice, t271_aDuplicateRecordsItsOwnBreakers,
    t272_aTransformerRowReadsPanelBkrN, t273_anArcFlashPhotoIsNamedWhateverTheType, t274_noLabelHoldsOverAnUnsavedRef,
    t275_aSharedTagSaysWhichUnit, t276_aKeptDrainAnswerNeverRewritesANewMediumsCode, t277_aRowsRoleOutlivesALocationEdit,
    t278_copySourceOntoARoleRowDropsTheRole, t279_aRowsRoleShowsAndCanBeCleared, t280_anUntaggedDriveTakesItsFeedersTag,
    t281_theCardOffersNoTagForAnUntaggedDrive, t282_anUntaggedDrivesFeederIsNotOfferedAway, t283_closingATransformerQuestionSaysWhatWasntAdded];

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
    window.__PHOTO_SUITE_ARTIFACTS = {};
    let askMarkWas = null;
    try { askMarkWas = localStorage.getItem('loto_ask_valve_mark'); localStorage.setItem('loto_ask_valve_mark', '0'); } catch (e) {}
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
      try { if (askMarkWas === null) localStorage.removeItem('loto_ask_valve_mark'); else localStorage.setItem('loto_ask_valve_mark', askMarkWas); } catch (e) {}
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
