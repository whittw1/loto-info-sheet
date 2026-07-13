# LOTO Field Collector — Architecture Reference

**Date:** 2026-07-13 (rev 2 — added `lotoId` field to entries)
**Repo:** [github.com/whittw1/loto-info-sheet](https://github.com/whittw1/loto-info-sheet)
**Prior standalone doc:** `LOTO_Integration_Architecture.md` in `~/Desktop/Claude Apps/LOTO Information Sheet App/` (April 2026, pre-iOS work — kept for reference, superseded by this file).

---

## 1. What this app is

A **single-page HTML+JS Progressive Web App** used on iPads / mobile devices in the field to capture LOTO (Lockout/Tagout) equipment data — energy sources, verification methods, isolation devices, photos, and annotated overhead diagrams — one equipment entry at a time.

It has **no backend, no database, and no user accounts**. Everything runs client-side in the browser (or in a Capacitor WebView on iOS). Data lives in `localStorage` + `IndexedDB` on the device until the user exports it.

The exported ZIP / JSON is the interop surface: downstream systems (see [`loto-web`](../loto-web) — the procedure generator) ingest via those files.

---

## 2. Live URLs and distribution channels

| Channel | URL / Location | Status | Notes |
|---|---|---|---|
| **Azure Static Web Apps (primary web)** | `https://delightful-bay-02569820f.7.azurestaticapps.net/` | Auto-deploys on push to `main` | Proper cache headers on `sw.js` / manifest / HTML — fixes SW-update propagation issue |
| **GitHub Pages (legacy web)** | `https://whittw1.github.io/loto-info-sheet/` | Kept alive for legacy PWA installs | Same content as Azure; different origin means different storage bucket |
| **iOS / TestFlight** | `com.hgsengineering.lotofieldcollector` | Distributed via TestFlight, wrapped by Capacitor 8 | Vision-framework OCR, native share-sheet exports |
| **FL alias URL** | `.../FingerLakes_Information_Sheet.html` | Byte-identical duplicate of `index.html` | Historical URL preserved for legacy bookmarks |

Both HTML files must be updated in lockstep — `FingerLakes_Information_Sheet.html` is `cp`'d from `index.html` on every commit.

---

## 3. Repository layout

```
loto-info-sheet/                              (the GitHub repo)
├── index.html                                (5,900+ lines — the whole app)
├── FingerLakes_Information_Sheet.html        (byte-identical mirror of index.html)
├── sw.js                                     (service worker — network-first cache)
├── manifest.json                             (PWA manifest, main)
├── manifest_fl.json                          (PWA manifest, FL alias)
├── staticwebapp.config.json                  (Azure SWA cache headers + SPA fallback)
├── package.json                              (Capacitor deps + build/sync/open scripts)
├── capacitor.config.json                     (App ID, name, webDir)
├── README.md                                 (user-facing features)
├── ARCHITECTURE.md                           (this document)
├── TODO.md                                   (deferred work)
├── IOS_RELEASE_SETUP.md                      (fastlane + GitHub Action prereqs)
├── .github/workflows/
│   ├── azure-static-web-apps.yml             (Azure deploy on push to main)
│   └── ios-release.yml                       (tag-triggered fastlane pilot upload)
├── assets/                                   (placeholder icon + splash sources)
│   └── make_icon.py
├── www/                                      (build output — gitignored, source for Capacitor)
└── ios/                                      (Capacitor-generated Xcode project)
    ├── App/
    │   ├── App.xcodeproj/                    (MARKETING_VERSION, CURRENT_PROJECT_VERSION)
    │   ├── App/
    │   │   ├── AppDelegate.swift             (custom TextRecognition Vision plugin lives here)
    │   │   ├── Info.plist                    (camera + photo library usage strings)
    │   │   ├── Assets.xcassets/              (icon set + splash imageset)
    │   │   └── public/                       (synced copy of web assets — the WKWebView root)
    │   ├── Base.lproj/Main.storyboard        (points at LotoBridgeViewController)
    │   ├── Gemfile / fastlane/
    │   │   ├── Fastfile                      (beta lane — bump build + archive + upload)
    │   │   └── Appfile
    │   └── CapApp-SPM/Package.swift          (SwiftPM plugin registrations)
```

---

## 4. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend framework** | None — vanilla HTML / CSS / JS in one file | Single-file simplicity, no build step, easy to reason about, no bundler drama |
| **Storage (primary)** | `IndexedDB` (`loto_photos_v3`) via a small custom wrapper | Full-res photo blobs (ArrayBuffers) — much larger than localStorage's ~5 MB |
| **Storage (metadata + fallback)** | `localStorage` (JSON-stringified) | Entry list, form state, photo thumbnails, base64 photo fallback |
| **Offline** | Service worker (`sw.js`) with network-first strategy + explicit `CACHE_NAME` version bump on every deploy | Bumped every change so users don't get stuck on stale HTML |
| **ZIP generation** | JSZip 3.10.1 (loaded from cdnjs) | Client-side ZIP creation for exports |
| **XLSX generation** | ExcelJS 4.4.0 (loaded from cdnjs) | Per-cell styling (SheetJS community can't do this) |
| **Sketch** | Inline SVG diagrams + HTML5 Canvas overlay with pointer events (Apple Pencil supported via `setPointerCapture`) | 20 pre-drawn equipment diagrams; user draws + drops labels on top |
| **iOS wrapper** | Capacitor 8.3 (WKWebView) | Wraps `index.html` as a native app for TestFlight distribution |
| **iOS OCR** | Custom Capacitor plugin using Apple Vision (`VNRecognizeTextRequest`) | Registered in `AppDelegate.swift`; better English-print accuracy than ML Kit, no external SDK |
| **iOS file share** | `@capacitor/filesystem` + `@capacitor/share` | Native share-sheet — required for iOS since `<a download>` is a no-op in WKWebView |

---

## 5. Data model — the shape of a saved entry

The `savedEquipment[]` array is where everything lives. Each entry is a plain JS object. Below is the exact shape written by `saveAndNew()` — this is what shows up in the **JSON backup export** and is the format a downstream ingester (like `loto-web`) reads.

```typescript
// One equipment entry
interface SavedEntry {
  id: number;                    // Date.now() — unique within the session (will
                                 // migrate to crypto.randomUUID() in a follow-up
                                 // step per the improvement plan §2.1)
  equipType: string;             // e.g. "Air Handler", "CHW Pump", "ATS"
  equipName: string;             // user-provided; auto-filled from equipType on selection
  lotoId?: string;               // Optional office-inventory LOTO ID
                                 // (e.g. "BATH-AHU-001") — maps to
                                 // loto-web Equipment.loto_id for dedup on
                                 // ingest. Blank string when the user
                                 // hasn't provided one; loto-web ingester
                                 // treats blank as "use UUID instead".
  equipRoom: string;
  equipBuilding: string;         // e.g. "Building A" — see building presets below
  template: string;              // e.g. "AHU - Steam", "Water Heater - Electric"
  tiedTo: string;                // FK-ish reference to another equipment's name (optional)
  tiedToName: string;            // display text for the tied-to
  notes: string;
  sources: EnergySource[];       // 1..N sources (see below)
  photoCount: number;            // convenience — count of photos with a timestamp
  timestamp: string;             // "10:35 AM" — display only
  savedAt: string;               // ISO datetime — used for date filtering / sorting
  photos: PhotosBySlot;          // see photos section
  miscPhotos: MiscPhoto[];       // additional non-slot photos
  sketch: SketchData | null;     // annotated overhead diagram (optional)
}

// One energy source within an equipment entry
interface EnergySource {
  energySource: string;          // e.g. "Electrical 208V", "LPS 10 PSI", "Condensate In"
  deviceType: string;            // e.g. "Disconnect", "Gate Valve", "Rotating"
  deviceId: string;              // free-text device identifier (e.g. "Pump 3", "V-201")
  quantity: number;              // 1..8
  location: string;              // e.g. "On Equipment", "Building A / MCC", or a custom string
  verification: string;          // e.g. "Controls", "GaugeOnly - Hot"
  duplicate: "Yes" | "No";       // Yes = photo captured on another source (dedup marker)
  detail: string;                // short free-text label displayed on the sketch (LR, TL, …)
  auto?: boolean;                // true if source was auto-populated by template
  noPhoto?: boolean;             // photo slot hidden for this source
  collapsed?: boolean;           // UI state (source card collapsed)
  linkedTo?: LinkedSourceRef;    // link to another equipment's source (shared valve/breaker)
  _customEnergy?: boolean;       // internal — user typed a custom energy source
  _customDevice?: boolean;
  _customLoc?: boolean;
}

interface LinkedSourceRef {
  equipName: string;
  equipBuilding: string;
  equipRoom: string;
  sourceIndex: number;
  sourceLabel: string;           // e.g. "S-3" — inherited from the linked equipment's diagram
  energySource: string;
  deviceType: string;
}

interface PhotosBySlot {
  equip_main?:      { dbKey: string; thumbnail: string; timestamp: string; fileType?: string };
  equip_dataplate?: { dbKey: string; thumbnail: string; timestamp: string; fileType?: string };
  equip_ee?:        { dbKey: string; thumbnail: string; timestamp: string; fileType?: string };
  ["source_" + N]?: { dbKey: string; thumbnail: string; timestamp: string; fileType?: string };
  // dbKey → look up the full-res ArrayBuffer in IndexedDB (loto_photos_v3)
  // thumbnail → data-URL sized preview (embedded in localStorage / backup JSON)
}

interface MiscPhoto {
  dbKey: string;
  thumbnail: string;
  fileType: string;
  timestamp: string;
}

interface SketchData {
  diagramKey: string;            // e.g. "ahu", "pump", "general" — selects the SVG template
  strokes: Stroke[];             // canvas ink layer
  labels: Label[];               // draggable energy-source labels (E-1, S-3, …)
}
```

### Building presets

Building dropdown is currently **`Building A`, `Building B`, `Building C`** plus `** Custom Building **` (free text). Previous iterations had Bath / Canandaigua / Finger Lakes number lists; those have been superseded per merged v7.0 codebase. Change the preset list by editing the `<select id="equipBuilding">` block in `index.html` around line 447.

### Equipment types

30+ predefined types listed in `DATA.equipmentTypes` (line ~775). Each type may map to:

- **`EQUIPMENT_AUTO_SOURCES[type]`** — sources added on equipment-type selection (before the template applies)
- **`EQUIPMENT_TEMPLATE_MAP[type]`** — one or more template names; single-template types auto-apply, multi-template types trigger the template-picker modal
- **`EQUIPMENT_EXTRA_SOURCES[type]`** — additional sources appended after the template applies (used when multiple equipment types share one template but each needs a slightly different set — e.g. Domestic HW Pump adds DHW In on top of Standard Pump)
- **`EQUIPMENT_VOLTAGE_OVERRIDE[type]`** — overrides the template's electrical voltage per equipment type

Equipment types with **their own voltage prompt** at equipment-type selection: `ATS`, `Generator`, `Chiller`. Their prompt (`VOLTAGE_PROMPT_CONFIG[type]`) is separate from the template-level voltage prompt.

### Templates

Templates define a set of auto-populated sources for a specific equipment context (e.g. `AHU - Steam` = Kinetic + Electrical 208V VFD source). They're the primary way pre-population happens.

- **`DATA.templates[]`** — the full list of template names
- **`TEMPLATE_AUTO_SOURCES[name]`** — the sources the template pushes
- **`TEMPLATE_DIAGRAM_MAP[name]`** — the SVG diagram key the sketch uses
- **`TEMPLATE_VOLTAGE_OVERRIDES[name]`** — restrict the voltage prompt (e.g. Cooling Tower → `[120V, 208V, 480V]` only)
- **`TEMPLATE_SKIPS_VOLTAGE_PROMPT`** — templates whose voltage is fixed by design (Air Dryer, Day Tank, Water Heater - Steam, Water Heater - Gas — suppresses the prompt)
- **`EQUIPMENT_TEMPLATE_LABELS[type]`** — friendlier label overrides for the template-picker modal (e.g. Dishwasher shows "Electric / Steam" instead of "Water Heater - Electric / Water Heater - Steam")

### Verifications

- **`DATA.verificationTypes[]`** — the master list of verification labels (~30 entries)
- **`DEVICE_VERIFICATION_MAP[device]`** — per-device verification options; valve devices use placeholder tokens (`_temponly`, `_gauge`, `_gaugeonly`, `_drain`) that get resolved to concrete labels based on the source's temperature class
- **`HOT_ENERGY_SOURCES`** — energy source prefixes that get the `- Hot` suffix on valve verifications (LPS, MPS, HPS, Steam, HHW, DHW, Feedwater, Condensate)
- **`CHW_ENERGY_SOURCES`** — energy source prefixes that get the `- CHW` suffix (`CHW` only)
- **`HOT_VERIFICATION_EQUIP`** — equipment types that always offer Hot variants (Domestic Water Heater)
- **`SOURCE_EXTRA_VERIFICATIONS[prefix]`** — additional verifications unioned in for specific source prefixes (Fuel Oil + Natural Gas both add `Controls`)

---

## 6. Storage — how data lives on the device

### IndexedDB — `loto_photos_v3`

Two object stores:

| Store | Key | Value | Used for |
|---|---|---|---|
| `photos` | `dbKey` (string) | `{ data: ArrayBuffer, fileType: string, timestamp: string }` | Full-res photo bytes — the actual JPEG files |
| `metadata` | key string | any JSON | `saved_equipment` (the main list), other app state |

Photo `dbKey` format: `photo_${equipNameSanitized}_${slotId}_${Date.now()}` (see `photoDBKey()` at index.html line ~4000).

### localStorage

Kept small because iOS Safari can be miserly with it. Holds:

| Key | Content |
|---|---|
| `loto_saved` | Legacy — migrated to IndexedDB on load. Cleared after successful migration. |
| `loto_current_state` | Legacy — same migration path. |
| `photoSeqNext` | Next photo-sequence starting number for filename generation |
| `photo_full_<dbKey>` | Base64 fallback copy of a photo, in case IndexedDB write failed |

### The "belt-and-suspenders" photo fallback

When photo capture happens: try to save to IndexedDB. If that fails (iOS Safari edge cases), also stash a base64 copy in `photo_full_<dbKey>` in localStorage. On export, if IndexedDB doesn't have the photo, look up the localStorage fallback and use that instead. Post-export cleanup removes the fallback copies.

### Migrations on load

`loadAll()` runs two migrations on every startup:

1. **`ENERGY_SOURCE_RENAMES`** (`CA In` → `Compressed Air In`, etc.) — updates saved entries in place so old data still matches current dropdown values
2. **`migrateToggleablePhotoFlags`** — clears `noPhoto: true` on Kinetic sources from older saves so the toggle button controls them cleanly

Both write back to IndexedDB immediately if they changed anything.

---

## 7. Exports — the integration surface

### ZIP export (`Export` button → `runCombinedExport`)

Output filename: `LOTO_Export_YYYY-MM-DD[_filterdate].zip`

Contents:

| Filename pattern | Description |
|---|---|
| `LOTO_FieldData_YYYY-MM-DD.csv` | Full CSV of every entry × source pair (see columns below) |
| `Information_Sheet_YYYY-MM-DD.xlsx` | Styled Excel workbook (via ExcelJS) — one sheet per entry with photo filename references |
| `{EquipName}_main.jpg` | Main equipment photo |
| `{EquipName}_dataplate.jpg` | Data plate photo |
| `{EquipName}_ee.jpg` | EE number photo |
| `{EquipName}_source{N}.jpg` | Per-source photos (N is 1-indexed) |
| `{EquipName}_diagram.png` | Annotated overhead sketch (only if the entry has sketch data) |

Equipment names in filenames are sanitized: non-alphanumeric characters (except `_` and `-`) are replaced with `_`.

### CSV column layout (`LOTO_FieldData_*.csv`)

One row per (equipment, source) pair. The equipment metadata repeats across all its sources:

```
Equipment Type, Equipment Name, LOTO ID, Room, Building, Template,
Tied To, Tied To Equipment Name, Notes, Source #, Energy Source,
Device Type, Device ID, Quantity, Location, Duplicate, Verification,
Photo Filename, Detail, Linked To, Main Photo Filename,
DataPlate Photo Filename, EE Photo Filename, Diagram Filename,
Misc Photo Filenames
```

The `LOTO ID` column carries `SavedEntry.lotoId` (blank if the user
didn't enter one). It's the intended dedup key on the loto-web
side — see §10 for how ingest should reconcile blank vs. populated.

`Linked To` is populated when a source is linked to another equipment's source (see `LinkedSourceRef`).

### XLSX Information Sheet

Professional formatted `.xlsx` mirroring the paper "LOTO Information Sheet" form used by field crews. Header rows for the equipment metadata, a 10-row source table (padded with blanks if fewer than 10 sources), photo filename references in the detail cell, page numbering, and linked-source markers. Styled per-cell via ExcelJS.

### JSON backup (`Backup` button → `saveBackup`)

The **primary integration surface**. Format:

```json
{
  "version": 1,
  "exported": "2026-06-17T14:23:45.123Z",
  "entries": [
    { "id": 1687001111000, "equipType": "Air Handler", "equipName": "AHU-1", ... }
  ]
}
```

`entries[]` is the array of `SavedEntry` objects **stripped of photo binary data** — thumbnails and `dbKey` references are preserved, but the ArrayBuffer bytes are not. That's why the JSON stays small (a full-day-of-entries backup is typically < 1 MB).

**For a downstream ingester** — the JSON gives you all the structural data (equipment, sources, sketches). The photo bytes live only in the ZIP export.

### File save behavior — web vs iOS

Both `runCombinedExport` and `saveBackup` go through **`saveOrShare(blob, filename, mimeType)`** (index.html line ~5490):

- **Web (browser)** — classic `URL.createObjectURL(blob)` + `<a download>` + `.click()`. Works in Chrome / Safari / Firefox.
- **iOS (Capacitor WebView)** — `<a download>` is silently ignored in WKWebView. `saveOrShare` writes the blob to the app's Cache directory via `@capacitor/filesystem` and then opens the **native iOS share sheet** via `@capacitor/share`. User picks Save to Files, AirDrop, email, or any share-sheet destination.

Runtime detection is via `Capacitor.isNativePlatform()`.

---

## 8. iOS specifics

### Capacitor wrapper

- **Capacitor 8.3** with Swift Package Manager (no CocoaPods)
- WebView roots at `ios/App/App/public/` — synced from `www/` by `npx cap sync ios`
- Bundle ID `com.hgsengineering.lotofieldcollector`; display name "LOTO Collector"

### Custom Vision-framework OCR plugin

`AppDelegate.swift` defines `TextRecognition` — a `CAPPlugin` + `CAPBridgedPlugin` class that wraps `VNRecognizeTextRequest`. Exposes one JS method:

```javascript
Capacitor.registerPlugin('TextRecognition');
await TextRecognition.recognizeText({ base64Image })  // → { text, blocks }
```

Registered natively via a `LotoBridgeViewController: CAPBridgeViewController` subclass (in the same file), which calls `bridge?.registerPluginInstance(TextRecognition())` in `capacitorDidLoad()`. Main.storyboard's root VC points at that class so it initializes at app launch.

Used by the "📷 Scan" buttons next to Equipment Name / Device ID / Source Detail — captures a photo via `@capacitor/camera`, hands the base64 to `TextRecognition`, drops the concatenated text into the input.

Hidden on the web via `body.web-platform .scan-btn { display: none }` — a body-level class set in `init()` from `Capacitor.isNativePlatform()`.

### iOS Info.plist usage strings

Required by Apple even though the app only uses `<input type="file" capture="environment">`:

- `NSCameraUsageDescription` — photo capture + OCR
- `NSPhotoLibraryUsageDescription` — attaching existing photos
- `NSPhotoLibraryAddUsageDescription` — saving exported bundles
- `ITSAppUsesNonExemptEncryption` = `false` — bypasses App Store Connect encryption prompt (no custom crypto)

### Versioning

- `MARKETING_VERSION` — user-facing (currently `1.2`); bump for user-visible releases
- `CURRENT_PROJECT_VERSION` — build number; **must be strictly increasing** for the same `MARKETING_VERSION` or Apple rejects the upload. Bumped by +1 on every commit that goes to TestFlight. Both Debug + Release entries in `project.pbxproj` must match.

### Service worker cache

`sw.js` uses network-first for HTML/JSON, cache-first for static assets. **`CACHE_NAME` must be bumped every time cached files change** — otherwise the WebView serves stale HTML on next launch. Currently `loto-collector-v7.37`.

---

## 9. Deployment topology

### Web (auto-deploys on push to `main`)

`.github/workflows/azure-static-web-apps.yml` — one job that runs Azure's `static-web-apps-deploy@v1` action. Config in the workflow: `app_location: "/"`, `skip_app_build: true`. That means Azure ignores everything Node-related (no `npm install`, no `www/` step) and just uploads the repo root as static files.

`staticwebapp.config.json` sets `Cache-Control: no-cache, no-store, must-revalidate` on `sw.js`, both HTML files, and both manifests. That's what fixes the "user stuck on old SW" bug. GitHub Pages is unaffected (no cache headers control) but users on that URL clear more slowly.

### iOS (manual archive today; automated tag-triggered flow ready)

Today:
1. Edit `index.html`
2. `npm run sync` — copies `index.html`, `FingerLakes_Information_Sheet.html`, `sw.js`, both manifests into `www/`, then `cap sync` copies `www/` into `ios/App/App/public/`
3. Bump `CURRENT_PROJECT_VERSION` in `project.pbxproj` (both Debug + Release)
4. Bump `CACHE_NAME` in `sw.js` if any cached file changed
5. `npm run open` → Xcode → Product → Archive → Distribute → Upload
6. ~10 min later Apple emails "build ready to test"
7. iPad TestFlight app → Update

Automated (once secrets are set — see `IOS_RELEASE_SETUP.md`):

```bash
git tag ios-v1.3 && git push --tags
# GitHub Action runs fastlane on a macos-15 runner
# ~12 min later, TestFlight has the build
```

The workflow lives in `.github/workflows/ios-release.yml`. Uses `fastlane pilot upload` with an App Store Connect API key. Requires 6 GitHub secrets (Apple API key ID/issuer/content, iOS Distribution .p12 + password, KEYCHAIN_PASSWORD) — one-time setup.

---

## 10. Integration notes — for downstream ingesters (e.g. `loto-web`)

The field collector has no server-side API. All interop happens via files.

### Recommended interop path

**Upload the ZIP export to a `POST` endpoint on the receiving system.** The ZIP contains:

- The JSON-equivalent data as CSV + XLSX
- All photo files (main, data plate, EE, per-source, misc, diagram)
- Filenames are stable and equipment-name-anchored

Best single ingestion strategy:

1. Field user completes their day, taps **Export** → gets ZIP in Files (iOS) or downloads folder (web)
2. From the iOS share sheet OR the web browser, user posts the ZIP to a new endpoint on the receiving system (e.g. `POST /api/import/from-field-collector` in `loto-web`)
3. Receiving system unpacks the ZIP, reads `LOTO_FieldData_*.csv` (or ideally a `.json` variant if the field collector adds one), reads photo files, and maps to its own schema

### Field mapping to loto-web `Equipment` + `EnergySource`

Field collector's shape lines up cleanly with `loto-web/models.py`. Roughly:

| Field collector | loto-web |
|---|---|
| `lotoId` (when non-empty) | `Equipment.loto_id` — the dedup key |
| `equipName` | `Equipment.name` |
| `equipType` | `Equipment.equipment_type` |
| `equipBuilding` | `Equipment.building` |
| `equipRoom` | `Equipment.room` |
| `template` | `Equipment.template` (assuming column exists / needs adding) |
| `notes` | `Equipment.notes` (add if missing) |
| `sources[].energySource` | `EnergySource.source_type` |
| `sources[].deviceType` | `EnergySource.device` |
| `sources[].quantity` | `EnergySource.device_qty` |
| `sources[].location` | `EnergySource.location` |
| `sources[].verification` | `EnergySource.verification` |
| `sources[].duplicate` | `EnergySource.dup_photo` |
| `sources[].detail` | (no direct target — surface as note/tag) |
| Source's ordering in the array | `EnergySource.sort_order` |
| Photo bytes (from ZIP) | `Photo` — new UUID + file storage |

Missing on the field-collector side: `hospital_id` (the field app doesn't know about hospitals — the user picks the hospital at ingestion time on the loto-web side).

### Dedup between the manual (office) and field-collector paths

Because loto-web already keys `Equipment` rows by `loto_id` (see
`import_data.py` line 786), populating the field-collector's new
`lotoId` field is the single natural merge point between the two
ingest paths:

- **Office hand-fills XLSX with `loto_id = "BATH-AHU-001"`** → row created.
- **Field crew captures the same AHU-1 with `lotoId = "BATH-AHU-001"`** → same `loto_id` matches → row is updated in place, not duplicated.
- **Field crew leaves `lotoId` blank** → the ingester should fall back to the entry UUID as `loto_id` (creating a distinct row). Admin can merge later via the loto-web UI.

Recommendation for the ingester: if `entry.lotoId` is non-empty use it as `Equipment.loto_id`; otherwise use `"field-" + entry.id` (or the UUID once §2.1 lands) so the row is still uniquely keyed but recognisable as origin=field-app.

### Auth options for automating the upload

The field collector has no login / no user identity. Bridging to loto-web's Entra ID auth:

1. **Share-sheet handoff** (simplest) — user hits Export on the field app, picks "loto-web upload page" from the iOS share sheet, their already-authed browser session on loto-web receives it. Zero new failure modes on the field app side.
2. **API key** — issue the field app a long-lived API key stored in Settings. Field app POSTs directly to `/api/import/from-field-collector` with the key. Truly automatic. Need to think about key rotation.
3. **Full OAuth in the field app** — most robust; real work; probably overkill for a field-data-entry app.

For iOS: 1 is a natural fit because the share sheet is the standard iOS pattern. For a fully-headless flow, 2 is the pick.

---

## 11. Where things live in code (spot check)

Approximate line numbers (may drift as edits accumulate):

| Concern | index.html line |
|---|---|
| Global mutable state (`sources`, `photos`, `savedEquipment`, `lastAutoFilledEquipName`) | ~1197 |
| `DATA.equipmentTypes`, `energySources`, `deviceTypes`, `locations`, `verificationTypes`, `templates` | ~775 |
| `EQUIPMENT_AUTO_SOURCES` | ~1058 |
| `EQUIPMENT_TEMPLATE_MAP` | ~1470 |
| `TEMPLATE_AUTO_SOURCES` | ~3290 |
| `TEMPLATE_VOLTAGE_OVERRIDES` / `SKIPS_VOLTAGE_PROMPT` | ~3200 |
| `SOURCE_KINDS_WITH_PHOTO_TOGGLE` / `EQUIPMENT_ALLOW_PHOTO_FOR_SOURCE` | ~1000 |
| `applyTemplate()` | ~3060 |
| `equipTypeChanged()` | ~1215 |
| `handleEquipTypeChange()` (auto-fill Equipment ID/Name) | ~3450 |
| `renderSources()` (source cards, photo slot toggle) | ~3540 |
| `renderSavedPanel()` (saved list + filter bar) | ~4735 |
| `saveAndNew()` — canonical entry shape | ~4625 |
| `runCombinedExport()` — ZIP export | ~4900 |
| `saveBackup()` — JSON backup | ~5140 |
| `saveOrShare()` — unified file save helper | ~5490 |
| `scanTextToField()` — camera + OCR helper | ~5580 |
| `init()` — startup body-class + dropdown population | ~1110 |

---

## 12. Suggested next steps for anyone building the ingestion side

1. **Read this document + `LOTO_Web_App_Architecture.md`** side by side.
2. **Test with a real backup** — export a day of entries as JSON from the field app, look at the shape, then map fields.
3. **Prototype the ZIP unpacker first** (photos + CSV/JSON is where most edge cases live).
4. **Reuse the SharePoint import path in `loto-web`** as a reference for auth + validation patterns — don't reinvent.
5. **Add the new endpoint (`POST /api/import/from-field-collector`) to `loto-web/app/routers/import_data.py`** — it's the natural home.
6. **On the field-app side**, add a "Send to Procedure Generator" option to `saveOrShare` that hits the endpoint (or opens a share-sheet target pointed at it).

---

*This document is a living reference. When behavior changes materially — new equipment type patterns, new export formats, new iOS plugin, changes to the JSON schema — update the relevant section and the top-of-file date.*
