// Tests for the live-backup API (api/): run with `node --test tests/api/`.
// Microsoft Graph is a fake here (global fetch is replaced), so nothing needs
// Azure, a tenant or a network.

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const API = path.join(__dirname, '..', '..', 'api');
const G = require(path.join(API, 'shared', 'graph.js'));
const { qxhBase64, qxhCreate } = require(path.join(API, 'shared', 'qxh.js'));
const upload = require(path.join(API, 'upload', 'index.js'));
const uploadSession = require(path.join(API, 'upload-session', 'index.js'));
const deviceToken = require(path.join(API, 'device-token', 'index.js'));

const BASE_ENV = {
  ALLOWED_DOMAIN: 'hgsengineeringinc.com', GRAPH_TENANT_ID: 'tenant', GRAPH_CLIENT_ID: 'client', GRAPH_CLIENT_SECRET: 'secret',
  GRAPH_SITE_ID: 'contoso.sharepoint.com,1,2', GRAPH_DRIVE_ID: '', GRAPH_ROOT_FOLDER: 'LOTO Backups', GRAPH_TARGETS: '',
  DEVICE_PASS_SECRET: 'test-pass-secret', DEVICE_PASS_DAYS: '30', DEVICE_PASS_NOT_BEFORE: '',
};
function setEnv(over) { for (const [k, v] of Object.entries(Object.assign({}, BASE_ENV, over || {}))) process.env[k] = v; }
const principal = (email) => Buffer.from(JSON.stringify({ userDetails: email, identityProvider: 'aad' })).toString('base64');
const ctx = () => ({ res: null, log: Object.assign(() => {}, { error() {}, warn() {} }) });

// A fake Graph: the token endpoint, and PUTs that "store" the bytes and answer
// like SharePoint does — size and quickXorHash — unless told to misbehave.
function fakeGraph(opts) {
  opts = opts || {};
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('login.microsoftonline.com')) return new Response(JSON.stringify({ access_token: 'graph-token', expires_in: 3600 }), { status: 200 });
    if (String(url).endsWith('/createUploadSession')) return new Response(JSON.stringify({ uploadUrl: 'https://upload.example/session/1', expirationDateTime: '2026-10-01T00:00:00Z' }), { status: 200 });
    if (opts.status && opts.status !== 200) return new Response(JSON.stringify({ error: { code: 'x' } }), { status: opts.status });
    const bytes = Buffer.from(init.body);
    const size = opts.size != null ? opts.size : bytes.length;
    const hash = opts.hash != null ? opts.hash : qxhBase64(bytes);
    return new Response(JSON.stringify({ size, webUrl: 'https://sp.example/x', file: { hashes: { quickXorHash: hash } } }), { status: 200 });
  };
  return calls;
}
async function call(fn, req) { const c = ctx(); await fn(c, Object.assign({ headers: {}, query: {} }, req)); return c.res; }
const photoBody = (bytes, extra) => Object.assign({ path: 'photos/p.a.b.1.jpg', folder: 'Atlanta/2026-10-06', contentType: 'image/jpeg',
  contentBase64: bytes.toString('base64'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') }, extra || {});

test('QuickXorHash matches the reference implementation (libqxh)', () => {
  assert.strictEqual(qxhBase64(Buffer.from('hello world')), 'aCgDG9jwBhDc4Q1yawMZAAAAAAA=');   // libqxh README
  assert.strictEqual(qxhBase64(Buffer.alloc(0)), 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  // bytes (i*7+3) mod 256, answers from the C reference
  const want = { 1: 'AwAAAAAAAAAAAAAAAQAAAAAAAAA=', 159: '7gi7SoTZMRx5gfdOM7shn/kHQ6E=', 160: '7gi7SoTZMRx5gfdODLshn/kHw6o=',
    161: 'jQi7SoTZMRx5gfdODbshn/kHw6o=', 1000: 'dgD8j0n8sM0aPE5CUJ8tqmilX/E=', 100000: '7gi7SoTZMRx5gfdODD0gn/kHw6o=' };
  for (const [n, h] of Object.entries(want)) {
    const data = Buffer.from(Array.from({ length: +n }, (_, i) => (i * 7 + 3) % 256));
    assert.strictEqual(qxhBase64(data), h, 'length ' + n);
    // the same answer fed in pieces
    const q = qxhCreate(); for (let o = 0; o < data.length; o += 97) q.update(data.subarray(o, o + 97));
    assert.strictEqual(Buffer.from(q.digest()).toString('base64'), h, 'length ' + n + ' in pieces');
  }
});

test('the iPad app carries the same QuickXorHash as the server', () => {
  // index.html has its own copy (a single-file app); it must give the same answers.
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const m = /\/\/ >>> qxhCreate[\s\S]*?\n(function qxhCreate\(\) \{[\s\S]*?\n\})\n\/\/ <<< qxhCreate/.exec(html);
  assert.ok(m, 'index.html has a marked qxhCreate');
  const appQxh = new Function(m[1] + '\nreturn qxhCreate;')();
  for (const n of [0, 1, 159, 160, 161, 5000, 70000]) {
    const data = crypto.randomBytes(n);
    const h = appQxh(); h.update(new Uint8Array(data.subarray(0, n >> 1))); h.update(new Uint8Array(data.subarray(n >> 1)));
    assert.strictEqual(Buffer.from(h.digest()).toString('base64'), qxhBase64(data), 'length ' + n);
  }
});

test('paths never climb out of the backup folder', () => {
  assert.strictEqual(G.safeFolder('../../etc/passwd'), 'etc/passwd');
  assert.strictEqual(G.safeFolder('/Atlanta//2026-10-06/'), 'Atlanta/2026-10-06');
  assert.strictEqual(G.safeFolder('Atlanta - Fort McPherson/2026-10-06'), 'Atlanta - Fort McPherson/2026-10-06');
  assert.strictEqual(G.safePath('photos/a:b*c?.jpg'), 'photos/a_b_c_.jpg');
  assert.throws(() => G.safePath('../..'), /no path/);
  assert.strictEqual(G.safeFolder('a/b/c/d/e/f/g/h'), 'a/b/c/d/e/f');
});

test('a device pass is honoured only when signed, current and in the domain', () => {
  setEnv();
  const c = G.cfg(), now = Date.parse('2026-10-06T12:00:00Z');
  const p = G.mintDevicePass(c, 'tech@hgsengineeringinc.com', 'JW-a1b2', now);
  const req = (pass) => ({ method: 'POST', headers: { 'x-loto-pass': pass } });
  assert.strictEqual(G.readDevicePass(c, req(p.pass), now + 1000).sub, 'tech@hgsengineeringinc.com');
  assert.strictEqual(G.readDevicePass(c, req(p.pass), now + 31 * 86400000), null, 'expired');
  const [v, body, sig] = p.pass.split('.');
  const forged = Buffer.from(JSON.stringify({ v: 1, sub: 'boss@hgsengineeringinc.com', dev: 'x', iat: now / 1000, exp: now / 1000 + 9e9 })).toString('base64url');
  assert.strictEqual(G.readDevicePass(c, req([v, forged, sig].join('.')), now), null, 'a changed payload fails the signature');
  assert.strictEqual(G.readDevicePass(c, req([v, body, sig.slice(0, -2) + 'AA'].join('.')), now), null, 'a changed signature');
  assert.strictEqual(G.readDevicePass(Object.assign({}, c, { passSecret: 'other' }), req(p.pass), now), null, 'another secret');
  assert.strictEqual(G.readDevicePass(Object.assign({}, c, { passNotBefore: now + 1000 }), req(p.pass), now + 2000), null, 'revoked (not before)');
  assert.strictEqual(G.readDevicePass(Object.assign({}, c, { passSecret: '' }), req(p.pass), now), null, 'no secret configured');
  assert.strictEqual(G.readDevicePass(c, { headers: { authorization: 'Bearer ' + p.pass } }, now), null, 'only its own header');
});

test('the gate: web sign-in, device pass, domain, and passes never mint passes', () => {
  setEnv();
  const c = G.cfg();
  const pass = G.mintDevicePass(c, 'tech@hgsengineeringinc.com', 'JW-a1b2').pass;
  assert.strictEqual(G.admit({ headers: {} }, c).refuse.status, 401);
  assert.strictEqual(G.admit({ headers: { 'x-ms-client-principal': principal('tech@hgsengineeringinc.com') } }, c).via, 'session');
  assert.strictEqual(G.admit({ headers: { 'x-ms-client-principal': principal('someone@gmail.com') } }, c).refuse.status, 403);
  assert.strictEqual(G.admit({ headers: { 'x-loto-pass': pass } }, c).via, 'device');
  assert.strictEqual(G.admit({ headers: { 'x-loto-pass': pass } }, c, null, { sessionOnly: true }).refuse.status, 401);
  const outsider = G.mintDevicePass(c, 'someone@gmail.com', 'x').pass;
  assert.strictEqual(G.admit({ headers: { 'x-loto-pass': outsider } }, c).refuse.status, 403, 'a pass outside the domain (domain changed since)');
});

test('upload: stored only when SharePoint reports the same size and hash', async () => {
  setEnv();
  const bytes = crypto.randomBytes(300000);
  const auth = { 'x-ms-client-principal': principal('tech@hgsengineeringinc.com') };
  let calls = fakeGraph();
  let res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes) });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.strictEqual(res.body.quickXorHash, qxhBase64(bytes));
  assert.strictEqual(res.body.hashChecked, true);
  const put = calls.find(x => x.init && x.init.method === 'PUT');
  assert.ok(put.url.includes('/sites/contoso.sharepoint.com%2C1%2C2/drive/root:/LOTO%20Backups/Atlanta/2026-10-06/photos/p.a.b.1.jpg:/content'), put.url);

  fakeGraph({ size: 1234 });
  res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes) });
  assert.strictEqual(res.status, 502, 'a short copy is not a backup');
  fakeGraph({ hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=' });
  res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes) });
  assert.strictEqual(res.status, 502, 'different bytes are not a backup');
  fakeGraph();
  res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes, { sha256: '0'.repeat(64) }) });
  assert.strictEqual(res.status, 400, 'damaged on the way in');
  // the service, not the file: the app pauses everything instead of sending every photo to fail
  for (const [graph, want] of [[401, 503], [403, 503], [404, 503], [429, 429], [500, 429], [503, 429], [409, 502], [423, 502], [400, 502]]) {
    fakeGraph({ status: graph });
    res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes) });
    assert.strictEqual(res.status, want, 'Graph ' + graph + ' → ' + want + ': ' + JSON.stringify(res.body));
  }
  calls = fakeGraph();
  res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes, { folder: '../../Other Site/x' }) });
  assert.strictEqual(res.status, 200);
  assert.ok(calls.find(x => x.init && x.init.method === 'PUT').url.includes('/root:/LOTO%20Backups/Other%20Site/x/photos/'), 'climbing out is dropped, the root stays');
  res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes, { target: 'nope' }) });
  assert.strictEqual(res.status, 400, 'an unknown destination is refused, not redirected');
});

test('upload: the service failing (its own sign-in, the network, the upload session) pauses the app — 503 / 429 — never blames the file', async () => {
  setEnv();
  const bytes = crypto.randomBytes(1000);
  const auth = { 'x-ms-client-principal': principal('tech@hgsengineeringinc.com') };
  G.resetTokenCache();
  global.fetch = async (url) => String(url).includes('login.microsoftonline.com')
    ? new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 }) : new Response('{}', { status: 200 });
  let res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes) });
  assert.strictEqual(res.status, 503, JSON.stringify(res.body));
  assert.match(res.body.error, /could not sign in to Microsoft/);
  G.resetTokenCache();
  global.fetch = async () => { throw new TypeError('fetch failed'); };
  res = await call(upload, { method: 'POST', headers: auth, body: photoBody(bytes) });
  assert.strictEqual(res.status, 429, JSON.stringify(res.body));
  G.resetTokenCache();
  for (const [graph, want] of [[403, 503], [429, 429], [500, 429]]) {
    global.fetch = async (url) => String(url).includes('login.microsoftonline.com')
      ? new Response(JSON.stringify({ access_token: 'graph-token', expires_in: 3600 }), { status: 200 })
      : new Response(JSON.stringify({ error: { code: 'x' } }), { status: graph });
    res = await call(uploadSession, { method: 'POST', headers: auth, body: { path: 'export/x.zip', folder: 'Atlanta/2026-10-06', size: 100 } });
    assert.strictEqual(res.status, want, 'upload session: Graph ' + graph + ' → ' + want);
  }
  G.resetTokenCache();
});

test('upload: GET says who is asking and how; not configured is 503; strangers learn nothing', async () => {
  setEnv();
  fakeGraph();
  const c = G.cfg();
  const pass = G.mintDevicePass(c, 'tech@hgsengineeringinc.com', 'JW-a1b2').pass;
  let res = await call(upload, { method: 'GET', headers: { 'x-loto-pass': pass } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.via, 'device');
  assert.strictEqual(res.body.configured, true);
  assert.ok(res.body.passExpires);
  assert.deepStrictEqual(res.body.targets, [{ key: 'default', label: 'LOTO Backups', root: 'LOTO Backups' }]);
  res = await call(upload, { method: 'GET', headers: { 'x-ms-client-principal': principal('x@gmail.com') } });
  assert.strictEqual(res.status, 403);
  assert.ok(!('targets' in res.body));
  setEnv({ GRAPH_CLIENT_SECRET: '' });
  res = await call(upload, { method: 'POST', headers: { 'x-loto-pass': pass }, body: photoBody(Buffer.from('x')) });
  assert.strictEqual(res.status, 503);
});

test('upload-session: a pre-authorised URL for one path, the bytes never pass through', async () => {
  setEnv();
  const calls = fakeGraph();
  const auth = { 'x-ms-client-principal': principal('tech@hgsengineeringinc.com') };
  let res = await call(uploadSession, { method: 'POST', headers: auth, body: { path: 'export/FieldExport_Atlanta_100626_JW-a1b2.zip', folder: 'Atlanta/2026-10-06', size: 50e6 } });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.uploadUrl, 'https://upload.example/session/1');
  assert.ok(calls.some(x => x.url.includes('/root:/LOTO%20Backups/Atlanta/2026-10-06/export/FieldExport_Atlanta_100626_JW-a1b2.zip:/createUploadSession')));
  res = await call(uploadSession, { method: 'POST', headers: auth, body: { path: 'export/x.zip', folder: 'Atlanta/2026-10-06', size: 0 } });
  assert.strictEqual(res.status, 400);
});

const devicePass = require(path.join(API, 'device-pass', 'index.js'));
const pkce = () => { const verifier = crypto.randomBytes(32).toString('base64url'); return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }; };

test('iPad sign-in: a web sign-in gets a one-time code; only the app that holds the verifier turns it into a pass', async () => {
  setEnv();
  fakeGraph();
  const web = { 'x-ms-client-principal': principal('tech@hgsengineeringinc.com') };
  const { verifier, challenge } = pkce();
  let res = await call(deviceToken, { method: 'GET', headers: web, query: { device: 'JW-a1b2', challenge } });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  const code = res.body.code;
  assert.ok(/^c1\./.test(code));
  assert.strictEqual(G.readDevicePass(G.cfg(), { headers: { 'x-loto-pass': code } }), null, 'a code is not a pass');

  res = await call(devicePass, { method: 'POST', body: { code, verifier: pkce().verifier } });
  assert.strictEqual(res.status, 401, 'a caught code without the verifier is useless');
  res = await call(devicePass, { method: 'POST', body: { code, verifier } });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  const p = G.readDevicePass(G.cfg(), { headers: { 'x-loto-pass': res.body.pass } });
  assert.strictEqual(p.sub, 'tech@hgsengineeringinc.com');
  assert.strictEqual(p.dev, 'JW-a1b2');
  assert.strictEqual(G.redeemDeviceCode(G.cfg(), res.body.pass, verifier), null, 'a pass is not a code');

  const old = G.mintDeviceCode(G.cfg(), 'tech@hgsengineeringinc.com', 'JW-a1b2', challenge, Date.now() - 301000);
  res = await call(devicePass, { method: 'POST', body: { code: old, verifier } });
  assert.strictEqual(res.status, 401, 'a code older than 5 minutes');

  res = await call(deviceToken, { method: 'GET', headers: web, query: { device: 'JW-a1b2' } });
  assert.strictEqual(res.status, 400, 'no challenge, no code');
  res = await call(deviceToken, { method: 'GET', headers: { 'x-loto-pass': G.mintDevicePass(G.cfg(), 'tech@hgsengineeringinc.com', 'x').pass }, query: { challenge } });
  assert.strictEqual(res.status, 401, 'a pass never mints anything');
  res = await call(deviceToken, { method: 'GET', headers: { 'x-ms-client-principal': principal('x@gmail.com') }, query: { challenge } });
  assert.strictEqual(res.status, 403);

  const outsider = G.mintDeviceCode(G.cfg(), 'x@gmail.com', 'dev', challenge);
  res = await call(devicePass, { method: 'POST', body: { code: outsider, verifier } });
  assert.strictEqual(res.status, 403, 'the domain is checked again when the pass is issued');

  setEnv({ DEVICE_PASS_SECRET: '' });
  res = await call(deviceToken, { method: 'GET', headers: web, query: { challenge } });
  assert.strictEqual(res.status, 503);
  res = await call(devicePass, { method: 'POST', body: { code, verifier } });
  assert.strictEqual(res.status, 503);
});
