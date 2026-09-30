// Step 2 of the iPad app's sign-in (see ../shared/graph.js, "The device pass"):
// the app trades the one-time code from the link page, plus the verifier only
// it knows, for its device pass.
//
// No web session here — the app calls this directly. What stands in for the
// sign-in is the code: signed by this API, 5 minutes old at most, issued to an
// account in ALLOWED_DOMAIN after a real Microsoft sign-in, and bound to the
// SHA-256 of a verifier nobody but the app has seen.
//
// POST { code, verifier } → { ok, pass, user, expires }

const G = require('../shared/graph');

module.exports = async function (context, req) {
  const c = G.cfg();
  const done = (status, body) => { context.res = { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body }; };

  if (!c.passSecret) return done(503, { ok: false, error: 'Device sign-in is not set up yet (DEVICE_PASS_SECRET).' });
  const b = req.body || {};
  const p = G.redeemDeviceCode(c, b.code, b.verifier);
  if (!p) return done(401, { ok: false, error: 'that sign-in has expired or did not come from this device — sign in again' });
  if (c.domain && !String(p.sub).toLowerCase().endsWith('@' + c.domain)) return done(403, { ok: false, error: 'that account is not allowed to upload here' });
  const pass = G.mintDevicePass(c, p.sub, p.dev);
  context.log('device pass for ' + p.sub + ' (' + (p.dev || 'no device') + ') until ' + pass.expires);
  return done(200, { ok: true, pass: pass.pass, user: pass.user, expires: pass.expires });
};
