// A local stand-in for the Azure Static Web App behind the SharePoint live
// backup (build 101) — for the end-to-end checks (backup_e2e.mjs, and the
// Simulator run in run-sim-backup.sh). It serves the app from this repo and
// runs the REAL api/ functions, with only the outside world faked:
//   • the Microsoft sign-in (/.auth/login/aad sets a cookie; /.auth/me reads
//     it; the functions get the x-ms-client-principal header, as on Azure);
//   • Microsoft Graph and SharePoint (files kept in memory; an upload session
//     is served from here; answers carry size + QuickXorHash, like SharePoint;
//     conflictBehavior=fail on a name that exists → 409, as SharePoint does —
//     and any write that WOULD replace a file is counted in /__stats.replaced).
// Never deploy this. Test-only endpoints: GET /__store (what "SharePoint"
// holds), GET /__mint-pass (a device pass, for the Simulator run, which can't
// drive the in-app browser sheet), POST /__reset.
//   node backup_e2e_server.mjs [port]      (default 8790)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = +(process.argv[2] || process.env.PORT || 8790);
const USER = process.env.E2E_USER || 'tech@hgsengineeringinc.com';
Object.assign(process.env, {
  ALLOWED_DOMAIN: 'hgsengineeringinc.com', GRAPH_TENANT_ID: 'e2e-tenant', GRAPH_CLIENT_ID: 'e2e-client', GRAPH_CLIENT_SECRET: 'e2e-secret',
  GRAPH_SITE_ID: 'e2e.sharepoint.com,1,2', GRAPH_ROOT_FOLDER: 'LOTO Backups', DEVICE_PASS_SECRET: 'e2e-pass-secret-' + crypto.randomBytes(8).toString('hex'),
});
const G = require(path.join(ROOT, 'api', 'shared', 'graph.js'));
const { qxhBase64 } = require(path.join(ROOT, 'api', 'shared', 'qxh.js'));
const FUNCS = {};
for (const f of ['upload', 'upload-session', 'device-token', 'device-pass']) FUNCS[f] = require(path.join(ROOT, 'api', f, 'index.js'));

// ---- fake SharePoint --------------------------------------------------------------
let store = new Map();        // library path → Buffer
let sessions = new Map();     // id → { path, size, buf, got, fail }
let replaced = 0;             // writes that replaced a file (build 102: must stay 0)
const GRAPH_ITEM = /\/drive\/root:\/(.+):\/(content|createUploadSession)(\?.*)?$/;
const GRAPH_META = /\/drive\/root:\/(.+):$/;
const conflict = () => new Response(JSON.stringify({ error: { code: 'nameAlreadyExists', message: 'The specified item name already exists.' } }), { status: 409 });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://login.microsoftonline.com/')) return new Response(JSON.stringify({ access_token: 'e2e-graph-token', expires_in: 3600 }), { status: 200 });
  const meta = GRAPH_META.exec(u);
  if (meta && u.startsWith('https://graph.microsoft.com/') && (!init || !init.method || init.method === 'GET')) {
    const b = store.get(decodeURIComponent(meta[1]));
    if (!b) return new Response(JSON.stringify({ error: { code: 'itemNotFound' } }), { status: 404 });
    return new Response(JSON.stringify({ size: b.length, webUrl: 'https://e2e.sharepoint.com/' + encodeURI(decodeURIComponent(meta[1])), file: { hashes: { quickXorHash: qxhBase64(b) } } }), { status: 200 });
  }
  const m = GRAPH_ITEM.exec(u);
  if (m && u.startsWith('https://graph.microsoft.com/')) {
    const p = decodeURIComponent(m[1]);
    if (m[2] === 'content') {
      const bytes = Buffer.from(init.body);
      if (store.has(p)) { if (/conflictBehavior=fail/.test(u)) return conflict(); replaced++; }
      store.set(p, bytes);
      return new Response(JSON.stringify({ size: bytes.length, webUrl: 'https://e2e.sharepoint.com/' + encodeURI(p), file: { hashes: { quickXorHash: qxhBase64(bytes) } } }), { status: 201 });
    }
    const id = crypto.randomBytes(8).toString('hex');
    const req = JSON.parse(init.body || '{}'), fail = !!(req.item && req.item['@microsoft.graph.conflictBehavior'] === 'fail');
    if (fail && store.has(p)) return conflict();
    const size = +req.size || 0;   // (the real call doesn't send size; the session learns it from the chunks)
    sessions.set(id, { path: p, size, buf: null, got: 0, fail });
    return new Response(JSON.stringify({ uploadUrl: 'http://localhost:' + PORT + '/__session/' + id, expirationDateTime: new Date(Date.now() + 3600e3).toISOString() }), { status: 200 });
  }
  return realFetch(url, init);
};
function sessionRequest(req, res, id, body) {
  const s = sessions.get(id);
  const send = (st, obj) => { res.writeHead(st, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj)); };
  if (!s) return send(404, { error: 'no session' });
  if (req.method === 'GET') return send(200, { nextExpectedRanges: [s.got + '-'] });
  const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(req.headers['content-range'] || ''));
  if (!m) return send(400, { error: 'no Content-Range' });
  const from = +m[1], to = +m[2], total = +m[3];
  if (!s.buf) s.buf = Buffer.alloc(total);
  if (from !== s.got || body.length !== to - from + 1) return send(416, { error: 'range ' + from + ' expected ' + s.got + ' (' + body.length + ' bytes)' });
  body.copy(s.buf, from); s.got = to + 1;
  if (s.got < total) return send(202, { nextExpectedRanges: [s.got + '-'] });
  if (store.has(s.path)) { if (s.fail) return send(409, { error: { code: 'nameAlreadyExists' } }); replaced++; }
  store.set(s.path, s.buf);
  return send(201, { size: total, name: s.path.split('/').pop(), file: { hashes: { quickXorHash: qxhBase64(s.buf) } } });
}

// ---- the site ---------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const signedIn = (req) => /(?:^|;\s*)e2e_signed_in=1/.test(String(req.headers.cookie || ''));
let loginHits = 0, denyToken = false;   // the link page's sign-in trips; a broken setup that refuses device-token
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const json = (st, obj, extra) => { res.writeHead(st, Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, extra || {})); res.end(JSON.stringify(obj)); };
  try {
    if (url.pathname.startsWith('/__session/')) return sessionRequest(req, res, url.pathname.slice(11), body);
    if (url.pathname === '/__store') {
      const out = {};
      store.forEach((b, p) => { out[p] = { size: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex'), quickXorHash: qxhBase64(b) }; });
      return json(200, out);
    }
    if (url.pathname === '/__reset' && req.method === 'POST') { store = new Map(); sessions = new Map(); replaced = 0; return json(200, { ok: true }); }
    if (url.pathname === '/__stats') return json(200, { loginHits, replaced });
    if (url.pathname === '/__deny-token' && req.method === 'POST') { denyToken = url.searchParams.get('on') === '1'; return json(200, { denyToken }); }
    if (url.pathname === '/__mint-pass') return json(200, G.mintDevicePass(G.cfg(), url.searchParams.get('user') || USER, url.searchParams.get('device') || 'e2e'));
    if (url.pathname === '/.auth/login/aad') {
      loginHits++;
      res.writeHead(302, { 'set-cookie': 'e2e_signed_in=1; Path=/', location: url.searchParams.get('post_login_redirect_uri') || '/' });
      return res.end();
    }
    if (url.pathname === '/.auth/logout') {
      res.writeHead(302, { 'set-cookie': 'e2e_signed_in=; Path=/; Max-Age=0', location: url.searchParams.get('post_logout_redirect_uri') || '/' });
      return res.end();
    }
    if (url.pathname === '/.auth/me') return json(200, { clientPrincipal: signedIn(req) ? { identityProvider: 'aad', userDetails: USER, userRoles: ['anonymous', 'authenticated'] } : null });
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5);
      const fn = FUNCS[name];
      if (!fn) return json(404, { ok: false, error: 'no such function' });
      // Azure's route rule for /api/device-token: signed in on the web, or 401.
      if (name === 'device-token' && (!signedIn(req) || denyToken)) return json(401, { ok: false });
      const headers = {};
      Object.entries(req.headers).forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
      delete headers['x-ms-client-principal'];   // only the platform sets this
      if (signedIn(req)) headers['x-ms-client-principal'] = Buffer.from(JSON.stringify({ identityProvider: 'aad', userDetails: USER })).toString('base64');
      let parsed = null;
      if (body.length) { try { parsed = JSON.parse(body.toString('utf8')); } catch (e) { return json(400, { ok: false, error: 'bad JSON' }); } }
      const context = { res: null, log: Object.assign(() => {}, { error() {}, warn() {} }) };
      await fn(context, { method: req.method, headers, query: Object.fromEntries(url.searchParams), body: parsed });
      const r = context.res || { status: 500, body: { ok: false } };
      res.writeHead(r.status || 200, Object.assign({ 'content-type': 'application/json' }, r.headers || {}));
      return res.end(typeof r.body === 'string' ? r.body : JSON.stringify(r.body));
    }
    // static files from the repo (the app, its vendor libraries, the link page, tests)
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    json(500, { ok: false, error: String(e && e.message || e) });
  }
});
server.listen(PORT, () => console.log('backup e2e stand-in on http://localhost:' + PORT));
