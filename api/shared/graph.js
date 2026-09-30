// Everything the LOTO backup endpoints share: the settings, who is asking (the
// web sign-in, or the iPad app's device pass), the app's own sign-in to
// Microsoft Graph, and the one rule for turning what the app sends into a path
// inside the backup folder. One copy, so the endpoints cannot drift apart.
//
// Ported from the NPS Audit Photo Collector (api/shared/graph.js, v4.12) —
// kept close to it on purpose. What LOTO adds: the device pass (the iPad app is
// a native build and can't carry the web sign-in's cookie) and hash checks on
// what SharePoint stored.

const crypto = require('crypto');
const GRAPH = 'https://graph.microsoft.com/v1.0';
let cachedToken = null;   // { value, expires } — reused across invocations while warm

function cfg() {
  const days = Number(process.env.DEVICE_PASS_DAYS || 30);
  return {
    domain: (process.env.ALLOWED_DOMAIN || 'hgsengineeringinc.com').toLowerCase(),
    tenant: process.env.GRAPH_TENANT_ID || '',
    client: process.env.GRAPH_CLIENT_ID || '',
    secret: process.env.GRAPH_CLIENT_SECRET || '',
    site: process.env.GRAPH_SITE_ID || '',
    drive: process.env.GRAPH_DRIVE_ID || '',
    root: safeSegments(process.env.GRAPH_ROOT_FOLDER || '', 6),
    // The device pass: signed with this secret, good for this many days, and
    // refused when issued before PASS_NOT_BEFORE (set it to now to revoke
    // every pass at once; changing the secret does the same).
    passSecret: process.env.DEVICE_PASS_SECRET || '',
    passDays: isFinite(days) && days > 0 ? Math.min(days, 90) : 30,
    passNotBefore: Date.parse(process.env.DEVICE_PASS_NOT_BEFORE || '') || 0,
  };
}

// The destinations an administrator has configured, in GRAPH_TARGETS:
//   [ { "key":"loto", "label":"LOTO Backups", "site":"…", "root":"LOTO Backups" } ]
// The device never names a library. It names one of these keys (or none: the
// first) and the function resolves it here, so a lost iPad cannot redirect
// anything. `root` is the real boundary: Sites.Selected covers the whole site,
// and nothing may be written outside the root of the chosen destination.
function targets(c) {
  let list = [];
  try { const raw = JSON.parse(process.env.GRAPH_TARGETS || '[]'); if (Array.isArray(raw)) list = raw; } catch (e) {}
  list = list.map((t, i) => ({
    key: String((t && t.key) || ('t' + i)).slice(0, 40),
    label: String((t && t.label) || (t && t.key) || 'Destination').slice(0, 80),
    drive: String((t && t.drive) || ''),
    site: String((t && t.site) || ''),
    root: safeSegments((t && t.root) || '', 6),
  })).filter(t => t.drive || t.site);
  // Nothing configured: the single destination from the plain settings.
  if (!list.length && (c.drive || c.site)) {
    list = [{ key: 'default', label: c.root || 'Backup folder', drive: c.drive, site: c.site, root: c.root }];
  }
  return list;
}
// No key means the first one. A key that is not on the list is refused rather
// than quietly redirected somewhere else.
function resolveTarget(c, key) {
  const list = targets(c);
  if (!list.length) return null;
  if (!key) return list[0];
  return list.find(t => t.key === String(key)) || null;
}

function configured(c) {
  return !!(c.tenant && c.client && c.secret && targets(c).length);
}

async function graphToken(c) {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  const body = new URLSearchParams({
    client_id: c.client, client_secret: c.secret,
    scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    // a setting, not the file: a wrong or expired secret, tenant or client id
    const e = new Error('the backup service could not sign in to Microsoft (' + (j.error || r.status) + ') — ask the administrator to check its settings');
    e.config = true;
    throw e;
  }
  cachedToken = { value: j.access_token, expires: Date.now() + (j.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

// No drive letters, no "..", no leading slash, nothing that climbs out of the
// parent folder. Anything that tries is dropped, not honoured.
function safeSegments(v, max) {
  return String(v || '').split('/')
    .map(s => s.trim().replace(/[\\:*?"<>|#%\u0000-\u001f]/g, '_'))
    .filter(s => s && s !== '.' && s !== '..')
    .slice(0, max).join('/');
}
function safeFolder(f) { return safeSegments(f, 6); }
function safePath(p) {
  const path = safeSegments(p, 12);
  if (!path) throw new Error('no path');
  if (path.length > 300) throw new Error('path too long');
  return path;
}

// Static Web Apps passes the visitor signed in on the web here; no header means
// nobody signed in that way.
function whoIsAsking(req) {
  try {
    const h = req.headers['x-ms-client-principal'];
    if (!h) return null;
    const p = JSON.parse(Buffer.from(h, 'base64').toString('utf8'));
    return p && p.userDetails ? String(p.userDetails) : null;
  } catch (e) { return null; }
}

// ---- The device pass (the iPad app) ------------------------------------------
// The native app runs outside the web origin, so the web sign-in's cookie never
// reaches it. The tech signs in once on the web (the link page, in an in-app
// browser sheet); the app ends up holding this pass: who signed in, for which
// device, until when — signed with DEVICE_PASS_SECRET. It can only write files
// inside the backup folder, it expires, and it can be revoked for every device
// at once (DEVICE_PASS_NOT_BEFORE, or a new secret). It travels in its own
// header (x-loto-pass), not Authorization, which the platform may keep for
// itself.
//
// The pass itself never travels through the app's link scheme, which another
// app could claim (the native-app sign-in rule — OAuth PKCE, RFC 7636 / 8252).
// The app makes a random `verifier` and sends only its SHA-256 (`challenge`)
// to the link page; /api/device-token hands the page a one-time CODE bound to
// that challenge, good for 5 minutes; the page passes the code back through the
// link scheme; the app trades code + verifier for the pass at /api/device-pass.
// A code caught by anything else is useless without the verifier, which never
// left the app. Codes and passes are signed under different prefixes, so
// neither can stand in for the other. Stateless: nothing is stored server-side.
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
function signed(c, kind, payload) {
  const body = b64u(JSON.stringify(payload));
  return kind + '.' + body + '.' + b64u(crypto.createHmac('sha256', c.passSecret).update(kind + '.' + body).digest());
}
function readSigned(c, kind, raw, now) {
  const m = new RegExp('^' + kind + '\\.([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)$').exec(String(raw || '').trim());
  if (!m || !c.passSecret) return null;
  const want = crypto.createHmac('sha256', c.passSecret).update(kind + '.' + m[1]).digest(), got = unb64u(m[2]);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let p = null;
  try { p = JSON.parse(unb64u(m[1]).toString('utf8')); } catch (e) { return null; }
  const t = Math.floor((now || Date.now()) / 1000);
  if (!p || p.v !== 1 || !p.sub || !(p.exp > t)) return null;
  return p;
}
function mintDevicePass(c, who, device, now) {
  if (!c.passSecret) throw new Error('device sign-in is not set up (DEVICE_PASS_SECRET)');
  const iat = Math.floor((now || Date.now()) / 1000);
  const payload = { v: 1, sub: String(who), dev: String(device || '').slice(0, 64), iat, exp: iat + c.passDays * 86400 };
  return { pass: signed(c, 'v1', payload), user: payload.sub, expires: new Date(payload.exp * 1000).toISOString() };
}
function readDevicePass(c, req, now) {
  const p = readSigned(c, 'v1', req.headers['x-loto-pass'], now);
  if (!p) return null;
  if (c.passNotBefore && p.iat * 1000 < c.passNotBefore) return null;
  return p;
}
const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/;   // base64url of a SHA-256
function mintDeviceCode(c, who, device, challenge, now) {
  if (!c.passSecret) throw new Error('device sign-in is not set up (DEVICE_PASS_SECRET)');
  if (!CHALLENGE_RE.test(String(challenge || ''))) throw new Error('no challenge');
  const iat = Math.floor((now || Date.now()) / 1000);
  return signed(c, 'c1', { v: 1, sub: String(who), dev: String(device || '').slice(0, 64), ch: challenge, iat, exp: iat + 300 });
}
// The code's pass, or null: a good signature, not expired, and the verifier
// that hashes to the challenge it was issued for.
function redeemDeviceCode(c, code, verifier, now) {
  const p = readSigned(c, 'c1', code, now);
  if (!p || !CHALLENGE_RE.test(String(p.ch || ''))) return null;
  const v = String(verifier || '');
  if (v.length < 43 || v.length > 128) return null;
  const ch = Buffer.from(b64u(crypto.createHash('sha256').update(v).digest()));
  const want = Buffer.from(p.ch);
  if (ch.length !== want.length || !crypto.timingSafeEqual(ch, want)) return null;
  return p;
}

// The gate every endpoint stands behind. Returns the account (and how it
// signed in), or the refusal to send back: the built-in web sign-in admits ANY
// Microsoft account, so a stranger must learn nothing here at all.
// `sessionOnly`: a device pass is not enough (minting a new pass needs a real
// sign-in, never an old pass).
function admit(req, c, context, opts) {
  let who = whoIsAsking(req), via = 'session', pass = null;
  if (!who && !(opts && opts.sessionOnly)) {
    pass = readDevicePass(c, req);
    if (pass) { who = pass.sub; via = 'device'; }
  }
  if (!who) return { refuse: { status: 401, body: { ok: false, error: 'sign in with your Microsoft account first' } } };
  if (c.domain && !who.toLowerCase().endsWith('@' + c.domain)) {
    if (context && context.log) context.log.warn('refused ' + req.method + ' for ' + who);
    return { refuse: { status: 403, body: { ok: false, error: 'that account is not allowed to upload here' } } };
  }
  return { who, via, pass };
}

// A drive id points straight at one library; a site id uses that site's
// default document library.
function driveBase(t) {
  return t.drive ? `${GRAPH}/drives/${encodeURIComponent(t.drive)}` : `${GRAPH}/sites/${encodeURIComponent(t.site)}/drive`;
}
function itemUrl(t, full) {
  return `${driveBase(t)}/root:/${full.split('/').map(encodeURIComponent).join('/')}:`;
}
// The full path inside the library: the destination's fixed parent, the folder
// the app asked for (facility/day), then the file.
function fullPath(t, folder, path) {
  return [t.root, folder, path].filter(Boolean).join('/');
}
function sha256Hex(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }

// What a failed call to Graph means for the app. Only a problem with THIS file
// is a 502 — the app waits on that one file and sends the rest. The service
// itself answers 503 (the app pauses 10 minutes: a setting to fix — the site
// grant, the site or library id, the app's own sign-in) or 429 (it pauses a
// minute: SharePoint is busy or unreachable). One broken setting must never
// make every photo upload in full only to fail, each backing off on its own.
function graphFailure(status) {
  // write-once: a name that already exists is kept as it is — about this file
  if (status === 409) return { status: 502, error: 'SharePoint already holds a file with that name — it is kept as it is; this copy was not written' };
  if (status === 401 || status === 403 || status === 404) {
    return { status: 503, error: 'SharePoint refused the backup service (' + status + ') — ask the administrator to check its site grant and settings' };
  }
  if (status === 429 || status >= 500) return { status: 429, error: 'SharePoint is busy (' + status + ') — trying again shortly' };
  return { status: 502, error: 'SharePoint refused the file (' + status + ')' };
}
function thrownFailure(e) {
  return e && e.config ? { status: 503, error: e.message } : { status: 429, error: 'could not reach SharePoint (' + ((e && e.message) || e) + ') — trying again shortly' };
}

module.exports = {
  GRAPH, cfg, configured, targets, resolveTarget, graphToken, safeSegments, safeFolder, safePath,
  whoIsAsking, mintDevicePass, readDevicePass, mintDeviceCode, redeemDeviceCode, admit, driveBase, itemUrl, fullPath, sha256Hex,
  graphFailure, thrownFailure, resetTokenCache: () => { cachedToken = null; },   // (tests)
};
