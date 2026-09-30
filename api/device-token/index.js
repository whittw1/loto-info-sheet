// Step 1 of the iPad app's sign-in (see ../shared/graph.js, "The device pass"):
// a one-time code for the app, bound to the app's challenge.
//
// Only a real web sign-in may ask — Static Web Apps refuses anyone not signed in
// before this runs (staticwebapp.config.json), and the gate below refuses a
// device pass here (an old pass never mints anything) and any account outside
// ALLOWED_DOMAIN. The link page (backup-link.html) calls this inside the in-app
// browser sheet and passes the code back to the app through its link scheme;
// the app trades it for the pass at /api/device-pass.
//
// GET ?device=<collector tag>&challenge=<base64url SHA-256 of the app's verifier>
//   → { ok, code, user }

const G = require('../shared/graph');

module.exports = async function (context, req) {
  const c = G.cfg();
  const done = (status, body) => { context.res = { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body }; };

  const gate = G.admit(req, c, context, { sessionOnly: true });
  if (gate.refuse) return done(gate.refuse.status, gate.refuse.body);
  if (!c.passSecret) return done(503, { ok: false, error: 'Device sign-in is not set up yet (DEVICE_PASS_SECRET).' });

  const q = req.query || {};
  const device = String(q.device || '').replace(/[^\w.-]/g, '').slice(0, 64);
  try {
    const code = G.mintDeviceCode(c, gate.who, device, String(q.challenge || ''));
    context.log('device sign-in code for ' + gate.who + ' (' + (device || 'no device') + ')');
    return done(200, { ok: true, code, user: gate.who });
  } catch (e) {
    return done(400, { ok: false, error: e.message });
  }
};
