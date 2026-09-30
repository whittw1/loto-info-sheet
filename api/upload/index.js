// Upload endpoint for the LOTO Field Collector's live backup.
//
// The device holds no Microsoft credentials. The web app signs in with
// Microsoft (Static Web Apps), the iPad app carries a device pass issued after
// that same sign-in; this function checks the account belongs to the firm, then
// signs in as the app registration and writes the file into one SharePoint
// library through Microsoft Graph — inside the backup folder only.
//
// Settings: see ../README.md. GET → whether it's configured, who is asking, the
// destinations by name. POST → { path, folder, target, contentType,
// contentBase64, sha256 } writes one file (up to 8 MB — photos, the day's unit
// file and photo index). A bigger file (the export ZIP) goes through
// /api/upload-session instead, which never carries the bytes itself.
//
// Proof, not hope (LOTO, beyond the NPS original): the bytes must hash to the
// sha256 the app sent — else they were damaged on the way, 400 — and SharePoint
// must report back the same size and QuickXorHash as the bytes written — else
// 502. Only then does the app count the file as backed up.
//
// Write-once (build 102): NOTHING on SharePoint is ever overwritten. A name
// that already exists is never replaced: if it holds these very bytes (same
// size and QuickXorHash) the file is already backed up — 200, alreadyThere,
// nothing written; if it holds anything else it is kept as it is and this copy
// is refused (502 — the app waits on that one file). The server enforces it, so
// no build of the app, no lost iPad's pass and no bug can replace a file.

const G = require('../shared/graph');
const { qxhBase64 } = require('../shared/qxh');
const MAX_BYTES = 8 * 1024 * 1024;

module.exports = async function (context, req) {
  const c = G.cfg();
  const done = (status, body) => { context.res = { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body }; };

  const gate = G.admit(req, c, context);
  if (gate.refuse) return done(gate.refuse.status, gate.refuse.body);

  if (req.method === 'GET') {
    // The destinations the app may offer, by name only — no drive ids leave here.
    return done(200, { ok: true, configured: G.configured(c), signedInAs: gate.who, via: gate.via,
      passExpires: gate.pass ? new Date(gate.pass.exp * 1000).toISOString() : null,
      targets: G.targets(c).map(t => ({ key: t.key, label: t.label, root: t.root || '(library root)' })) });
  }
  if (!G.configured(c)) return done(503, { ok: false, error: 'This endpoint is not configured yet.' });

  let path, bytes, contentType, folder, target, sha;
  try {
    const b = req.body || {};
    target = G.resolveTarget(c, b.target);
    if (!target) throw new Error('that destination is not configured');
    path = G.safePath(b.path);
    folder = G.safeFolder(b.folder);
    contentType = String(b.contentType || 'application/octet-stream').slice(0, 100);
    bytes = Buffer.from(String(b.contentBase64 || ''), 'base64');
    if (!bytes.length) throw new Error('empty file');
    if (bytes.length > MAX_BYTES) throw new Error('file too large for this endpoint');
    sha = G.sha256Hex(bytes);
    if (b.sha256 && String(b.sha256).toLowerCase() !== sha) throw new Error('the file arrived damaged (its SHA-256 differs) — it will be sent again');
  } catch (e) {
    return done(400, { ok: false, error: e.message });
  }

  try {
    const token = await G.graphToken(c);
    const full = G.fullPath(target, folder, path);
    const qxh = qxhBase64(bytes);
    const r = await fetch(G.itemUrl(target, full) + '/content?%40microsoft.graph.conflictBehavior=fail',
      { method: 'PUT', headers: { authorization: 'Bearer ' + token, 'content-type': contentType }, body: bytes });
    const j = await r.json().catch(() => ({}));
    if (r.status === 409) {
      // The name exists: never replaced. The same bytes → already backed up.
      // Not found a moment later (an earlier copy still being committed, or
      // removed by hand): about this file only — never the service-wide pause.
      const lookFailed = (st) => { const f = st === 404 ? { status: 502, error: 'SharePoint is still settling ' + path.split('/').pop() + ' — it will be checked again' } : G.graphFailure(st); return done(f.status, { ok: false, error: f.error }); };
      const ex = await fetch(G.itemUrl(target, full), { headers: { authorization: 'Bearer ' + token } });
      const ej = await ex.json().catch(() => ({}));
      if (!ex.ok) return lookFailed(ex.status);
      const exHash = ej && ej.file && ej.file.hashes && ej.file.hashes.quickXorHash;
      let same = Number(ej.size) === bytes.length && !!exHash && exHash === qxh;
      if (!same && Number(ej.size) === bytes.length && !exHash) {
        // SharePoint lists no hash for it: compare the bytes themselves (≤ 8 MB)
        const dl = await fetch(G.itemUrl(target, full) + '/content', { headers: { authorization: 'Bearer ' + token } });
        if (!dl.ok) return lookFailed(dl.status);
        same = G.sha256Hex(Buffer.from(await dl.arrayBuffer())) === sha;
      }
      if (same) {
        context.log('already there ' + full + ' for ' + gate.who + ' via ' + gate.via);
        return done(200, { ok: true, path: full, target: target.key, size: bytes.length, sha256: sha, quickXorHash: qxh,
          hashChecked: true, alreadyThere: true, by: gate.who, webUrl: ej.webUrl || null });
      }
      context.log.warn('kept a different existing file', full, ej.size, bytes.length);
      return done(502, { ok: false, error: 'SharePoint already holds a different ' + path.split('/').pop() + ' — it is kept as it is; this copy was not written' });
    }
    if (!r.ok) {
      context.log.error('graph upload failed', r.status, JSON.stringify(j).slice(0, 300));
      const f = G.graphFailure(r.status);
      return done(f.status, { ok: false, error: f.error });
    }
    // What SharePoint says it now holds.
    const storedHash = j && j.file && j.file.hashes && j.file.hashes.quickXorHash;
    if (Number(j.size) !== bytes.length || (storedHash && storedHash !== qxh)) {
      context.log.error('stored copy differs', full, j.size, bytes.length, storedHash, qxh);
      return done(502, { ok: false, error: 'SharePoint stored something different from what was sent (' + j.size + ' of ' + bytes.length + ' bytes) — it will be sent again' });
    }
    context.log('uploaded ' + full + ' for ' + gate.who + ' via ' + gate.via);
    return done(200, { ok: true, path: full, target: target.key, size: bytes.length, sha256: sha, quickXorHash: qxh,
      hashChecked: !!storedHash, by: gate.who, webUrl: j.webUrl || null });
  } catch (e) {
    context.log.error('upload error', e.message);
    const f = G.thrownFailure(e);
    return done(f.status, { ok: false, error: f.error });
  }
};
