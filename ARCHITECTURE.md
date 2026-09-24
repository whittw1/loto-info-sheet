# LOTO Field Collector — Architecture Reference

**Date:** 2026-09-24 (rev 14 — **read §6's "Open photo-integrity defects" before touching photo code or going to the field.** A max-effort code review of build 88 (nine finder angles, every candidate independently verified, plus a gap sweep) found 28 photo-integrity defects — 20 confirmed, 4 plausible, 4 unverified, none refuted, none yet fixed — documented by root cause: index-keyed source photos (template/type changes silently misattach or drop photos), three unguarded async photo writers, split form identity, launch-time orphan re-attach, and unverified storage writes; plus field rules until fixed. §6 also gains what a stored photo is (no EXIF survives the canvas) and the deferred off-app backup design, and **the regression-suite instruction now carries a hard warning: its reset erases real data, so never run it where field data lives.** §2 records which build each channel carries — the web (`main`) is on build 86 and still has the photo-destroying retake-delete. §3 adds `tests/` and the public-repo rule; §9 documents promoting builds to the web via the `loto-main-web` worktree; new §13 points to the recovery tooling and the Lumix frame-number rule. Prior: rev 13 — builds 83–88, the photo-store rebuild and its aftermath. **§6 is the section to read.** Build 83 re-keyed the photo store on entry UUIDs after name-derived keys corrupted ~1,100 photo slots across five VA facilities, adding migration/quarantine, a hard export duplicate gate, capture-time hash warnings, Photo Audit and entry-retention guards. Builds 84–88 then fixed what 83 got wrong or left rough: 84 made the migration done-flag conditional on the stores being readable; 85 scoped and chunked the quarantine export; 86 scoped Photo Audit to today's work; **87 removed the retake/misc-removal deletes that were destroying live photos**, added the in-flight capture guard and `reattachOrphanedPhotos()`; 88 gave duplicated sources their own `sourceId` and recorded the copied photo as a `{dupOf}`. The regression suite is now 12 tests and is the gate on any photo-path change. §10 gains the office `Information_Sheet_MMDDYY.xlsx` field-app layout spec — geometry, the bare-reference photo rule, the `photo_detail` `String(20)` position-marker trap — and the cross-date survey problem that stranded 71 Atlanta photos. §8 versioning and §11 code map refreshed to build 88 / cache v7.84. Prior: build 79: simplified verification — water sources get Drain/Gauge checkboxes synthesizing the same canonical strings, electrical defaults to Controls, Settings toggle reverts to classic pickers (§5.4c). Prior: rev 10 — builds 74–77: durable photo storage + integrity. §6 rewritten: full-res photos now write to the **native filesystem** (Capacitor Filesystem, `DATA/loto_photos/`) with IndexedDB/localStorage as fallbacks, after iOS storage eviction silently lost 74 photos on 2026-08-04; capture-time save verification, export integrity guard, header integrity badge, collision-proof photo keys. §7: local-day date semantics + filtered-day export stamps; reuse-a-photo share model with export dedup; per-entry `exportedAt`/`exportId` stamps. §5.5: export-status badges + delete guards with "Export these first" escape hatch. New template: Unit Heater - Natural Gas. Prior: rev 9 — §5 registry inventory expanded. Named the equipment-side registries the doc had glossed over (`EQUIPMENT_HAS_OWN_VOLTAGE_PROMPT`, `EQUIPMENT_PROMPT_FOR_TEMPLATE`, `EQUIPMENT_DIAGRAM_OVERRIDE`, `CONDENSATE_AUTO_EQUIP`, `CUSTOM_EQUIP_KEYWORD_TEMPLATE`) plus a new "Other registries (misc but load-bearing)" bullet block covering `SOURCE_DEFAULTS`, `ENERGY_DEVICE_MAP`, `ENERGY_KEYWORD_TEMP`, `ENERGY_LABEL_PREFIX/COLORS`, `PHOTO_DEFAULTS`, `SKETCH_DIAGRAMS`, `SAVED_FILTERS`, `HOSPITALS`. Prior revs: rev 8 = ingester live; rev 7 = data-entry UX pass; rev 6 = ZIP restructure.)
**Repo:** [github.com/whittw1/loto-info-sheet](https://github.com/whittw1/loto-info-sheet)
**Prior standalone doc:** `LOTO_Integration_Architecture.md` in `~/Desktop/Claude Apps/LOTO Information Sheet App/` (April 2026, pre-iOS work — kept for reference, superseded by this file).

---

## 1. What this app is

A **single-page HTML+JS Progressive Web App** used on iPads / mobile devices in the field to capture LOTO (Lockout/Tagout) equipment data — energy sources, verification methods, isolation devices, photos, and annotated overhead diagrams — one equipment entry at a time.

It has **no backend, no database, and no user accounts**. Everything runs client-side in the browser (or in a Capacitor WebView on iOS). Entry data lives in `IndexedDB` + `localStorage`; full-resolution photos live on the **native filesystem** on iOS (with IndexedDB/localStorage as fallbacks — see §6) until the user exports.

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

### Which build each channel carries (checked 2026-09-24)

| Channel | Source branch | Build | Photo-safety status |
|---|---|---|---|
| iOS / TestFlight | `ios-testflight-scaffold` | **88** (cache v7.84) | Current line. Each build must be archived from Xcode by the user — confirm the device header reads `b88`. |
| Azure SWA + GitHub Pages (web) | `main` | **86** (cache v7.82) | ⚠ **Behind, and unsafe.** Still contains the build-83 retake-delete (`deletePhotoFromDB(supersededKey)` in `handlePhoto`), which destroys a saved entry's photo when a retake is discarded — the defect build 87 removed. Build 88 is staged, uncommitted, in the promotion worktree (§9). |

**The web build is used in the field** — Bath VAMC (April 2026) was collected entirely on it — so a crew may be on either channel. Treat the two as one release: never leave `main` behind a photo-safety fix. To check what a channel carries: `git show origin/main:index.html | grep -o 'b[0-9]*</span>'`, or read the header on the device.

---

## 3. Repository layout

```
loto-info-sheet/                              (the GitHub repo)
├── index.html                                (~9,200 lines — the whole app)
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
├── tests/
│   ├── photo-regression.js                   (browser-injected photo-store regression suite, 12 tests — §6)
│   ├── production_store_scan.py              (read-only quarantine classifier over export bundles)
│   └── production-scan/                      (GITIGNORED — facility-identifying output; never commit)
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

> **This repository is public.** Never commit facility-identifying data — scan
> reports, inventories, export bundles, photos. Facility scan output was pushed once
> (commit `1420166`, removed in `d799ede`) and remains in history; `tests/production-scan/`
> is now gitignored for that reason.

---

## 4. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend framework** | None — vanilla HTML / CSS / JS in one file | Single-file simplicity, no build step, easy to reason about, no bundler drama |
| **Storage (photos, native)** | Capacitor Filesystem — `DATA/loto_photos/<dbKey>.jpg` | **Primary full-res photo store on iOS since build 75.** App-container files are NOT subject to WebKit storage eviction (which silently destroyed a day's photos in IndexedDB on 2026-08-04) |
| **Storage (photos, web / fallback)** | `IndexedDB` (`loto_photos_v3`) via a small custom wrapper | Primary on the plain web build; fallback on iOS. localStorage base64 is the last resort only when IDB is unavailable |
| **Storage (metadata)** | `IndexedDB` `metadata` store + `localStorage` (JSON-stringified) | Entry list (`saved_equipment`), form state, photo thumbnails |
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
  id: string;                    // crypto.randomUUID() (v4), minted at first save
                                 // via genUuid() — a manual v4 generator is used
                                 // as a fallback on runtimes without
                                 // crypto.randomUUID. STABLE: preserved across
                                 // edits (an edit updates the equipment, it isn't
                                 // a new one) so downstream re-uploads dedupe
                                 // against the same row. Duplicates get a fresh
                                 // id. Old backups may still carry a numeric
                                 // (Date.now()) id — those keep working and are
                                 // preserved on edit; only new entries get UUIDs.
  equipType: string;             // e.g. "Air Handler", "CHW Pump", "ATS"
  equipName: string;             // user-provided; auto-filled from equipType on selection
  lotoId?: string;               // Optional office-inventory LOTO ID
                                 // (e.g. "BATH-AHU-001") — maps to
                                 // loto-web Equipment.loto_id for dedup on
                                 // ingest. Blank string when the user
                                 // hasn't provided one; loto-web ingester
                                 // treats blank as "use UUID instead".
  hospitalCode?: string;         // loto-web Hospital.key (e.g. "Marion",
                                 // "Atlanta - Fort McPherson") the entry was
                                 // captured under. Set from the Settings
                                 // facility picker (localStorage
                                 // `loto_hospital_code`) at save time. Blank
                                 // string when no facility is selected;
                                 // exports fall back to the current setting.
                                 // Maps to loto-web Hospital.key so the
                                 // ingester files equipment under the right
                                 // facility (see §10).
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
  exportedAt?: string;           // ISO datetime of the last completed export that
                                 // included this entry (build 77). Absent = no
                                 // export record on this device. Drives the
                                 // saved-panel export badge + delete guards.
                                 // Survives backup round-trips (normaliseEntry).
  exportId?: string;             // exportId of that export (same UUID as
                                 // manifest.json) — correlates entry ↔ bundle.
}

// One energy source within an equipment entry
interface EnergySource {
  sourceId?: string;             // crypto.randomUUID() (v4), assigned at save
                                 // time via ensureSourceId(). STABLE across
                                 // edits of the parent entry (round-trips through
                                 // the cloned sources); duplicated sources have
                                 // it stripped so they mint fresh ids. Absent on
                                 // sources from pre-UUID backups until re-saved.
                                 // Maps to loto-web EnergySource identity.
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
  equip_main?:      PhotoRef;
  equip_dataplate?: PhotoRef;
  equip_ee?:        PhotoRef;
  ["source_" + N]?: PhotoRef;
}
interface PhotoRef {
  dbKey: string;                 // storage key — resolve via loadPhotoBytes():
                                 // filesystem → IndexedDB → localStorage (§6)
  thumbnail: string;             // data-URL preview (embedded in backup JSON)
  timestamp: string;
  fileType?: string;
  shared?: boolean;              // true when attached via Reuse-a-Photo (build 74)
                                 // — same dbKey as another slot; exported ONCE,
                                 // all refs get the same filename (share model)
  unsaved?: boolean;             // true when the capture-time save FAILED (build
                                 // 75) — slot shows a red "NOT SAVED" badge
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
- **`EQUIPMENT_HAS_OWN_VOLTAGE_PROMPT`** — Set of equipment types whose voltage prompt fires at *equipment-type selection* (via `VOLTAGE_PROMPT_CONFIG[type]`), not at template-apply. Currently `{'ATS', 'Generator', 'Chiller'}`. When one of these fires, the template-level voltage prompt is suppressed.
- **`EQUIPMENT_PROMPT_FOR_TEMPLATE`** — Set of equipment types that always trigger the template-picker modal on selection, even if they have only one mapped template (used to give the user a chance to change their mind — e.g. `Dishwasher`).
- **`EQUIPMENT_DIAGRAM_OVERRIDE[type]`** — force a specific sketch diagram for an equipment type regardless of template choice.
- **`CONDENSATE_AUTO_EQUIP`** — equipment types where selecting a `Condensate *` source auto-fills Gate Valve + Temp Only - Hot on that source (a shortcut for AHU / Heat Exchanger / Water Heater / Unit Heater).
- **`CUSTOM_EQUIP_KEYWORD_TEMPLATE`** — keyword→template suggestion table for **custom** equipment types (`** New Equipment Type **`). Typing "AHU-4" suggests an AHU template; typing "boiler feed" suggests Feedwater Pump. Wired through `handleCustomEquipTypeChange()`.

### Templates

Templates define a set of auto-populated sources for a specific equipment context (e.g. `AHU - Steam` = Kinetic + Electrical 208V VFD source). They're the primary way pre-population happens.

- **`DATA.templates[]`** — the full list of template names
- **`TEMPLATE_AUTO_SOURCES[name]`** — the sources the template pushes
- **`TEMPLATE_DIAGRAM_MAP[name]`** — the SVG diagram key the sketch uses
- **`TEMPLATE_VOLTAGE_OVERRIDES[name]`** — restrict the voltage prompt (e.g. Cooling Tower → `[120V, 208V, 480V]` only)
- **`TEMPLATE_SKIPS_VOLTAGE_PROMPT`** — templates whose voltage is fixed by design (Air Dryer, Day Tank, Water Heater - Steam/Gas, Mini Split, both Elevators, Unit Heater - Natural Gas — suppresses the prompt)
- **`EQUIPMENT_TEMPLATE_LABELS[type]`** — friendlier label overrides for the template-picker modal (e.g. Dishwasher shows "Electric / Steam" instead of "Water Heater - Electric / Water Heater - Steam")

### Verifications

- **`DATA.verificationTypes[]`** — the master list of verification labels (~30 entries)
- **`DEVICE_VERIFICATION_MAP[device]`** — per-device verification options; valve devices use placeholder tokens (`_temponly`, `_gauge`, `_gaugeonly`, `_drain`) that get resolved to concrete labels based on the source's temperature class
- **`HOT_ENERGY_SOURCES`** — energy source prefixes that get the `- Hot` suffix on valve verifications (LPS, MPS, HPS, Steam, HHW, DHW, Feedwater, Condensate)
- **`CHW_ENERGY_SOURCES`** — energy source prefixes that get the `- CHW` suffix (`CHW` only)
- **`HOT_VERIFICATION_EQUIP`** — equipment types that always offer Hot variants (Domestic Water Heater)
- **`SOURCE_EXTRA_VERIFICATIONS[prefix]`** — additional verifications unioned in for specific source prefixes (Fuel Oil + Natural Gas both add `Controls`)

### Other registries (misc but load-bearing)

- **`SOURCE_DEFAULTS[energySource]`** — per-source-kind auto-fill for **device / location / verification** when the user picks an energy source, applied inside `handleEnergySourceChange()`. Also carries the `noPhoto` default for sources like `Gravity/Potential` and `Hydraulic` where a photo doesn't help.
- **`ENERGY_DEVICE_MAP[prefix]`** — energy-source-prefix → allowed device list; drives the device-dropdown filter. `Electrical` → `ELECTRICAL_DEVICES`; the various water / steam / condensate prefixes → `VALVE_DEVICES_WITH_CKT`; pneumatic / fuel prefixes → `VALVE_DEVICES_NO_CKT`; kinetic / gravity / hydraulic → their single dedicated device each. Fallback for unrecognised prefixes: keyword sniff against `ENERGY_KEYWORD_DEVICE_MAP`.
- **`ENERGY_KEYWORD_TEMP`** — keyword → temperature class fallback for custom energy-source strings that don't match `HOT_ENERGY_SOURCES` / `CHW_ENERGY_SOURCES` by prefix.
- **`ENERGY_LABEL_PREFIX`** + **`ENERGY_LABEL_COLORS`** — the sketch labels (`E-1`, `S-3`, `W-2`, …) get their letter from `ENERGY_LABEL_PREFIX[sourcePrefix]` and their swatch colour from `ENERGY_LABEL_COLORS[letter]`. Used both on the sketch canvas and in the source-card number badge.
- **`PHOTO_DEFAULTS`** — capture defaults (JPEG quality, max resolution, compression). Overridable via Settings; persisted to `localStorage.photo_settings`. Live values are on `PHOTO_STATE`.
- **`SKETCH_DIAGRAMS`** — the SVG library of 20 pre-drawn equipment diagrams (`ahu`, `pump`, `generator`, `chiller`, `boiler`, `heat_exchanger`, `condensate_return`, `traction_elevator`, `hydraulic_elevator`, `medical_vacuum`, `medical_air_compressor`, `ups`, `steam_water_heater`, `electric_water_heater`, `ats`, `cooling_tower`, `ac_unit`, `air_compressor`, `exhaust_fan`, `general`). Each entry is a self-contained SVG string; the picker/sketch overlay draws a canvas on top of it. Selected by `TEMPLATE_DIAGRAM_MAP[template]` or overridden by `EQUIPMENT_DIAGRAM_OVERRIDE[type]`.
- **`SAVED_FILTERS`** — allowlist of `savedFilter` values (`'all' | 'today' | 'yesterday'`); guards `setSavedFilter()` against unknown inputs.
- **`HOSPITALS`** — the roster of facility codes shown in the Settings picker. Each row: `{key, label}`. The `key` is what lands on every entry's `hospitalCode` field and every export's manifest — must match a corresponding loto-web `Hospital.key` for the ingester to route correctly.

### 5.4b  Overhead Sketch visibility (build 78)

The sketch section is **hidden by default at every facility**. A Settings
checkbox ("Show Overhead Sketch section for this facility") opts a facility in
— stored per `hospitalCode` in localStorage `loto_sketch_prefs`
(`{code: 'show'|'hide'}`, absent = hide). `applySketchVisibility()` is the
single gate, called from `updateSketchSectionDefault`, `loadSketchDiagram`
(template selection still loads the diagram + sources but no longer reveals
the section), and Settings save. Safety valve: an entry that already carries
sketch strokes/labels always shows the section, and sketch data still exports
unchanged.

### 5.4c  Simplified verification (build 79)

Replaces the verification pickers with lower-friction inputs while emitting
the **same canonical strings** — exports/CSV/entries.json and loto-web are
completely unchanged, so the Settings toggle ("Simplified verification",
localStorage `loto_simple_verification`, default ON) can revert to the
classic pickers at any time with no data migration. Backed by a prod-DB
usage analysis (2026-07-30: 94% of ~930 water verifications are exactly the
drain × gauge combos; `Controls` is 48% of ~850 electrical, blanks were 11%).

- **Water/valve sources** (device whose `DEVICE_VERIFICATION_MAP` list has
  `_placeholders`): two checkboxes — **Drain present** / **Gauge present** —
  synthesize `Temp Only|GaugeOnly|Drain Only|Gauge/Drain` + the `- Hot`/
  `- CHW` suffix from `getTempSuffixFor()` (shared with the classic filter,
  so both modes always agree). A "Saves as: …" hint shows the stored string;
  **More options…** (`_classicVerif` per-source flag) swaps back to the
  classic select. Values the parser doesn't recognize (`Zero Flow`, custom
  text, legacy oddities) auto-fall back to the classic select — never
  clobbered. Legacy `G/Tmp/Drain` spellings parse as drain+gauge but are
  left as-is unless a checkbox is tapped.
- **Defaults** (`applySimpleVerifDefaults()`, run at the top of every
  `renderSources()`, idempotent, simplified-mode only): blank water
  verifications get the synthesized default — Drain pre-checked for
  CHW/HHW sources when `getEquipType()` is AHU-family (coil drains are
  near-universal there); blank electrical verifications get `Controls`
  when the device-filtered list offers it. Recognized water strings get
  their temperature suffix re-derived on render so changing the energy
  source can't leave a stale suffix. Template-scoped verification
  overrides and non-blank values are never touched.
- **Template-scoped overrides** (`TEMPLATE_SOURCE_VERIFICATION_OVERRIDES`,
  e.g. the Boiler HHW curated list): when the override list is PURE
  drain/gauge/temp variants (`overrideAllowsSimple`) the checkboxes apply
  there too, with the suffix taken from the override list itself
  (`simpleVerifSuffix`); mixed/electrical overrides keep the classic
  select and blank-default to `Controls` only if the list offers it.
  Header shows `v7.0 · b79` so the running bundle is identifiable.
- Functions: `simpleVerifEnabled/setSimpleVerif`, `isValveVerifDevice`,
  `synthesizeWaterVerification`, `parseWaterVerification`,
  `updateSimpleVerif`, `showClassicVerif`, `applySimpleVerifDefaults`;
  CSS `.simple-verif-check` (the global `.form-group input` rule strips
  native checkbox rendering, so the checked state is painted manually).

### 5.5  Saved-panel UX + Copy Source + autosave indicator + export badges

#### Export-status badge + delete guards (build 77)

Every saved-panel row shows a per-entry export badge: green **"✓ exported"**
(tooltip = timestamp) when `entry.exportedAt` is set, amber **"⚠ not
exported"** otherwise. Stamping happens in `runCombinedExport`'s full-success
path only (same branch as the export log write): every entry included in the
completed export gets `exportedAt` + `exportId`, then `saveAll()`. The export
filter functions return **live references** into `savedEquipment`, so stamping
is by reference (the unsaved current-form entry's temp object gets stamped
harmlessly — it's discarded).

Deletion is guarded by the stamps:

- **Single delete** (`deleteSaved`) — the confirm shows "Exported Aug 5,
  2:14 PM." or "⚠️ NO export record — this entry may never have left the
  device!".
- **Bulk delete** (`updateBulkDeleteSummary`) — counts exactly how many
  targets lack `exportedAt` ("N of these entries have NO export record —
  deleting would lose them permanently") and offers an **"📦 Export these
  first"** button (`exportBeforeBulkDelete`) that closes the dialog and opens
  the Export dialog **preset to the same date + facility filters**. This
  replaced the old last-export-time heuristic (`savedAt > lastExportAt`),
  which couldn't tell whether a *specific* entry had ever been exported.

Entries saved before build 77 show amber until they ride along in one more
export — an **All-dates export stamps everything** currently on the device.

Three transient UX features live on top of the persisted data model. None of
them are exported or serialised — they exist purely to make the on-device
workflow faster.

#### Saved-equipment filter + search

State (module-level `let` variables near the top of the script):

- `savedFilter` — `'all' | 'today' | 'yesterday'`. Default `'all'`. Reset on
  every page load (in-memory only; no persistence).
- `savedSearchTerm` — free-text substring, lowercased. Empty = no filter.

Predicates:

- `isSavedOnLocalDay(entry, refDate)` — shared helper; matches on
  local-time Y/M/D. Base for both `isSavedToday()` and `isSavedYesterday()`.
- `matchesSavedSearch(entry)` — case-insensitive substring match against
  `equipName + equipRoom + template + equipType + equipBuilding`.

`renderSavedPanel()` combines the two filters multiplicatively and builds
`(entry, originalIndex)` pairs so Duplicate / Edit / Delete buttons still
address the right `savedEquipment[i]` regardless of what's visible. The
`Show:` bar (`#savedFilterBar`) is only rendered when the saved panel is
open AND there's at least one entry — no point offering filters on an empty
list. The `#savedFilterSummary` line always shows `N today · N yesterday ·
N total`, plus `N match` when a search is active.

#### Copy Source (per-source-card action)

Two-step modal launched by the **Copy** button next to Link / Dup on an
expanded source card:

1. `showCopySourceDialog(targetSourceIndex)` — lists every saved entry
   (newest first). Overlay ID: `#copySourceOverlay`. The current source
   card index is stashed on `overlay.dataset.targetIndex` so back / cancel
   can round-trip.
2. `pickCopySourceEntry(entryIndex)` — re-renders the same overlay with
   that entry's sources shown as buttons.
3. `applyCopySource(entryIndex, sourceIndex)` — carries over these fields:

   ```
   energySource, deviceType, quantity, location, verification,
   duplicate, detail, _customEnergy, _customDevice, _customLoc
   ```

   Explicitly **not** carried over: `deviceId` (usually unique per device),
   `photos`, `linkedTo`, `noPhoto` (user's toggle choice on this source),
   `auto`, `collapsed` (UI state). The pasted source is flagged
   `auto=false` and `collapsed=false` so it's non-hidden and shows as
   user-configured.

#### Autosave indicator (header)

`<span id="autosaveStatus">` sits next to the `v7.0` version tag in the
header. `setAutosaveStatus(kind)` transitions between three states:

| Kind | Text | Colour |
|---|---|---|
| `'saving'` | `💾 Saving…` | `--text-dim` |
| `'saved'`  | `✓ Saved at H:MM AM/PM` (local time) | `var(--success, #4ab86a)` |
| `'error'`  | `⚠ Storage issue` | `var(--danger, #d34141)` |

`autoSaveCurrent()` sets `'saving'` on entry, `'saved'` on
`saveMetadata('current_wip', …).then(…)`, and `'error'` when both the IDB
write and the localStorage fallback fail. The failure branch also still
fires the existing `showToast('Storage issue - export soon', true)` for a
louder signal.

The indicator initially reads `💾 Autosave ready` — it changes to a real
timestamp on the first successful save after page load.

---

## 6. Storage — how data lives on the device

> **Why this section changed (build 75, 2026-08-04):** iOS silently evicted
> WebKit storage under pressure and 74 full-res photos vanished between two
> same-day exports — with no warning, because the export silently skipped
> photos it couldn't read. Build 75 made photo storage durable and made every
> failure loud. The three pillars: **native filesystem primary storage**,
> **capture-time save verification**, and an **export integrity guard**.

### Photo keys — UUID ownership (build 83, 2026-08-12) — **do not weaken**

> **Why:** photo keys used to derive from the equipment **name** (`${name}__${slot}`,
> later + a random token). The crew's real workflow (type auto-fills name → shoot →
> rename) made same-named/same-typed units silently overwrite and cross-link each
> other's photos across rooms, buildings, and facilities — ~910 corrupted photo
> slots on the iPad and ~204 on the phone across five VA facilities. The rules
> below make that structurally impossible. **No part of a photo key may ever come
> from equipName, equipType, template, building, room, hospitalCode, or a timestamp.**

- **Key format:** `photo::<entry-uuid>::<slot-token>::<capture-rev>` minted by
  `photoStoreKey(entryId, slotToken)`; parsed by `parsePhotoKey`. Slot tokens:
  `main` / `dataplate` / `ee` / `<sourceId uuid>` / `misc-<8hex>`. The in-progress
  form owns a stable `currentEntryId` (minted at first capture, saved into the
  autosave state, becomes `entry.id` on save).
- **Immutability — no code path deletes photo bytes except an explicit entry
  delete (corrected in build 87; build 83 got this wrong and lost data):** a
  retake writes a **new** record (fresh capture-rev) and repoints the single
  owning reference. It does **not** delete the record it supersedes, and neither
  does removing a misc photo. Build 83 deleted the superseded record there, which
  destroyed live data: `editSaved` hands the form the *same* photo objects the
  saved entry holds, so discarding an edit — or an app reload, or a Save & New
  racing an in-flight capture — left the saved entry pointing at bytes that had
  just been deleted (Air Handler 16 on 2026-08-21 lost 4 of 11 photos; 6 more
  across the 8/19 units). Superseded records simply become orphans, which the
  re-attach / quarantine tooling below owns. Only `deleteEntryPhotos` removes
  bytes, and only for keys whose UUID prefix is the deleted entry's own id,
  reference-counted against surviving entries.
- **Reuse / duplicate = copy + provenance:** "Reuse Photo" and entry duplication
  COPY bytes to a key owned by the target entry and record
  `{dupOf: {entryId, dbKey}}` on the reference. No shared mutable pointers.
  Export writes provenance-linked identical bytes as one file (SHARE contract).
- **A duplicated SOURCE is a different physical device (build 88):**
  `duplicateSource()` deep-copied a source *including its `sourceId`* and handed
  the copy the original's photo reference. Two sources then shared one id and one
  photo record — which is what made the build-83 retake-delete lethal: re-shooting
  the copy destroyed the record the original still pointed at. It now drops
  `sourceId`/`linkedTo` (a fresh UUID is minted at capture or save) and carries the
  photo over as a recorded `{dupOf}` duplicate. `performSaveAndNew` additionally
  de-duplicates `sourceId`s within an entry, so legacy entries carrying repeated
  ids self-heal on the next save. **Downstream note:** entries saved before build
  88 can contain two sources with the same `sourceId` — `loto-web` must not assume
  per-entry uniqueness.
- **Hashes:** every saved photo gets `sha256` stamped on its reference; a
  persistent hash index warns at capture time if the same bytes already belong
  to a different entry (red banner) — `recordPhotoHash`.
- **Export enforcement:** `resolveExportPhoto` ships bytes only through keys the
  entry's UUID owns — legacy/foreign keys are excluded + confirmed with the user
  (`unsafeRefs`). Before the ZIP is finalized, a **duplicate gate** hard-aborts
  if byte-identical files are claimed by different entries with no recorded
  `dupOf`. `manifest.json` carries `photos: [{filename, sha256, entries:[{entryId,
  slot, sourceId?, dupOf?}]}]` plus `counts.unsafeRefs`.
- **Migration & quarantine:** `runPhotoKeyMigration()` (one-time,
  `loto_key_migration_v8` flag) re-keys single-referent legacy photos to their
  owner, copies+flags `legacySuspect` when one blob was claimed by several
  entries (red "PHOTO SUSPECT" badge; surfaced, never silently reassigned),
  quarantines orphans (kept, listed, exportable). Settings → **Photo Audit**
  (on-demand hash audit) and **Photo Store Report** (migration report +
  quarantine export).
  - **Build 84 — the done-flag is conditional.** The migration only marks itself
    complete when the stores were actually readable (`idbAvailable`, or nothing
    left unresolved). A transient IndexedDB failure used to set the flag anyway,
    permanently stranding any legacy photo that lived only in IDB; it now retries
    on the next launch.
  - **Build 85 — quarantine export is scoped and chunked.** It excludes
    migration-source keys (`collectMigrationSourceKeys()` — the retained
    byte-identical originals of migrated photos, which are backups, not lost
    data), splits output into 150-photo ZIP parts, states the count before
    building, and alerts on every failure. Before this it tried to pack ~1,180
    retained originals into one ~350 MB archive and died of memory inside the iOS
    WebView with no message at all.
  - **Build 87 — `reattachOrphanedPhotos()`.** Because a key names its owning
    entry *and* slot/sourceId, a stored photo that no entry references can be put
    back exactly where it belongs — no guessing. Runs once at launch (toast) and
    on demand from the Photo Store Report. It only fills slots whose bytes are
    **missing or empty**, never touches a healthy slot, and picks the newest
    orphan by filesystem mtime when several exist.
- **In-flight captures can't be orphaned or misfiled (build 87):**
  `_capturesInFlight` counts captures between the synchronous start and the async
  store completion. **Save & New refuses while any capture is in flight.** If the
  form has nonetheless moved on by the time a capture lands (saved or cleared),
  the photo is attached to the entry that owned it *at capture time*
  (`captureEntryId`) and persisted with `saveAll()` — never written into whatever
  form happens to be open. A native save that silently fell back to evictable
  IndexedDB now also warns loudly.
- **FS filenames are reversible encodings** of keys (`p.<id>.<slot>.<rev>.jpg`,
  `photoKeyFromFsName`) so `fsPresentKeySet()` can reconstruct exact keys.
- **Entry retention:** `saveAll` maintains `loto_entry_count` + a
  thumbnail-stripped `loto_saved_snapshot` in localStorage; `loadAll` restores
  the snapshot if the primary store comes up empty and shows a red banner if
  fewer entries load than expected. Backup-import merges dedupe by entry **id**
  (never by name), and the Backup dialog states in red that photo bytes are not
  included.
- **Photo Audit is scoped to today by default (build 86).** The Settings button
  runs `runPhotoAudit('today')` — entries saved today plus the open form — with an
  in-overlay toggle to the full-device audit. Unscoped, a field pre-flight drowned
  in the ~340 historical legacy-suspect entries and told the crew nothing about
  the day in front of them. Each scope labels what it covers, so a historical
  collision is never mistaken for today's work.
- **Tests:** `tests/photo-regression.js` — browser-injected suite, **12 tests**,
  run by loading the app and calling `runPhotoRegressionSuite()`. T1–T7 cover the
  original directive (same-name isolation, re-export byte stability, duplicate
  provenance, the cross-link/legacy export gates, key format, and a 500-entry /
  50-same-named scale test). The data-loss regressions added later are the ones
  that matter most: **T8** edit→retake→discard keeps the original photo, **T9**
  edit→remove-misc→discard keeps it, **T10** an orphaned retake re-attaches to its
  entry+slot and exports cleanly, **T11** the Air Handler 16 field scenario
  (duplicate a source → retake the copy → save → export) leaves the original's
  bytes intact and the two sources distinct. T8/T9 fail on build 86 and pass on
  87; T11 fails on 87 and passes on 88 — **if you change any photo path, run this
  suite and expect 12/12.**
  > **⚠ Run it ONLY in a desktop browser against a local server with no real data**
  > (e.g. `python3 -m http.server` in the repo root, a fresh browser profile).
  > **NEVER inside the TestFlight app, on a field device, or in any browser profile
  > that holds field data:** its `resetAppState()` sets `savedEquipment = []` and calls
  > `saveAll()` (which also overwrites the entry count and the emergency snapshot, so
  > nothing can restore), deletes every stored photo key, and resets the export
  > sequence counter. Note also what it *doesn't* cover: in a browser `fsPlugin()` is
  > null, so none of the 12 tests exercise the native filesystem store the iPad
  > actually uses.

  Also `tests/production_store_scan.py` (read-only quarantine classifier against the
  8/5 all-dates export bundles).

### ⚠ Open photo-integrity defects — code review of 2026-09-24 (unfixed in build 88)

A max-effort review of `index.html` — nine independent angles (line-by-line, removed
behaviour, call-site/ordering, JS/WebView pitfalls, storage-layer consistency, reuse,
simplification, efficiency, altitude), with **every candidate then checked by its own
verifier against the code** — found the defects below in build 88, and a final gap sweep added six more. None was
refuted: 20 confirmed, 4 plausible, 4 reported by the sweep and not separately verified.
**None is fixed yet.** They are grouped by root cause because
most share one, and fixing a root cause closes several at once. Line numbers are
approximate.

**Root cause 1 — source photos are keyed by array index.** The form stores source photos
in `photos['source_<INDEX>']`, while storage keys name the source's `sourceId`, and nothing
checks that the two agree — not at save, not at export (`resolveExportPhoto` checks only
the entry id). Every operation that reorders sources must hand-shift the map; several don't.
- **CRITICAL — `applyTemplate` (~L3787) replaces `sources` without touching `photos`.**
  Change the template after photographing (e.g. Water Heater – Steam → Electric) and each
  photo stays on whatever *new* source now sits at its index: the LPS valve photo becomes
  the "DW In" photo. No prompt (`sourcesHaveData()` ignores auto sources), no export
  warning. `applyElectricalCountChoice` and clearing the template do the same, and a
  shorter template leaves stale `source_N` refs that the next `addSource()` inherits.
  *Confirmed.*
- **HIGH — `equipTypeChanged` (~L1915) silently drops every auto source and its photo
  refs.** Nearly every source is auto (type and template both add them) and nothing clears
  the flag when a tech photographs or edits one, so changing the Equipment Type discards
  those photos with no confirm and no undo. *Confirmed.*
- **MEDIUM — a capture's slot is fixed by index when the camera returns.** Removing,
  moving or splitting a source in the ~0.1–0.5 s between the file arriving and the image
  loading lands the photo on a different source. *Plausible (narrow window).*
- *Deeper fix:* store each photo reference on its source object (or key by `sourceId`),
  which deletes every hand-written re-index block. Stopgap: refuse to save or export a
  source photo whose key's source token isn't that source's `sourceId`, unless it carries
  a recorded `dupOf`.

**Root cause 2 — only one of four async photo writers is guarded.** `_capturesInFlight`
blocks Save & New during `handlePhoto` only.
- **HIGH — `executeDuplicate` (~L7520–7647)** copies photos one await at a time into
  whatever form is open. Tap Edit on unit Y mid-copy and the remaining copies are written
  into Y's slots, keyed to Y and marked `dupOf` — they pass the export gate, and X's photos
  ship as Y's. Save & New mid-copy saves a partial duplicate and sends the rest to the next
  form under `photo::null::…` keys. *Confirmed.*
- **HIGH — `reusePhotoInto` (~L5379)** mints its key *after* its first await via
  `ensureCurrentEntryId()`: a quick Save & New puts the reused photo on the *next* unit's
  source, marked as an intentional duplicate, and it ships. *Confirmed.*
- **HIGH — `handleMiscPhoto` (~L6711):** Save & New before the thumbnail appears saves the
  entry without the misc photo and then pushes it into the next form under the old entry's
  key; export drops it as foreign and re-attach skips misc. *Confirmed.*
- **HIGH — the build-87 "form moved on" branch in `handlePhoto` (~L6555–6585)** is reached
  only after the user confirms "Discard edits… (original preserved)" by opening another
  entry — and it then writes the discarded capture *into the saved entry*, by the form's
  index (so onto a different source if the edit reordered them), before the bytes are
  verified. *Confirmed.*
- *Deeper fix:* bind every async write to its form session and source when it starts; on
  completion write only if that same form is still open, otherwise keep the bytes as an
  orphan and say so. Delete the "form moved on" branch.

**Root cause 3 — form identity is split.** `currentEntryId` is autosaved; `editingEntry`
is not.
- **HIGH — a reload mid-edit creates a second entry with the same id.** Merely opening an
  entry for edit autosaves its id; after an iOS WebView reload, Save & New appends instead
  of replacing. The export gate and audit count *distinct* ids, so they can't see it;
  deleting the "extra" copy permanently deletes any retake unique to it; loto-web keeps the
  stale one. *Confirmed.*
- **MEDIUM-HIGH — exporting while an edit is open ships that entry twice** (saved + form,
  same id), reading the live form during a long export. If the unit has a LOTO ID, loto-web
  creates *two* equipment rows. *Confirmed.*
- *Deeper fix:* one persisted form id; "editing" becomes
  `savedEquipment.some(e => e.id === currentEntryId)`; Save & New replaces-or-appends by id;
  export substitutes the form for its saved copy; `saveAll` asserts id uniqueness.

**Root cause 4 — orphan re-attach runs at every launch and can't tell lost from rejected.**
- **HIGH — `reattachOrphanedPhotos` (~L6336, called from init)** fills *empty* slots as
  well as missing ones with the newest unreferenced photo for that entry+slot. Since build
  87 every discard and retake leaves such a photo. So: open the wrong same-named unit,
  shoot a slot that was empty, back out — on the next launch that wrong photo is attached
  and exported. A linked source's photo (removed by `applyLink`) comes back hidden but
  exported; a rejected earlier shot returns if the retake's bytes go missing; pre-b88
  shared sourceIds resolve to the first source. *Confirmed.*
- *Fix:* make it a one-time, user-reviewed repair of *missing* slots only, or leave it on
  the Photo Store Report button alone.

**Root cause 5 — storage writes and reads aren't verified.**
- **HIGH — the Capacitor filesystem write is non-atomic**, so a failed write (device nearly
  full, app killed mid-write) leaves a 0-byte or truncated file. `fsPresentKeySet` has no
  size filter, so the key counts as durably saved forever, the good IndexedDB copy is never
  migrated to disk, and after an IndexedDB eviction the badge stays green while the photo is
  gone — the 2026-08-04 loss again. A partial non-zero file is served ahead of the good
  copy. *Confirmed (reproduced on a full APFS disk image).*
- **HIGH — the IndexedDB handle is cached forever with no reconnect.** After WKWebView
  drops the connection, every save silently falls back to localStorage while the UI says
  "Saved"; the next launch loads the stale IndexedDB copy and never reads the newer one —
  retakes revert and the badge stays green. *Confirmed.*
- **MEDIUM-HIGH — "export anyway" stamps every entry exported**, including those whose
  photos were missing from the ZIP (e.g. while IndexedDB reads were failing). The delete
  guards then treat them as safe, and a delete removes photos that never left the device.
  *Confirmed.*
- **MEDIUM — the emergency snapshot restore (build 83)** treats a transient read failure as
  an empty store and writes the thumbnail- and sketch-stripped snapshot back over the
  intact one, losing sketches permanently. *Plausible.* After any restore, slots that are
  gated on `thumbnail` render "Tap to capture" although a photo exists, and a new shot
  replaces it. *Confirmed.*
- **LOW-MEDIUM — an empty canvas** (`'data:,'`: iOS 17 or earlier, a 24/48 MP library pick,
  Original preset) is stored as a 0-byte photo marked "Saved". *Plausible.*

**Export and data-management defects**
- **MEDIUM-HIGH — misc-photo and diagram filenames in the ZIP are built from
  building/room/name**, so two same-named units in one room (common after Duplicate)
  overwrite each other's file and both rows point at the second unit's image. Main and
  source photos are unaffected (sequence-numbered). *Confirmed.*
- **HIGH for devices not yet migrated (the phone and a second iPad) — the one-time
  migration isn't resumable.** It writes new copies under random revs but persists the
  reference updates only at the very end; killing the app mid-run loses every update, and
  the next launch copies everything again. *Confirmed.*
- **MEDIUM — intentional pre-b83 shares (Aug 4–12) and old "Duplicate with photos" copies**
  were migrated as `legacySuspect` without `dupOf`, so any export containing two of them
  hard-aborts with no override. (Blocking the genuine June/July collision clusters is the
  gate working as designed.) *Confirmed.*
- **MEDIUM — backup import's "Cancel" means REPLACE**, and it now prefers the backup's photo
  refs over the device's whenever the backup row has any — silently pointing entries back
  at shots that were retaken because they were wrong. *Confirmed.*
- **MEDIUM — Edit and Duplicate replace a form holding only photos without asking** (e.g.
  Main and Data Plate shot before choosing a type); those photos are recoverable only
  through the quarantine export. *Confirmed.*
- **MEDIUM — export builds the whole ZIP in memory, then base64-encodes it.** A 610 MB
  All-dates export did complete on the iPad on 2026-08-05, so failure is unproven, but the
  dialog defaults to All dates whenever nothing was saved today. *Plausible.*

**Found by the gap sweep**
- **HIGH — a typed collector tag makes export filenames collide across devices.**
  `getCollectorTag()` (~L1730) returns the typed tag *instead of* the device-derived code,
  and each device keeps its own `photoSeqNext`. Two devices (or a replacement or reinstalled
  iPad) with the same tag both export `0924_JW_00001` for different photos: in a shared
  SharePoint date folder one overwrites the other, loto-web's photo pull binds the survivor
  to units from both devices, and the generator then shares isolation IDs across them.
  (loto-web's own `/from-field-collector` import is unaffected — it de-dupes per equipment
  on equipment id + filename.) *Confirmed.* Rule until fixed: **every device must use a
  distinct collector tag, or leave it blank.**
- **MEDIUM-HIGH — sequence numbers aren't reserved before the ZIP leaves the device.**
  `photoSeqNext` is saved only after `saveOrShare` returns (~L8447), so a WebView killed
  while the share sheet is open — or any throw after it — lets the next export reuse the
  same numbers for different photos. The start-number field is also freely editable with no
  check against numbers already used for that date. *Not separately verified.*
- **MEDIUM-HIGH — the regression suite's reset destroys real data** if run where field data
  lives — see the warning under **Tests** above. *Confirmed.*
- **MEDIUM — linking a source deletes its photo, and loto-web ignores the link.** `applyLink`
  (~L5253) removes the source's photo ref as "redundant", but the export writes only
  `linkedTo` text and loto-web never reads `linkedTo`, so the source arrives with no photo
  and no photo reference — the generator can neither show it nor share the isolation ID.
  *Not separately verified.*
- **MEDIUM-LOW — Save & New autosaves before the sketch is cleared.** `clearForm` calls
  `renderSources()` (which autosaves) while `getSketchData()` still returns the previous
  unit's drawing, then `clearSketchState()` never saves again. If iOS kills the app before
  the next interaction, the relaunch restores the old drawing into the blank form, and the
  next unit exports it as its own `…_diagram.png` — which loto-web imports as an equipment
  photo on the wrong unit. *Not separately verified.*
- **LOW-MEDIUM — the XLSX Information Sheet silently drops sources 11+.** The sheet builder
  loops `s < 10` (~L8241) while `addSource`/split/duplicate have no limit; the CSV and
  `entries.json` keep every source, but the office inventory recipe and office import read
  the XLSX. *Not separately verified.*

**Until these are fixed, in the field:** don't change a unit's template or equipment type
after photographing it; wait for each photo's "✓ Saved" badge — and for the Duplicate and
Reuse toasts — before tapping anything else; don't open another entry while a photo is
processing; export by date rather than "All dates"; give every device its own collector tag
(or leave it blank); run Photo Audit (today) before leaving site. Keep the web build in step with iOS (§2): the web branch still carries the
retake-delete that build 87 removed.

### What a stored photo is — and is not

- **Capture strips all metadata.** Every photo is redrawn through a `<canvas>` to resize
  it, and WebKit's canvas encoder writes a fixed 76-byte EXIF stub holding only image
  dimensions. No GPS, no capture timestamp, no device information survives — verified
  across every photo in the Bath, iPad and phone export bundles (2026-08). Provenance
  therefore has to come from context (which export bundle first contained the bytes,
  the entry's `savedAt`), never from the image itself.
- **Originals never leave the app.** Slot taps capture through an HTML
  `<input type="file" capture="environment">`, so iOS hands the page the image and
  discards it: nothing lands in the Photos library. (`@capacitor/camera` is installed but
  used only by the OCR scan buttons, with `saveToGallery: false`.)
- **Considered and deferred (2026-08-21): an off-app copy of every capture.** Routing slot
  taps through `Camera.getPhoto({ saveToGallery: true })` — `NSPhotoLibraryAddUsageDescription`
  is already declared — plus writing a human-named copy (`<Equipment> — <Slot>.jpg`) into the
  app's Documents folder with `UIFileSharingEnabled`, was estimated at ~4–5 hours and deferred
  at the user's request. It would have made both 2026 photo losses recoverable. *Replacing*
  the app's store with the camera roll was rejected: exports need deterministic,
  hash-checkable read-back, and Photos assets can be deleted, edited, or offloaded to iCloud
  ("Optimize iPad Storage") so an on-site export would need network.

### Native filesystem — `DATA/loto_photos/` (primary on iOS, build 75+)

On the native app, every resized full-res JPEG is written to a real file in
the app's data container via Capacitor Filesystem:

- **Path:** `loto_photos/<dbKey>.jpg`, `directory: 'DATA'` — part of the app
  sandbox; **not subject to WebKit storage eviction**. iOS only removes it if
  the app itself is deleted.
- **Write path:** `storePhotoBytes(dbKey, dataUrl)` — tries filesystem first
  (and verifies via `stat` read-back), falls back to IndexedDB, then to
  localStorage **only if IndexedDB is unavailable/failed** (never alongside a
  working IDB — the ~5 MB quota is precious).
- **Read path:** `loadPhotoBytes(dbKey)` — filesystem → IndexedDB →
  localStorage. Every consumer (export, full-res viewer) goes through it.
- **Delete path:** `deletePhotoFromDB(key)` removes all three copies.
- **Migration:** `migratePhotosToFS()` runs on every launch — copies any
  IDB-only photos into the filesystem (additive; IDB copies left in place), then
  toasts "Secured N photos to durable storage".
- **Capture verification:** `handlePhoto` / `handleMiscPhoto` `await` the store
  and read it back. Success → green "✓ Saved" badge; failure → red
  **"⚠ NOT SAVED"** badge + toast and `photo.unsaved = true`. Nothing fails
  silently anymore.
- **Integrity badge:** header chip (`#integrityBadge`) shows
  **"✓ N photos safe"** or red **"⚠ X of N MISSING"**; tap = `runIntegrityCheck(true)`
  which rescans (`presentPhotoKeySet()` = one FS readdir + IDB key list +
  localStorage scan vs `allReferencedPhotoKeys()`) and names affected equipment.

On the plain web build `fsPlugin()` returns null and IndexedDB remains primary
— same code, no branching at call sites.

### IndexedDB — `loto_photos_v3` (web primary / native fallback)

Two object stores:

| Store | Key | Value | Used for |
|---|---|---|---|
| `photos` | `dbKey` (string) | `{ data: ArrayBuffer, type: string, size: number }` | Full-res photo bytes |
| `metadata` | key string | any JSON | `saved_equipment` (the main list), other app state |

Photo `dbKey` format (**build 83+**): `photo::<entry-uuid>::<slot-token>::<capture-rev>`
— see "Photo keys — UUID ownership" above, which is authoritative. Two earlier
schemes remain *readable* so nothing is stranded: build 75's
`${safeName}__${slotId}__<10-hex token>` (was minted by `uniquePhotoKey()`,
removed in build 83) and the original `${safeName}__${slotId}`. Both are
name-derived and were the cause of the cross-linking; the one-time migration
re-keys or quarantines them. The stored `dbKey` on the photo object is the single
source of truth. Reuse-a-Photo (§7) no longer shares a dbKey — it copies the bytes
to the target entry's own key and records `{dupOf}` provenance.

### localStorage

Kept small because iOS Safari can be miserly with it. Holds:

| Key | Content |
|---|---|
| `loto_saved` | Legacy — migrated to IndexedDB on load. Cleared after successful migration. |
| `loto_current_state` | Legacy — same migration path. |
| `photoSeqNext` | Next photo-sequence starting number for filename generation |
| `photo_full_<dbKey>` | Base64 fallback copy of a photo, in case IndexedDB write failed |
| `loto_device_id` | Per-device UUID (v4), minted once on first launch by `ensureDeviceId()` in `init()`. Identifies the device across exports so the same day's data from two iPads doesn't collide; feeds the planned export-filename convention (§5 improvement plan). Never changes once set. |
| `loto_export_log` | Last 50 export/backup events (`logDataEvent()`): kind, facility, entry/photo counts, `missingPhotos` (build 75+), seq range, date filter, exportId, filename. Rendered by the header **Log** button. |
| `loto_hospital_code` | Selected facility code (a loto-web `Hospital.key` or a custom string). Set via the Settings facility picker (`getHospitalCode()` / `setHospitalCode()`); stamped onto every entry at save and onto every export. Absent/`''` means no facility selected. Roster of known codes is the `HOSPITALS` const in `index.html`; a header chip (`updateFacilityBadge()`) shows the active facility (or a ⚠️ warning when unset). |

### The photo fallback chain (rewritten build 75)

`storePhotoBytes` writes to exactly one tier, in order of durability:
filesystem (native, verified) → IndexedDB → localStorage `photo_full_<dbKey>`
(last resort only, when IDB is unavailable or the write failed). Reads via
`loadPhotoBytes` walk the same chain, so a photo is found wherever it lives.
A failed save at every tier surfaces the red **NOT SAVED** badge — the old
behavior of silently continuing is gone.

### Migrations on load

`loadAll()` runs two migrations on every startup:

1. **`ENERGY_SOURCE_RENAMES`** (`CA In` → `Compressed Air In`, etc.) — updates saved entries in place so old data still matches current dropdown values
2. **`migrateToggleablePhotoFlags`** — clears `noPhoto: true` on Kinetic sources from older saves so the toggle button controls them cleanly

Both write back to IndexedDB immediately if they changed anything. Separately,
`init()` runs **`migratePhotosToFS()`** (native only) after `loadAll()` — the
one-time-per-photo IDB → filesystem copy described above — then paints the
integrity badge.

---

## 7. Exports — the integration surface

### ZIP export (`Export` button → `runCombinedExport`)

Output filename (rev 6): **`FieldExport_{code}_{MMDDYY}_{deviceShort}.zip`**
- `{code}` — the facility `hospitalCode`, sanitised to filename-safe chars (`Atlanta - Fort McPherson` → `Atlanta_Fort_McPherson`); `NoFacility` when unset.
- `{MMDDYY}` — **the data's day, not the export moment** (build 74): when a
  specific date is filtered, `exportDateFrom(dateFilter)` stamps the ZIP name,
  photo prefix, and sheet names with the *filtered* day — exporting Aug 3's
  data on Aug 4 yields `0803_*` photos in a `..._080326_...` zip. Unfiltered
  exports use today.
- `{deviceShort}` — first 8 hex of `loto_device_id`, so same-day exports from two iPads don't collide. The full `deviceId`, the per-export `exportId`, and the date filter live in `manifest.json`.

**Date semantics are LOCAL (build 74).** All date grouping — the export
filter, the saved-panel Today/Yesterday, photo prefixes — uses the device's
local calendar day via `localDateStr()` / `getEntryDate()`. Previously the
filter grouped by UTC (`savedAt.slice(0,10)`) while filenames used local time,
so entries saved after ~8 PM ET were filed under the wrong day and a "today"
export could carry yesterday's data.

**Shared photos are written once (build 74 — the reuse/share model).** A
source photo slot's **↻ Reuse** button attaches an already-taken photo (today's
photos, newest first) to another source. **Build 83 changed the mechanism while
keeping the contract:** the slot no longer points at the original's `dbKey` —
the bytes are COPIED to a key owned by this entry and the reference records
`shared: true` plus `{dupOf: {entryId, dbKey}}` provenance, so no two entries
ever share a mutable record. At export, `resolveExportPhoto()` dedupes by **sha256**: the bytes are
written to the ZIP **once**, and every referencing slot's `photoFile` carries
the **same filename** — loto-web binds identical stems as one physical photo.
Reference-aware deletion (`deleteEntryPhotos(entry, keepReferencedBy)`) keeps
a shared photo alive while any surviving entry (or the current form) still
uses it.

**Integrity guard (build 75).** The export loads every referenced photo via
`loadPhotoBytes`; a photo that can't be found anywhere is **recorded, not
silently skipped** (the pre-75 behavior that let a 306-photo day quietly ship
as 232). If any are missing, the export **blocks** with a confirm that counts
the misses and names the affected equipment — Cancel aborts; OK exports
incomplete and records `missingPhotos` in `manifest.json.counts`, the success
toast, and the export log.

**Export stamps (build 77).** On full success every included entry is stamped
`exportedAt` + `exportId` (see §5.5) — the saved list's export badges and the
delete guards read these.

Structure (rev 6):

```
FieldExport_{code}_{MMDDYY}_{deviceShort}.zip
├── manifest.json                          # bundle index — read this first
├── entries.json                           # structured entry array — preferred ingest surface
├── info_sheets/
│   ├── LOTO_FieldData_{MMDDYY}.csv         # every entry × source pair (columns below)
│   └── Information_Sheet_{MMDDYY}.xlsx     # styled ExcelJS workbook (human form)
├── photos/
│   ├── {MMDD}_{NNNNN}.jpg                  # equip (main/dataplate/EE) + per-source, H-numbered in slot order (.png if source is PNG)
│   └── {safeName}_Misc{N}.jpg             # additional non-slot ("misc") photos
└── diagrams/
    └── {safeName}_diagram.png             # annotated overhead sketch (only if the entry has sketch data)
```

`{safeName}` = `{building}_{room}_{equipName}` with non-alphanumeric characters (except `_` and `-`) replaced by `_`. The H-number → slot mapping is recorded in `entries.json` (`photoFiles` / per-source `photoFile`), the CSV (photo-filename columns), and the XLSX — so a consumer never has to guess which file is which.

### `manifest.json` — bundle index (rev 6)

A lightweight index an ingester reads first to discover the bundle's shape before touching the data:

```json
{
  "schema": "loto-field-export", "version": 1,
  "exportId": "…",                     // fresh per-export UUID — import idempotency key
  "exported": "2026-07-13T18:02:11.400Z",
  "deviceId": "b3f1c2a4-…",            // full per-device UUID (loto_device_id)
  "hospitalCode": "Marion", "hospitalName": "Marion VA Medical Center",
  "dateFilter": "all",                 // the export dialog's date filter
  "counts": { "entries": 12, "photos": 47, "diagrams": 3, "missingPhotos": 0 },  // missingPhotos: build 75+ — photos referenced but unreadable at export time (user acknowledged)
  "files": {
    "entries": "entries.json",
    "csv":  "info_sheets/LOTO_FieldData_071326.csv",
    "xlsx": "info_sheets/Information_Sheet_071326.xlsx",
    "photosDir": "photos/", "diagramsDir": "diagrams/"
  }
}
```

### `entries.json` — structured ingest surface (rev 6)

The cleanest way to ingest a field export: read `entries.json` instead of parsing the CSV. Same envelope as the JSON backup (`version: 2`, `exported`, top-level `hospitalCode`) plus a top-level `deviceId` (the exporting device's `loto_device_id`, for provenance) and `exportId` (the same per-export UUID as `manifest.json`, for correlation). Each entry is a full `SavedEntry` **with photo binary/thumbnail data stripped**, enriched with the ZIP-relative paths of the files actually written:

```json
{
  "version": 2,
  "exported": "2026-07-13T18:02:11.400Z",
  "hospitalCode": "Marion",
  "deviceId": "b3f1c2a4-…",
  "entries": [
    {
      "id": "…", "lotoId": "BATH-AHU-001", "hospitalCode": "Atlanta",
      "equipName": "AHU-1", "sources": [
        { "sourceId": "…", "energySource": "Electrical 208V", "deviceId": "D3",
          "valveState": "normally_closed", "photoFile": "photos/0713_00003.jpg" }
      ],
      "photoFiles": {
        "main": "photos/0713_00001.jpg", "dataplate": "", "ee": "photos/0713_00002.jpg",
        "diagram": "diagrams/A_101_AHU-1_diagram.png", "misc": ["photos/A_101_AHU-1_Misc1.jpg"]
      }
    }
  ]
}
```

Per-entry `hospitalCode` is resolved (falls back to the current setting when the entry itself has no stamp). The entry set matches the export's date filter and includes the unsaved current-form entry, exactly like the CSV/XLSX/photos in the same ZIP.

**`sources[].valveState` (rev 6 — the loto-web contract).** Every source object
carries `valveState`, emitted on **every** source (defaulted on export, so an
ingester never has to handle a missing key):

| Value | Meaning |
| --- | --- |
| `"normal"` (default) | No special downstream handling. |
| `"normally_closed"` | loto-web maps to "Verify valve closed" (Section 2) and "Leave valve closed — do not open" (Section 4). |
| `"normally_open"` | **Reserved** — accepted by the schema, not offered in the collector UI yet. |

Absent/legacy sources are treated as `"normal"`. Captured structurally instead of
in free-text `notes` so a specific valve can be tied to it downstream. In the
collector: a per-source **Valve State** dropdown (with a red **NC** badge on the
collapsed summary) plus a one-tap **Split 1** action — shown when `quantity >= 2`,
it pulls one valve into its own `quantity: 1` source with its own photo marker,
defaulting to `normally_closed`, so a single bypass valve is stated and
photographed individually rather than inferred from notes text. The field also
rides in the CSV (`Valve State` column) and survives JSON backup/import.

### CSV column layout (`LOTO_FieldData_*.csv`)

One row per (equipment, source) pair. The equipment metadata repeats across all its sources:

```
Hospital Code, Equipment Type, Equipment Name, LOTO ID, Room, Building,
Template, Tied To, Tied To Equipment Name, Notes, Source #, Energy Source,
Device Type, Device ID, Quantity, Location, Duplicate, Verification,
Photo Filename, Detail, Linked To, Main Photo Filename,
DataPlate Photo Filename, EE Photo Filename, Diagram Filename,
Misc Photo Filenames
```

The `Hospital Code` column (first) carries the entry's `hospitalCode`,
falling back to the current facility setting for entries saved before a
facility was picked (`entryHospitalCode()`). Maps to loto-web
`Hospital.key` — see §10.

The `LOTO ID` column carries `SavedEntry.lotoId` (blank if the user
didn't enter one). It's the intended dedup key on the loto-web
side — see §10 for how ingest should reconcile blank vs. populated.

`Linked To` is populated when a source is linked to another equipment's source (see `LinkedSourceRef`).

### XLSX Information Sheet

Professional formatted `.xlsx` mirroring the paper "LOTO Information Sheet" form used by field crews. Header rows for the equipment metadata, a 10-row source table (padded with blanks if fewer than 10 sources), photo filename references in the detail cell, page numbering, and linked-source markers. Styled per-cell via ExcelJS.

When a facility is known for the export, a **`Facility` banner row** (`{hospitalName} [{code}]`) is prepended above the column-title row (sheet-level, human-facing; the CSV/JSON carry the authoritative per-entry `hospitalCode`).

### JSON backup (`Backup` button → `saveBackup`)

The **primary integration surface**. Format:

```json
{
  "version": 2,
  "exported": "2026-06-17T14:23:45.123Z",
  "hospitalCode": "Marion",
  "entries": [
    { "id": "b3f1c2a4-5d6e-4f70-8a91-2c3d4e5f6a7b", "hospitalCode": "Marion", "equipType": "Air Handler", "equipName": "AHU-1", ... }
  ]
}
```

`entries[]` is the array of `SavedEntry` objects **stripped of photo binary data** — thumbnails and `dbKey` references are preserved, but the ArrayBuffer bytes are not. That's why the JSON stays small (a full-day-of-entries backup is typically < 1 MB).

**`version` bumped to 2** (rev 4): the envelope gained a top-level `hospitalCode` (the facility setting at export time — a default for entries whose own `hospitalCode` is blank), and each entry now carries its own `hospitalCode`. Backward compatible — a v1 reader that ignores unknown keys still parses it.

**Backup round-trip fidelity:** `normaliseEntry()` (the import path) spreads the original entry before applying field defaults, so identity/integration fields — `id`, `lotoId`, `hospitalCode`, `savedAt`, `exportedAt`/`exportId` (build 77), `sketch`, `miscPhotos`, and per-source `sourceId`, `deviceId`, `detail`, `linkedTo` — survive an export→import cycle. (Prior to rev 4 it was a whitelist rebuild that silently dropped all of these.)

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
- **SHIP STEP (easy to miss):** the editable source is the REPO-ROOT `index.html`/`sw.js`;
  `www/` is a gitignored build copy. Before every archive run
  `cp index.html sw.js www/ && npx cap sync ios` — build 79's first archive
  shipped stale v7.72 assets because this step was skipped.
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

- `MARKETING_VERSION` — user-facing (currently `1.4`); bump for user-visible releases
- `CURRENT_PROJECT_VERSION` — build number (currently **88**); **must be strictly increasing** for the same `MARKETING_VERSION` or Apple rejects the upload. Bumped by +1 on every commit that goes to TestFlight. Both Debug + Release entries in `project.pbxproj` must match.

### Service worker cache

`sw.js` uses network-first for HTML/JSON, cache-first for static assets. **`CACHE_NAME` must be bumped every time cached files change** — otherwise the WebView serves stale HTML on next launch. Currently `loto-collector-v7.84` (kept in lockstep with builds: build 88 ↔ v7.84).

---

## 9. Deployment topology

### Web (auto-deploys on push to `main`)

`.github/workflows/azure-static-web-apps.yml` — one job that runs Azure's `static-web-apps-deploy@v1` action. Config in the workflow: `app_location: "/"`, `skip_app_build: true`. That means Azure ignores everything Node-related (no `npm install`, no `www/` step) and just uploads the repo root as static files.

`staticwebapp.config.json` sets `Cache-Control: no-cache, no-store, must-revalidate` on `sw.js`, both HTML files, and both manifests. That's what fixes the "user stuck on old SW" bug. GitHub Pages is unaffected (no cache headers control) but users on that URL clear more slowly.

### Promoting a build to the web (`main`)

`main` is no longer the stale v7.0 line it was through July 2026. Since 2026-08-12 it
carries the same app as `ios-testflight-scaffold`, **promoted by copying the web files
across — never by merging**: the branches diverged long ago and `main` has no
Capacitor/iOS tree.

Promotion worktree: `~/Desktop/Claude Apps/loto-main-web` — a `git worktree` of this
repo on branch `main-promotion`, tracking `origin/main`.

1. Copy `index.html`, `FingerLakes_Information_Sheet.html`, `sw.js`, `manifest.json` and
   `manifest_fl.json` from the scaffold checkout into the worktree.
2. `git add` **those five files only** — never `git add -A`: untracked test harnesses
   (e.g. `tests/photo-regression.js` copied in for verification) must not ship to a
   public static site.
3. `git commit`, then `git push origin main-promotion:main`. Azure deploys automatically.

Existing web users migrate in place on their next load: the IndexedDB schema
(`loto_photos_v3`, version 2) is unchanged and the one-time photo-key migration (§6)
runs exactly as on iOS. This was verified before the first promotion by an in-browser
v7.0-upgrade simulation (4/4 legacy entries survived, a shared key became two
suspect-flagged copies, a localStorage-fallback-only photo migrated, no false
entry-loss banner).

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

> ✅ **STATUS (2026-07-13): the ingester is built and live in production.**
> `POST /api/import/from-field-collector` exists in loto-web
> (`app/routers/import_data.py` → `import_field_collector_bundle`) and is
> deployed. It reads `entries.json` from a FieldExport ZIP, resolves the
> hospital from `hospitalCode` → `Hospital.key` (or a `hospital_id` form
> override; 400 if unresolved), keys `Equipment` by `loto_id`, maps sources
> 1:1, and binds photos to sources via each source's `photo_ref` (the H-number
> stem). A `replace_existing=true` flag overwrites an existing equipment's
> sources/photos; the default skips already-present `loto_id`s (metadata
> backfill only). The rest of this section is the design rationale behind that
> endpoint. **Caveat:** only `Marion` and `Kansas City` `Hospital` rows are
> seeded — the three Atlanta keys the picker offers must be created on the
> loto-web side before those facilities can import (else 400).

### Interop path (as implemented)

**Upload the ZIP export to a `POST` endpoint on the receiving system.** The ZIP contains:

- The JSON-equivalent data as CSV + XLSX
- All photo files (main, data plate, EE, per-source, misc, diagram)
- Filenames are stable and equipment-name-anchored

Best single ingestion strategy:

1. Field user completes their day, taps **Export** → gets ZIP in Files (iOS) or downloads folder (web)
2. From the iOS share sheet OR the web browser, user posts the ZIP to a new endpoint on the receiving system (e.g. `POST /api/import/from-field-collector` in `loto-web`)
3. Receiving system unpacks the ZIP, reads **`manifest.json`** first (bundle shape, facility/device, `exportId` for idempotency), then **`entries.json`** (the structured surface — prefer it over parsing `info_sheets/LOTO_FieldData_*.csv`), resolves the `photoFiles` / per-source `photoFile` paths against the `photos/` + `diagrams/` folders, and maps to its own schema. `EnergySource.photo_ref` / `Equipment.main_photo_ref` are derived from those photo-path stems, and `photo_detail` from each source's `detail` (this is the field-side equivalent of the office XLSX `photo_ref` cells — see the Step 4 note in the integration plan)

### Field mapping to loto-web `Equipment` + `EnergySource`

Field collector's shape lines up cleanly with `loto-web/models.py`. Roughly:

The mappings the deployed ingester actually applies:

| Field collector | loto-web | Notes |
|---|---|---|
| `hospitalCode` (or envelope) | (resolves to) `Hospital.id` | looked up by `Hospital.key`; `hospital_id` form param overrides |
| `lotoId`, else `field-<16 hex of id>` | `Equipment.loto_id` | dedup key; `field-` form fits the `String(30)` column and is stable across re-uploads |
| `equipName` | `Equipment.name` | |
| `template`, else name-based detect | `Equipment.equipment_type` | there is **no** `template` column — the field `template` (e.g. "AHU - Steam") *is* the loto-web type key; falls back to `detect_equipment_type(name, sources)` |
| `equipBuilding` | `Equipment.building` | |
| `equipRoom` | `Equipment.room` | |
| `notes` | `Equipment.notes` | column exists |
| `tiedToName` / `tiedTo` | `Equipment.tied_to_equipment` | |
| `photoFiles.main` stem | `Equipment.main_photo_ref` | H-number stem |
| `sources[].energySource` | `EnergySource.source_type` | |
| `sources[].deviceType` | `EnergySource.device` | |
| `sources[].quantity` | `EnergySource.device_qty` | |
| `sources[].location` | `EnergySource.location` | |
| `sources[].verification` | `EnergySource.verification` | |
| `sources[].duplicate` (`"Yes"`) | `EnergySource.dup_photo` (`"Y"`) | |
| `sources[].detail` | `EnergySource.photo_detail` | field-side equivalent of the office XLSX detail cell |
| `sources[].photoFile` stem | `EnergySource.photo_ref` | drives photo→source binding |
| source ordering | `EnergySource.sort_order` | 1-based |
| Photo files (from ZIP) | `Photo` | UUID filename on disk + `Photo` row; source photos linked by `photo_ref` stem, others equipment-level |
| `equipType` | *(not stored directly)* | the human category; `template` carries the type key |

As of rev 4 the field app **does** carry a facility: `hospitalCode` (a
loto-web `Hospital.key`) is set via the Settings picker and stamped on
every entry/export. The ingester should resolve it to `Hospital.id` (look
up the `Hospital` row by `key`). It must exist on the loto-web side — the
field app's `HOSPITALS` roster only lists codes; a matching `Hospital` row
has to be created there with the identical `key` or the import won't match.
When `hospitalCode` is blank, fall back to the JSON envelope's top-level
`hospitalCode`, and failing that, prompt the user to pick a facility at
ingestion time (the pre-rev-4 behavior).

### Dedup between the manual (office) and field-collector paths

Because loto-web already keys `Equipment` rows by `loto_id` (see
`import_data.py` line 786), populating the field-collector's new
`lotoId` field is the single natural merge point between the two
ingest paths:

- **Office hand-fills XLSX with `loto_id = "BATH-AHU-001"`** → row created.
- **Field crew captures the same AHU-1 with `lotoId = "BATH-AHU-001"`** → same `loto_id` matches → row is updated in place, not duplicated.
- **Field crew leaves `lotoId` blank** → the ingester should fall back to the entry UUID as `loto_id` (creating a distinct row). Admin can merge later via the loto-web UI.

What the ingester does: if `entry.lotoId` is non-empty it becomes `Equipment.loto_id` (truncated to the 30-char column); otherwise `field-<16 hex of entry.id>` — a form that fits `String(30)`, is recognisable as origin=field-app, and is stable because `entry.id` is a stable `crypto.randomUUID()` (§5) preserved across edits. So re-uploading an edited entry updates the same row instead of duplicating. (`entry.id`'s full UUID is 36 chars, so the ingester derives a 16-hex slice rather than using it whole.) Each source also carries a stable `sourceId`, available for future source-level reconciliation. Existing `loto_id`s are skipped by default (metadata backfill only) unless the caller passes `replace_existing=true`.

### The OFFICE info-sheet path — `Information_Sheet_MMDDYY.xlsx` (field-app layout)

This app's XLSX export (§7) is also what loto-web's *office* importer consumes,
separately from the ZIP path. Anything that generates one of these sheets by hand
must match the layout exactly, because the importer derives geometry from it.
Established 2026-08-21 while reconstructing the Atlanta 06/18 survey from paper
forms; verified against `loto-web/app/routers/import_data.py`.

- **Detection anchors** (`_detect_info_sheet_layout`): the exact string
  `Equipment ID/Name` in column 1 of each block header, and `Device ID` in
  **column 3** of the first `Energy Source #N` header row — the latter is what
  selects the field-app column map (photo in col 6). Without it the sheet is read
  as the older *legacy* layout and every photo column shifts.
- **Geometry:** block stride **27** rows; block *n* starts at `B = 1 + 27*(n-1)`.
  Header `B+2`; equipment values `B+3` (name 1, location 4, main photo 5, details
  6, page 10); source *N* header at `B+4+(N-1)*2` with values one row below
  (1 type, 2 device, 3 device ID, 4 qty, 5 location, **6 photo**, 7 detail, 8 dup,
  9 verification); summary `B+24`/`B+25` (tied col 1, template col 8); `Notes:`
  `B+26` with its value at `B+27` col 1.
- **Photo cells carry the bare reference and nothing else.** Matching is
  `file_stem.endswith(ref)`, so any parenthetical (`4308 (left valve)`) matches
  nothing at all.
- **Column 7 is `EnergySource.photo_detail` — `String(20)`, a POSITION MARKER,
  not a comment field.** `procedure_generator._derive_annotation_position`
  exact-matches `L/LEFT/R/RIGHT/T/TOP/B/BOTTOM` and otherwise **silently defaults
  to `right`**, putting the source-ID box and arrow on the wrong side of a printed
  procedure with no error anywhere. It is also part of the shared-ID inheritance
  key `(energy_code, photo_ref, photo_detail)`, so free text there defeats
  `assigned_id` inheritance across equipment that photograph the same physical
  valve. Multi-device markers are house convention spelled **without** slashes —
  production holds `LR` 98, `RL` 71, `TB` 31, `BT` 30.
- **Binding:** blocks match inventory equipment **by name** (fuzzy substring
  fallback, disambiguated by building + room) and the sheet's date — taken from
  the first 6-digit run in the **filename** — must equal `equip.assessment_date`.
  Use the inventory's exact wording (`*_LOTO_Inventory.xlsx`) or a block binds to
  nothing.

> **Cross-date surveys (found + fixed 2026-08-21).** Crews routinely *start* a unit
> one day and *photograph* it the next, so the same unit appears in two sheets —
> the earlier structure-only, the later complete — while the inventory records the
> **start** date. The date guard above therefore bound the empty sheet and silently
> discarded the completed one: 18 Atlanta units, 71 photos stranded, every file
> present on SharePoint the whole time. `Information_Sheet_061526` vs `061626`
> carry the same 16 names with 9 vs 70 photo refs — **061626 is the authoritative
> record, not a duplicate.** loto-web now falls back to a campus-wide lookup when
> the date-scoped one finds nothing, binding only on an unambiguous single hit,
> and its photo puller runs a second campus-wide pass on *exact* filename-stem
> equality. Two traps worth remembering: loto-web's session uses
> `autoflush=False`, so cross-date binding **doubles** a twice-described unit's
> sources unless a `db.flush()` precedes the existing-sources query; and pass 2 of
> the photo pull must never use the `endswith` rule (Marion's bare numeric refs
> have 689 suffix collisions). Do **not** "fix" this class of problem by rewriting
> inventory dates — it falsifies when assessments happened.

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
| `showCopySourceDialog` / `pickCopySourceEntry` / `applyCopySource` — Copy Source per-card action (§5.5) | ~4151 / ~4185 / ~4219 |
| `saveAndNew()` — canonical entry shape | ~4918 |
| `isSavedToday` / `isSavedYesterday` / `setSavedFilter` / `setSavedSearch` / `matchesSavedSearch` — saved-panel filter + search predicates (§5.5) | ~5038 – ~5054 |
| `renderSavedPanel()` (saved list + filter bar + search — §5.5) | ~5081 |
| `runCombinedExport()` — ZIP export (PASS 2B builds `entries.json`; `manifest.json` + `FieldExport_…` filename near the end) | ~5602 |
| `saveBackup()` — JSON backup (v2 envelope) | ~6060 |
| `normaliseEntry()` — backup import (spread-preserves identity fields) | ~6162 |
| `setAutosaveStatus()` / `autoSaveCurrent()` — autosave indicator + save (§5.5) | ~6238 / ~6259 |
| `saveOrShare()` — unified file save helper | ~7600 |
| **Durable photo storage (§6, build 75):** `fsWritePhoto`+FS helpers / `storePhotoBytes` / `loadPhotoBytes` / `photoBytesExist` / `presentPhotoKeySet` / `migratePhotosToFS` | ~5800 / ~5860 / ~5880 / ~5900 / ~6010 / ~6030 |
| **Photo key core (§6, build 83):** `PHOTO_KEY_RE` / `photoStoreKey` / `parsePhotoKey` / `photoKeyOwnedBy` / `slotTokenForCapture` / `mintMiscSlotToken` | 5765 / 5766 / 5771 / ~5777 / 5782 / ~5796 |
| Reversible FS filename encoding (§6): `photoFsRelPath` / `photoKeyFromFsName` | ~5818 / 5826 |
| Hashing + capture-time cross-entry warning (§6): `sha256HexOfBytes` / `recordPhotoHash` / `showPhotoHashWarning` | 5923 / 5935 / 5953 |
| **Migration + quarantine + repair (§6, builds 83–87):** `PHOTO_KEY_MIGRATION_FLAG` / `runPhotoKeyMigration` / `showPhotoStoreReport` / `collectMigrationSourceKeys` / `exportQuarantineZip` / `thumbnailFromBytes` / `reattachOrphanedPhotos` / `runPhotoAudit` | 6055 / 6070 / 6184 / 6227 / 6252 / 6316 / 6336 / 6408 |
| `handlePhoto()` — capture pipeline: UUID key, in-flight counter, owner-at-capture attach, hash warning (§6) | 6492 |
| In-flight capture counter (`_capturesInFlight`, guards `saveAndNew`/`performSaveAndNew`) | 1672 |
| `duplicateSource()` — fresh `sourceId`, photo carried as recorded `{dupOf}` (build 88) | 5034 |
| `splitSource()` — pull one valve into its own qty-1 source (§5) | 4743 |
| `removeMiscPhoto()` — removes the reference only, never the bytes (build 87) | 6782 |
| `resolveExportPhoto()` — UUID-owned-keys-only export resolution + sha256 manifest records, inside `runCombinedExport` | 7967 |
| Capture badge + integrity (§6): `setPhotoSlotState` / `runIntegrityCheck` / `updateIntegrityBadge` | ~5648 / ~5695 / ~5720 |
| Reuse-a-Photo (§7): `collectTodaysPhotos` / `showReusePhotoPicker` / `reusePhotoInto` | ~4985 / ~5005 / ~5032 |
| Export gates inside `runCombinedExport`: missing-bytes guard, `unsafeRefs` acknowledgement, and the hard **duplicate gate** (byte-identical files across entries with no recorded `dupOf` abort the export) | ~8090 – ~8150 |
| Local-day date helpers (§7, build 74): `localDateStr` / `exportDateFrom` | ~6653 / ~6661 |
| Reference-aware photo deletion — **the only path that removes bytes**: `deleteEntryPhotos` | 7230 |
| Entry-retention guards (§6): `loto_entry_count` + `loto_saved_snapshot` in `saveAll` / restore + short-load banner in `loadAll` | ~8754 / ~8790 |
| Delete guards (§5.5, build 77): `deleteSaved` / `updateBulkDeleteSummary` / `exportBeforeBulkDelete` | ~6230 / ~6293 / ~6325 |
| `scanTextToField()` — camera + OCR helper | ~6639 |
| `init()` — startup: `ensureDeviceId()`, `updateFacilityBadge()`, dropdowns | ~1400 |
| `genUuid()` / `ensureDeviceId()` / `ensureSourceId()` — stable UUID + device id (§1b/1c) | ~1320 |
| `HOSPITALS` roster + `getHospitalCode()` / `setHospitalCode()` / `entryHospitalCode()` (§2) | ~1367 |
| `updateFacilityBadge()` — header facility chip | ~738 |
| Settings modal (`showSettings` / `savePhotoSettings` — photo + facility) | ~700 |

---

## 12. Ingestion side — status

The 5-step field-app integration plan is complete and the loto-web ingester is
live. What's done vs. outstanding:

1. ✅ **ZIP unpacker + endpoint** — `POST /api/import/from-field-collector` in `loto-web/app/routers/import_data.py`, deployed 2026-07-13. Reuses loto-web's existing photo-binding path (`_import_photo_for_equipment` / `_build_ref_map`) rather than reinventing.
2. ✅ **`entries.json` + `manifest.json`** are the structured surfaces the ingester reads (Steps 3 + 5).
3. ✅ **Dedup key** — `loto_id` = `lotoId` or `field-<16 hex>` (Steps 1a/1c).
4. ✅ **Facility** — `hospitalCode` → `Hospital.key` (Step 2).
5. ✅ **Atlanta `Hospital` rows exist** and Atlanta imports. As of 2026-08-21, after the cross-date fix (§10): sources 269 → 652, photos 198 → 637, 0 duplicate source slots, Marion unchanged.
   - ⏳ Still unbound: `condensate return unit` and `chiller 2` — genuinely ambiguous (3 inventory rows each share the name), which is exactly the case the date guard protects. These need a human or an inventory correction; do not guess them.
   - ⏳ The reconstructed 06/18 sheet (`Information_Sheet_061826.xlsx`, built from the paper forms + Lumix photos) is ready but not yet placed on SharePoint — see `atlanta-main-campus-june-reconstruction` in project memory for the swap steps and the 15 Lumix frames that were deleted from SharePoint and are held locally.
6. ⏳ **Field-app "Send to loto-web" UX** — currently a manual share-sheet / browser upload of the ZIP to the endpoint (§10 auth option 1). A one-tap `saveOrShare` target is a future nicety, not required for the loop to function.

---

## 13. Related tooling outside this repo

The 2026 photo-corruption recovery produced tooling that lives beside the repo, not in it
(it holds facility data, and the repo is public — §3):

- **`~/Desktop/Claude Apps/LOTO Photo Recovery Center/`** — the working hub. `START_HERE.html`
  links everything: survivor-review sheets (Bath / iPad / phone) for deciding which unit a
  cross-linked photo really shows, with verified reference photos, dates and Information
  Sheet links per candidate; `MAINCAMPUS_LUMIX_MATCH.html` for matching the June Lumix roll
  to Main Campus units; needed-photo field lists; and the reconstructed
  `Information_Sheet_061826.xlsx` in field-app layout (§10).
- **`~/Desktop/Claude Apps/LOTO Information Sheet App/photo-recovery/`** — the generators
  (`recover.py`, `build_survivor_review.py`, `bath_scan_and_review.py`,
  `build_needed_photos.py`, `build_lumix_match.py`, `photo_geotags.py`) and local copies of
  the export snapshots, the Bath SharePoint data and the Lumix roll they read. It also holds
  15 Lumix frames that were deleted from SharePoint after being copied here.

One fact from that work matters to anyone matching photos to paper records: **the numbers
handwritten on the Main Campus paper forms are Panasonic Lumix frame numbers** —
`0001–0109 = P101xxxx` (camera clock unset), `4043–4278 = P617xxxx`, `4279–4356 = P618xxxx`,
so form "4335" is `P6184335.JPG`.

---

*This document is a living reference. When behavior changes materially — new equipment type patterns, new export formats, new iOS plugin, changes to the JSON schema — update the relevant section and the top-of-file date.*
