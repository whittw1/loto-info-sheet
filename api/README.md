# LOTO Collector — SharePoint live backup: the server side

While the app is open and online, the field work is copied into one SharePoint
folder (ARCHITECTURE.md §6 "SharePoint live backup"):

```
LOTO Backups/<facility>/<YYYY-MM-DD>/photos/<file>.jpg      each photo, once safely stored on the device
LOTO Backups/<facility>/<YYYY-MM-DD>/units_<collector>.json that day's saved units, kept current
LOTO Backups/<facility>/<YYYY-MM-DD>/photos_<collector>.csv which of their photos is which unit / source
LOTO Backups/<facility>/<today>/inprogress_<collector>.json the unit on the form (its own small file)
LOTO Backups/<facility>/<YYYY-MM-DD>/export/…               exports sent with "Export to SharePoint"
```

This folder is the API that writes them: four small functions in the LOTO
Azure Static Web App (the same site that serves the web app). The devices hold
**no Microsoft credentials** — the functions do, and write only inside the
backup folder of one SharePoint site.

| Function | Who may call it | What it does |
|---|---|---|
| `upload` | a web sign-in or an iPad device pass, `@hgsengineeringinc.com` only | GET: is it set up, who is asking. POST: writes one file (≤ 8 MB) — refused unless the bytes match the SHA-256 the app sent, and answered only once SharePoint reports the same size and QuickXorHash for what it stored |
| `upload-session` | same | starts a large upload (an export ZIP): a short-lived URL for that one file; the device sends the pieces straight to SharePoint and checks the finished file's hash itself |
| `device-token` | a web sign-in only (Static Web Apps enforces it) | step 1 of the iPad sign-in: a one-time code, 5 minutes, bound to the app's challenge |
| `device-pass` | anyone holding a fresh code **and** the app's verifier | step 2: the iPad's device pass — upload-only, expires (30 days by default) |

The iPad app can't use the web sign-in's cookie (it isn't a web page on this
site), so it signs in once through `backup-link.html` in an in-app browser
sheet and gets a device pass (OAuth PKCE — a caught code is useless without the
verifier that never leaves the app). See `shared/graph.js`, "The device pass".

## One-time setup (an administrator)

1. **SharePoint.** Create a site for the backups — e.g. *LOTO Field Backup* —
   and in its **Documents** library a top folder **`LOTO Backups`**. Keep the
   library's **version history on** (the default): a file the app replaces
   (a day's unit file, say) keeps its earlier versions. Keep this site away
   from the folders loto-web's nightly SharePoint sync imports from.

2. **Register an app** — Entra ID → App registrations → New registration:
   *LOTO Collector Backup*, single tenant, no redirect URI (it signs in as
   itself).

3. **Permission** — API permissions → Add → Microsoft Graph → **Application**
   permissions → **`Sites.Selected`** → then **Grant admin consent**.

4. **Give it write access to that one site** — in Graph Explorer, signed in as a
   SharePoint or Global admin who has consented to `Sites.FullControl.All`:
   ```
   GET  https://graph.microsoft.com/v1.0/sites/hgsengineeringinc.sharepoint.com:/sites/<site-path>
        → note the site "id"
   POST https://graph.microsoft.com/v1.0/sites/<site id>/permissions
        { "roles": ["write"],
          "grantedToIdentities": [ { "application": { "id": "<the app's client id>", "displayName": "LOTO Collector Backup" } } ] }
   ```
   (The Azure CLI can't make the POST — its Graph token lacks the scope.)

5. **A client secret** — Certificates & secrets → New client secret. Copy the
   value once. **Put its expiry date in a calendar**: when it lapses, every
   upload fails (the badge says so) until a new one is set.

6. **Settings** — Azure portal → the LOTO Static Web App → Configuration →
   Application settings (values never go in this public repo):

   | Setting | Value |
   |---|---|
   | `GRAPH_TENANT_ID` | the HGS Entra tenant id |
   | `GRAPH_CLIENT_ID` | the app registration's client id |
   | `GRAPH_CLIENT_SECRET` | the secret from step 5 |
   | `GRAPH_SITE_ID` | the site id from step 4 (`hostname,guid,guid`) |
   | `GRAPH_ROOT_FOLDER` | `LOTO Backups` |
   | `ALLOWED_DOMAIN` | `hgsengineeringinc.com` (the default) |
   | `DEVICE_PASS_SECRET` | a long random string — e.g. `openssl rand -base64 48` |
   | `DEVICE_PASS_DAYS` | optional — how long an iPad stays signed in (default 30, at most 90) |
   | `DEVICE_PASS_NOT_BEFORE` | optional — an ISO date/time; passes issued before it are refused |

   Optional instead of the plain site settings: `GRAPH_DRIVE_ID` (one library
   directly) or `GRAPH_TARGETS` (a JSON list of destinations — see `shared/graph.js`).

7. **Deploy** — the web release that brings build 101 also brings this folder,
   `backup-link.html`, `staticwebapp.config.json` (its `/api/device-token`
   route, `platform.apiRuntime`, the 401 override) and the workflow's
   `api_location: "api"`. `/api/upload`, `/api/upload-session` and
   `/api/device-pass` must **not** be limited to signed-in web visitors: the
   iPad calls them with its device pass. Each function checks the caller itself.

8. **Check it** — web: open the Azure address → Settings → SharePoint backup →
   turn it on → Sign in with Microsoft → **Test** (writes
   `LOTO Backups/<facility>/<today>/test_<collector>.txt`). iPad: the same in the
   app; Sign in opens a sheet, then comes back to the app.

## Revoking

- **A lost iPad** (or every iPad): set `DEVICE_PASS_NOT_BEFORE` to now — every
  device pass issued before then stops working; the others sign in again. A new
  `DEVICE_PASS_SECRET` does the same. A pass can only ever add files to the
  backup folder; it can't read or delete anything.
- **A person**: disable their Entra account — no new sign-in, no new pass. A pass
  already on their iPad keeps working until it expires (30 days by default); to
  stop it at once, also set `DEVICE_PASS_NOT_BEFORE` (everyone else signs in again).
- **Everything**: remove the site permission (step 4) or the secret.

## Tests

- `node --test tests/api/api.test.js` — these functions, with Graph faked (the
  QuickXorHash is checked against the libqxh reference).
- `node tests/fuzz/backup_e2e.mjs` — the web app end to end against these real
  functions (`tests/fuzz/backup_e2e_server.mjs`, a local stand-in: only the
  Microsoft sign-in, Graph and SharePoint are faked).
- `tests/fuzz/run-sim-backup.sh` — the iPad app's native path, in the Simulator,
  against the same stand-in.

Ported from the NPS Audit Photo Collector's live backup (v4.12). Kept close to
it; the LOTO differences are the device pass, and the hash checks that make
"backed up" mean SharePoint confirmed the bytes.
