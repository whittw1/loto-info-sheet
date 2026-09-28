// ============================================================================
// RANDOMIZED STATEFUL FUZZER — VA LOTO Collector (review method 3, 2026-09-27)
// ----------------------------------------------------------------------------
// Instead of READING the code, this EXECUTES it: the real app functions are
// driven through seeded random action sequences (form edits, type / template
// changes and their prompts, captures, retakes, reuse, misc photos, valve
// marks, split / duplicate / move / remove source, links, copy-source, Save &
// New, edit, duplicate entry, delete, bulk delete, export, backup + restore,
// simulated relaunches, app backgrounding) and data-safety invariants are
// checked after every step. Every export is verified against the in-memory
// data — entries.json, the Information Sheet XLSX cell by cell, the CSV, and
// each photo file by sha256 against the stored bytes of the reference it
// belongs to. Optional storage-fault injection (IndexedDB / localStorage).
//
// DESTRUCTIVE: erases every entry and photo. Refuses off localhost and where
// saved entries exist. Load by <script> injection, then:
//     await runFuzz({ seeds: [1,2,3], steps: 40, faults: 0 })
// ============================================================================
(function () {
  'use strict';

  // ---------- RNG + helpers ---------------------------------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let R = mulberry32(1);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const chance = (p) => R() < p;
  const randInt = (a, b) => a + Math.floor(R() * (b - a + 1));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const NAMES = ['AHU-1', 'AHU-12', 'EF 6" duct', 'Pump "A"', 'Fan <B> & C', "O'Brien Pump", 'Chiller #2',
    'Boiler — Main', 'ÄHU-ü', '  AHU-3  ', 'Unit, With Comma', 'EF-1', 'EF-12', 'HW Pump 3'];
  const ROOMS = ['B100', '1E119', 'Mech Rm 2', 'Roof', 'B-121'];
  const BUILDINGS = ['Main', 'Bldg 5', 'B'];
  const NOTES = ['', 'Key in shop', 'Line 1\nLine 2', 'Has, comma and "quote"'];
  const DEVICE_IDS = ['', 'LP-2 CKT 14', 'V-7', '3-SF-50', 'MCC-2A #7', '6" gate'];

  // ---------- run state --------------------------------------------------------
  let trace = [];            // actions of the current sequence
  let violations = [];       // {inv, detail, seed, step, trace}
  let infos = [];            // unusual but not violations
  let seedNow = 0, stepNow = 0;
  let warned = false;        // a warning toast / alert since the last deep check
  let pageErrors = [];
  const seenSig = new Set();

  function viol(inv, detail) {
    const sig = inv + '|' + String(detail).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, 'UUID').replace(/\d{6,}/g, 'N').slice(0, 160);
    const v = { inv, detail: String(detail).slice(0, 700), seed: seedNow, step: stepNow, trace: trace.slice(-14) };
    if (!seenSig.has(sig)) { seenSig.add(sig); violations.push(v); }
    else { const f = violations.find(x => x.inv === inv); if (f) f.count = (f.count || 1) + 1; }
  }
  function info(msg) { if (infos.length < 200) infos.push({ seed: seedNow, step: stepNow, msg: String(msg).slice(0, 300) }); }

  window.addEventListener('error', (e) => { if (window.__FUZZ_ARMED) pageErrors.push('error: ' + (e && e.message)); });
  window.addEventListener('unhandledrejection', (e) => { if (window.__FUZZ_ARMED) pageErrors.push('unhandled rejection: ' + ((e && e.reason && (e.reason.stack || e.reason.message)) || e.reason)); });

  // ---------- storage faults ------------------------------------------------------
  // While faultsOn, IndexedDB metadata / photo writes and reads and localStorage
  // writes fail at random. The invariant then is: NO SILENT LOSS — anything lost
  // must have come with a visible warning (toast / alert / NOT SAVED badge).
  let faultP = 0, faultsOn = false, warnedSinceRelaunch = false;
  let uploadTo = null;
  const realFns = {};
  function installFaults() {
    // build 95: the entry list is written by writeEntryListMerged (one
    // read-write transaction), no longer through saveMetadataMany; build 97:
    // the unit-in-progress slots by wipSlotTx (the claim checked inside it)
    for (const name of ['saveMetadata', 'saveMetadataMany', 'getMetadata', 'getMetadataMany', 'savePhotoToDB', 'writeEntryListMerged', 'wipSlotTx']) {
      const real = window[name]; if (typeof real !== 'function') continue;
      realFns[name] = real;
      const isRead = /^get/.test(name);
      window[name] = function () {
        if (faultsOn && R() < (isRead ? faultP / 2 : faultP)) {
          trace.push('  FAULT ' + name + (arguments[0] && typeof arguments[0] === 'string' ? '(' + arguments[0] + ')' : ''));
          return Promise.reject(new Error('injected ' + name + ' failure'));
        }
        return real.apply(this, arguments);
      };
    }
    // build 96: the list write's COMMIT fails too (a quota error at commit, or
    // WebKit dropping the connection) — after every put was issued, so
    // withPhotoDB's retry of writeEntryListMerged is exercised
    const rp = IDBObjectStore.prototype.put;
    realFns.idbPut = rp;
    IDBObjectStore.prototype.put = function (v, k) {
      const req = rp.apply(this, arguments);
      if (faultsOn && k === 'deleted_ids' && R() < faultP / 2) {
        trace.push('  FAULT commit(saved_equipment)');
        try { this.transaction.abort(); } catch (e) {}
      }
      return req;
    };
    const si = Storage.prototype.setItem;
    realFns.setItem = si;
    Storage.prototype.setItem = function (k, v) {
      if (faultsOn && /^loto_/.test(String(k)) && R() < faultP / 2) {
        trace.push('  FAULT localStorage(' + k + ')');
        const e = new Error('QuotaExceededError (injected)'); e.name = 'QuotaExceededError'; throw e;
      }
      return si.call(this, k, v);
    };
  }
  function removeFaults() {
    for (const k of Object.keys(realFns)) {
      if (k === 'setItem') Storage.prototype.setItem = realFns.setItem;
      else if (k === 'idbPut') IDBObjectStore.prototype.put = realFns.idbPut;
      else window[k] = realFns[k];
    }
  }

  // ---------- photos -------------------------------------------------------------
  let photoSeq = 0;
  function makePhoto() {
    const n = ++photoSeq;
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 150;
      const x = c.getContext('2d');
      x.fillStyle = 'hsl(' + ((n * 47) % 360) + ',60%,45%)'; x.fillRect(0, 0, 200, 150);
      x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText('F' + seedNow + '-' + n + '-' + Math.random().toString(36).slice(2, 7), 6, 20);
      for (let i = 0; i < 6; i++) { x.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); x.fillRect(Math.random() * 180, Math.random() * 130, 20, 20); }
      c.toBlob(b => resolve(new File([b], 'fz_' + n + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85);
    });
  }
  async function waitIdle(ms) {
    const t0 = Date.now();
    while (typeof photoWritesBusy === 'function' && photoWritesBusy() && Date.now() - t0 < (ms || 20000)) await sleep(40);
    await sleep(160);   // the capture's hash step runs after its write is released
  }

  // ---------- dialogs ------------------------------------------------------------
  const realConfirm = window.confirm, realAlert = window.alert;
  let confirmBias = 0.75;
  function installDialogs() {
    window.confirm = (m) => { const a = chance(confirmBias); trace.push('  confirm(' + String(m).slice(0, 40).replace(/\n/g, ' ') + ')=' + a); return a; };
    window.alert = (m) => { warned = true; warnedSinceRelaunch = true; trace.push('  alert(' + String(m).slice(0, 60).replace(/\n/g, ' ') + ')'); };
    window.__askChoiceAuto = (o) => {
      const vals = (o && o.choices ? o.choices.map(c => c.value) : []).filter(v => v != null);
      const v = (o && o.id === 'export-blank-energy') ? 'export' : (vals.length ? (chance(0.7) && o.defaultValue ? o.defaultValue : pick(vals)) : 'cancel');
      trace.push('  choice(' + (o && o.id) + ')=' + v);
      return v;
    };
    const realToast = window.showToast;
    window.showToast = function (m, w) { if (w) { warned = true; warnedSinceRelaunch = true; } try { return realToast.apply(this, arguments); } catch (e) {} };
    window.showToast.__real = realToast;
  }
  function restoreDialogs() {
    window.confirm = realConfirm; window.alert = realAlert; window.__askChoiceAuto = undefined;
    if (window.showToast && window.showToast.__real) window.showToast = window.showToast.__real;
  }

  async function doMarkDialog() {
    const ov = document.getElementById('valveMarkOverlay');
    if (!ov) return;
    const wrap = ov.querySelector('#valveMarkWrap');
    const t0 = Date.now();
    while (wrap && (!wrap.getBoundingClientRect().width) && Date.now() - t0 < 1500) await sleep(40);
    const r = wrap ? wrap.getBoundingClientRect() : null;
    const taps = randInt(0, 3);
    for (let i = 0; r && r.width && i < taps; i++) {
      wrap.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + R() * r.width, clientY: r.top + R() * r.height }));
    }
    const how = R();
    const btn = how < 0.7 ? '#valveMarkSave' : how < 0.8 ? '#valveMarkClear' : '#valveMarkSkip';
    trace.push('  mark: ' + taps + ' taps, ' + btn.slice(10));
    const b = ov.querySelector(btn); if (b) b.click();
    if (btn === '#valveMarkClear') { const s = ov.querySelector('#valveMarkSave'); if (s) s.click(); }
  }

  async function drainOverlays() {
    for (let k = 0; k < 10; k++) {
      await sleep(15);
      const open = Array.from(document.querySelectorAll('.dialog-overlay')).filter(o => getComputedStyle(o).display !== 'none');
      if (!open.length) return;
      const o = open[open.length - 1];
      const id = o.id;
      trace.push('  [' + id + ']');
      try {
        switch (id) {
          case 'voltageOverlay': chance(0.85) ? applyVoltageChoice(pick(['120V', '208V', '480V'])) : closeVoltageDialog(); break;
          case 'templateVoltageOverlay': chance(0.7) ? applyTemplateVoltageChoice(pick(getElectricalVoltageOptions(getTemplate()) || ['208V'])) : keepDefaultVoltage(); break;
          case 'electricalCountOverlay': chance(0.8) ? applyElectricalCountChoice(randInt(1, 3)) : closeElectricalCountPrompt(); break;
          case 'templateConfirmOverlay': chance(0.7) ? confirmTemplateChange(document.getElementById('equipTemplate').value) : cancelTemplateChange(); break;
          case 'templatePromptOverlay': {
            const btns = Array.from(o.querySelectorAll('button[onclick*="applyTemplatePromptChoice"]'));
            if (btns.length && chance(0.8)) pick(btns).click(); else closeTemplatePrompt();
            break;
          }
          case 'valveMarkOverlay': await doMarkDialog(); break;
          case 'incompleteWarningOverlay': closeIncompleteWarning(); if (chance(0.7)) performSaveAndNew(); break;
          case 'photoDialogOverlay': closePhotoDialog(); break;
          case 'reusePickerOverlay': closeReusePicker(); break;
          case 'copySourceOverlay': closeCopySourceDialog(); break;
          case 'linkDialogOverlay': closeLinkDialog(); break;
          case 'settingsOverlay': closeSettings(); break;
          case 'exportOverlay': closeExportDialog(); break;
          case 'bulkDeleteOverlay': closeBulkDeleteDialog(); break;
          case 'duplicateDialog': o.remove(); break;
          default: o.remove(); info('removed overlay ' + id);
        }
      } catch (e) { viol('exception', 'overlay ' + id + ': ' + ((e && e.stack) || e)); o.remove(); }
      await sleep(20);
    }
  }

  // ---------- state snapshots -----------------------------------------------------
  const srcSig = (s) => [s.energySource || '', s.deviceType || '', s.deviceId || '', String(s.quantity || ''), s.location || '', s.verification || '', s.valveState || 'normal', s.detail || '', s.linkedTo ? 'L' : ''].join('|');
  function refsSig(photosMap, srcs) {
    const out = [];
    for (const k of Object.keys(photosMap || {}).sort()) {
      const r = photosMap[k];
      if (!r || !r.dbKey) continue;
      out.push(k + '=' + r.dbKey + (r.marks && r.marks.length ? '#' + JSON.stringify(r.marks) : ''));
    }
    return out.join(',');
  }
  function entrySig(e) {
    return {
      id: String(e.id), name: e.equipName || '', room: e.equipRoom || '', type: e.equipType || '', template: e.template || '',
      src: (e.sources || []).map(srcSig), photos: refsSig(e.photos, e.sources),
      misc: (e.miscPhotos || []).map(m => m && m.dbKey).join(','),
      sketch: e.sketch ? ((e.sketch.strokes || []).length + '/' + (e.sketch.labels || []).length) : '0/0',
    };
  }
  function formSig() {
    const v = id => (document.getElementById(id) || {}).value || '';
    return {
      id: currentEntryId ? String(currentEntryId) : null, name: v('equipName').trim(), room: v('equipRoom'),
      src: sources.map(srcSig), photos: refsSig(photos, sources), misc: miscPhotos.map(m => m && m.dbKey).join(','),
      sketch: (typeof sketchStrokes !== 'undefined' ? sketchStrokes.length : 0) + '/' + (typeof sketchLabels !== 'undefined' ? sketchLabels.length : 0),
    };
  }
  const formHasContent = (f) => !!(f.name || f.src.length || f.photos || f.misc);

  // ---------- invariants ----------------------------------------------------------
  function checkCheap() {
    for (const k of Object.keys(photos)) {
      const m = /^source_(\d+)$/.exec(k);
      if (m && +m[1] >= sources.length && photos[k] && photos[k].dbKey) viol('stale-source-ref', k + ' with ' + sources.length + ' sources');
    }
    const ids = savedEquipment.map(e => String(e.id));
    if (new Set(ids).size !== ids.length) viol('duplicate-entry-id', ids.join(','));
    // build 95: marks tapped before the source became an In/Out pair are in
    // tap order, not In-first — every path must clear them
    const pairNow = (s) => valveMarkSlots(s) === 2 && /In\/Out/i.test(s.energySource || '');
    sources.forEach((s, i) => {
      const r = photos['source_' + i];
      if (r && r.dbKey && cleanValveMarks(r.marks).length > valveMarkSlots(s)) viol('marks-exceed-quantity', 'form source ' + i + ' qty ' + s.quantity + ' marks ' + cleanValveMarks(r.marks).length);
      if (r && r.dbKey && cleanValveMarks(r.marks).length && pairNow(s) && r.marksFor && !r.marksFor.inOut) viol('marks-order-unknown', 'form source ' + i + ' became ' + s.energySource + ' after its marks were tapped');
      // build 97: every marked photo records the shape its marks were placed for
      if (r && cleanValveMarks(r.marks).length && !r.marksFor) viol('marks-shape-unknown', 'form source ' + i);
    });
    savedEquipment.forEach(e => (e.sources || []).forEach((s, i) => {
      const r = e.photos && e.photos['source_' + i];
      if (r && r.dbKey && cleanValveMarks(r.marks).length > valveMarkSlots(s)) viol('marks-exceed-quantity', 'saved "' + e.equipName + '" source ' + i);
      if (r && r.dbKey && cleanValveMarks(r.marks).length && pairNow(s) && r.marksFor && !r.marksFor.inOut) viol('marks-order-unknown', 'saved "' + e.equipName + '" source ' + i);
      if (r && cleanValveMarks(r.marks).length && !r.marksFor) viol('marks-shape-unknown', 'saved "' + e.equipName + '" source ' + i);
    }));
    if (!editingEntry && currentEntryId && savedEquipment.some(e => sameEntryId(e.id, currentEntryId))) {
      viol('form-id-is-a-saved-entry-but-not-editing', 'currentEntryId ' + currentEntryId + ' belongs to a saved entry while editingEntry is null');
    }
    if (editingEntry && !savedEquipment.includes(editingEntry)) viol('editing-a-deleted-entry', 'editingEntry "' + editingEntry.equipName + '" is no longer in the saved list');
    if (pageErrors.length) { pageErrors.forEach(p => viol('uncaught', p)); pageErrors = []; }
  }

  async function checkDeep(tag) {
    await waitIdle();
    const fo = faultsOn; faultsOn = false;
    try {
    const present = await presentPhotoKeySet();
    const miss = [];
    const checkRef = async (ref, where) => {
      if (!ref || !ref.dbKey || ref.unsaved || ref.saving) return;
      if (present.has(ref.dbKey)) return;
      if (present.incomplete && await photoBytesExist(ref.dbKey)) return;
      miss.push(where + ' ' + ref.dbKey);
    };
    for (const e of savedEquipment) {
      for (const k of Object.keys(e.photos || {})) await checkRef(e.photos[k], 'saved "' + e.equipName + '" ' + k);
      for (const [i, m] of (e.miscPhotos || []).entries()) await checkRef(m, 'saved "' + e.equipName + '" misc ' + i);
    }
    for (const k of Object.keys(photos)) await checkRef(photos[k], 'form ' + k);
    for (const [i, m] of miscPhotos.entries()) await checkRef(m, 'form misc ' + i);
    if (miss.length && !warned) viol('ref-without-bytes' + (tag ? '@' + tag : ''), miss.slice(0, 4).join(' | '));
    // key ownership: every key is owned by its entry, or a recorded duplicate
    for (const e of savedEquipment) {
      for (const k of Object.keys(e.photos || {})) {
        const r = e.photos[k]; if (!r || !r.dbKey) continue;
        const p = parsePhotoKey(r.dbKey);
        if (p && !sameEntryId(p.entryId, e.id) && !isRecordedDup(r)) viol('foreign-owned-key', 'saved "' + e.equipName + '" ' + k + ' key owner ' + p.entryId + ' ≠ ' + e.id);
      }
    }
    for (const k of Object.keys(photos)) {
      const r = photos[k]; if (!r || !r.dbKey || !currentEntryId) continue;
      const p = parsePhotoKey(r.dbKey);
      if (p && !sameEntryId(p.entryId, currentEntryId) && !isRecordedDup(r)) viol('foreign-owned-key', 'form ' + k + ' key owner ' + p.entryId + ' ≠ form ' + currentEntryId);
    }
    warned = false;
    } finally { faultsOn = fo; }
  }

  // ---------- export oracle ------------------------------------------------------------
  async function sha(bytes) {
    const d = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  const VS_TEXT = { normally_closed: 'Normally Closed', normally_open: 'Normally Open' };
  // The oracle's OWN reading of the contract (independent of the app's helpers,
  // so a bug there can't hide by being on both sides of the comparison).
  const ownMarks = (ref, src) => {
    const qty = Math.max(1, Math.min(10, parseInt(src && src.quantity, 10) || 1));
    const ok = (ref && Array.isArray(ref.marks) ? ref.marks : []).filter(m => m && isFinite(+m.x) && isFinite(+m.y) && +m.x >= 0 && +m.x <= 1 && +m.y >= 0 && +m.y <= 1).slice(0, 10);
    // build 95 contract: more marks than devices → none (which one left is
    // unknown); an In/Out pair whose marks were tapped before it became one → none
    if (ok.length > qty) return [];
    if (qty === 2 && /In\/Out/i.test((src && src.energySource) || '') && ref && ref.marksFor && !ref.marksFor.inOut) return [];
    return ok.map(m => ({ x: +m.x, y: +m.y }));
  };
  const ownMarksText = (marks) => marks.map(m => m.x.toFixed(3) + ',' + m.y.toFixed(3)).join('; ');

  async function exportOracle() {
    await waitIdle();
    const dates = Array.from(new Set(savedEquipment.map(getEntryDate).filter(Boolean)));
    const df = chance(0.5) ? 'all' : (dates.length ? pick(dates) : 'all');
    // ground truth BEFORE the export (it stamps entries)
    const formNow = formSig();
    const formOk = !!(formNow.name && sources.length > 0);
    showExportDialog();
    const dsel = document.getElementById('exportDateFilter');
    if (![...dsel.options].some(o => o.value === df)) { closeExportDialog(); return 'export skipped (filter ' + df + ')'; }
    dsel.value = df; populateExportFacilityFilter(); document.getElementById('exportFacilityFilter').value = 'all';
    const filtered = getExportFilteredEntries();
    const isEdit = formOk && currentEntryId && savedEquipment.some(e => sameEntryId(e.id, currentEntryId));
    const formIncluded = formOk && (isEdit ? filtered.some(e => sameEntryId(e.id, currentEntryId)) || currentEntryPassesExportFilters() : currentEntryPassesExportFilters());
    const truth = new Map();
    for (const e of filtered) truth.set(String(e.id), { name: e.equipName || '', sources: JSON.parse(JSON.stringify(e.sources || [])), photos: Object.assign({}, e.photos || {}), room: e.equipRoom, building: e.equipBuilding });
    const formTruth = formIncluded ? { name: formNow.name, sources: JSON.parse(JSON.stringify(sources)), photos: Object.assign({}, photos), form: true, notes: (document.getElementById('equipNotes') || {}).value || '' } : null;
    const formIdBefore = currentEntryId ? String(currentEntryId) : null;
    if (formTruth && formIdBefore) truth.set(formIdBefore, formTruth);
    const stored = {};
    const fo = faultsOn; faultsOn = false;
    for (const [id, t] of truth) for (const k of Object.keys(t.photos)) {
      const r = t.photos[k];
      if (r && r.dbKey && !(r.dbKey in stored)) { const b = await loadPhotoBytes(r.dbKey, r.fileType || 'image/jpeg'); stored[r.dbKey] = b && b.bytes ? await sha(b.bytes) : null; }
    }
    faultsOn = fo;
    let captured = null;
    const realSave = window.saveOrShare;
    const realC = window.confirm;
    window.saveOrShare = async (blob, filename) => { captured = { blob, filename }; return { saved: true }; };
    window.confirm = () => true;
    try { await runCombinedExport(); if (!captured) await sleep(300); }
    catch (e) { viol('exception', 'export: ' + ((e && e.stack) || e)); }
    finally { window.saveOrShare = realSave; window.confirm = realC; closeExportDialog(); }
    if (!captured) { if (truth.size) info('export produced no file (' + truth.size + ' expected)'); return 'export (no file)'; }
    if (uploadTo) { try { await fetch(uploadTo + '/s' + seedNow + '_t' + stepNow + '_' + (df === 'all' ? 'all' : df) + '.zip', { method: 'POST', body: captured.blob }); } catch (e) { info('upload failed ' + e.message); } }
    const z = await JSZip.loadAsync(captured.blob);
    const files = {};
    for (const p of Object.keys(z.files)) if (!z.files[p].dir) files[p] = p.endsWith('.json') || p.endsWith('.csv') ? await z.files[p].async('string') : await z.files[p].async('uint8array');
    const ej = JSON.parse(files['entries.json'] || '{"entries":[]}');
    const man = JSON.parse(files['manifest.json'] || '{}');
    const unsafe = new Set((man.unsafe || []).map(u => String(u.entryId) + '|' + u.slot));
    const gotIds = new Set(ej.entries.map(e => String(e.id)));
    for (const id of truth.keys()) if (!gotIds.has(id)) viol('export-missing-entry', 'filter ' + df + ': entry ' + id + ' ("' + truth.get(id).name + '") not in entries.json');
    // A form never photographed has no entry id until the export mints one.
    if (formTruth && !formIdBefore && currentEntryId) truth.set(String(currentEntryId), formTruth);
    for (const id of gotIds) if (!truth.has(id)) viol('export-extra-entry', 'filter ' + df + ': unexpected entry ' + id);
    const expectedBlocks = [];
    let totalRows = 0;
    for (const je of ej.entries) {
      const t = truth.get(String(je.id)); if (!t) continue;
      if (je.sources.length !== t.sources.length) viol('export-source-count', '"' + t.name + '": json ' + je.sources.length + ' vs ' + t.sources.length);
      const rows = [];
      for (let i = 0; i < t.sources.length; i++) {
        const s = t.sources[i], js = je.sources[i] || {};
        const r = t.photos['source_' + i];
        const slotLabel = 'Source ' + (i + 1);
        const shouldShip = !!(r && r.dbKey && stored[r.dbKey] && !r.unsaved);
        const pf = js.photoFile || '';
        if (shouldShip && !pf && ![...unsafe].some(u => u.startsWith(String(je.id) + '|'))) viol('export-photo-dropped', '"' + t.name + '" source ' + (i + 1) + ' has stored bytes but no photoFile');
        if (pf) {
          const bytes = files[pf];
          if (!bytes) viol('export-photo-file-missing', pf);
          else if (r && r.dbKey && stored[r.dbKey] && (await sha(bytes)) !== stored[r.dbKey]) viol('export-photo-wrong-bytes', '"' + t.name + '" source ' + (i + 1) + ' file ' + pf + ' is not the bytes of its reference');
          if (!r || !r.dbKey) viol('export-photo-without-ref', '"' + t.name + '" source ' + (i + 1) + ' → ' + pf);
        }
        const wantMarks = pf && r ? ownMarks(r, s) : [];
        if (JSON.stringify((js.photoMarks || []).map(m => [m.x, m.y])) !== JSON.stringify(wantMarks.map(m => [m.x, m.y]))) viol('export-marks-json', '"' + t.name + '" source ' + (i + 1) + ': ' + JSON.stringify(js.photoMarks) + ' vs ' + JSON.stringify(wantMarks));
        if ((js.valveState || 'normal') !== (s.valveState || 'normal')) viol('export-valvestate-json', '"' + t.name + '" source ' + (i + 1));
        // build 94: col 7 = the source's detail ONLY; the link has its own col 13
        const linkTxt = s.linkedTo ? (s.linkedTo.equipName || '(unnamed)') + ' / Source #' + ((s.linkedTo.sourceIndex || 0) + 1) + (s.linkedTo.sourceLabel ? ' (' + s.linkedTo.sourceLabel + ')' : '') : '';
        if (i < 10) rows.push([String(s.energySource || '').trim() || 'Unknown', s.deviceType || '', s.deviceId || '', String(s.quantity || ''), s.location || '', pf.replace(/^photos\//, ''), s.detail || '', '', s.verification || '', '', VS_TEXT[s.valveState] || '', pf ? ownMarksText(wantMarks) : '', linkTxt]);
      }
      totalRows += t.sources.length;
      expectedBlocks.push({ name: je.equipName || '', rows });
    }
    // XLSX: every expected block, cell by cell (cols 1-6, 9, 11, 12)
    const sheetPaths = Object.keys(files).filter(p => /^info_sheets\/Information_Sheet_.*\.xlsx$/.test(p));
    const gotBlocks = [];
    for (const p of sheetPaths) {
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(files[p]);
      const ws = wb.worksheets[0];
      let cur = null, prevHeader = false, srcLabel = false;
      ws.eachRow({ includeEmpty: false }, row => {
        const a = String(row.getCell(1).value == null ? '' : row.getCell(1).value);
        if (prevHeader) { cur = { name: a, rows: [], sheet: p }; gotBlocks.push(cur); }
        prevHeader = a === 'Equipment ID/Name';
        if (srcLabel && cur) {
          const vals = []; for (let c = 1; c <= 13; c++) { const v = row.getCell(c).value; vals.push(v == null ? '' : String(v)); }
          if (vals.some(Boolean)) cur.rows.push(vals);
        }
        srcLabel = /^Energy Source #\d+$/.test(a);
      });
    }
    const cmpCols = [0, 1, 2, 3, 4, 5, 6, 8, 10, 11, 12];
    const sigOf = (b) => b.name + ' :: ' + b.rows.map(r => cmpCols.map(c => r[c]).join('^')).join(' ~ ');
    const want = expectedBlocks.map(sigOf).sort(), got = gotBlocks.map(sigOf).sort();
    const missingB = want.filter(w => !got.includes(w)), extraB = got.filter(g => !want.includes(g));
    if (missingB.length || extraB.length) viol('export-xlsx-mismatch', 'expected-not-found: ' + missingB.slice(0, 2).join(' || ') + ' ;; found-not-expected: ' + extraB.slice(0, 2).join(' || '));
    // Which sheet each unit is on: its survey date (the filtered day for a
    // date-filtered export). The open form is TODAY's work — the export
    // filter treats it as today — so it belongs on today's sheet.
    {
      const today = localDateStr(new Date());
      const fixed = /^\d{4}-\d{2}-\d{2}$/.test(df) ? df : null;
      const sheetFor = (je) => {
        const isForm = !!(truth.get(String(je.id)) || {}).form && !savedEquipment.some(x => sameEntryId(x.id, je.id));
        const d = fixed || getEntryDate(je) || (isForm ? today : null);
        return { want: d ? 'Information_Sheet_' + getDateStamp(exportDateFrom(d)) + '.xlsx' : 'Information_Sheet_undated.xlsx', isForm };
      };
      for (const b of gotBlocks) {
        const cands = ej.entries.filter(e => (e.equipName || '') === b.name).map(sheetFor);
        if (cands.length && !cands.some(c => b.sheet.endsWith(c.want))) {
          const c = cands.find(x => x.isForm) || cands[0];
          viol(c.isForm ? 'export-open-form-sheet' : 'export-sheet-date', '"' + b.name + '" belongs on ' + c.want + ' but is in ' + b.sheet + (c.isForm ? ' (the unsaved open form)' : ''));
        }
      }
    }
    // CSV
    const csvPath = Object.keys(files).find(p => /\.csv$/.test(p));
    // (build 94 quotes line breaks — the b92-review "known" skip is gone)
    if (csvPath) {
      const rowsCsv = parseCsv(files[csvPath]).filter(r => r.length > 1);
      const n = rowsCsv.length - 1;
      if (n !== totalRows) viol('export-csv-rowcount', 'CSV has ' + n + ' source rows, expected ' + totalRows);
      const hdr = rowsCsv[0] || [];
      if (rowsCsv.some(r => r.length !== hdr.length)) viol('export-csv-ragged', 'row widths ' + Array.from(new Set(rowsCsv.map(r => r.length))).join(','));
    }
    // stamping: an entry whose expected photo didn't ship must not be 'exported'
    for (const je of ej.entries) {
      const e = savedEquipment.find(x => sameEntryId(x.id, je.id)); const t = truth.get(String(je.id));
      if (!e || !t || t.form) continue;
      const dropped = t.sources.some((s, i) => { const r = t.photos['source_' + i]; return r && r.dbKey && stored[r.dbKey] && !(je.sources[i] || {}).photoFile; });
      if (dropped && entryExportState(e) === 'exported') viol('export-stamped-despite-missing-photo', '"' + e.equipName + '"');
    }
    return 'export ' + df + ' (' + ej.entries.length + ' entries, ' + sheetPaths.length + ' sheet' + (sheetPaths.length === 1 ? '' : 's') + ')';
  }

  // ---------- relaunch oracle --------------------------------------------------------------
  async function relaunchOracle() {
    await waitIdle();
    await sleep(250);   // debounced autosaves
    const fo = faultsOn; faultsOn = false;   // the last autosave + snapshot: fault-free
    autoSaveCurrent(); await sleep(300);
    faultsOn = fo;
    const before = { entries: savedEquipment.map(entrySig).sort((a, b) => a.id.localeCompare(b.id)), form: formSig() };
    // a fresh launch: blank form + empty memory, loadAll decides — and none of
    // this session's memory of deletes / re-saves or of the store's stamp
    // (build 96: the overlay hid a delete a real relaunch had lost)
    try { if (typeof resetTombstoneMemory === 'function') resetTombstoneMemory(); } catch (e) {}
    try { if (typeof _entryStoreAt !== 'undefined') _entryStoreAt = null; } catch (e) {}
    _bootWipSettled = false;
    beginNewFormSession(); editingEntry = null; currentEntryId = null; savedEquipment = []; sources = []; photos = {}; miscPhotos = [];
    try { clearSketchState(); } catch (e) {}
    ['equipName', 'equipRoom', 'equipNotes', 'equipLotoId'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('equipType').value = ''; filterTemplateDropdown(''); document.getElementById('equipTemplate').value = '';
    if (chance(0.5)) autoSaveCurrent();          // backgrounded during the load window
    try { await loadAll(); } catch (e) { viol('exception', 'loadAll: ' + ((e && e.stack) || e)); }
    _bootWipSettled = true;
    renderSavedPanel(); renderSources();
    await sleep(60);
    const after = { entries: savedEquipment.map(entrySig).sort((a, b) => a.id.localeCompare(b.id)), form: formSig() };
    const b = new Map(before.entries.map(e => [e.id, JSON.stringify(e)])), a = new Map(after.entries.map(e => [e.id, JSON.stringify(e)]));
    const pre = faultP > 0 ? (warnedSinceRelaunch ? 'warned:' : 'SILENT:') : '';
    const bad = (inv, d) => { if (pre === 'warned:') info(inv + ' (after a warning) ' + d.slice(0, 160)); else viol(pre + inv, d); };
    for (const [id, s] of b) {
      if (!a.has(id)) bad('relaunch-lost-entry', JSON.parse(s).name + ' (' + id + ')');
      else if (a.get(id) !== s) bad('relaunch-changed-entry', 'before ' + s + ' || after ' + a.get(id));
    }
    for (const id of a.keys()) if (!b.has(id)) bad('relaunch-added-entry', a.get(id));
    if (formHasContent(before.form) && JSON.stringify(before.form) !== JSON.stringify(after.form)) bad('relaunch-changed-form', 'before ' + JSON.stringify(before.form) + ' || after ' + JSON.stringify(after.form));
    warnedSinceRelaunch = false;
    document.querySelectorAll('.container > div[style*="rgba(200,40,40"], .sticky-banner').forEach(x => x.remove());   // load banners (b95: .sticky-banner)
    return 'relaunch';
  }

  // ---------- actions ----------------------------------------------------------------------
  const srcIdx = () => sources.length ? randInt(0, sources.length - 1) : -1;
  const savedIdx = () => savedEquipment.length ? randInt(0, savedEquipment.length - 1) : -1;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };

  const ACTIONS = [
    ['setName', 4, () => true, async () => { const n = pick(NAMES); setVal('equipName', n); return 'name=' + JSON.stringify(n); }],
    ['setRoom', 2, () => true, async () => { const r = pick(ROOMS); setVal('equipRoom', r); setBuilding(pick(BUILDINGS)); return 'room=' + r; }],
    ['setNotes', 1, () => true, async () => { const n = pick(NOTES); const el = document.getElementById('equipNotes'); el.value = n; el.dispatchEvent(new Event('input', { bubbles: true })); autoSaveCurrent(); return 'notes'; }],
    ['setType', 4, () => true, async () => { const t = pick(DATA.equipmentTypes); document.getElementById('equipType').value = t; handleEquipTypeChange(); return 'type=' + t; }],
    ['setTemplate', 4, () => true, async () => {
      const opts = Array.from(document.getElementById('equipTemplate').options).map(o => o.value).filter(v => v && v !== '** New Template **');
      if (!opts.length) return 'template (none)';
      const t = pick(opts); document.getElementById('equipTemplate').value = t; handleTemplateChange(); return 'template=' + t;
    }],
    ['addSource', 6, () => sources.length < 12, async () => { addSource(); return 'addSource'; }],
    ['editEnergy', 6, () => sources.length > 0, async () => { const i = srcIdx(); const v = chance(0.1) ? '** Custom Energy **' : pick(DATA.energySources); handleEnergySourceChange(i, v); if (v === '** Custom Energy **') updateSourceCustomField(i, 'energySource', pick(['Hydraulic Oil', ''])); return 'energy[' + i + ']=' + v; }],
    ['editDevice', 4, () => sources.length > 0, async () => { const i = srcIdx(); const v = pick(DATA.deviceTypes); handleDeviceTypeChange(i, v); return 'device[' + i + ']=' + v; }],
    ['editField', 7, () => sources.length > 0, async () => {
      const i = srcIdx(); const f = pick(['quantity', 'location', 'verification', 'valveState', 'deviceId', 'detail', 'duplicate']);
      const v = f === 'quantity' ? randInt(1, 3) : f === 'location' ? pick(DATA.locations) : f === 'verification' ? pick(DATA.verificationTypes)
        : f === 'valveState' ? pick(['normal', 'normally_closed']) : f === 'deviceId' ? pick(DEVICE_IDS) : f === 'detail' ? pick(['', 'L', 'R', 'LR']) : pick(['No', 'Yes']);
      updateSource(i, f, v); if (f !== 'energySource') { renderSources(); autoSaveCurrent(); } return f + '[' + i + ']=' + JSON.stringify(v);
    }],
    ['removeSource', 2, () => sources.length > 0, async () => { const i = srcIdx(); removeSource(i); return 'removeSource ' + i; }],
    ['moveSource', 2, () => sources.length > 1, async () => { const i = srcIdx(); const d = pick([-1, 1]); moveSource(i, d); return 'moveSource ' + i + ' ' + d; }],
    ['dupSource', 2, () => sources.length > 0 && sources.length < 12, async () => { const i = srcIdx(); duplicateSource(i); return 'dupSource ' + i; }],
    ['splitSource', 2, () => sources.some(s => (parseInt(s.quantity, 10) || 1) >= 2), async () => { const idx = sources.map((s, i) => (parseInt(s.quantity, 10) || 1) >= 2 ? i : -1).filter(i => i >= 0); const i = pick(idx); splitSource(i); return 'split ' + i; }],
    ['togglePhoto', 1, () => sources.length > 0, async () => { const i = srcIdx(); togglePhotoSlot(i); return 'togglePhoto ' + i; }],
    ['capture', 14, () => true, async () => {
      const slots = ['equip_main', 'equip_dataplate', 'equip_ee'].concat(sources.map((s, i) => 'source_' + i));
      const slot = pick(slots.concat(sources.map((s, i) => 'source_' + i)));
      const f = await makePhoto();
      handlePhoto({ files: [f] }, slot);
      if (chance(0.75)) await waitIdle();
      return 'capture ' + slot;
    }],
    ['reuse', 2, () => sources.length > 0, async () => {
      const cands = collectTodaysPhotos(); if (!cands.length) return 'reuse (none)';
      window._reuseCandidates = cands;   // eslint-disable-line
      try { _reuseCandidates = cands; } catch (e) {}
      const slot = 'source_' + srcIdx(); const i = randInt(0, cands.length - 1);
      await reusePhotoInto(slot, i); return 'reuse ' + slot + ' ← #' + i;
    }],
    ['misc', 2, () => miscPhotos.length < 10, async () => { const f = await makePhoto(); handleMiscPhoto({ files: [f] }); if (chance(0.8)) await waitIdle(); return 'misc+'; }],
    ['miscRemove', 1, () => miscPhotos.length > 0, async () => { const i = randInt(0, miscPhotos.length - 1); removeMiscPhoto(i); return 'misc- ' + i; }],
    ['mark', 6, () => sources.some((s, i) => photos['source_' + i] && photos['source_' + i].dbKey), async () => {
      const idx = sources.map((s, i) => photos['source_' + i] && photos['source_' + i].dbKey ? i : -1).filter(i => i >= 0);
      const i = pick(idx); openValveMarkDialog('source_' + i); await doMarkDialog(); return 'mark source_' + i;
    }],
    ['link', 2, () => sources.length > 0 && savedEquipment.some(e => (e.sources || []).length), async () => {
      const es = savedEquipment.map((e, i) => (e.sources || []).length ? i : -1).filter(i => i >= 0);
      const ei = pick(es); const si = randInt(0, savedEquipment[ei].sources.length - 1); const i = srcIdx();
      pendingLinkSourceIndex = i; applyLink(ei, si); return 'link ' + i + ' → ' + ei + '/' + si;
    }],
    ['unlink', 1, () => sources.some(s => s.linkedTo), async () => { const i = sources.findIndex(s => s.linkedTo); unlinkSource(i); return 'unlink ' + i; }],
    ['copySource', 1, () => sources.length > 0 && savedEquipment.some(e => (e.sources || []).length), async () => {
      const es = savedEquipment.map((e, i) => (e.sources || []).length ? i : -1).filter(i => i >= 0);
      const ei = pick(es); const si = randInt(0, savedEquipment[ei].sources.length - 1); const i = srcIdx();
      showCopySourceDialog(i); applyCopySource(ei, si); return 'copySource ' + ei + '/' + si + ' → ' + i;
    }],
    ['saveNew', 7, () => true, async () => { saveAndNew(); await drainOverlays(); return 'saveAndNew'; }],
    ['edit', 4, () => savedEquipment.length > 0, async () => { const i = savedIdx(); editSaved(i); return 'edit ' + i; }],
    ['duplicate', 2, () => savedEquipment.length > 0, async () => {
      const i = savedIdx(); const wp = chance(0.5);
      const p = executeDuplicate(i, wp);
      if (chance(0.85)) await p;
      return 'duplicate ' + i + (wp ? ' +photos' : '');
    }],
    ['delete', 2, () => savedEquipment.length > 0, async () => { const i = savedIdx(); deleteSaved(i); return 'delete ' + i; }],
    ['bulkDelete', 1, () => savedEquipment.length > 1, async () => {
      showBulkDeleteDialog();
      const dsel = document.getElementById('bulkDeleteDateFilter');
      const opts = [...dsel.options].map(o => o.value); dsel.value = pick(opts); populateBulkDeleteFacility();
      document.getElementById('bulkDeleteConfirmInput').value = 'DELETE'; updateBulkDeleteSummary();
      const n = getBulkDeleteTargets().length; confirmBulkDelete(); return 'bulkDelete ' + dsel.value + ' (' + n + ')';
    }],
    ['export', 3, () => savedEquipment.length > 0 || sources.length > 0, async () => exportOracle()],
    ['relaunch', 3, () => true, async () => relaunchOracle()],
    ['background', 2, () => true, async () => { document.dispatchEvent(new Event('visibilitychange')); autoSaveCurrent(); return 'background'; }],
    ['facility', 1, () => true, async () => { const c = pick(['Atlanta', 'Marion', 'Atlanta - Fort McPherson']); setHospitalCode(c); updateFacilityBadge(); return 'facility=' + c; }],
    ['simpleVerif', 1, () => true, async () => { setSimpleVerif(!simpleVerifEnabled()); return 'simpleVerif toggled'; }],
    ['sketch', 2, () => true, async () => {
      setSketchPrefForFacility(getHospitalCode(), true); applySketchVisibility(); setSketchSectionExpanded(true);
      const cv = document.getElementById('sketchCanvas'); const r = cv && cv.getBoundingClientRect();
      if (!r || !r.width) return 'sketch (no canvas)';
      const what = R();
      if (what < 0.6) {
        const ev = (type, fx, fy) => ({ type, pointerId: 1, clientX: r.left + fx * r.width, clientY: r.top + fy * r.height, preventDefault() {}, stopPropagation() {} });
        const cap = cv.setPointerCapture; cv.setPointerCapture = () => {};
        try { setSketchTool(chance(0.8) ? 'pen' : 'eraser'); const x0 = R(), y0 = R(); sketchPointerDown(ev('pointerdown', x0, y0)); sketchPointerMove(ev('pointermove', R(), R())); sketchPointerUp(ev('pointerup', R(), R())); }
        finally { cv.setPointerCapture = cap; }
        return 'sketch stroke';
      }
      if (what < 0.8) { sketchUndo(); return 'sketch undo'; }
      clearSketch(); return 'sketch clear';
    }],
  ];

  function pickAction() {
    const avail = ACTIONS.filter(a => { try { return a[2](); } catch (e) { return false; } });
    const tot = avail.reduce((s, a) => s + a[1], 0);
    let x = R() * tot;
    for (const a of avail) { x -= a[1]; if (x <= 0) return a; }
    return avail[avail.length - 1];
  }

  // ---------- reset ----------------------------------------------------------------------------
  async function resetAll() {
    await waitIdle();
    editingEntry = null; currentEntryId = null;
    if (typeof _entryStoreUnread !== 'undefined') _entryStoreUnread = false;
    try { _wipUnread = false; } catch (e) {}
    beginNewFormSession();
    savedEquipment = []; photos = {}; miscPhotos = []; sources = [];
    try { clearSketchState(); } catch (e) {}
    document.querySelectorAll('.dialog-overlay').forEach(o => { if (['exportOverlay', 'bulkDeleteOverlay', 'settingsOverlay'].includes(o.id)) o.style.display = 'none'; else o.remove(); });
    document.getElementById('equipType').value = ''; filterTemplateDropdown(''); document.getElementById('equipTemplate').value = '';
    for (const k of ['loto_seq_used', 'loto_saved', 'loto_saved_at', 'loto_saved_snapshot', 'loto_saved_snapshot_at', 'loto_deleted_ids', 'loto_restored_ids',
      'loto_current', 'loto_current_alt', 'loto_entry_count', 'photoSeqNext', 'loto_sketch_prefs', 'loto_wip_superseded']) { try { localStorage.removeItem(k); } catch (e) {} }
    try { await deleteMetadata('current_wip_alt'); } catch (e) {}
    try { await deleteMetadata('deleted_ids'); } catch (e) {}
    try { await deleteMetadata('restored_ids'); } catch (e) {}
    try { await saveMetadata('photo_hash_index', {}); } catch (e) {}
    // build 95: saveAll merges a list another writer stored since this tab's last read — the reset is not one
    try { if (typeof _entryStoreAt !== 'undefined') _entryStoreAt = (await getMetadata('saved_equipment_at')) || null; } catch (e) {}
    try { if (typeof resetTombstoneMemory === 'function') resetTombstoneMemory(); } catch (e) {}
    saveAll();
    const keys = await getAllPhotoKeys();
    await Promise.all(keys.map(k => deletePhotoFromDB(k)));
    if (typeof fsPlugin === 'function' && fsPlugin()) {
      try { const r = await fsPlugin().readdir({ path: 'loto_photos', directory: 'DATA' }); for (const f of ((r && r.files) || [])) { const n = typeof f === 'string' ? f : f.name; try { await fsPlugin().deleteFile({ path: 'loto_photos/' + n, directory: 'DATA' }); } catch (e) {} } } catch (e) {}
    }
    const ls = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('photo_full_') === 0) ls.push(k); }
    ls.forEach(k => localStorage.removeItem(k));
    clearForm(false);
    renderSavedPanel(); updateHeaderBadge();
    await sleep(60);
  }

  // ---------- runner -----------------------------------------------------------------------------
  window.runFuzz = async function (opts) {
    opts = opts || {};
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    if (native) {
      // Inside the app: ONLY on the iOS Simulator (its container lives under
      // CoreSimulator on the Mac), ONLY on an empty install — like the suite.
      if (!opts.iosSimulator) throw new Error('REFUSED: never inside the app');
      let simPath = '';
      try { const r = await window.Capacitor.Plugins.Filesystem.getUri({ path: 'loto_photos', directory: 'DATA' }); simPath = decodeURIComponent(String((r && r.uri) || '')); } catch (e) {}
      if (!/\/Library\/Developer\/CoreSimulator\/Devices\//.test(simPath)) throw new Error('REFUSED: not the iOS Simulator');
      if (savedEquipment.length) throw new Error('REFUSED: this Simulator install holds entries');
    } else {
      if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) throw new Error('REFUSED: localhost only');
      if (savedEquipment.length && !opts.iUnderstandThisErasesAllData) throw new Error('REFUSED: this profile holds saved entries');
    }
    const seeds = opts.seeds || [1];
    const steps = opts.steps || 40;
    violations = []; infos = []; seenSig.clear();
    window.__FUZZ_ARMED = true;
    installDialogs();
    faultP = +opts.faults || 0;
    uploadTo = opts.uploadTo || null;
    if (faultP > 0) installFaults();
    const t0 = Date.now();
    let actionsRun = 0;
    const seedTraces = [];
    const actionCounts = {};
    try {
      for (const seed of seeds) {
        seedNow = seed; R = mulberry32(seed); trace = []; warned = false; warnedSinceRelaunch = false; pageErrors = [];
        faultsOn = false;
        await resetAll();
        faultsOn = faultP > 0;
        for (let s = 1; s <= steps; s++) {
          stepNow = s;
          const a = pickAction();
          let label = a[0];
          try { label = (await a[3]()) || a[0]; }
          catch (e) { viol('exception', a[0] + ': ' + ((e && e.stack) || e)); }
          trace.push(s + '. ' + label);
          actionsRun++;
          actionCounts[a[0]] = (actionCounts[a[0]] || 0) + 1;
          await drainOverlays();
          checkCheap();
          if (s % 8 === 0) await checkDeep('periodic');
        }
        await drainOverlays();
        faultsOn = false;   // the end-of-sequence checks: storage healthy again
        await checkDeep('end');
        if (savedEquipment.length || sources.length) { trace.push('final export'); await exportOracle(); }
        trace.push('final relaunch'); await relaunchOracle();
        checkCheap();
        await checkDeep('after-relaunch');
        seedTraces.push({ seed, trace: trace.slice(-120) });
        if (opts.onSeed) try { opts.onSeed(seed, violations.length); } catch (e) {}
      }
    } finally {
      restoreDialogs();
      faultsOn = false; if (faultP > 0) removeFaults();
      window.__FUZZ_ARMED = false;
    }
    const report = { seeds: seeds.length, steps, actions: actionsRun, secs: Math.round((Date.now() - t0) / 1000), violations, infos: infos.slice(0, 40), actionCounts, seedTraces: opts.keepTraces ? seedTraces : seedTraces.slice(-2) };
    window.__FUZZ_REPORT = report;
    return report;
  };
  console.log('[fuzz] harness loaded — call runFuzz({seeds:[1,2,3], steps:40})');
})();
