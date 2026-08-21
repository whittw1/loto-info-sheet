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
  async function resetAppState() {
    editingEntry = null;
    savedEquipment = [];
    photos = {};
    miscPhotos = [];
    sources = [];
    saveAll();
    // wipe photo stores (IDB + localStorage fallback)
    const keys = await getAllPhotoKeys();
    await Promise.all(keys.map(k => deletePhotoFromDB(k)));
    const lsKill = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('photo_full_') === 0) lsKill.push(k);
    }
    lsKill.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('photoSeqNext');
    document.getElementById('equipName').value = '';
    document.getElementById('equipRoom').value = '';
    document.getElementById('equipNotes').value = '';
    renderSources();
    renderSavedPanel();
  }

  function fillForm(name, opts) {
    opts = opts || {};
    document.getElementById('equipType').value = '';
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
    return photos[slotId];
  }

  function saveEntry() {
    performSaveAndNew();
    return savedEquipment[savedEquipment.length - 1];
  }

  // ---------- export driver -------------------------------------------------
  const realSaveOrShare = window.saveOrShare;
  const realConfirm = window.confirm;

  async function runExport(opts) {
    opts = opts || {};
    let captured = null;
    const confirms = [];
    window.saveOrShare = async (blob, filename) => { captured = { blob, filename }; return { saved: true }; };
    window.confirm = (msg) => { confirms.push(String(msg)); return ('confirmResponse' in opts) ? opts.confirmResponse : false; };
    const realAlert = window.alert;
    window.alert = (msg) => { confirms.push('[ALERT] ' + String(msg)); };
    try {
      showExportDialog();
      const dsel = document.getElementById('exportDateFilter');
      dsel.value = 'all';
      populateExportFacilityFilter();
      document.getElementById('exportFacilityFilter').value = 'all';
      document.getElementById('photoSeqStart').value = '1';
      await runCombinedExport();
      // export has async tail work; give the zip a moment if not yet captured
      if (!captured) await sleep(300);
    } finally {
      window.saveOrShare = realSaveOrShare;
      window.confirm = realConfirm;
      window.alert = realAlert;
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

  // ---------- runner --------------------------------------------------------
  window.runPhotoRegressionSuite = async function (opts) {
    opts = opts || {};
    results.length = 0;
    window.__PHOTO_TEST_RESULTS = null;
    const tests = [t1_sameNameDistinctExports, t2_reExportStability, t3_duplicateEntry,
      t4_crossLinkGate, t4b_hashGateHardAbort, t5_legacyKeyNotSilent, t6_keyFormat, t8_retakeThenDiscard, t9_removeMiscThenDiscard];
    if (!opts.skipScale) tests.push(t7_scale);
    for (const t of tests) {
      try { await t(); }
      catch (e) { record(t.name, false, 'EXCEPTION: ' + (e && e.message)); }
    }
    await resetAppState();
    const summary = {
      pass: results.filter(r => r.pass).length,
      fail: results.filter(r => !r.pass).length,
      results: results.slice()
    };
    window.__PHOTO_TEST_RESULTS = summary;
    log('SUITE DONE:', summary.pass + ' pass / ' + summary.fail + ' fail');
    return summary;
  };

  log('photo-regression suite loaded — call runPhotoRegressionSuite()');
})();
