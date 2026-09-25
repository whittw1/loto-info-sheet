// ============================================================================
// iOS SIMULATOR HARNESS for tests/photo-regression.js
// ----------------------------------------------------------------------------
// Loaded ONLY into a throwaway Simulator build assembled outside the project
// (a copy of ios/ with this file and the suite added to its web bundle) —
// NEVER into the real app bundle, which `npm run sync` builds from www/.
//
// Does nothing unless the trigger file Documents/RUN_PHOTO_SUITE exists in the
// app's container (created from the Mac with `xcrun simctl get_app_container`).
// The suite itself then refuses unless it is inside the iOS Simulator (its
// container path) on a fresh install with no entries and no photo files.
// Results: Documents/loto_test_results.json + a panel at the bottom of the app.
// ============================================================================
(function () {
  'use strict';
  const FS = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;

  function show(text, color) {
    let el = document.getElementById('simSuiteResults');
    if (!el) {
      el = document.createElement('pre');
      el.id = 'simSuiteResults';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;z-index:99999;margin:0;padding:10px;' +
        'font:12px/1.35 monospace;background:#111;color:#eee;white-space:pre-wrap;border-top:4px solid #888;';
      document.body.appendChild(el);
    }
    el.style.borderTopColor = color || '#888';
    el.textContent = text;
  }

  async function writeResult(obj) {
    try {
      await FS().writeFile({ path: 'loto_test_results.json', data: JSON.stringify(obj, null, 2), directory: 'DATA', encoding: 'utf8', recursive: true });
    } catch (e) { console.error('[sim-harness] could not write results', e); }
  }

  async function main() {
    const fs = FS();
    if (!fs) return;
    let opts = {};
    try {
      const r = await fs.readFile({ path: 'RUN_PHOTO_SUITE', directory: 'DATA', encoding: 'utf8' });
      try { opts = JSON.parse(r.data || '{}') || {}; } catch (e) { opts = {}; }
    } catch (e) { return; }                                   // no trigger → an ordinary app launch
    try { await fs.deleteFile({ path: 'RUN_PHOTO_SUITE', directory: 'DATA' }); } catch (e) {}

    await new Promise(r => setTimeout(r, 5000));              // let init() and the startup photo chain settle
    if (typeof window.runPhotoRegressionSuite !== 'function') {
      await writeResult({ at: new Date().toISOString(), error: 'suite not loaded' });
      show('SUITE NOT LOADED', '#c82828');
      return;
    }
    show('Photo regression suite running in the iOS Simulator (real native filesystem)…', '#e0a44a');
    const t0 = Date.now();
    try {
      const R = await window.runPhotoRegressionSuite(Object.assign({}, opts, { iosSimulator: true }));
      const secs = Math.round((Date.now() - t0) / 1000);
      await writeResult(Object.assign({ at: new Date().toISOString(), secs, userAgent: navigator.userAgent }, R));
      show('SUITE — ' + R.mode + ': ' + R.pass + ' pass / ' + R.fail + ' fail in ' + secs + 's\n' +
        R.results.map(r => (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.pass ? '' : '  ::  ' + r.detail)).join('\n'),
        R.fail ? '#c82828' : '#4ab86a');
    } catch (e) {
      await writeResult({ at: new Date().toISOString(), error: String((e && e.stack) || e) });
      show('SUITE ERROR: ' + ((e && e.message) || e), '#c82828');
    }
  }

  if (document.readyState === 'complete') main();
  else window.addEventListener('load', main);
})();
