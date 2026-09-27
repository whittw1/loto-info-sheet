// Loaded ONLY into a throwaway Simulator build (tests/fuzz/run-sim-fuzz.sh).
// Inert without the trigger file Documents/RUN_FUZZ.
(function () {
  'use strict';
  const FS = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
  async function main() {
    const fs = FS(); if (!fs) return;
    let opts;
    try { opts = JSON.parse((await fs.readFile({ path: 'RUN_FUZZ', directory: 'DATA', encoding: 'utf8' })).data || '{}'); } catch (e) { return; }
    try { await fs.deleteFile({ path: 'RUN_FUZZ', directory: 'DATA' }); } catch (e) {}
    await new Promise(r => setTimeout(r, 5000));
    let out;
    let done = 0;
    const onSeed = (seed, nViol) => { done++; fs.writeFile({ path: 'loto_fuzz_progress.json', data: JSON.stringify({ at: new Date().toISOString(), done, seed, nViol }), directory: 'DATA', encoding: 'utf8' }).catch(() => {}); };
    try { out = await window.runFuzz(Object.assign({}, opts, { iosSimulator: true, onSeed })); }
    catch (e) { out = { error: String((e && e.stack) || e) }; }
    await fs.writeFile({ path: 'loto_fuzz_results.json', data: JSON.stringify(out), directory: 'DATA', encoding: 'utf8', recursive: true });
  }
  if (document.readyState === 'complete') main(); else window.addEventListener('load', main);
})();
