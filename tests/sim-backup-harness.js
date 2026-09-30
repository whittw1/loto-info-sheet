// ============================================================================
// iOS SIMULATOR HARNESS — SharePoint live backup, native path (build 101)
// ----------------------------------------------------------------------------
// Loaded ONLY into a throwaway Simulator build (tests/fuzz/run-sim-backup.sh
// assembles it outside the project) — NEVER into the real app bundle.
// Does nothing unless the trigger file Documents/RUN_BACKUP_E2E exists; then it
// refuses unless the app's container is under CoreSimulator and the install is
// empty. It points the backup at the local stand-in (backup_e2e_server.mjs on
// the Mac), gives it a device pass, saves a unit with a photo, runs a backup
// pass and sends a 12 MB file in 5 MiB pieces — all through the app's own
// native HTTP (CapacitorHttp), the one path a browser test can't exercise.
// The runner then reads what the stand-in's "SharePoint" holds.
// Results: Documents/loto_backup_e2e.json
// ============================================================================
(function () {
  'use strict';
  const FS = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function write(obj) {
    try { await FS().writeFile({ path: 'loto_backup_e2e.json', data: JSON.stringify(obj, null, 2), directory: 'DATA', encoding: 'utf8', recursive: true }); }
    catch (e) { console.error('[sim-backup] could not write results', e); }
  }
  async function main() {
    const fs = FS();
    if (!fs) return;
    let opts = null;
    try { opts = JSON.parse((await fs.readFile({ path: 'RUN_BACKUP_E2E', directory: 'DATA', encoding: 'utf8' })).data || '{}'); }
    catch (e) { return; }                                   // no trigger: inert
    const out = { steps: [] };
    const step = (what, value) => { out.steps.push({ what, value }); };
    try {
      const uri = decodeURIComponent(String(((await fs.getUri({ path: 'x', directory: 'DATA' })) || {}).uri || ''));
      if (!/\/Library\/Developer\/CoreSimulator\/Devices\//.test(uri)) throw new Error('REFUSED: not the iOS Simulator');
      for (let i = 0; i < 200 && !(typeof _bootWipSettled !== 'undefined' && _bootWipSettled); i++) await sleep(100);
      if (savedEquipment.length) throw new Error('REFUSED: this install holds entries');
      window.__backupTestHost = opts.host;
      Object.assign(backupCfg, { on: true, user: opts.user, pass: opts.pass, passExpires: opts.expires });
      step('native', backupNative());
      step('CapacitorHttp', !!(window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp));
      step('Browser plugin', !!(window.Capacitor.Plugins && window.Capacitor.Plugins.Browser));
      step('App plugin', !!(window.Capacitor.Plugins && window.Capacitor.Plugins.App));
      // the endpoint answers the device pass
      const g = await backupTransport.api('GET', '/api/upload');
      step('GET /api/upload', { status: g.status, via: g.body && g.body.via, signedInAs: g.body && g.body.signedInAs });
      // a unit with a photo, through the app's own capture and Save & New
      window.confirm = () => true; window.alert = () => {};
      setHospitalCode('Atlanta');
      document.getElementById('equipName').value = 'SIM E2E Pump';
      addSource(); Object.assign(sources[sources.length - 1], { energySource: 'Electrical 480V', deviceType: 'Breaker', quantity: 1, verification: 'Controls', location: 'Panel P1' });
      renderSources();
      const c = document.createElement('canvas'); c.width = 800; c.height = 600;
      const x = c.getContext('2d'); for (let i = 0; i < 400; i++) { x.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; x.fillRect(Math.random() * 760, Math.random() * 560, 40, 40); }
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
      handlePhoto({ files: [new File([blob], 'sim.jpg', { type: 'image/jpeg' })] }, 'equip_main');
      for (let i = 0; i < 200 && !(photos.equip_main && photos.equip_main.dbKey && photos.equip_main.unsaved === false); i++) await sleep(100);
      performSaveAndNew();
      await sleep(1000);
      const e = savedEquipment.find(u => u.equipName === 'SIM E2E Pump');
      out.unit = { key: e.photos.equip_main.dbKey, sha: e.photos.equip_main.sha256, day: getEntryDate(e), tag: getCollectorTag(), name: backupPhotoName(e.photos.equip_main.dbKey) };
      await drainBackup();
      for (let i = 0; i < 300 && _backupBusy; i++) await sleep(100);
      step('pass', { state: _backupState, error: _backupLastError, sent: _backupSent.size, badge: document.getElementById('backupBadge').textContent });
      // a 12 MB file in 5 MiB pieces over native HTTP (dataType "file")
      const big = new Uint8Array(12 * 1048576); for (let i = 0; i < big.length; i += 4093) big[i] = (i * 31) & 255;
      try {
        const r = await backupUploadBig(new Blob([big]), 'Atlanta/' + out.unit.day, 'export/sim-big.bin');
        step('big upload', { ok: true, hashChecked: r.hashChecked, quickXorHash: r.quickXorHash, size: big.length });
      } catch (err) { step('big upload', { ok: false, error: err.message }); }
      out.ok = true;
    } catch (e) {
      out.error = String(e && e.message || e);
    }
    await write(out);
  }
  if (document.readyState === 'complete') main(); else window.addEventListener('load', main);
})();
