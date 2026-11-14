const sleep = ms => new Promise(r => setTimeout(r, ms));
let _n = 0;
function makePhoto() {
  const n = ++_n;
  return new Promise(resolve => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 150;
    const x = c.getContext('2d'); x.fillStyle = 'hsl(' + ((n * 47) % 360) + ',60%,45%)'; x.fillRect(0, 0, 200, 150);
    x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText('D-' + n + '-' + Math.random().toString(36).slice(2, 7), 6, 20);
    c.toBlob(b => resolve(new File([b], 'd_' + n + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85);
  });
}
async function idle() { const t0 = Date.now(); while (photoWritesBusy() && Date.now() - t0 < 20000) await sleep(40); await sleep(250); }
const msgs = []; const toasts = [];
window.confirm = m => { msgs.push(String(m)); return true; };
window.alert = m => { msgs.push('ALERT ' + String(m)); };
{ const rt = window.showToast; window.showToast = function (m, w) { toasts.push((w ? '!' : '') + String(m).replace(/<[^>]+>/g, '')); try { return rt.apply(this, arguments); } catch (e) {} }; }
async function unit(name, srcs) {
  document.getElementById('equipName').value = name;
  for (const s of srcs) { addSource(); Object.assign(sources[sources.length - 1], s); }
  renderSources();
}
