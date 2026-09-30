# LOTO Field Collector — Architecture Reference

**Date:** 2026-09-29 (rev 28 — **build 101 adds the SharePoint live backup** — see §6 "Build 101": while the app is open and online, every safely stored photo, each facility / day's unit file and photo index, and the unit on the form (in its own small file, so typing never re-sends the day) are copied into one dedicated SharePoint folder (`LOTO Backups/<facility>/<YYYY-MM-DD>/`), filed by each unit's own facility stamp and survey date and each photo's day taken; a file counts as backed up only once SharePoint confirmed its bytes (the SHA-256 checked by the API, then SharePoint's own size and QuickXorHash); nothing on SharePoint is ever deleted — a day whose units all went is written again empty. Off until turned on and signed in with Microsoft; the devices hold no Microsoft credentials (web: the Static Web Apps sign-in; iPad: a 30-day upload-only device pass from `backup-link.html`, OAuth PKCE). "Export to SharePoint" sends the ZIP in 5 MiB pieces and stamps units exported only once SharePoint confirmed it. New server side: four Azure Functions in `api/` (one-time setup: `api/README.md`). The fuzzer gained a backup mode; it found a photo left in its old facility folder (T169), building its oracle found two more gaps (T170, T171), a review of the finished pass moved the unit in progress out of the day's units file (T172), and the final fault campaign found that a confirmation the device never recorded could leave an older one standing (T173). The unit-in-progress redesign moves to build 102. Suite: 178 tests / 183 results. Prior: rev 27 — **the descriptive sections now carry builds 99 and 100**, not only their §6 change logs: §2 (what the web build adds), §3 (layout, suite size, the fuzz kit), §4 (the bundled libraries — stale since build 93), §5.5 (the autosave indicator; new "Messages": the toast queue and the banners), §6 (the suite, the hash index, the metadata and localStorage tables, "The list write", and new current-state sections "The launch", "The unit in progress", "Tabs (web only)" and "Deletes and re-saves"), §7 (Replace) and §8 (build 100). No code change. Prior: rev 26 — **build 100 fixes the two findings of a low review of build 99** — see §6 "Build 100": after a launch that finishes past the 20 s timeout, the form waits in memory — never going over an unreadable alternate slot, nor over a slot whose unit was just kept as a recovered draft — until that draft is saved (a waiting autosave retries the save); and when a build-94 tab releases, a form changed since launch is written back even before its autosave has landed (it used to be reloaded away). Suite: 162 tests / 167 results. Prior: rev 25 — **build 99 fixes 20 of the 22 findings of the medium and high reviews of builds 96–98** — see §6 "Build 99": a launch that finishes after the 20 s timeout keeps the newer copy of a unit and never autosaves over an unreadable slot; the launch saves once, after it has given snapshot-only units their sketches back; Replace keeps the newer copy of a unit saved twice; deletes and re-saves are stamped after every event known for that unit (a clock that ran ahead can't outrank them); a build-94 tab's final autosave is read back instead of written over; a tab waiting for another tab's photos can open anyway, and waits on a Web Lock the browser releases when that tab closes or crashes; warning toasts are queued, never replaced; an unreadable delete record no longer makes the whole saved list unreadable; the localStorage fallback is a plain list again (older builds read it) with only the recent deletes beside it; the photo-hash index is written in one claim-checked transaction; the fuzzer now runs late launches; a fallback write that fails part-way no longer throws away the fallback it had (found by the build's fault campaign); and a launch that can't read the store's re-save record rebuilds it from the stored list instead of letting an older delete drop a unit that was saved again (found while finishing the build — its own T149 change had opened it). The fuzz driver survives a crashed page and reports a changed unit field by field. The unit-in-progress redesign (versioned per-unit records) is build 101's. Suite: 160 tests / 165 results. Prior: rev 24 — **build 98 fixes the one finding of a quick review of build 97**: a warning toast composed of several lines (Split's "marks cleared" + 10-source heads-up) got the 4 s time only when it was several messages — the time now goes by the lines on screen (T141). Suite: 146 tests / 151 results. Prior: rev 23 — **build 97 fixes the six remaining (low) findings of the 2026-09-28 review of build 95** — see §6 "Build 97": Import → Replace keeps the edit of the other copy of a unit saved twice (the form moves to the copy that stays); a unit-in-progress write re-checks the tab claim inside its transaction, so a Save & New cut short by another tab no longer overwrites the unit's only full copy — and a launch gives a saved unit that exists only as the stripped emergency copy its sketch back from that copy of the form; the "still writing photos" flag is refreshed while writing, removed when the page goes away and stale after 20 s; marks saved by builds 92–94 record the shape they were placed for when first loaded, so a switch to an In/Out pair clears them; the "superseded" marker is written only for the restored unit itself, and Clear keeps an unread slot's local copy; a warning toast is never replaced by the next message in the same moment, and each toast gets its full time. Every finding of that review is now fixed. Suite: 145 tests / 150 results. Prior: rev 22 — **build 96 fixes the eight medium findings of the 2026-09-28 review of build 95** (and one low one in the same save path) — see §6 "Build 96". A build-94 tab still open on the web pauses again (build 95 had dropped the channel it listens on); a delete survives a relaunch however its records were lost — deletes and re-saves are **timestamped events** read back from every copy (localStorage, the IndexedDB mirror, the fallback list), the later one wins; the list save is **safe to retry** (a failed commit no longer merges the tab's own older list back); an unreadable alternate unit-in-progress slot is never silently overwritten; the launch decides whether it may write AFTER its reads and empties a slot only once the unit in it is saved; a delete / import / clear confirmed after another tab took over changes nothing; a launch that finishes after the 20 s timeout restores nothing over the form in use and keeps the units saved meanwhile in full; a stale copy of a saved unit never reopens as an edit of it; the entry count follows the list after an unreadable launch. The build's fault campaign found one older path: a unit deleted after its unsaved edit was stored came back as a "recovered draft" with its photos erased (T134). Six low findings stay open (listed there). Suite: 139 tests / 144 results. Prior: rev 21 — **build 95 fixes the 2026-09-27 code review of build 94** — see §6 "Build 95". Most of the 15 findings were in build 94's own fixes: a unit restored from its local copy could come back later as its OLDER stored copy (now marked superseded); the one-live-tab lock was decided once at launch, so a late tab could pause the up-to-date one and keep writing — it is now a **claim checked at every write**, `saveAll` **merges any list another writer stored since** (compare-and-set) and a tab never takes over mid photo-copy; a tab paused at launch no longer touches the unit-in-progress copies; Import → Replace closes the form holding a removed unit; deleting the other copy of a unit saved twice keeps the edit; marks placed before a source became an In/Out pair are cleared (the marks record the shape they were placed for — one rule, `marksFit`) and the "marks cleared" note is in the message the tech sees; the emergency-copy warning is a sticky banner; storage and photo warnings repeat in the bottom bar on phones; an undated unit open for edit stays undated. **All HTML with user values is built with an escape-by-default `html` template** (`raw()`, `jsArg()`), replacing ~95 hand-placed `escHtml()` calls. loto-web: the no-location rule now works with inventories that store 'Unknown' (field-app sheets only), the pre-QC validator uses the importer's matcher, and stored "LINKED →" details are repaired. The build's own fault campaign found one more (since build 91): a delete whose deleted-ids record couldn't be written came back at the next merging save — this session's deletions are now kept in memory too (T124). Suite: 129 tests / 134 results. Prior: rev 20 — **build 94 fixes the 2026-09-27 execution-based review of build 93** — see §6 "Build 94". This review RAN the app instead of reading it: a seeded random-action fuzzer with data-safety oracles (also under storage faults and inside the app on the Simulator), every export fed to loto-web's real importer, a b88→b90→current upgrade chain on a Simulator, offline / two-tab / phone-width checks — kit in `tests/fuzz/`. Fixed: deleting the unit open for edit now closes the form (Clear used to promise the deleted original was preserved); a second tab of the web app pauses instead of saving over the other tab's list; a link to an In/Out pair takes its device count; the header wraps on a phone; names and source fields are escaped everywhere (a name could run script; an inch-mark Device ID was cut short); Copy source clears marks when the count drops; the unsaved open unit goes on today's sheet; a linked source's Detail cell is clean — the link has its own XLSX column 13 "Linked To"; the save message reads cleanly; CSV quotes line breaks; an unreadable unit-in-progress is restored from its local copy with a warning. loto-web: a unit with no building/room binds to the block with no location; legacy "LINKED →" prefixes are stripped. Suite: 115 tests / 120 results. Prior: rev 19 — **build 93 fixes the 2026-09-26 review of build 92** — see §6 "Build 93": delete no longer trusts an old export stamp on the pre-UUID (numeric-id) June entries, whose photos builds 83–88 never exported (b91 made delete really erase them); Duplicate / Dup / Split no longer copy a Device ID or the LOTO ID; nothing autosaves before the launch restore (the blank launch form used to overwrite the unit in progress); In/Out marks ask for the IN valve first; a lower device count clears the source's marks; dialogs fit the screen (Settings has Close/Cancel); a water check never survives a switch to Electrical; JSZip/ExcelJS are bundled (`vendor/`) — the iOS app has no service worker; an evicted entry store is announced again; an "All dates" export writes one Information Sheet per survey date; a blank Energy Source is flagged and exports as "Unknown"; Condensate Pump loses the HHW pump template's HHW In; the template-change keep rule matches its promise (and keeps the Generator's voltage source); custom photo sizes are clamped. loto-web (separate deploy): re-import pairs sheet rows with sources by identity, not position; exact cross-date names before fuzzy matches. Suite: 104 tests / 109 results. Prior: rev 18 — **build 92 adds VALVE MARKS**: right after each source photo the tech taps where the valve / breaker is; the tap rides on that photo's reference and goes out in the Information Sheet XLSX (col 12 "Valve Mark"), `entries.json` (`photoMarks`) and the CSV, and loto-web starts that source's ID box + arrow on it instead of a preset corner — see §6 "Build 92". Placement is ONE rule shared number-for-number with loto-web (`layoutValveMarks`), so two valves in one shot never get stacked boxes. Suite: 90 tests (8 new, each first proven to fail on build 91); 95/95 in web, native-mock and inside the app on the Simulator. Prior: rev 17 — **build 91 fixes the 15 defects of the 2026-09-25 max-effort review, plus Cooling Tower** — see §6 "Build 91". The two that mattered most on the iPad: pre-UUID entries (June Atlanta Main Campus, **numeric ids**) could never export a photo (a number-vs-string owner compare), and build 89 had silently moved the filename it looks for when reading those entries' photos — both fixed together (no file is moved). The entry list is now MERGED at load from every stored copy (IndexedDB, the localStorage fallback, the emergency snapshot) with deleted-id tombstones, which closes three ways the build-89 failed-read guard could still be bypassed or entries saved during a storage outage lost. The XLSX Information Sheet (the office import path) now carries **Valve State** (col 11); the web build never reports an unconfirmed download as saved; the web purge runs once per device. Suite: 82 tests (20 new — 19 each first proven to fail on build 90, plus a guard for the new load-time merge, T78); 87/87 in web, native-mock and inside the app on the Simulator. Prior: rev 16 — **build 90 = build 89 + one fix found while re-testing it**: the header photo-integrity badge now refreshes after a delete, bulk delete, backup import, clear, source removal or duplicate (it used to keep counting — or flagging MISSING — photos no longer referenced; T58). **The regression suite now runs inside the real iOS app**: `tests/run-sim-suite.sh` builds a throwaway copy of `ios/` with `tests/sim-harness.js` in its bundle (never the project's own bundle, which is what Xcode archives), reinstalls it fresh on a dedicated "LOTO Test iPad" Simulator and runs the suite against the real WKWebView and the real Capacitor Filesystem plugin — 62/62 there, and 62/62 in both desktop modes. The runner's guard was widened for this and only this: inside the app it runs only with `{iosSimulator:true}`, only when the app container is under `CoreSimulator` (never a device), and only on an empty install. §2: iOS 90 (committed, synced, in Xcode; archive pending); web still 86 with 90 staged. Prior: rev 15 — **build 89 fixes all 28 photo-integrity defects the 2026-09-24 review found** — see §6 "Photo-integrity fixes — build 89", which replaces rev 14's open-defects list. Source photos now follow their source *object* (no more index-keyed misattachment on template / type / electrical-count changes); every async photo writer is bound to its form session and Save & New / Edit / Duplicate / Clear / Export / Backup wait for it; one form identity (Save & New replaces-or-appends BY ID — a reload mid-edit can no longer save a second copy); orphan re-attach is a reviewed, missing-slots-only repair instead of a launch-time guess; filesystem writes are atomic and size-verified, IndexedDB reconnects, and the newest copy of the entry list wins at load. Every fix has a regression test written first and proven to FAIL on build 88: the suite is now 61 tests and passes 61/61 in web mode AND with the whole suite run against a mock native filesystem (`runPhotoRegressionSuite({nativeMock:true})`), and it refuses to run anywhere real data could live. Photo filenames now always carry the device code (`0924_JW-a1b2_00001`, §7); linked sources keep and export their photo, with entry + source ids on `linkedTo` (§10). §2: iOS is at 89 (archive pending); the web (`main`) is still 86 with 89 staged. Prior: rev 14 — documented the review (its open-defects list is now §6's build-89 fixes table). A max-effort code review of build 88 (nine finder angles, every candidate independently verified, plus a gap sweep) found 28 photo-integrity defects — 20 confirmed, 4 plausible, 4 unverified, none refuted, none yet fixed — documented by root cause: index-keyed source photos (template/type changes silently misattach or drop photos), three unguarded async photo writers, split form identity, launch-time orphan re-attach, and unverified storage writes; plus field rules until fixed. §6 also gains what a stored photo is (no EXIF survives the canvas) and the deferred off-app backup design, and **the regression-suite instruction now carries a hard warning: its reset erases real data, so never run it where field data lives.** §2 records which build each channel carries — the web (`main`) is on build 86 and still has the photo-destroying retake-delete. §3 adds `tests/` and the public-repo rule; §9 documents promoting builds to the web via the `loto-main-web` worktree; new §13 points to the recovery tooling and the Lumix frame-number rule. Prior: rev 13 — builds 83–88, the photo-store rebuild and its aftermath. **§6 is the section to read.** Build 83 re-keyed the photo store on entry UUIDs after name-derived keys corrupted ~1,100 photo slots across five VA facilities, adding migration/quarantine, a hard export duplicate gate, capture-time hash warnings, Photo Audit and entry-retention guards. Builds 84–88 then fixed what 83 got wrong or left rough: 84 made the migration done-flag conditional on the stores being readable; 85 scoped and chunked the quarantine export; 86 scoped Photo Audit to today's work; **87 removed the retake/misc-removal deletes that were destroying live photos**, added the in-flight capture guard and `reattachOrphanedPhotos()`; 88 gave duplicated sources their own `sourceId` and recorded the copied photo as a `{dupOf}`. The regression suite is now 12 tests and is the gate on any photo-path change. §10 gains the office `Information_Sheet_MMDDYY.xlsx` field-app layout spec — geometry, the bare-reference photo rule, the `photo_detail` `String(20)` position-marker trap — and the cross-date survey problem that stranded 71 Atlanta photos. §8 versioning and §11 code map refreshed to build 88 / cache v7.84. Prior: build 79: simplified verification — water sources get Drain/Gauge checkboxes synthesizing the same canonical strings, electrical defaults to Controls, Settings toggle reverts to classic pickers (§5.4c). Prior: rev 10 — builds 74–77: durable photo storage + integrity. §6 rewritten: full-res photos now write to the **native filesystem** (Capacitor Filesystem, `DATA/loto_photos/`) with IndexedDB/localStorage as fallbacks, after iOS storage eviction silently lost 74 photos on 2026-08-04; capture-time save verification, export integrity guard, header integrity badge, collision-proof photo keys. §7: local-day date semantics + filtered-day export stamps; reuse-a-photo share model with export dedup; per-entry `exportedAt`/`exportId` stamps. §5.5: export-status badges + delete guards with "Export these first" escape hatch. New template: Unit Heater - Natural Gas. Prior: rev 9 — §5 registry inventory expanded. Named the equipment-side registries the doc had glossed over (`EQUIPMENT_HAS_OWN_VOLTAGE_PROMPT`, `EQUIPMENT_PROMPT_FOR_TEMPLATE`, `EQUIPMENT_DIAGRAM_OVERRIDE`, `CONDENSATE_AUTO_EQUIP`, `CUSTOM_EQUIP_KEYWORD_TEMPLATE`) plus a new "Other registries (misc but load-bearing)" bullet block covering `SOURCE_DEFAULTS`, `ENERGY_DEVICE_MAP`, `ENERGY_KEYWORD_TEMP`, `ENERGY_LABEL_PREFIX/COLORS`, `PHOTO_DEFAULTS`, `SKETCH_DIAGRAMS`, `SAVED_FILTERS`, `HOSPITALS`. Prior revs: rev 8 = ingester live; rev 7 = data-entry UX pass; rev 6 = ZIP restructure.)
**Repo:** [github.com/whittw1/loto-info-sheet](https://github.com/whittw1/loto-info-sheet)
**Prior standalone doc:** `LOTO_Integration_Architecture.md` in `~/Desktop/Claude Apps/LOTO Information Sheet App/` (April 2026, pre-iOS work — kept for reference, superseded by this file).

---

## 1. What this app is

A **single-page HTML+JS Progressive Web App** used on iPads / mobile devices in the field to capture LOTO (Lockout/Tagout) equipment data — energy sources, verification methods, isolation devices, photos, and annotated overhead diagrams — one equipment entry at a time.

The app has **no backend, no database, and no user accounts** of its own. Everything runs client-side in the browser (or in a Capacitor WebView on iOS). Entry data lives in `IndexedDB` + `localStorage`; full-resolution photos live on the **native filesystem** on iOS (with IndexedDB/localStorage as fallbacks — see §6) until the user exports. The one exception is optional: since build 101 the **SharePoint live backup** (§6 "Build 101") sends copies, after a Microsoft sign-in, to four small functions on the same Azure site — nothing on the device ever depends on them.

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

**The SharePoint backup API (build 101)** — `/api/upload`, `/api/upload-session`,
`/api/device-token`, `/api/device-pass` — lives only on the Azure address (the
Static Web App's managed functions, `api/`), with `backup-link.html` (the iPad's
sign-in page). The iPad app calls it there (`BACKUP_HOST`); the web app calls its
own origin, so the backup works on the Azure address and not on the GitHub Pages
copy. It writes into one SharePoint site only; its settings live in Azure (§6
"Build 101", `api/README.md`).

### Which build each channel carries (checked 2026-09-28)

| Channel | Source branch | Build | Photo-safety status |
|---|---|---|---|
| iOS / TestFlight | `ios-testflight-scaffold` | **100** (cache v7.96) — archived 2026-09-28; it supersedes 95–99, which were never uploaded (94 was the TestFlight build before it) | The iPad was last known on **90**. Installing 100 over 90 is exactly the path the upgrade chain (`tests/fuzz/upgrade/`, b88 → b90 → 100 installed over each other on a Simulator) verified: every unit and every photo byte intact, the June numeric-id photos readable again ("✓ N photos safe"), the June units flagged "⚠ export again (photos)" until one export by this build ships them. **Export before deleting anything.** |
| Azure SWA + GitHub Pages (web) | `main` | **100** — promoted 2026-09-28 (§9) | Same code; web-only fixes that matter there: the tab claim (one tab writes; the other pauses — and, since 96, a build-94 tab still open during a deploy pauses too; since 99 its final autosave is read back, and since 100 a change made right after opening is kept); a launch waits on the Web Lock of a tab still writing photos, with **Open anyway** after 10 s (99) — §6 "Tabs (web only)"; and the offline export (verified with the server killed after the service worker precached). |

**Build 101** (the SharePoint live backup) is on branch `sharepoint-backup` and on
neither channel yet: it is released once the backup's one-time admin setup
(`api/README.md`) is done and checked against the real SharePoint site.

**The web build is used in the field** — Bath VAMC (April 2026) was collected entirely on it — so a crew may be on either channel. Treat the two as one release: never leave `main` behind a photo-safety fix. To check what a channel carries: `git show origin/main:index.html | grep -o 'b[0-9]*</span>'`, or read the header on the device.

---

## 3. Repository layout

```
loto-info-sheet/                              (the GitHub repo)
├── index.html                                (~12,000 lines — the whole app)
├── FingerLakes_Information_Sheet.html        (byte-identical mirror of index.html)
├── sw.js                                     (service worker — network-first cache)
├── manifest.json                             (PWA manifest, main)
├── manifest_fl.json                          (PWA manifest, FL alias)
├── staticwebapp.config.json                  (Azure SWA cache headers + SPA fallback; build 101: /api/device-token for signed-in
│                                              visitors only, the API's Node 20 runtime, 401 stays 401)
├── backup-link.html                          (build 101: the iPad's Microsoft sign-in for the backup — hands a one-time code back to the app)
├── api/                                      (build 101: the SharePoint live-backup functions — Azure Functions, the SWA's managed API)
│   ├── README.md                             (what they do + the ONE-TIME ADMIN SETUP: SharePoint site, app registration, settings)
│   ├── upload/ · upload-session/             (write one file, verified / start a large upload)
│   ├── device-token/ · device-pass/          (the iPad's sign-in: one-time code → device pass, OAuth PKCE)
│   └── shared/graph.js · shared/qxh.js       (Graph, safe paths, who is asking, the pass / QuickXorHash)
├── package.json                              (Capacitor deps + build/sync/open scripts)
├── capacitor.config.json                     (App ID, name, webDir)
├── README.md                                 (user-facing features)
├── ARCHITECTURE.md                           (this document)
├── TODO.md                                   (deferred work)
├── IOS_RELEASE_SETUP.md                      (fastlane + GitHub Action prereqs)
├── tests/
│   ├── photo-regression.js                   (regression suite, 178 tests / 183 results (T1–T173) — runs in a browser or inside the app on a Simulator — §6)
│   ├── sim-harness.js                        (loads the suite into a throwaway SIMULATOR build; inert without its trigger file)
│   ├── run-sim-suite.sh                      (one command: sync → throwaway ios/ copy + harness → fresh install on "LOTO Test iPad" → run → report)
│   ├── fuzz-harness.js                       (random-action fuzzer with data-safety oracles — build 94 review, §6; refuses real data)
│   ├── sim-fuzz-harness.js                   (runs the fuzzer inside a throwaway Simulator build; inert without its trigger file)
│   ├── sim-backup-harness.js                 (build 101: the backup's native path inside a throwaway Simulator build; inert without its trigger file)
│   ├── api/api.test.js                       (build 101: the api/ functions with Graph faked — `node tests/api/api.test.js`)
│   ├── fuzz/                                 (the execution-based review kit — README: headless driver (one seed per run; a crashed
│   │                                          page is reported, not hung), suite runner, loto-web differential, Simulator fuzz,
│   │                                          b88→b90→current upgrade chain, offline / two-tab / build-94-tab / phone checks;
│   │                                          build 101: the backup end to end against the real functions, web and Simulator)
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
| **ZIP generation** | JSZip 3.10.1 — bundled, `vendor/jszip-3.10.1.min.js` (build 93; it came from a CDN before, and the iOS app has no service worker) | Client-side ZIP creation for exports |
| **XLSX generation** | ExcelJS 4.4.0 — bundled, `vendor/exceljs-4.4.0.min.js` (build 93) | Per-cell styling (SheetJS community can't do this) |
| **Sketch** | Inline SVG diagrams + HTML5 Canvas overlay with pointer events (Apple Pencil supported via `setPointerCapture`) | 20 pre-drawn equipment diagrams; user draws + drops labels on top |
| **iOS wrapper** | Capacitor 8.3 (WKWebView) | Wraps `index.html` as a native app for TestFlight distribution |
| **iOS OCR** | Custom Capacitor plugin using Apple Vision (`VNRecognizeTextRequest`) | Registered in `AppDelegate.swift`; better English-print accuracy than ML Kit, no external SDK |
| **iOS file share** | `@capacitor/filesystem` + `@capacitor/share` | Native share-sheet — required for iOS since `<a download>` is a no-op in WKWebView |
| **SharePoint backup (optional, build 101)** | Azure Functions (the Static Web App's managed API, Node 20, no npm dependencies) → Microsoft Graph (`Sites.Selected`, app-only); iPad: `CapacitorHttp`, `@capacitor/browser` (the sign-in sheet), `@capacitor/app` (`lotocollector://` return) | No Microsoft credentials on the devices; writes into one SharePoint site only; the iPad's native HTTP has no cross-origin rules |

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

### 5.5  Saved-panel UX + Copy Source + autosave indicator + messages + export badges

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

Four transient UX features live on top of the persisted data model. None of
them are exported or serialised — they exist to make the on-device workflow
faster and to say plainly what the device's storage is doing.

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

`autoSaveCurrent()` sets `'saving'` on entry and `'saved'` once the form is in
its slot — `current_wip`, or `current_wip_alt` while `_wipUnread` (see §6 "The
unit in progress"), written through the claim-checked `wipSlotTx` (build 97) —
or in that slot's localStorage copy when IndexedDB fails; `'error'` when both
fail, with `showToast('Storage issue - export soon', true)` for a louder signal.
A form unchanged since the launch is not written for 3 s after a build-94 tab was
told to pause (build 99; it reads `'saved'`). After a late launch the form can
wait in memory for a kept unit's save: the indicator stays at `'saving'`
meanwhile (build 100).

The indicator initially reads `💾 Autosave ready` — it changes to a real
timestamp on the first successful save after page load.

#### Messages — the toast and the banners

One toast element, used as a small queue (`showToast`, build 99): a warning
stays for its own time (2 s; 4 s when it runs to several lines) and messages that
come meanwhile show under it; anything else gives way to the next message; at most
three lines are on screen — the oldest non-warning goes first, and the newest
always shows. (Builds 97–98 kept a warning only 0.6 s ahead of the next message.)
A note that belongs with another message is composed into it rather than shown
after it: "Valve marks cleared" (build 95) and the 10-source heads-up
(`sourceLimitNote` / `showSourceToast` — one rule for every caller, build 99).
Conditions that last are **sticky banners** (`showStickyBanner`, build 95):
storage writes failing, the entry store unreadable or empty, units the last save
couldn't write restored from another copy, fewer units than the last save wrote,
a unit in progress that couldn't be read, an unsaved edit a late launch left in
its slot. On phones, storage and photo warnings repeat in the bottom bar (build
95).

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

- **Key format:** `photo::<entry-id>::<slot-token>::<capture-rev>` minted by
  `photoStoreKey(entryId, slotToken[, rev])`; parsed by `parsePhotoKey`. Slot tokens:
  `main` / `dataplate` / `ee` / `<sourceId uuid>` / `misc-<8hex>`. The in-progress
  form owns a stable `currentEntryId` (minted at first capture, saved into the
  autosave state, becomes `entry.id` on save). **Owner ids (build 89):** a v4 UUID,
  or the numeric `Date.now()` id of a pre-UUID entry (`isValidEntryId`) — Bath's
  April entries carry those, and before build 89 every key minted for them was
  unparseable, so their photos were excluded from every export as "legacy". A
  missing or malformed id is replaced by a UUID; the old value is kept as `legacyId`.
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
  to a different entry (red banner) — `recordPhotoHash`. Build 89: index updates
  are serialized (concurrent captures used to drop each other's records), and a
  pure-JS SHA-256 (`sha256HexJS`, verified against Node's crypto) takes over when
  `crypto.subtle` is unavailable — the web build over plain http to a LAN IP —
  where hashing used to return null and silently switch off the duplicate gate.
  Build 99: the index is read, added to and written in ONE claim-checked
  transaction (`claimedMetadataTx`) — a tab that lost the claim in between used to
  write its stale index over the live tab's.
- **Export enforcement:** `resolveExportPhoto` ships bytes only through keys the
  entry's id owns — legacy/foreign keys, and (build 89) source photos whose key
  names a different source, are excluded + confirmed with the user (`unsafeRefs`,
  each with a `reason`). Bytes are verified against the capture hash
  (`loadPhotoBytes(key, type, sha256)` passes over a copy that doesn't match — a
  truncated file — for one that does; if none match, the photo ships flagged
  `hashMismatch` after a confirm). Before the ZIP is finalized, a **duplicate gate**
  hard-aborts if byte-identical files are claimed by different entries with no
  recorded dup — `isRecordedDup()`: a `dupOf`, or a pre-b83 Reuse share
  (`shared: true`, which the migration carried over without `dupOf` and which used
  to hard-block every export containing two of them). `manifest.json` carries
  `photos: [{filename, sha256, entries:[{entryId, slot, sourceId?, dupOf?,
  hashMismatch?}]}]` plus `counts.unsafeRefs` / `counts.hashMismatches`.
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
  - **Build 87 — `reattachOrphanedPhotos()`; build 89 — reviewed, missing-only.**
    Because a key names its owning entry *and* slot/sourceId, a stored photo that
    no entry references can be put back where its key says it belongs. Build 87
    ran it at every launch and also filled EMPTY slots — but since 87 every
    discarded shot and superseded retake leaves exactly such a photo, so it could
    attach a photo from an abandoned edit to a unit. Build 89: never at launch;
    Photo Store Report button only; candidates are slots whose current bytes are
    **missing** (never empty, never healthy); a source token matching more than
    one source is skipped as ambiguous; linked / no-photo sources are skipped; a
    person reviews every candidate (missing thumbnail beside the unattached photo)
    before anything is attached; re-attached entries lose `exportedAt`.
- **Every async photo writer is bound to its form session (build 89; replaces
  build 87's capture counter).** Capture (`handlePhoto`), misc capture, Reuse and
  Duplicate-with-photos register with `startPhotoWrite()` / `endPhotoWrite()`;
  while any is in flight, Save & New, Edit, Duplicate, Clear, Export and Backup are
  refused with a "⏳ A photo is still saving" toast (`photoWritesBusy()` treats a
  write older than 60 s as dead, so nothing can block forever). Each writer also
  captures `formSession` when it starts; `beginNewFormSession()` runs on clear /
  Save & New / Edit / Duplicate. A writer that finishes after its session ended
  **never writes into the new form or into a saved entry** — its bytes stay on the
  device, unattached (Photo Store Report), and the user is told. Build 87's "form
  moved on" branch — which wrote a *discarded* retake into the saved entry, by
  index, before its bytes were verified — is gone. A source capture is bound to
  the source OBJECT when the camera returns and re-resolves its index when the
  bytes land. A retake whose store fails puts the previous photo back. A native
  save that silently fell back to evictable IndexedDB still warns loudly.
- **Source photos follow their SOURCE, never an index (build 89).** Source photos
  still live in `photos['source_<index>']`, but every change to the order or
  membership of `sources` goes through `rebindSourcePhotos(prevSources)`, which
  moves each photo with its source object (move / remove / split / duplicate /
  template / type / electrical-count). A template or equipment-type change KEEPS
  any source that already has a photo (now a user source, photo attached, ahead of
  the template's sources); the electrical-count prompt never removes a photographed
  source; refs past the last source are dropped (`dropStaleSourceRefs`). Before
  this, a template change after shooting silently turned the LPS valve photo into
  the "DW In" photo. For HISTORICAL damage, `sourcePhotoBindingProblem()` checks a
  source photo's key token against the source's `sourceId` (plus `priorSourceIds`,
  recorded when duplicate ids are split, and any `sourceConfirmed`): the export
  excludes and reports a mismatch, and the Photo Audit lists it with a **Keep on
  this source** button (`confirmSourcePhoto`) for when a person confirms it's right.
- **FS filenames are reversible encodings** of keys (`p.<id>.<slot>.<rev>.jpg`,
  `photoKeyFromFsName`) so `fsPresentKeySet()` can reconstruct exact keys.
- **Entry retention:** `saveAll` maintains `loto_entry_count` + a
  thumbnail-stripped `loto_saved_snapshot` in localStorage; `loadAll` restores
  the snapshot if the primary store comes up empty and shows a red banner if
  fewer entries load than expected. Backup-import merges dedupe by entry **id**
  (never by name), and the Backup dialog states in red that photo bytes are not
  included. **Build 89:** every entry-list write is stamped
  (`saved_equipment_at` in IndexedDB — written in the same transaction —
  `loto_saved_at` beside the localStorage fallback copy), and `loadAll` loads the
  NEWEST copy (`firstCopyIsNewer`; copies from before build 89 are compared by the
  newest time recorded inside them). The form autosave carries its own `at`. The
  snapshot is written back only when IndexedDB READ successfully but empty (real
  eviction); after a failed READ it is shown, never written over the store —
  `_entryStoreUnread` makes the next `saveAll` re-read the store and merge back
  anything memory lacks (entries, sketches, thumbnails) before writing.
  `repairPhotoRefs()` rebuilds thumbnails a snapshot restore stripped, and photo
  slots show as taken by their stored key, not their thumbnail. (Since build 91
  the launch MERGES every stored copy instead of picking the newest — see "The
  launch" below.)
- **One form identity (build 89).** "Editing" means a saved entry has the form's
  `currentEntryId`; `performSaveAndNew` replaces-or-appends **by id**, and `loadAll`
  re-derives `editingEntry` from the id — the object reference didn't survive an
  iOS WebView reload, which is how a reload mid-edit saved a second entry with the
  same id. An edit keeps the entry's `savedAt`, `hospitalCode` and `legacyId`.
  Entries already saved twice show a **SAVED TWICE** badge, export once (the newest,
  after a confirm), and deleting either copy never deletes photo bytes
  (`deleteEntryPhotos` does nothing while another row — or the open form — has the
  same id).
- **Photo Audit is scoped to today by default (build 86).** The Settings button
  runs `runPhotoAudit('today')` — entries saved today plus the open form — with an
  in-overlay toggle to the full-device audit. Unscoped, a field pre-flight drowned
  in the ~340 historical legacy-suspect entries and told the crew nothing about
  the day in front of them. Each scope labels what it covers, so a historical
  collision is never mistaken for today's work.
- **Tests:** `tests/photo-regression.js` — **178 tests** (183 results), run by loading the app
  and calling `runPhotoRegressionSuite()`. T1–T7 cover the
  original directive (same-name isolation, re-export byte stability, duplicate
  provenance, the cross-link/legacy export gates, key format, and a 500-entry /
  50-same-named scale test); T8–T11 the data-loss regressions of builds 83–88
  (edit→retake→discard, edit→remove-misc→discard, orphan re-attach, the Air
  Handler 16 duplicate-source scenario); **T12–T57 one per defect of the
  2026-09-24 review**, each written before its fix and proven to FAIL on build 88
  (see the table below); T58 (build 90) checks the integrity badge follows
  deletes; T59–T157 are one per finding of the later reviews and fault campaigns
  (builds 91–100), each written first and proven to FAIL on the build before — see
  each build's table below; T158–T173 cover the SharePoint live backup (build 101).
  **If you change any photo path, run it in all three environments and expect every
  result to pass in each (183/183 at build 101):**
  1. `runPhotoRegressionSuite()` in a desktop browser (web: IndexedDB);
  2. `runPhotoRegressionSuite({nativeMock: true})` there too — an in-memory
     Capacitor Filesystem for the whole run;
  3. **`tests/run-sim-suite.sh`** — the suite INSIDE the real iOS app on an iOS
     Simulator (real WKWebView, real Filesystem plugin): it syncs, builds a
     throwaway copy of `ios/` with `tests/sim-harness.js` + the suite in its
     bundle (the project's own `ios/App/App/public`, which Xcode archives, is
     never touched — the script aborts if the harness ever appears there),
     reinstalls fresh on a dedicated "LOTO Test iPad" simulator, drops the
     trigger file `Documents/RUN_PHOTO_SUITE` into the app container, launches,
     and reads `Documents/loto_test_results.json` back (exit 0 = all pass).
     `SUITE_OPTS='{"skipScale":true}'` passes options through.
  The fault-injection tests wrap whichever Filesystem plugin is live, so inside
  the app they inject REAL partial writes, 0-byte files and listing failures.
  `{skipScale:true}` skips the slow 500-entry test; `{only:['t12_', …]}` runs a
  subset.
  > **⚠ Run it ONLY in a desktop browser against a local server with no real data**
  > (e.g. `python3 -m http.server` in the repo root, a fresh browser profile). It
  > ERASES every entry and photo in that browser profile. The runner enforces
  > this: in a browser it refuses off `localhost` and wherever saved entries exist
  > unless called with `{iUnderstandThisErasesAllData: true}`; inside the app it
  > runs ONLY with `{iosSimulator: true}`, ONLY when the Filesystem plugin's
  > container path is under `~/Library/Developer/CoreSimulator/Devices/` (a real
  > iPad's is `/var/mobile/…`), and ONLY on an install with no entries and no
  > photo files; its reset refuses to run outside an armed suite run.

  `tests/fuzz/run_suite.mjs` runs the suite headless (`ONLY=t100,t101`,
  `VERBOSE=1`, `NATIVE_MOCK=1`). Beyond the suite, `tests/fuzz/` RUNS the app
  (build 94, extended through build 99): a seeded random-action fuzzer with
  data-safety oracles — with and without storage faults, and inside the app on
  the Simulator — every export fed to loto-web's real importer, a b88 → b90 →
  current upgrade chain on a Simulator, and two-tab / build-94-tab / offline /
  phone-width checks; its README has the commands.

  Also `tests/production_store_scan.py` (read-only quarantine classifier against the
  8/5 all-dates export bundles).

### Photo-integrity fixes — build 89 (all 28 findings of the 2026-09-24 review)

A max-effort review of build 88 (nine independent angles, every candidate verified,
plus a gap sweep) found 28 photo-integrity defects. **Build 89 fixes all of them.**
Each fix has a regression test written first and proven to FAIL on build 88; the
suite then passes 61/61 in web mode and 61/61 against the mock native filesystem.
Grouped by the review's root causes.

**Root cause 1 — source photos were keyed by array index**

| Finding | Fix | Test |
|---|---|---|
| CRITICAL: a template change after shooting left each photo on whatever new source took its index (LPS photo → "DW In") | `applyTemplate` keeps photographed sources (as user sources, photos attached) ahead of the template's; all reorders go through `rebindSourcePhotos` | T12 |
| An equipment-type change silently dropped photographed auto sources | `equipTypeChanged` keeps photographed sources | T13 |
| A capture's slot was fixed by index when the camera returned | `handlePhoto` binds to the source object and re-resolves its index when the bytes land | T14 |
| (same cause) electrical-count change, template clear, stale refs past the last source | count change never removes a photographed source and rebinds; template clear keeps photographed sources; `dropStaleSourceRefs`, `addSource` never inherits | T15 |
| Historical damage already in saved entries | `sourcePhotoBindingProblem`: excluded + reported at export; Photo Audit lists it with **Keep on this source** (`confirmSourcePhoto`); duplicate-id splits record `priorSourceIds` so a copy's own photo still binds | T53, T53b, T54 |

**Root cause 2 — only one of four async photo writers was guarded**

| Finding | Fix | Test |
|---|---|---|
| `executeDuplicate` poured copies into another unit's form when Edit was tapped mid-copy | form session + tracked write; the other actions wait; copies placed by source object; aborts if the session ends | T16 |
| `reusePhotoInto` minted its key after the first await — a quick Save & New put the photo on the next unit | target fixed before the first await; tracked write | T17 |
| `handleMiscPhoto` landed on the next unit and was dropped at export | session-bound, tracked | T18 |
| The b87 "form moved on" branch wrote a *discarded* retake into the saved entry | branch deleted; late bytes stay unattached and the user is told | T19 |

**Root cause 3 — form identity was split**

| Finding | Fix | Test |
|---|---|---|
| A reload mid-edit made Save & New append a second entry with the same id | replace-or-append by id; `editingEntry` re-derived at load | T20 |
| Export while editing shipped the entry twice | the open form's snapshot (`snapshotFormEntry`) replaces its saved copy | T21 |
| Entries already saved twice | **SAVED TWICE** badge; export ships the newest after a confirm; `saveAll` warns; deleting one copy deletes no bytes | T50, T55 |

**Root cause 4 — orphan re-attach at every launch**

| Finding | Fix | Test |
|---|---|---|
| Launch-time re-attach filled EMPTY slots with discarded/wrong photos | not at launch; missing-slots-only; ambiguity-safe; person-reviewed with thumbnails | T22 (T10 still passes) |

**Root cause 5 — storage writes and reads weren't verified**

| Finding | Fix | Test |
|---|---|---|
| Non-atomic filesystem write left 0-byte/truncated files counted as saved | temp file → size check → rename (`fsWritePhoto`); listings ignore temp and <100-byte files; temp files cleaned at launch | T23, T24 |
| A truncated file was served ahead of the good copy | reads verified against the capture hash | T25 |
| IndexedDB handle never reconnected; stale IndexedDB preferred at load | `withPhotoDB` reconnect-and-retry; `idbAvailable` no longer a gate; stamped copies, newest wins | T26, T27, T27b |
| "Export anyway" stamped incomplete entries exported | they get `exportIncompleteAt` ("exported incomplete"), never `exportedAt` | T57 |
| Snapshot restore overwrote an intact store after a failed read | write-back only after a successful empty read; `_entryStoreUnread` merge-before-write | T28 |
| Slots gated on the thumbnail looked empty; a tap opened the camera | slots render and guard by stored key; `repairPhotoRefs` rebuilds thumbnails | T29 |
| A blank canvas (`data:,`) was saved as a 0-byte photo | `renderCapture` refuses it and clamps the canvas to 16 MP; `storePhotoBytes` refuses <100 bytes | T30 |

**Export and data management**

| Finding | Fix | Test |
|---|---|---|
| Misc/diagram filenames of same-named units in one room overwrote each other | names carry the entry id (`…_{id8}_Misc1.jpg`, `…_{id8}_diagram.png`); a used-name guard | T31 |
| Key migration wasn't resumable (a kill left duplicate copies, lost updates) | deterministic revs, verified reuse of existing copies, checkpoints every 20 | T32 |
| Pre-b83 Reuse shares hard-blocked exports | `shared:true` counts as a recorded dup | T33 |
| Backup import: Cancel meant REPLACE; Replace rolled photo refs back | three-way Merge / Replace / Cancel dialog; Replace keeps the device's version of shared entries | T34, T35 |
| Edit/Duplicate discarded a photo-only form without asking | `formHasData()` | T36 |
| Whole-ZIP-in-memory export defaulting to All dates | defaults to the newest day; ZIP `STORE`; native save written in 3 MB chunks | T51, T52 |

**Found by the gap sweep**

| Finding | Fix | Test |
|---|---|---|
| A typed collector tag made filenames collide across devices | the device code is always added (`JW-a1b2`) | T37 |
| Photo numbers weren't reserved before the ZIP left the device | reserved before the share sheet; per-date used numbers; re-typed numbers prompt | T38, T38b |
| The regression suite's reset erased real data | runner refuses in-app / off-localhost / with entries | manual check |
| Linking deleted the source's photo (and loto-web ignores `linkedTo`) | photo kept and exported; `linkedTo` gains `entryId` + `sourceId` | T39 |
| Save & New autosaved the previous unit's sketch into the blank form | sketch cleared before anything autosaves | T40 |
| The XLSX dropped sources 11+ | the XLSX keeps 10 per unit **on purpose** — loto-web's office importer reads fixed 27-row blocks and a taller block would misparse every later unit; an 11th source toasts and the export confirms; CSV + `entries.json` carry all | T41 |

**Cleanups:** dead `supersededKey` removed and the key-core comment corrected; the
double autosave in `handlePhoto` is gone; misc export goes through
`resolveExportPhoto`; slot tokens unified in `slotTokenFor`; `crypto.subtle`
fallback (T44); the export no longer gives the last saved entry the open form's
sketch (T42); numeric pre-UUID ids own their photos (T43); the IndexedDB
self-test record is never a photo (T45); a failed folder listing is "unknown",
never "empty" — the key migration no longer finalizes without FS-only photos
(T46); hash-index updates serialized (T47); capture exceptions are reported
(T48); Photo Audit uses the form's slot names (T49). Also fixed while in there: a
retake that fails to save keeps the previous photo (T56), and an edit keeps its
entry's facility stamp instead of re-stamping it with the current setting. Left as
is: `hashWarning` (written, not read — kept as evidence) and an unpruned
`photo_hash_index` (~100 bytes per photo).

**Build 90 (found while re-testing b89):** the header integrity badge refreshed
only on capture and at launch, so after a delete, bulk delete, backup import,
clear, source removal or duplicate it kept counting — or flagging as MISSING —
photos no longer referenced. Each of those now calls `updateIntegrityBadge()`
(T58: fails on b89, passes on b90).

### Build 91 — the 2026-09-25 review (15 findings + Cooling Tower)

A second max-effort review (16 finder angles over the whole app, every candidate
independently verified — ~70 real defects, none refuted — plus a gap sweep)
reported its 15 most severe. **Build 91 fixes all 15 and the Cooling Tower
template.** Same discipline as build 89: each fix has a test written first and
proven to FAIL on build 90 (T59–T77), plus T78 guarding the new load-time merge. Suite:
**82 tests** (87 results with sub-checks) — **87/87** in web, `{nativeMock:true}` and
inside the app on the Simulator (`tests/run-sim-suite.sh`).

| Finding | Fix | Test |
|---|---|---|
| Web (`main`) was still build 86 — the retake-delete | build 90 promoted 2026-09-25 (`52574d9`); 91 follows | — |
| **Pre-UUID entries have NUMBER ids** (`Date.now()`); a key's owner parses as a string, so every strict compare failed: all their photos (the June Atlanta Main Campus units — 55 entries, 307 photo refs) were excluded from every export, reshoots included; never freed on delete; "Keep on this source" did nothing | ids normalised to strings everywhere they come in (load, import, edit, restore); every owner compare goes through `sameEntryId()` | T59 (T43 had used a string id) |
| **Build 89 moved the filename of numeric-owner keys**: builds 83–88 couldn't parse them and wrote `loto_photos/photo__<id>__<slot>__<rev>.jpg`; 89+ looked only for `p.<id>.<slot>.<rev>.jpg` — those photos became unreadable after the upgrade. (This is almost certainly the iPad's b83 "307 of 1487 MISSING": exactly those entries' photo refs.) | `photoFsCandidatePaths()` — read / exists / delete / mtime try both names; `photoKeyFromFsName` maps the old name back to its key. No file is moved | T60 |
| A photographed source marked "no photo" (energy-source mis-pick — the flag stuck; or "Hide photo slot") was silently left out of the export, yet stamped exported → bulk delete erased the only copy. The launch migration also re-showed hidden slots every launch | the export ships every attached photo; a photographed slot is always shown and can't be hidden; visibility follows the current energy kind (`applyNoPhotoDefault`); the per-launch migration is removed | T61, T61b, T61c |
| Web: `saveOrShare` reported success right after `a.click()` → every export stamped "exported" even if the download was dismissed | `saveOrShareWeb`: share sheet where files can be shared (reports cancel), else download + "Did the file save?"; only a confirmed save stamps; the URL is revoked after 2 min | T62 |
| The failed-read guard (T28) was bypassable three ways: loadAll's migration write-back; an unread session's localStorage fallback winning the next launch; a failed `current_wip` read autosaved over by the blank form | load **merges** all copies (below); migrations write only via `saveAll` after a successful read; while `current_wip` is unreadable autosaves go to `current_wip_alt`, resolved next launch (newer restored, an older unit with content kept as a `recoveredDraft` entry) | T63, T64, T65 |
| Entries saved during an IndexedDB write outage were lost: the full-list fallback can't fit in localStorage, the snapshot was read only when the store was EMPTY, and the next save (e.g. the export the red banner asks for) overwrote it | the merge includes the snapshot whenever it is at least as new as the store; a sticky red banner + error chip while the list can't be written anywhere | T66 |
| The XLSX (the office import path) had no valve state | `Valve State` column (col 11); loto-web reads it | T67 |
| Duplicate-with-photos: a photo taken during the copy was overwritten by the original's; deleting the original mid-copy destroyed both | captures refused while a duplicate copy runs; the copy never overwrites a slot that got a photo; delete / bulk delete / import wait for photo writes | T68, T68b |
| Typed data on template sources (Device IDs, NC states) was discarded by a template / type change with no confirm (`auto` never cleared; `_customLocation` typo) | `userEdited` marks any source the user changed; such sources are kept like photographed ones (confirm text updated) | T69, T69b |
| Cancel on the ATS/Generator/Chiller voltage prompt left stale cards bound to old indexes (photos / typed IDs landed on other sources) | the cards are redrawn when the prompt opens and on Cancel | T70 |
| Exported diagrams: pixel strokes drawn unscaled in the 612×500 viewBox (misplaced / clipped for every saved unit); eraser cut holes through the drawing | strokes stored as fractions (`u:'f'`, `cw`); pixel strokes scaled by the on-screen width at export; ink on its own layer | T71, T71b |
| The open form's diagram came from the live canvas (a collapsed section → 0-byte PNG) | every diagram renders from its snapshotted data; render failures are reported | T72 |
| Sketch edits in a discarded edit changed the saved entry (shared arrays); Duplicate kept the previous unit's drawing | `restoreSketch` deep-copies; Duplicate clears the drawing first | T73, T74 |
| Equipment name / room / custom template were never autosaved (a WebView reload restored the previous unit's room) | `oninput` autosave + flush on `visibilitychange` / `pagehide` / before the camera opens | T75 |
| Web: the service-worker purge ran on every cold start → the web app couldn't open offline | once per device, never offline; `sw.js` caches only good responses, precaches ExcelJS | T76 |
| Cooling Tower's template replaced Kinetic + Electrical with Kinetic only | the template carries the disconnect (the 120/208/480 prompt follows) | T77 |

**The entry list at load (build 91).** `loadAll` no longer picks ONE copy. It
merges IndexedDB (primary), the localStorage fallback and the emergency snapshot
(`mergeEntryCopies`): per entry id the newest save wins (`entryRecency`); a
stripped winner (snapshot: no `sketch`, no thumbnails) is filled back from another
copy; ids only in another copy are added — unless **tombstoned**, and only from a
copy provably newer than the store's last write (store stamps, or the fallback
list a failed store write left). A copy older than the primary (e.g. a snapshot
the quota froze) is skipped, so it can't bring back entries deleted since (T78). **Tombstones** (`localStorage.loto_deleted_ids`,
mirrored as `deleted_ids` in IndexedDB): delete, bulk delete and a backup Replace
record the ids that leave the list (never an id another row still has — a unit
saved twice keeps its other copy); saving or importing an id clears it. Rows the
primary holds twice under one id stay as they are.

**Field note (build 90 on the iPad, 2026-09-25).** Build 90 was installed before
the review. It could not delete the June entries' photo files (its only delete
path skips numeric-owner keys, and it computes the new filename anyway), so they
are intact; build 91 reads them. Until 91 is installed: don't delete those
entries, and don't rely on exporting their photos.


**In the field with build 89:** install it on every device, and promote it to the
web — `main` is still 86 (§2). After a template or type change on a unit you've
already photographed, the photographed sources stay (photos attached) next to the
new template's — delete the ones that don't apply. A "⏳ A photo is still saving"
toast means wait a second and tap again. Run Photo Audit (today) before leaving
site; on older data, "photos on the wrong source" lists historical damage to
check.

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
- **Write path:** `storePhotoBytes(dbKey, dataUrl)` — refuses an empty payload
  (<100 bytes: a blank canvas), then tries the filesystem first, falls back to
  IndexedDB, then to localStorage **only if IndexedDB failed even after
  reconnecting** (never alongside a working IDB — the ~5 MB quota is precious).
  **Build 89 — atomic:** the plugin's `writeFile` is `Data.write` without
  `.atomic`, so an interrupted write used to leave a 0-byte or truncated file
  under the real name. `fsWritePhoto` now writes `loto_photos/.tmp_<name>`,
  checks the exact byte size, then `rename`s it into place (atomic; the plugin
  replaces an existing destination). `cleanupFsTempFiles()` removes stray temp
  files at launch.
- **Read path:** `loadPhotoBytes(dbKey, type[, expectSha256])` — filesystem →
  IndexedDB → localStorage, skipping empty copies. With the capture hash it
  skips a copy whose bytes don't match for one that does (export, reuse and
  duplicate pass it). Every consumer (export, full-res viewer) goes through it.
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
  **Build 89:** the FS listing ignores temp files and files under 100 bytes, and
  a listing that FAILS returns `null` → the set is marked `.incomplete`: the
  integrity check then probes each unlisted key directly instead of reporting it
  missing, the key migration doesn't mark itself done, and re-attach refuses to
  run. (Before, a failed listing looked like an empty folder.)

On the plain web build `fsPlugin()` returns null and IndexedDB remains primary
— same code, no branching at call sites.

### IndexedDB — `loto_photos_v3` (web primary / native fallback)

Two object stores:

| Store | Key | Value | Used for |
|---|---|---|---|
| `photos` | `dbKey` (string) | `{ data: ArrayBuffer, type: string, size: number }` | Full-res photo bytes |
| `metadata` | key string | any JSON | `saved_equipment` (the main list) + `saved_equipment_at` (build 89 stamp) + `deleted_ids` / `restored_ids` (the delete / re-save records, build 96) — all four written in one transaction, see "The list write" below; `current_wip` / `current_wip_alt` (the two unit-in-progress slots, each copy with its own `at` — see "The unit in progress"); `photo_hash_index`; `photo_migration_report`; since build 101 `backup_sent` / `backup_days` (the SharePoint backup's records — §6 "Build 101") |

**Connection handling (build 89).** WKWebView can drop an IndexedDB connection
(backgrounding, memory pressure). The handle used to be cached forever: every
later save threw, fell back to localStorage while the UI said "Saved", and the
next launch loaded the stale IndexedDB copy. Now every operation runs through
`withPhotoDB()`, which drops a dead handle, reopens and retries once;
`db.onclose` / `onversionchange` forget the handle; and `idbAvailable` is only
informational — it no longer switches IndexedDB off for the session after one
failure. The startup self-test record `__idb_test__` is excluded from every
"stored photos" listing.

**The list write (builds 95–100).** `saveAll()` first writes the emergency copy
and the entry count (`writeEntrySnapshot`), then `writeEntryListMerged` — ONE
read-write transaction. It reads the stored stamp; when another writer has stored
since, or the launch couldn't read the store, it merges that list into memory
first (its delete / re-save records read on their own — build 99); then it writes
the list, its stamp and both records together, with the tab claim checked when the
write runs (a moved claim aborts it as "paused" — build 95). It is safe to retry
after a failed commit (build 96). When it fails, the localStorage fallback takes
the list — a plain list, with the deletes the store hasn't recorded beside it
(build 99) — and a fallback write that fails part-way keeps what the fallback
already holds (T154). `saveAll()` resolves true once the list is stored durably
anywhere (build 96); a save that lands releases a form waiting on it (build 100).

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
| `loto_saved` + `loto_saved_at` (+ `loto_saved_deleted`) | Fallback copy of the entry list, written only when the IndexedDB write fails (build 89 stamps it). `loadAll` MERGES it with the other copies (build 91); a successful IndexedDB save clears it. A plain list (builds ≤ 95 and ≥ 99 — older builds must be able to read it); the deletes and re-saves the store hasn't recorded yet go in `loto_saved_deleted` `{deleted, restored}`, written FIRST (build 99). Builds 96–98 wrote `{list, deleted, restored}` into `loto_saved`; that is still read. |
| `loto_saved_snapshot` + `loto_saved_snapshot_at` / `loto_entry_count` | The emergency copy of the list — sketches and photo previews stripped — written at the start of every list save, and how many units the last save wrote (see "Entry retention" above and "The launch" below). |
| `loto_deleted_ids` / `loto_restored_ids` | Deletes and re-saves of deleted ids, `{id: when}` (builds 91 / 96). The later event wins; they are merged with the IndexedDB mirror (`deleted_ids` / `restored_ids`, written by every list save) and the fallback's copy (build 96 — see §6 "Build 96"). `loto_deleted_ids` holds only ids that ARE deleted. Since build 99 a new event is stamped after every event already known for its id, and each map is parsed once per stored value — see "Deletes and re-saves" below. |
| `loto_tab_claim` / `loto_tab_busy` | Web only (build 95): the tab that may write; a tab still writing photos — refreshed every 5 s while it writes, removed when its page goes away, stale after 20 s (build 97). Since build 99 that tab also holds the Web Lock `loto-photo-writes` (`lock: true` in the flag), which a launch waits on instead — offering **Open anyway** after 10 s; see "Tabs (web only)" below. |
| `loto_current_alt` / `loto_wip_superseded` | The alternate unit-in-progress slot's fallback copy; the marker for main-slot copies an earlier launch already restored (build 95). |
| `loto_current` | Fallback copy of the form autosave (same rule, by its `at`). |
| `loto_seq_used` | Build 89 — `{ "MMDD": lastPhotoNumber }` handed off per date by this device; a re-typed start number at or below it prompts (§7). |
| `loto_current_state` | Legacy — same migration path. |
| `photoSeqNext` | Next photo-sequence starting number for filename generation |
| `photo_full_<dbKey>` | Base64 fallback copy of a photo, in case IndexedDB write failed |
| `loto_device_id` | Per-device UUID (v4), minted once on first launch by `ensureDeviceId()` in `init()`. Identifies the device across exports so the same day's data from two iPads doesn't collide; feeds the planned export-filename convention (§5 improvement plan). Never changes once set. |
| `loto_export_log` | Last 50 export/backup events (`logDataEvent()`): kind, facility, entry/photo counts, `missingPhotos` (build 75+), seq range, date filter, exportId, filename. Rendered by the header **Log** button. |
| `loto_hospital_code` | Selected facility code (a loto-web `Hospital.key` or a custom string). Set via the Settings facility picker (`getHospitalCode()` / `setHospitalCode()`); stamped onto every entry at save and onto every export. Absent/`''` means no facility selected. Roster of known codes is the `HOSPITALS` const in `index.html`; a header chip (`updateFacilityBadge()`) shows the active facility (or a ⚠️ warning when unset). |
| `loto_backup_cfg` | Build 101 — the SharePoint backup: on/off, the account, and on the iPad its device pass and when it expires (§6 "Build 101"). |

### The photo fallback chain (rewritten build 75)

`storePhotoBytes` writes to exactly one tier, in order of durability:
filesystem (native, atomic + size-verified) → IndexedDB (reconnecting) →
localStorage `photo_full_<dbKey>` (last resort only, when the IDB write failed
even after reconnecting). Reads via
`loadPhotoBytes` walk the same chain, so a photo is found wherever it lives.
A failed save at every tier surfaces the red **NOT SAVED** badge — the old
behavior of silently continuing is gone.

### The launch — in order, with the migrations (as of build 100)

1. **Web only — the tab claim** (`tabLockInit`). A launch first waits while
   another tab is writing photos — it holds the Web Lock `loto-photo-writes`
   (build 99), or, from a tab without it (builds up to 98, or a browser without
   Web Locks), its `loto_tab_busy` flag is fresh — behind a "One moment" overlay
   that offers **Open anyway** after 10 s (build 99; opening pauses the other tab)
   and gives up waiting after 10 min. Then it claims (`loto_tab_claim`) and tells
   any build-94 tab to pause — see "Tabs (web only)". The 20 s slow-storage timer
   starts only now.
2. **`loadAll()` — the saved list.** It reads `saved_equipment` and its stamp in
   one read, then the delete / re-save records (`deleted_ids`, `restored_ids`)
   each on its own (build 99 — one unreadable record used to make the whole list
   "unreadable"; an unreadable re-save record is rebuilt from the list, T155). It
   MERGES every stored copy — IndexedDB, the localStorage fallback (a plain list +
   `loto_saved_deleted`, or builds 96–98's object) and the emergency snapshot
   (build 91) — dropping every id whose latest event is a delete; normalises entry
   ids to strings, records the shape older marks were placed for
   (`backfillMarksShape`, build 97) and applies **`ENERGY_SOURCE_RENAMES`**
   (`CA In` → `Compressed Air In`, etc.). The loud cases stay loud: an evicted
   (empty) store, a store that couldn't be read (the copies are shown and nothing
   is written over it — `_entryStoreUnread` makes the next save re-read and merge
   it first), units restored from another copy, fewer units than the last save
   wrote.
3. **`loadAll()` — the unit in progress** (see below). A saved unit that exists
   only as the stripped emergency copy gets its sketch and photo previews back
   from the stored copy of the form it was saved from (build 97); the slots are
   resolved and recovered drafts join the list.
4. **One save** (build 99). Whatever the launch changed — list repairs,
   migrations, restored sketches, recovered drafts — goes out in ONE `saveAll()`,
   written back **only through `saveAll()`, and only when IndexedDB was actually
   read** (build 91 — the migrations used to write `saved_equipment` directly,
   which put the stripped emergency snapshot over an intact store after a failed
   read). Slots are emptied only once that save is durable. Builds 91–98 saved up
   to three times here, and the first stored a snapshot-only unit's sketch as
   "none" before step 3 could give it back.
5. The form is restored and recorded as the launch left it (`_bootWipJson` — the
   build-94 handover compares against it); autosaves may write from here on
   (`_bootWipSettled` — nothing autosaves during the launch, build 93).
6. **`init()`, once `loadAll()` settles** — and only while this tab may write
   (build 95): **`migratePhotosToFS()`** (native only — the one-time-per-photo IDB
   → filesystem copy described above), `cleanupFsTempFiles()`,
   **`runPhotoKeyMigration()`** (build 89: deterministic keys + checkpoints, so a
   kill mid-run resumes without duplicate copies; done-flag only when every store
   was readable), **`repairPhotoRefs()`** (rebuilds stripped thumbnails; settles
   refs a kill left "saving"), then the integrity badge. Orphan re-attach no
   longer runs at launch, and the old per-launch `migrateToggleablePhotoFlags` is
   **gone** (it cleared `noPhoto` on every launch, undoing the user's own "hide"
   and the templates' defaults).

**Slow storage (20 s).** When `loadAll()` hasn't decided by then, the form
becomes the tech's — "Storage is slow — keep working; nothing will be
overwritten" — and it autosaves to the alternate slot. The late `loadAll()`
restores nothing over it and merges the units saved meanwhile in full (build 96);
what it does with the stored units in progress is below.

### The unit in progress — two slots (as of build 101; build 102 is to replace them)

The form autosaves (`autoSaveCurrent`) into one of two IndexedDB slots, each with
a localStorage copy for when IndexedDB fails: `current_wip` / `loto_current` (main)
and `current_wip_alt` / `loto_current_alt` (alternate). It uses the alternate slot
while `_wipUnread` is set: the main slot couldn't be read at launch, or the unit
restored came from the alternate slot (builds 91–95), or the launch ran past 20 s.
Every slot write checks the tab claim inside its own transaction
(`claimedMetadataTx`, builds 97 / 99). A copy carries its unit's entry id from the
form's first content (build 97) and its own `at`.

A **normal launch** restores the newest copy. An OLDER copy of another unit with
content becomes a saved **recovered draft** ("⚠ Recovered … — check it"), and its
slot is emptied only once that draft is safely saved (build 96). A copy older than
its unit's last save or delete is stale and dropped (`staleCopy`, build 96; T134),
as are main-slot copies an earlier launch already restored (`loto_wip_superseded`,
builds 95 / 97). An unreadable slot is never written over without a warning.

A **late launch** (past the 20 s timer) keeps the form in use. Units found in the
slots become recovered drafts — of one unit in both slots, its newer copy (build
99) — and an unsaved edit of a saved unit stays in its slot, with a banner telling
the tech to reopen the app for it. The form then autosaves to the alternate slot,
or to the main slot when the alternate one couldn't be read or holds such an edit
(build 99, with a warning). While the slot it is to use still holds a unit just
kept as a draft — that slot is the unit's only full copy until the saved list
lands — the form **waits in memory** (`_wipHold`, build 100): a waiting autosave
retries the list save at most every 10 s, and the first save made meanwhile that
lands settles the slots and writes the form. Known limit: when both slots must be
kept (an edit left in the main slot, the alternate slot unreadable) the form still
goes to the alternate slot. The redesign planned for build 102 (it was build 101's
until the SharePoint backup took that build) stores units in progress as versioned
per-unit records, which retires the slots, the superseded marker and these special
cases.

### Tabs (web only)

One tab writes. The claim (`loto_tab_claim`) is taken at launch and checked at
every write (`tabMayWrite()`, build 95) — inside the transaction itself for the
unit-in-progress slots and the photo-hash index (`claimedMetadataTx`, builds 97 /
99), and inside the list's compare-and-set write. A tab that loses the claim
pauses behind "Open in another tab" with **Use this tab instead** (a reload that
claims it back). A tab writing photos refreshes `loto_tab_busy` every 5 s (stale
after 20 s, removed when its page goes away — build 97) and holds the Web Lock
`loto-photo-writes`, which the browser releases the moment that tab closes or
crashes (build 99); a launching tab waits on it (see "The launch").

**Build-94 tabs** (still open from before build 95 reached the web) talk on the
BroadcastChannel `loto-collector-tabs`. A new tab posts `takeover` as it claims,
and answers a build-94 tab's launch `hello` with `live`, which pauses that tab
(build 96). A build-94 tab that pauses autosaves its form and says `released`: if
this tab's form is unchanged since its launch, it reloads to show that final
autosave (build 99 — it used to write its own older copy over it); a form the tech
has changed, written yet or not, goes back over it (build 100,
`formChangedSinceBoot`). For 3 s after the takeover an unchanged form is not
autosaved at all.

### Deletes and re-saves — timestamped events (as of build 99)

Every delete, and every re-save or re-import of a deleted id, is an event with its
time; the later one wins (build 96). Events are gathered from every place they may
be recorded: `loto_deleted_ids` / `loto_restored_ids` in localStorage, the
IndexedDB mirror (`deleted_ids` / `restored_ids`, written in the same transaction
as every list save), the fallback's side record (`loto_saved_deleted`; builds
96–98 kept them inside `loto_saved`) and this session's memory (build 95 — a delete
whose localStorage write failed was recorded nowhere else). A new event is stamped
after every event already known for its id (`eventTimeAfter`, build 99 — a re-save
stamped while the device clock ran ahead used to outrank every later delete). The
localStorage maps are parsed once per stored value (`readLsMap`, build 99). The
IndexedDB records are read on their own, and an unreadable re-save record is
rebuilt from the stored list: every unit in a list was alive for its writer, so a
unit in it whose delete is no later than the list's stamp had been re-saved by then
(`restoresFromList`, T155). A delete after the stamp still wins.

---

### Build 101 — SharePoint live backup

Through build 100 the only copy off the device was the export: an iPad lost,
broken or wiped mid-visit took the day's work with it. Build 101 copies the work
into SharePoint **while the app is open and online** — a safety net that capture,
save and export never wait for. It is off until the tech turns it on and signs in
with Microsoft (Settings → ☁ SharePoint backup). Ported from the NPS Audit Photo
Collector's live backup (v4.12, its design reviewed 2026-09-28) and kept close to
it; the LOTO differences are the iPad's device pass and the hash checks that make
"backed up" mean SharePoint confirmed the bytes.

**Where it goes** — one dedicated SharePoint site, top folder `LOTO Backups`
(the API's `GRAPH_ROOT_FOLDER`; kept away from the folders loto-web's nightly sync
imports from). A day folder appears with the first file of that day — not at export:

```
LOTO Backups/<facility>/<YYYY-MM-DD>/photos/p.<unit>.<slot>.<rev>.jpg   each photo, once safely stored on the device
LOTO Backups/<facility>/<YYYY-MM-DD>/units_<collector>.json             that day's saved units, kept current
LOTO Backups/<facility>/<YYYY-MM-DD>/photos_<collector>.csv             which of their photos is which unit / slot / source
LOTO Backups/<facility>/<today>/inprogress_<collector>.json             the unit on the form, with its photos' places
LOTO Backups/<facility>/<YYYY-MM-DD>/export/…                           "Export to SharePoint": the ZIP + each day's Information Sheet
```

`<facility>` is the unit's own facility stamp (`hospitalCode`; `No facility` when
blank; a `/` in it becomes `-`) and `<YYYY-MM-DD>` its survey date (`getEntryDate`;
`Undated`) — a photo goes by the day it was **taken**, the unit in progress into
**today's** folder of the facility it will be saved under (`backupFormFacility`:
the edited unit's stamp, else the one on screen). Never the facility merely picked
on screen. A photo's file name is its reversible storage-file name
(`photoFsRelPath`), so every file traces back to its unit. A unit in a day file is
the saved entry minus thumbnails, each photo reference carrying `backupFile` (where
its bytes are). The unit on the form has **its own file** (`unit`; `null` once it
is saved or moves): the form autosaves at every keystroke, and inside the day's
units file each pause in typing re-sent the whole day, sketches and all — the day's
units file and photo index change only when a unit is saved, edited or deleted
(T172). `<collector>` is `getCollectorTag()` — two devices never write one file.

**The rules** (`drainBackup`, the "SHAREPOINT LIVE BACKUP" module):

- **Never in the way.** A pass runs 3 s after a save or autosave
  (`scheduleBackup`), every 30 s, on coming back online or into view — only in the
  foreground (iOS runs nothing in the background), only in the tab holding the
  claim (`tabMayWrite`), one at a time (`_backupBusy`). A failure leaves the file
  waiting; nothing blocks, nothing is retried in a loop.
- **The queue is not the record.** Each pass works out what is waiting from the
  data: every stored photo the list or the form refers to (`backupPhotoList` —
  never one still saving or whose save failed, never an orphan) that SharePoint
  hasn't confirmed **in the folder it belongs in now**, and every day file whose
  text changed since SharePoint confirmed it (`backupDayFiles` + `backupTextHash`).
  Unit files first (small, and all it takes to rebuild the work), then photos
  newest first. A photo whose bytes can't be read stays waiting and is counted.
- **"Backed up" means SharePoint confirmed it.** The app sends the SHA-256 with
  the bytes; the API refuses a mismatch (400), stores the file, then compares
  SharePoint's own size and QuickXorHash of what it stored (502 when they differ);
  the app counts the file only when the answer echoes its SHA-256 and size
  (`backupSend`). NPS's badge once said "backed up" with 32 photos missing.
- **Nothing on SharePoint is deleted** — the API can't. A day whose units or
  photos all went (deleted, moved to another facility or day) has its files
  written again, empty: every day file is recorded on the device as
  sent-not-confirmed **before each send** (`backup_days`, `{h:'', sha:''}` until
  confirmed), so this holds even when the answer was lost or the app closed before
  its next save (T170) — and a confirmation that never reached the device's records
  never leaves an older one standing (T173). Not recorded (the device can't write):
  not sent; the photos still go. A photo whose unit changed facility goes again to the new folder; the
  old copy stays, and the old folder's index no longer lists it (T169).
- **Unit files only from a list read in full** (`_backupListTrusted &&
  !_entryStoreUnread`): after a failed launch, or while the store can't be read,
  the list in memory may be partial and would replace good copies. Photos only ever
  add files, so they still go (T168).
- **Errors.** About one file (400 / 413 / 502): that file waits 1, 2, 4 … up to
  60 min (`backupAttempt`). The account or the setup (401 / 403 / 404 / 503): the
  pass stops for 10 min and the badge asks to sign in when that is the cause.
  Anything else (no network, 429, other 5xx): the pass stops for a minute.

**The records** — IndexedDB metadata, saved every 10 photos and at the end of a
pass, only by the tab holding the claim (`saveBackupRecords` returns whether the
device's copy is current): `backup_sent` — photo key → `{ f: folder, s: SHA-256 }`
SharePoint confirmed there (records of photos no longer on the device are dropped,
but only while the list is whole — T171); `backup_days` — `"<folder>/<file>"` →
`{ h: text hash, sha }`. `loto_backup_cfg` (localStorage) holds on/off, the
account, the iPad's pass and its expiry. **Send everything again** (Settings)
clears the photo record and each day file's confirmation — for files removed from
SharePoint by hand.

**The badge** (header, beside the facility): `☁ sign in to back up` (amber) ·
`☁ checking…` · `☁ N waiting` (`(offline)`; amber with the last error or unreadable
photos in its tip) · `☁ backed up` (green: SharePoint confirmed every photo and
unit file). Tap → Settings. Settings: the switch, who is signed in (the iPad: until
when), Sign in / Sign out, **Test** (writes `test_<collector>.txt` into today's
folder and reports the path) and Send everything again.

**Export to SharePoint** (export dialog, shown when the backup is on and signed
in): the same export, but the ZIP goes to `<facility>/<day>/export/` through a
Graph upload session — 5 MiB pieces (16 × 320 KiB), resumed from SharePoint's
`nextExpectedRanges` after a dropped piece, QuickXorHash computed as the pieces
go and compared with SharePoint's for the finished file (`backupUploadBig`) — and
each day's Information Sheet into its day's `export/`. Units are stamped exported
**only once SharePoint confirmed the ZIP**; otherwise the toast says "Not sent to
SharePoint … Nothing was marked exported". The facility is the one all units
share (else the one on screen), the day the date filter (else today).

**Signing in.** The devices hold **no Microsoft credentials** — only the API does
(an app registration with `Sites.Selected`, write access to the one backup site).
*Web* (the Azure address only — the GitHub Pages copy has no API): Static Web
Apps' Microsoft sign-in (`/.auth/login/aad`); the app calls its own origin with the
sign-in cookie. *iPad*: the app can't use that cookie, so it gets a **device
pass** once (OAuth PKCE): it makes a random verifier and opens
`backup-link.html?device&challenge=<SHA-256 of it>` in an in-app browser sheet
(`@capacitor/browser`); the page signs in with Microsoft, asks
`/api/device-token` (signed-in visitors only) for a one-time code bound to that
challenge (5 min), and hands it back through `lotocollector://backup-link?code=…`
(`@capacitor/app`, `appUrlOpen`) — the page goes to the sign-in at most once per
visit (it comes back marked `signin=1`); the app trades code + verifier at
`/api/device-pass` for its pass — `v1.…`, HMAC-signed with `DEVICE_PASS_SECRET`,
upload-only, 30 days by default (`DEVICE_PASS_DAYS`, at most 90). A code caught
on the way is useless without the verifier, which never leaves the app; a code
that arrives when this app started no sign-in (or more than 10 min ago) is
refused before the API is asked (T167). The pass travels in `x-loto-pass`
(Static Web Apps keeps `Authorization` for itself); the iPad's calls go over native
HTTP (`CapacitorHttp` — no browser cross-origin rules), `readTimeout` only (a
connect timeout would cap the whole request). Revoking: `DEVICE_PASS_NOT_BEFORE`
(every pass issued before it stops working) or a new secret; disabling a person's
account stops new sign-ins.

**The server side** — `api/` (Azure Functions, the Static Web App's managed API,
Node 20; setup in `api/README.md`): `upload` (GET: set up? who is asking; POST: one
file ≤ 8 MB, verified as above), `upload-session` (a short-lived upload URL for
one large file), `device-token`, `device-pass`; `shared/graph.js` (Graph token,
safe paths — ≤ 6 folder and 12 path segments, ≤ 300 characters, no `..` —, who is
asking and from which domain, the pass and the code), `shared/qxh.js`
(QuickXorHash; the app carries the same function between `// >>> qxhCreate` and
`// <<< qxhCreate`, and `tests/api` checks they agree). Settings (Azure only,
never in this public repo): `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`,
`GRAPH_CLIENT_SECRET`, `GRAPH_SITE_ID`, `GRAPH_ROOT_FOLDER`, `ALLOWED_DOMAIN`
(default `hgsengineeringinc.com`), `DEVICE_PASS_SECRET`, optional
`DEVICE_PASS_DAYS` / `DEVICE_PASS_NOT_BEFORE` / `GRAPH_DRIVE_ID` / `GRAPH_TARGETS`.

**Tests.** Suite T158–T173 (16): a stored photo counts only once SharePoint
confirmed those bytes (T158); filing by each unit's own facility and day (T159); a
deleted unit's day file rewritten without it, an unchanged one not sent again
(T160); unreadable photos wait and orphans never go (T161); a refused or
wrongly-confirmed photo is not counted and is tried again, the others still go
(T162); no signal leaves it waiting, a refused account or an expired iPad pass asks
to sign in (T163); a tab that lost the claim sends nothing (T164); Export to
SharePoint — its folders, a dropped piece resumed, a hash mismatch refused, nothing
stamped exported on failure (T165); Send everything again (T166); the iPad sign-in
needs this app's verifier (T167); a partial list never rewrites unit files (T168);
the five from finishing the build (T169–T173, below). `tests/api/api.test.js` — the functions
with Graph faked (QuickXorHash against the libqxh reference vectors, paths, the
pass, the gate, upload verification, sessions, PKCE). `tests/fuzz/backup_e2e.mjs`
— the web app end to end against the REAL functions (`backup_e2e_server.mjs`: only
Microsoft's sign-in, Graph and SharePoint are faked; 17 checks, among them the
link page's one trip to the sign-in when not yet signed in, and that it stops
and says so — instead of going round the sign-in forever, 606 trips in 5 s without
the guard — when the service refuses a signed-in visitor).
`tests/fuzz/run-sim-backup.sh` — the iPad app's native path in the Simulator
against the same stand-in (7 checks: CapacitorHttp, the device pass, a photo
byte-identical in SharePoint, the day files, 12 MB in 5 MiB pieces with its
QuickXorHash). The fuzzer's backup mode (`BACKUP=1`): the backup on against a
stand-in SharePoint that refuses, drops, wrongly confirms or stores-without-
answering while faults are on, units moved to earlier days and facilities changed
so day folders empty out; after each sequence and relaunch a clean pass must leave
every stored photo byte-identical in its folder and every day file exactly what the
device would write (`backup-*` invariants), and at every step the device's records
may claim only what SharePoint stored (`backup-record-untrue`). Eight planted bugs
(a vanished day not rewritten, the oldest photo never sent, units filed by the
facility on screen, a day file / a photo counted before it was confirmed, a moved
photo not sent again, a short confirmation accepted, a day file not recorded
before sending) are each caught.

**Found while building it** (the fuzzer, seed 729): a photo backed up while the
form had no facility stayed in `No facility/` after the facility was chosen,
while the unit's file pointed to the new folder — "sent" was recorded per photo,
not per folder (T169). Building its oracle showed two more: a day file sent while
the answer was lost, or confirmed just before the app was closed, was unknown to
the device, so a day that later emptied kept listing its units (T170); and the
sent record only ever grew (T171). A review of the finished pass: the unit in
progress rode inside the day's units file, so every pause in typing re-sent the
whole day — up to about a megabyte every few seconds by late afternoon, each a new
SharePoint version (T172). The final fault campaign (a deep run, seed 101414): a day
file SharePoint confirmed, whose confirmation the app hadn't saved yet when it was
closed, reloaded as the OLDER record — and when the day went back to that older
text (its new unit deleted) it was skipped while SharePoint still listed the unit;
each send is now recorded first (T173). The same campaign's 30 % run failed every
backup check from one moment on in all four browsers: this Mac's Wi-Fi had dropped
(19:24:05 in the system log) and the app, offline, rightly held everything back —
the fuzzer now skips its backup check while the computer is offline.

**Verified** (the final code): 178 tests (183 results) — 183/183 in web,
`{nativeMock:true}` and inside the app on the Simulator; each backup rule's test
fails with that rule planted back (mutation-checked, T158–T173); `tests/api` 9/9;
the web end to end 17/17; the iPad's native end to end 7/7. Fuzz, backup on:
4,000 actions without faults (the checks compared 958 photos, 156 unit files, 17
emptied days, 184 in-progress files), 4,800 at 10 % faults, 4,000 deep (5 % ×
200 steps), 1,600 at 30 % — 0 violations; 1,000 inside the app on the Simulator —
0. Without the backup: 4,000 without faults — loto-web's importer took every export
(267 units, 1,040 sources) with 0 issues — and 4,800 at 10 % — 0. The b88 → b90 →
b101 upgrade chain kept all 34 photos; two tabs, build-94 compatibility, the
offline export (cache v7.97, server down) and the phone header — now also with
every title badge showing at its longest — pass. Three of the fuzzer's own oracles
were corrected on the way, each against the app's rule: the backup check skips
while the computer is offline; the unit open for edit goes out in place of its
saved copy only when that copy passes the export filters; a form holding only an
equipment type (its name filled in from the type) is an empty form.

### Build 100 — a low review of build 99 (two findings)

A low-effort review of build 99's own changes found two. Build 100 fixes both,
each with a test written first and proven to FAIL on build 99 (T156, T157).

| Finding | Fix | Test |
|---|---|---|
| **A late launch (> 20 s) wrote the form into a slot it had to keep.** With the alternate slot unreadable (or holding an edit left for later) and the main slot's unit kept as a recovered draft, the form autosaved into the alternate slot until that draft's save landed — and for the rest of the session when that save failed | the form waits in memory while the slot it is to use still holds a unit just kept as a draft — that slot is the unit's only full copy until the saved list lands (`_wipHold`; the same when the alternate slot holds the kept draft). A waiting autosave retries the list save at most every 10 s; the first save made meanwhile that lands settles the slots and writes the form (`releaseWipHold`). When both slots must be kept (the main slot holds an edit left for later and the alternate slot can't be read) the form still goes to the alternate slot — the per-unit records (planned: build 102) remove that case | T156 |
| **An old tab's "released" reloaded a changed form away.** Build 99 reloaded whenever no autosave had been WRITTEN since launch — a change still waiting on its autosave, or with its write in flight, was lost | the question is whether the form changed since the launch left it, written yet or not (`formChangedSinceBoot`); an untouched form is still reloaded to show the old tab's final autosave. T147 now states its untouched form that way too | T157 |

**Verified:** 162 tests (167 results) — 167/167 in web, `{nativeMock:true}` and
inside the app on the Simulator; T156 and T157 fail on build 99 (T147, restated,
passes on both). Fuzz: 6,000 actions without faults, 19,200 at 10 % faults
(100500–100619, 100700–100819) and 4,000 at 5 % × 100 steps (100900–100939) — 0
violations under the storage-warning-only oracle (the two losses it recorded
after a warning were launches that couldn't read the store and said so: the
emergency copy was shown, nothing was overwritten); 1,000 inside the app on the
Simulator — 0; loto-web's importer took all 243 exports (404 units, 1,456
sources) with 0 issues; the b88 → b90 → b100 upgrade chain kept all 34 photos;
two tabs, build-94 compatibility (an untouched tab still shows the old tab's
final autosave), offline export (cache v7.96, server down) and the phone header
(`b100` is one character wider — all four widths fit) pass.

### Build 99 — the 2026-09-28 medium and high reviews of builds 96–98

Two more reviews of builds 96–98 — medium (15 findings) and high (7), 22 in all.
Build 99 fixes 20, plus one older path its own fault campaign found (T154) and one its own T149 change opened, found while finishing it (T155). The other two propose redesigning the unit-in-progress
storage as versioned per-unit records (which also retires the superseded-marker
machinery); by the user's call that is its own build (101, after build 100's
fixes from a quick review of 99). Each correctness fix has a test written first
and proven to FAIL on build 98 (T142–T153).

| Finding | Fix | Test |
|---|---|---|
| **A late launch (> 20 s) kept the OLDER copy of a unit:** its draft came from the main slot, and the newer copy of the same unit in the alternate slot was then refused (its id taken) and dropped | the same unit in both slots: its newer copy is the one kept | T143 |
| **A late launch autosaved over an unreadable alternate slot**, and said nothing (nor when the main slot couldn't be read) | after the timeout the form autosaves to the alternate slot unless that slot couldn't be read or holds an edit left for later — then to the main slot, once what that held is safe; the launch warns | T146 |
| **The launch stored a snapshot-only unit with its sketch as "none"** before the unit-in-progress section gave it back — a failure between the two saves made it permanent; and **up to three saves ran at launch** | the launch saves ONCE, at its end: list repairs, restored sketches and recovered drafts together; slots are emptied only once that save is durable | T144 |
| **Import → Replace kept the first row of a unit saved twice**, not the newest | the newer copy (by its last save) is this device's version | T145 |
| **A re-save stamped by a clock that ran ahead outranked every later delete** — the unit came back from any stored copy | every new delete / re-save of an id is stamped after every event already known for it (`eventTimeAfter`) | T142 |
| **A build-94 tab's "released":** the new tab wrote its launch-time copy over the old tab's final autosave; the hello / released paths had no test | a form nobody has written since this launch is reloaded from storage (the old tab's final autosave); a worked-on form is written back; for 3 s after the takeover an unchanged form is not written at all. `b94_compat.mjs` also opens a build-94 tab after the new one (it pauses on the answer to its hello) | T147, `b94_compat.mjs` |
| **A launch could wait 10 min behind another tab's photos with no way out**, and knew them only by a localStorage flag | while it writes photos a tab holds the Web Lock `loto-photo-writes`, which the browser releases the moment the tab closes or crashes; a launch waits on it (and on older builds' flag), and after 10 s offers "Open anyway" (that pauses the other tab). The claim itself stays in localStorage: every write checks it synchronously, which a Web Lock can't do | T148 |
| **The toast kept a warning only 0.6 s** (a heuristic) | a small queue on the one toast element: a warning stays for its own time and later messages show under it; at most three lines, the newest always shown (a first version dropped the newest message when three warnings were up — T108 caught it) | T153 |
| **Tombstone maps re-parsed 4–6 times per save** | parsed once per stored value (`readLsMap` caches by the raw string) | suite |
| **settleWipSlots' comment sat above another function** | moved back | — |
| **wipSlotTx duplicated idbTx; three localStorage JSON readers** | `claimedMetadataTx` — one read-then-write transaction with the claim checked when it runs — serves the unit-in-progress slots AND the photo-hash index; `readTabJson` is gone | suite |
| **One unreadable delete / re-save record made the whole list "unreadable"** at every launch and pushed every save to the localStorage fallback | those records are read on their own, at launch and in the list write's merge; one that can't be read no longer stops the list, and the next write replaces it | T149 |
| **The fallback carried the whole delete history** (up to 5,000 + 5,000 ids) in the write that runs when storage is near full; and **its object format was unreadable by builds ≤ 95** | `loto_saved` is a plain list again; only the deletes and re-saves since the store's last write go beside it (`loto_saved_deleted`, written first) | T150, T152 |
| **The photo-hash index write wasn't claim-checked when it ran** | read, add and write in one `claimedMetadataTx` | T151 |
| **The fuzzer never ran a launch that finishes after the timeout** | a relaunch variant: the launch finishes late with a new unit typed while its reads are pending; the form in use must stay, the stored unit must come back as a draft or stay in a slot. Mutation-checked: with the late path disabled it reports 7 × `late-launch-replaced-form` | fuzz |
| **Split re-implemented the 10-source rule** | `sourceLimitNote()` / `showSourceToast()`: every caller (Split, Duplicate source, the electrical count, Add source) puts the heads-up in its own message | T140 |
| **Found by this build's fault campaign (seed 99611; the path exists since build 89):** a fallback write that failed part-way removed the whole fallback — even the list just written when only its timestamp failed — so a unit whose store and emergency-copy writes had failed too was gone at the next launch (with the storage-error warning) | a partial failure keeps what the fallback holds: a failed timestamp leaves the list dated by its own entries; a failed list write leaves the previous list, which the new delete record covers. Only when the delete record itself can't be written does the old list go (kept beside an outdated delete record, it could bring a deleted unit back) | T154 |
| **Found while finishing this build (its own T149 change):** the re-save record is read on its own at launch, and one that couldn't be read let an older delete win again — a unit deleted and then saved again while localStorage was full (the re-save recorded only in the store) vanished at that launch without a word, and the next save made it permanent. The same in a merging save that couldn't read the record | a stored list and its delete / re-save records are written in one transaction, and every unit in the list was alive for its writer — so an unreadable re-save record is rebuilt from the list itself: a unit in it whose delete is no later than the list's stamp counts as re-saved at that stamp (`restoresFromList`), at launch and in the save's merge. A delete after the stamp still wins | T155 |
| **Test tooling found while finishing this build:** one crashed headless page hung the fuzz driver and lost every worker's results; a unit that changed across a relaunch was reported as its whole before/after, cut off at 700 characters before the difference; the fault oracle's "warned" was too broad | the driver runs each seed on its own — a crashed or hung page is reported as `worker-crash` for that seed and the next seed gets a fresh browser; the output is rewritten as each worker finishes; each worker's line shows the page's peak JS heap (10–14 MB over 1,000 actions — no leak). A changed unit or form is reported field by field from the first differing character (`sigDiff`). And **any** warning toast excused a loss at the next relaunch as "after a warning" — "Enter equipment name first" or "Valve marks cleared" included: now only a storage warning does, and storage warnings go into the trace | fuzz |

**Verified:** 160 tests (165 results) — 165/165 in web, `{nativeMock:true}` and
inside the app on the Simulator. T142–T153 fail on build 98; T154 and T155 fail
on build 99 before their fixes (T155's merging-save half fails with only its
merge line removed). On the final code: fuzz 6,000 actions without faults,
38,240 at 10 % faults (99500–99619 twice, 99700–99819 twice) and 8,000 at 5 % ×
100 steps (99800–99839, 99920–99959) — 0 violations; 1,000 inside the app on the
Simulator — 0; loto-web's importer took all 231 exports (390 units, 1,348
sources) with 0 issues; the b88 → b90 → b99 upgrade chain kept all 34 photos;
two tabs, build-94 compatibility, offline export (cache v7.95, server down) and
the phone header pass. **Not reproduced:** the build's first deep run reported
one silent change to a saved unit at a relaunch right after a failed commit of
the list write (seed 99834, step 61; the report was cut off before the
difference — hence `sigDiff`); 20,000 further deep actions, the same seeds four
more times among them, never showed it again. **Seen, not the app's:** three
times across the build's fuzz runs a headless page vanished mid-seed (no crash
report, JS heap ≤ 16 MB, Chrome's updater running meanwhile); the app never
navigates or opens a window there — it is now `worker-crash` for that seed.

### Build 98 — a quick review of build 97 (one finding)

Build 97's toast gave the longer 4 s to a message of several MESSAGES, but
Split composes its warning (the split note, "Valve marks cleared", the
10-source heads-up) into one message of three lines — it was up for 2 s. The
time now goes by the lines on screen. T141 (fails on 97). **Verified:** 146 tests
(151 results) — 151/151 in web, `{nativeMock:true}` and inside the app on the
Simulator; offline export with the server down (cache v7.94) passes.

### Build 97 — the 2026-09-28 review of build 95 (the six low findings)

Build 97 fixes the six findings build 96 left open — every finding of that
review is now fixed. Each has a test written first and proven to FAIL on build
96 (T135–T140).

| Finding | Fix | Test |
|---|---|---|
| **Import → Replace closed the form holding the second copy of a unit saved twice** (it keeps the first row per id) — the edit in progress was discarded with no warning | the form moves to the copy that stays (`editingEntry`), the edit goes on, and Save & New writes it there (by id) — what build 94 did | T135 |
| **A Save & New cut short by another tab.** Another tab's launch took the claim in the moment between Save & New's check and its list write: the write was refused, but the blank form's autosave still committed over `current_wip` — the unit's only full copy — and the next launch had only the stripped emergency copy (no sketch; with that write failing too, nothing) | every unit-in-progress write and slot delete re-checks the claim INSIDE its transaction, when it actually runs (`wipSlotTx`; resolves "paused", writes nothing — not even the localStorage fallback). A launch gives a saved unit that exists only as the stripped copy its sketch and photo previews back from the newest stored copy of the form it was saved from, one not newer than that save. A form with content carries its entry id from the start (not only from its first photo): that id is how a launch tells its stored copies apart | T136 |
| **The "still writing photos" flag (`loto_tab_busy`) was never refreshed and never removed when the page went away:** a refresh within ~1.5 s of a photo held the next launch up to 60 s behind "still saving photos in another tab"; a Duplicate running over 60 s could be taken over mid-copy | refreshed every 5 s while writing and at every photo finished (`beatTabBusy` only refreshes — clearing is `markTabBusy`'s, after the 1.5 s linger), removed on `pagehide` and when the tab pauses, stale after 20 s; a launch waits for a fresh flag up to 10 min | T137 |
| **Marks saved by builds 92–94 carry no `marksFor`**, so build 95's rule never cleared them when their source became an In/Out pair — exported In/Out in tap order | `backfillMarksShape`: a marked ref without `marksFor` records its source's shape as it is when this build first loads it — the saved list, the restored form, a merged list, a backup import; the next change to an In/Out pair clears it like any other. The fuzzer's new invariant `marks-shape-unknown` flags any marked ref without it | T138 |
| **The "superseded" marker was written on the first alternate-slot write whatever the form held:** after a Save & New that failed everywhere, the blank form's write marked the restored unit's stored copies superseded (and Clear removed its local copy) — the unit was gone at the next launch | the marker is written only when what reached the alternate slot IS the restored unit, in the form session it was restored into; Clear keeps `loto_current` while the main slot is unread. The marker's other job (no false "couldn't read" alarm after the restored unit was saved) is now a stateless rule: the slot's newest copy — its local copy — belongs to a unit saved since | T139 (and T111) |
| **Split's "Valve marks cleared" note was replaced in the same tick by the 10-source heads-up**, and a toast raised 1.9 s after another was hidden at 2 s by the first one's timer | Split says everything in one message; and generally, a warning shown in the last 0.6 s is not replaced — the next message is added under it (up to three lines, 4 s) — and every toast cancels the previous one's timer | T140 |

Harness (`tests/fuzz-harness.js`): fault mode also fails `wipSlotTx` (the
unit-in-progress writes no longer go through `saveMetadata`); new invariant
`marks-shape-unknown`.

**Verified on build 97:** **145 tests (150 results) — 150/150** in web,
`{nativeMock:true}` and inside the app on the Simulator (real native files).
T135–T140 all fail on build 96. The fuzzer on the final build: 30,200 actions —
no-fault 6,000, 10 % storage faults 19,200 (two seed ranges), 5 % faults over
100-step runs 4,000, and 1,000 inside the app on the Simulator — **0 violations**.
Differential: 261 exports → 373 units / 1,302 sources, every field loto-web
imports matches. Upgrade chain b88 → b90 → 97: all 34 photos byte-identical, no
file removed, "✓ 34 photos safe", the All-dates export shipped all 34 (0 missing
/ unsafe / mismatched). Two tabs, the build-94 tab (`b94_compat.mjs`), offline
export with the server down (cache v7.93) and the header at 390–820 px: all pass.

### Build 96 — the 2026-09-28 review of build 95 (the eight medium findings)

A high-effort code review of build 95 (ten finder angles, every candidate
verified, a gap sweep) reported 15 findings: 8 medium, 7 low. Build 96 fixes the
eight medium ones, plus one low one that sat in the same save path. Each has a
test written first and proven to FAIL on build 95 (T125–T133); the web-deploy
finding has a scratch-site check, `tests/fuzz/b94_compat.mjs` (fails on 95).
The build's own fault campaign found one more, older path (T134, fails on 95).

| Finding | Fix | Test |
|---|---|---|
| **A build-94 tab still open when build 95 reached the web was never paused.** Build 95 dropped the BroadcastChannel lock with no shim, and a b94 tab never reads the claim: it kept writing its stale list, emergency copy and entry count over the store — if it saved last, the new tab's units were gone without a warning | each launch posts `{t:'takeover'}` on the old channel (`pauseLegacyTabs`): a b94 tab autosaves its form and pauses (its saves then write nothing). A b94 tab's own launch `hello` is answered `live`, so it pauses too; when a b94 tab answers `released`, this tab writes its own form back over the one the old tab autosaved | `b94_compat.mjs` |
| **A delete lived only in localStorage and in this session's memory.** The IndexedDB mirror every save writes (`deleted_ids`) was never read back: on an iPad with localStorage full, a deleted unit (photos already erased) came back from the frozen emergency copy after a relaunch that couldn't read the store — and the first save wrote it back for good | deletes and re-saves of deleted ids are **timestamped events; the later one wins** (`tombstoneEvents`). They are gathered from localStorage (`loto_deleted_ids`, `loto_restored_ids`), the IndexedDB mirror (`deleted_ids`, `restored_ids` — read at launch and by every merging save), the fallback list (`loto_saved` now carries them) and this session's memory. `getTombstones()` = ids deleted later than any re-save; `loto_deleted_ids` keeps holding only those (what older builds read) | T125 |
| **The list save wasn't safe to retry.** `withPhotoDB` re-runs `writeEntryListMerged` after a failed commit, but the stamp was recorded before the commit: the retry "saw another writer" and merged the tab's own older list back (deleting the newer copy of a unit saved twice put its content back); attempt 2 forgot what attempt 1 merged (list, count and emergency copy stayed pre-merge while the "units NOT shown" banner went away); an abort because the claim moved was retried like a storage fault | the stamp becomes this write's in `oncomplete`; a merge records the stamp it merged (`_entryStoreAt = cur`); one `st` object carries `merged` / `paused` across attempts; a deliberate abort resolves `{paused}`. `saveAll()` returns a promise: true once the list is stored durably (IndexedDB or its fallback) | T126, T127 |
| **The "superseded" marker silenced the warning when the alternate slot — where the unit now lived — couldn't be read either** (its read error was swallowed): blank form, no word, and the launch's own autosave wrote the blank over the unit | an unreadable alternate slot is never silent (banner + toast). With the marker the main slot holds only superseded copies, so that launch autosaves THERE and the unread alternate copy waits for the next launch. Main readable but alternate not: the alternate slot is left alone (never deleted by the settle), a warning, autosaves to main | T128 |
| **The launch read `tabMayWrite()` before its two awaited unit-in-progress reads** — a tab that lost the claim during them still deleted the alternate slot and rewrote `current_wip` after its recovered-draft save was refused (the T114 loss, through a race) | the claim is checked after the reads. A slot holding an older unit is emptied only once `saveAll()` resolves true (`emptyWipSlot`); until then the form autosaves to the slot the newer unit came from. The normal settle writes the main slot first and empties the alternate one only after that write landed (`settleWipSlots`) | T129 |
| **A delete confirmed after another tab took the claim** (a native `confirm()` holds back the storage event) erased the unit's photos and wrote its tombstone before saveAll's first check: the live tab kept listing the unit with missing photos and dropped it at its next launch behind a false "evicted data" banner | `tabMayWrite()` right after the dialog in Delete, Bulk delete, Import (Merge / Replace), Clear form and Clear all data — nothing is erased or recorded; Clear form removes `loto_current` only while it holds the claim | T130 |
| **The 20 s "Storage is slow — keep working; nothing will be overwritten" launch.** Its guard could never be true (the timer sets both flags at once), so a load that finished late restored the stored unit over the form in use (a hybrid unit, or edits reverted and a photo orphaned), and a unit saved in the window was replaced by its stripped emergency copy (sketch lost, false "Restored … EXPORT NOW") | when the load finishes after the timeout, nothing is restored over the form: a stored unit with content becomes a recovered draft (its slot is emptied once that is saved; an unsaved EDIT of a saved unit stays in its slot, with a banner saying how to get it back); units saved in the window are merged from memory, in full, and don't count as "recovered"; the dead guard is gone | T131 |
| **A copy of a SAVED unit written before that unit's last save still reopened as an edit of it** — the b95 marker covered one path only; Save & New or an export then put the older version over the newer save | `staleCopy`: a unit-in-progress copy (either slot, either store) whose entry id belongs to a saved unit saved later than the copy was written is not the unit in progress. A time in the future (a clock that was off) decides nothing | T132 |
| (low, same save path) **After a launch that couldn't read the store, `loto_entry_count` stayed at the launch's maximum** when the merging save changed nothing (every unit deleted, say): the next launch said "device storage may have evicted data … contact support" | the first save that reads the store rewrites the emergency copy and the count from the merged list, and takes the "couldn't read" banner down | T133 |
| **Found by this build's own fault campaign (the path exists since build 91):** an unsaved edit of saved unit X sat in the main slot a launch couldn't read; the tech went on in the alternate slot and DELETED X (its photos erased). The next healthy launch kept the older edit as a "recovered draft" — the deleted unit came back, pointing at photos that no longer exist | the same rule as `savedSince`, with the delete's time (`staleCopy`): a stored copy of a unit deleted after the copy was written is not the unit in progress | T134 |

Harness (`tests/fuzz-harness.js`): a simulated relaunch now forgets this
session's memory of deletes and re-saves (`resetTombstoneMemory()`) and the
store stamp — keeping them is what let build 95's harness pass while a real
relaunch lost the delete; fault mode also fails the list write's COMMIT (after
every put, so the retry path runs); the reset clears the new keys.

**The six other low findings were fixed in build 97** (the section above).

**Verified on build 96:** **139 tests (144 results) — 144/144** in web,
`{nativeMock:true}` and inside the app on the Simulator (real native files).
T125–T134, in their final form, all fail on build 95 (re-run against build 95's
page); T128's second unreadable launch was also mutation-checked (without the
marker kept, that launch overwrote the unread copy). `b94_compat.mjs` (fails on
95): the build-94 tab pauses, its later save stays out of the store, and a later
tab sees what both tabs saved before. The fuzzer on the final build: 30,200
actions — no-fault 6,000, 10 % storage faults 19,200 (two seed ranges, one of them
the range whose first run found T134), 5 % faults over 100-step runs 4,000, and
1,000 inside the app on the Simulator — **0 violations**, and under faults no unit
was lost even with a warning (the warned events are recovered drafts and a form
that changed after an unreadable launch). Differential: 258 exports → 360 units /
1,546 sources, every field loto-web imports matches. Upgrade chain b88 → b90 → 96: all 34 photos byte-identical, no
file removed, "✓ 34 photos safe", the June-style units "⚠ export again (photos)"
until the All-dates export, which shipped all 34 (0 missing / unsafe /
mismatched). Two tabs
(`twotabs.mjs`), offline export with the server down (cache v7.92) and the header
at 390–820 px: all pass.

### Build 95 — the 2026-09-27 review of build 94 (15 findings)

A max-effort code review of build 94 (ten finder angles, every candidate
verified, a gap sweep) found 15 defects: most in build 94's own fixes (the
unit-in-progress restore, the tab lock, marks, the phone header), three in
loto-web's import, and one design finding (escaping by hand). Each collector
fix has a test written first and proven to FAIL on build 94 (T111–T121; T101
rewritten for the new lock); T122 and T123 are guards (they pass on 94 and
fail the moment a builder leaks markup or shows it escaped twice). T124 comes
from the fault campaign run on this build (it fails on build 94 too).

| Finding | Fix | Test |
|---|---|---|
| **An unreadable unit-in-progress restored from its local copy (b94) came back OLDER.** The unreadable IndexedDB copy was left in place; once the restored unit was saved, the next normal launch reopened that older copy as an EDIT of the saved unit — an export shipped it and Save & New overwrote the unit with it. With the slot still unreadable, the "couldn't be read" banner repeated at every launch | once the restored unit is safely in the alternate slot, `localStorage['loto_wip_superseded'] = {at, entryId}` (`noteWipWritten`): main-slot copies up to that time are not the unit in progress. A launch that finds the slot readable ignores them and resolves from the alternate slot (then clears the marker); one that still can't read it raises no alarm — nothing in it is unread | T111 |
| **A tab paused during its launch still resolved the unit-in-progress copies** — deleted the alternate slot and rewrote `current_wip` — while the save of the "Recovered draft" it made was already a no-op: that unit was lost | `loadAll` evaluates `tabMayWrite()` once for the WIP section; a tab that may not write reads only (no delete, no rewrite, no recovered draft) | T114 |
| **The tab lock was decided once, at launch** (BroadcastChannel hello / live): a tab suspended in the background or blocked in a dialog answered late, paused the up-to-date tab and kept writing its stale list over the store; equal boot times paused both; a missed hello left both live | **a claim, checked at every write.** The tab opened last writes `loto_tab_claim = {id}`; `tabMayWrite()` (called by `saveAll`, `autoSaveCurrent`, the hash index, the launch's WIP resolution and boot chain) reads it synchronously — another tab's id → pause, write nothing. `storage`, `visibilitychange` and `pageshow` re-check at once. "Use this tab instead" is a reload: it reads what the other tab saved, then claims. The iOS app is one window — no claim | T101, T113 |
| (same root) **`saveAll` never read before writing**, so any second writer — another tab, an older build still open — lost its units at this tab's next save | **compare-and-set** (`writeEntryListMerged`): one read-write transaction reads `saved_equipment_at`; if it isn't the stamp this tab last read or wrote (`_entryStoreAt`), the stored list is merged into memory first (newer save wins per entry, tombstones shared), then written. The b91 "store unreadable at launch" merge is the same path | T112 |
| **The takeover autosaved and paused on any queued message** — a stale tab that handled it late overwrote `current_wip` with its old form — and never waited for photo writes: a takeover during "Duplicate with photos" left the rest of the copies unattached | the old tab is never asked to write anything (it just loses the claim). A tab that opens while another is still writing photos waits ("One moment…") until that tab's `loto_tab_busy` flag clears — it stays up 1.5 s after the last write so the autosave that attaches them lands first | `twotabs.mjs` |
| **Import → Replace** removed and tombstoned the unit open for edit but left the form editing it: "Discard edits … (original preserved)" was false and Save & New re-created it dated today | every removal path goes through `closeFormIfRemoving()`; the Replace dialog names the open unit when it isn't in the backup | T115 |
| **A unit saved twice (two rows, one id):** deleting the copy NOT being edited discarded the edit in progress on the other (`formHoldsEntry` matched by id) | `formHoldsEntry` knows the edited ROW by identity (by id only when that row is no longer in the list, or for a new form) | T116 |
| **Marks were reconciled by count only.** A source that BECAME an In/Out pair at the same count (the energy dropdown, Copy source, a link's new quantity copy) kept marks tapped in any order and exported them as In/Out — loto-web could point the IN arrow at the OUT valve | a saved mark set records the shape it was placed for (`ref.marksFor = {qty, inOut}`); ONE rule, `marksFit()`: more marks than devices, or an In/Out pair now whose marks weren't placed as one → no marks. The export (`fittingMarks`), the pin badges and the dialog read it; `reconcileSourceMarks` clears what fails it after every change to a source's devices (dropdown, custom energy text, Quantity, Split, Copy, Link) | T118 |
| **"Valve marks cleared" was replaced by the success toast in the same tick** (Copy source, Link; Split too) — the marks vanished without a word | `reconcileSourceMarks(i, true)` is quiet; the caller's message carries `MARKS_CLEARED_NOTE` (as a warning) | T117 |
| **"Showing the emergency copy — export now" was a toast** that the unit-in-progress toast replaced 2 ms later — the only sign the saved list was the stripped copy | launch warnings that must stay are sticky banners (`showStickyBanner`): the entry store unreadable (cleared by the first save that can read it), EMPTY, restored entries, the expected-count mismatch, the storage-fail and WIP-read banners — one helper, one CSS class | T120 |
| **On a phone (≤ 600 px) the header isn't sticky** (b94), so the "⚠ Storage issue" chip and the photo badge scrolled away — a failing save showed a 2-second toast | `#bottomAlert` in the always-visible bottom bar repeats both (tap: scroll up / list the missing photos) | T121 |
| **An open EDIT of an undated saved unit** went on today's Information Sheet (b94's "the open form is today's work") — loto-web could bind it to a same-named unit surveyed today | only a NEW unit on the form is dated today | T119 |
| **Found by this build's own fault campaign (the path exists since build 91):** the launch couldn't read the entry store, the tech bulk-deleted units, and the localStorage write of their deleted ids failed (storage full). The next save merged the stored list back in — the deleted units returned with their photos already erased | this session's deletions (and re-saves) are kept in memory as well (`_tombAdds` / `_tombClears`); `getTombstones()` = the stored map with them applied, so no merge in this session undoes a delete, and every save mirrors them into IndexedDB | T124 |
| (same campaign) With the entry store unreadable and the emergency copy EMPTY, the launch said nothing — the saved list was simply blank | the "Could not read the entry store" warning (toast + sticky banner) is shown whenever the store can't be read; with an empty copy it says the units are NOT shown, were not deleted, and to reopen the app before re-entering anything | fuzz |
| **Escaping was ~95 hand-placed `escHtml()` calls and three inline-handler idioms** (one raw) — the next forgotten one would bring back T104 unnoticed | **escape by default:** `` html`…${v}…` `` escapes every value (text and attributes); only `raw(…)` (this code's own markup) or a nested `` html`` `` goes in as is; arrays join; `null`/`false` print nothing. `jsArg(v)` is the one way to pass a value to an inline handler. Every builder that shows user values uses it — no hand-placed `escHtml` is left outside the helpers. A mistake now shows as visible escaped text, never as live markup — T123 catches that direction (it failed when one field was escaped twice) | T122, T123 |

loto-web (deployed with this build — see §10 and loto-web's architecture doc,
"Import System"):
- **The no-location rule works for real inventories.** Every import path stores
  a blank building/room as `'Unknown'`, so b94's rule (blank strings only)
  never fired. `infosheet_parser.loc_matches()` treats `Unknown` as blank — on
  field-app sheets only (`allow_blank`): there the collector writes the unit's
  own location, so a blank cell means "none". On a legacy sheet a blank
  Location cell means nobody filled it in, and the Page # still decides (a
  positive match there would have beaten the page tie-break for a located unit).
- **One matcher for the importer and the pre-QC validator.** `find_blocks` used
  a blank building or room as a wildcard, so the validator could resolve a unit
  to a block the importer never binds; both now call `loc_matches`.
- **Stored "LINKED → … Src#N | L" details are repaired.** The import cleaned
  incoming cells only; the backfill never replaced a stored value. A re-import
  now replaces a polluted stored value, and a one-time startup cleanup
  (`database._clean_linked_photo_details`) strips the prefix in place.
- `scripts/smoke_valve_marks.py` part 7 (`part_b95`): 7 checks, 5 of which fail
  on the build-94 loto-web (the two that pass on both are by design: that the
  inventory import stores `'Unknown'`, and the legacy Page # guard).

**Verified on build 95:** **129 tests (134 results) — 134/134** in web,
`{nativeMock:true}` and inside the app on the Simulator (real native files). The
new tests T111–T121 and T124 all fail on build 94; T122 / T123 pass there (they
are guards — T123 was also mutation-checked: one field escaped twice makes it
fail). The fuzzer, on the final build (the harness now also faults the entry-list
write itself, `writeEntryListMerged`): 20,600 actions — no-fault 6,000, 10 %
storage faults 9,600 (incl. a re-run of the seed range that found the T124 bug),
5 % faults over 100-step runs 4,000, and 1,000 inside the app on the Simulator —
**0 violations** (under faults, a unit is lost only when every write failed or
the store can't be read at launch, and each time the app says so). Its first
fault run on this build is what found T124 and the silent empty-emergency-copy
launch. Differential: 249 exports → 344 units / 1,364 sources, every field
loto-web imports matches and a re-import changes nothing — against the NEW
loto-web code. Upgrade chain b88 → b90 → 95: all 34 photos byte-identical, no
file removed, "✓ 34 photos safe", the June-style units "⚠ export again (photos)"
until the All-dates export, which shipped all 34 (0 missing / unsafe /
mismatched). Two tabs (`twotabs.mjs`): the tab opened last is live and the other
writes nothing; "Use this tab instead" hands over; a tab opened during another
tab's photo copy waits, then takes over; no unit lost. Offline export with the
server down (cache v7.91), the header at 390–820 px, and the bottom bar at 375 px
(alert beside one-line Save & New / Export): all pass. loto-web deployed
2026-09-27 (Kudu `247b4fdf`): 3 workers up, and the startup cleanup repaired the
20 stored `LINKED →` details (all Atlanta Main Campus, bare links — before-values
kept in `_loto-web-backups/live-before-b95-deploy/linked_details_repaired.txt`);
its smoke part 7 and every related smoke script pass, and it imports the
Simulator run's real build-95 sheet cleanly.

### Build 94 — the 2026-09-27 execution-based review (10 findings + 2 known)

The fourth review **ran the app instead of reading it** (kit in `tests/fuzz/`,
see its README):

- **Random stateful fuzzing** — `tests/fuzz-harness.js` drives the real app
  functions with seeded random actions (type/template changes, sources, captures
  — some not awaited — valve marks, links, copy/dup/split, Save & New, edit,
  duplicate, delete, bulk delete, export, relaunch, backgrounding, sketches) and
  checks data-safety invariants after every step: no reference without bytes, no
  stale source refs, no duplicate ids, marks ≤ quantity, and on every export the
  photo files' SHA-256 against the stored bytes, `entries.json` against memory,
  the XLSX cell by cell and the CSV; every relaunch must round-trip the saved list
  and the form. A storage-fault mode fails IndexedDB / localStorage reads and
  writes at random — then the only violation is a **silent** loss.
  `tests/fuzz/fuzz_driver.mjs` runs it in parallel headless Chrome workers (no
  npm dependencies); `tests/fuzz/run-sim-fuzz.sh` runs it inside the app on the
  Simulator (real WKWebView + native files). On build 93: 30,600 actions in 630
  sequences, ~1,600 exports, ~1,800 relaunches.
- **Differential** — every export the fuzzer made is imported by loto-web's REAL
  Information Sheet importer into a throwaway database and compared field by
  field with `entries.json`, then imported again (must change nothing):
  `tests/fuzz/fuzz_diff.py` (709 ZIPs, 909 units, 3,378 sources on build 93).
- **Upgrade chain on a Simulator** — `tests/fuzz/upgrade/run-upg.sh` installs
  build 88, 90 and the build under test OVER each other (the data container
  survives, like a TestFlight update) with June-style numeric-id units, and
  checks every unit and every photo byte after the last install.
- Offline (the web server killed after the service worker precached), two tabs,
  and phone widths (`offline_test.mjs`, `twotabs.mjs`, `layout_hdr.mjs`).

Each fix has a test written first and proven to FAIL on build 93 (T100–T110).

| Finding | Fix | Test |
|---|---|---|
| **✕ on the row marked EDITING** deleted the unit but the form kept editing it: Clear then promised "the original saved entry will be preserved" (false — confirming lost the unit) and Save re-created it dated TODAY (an older unit moved to today's sheet) | `formHoldsEntry()`: the delete confirm (and the Bulk Delete summary) say the unit is OPEN in the form; confirming closes the form first (`clearForm(false)`), so its photos go with the entry as usual | T100 |
| **Two tabs** of the web app (or the Finger Lakes page next to it) share one storage and each saved its own list over the other's — a unit saved in one tab vanished when the other saved | one live copy per device (`tabLockInit`, `BroadcastChannel('loto-collector-tabs')`): a newer tab says hello, an older live one answers, the newer pauses; "Use this tab instead" pauses the other (it autosaves first) and reloads this one; a paused tab's `saveAll` / `autoSaveCurrent` write nothing. The iOS app is one window — no effect there | T101 |
| A link (b93 fills a blank source from its target) took "HHW In/Out" but not its device count — exported ×1; loto-web made one water-out point and no In valve | when the energy source comes from the link, so does the quantity (marks reconciled) | T102 |
| On an iPhone the header's six buttons ran off the right edge (Import / Backup / Log / Export only by scrolling sideways) | the header and its buttons wrap; ≤ 600 px the header is not sticky and the buttons are smaller | T103 |
| Unit names and source fields were written into the page as HTML: "Fan <B> & C" showed "Fan  & C", a name with `<img onerror>` RAN SCRIPT (a crafted backup file could do it), and a Device ID with an inch mark (`6" gate`) was cut to `6` in its box — the known "inch-mark truncation" | `escHtml()` on every user value in HTML: saved list, source cards (text and input values), copy / link / duplicate / template dialogs, reuse picker, Photo Store Report, Photo Audit, incomplete-entry list, search summary, export log, collector-tag hint; thumbnails in `src=` too | T104 |
| Copy source changed the device count but kept every valve mark (b93's marks rule missed this path) | `applyCopySource` → `reconcileSourceMarks` | T105 |
| An unsaved unit with no photos counted as today's in the export filter but went on `Information_Sheet_undated.xlsx` (no date for loto-web to scope by) | the per-date grouping dates the open form today | T106 |
| A linked source's Detail cell (col 7) carried `LINKED → X Src#2 \| L`; loto-web stored it as the photo detail — the arrow side (L/R/T/B) was lost and the shared-ID key polluted | col 7 is the source's own detail only; the link has its own column 13 **"Linked To"** (`<unit> / Source #N (<label>)`), past the 12 columns loto-web reads | T107 |
| The Save & New message read `&#10004; Saved "X" "" 5 total` (the toast shows text, not HTML); the same mangled characters (`"·`, `""`) showed in every saved-list row and two source messages | plain characters | T108 |
| KNOWN (b92 review): a value with a line break (notes) wasn't quoted in the CSV — every source row of that unit split in two | `quote()` quotes `\r` / `\n` too | T109 |
| KNOWN (b92 review): an unreadable stored unit-in-progress brought the form up blank without a word — even with a newer local copy on the device — and the unit reappeared launches later as a "Recovered draft" | the newest READABLE copy (the localStorage copy, or the alternate slot) is restored with a warning; with none, a sticky banner says nothing was deleted and to reopen the app before re-entering it | T110 |

loto-web (deployed with this build — 2026-09-27, Kudu deployment `61eefb45`): a unit with **no building and no room**
binds to the block with no location (`infosheet_parser._loc_matches` — it could
never be told apart from a same-named located unit and its block was skipped);
a legacy `LINKED → … Src#N |` prefix is stripped from the Detail cell on import
(`clean_photo_detail`, sheets from builds ≤ 93); the new 13th column is simply
not read. `scripts/smoke_valve_marks.py` part 6 covers all three (two of its
checks fail on the previous loto-web code), and it imports the Simulator run's
real build-94 sheet (`--xlsx …/t79_Information_Sheet.xlsx`) cleanly.

**Verified on build 94:** **115 tests (120 results) — 120/120** in web,
`{nativeMock:true}` and inside the app on the Simulator (the 11 new ones all
failed on build 93). The fuzzer (with the XLSX oracle now also checking col 7
and col 13, and the CSV without its old line-break exemption): 23,580 actions in
471 sequences — no-fault, 10 % and 5 % storage faults, 100-step runs, 1,000
actions inside the app, and every seed that tripped build 93 replayed —
**0 violations** (every storage-fault loss now comes with a warning).
Differential: 481 exports → 639 units / 2,468 sources, every field loto-web
imports matches, a re-import changes nothing. Upgrade chain b88 → b90 → 94: all
34 photos byte-identical, no file removed, "✓ 34 photos safe", the unsaved form
restored, the June units "⚠ export again (photos)" until the All-dates export,
which shipped all 34 (0 missing / unsafe / mismatched). Offline export with the
server down, two tabs (the second pauses; "Use this tab instead" hands over; no
unit lost) and the header at 390 / 430 px: all pass.

### Build 93 — the 2026-09-26 review (15 findings)

A third max-effort review (10 finder angles, 6 verifier batches, a gap sweep) of
build 92 and the loto-web import it feeds found ~48 real defects (none refuted);
the 15 most severe are fixed here, each with a test written first and proven to
FAIL on build 92 (T86–T99; T98 also covers the Generator voltage source, T99
the photo-size clamp).

| Finding | Fix | Test |
|---|---|---|
| Delete trusted an `exportedAt` that builds 83–88 put on pre-UUID (numeric-id) entries while excluding EVERY one of their photos — and since b91 delete really erases those files | `entryExportState()` — the one rule the delete confirm, Bulk Delete and the badge read: `exported` only when the last export shipped all photos; a numeric-id entry needs an export by this build (`exportedAllPhotos`); a newer `exportIncompleteAt` wins over an older `exportedAt` | T86 |
| Duplicate / Dup source / Split copied the breaker / valve **Device ID** (and the LOTO ID) onto another device | cleared on every copy | T87 |
| An autosave during launch (backgrounding, a keystroke, a photo tap) wrote the blank launch form over the unit in progress | `_bootWipSettled`: `autoSaveCurrent` writes nothing until `loadAll` has restored the form; a "Loading saved units…" overlay blocks the form until then; a 20 s safety timeout hands the form over with autosaves diverted to the alternate slot | T88 |
| In/Out valve marks were bound by tap order — loto-web makes the first device the "In" | the dialog asks "Tap the IN valve first, then the OUT valve"; boxes labelled In / Out | T89 |
| A lower device count (Split, Quantity, an In/Out source changed back) left marks the export trimmed by tap order — the arrow could land on the split-off valve | `reconcileSourceMarks()` clears the source's marks (new reference) and asks for a re-mark | T90 |
| Settings was taller than a landscape iPad / an iPhone with no scroll and no way out but an off-screen Save | every `.dialog` scrolls within `100dvh`; Settings has ✕ Close and Cancel | T91 |
| A water check auto-filled for a water source stayed after switching to Electrical — a temperature check exported for a disconnect | a verification from the previous source's family is cleared on an energy-source change (and "Controls" on a new water source) | T92 |
| JSZip / ExcelJS came from CDNs; the iOS app has no service worker, so an offline launch after iOS purged WebKit's cache could not export | bundled in `vendor/` (same files — cdnjs/jsDelivr hashes checked), copied by `npm run build`, precached by `sw.js` | T93 |
| An evicted entry store (IndexedDB readable, list gone) loaded the stripped emergency copy silently | "Entry store was EMPTY — … EXPORT NOW" again | T94 |
| An "All dates" export named its one Information Sheet with TODAY's date; loto-web scopes matching to that date | one sheet per survey date (`Information_Sheet_MMDDYY.xlsx` per day; undated → `Information_Sheet_undated.xlsx`); `manifest.files.xlsxSheets` lists them | T95 |
| A source with no Energy Source (notably a linked one) exported as a blank row the office import skips — with its photo | a link fills the linking source's blank fields from its target; linked sources are checked for an Energy Source; the export asks, and writes "Unknown" | T96 |
| Every new Condensate Pump got the HHW pump template's HHW In | `EQUIPMENT_TEMPLATE_SOURCE_EXCLUDE` (template name kept — loto-web classifies by it) | T97 |
| A template change dropped sources saved before b91 after its dialog promised they were KEPT; the Generator's voltage source was dropped when the confirm was open | the keep filters use `sourceHasUserData()` (now also a typed Device ID, Normally Closed, a link); voltage-prompt sources are `_voltagePick` | T98 |
| A mistyped custom photo size became every later photo's size | clamped (640–8192 × 480–8192) | T99 |

loto-web (deployed with this build): an update-in-place re-import pairs each
sheet row with the existing source of the **same energy source, in order** —
never by row position (Normally Closed and valve marks used to land on the next
source down after a Split or a reorder, and NC never clears); a row that matches
no source, or has data but no Energy Source, is reported. Name matching tries
an exact name on another date before any fuzzy match, and the fuzzy match is
whole-word and unique ("EF-1" never binds to "EF-12").
`scripts/smoke_valve_marks.py` covers all of it.

**104 tests** (109 results) — **109/109** in web, `{nativeMock:true}` and inside
the app on the Simulator.

### Build 92 — valve marks (tap the valve in the source photo)

**Why:** loto-web draws each source's ID box + arrow on its photo. With nothing to
go on it used a preset corner (from the L/R/T/B detail), so the office dragged every
box onto its valve by hand after each import. The tech standing at the valve is the
one who knows where it is.

**What the tech sees.** After a source photo is stored (capture or Reuse), a
"📍 Where is the Ball Valve?" dialog shows the photo: tap the valve (a quantity-N
source takes N taps; once all are placed a tap moves the nearest). The preview draws
the boxes and arrows exactly as loto-web will lay them out — other sources that share
the same shot are dimmed. **Save / Clear / Skip**; "Ask after every source photo"
(also in Settings, `localStorage.loto_ask_valve_mark`, default on) turns the prompt
off — then mark any time with **📍 Mark** under the photo or from the photo viewer.
A marked slot shows a 📍 badge (📍 2 for two devices), the collapsed card a 📍.

**Data.** `photos['source_N'].marks = [{x, y}]` — fractions of the image (0..1 from
its top-left, 3 decimals), one per device of the source's quantity — on the SOURCE
PHOTO REFERENCE, because a mark belongs to one photo: a retake or a reuse makes a new
reference with no mark (T81); Duplicate Source is a different device, so its copy
starts unmarked (T83); Duplicate Entry copies marks with the photos. Saving REPLACES
the reference object (`saveValveMarks`): while a saved entry is being edited the form
shares its references, and a discarded edit must not move the saved entry's mark
(T82). The dialog is bound to the reference it opened on — if that photo is retaken
or the form changes meanwhile, nothing is saved.

**Placement rule** (`layoutValveMarks`, identical in loto-web's
`app/services/valve_marks.py` and its editor's `_layoutValveMarks`): per photo, in
source order, the arrow tip goes on the mark and the ID box (0.32 × 0.13 of the
frame) at the arrow's tail; candidate sides in order: the horizontal side with more
room, the other horizontal side, then vertical (box above for a mark in the lower
half, below otherwise), the other vertical — the first whose box and arrow overlap
no shape already placed and cover no other mark wins. Arrows are 0.25 long, shorter
(≥ 0.08) near an edge. Strict comparisons and `floor(v·10⁴ + ½)/10⁴` rounding make
the JS and Python copies agree exactly: T84 pins golden values that loto-web's
`scripts/smoke_valve_marks.py` asserts too, and that script also runs both JS copies
against the Python one on 400 random mark sets. Because loto-web STRETCHES each
photo to its procedure frame (never crops), image fractions are frame fractions.

**Exports.** `entries.json` `sources[i].photoMarks`; the Information Sheet XLSX
col 12 **Valve Mark** (`"0.412,0.633"`, several `"x,y; x,y"`); the CSV's last
column **Valve Marks**. All three only when that source's photo is in the export,
and only while the marks fit the source (build 95, `marksFit`): never more marks
than devices, and never marks placed before the source became an In/Out pair
(the photo ref records `marksFor: {qty, inOut}` when marks are saved).
loto-web (separate deploy) stores them on `EnergySource.photo_marks`, and uses them
only where nobody has placed that box in its editor — a saved placement always wins.

Tests T79–T85, each first proven to FAIL on build 91 (and T82/T83 re-checked by
putting the bug back): T79 mark → ref → entries.json / XLSX col 12 / CSV; T79b
quantity-2 taps + Clear; T80 the prompt (default on; not after equipment photos; not
when off; 📍 Mark appears with the photo); T81 retake drops the mark; T82 discarded
edit; T83 Duplicate Source; T84 golden layout; T85 two sources on one shared photo.
**90 tests** (95 results) — **95/95** in web, `{nativeMock:true}` and inside the app
on the Simulator (incl. the 500-entry scale test). The Simulator run now also saves
T79's real exported Information Sheet (`<work>/artifacts/`), which loto-web's smoke
test imports with `--xlsx`.

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

**Photo filenames (build 89): `{MMDD}_{TAG}-{dev4}_{NNNNN}`** — e.g.
`0924_JW-a1b2_00001` (blank tag: `0924_a1b2_00001`). `{dev4}` is the first 4
characters of the device id and is **always** included: a typed tag alone
(`0924_JW_00001`) collided whenever two devices — or a reinstalled iPad — used the
same initials, since each device keeps its own counter. Numbers are **reserved
before the ZIP leaves the device** (`reservePhotoSeq`: `photoSeqNext` +
`loto_seq_used`), so a WebView killed at the share sheet can't let the next export
reuse them; a start number at or below one already handed off for that date asks
**Start at N+1 (recommended) / Keep (re-sending the same export) / Cancel**. The
dialog's date filter defaults to today, else the newest day with entries — never
"All dates", because the whole ZIP is built in memory. Photos are zipped with
`STORE` (JPEGs don't compress), and the iOS save writes the ZIP to Cache in 3 MB
pieces instead of one giant base64 string.

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

**Export stamps (build 77; build 89).** On a successful hand-off every included
entry whose photos ALL made it into the ZIP is stamped `exportedAt` + `exportId`
(see §5.5) — the saved list's export badges and the delete guards read these. An
entry with a missing or excluded photo gets `exportIncompleteAt` instead
("⚠ exported incomplete"), so "export anyway" can no longer make an entry look
safe to delete. The open form is never stamped.

**Which entries (build 89).** The date + facility filters pick the saved entries.
The open form is snapshotted (`snapshotFormEntry`) so edits during a long export
can't leak in: a NEW unit joins if it passes the filters; a unit open for EDIT
replaces its saved copy (it used to ship twice). A unit saved twice under one id
ships once — its newest copy — after a confirm. More than 10 sources on a unit
gets a confirm (the XLSX holds 10; see below). Then the export's gates run:
missing bytes, hash mismatches, unsafe references (legacy / foreign / wrong
source — excluded, with reasons), and the hard duplicate gate.

Structure (rev 6):

```
FieldExport_{code}_{MMDDYY}_{deviceShort}.zip
├── manifest.json                          # bundle index — read this first
├── entries.json                           # structured entry array — preferred ingest surface
├── info_sheets/
│   ├── LOTO_FieldData_{MMDDYY}.csv         # every entry × source pair (columns below)
│   └── Information_Sheet_{MMDDYY}.xlsx     # styled ExcelJS workbook (human form)
├── photos/
│   ├── {MMDD}_{TAG}-{dev4}_{NNNNN}.jpg     # equip (main/dataplate/EE) + per-source, numbered in slot order (.png if source is PNG)
│   └── {safeName}_{id8}_Misc{N}.jpg        # additional non-slot ("misc") photos
└── diagrams/
    └── {safeName}_{id8}_diagram.png        # annotated overhead sketch (only if the entry has sketch data)
```

`{safeName}` = `{building}_{room}_{equipName}` with non-alphanumeric characters (except `_` and `-`) replaced by `_`; `{id8}` = the first 8 characters of the entry id (build 89 — two same-named units in one room used to overwrite each other's misc and diagram files). The H-number → slot mapping is recorded in `entries.json` (`photoFiles` / per-source `photoFile`), the CSV (photo-filename columns), and the XLSX — so a consumer never has to guess which file is which.

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
          "valveState": "normally_closed", "photoFile": "photos/0713_00003.jpg",
          "photoMarks": [ { "x": 0.412, "y": 0.633 } ] }
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
Valve State, Photo Filename, Detail, Linked To, Main Photo Filename,
DataPlate Photo Filename, EE Photo Filename, Diagram Filename,
Misc Photo Filenames, Valve Marks
```

A value containing a comma, a double quote **or a line break** is quoted
(`"…"`, quotes doubled). Line breaks weren't until build 94 — a note with one
split every source row of its unit in two.

The `Hospital Code` column (first) carries the entry's `hospitalCode`,
falling back to the current facility setting for entries saved before a
facility was picked (`entryHospitalCode()`). Maps to loto-web
`Hospital.key` — see §10.

The `LOTO ID` column carries `SavedEntry.lotoId` (blank if the user
didn't enter one). It's the intended dedup key on the loto-web
side — see §10 for how ingest should reconcile blank vs. populated.

`Linked To` is populated when a source is linked to another equipment's source (see `LinkedSourceRef`).

`Valve Marks` (build 92) is the LAST column: the source photo's valve marks, `x,y`
fractions (`x,y; x,y` for several), same text as the XLSX's col 12.

### XLSX Information Sheet

Professional formatted `.xlsx` mirroring the paper "LOTO Information Sheet" form used by field crews. Header rows for the equipment metadata, a 10-row source table (padded with blanks if fewer than 10 sources), photo filename references, page numbering, and linked-source markers. Styled per-cell via ExcelJS. One sheet per survey date (build 93); the unsaved open unit counts as today's even before its first photo (build 94).

**Detail + Linked To (build 94):** column 7 of a source row is the source's own
detail and nothing else — loto-web stores it as `photo_detail`, a POSITION MARKER
(§10). Linked sources used to get `LINKED → <unit> Src#N | <detail>` there; the
link now has its own **column 13, header `Linked To`**, value
`<unit> / Source #N (<source label>)` — past the 12 columns the office importer
reads, so nothing downstream changes. The CSV's `Linked To` and `entries.json`'s
`linkedTo` are unchanged.

**Valve Mark (build 92):** column 12 of every source row — header `Valve Mark`,
value `x,y` photo fractions where the tech tapped the valve (`x,y; x,y` for a
quantity-2 row), blank without a mark or without a photo. loto-web reads it as
`col_valve_mark` and starts the source's box + arrow there (§6 "Build 92").

**Valve State (build 91):** column 11 of every source row — header `Valve State`,
value `Normally Closed` (blank = normal). This sheet is what the office actually
imports (loto-web's UI and SharePoint pull only take the XLSX), and it had no
valve state: a Normally Closed valve arrived as an ordinary one and its procedure
said to open it at restore. loto-web's `infosheet_parser.LAYOUT_FIELDAPP` reads it
as `col_valve_state` (loto-web change, deployed separately).

**The block is fixed at 10 sources (`MAX_XLSX_SOURCES`) on purpose.** loto-web's office importer reads this sheet as 27-row blocks (§10); a taller block for an 11-source unit would shift every unit after it. Sources 11+ are in the CSV and `entries.json` (which loto-web's field import reads); the app toasts when an 11th source is added and the export confirms before shipping such a unit.

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

**Restoring a backup (build 89).** Import asks **Merge (recommended) / Replace the saved list / Cancel — change nothing**. (The old native confirm made its *Cancel* button mean REPLACE.) Merge adds entries this device doesn't have, matched by entry id (or `legacyId`). Replace makes the list the backup's entries, but an entry that also exists on the device keeps the DEVICE's version — its photo refs point at the shots actually on disk; the old Replace pointed retaken photos back at the rejected originals. Of a unit saved twice on the device, the NEWER copy is that version (build 99); a form open on the copy that leaves moves to the one that stays (build 97), and a form holding a unit Replace removes is closed (build 95). A backup includes an unsaved NEW form (with its id and photo refs) but never a second copy of an entry open for edit. `normaliseEntry` replaces a missing/malformed id with a UUID (old value → `legacyId`).

### File save behavior — web vs iOS

Both `runCombinedExport` and `saveBackup` go through **`saveOrShare(blob, filename, mimeType)`** (index.html line ~5490):

- **Web (browser)** — classic `URL.createObjectURL(blob)` + `<a download>` + `.click()`. Works in Chrome / Safari / Firefox.
- **iOS (Capacitor WebView)** — `<a download>` is silently ignored in WKWebView. `saveOrShare` writes the blob to the app's Cache directory via `@capacitor/filesystem` — in 3 MB `writeFile`/`appendFile` pieces since build 89, then checks the file's size — and then opens the **native iOS share sheet** via `@capacitor/share`. User picks Save to Files, AirDrop, email, or any share-sheet destination.

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
- Plugins (`CapApp-SPM/Package.swift`, written by `cap sync`): filesystem, share,
  camera, and since build 101 **`@capacitor/app`** (the `lotocollector://` return
  from the backup sign-in) and **`@capacitor/browser`** (the sign-in sheet);
  `CapacitorHttp` (the backup's native HTTP) is part of the core

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
- `CFBundleURLTypes` — the `lotocollector` URL scheme (build 101): the backup sign-in page hands its one-time code back through `lotocollector://backup-link?code=…`

### Versioning

- `MARKETING_VERSION` — user-facing (currently `1.4`); bump for user-visible releases
- `CURRENT_PROJECT_VERSION` — build number (currently **101**); **must be strictly increasing** for the same `MARKETING_VERSION` or Apple rejects the upload. Bumped by +1 on every commit that goes to TestFlight. Both Debug + Release entries in `project.pbxproj` must match.

### Service worker cache

`sw.js` is network-first for every GET (it caches only OK / opaque responses —
an error page or a Wi-Fi captive portal never replaces the cached app — and falls
back to the cached `index.html` for navigations offline). It precaches the app,
JSZip **and ExcelJS** (build 91). It does not run inside the iOS app (no
App-Bound Domains). **`CACHE_NAME` must be bumped every time cached files
change.** Currently `loto-collector-v7.97` (build 101 ↔ v7.97). It leaves alone
anything cross-origin, `/api/…` and `/.auth/…` (build 101: the backup's calls and
the Microsoft sign-in must always reach the network, never a cached answer).

The page's inline purge (unregister every worker, clear every cache, reload)
now runs **once per device** (`localStorage.sw_purged_v1`) and never offline
(`window.shouldPurgeServiceWorkers`). Keyed to `sessionStorage` it had run on
every cold start — offline, the reload found nothing and the web app could not
open.

---

## 9. Deployment topology

### Web (auto-deploys on push to `main`)

`.github/workflows/azure-static-web-apps.yml` — one job that runs Azure's `static-web-apps-deploy@v1` action. Config in the workflow: `app_location: "/"`, `skip_app_build: true`. That means Azure ignores everything Node-related (no `npm install`, no `www/` step) and just uploads the repo root as static files.

`staticwebapp.config.json` sets `Cache-Control: no-cache, no-store, must-revalidate` on `sw.js`, both HTML files, and both manifests. That's what fixes the "user stuck on old SW" bug. GitHub Pages is unaffected (no cache headers control) but users on that URL clear more slowly.

Since build 101 the workflow's `api_location: "api"` deploys the SharePoint backup
functions with the site (Azure builds them — no npm dependencies; Node 20 from the
config's `platform.apiRuntime`). The config limits `/api/device-token` to signed-in
visitors; `/api/upload`, `/api/upload-session` and `/api/device-pass` must stay open
(the iPad calls them with its device pass — each function checks its caller). The
functions' settings (`GRAPH_*`, `ALLOWED_DOMAIN`, `DEVICE_PASS_*`) are Application
settings of the Static Web App in the Azure portal — never in this public repo.
Until they are set, `GET /api/upload` answers `configured: false` and nothing is
written.

### Promoting a build to the web (`main`)

`main` is no longer the stale v7.0 line it was through July 2026. Since 2026-08-12 it
carries the same app as `ios-testflight-scaffold`, **promoted by copying the web files
across — never by merging**: the branches diverged long ago and `main` has no
Capacitor/iOS tree.

Promotion worktree: `~/Desktop/Claude Apps/loto-main-web` — a `git worktree` of this
repo on branch `main-promotion`, tracking `origin/main`.

1. Copy `index.html`, `FingerLakes_Information_Sheet.html`, `sw.js`, `manifest.json`,
   `manifest_fl.json` and (since build 93) `vendor/*.js` from the scaffold checkout into
   the worktree. **Since build 101 also** `backup-link.html`, `api/` (without
   `local.settings.json`, which is never committed), `staticwebapp.config.json` and
   `.github/workflows/azure-static-web-apps.yml` (`api_location: "api"`) — `main`'s
   copies of the last two matched the scaffold's until build 101.
2. `git add` **those files only** — never `git add -A`: untracked test harnesses
   (e.g. `tests/photo-regression.js` copied in for verification) must not ship to a
   public static site.
3. `git commit`, then `git push origin main-promotion:main`. Azure deploys automatically.

> **Build 100 promoted 2026-09-28 (`521bfe9`)** — Azure and GitHub Pages both serve
> `b100` / cache v7.96 (checked after the push). Before it: build 99 (`b23bc06`), build 98 (`c29f10d`), build 97 (`c424273`), build 96 (`372c9d3`), build 95 (`59f0eaf`),
> build 94 (`f8ee3e7`, the first with `vendor/`).

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

### Build 89 changes visible downstream

- **Photo filenames** carry the device code: `0924_JW-a1b2_00001.jpg` (was
  `0924_JW_00001.jpg`). The stem is still what binds (`photo_ref`); the last-four-
  digits key loto-web also derives is unchanged. Misc and diagram files gain the
  entry id: `{safeName}_{id8}_Misc1.jpg`, `{safeName}_{id8}_diagram.png`.
- **Linked sources keep their photo** (`photoFile` is set) and `linkedTo` gains
  `entryId` + `sourceId` (older links carry only name + index). loto-web still
  ignores `linkedTo`; resolving shared isolation ids from it is future work there.
- **Sources may carry `priorSourceIds`** (ids a source had before a duplicate-id
  split). `sourceId` is unique within an entry for anything saved by build 89;
  entries saved earlier may still repeat one.
- **Entries may carry** `updatedAt` (every save), `legacyId` (a malformed id that
  was replaced), and `exportIncompleteAt`.
- **`manifest.json`**: `counts.hashMismatches`; `photos[].entries[].hashMismatch`;
  `unsafe[].reason` can now also be *photo was taken for a different source of this
  unit* / *…a source no longer on this unit* (those photos are not in the ZIP).
- An entry id is either a UUID or (pre-UUID data) a 10–16 digit number.

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
  nothing. A unit with **no building and no room** matches the block with no
  location (loto-web `_loc_matches`, 2026-09-27 — it used to be unmatchable next
  to a same-named located unit).
- **Column 13 `Linked To` (build 94)** is past what the importer reads. Sheets
  from builds ≤ 93 carry the link in col 7 (`LINKED → X Src#N | L`); loto-web
  strips that prefix on import (`clean_photo_detail`).

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

Approximate line numbers (may drift as edits accumulate) — refreshed for build 100, build 101's rows added (rows naming functions track the current file):

| Concern | index.html line |
|---|---|
| Global mutable state (`sources`, `photos`, `currentEntryId`, `savedEquipment`, `editingEntry`, `lastAutoFilledEquipName`) | 1727 |
| `DATA.equipmentTypes`, `energySources`, `deviceTypes`, `locations`, `verificationTypes`, `templates` | 1051 |
| `EQUIPMENT_AUTO_SOURCES` | 1661 |
| `EQUIPMENT_TEMPLATE_MAP` | 2605 |
| `TEMPLATE_AUTO_SOURCES` | 4524 |
| `TEMPLATE_VOLTAGE_OVERRIDES` / `TEMPLATE_SKIPS_VOLTAGE_PROMPT` | 4353 / 4342 |
| `SOURCE_KINDS_WITH_PHOTO_TOGGLE` / `EQUIPMENT_ALLOW_PHOTO_FOR_SOURCE` | ~1438 |
| `applyTemplate()` — keeps photographed sources (build 89) | 4217 |
| `equipTypeChanged()` — keeps photographed sources (build 89) | 2338 |
| `handleEquipTypeChange()` (auto-fill Equipment ID/Name) | 4766 |
| `applyElectricalCountChoice()` — never removes a photographed source (build 89) | 4488 |
| **Source photos follow their source (build 89):** `rebindSourcePhotos` / `sourcesWithPhotos` / `dropStaleSourceRefs` / `noteSourceLimit` + `MAX_XLSX_SOURCES` | 4751 / 4759 / 4767 / 4774 |
| Photo slot rendering by stored key (build 89): `photoSlotBadge` / `photoSlotInnerHtml` / `paintPhotoSlot` / `paintEquipPhotoSlots` | 4987 / 4996 / 5007 / 5017 |
| `renderSources()` (source cards, photo slot toggle) | 5019 |
| `splitSource` / `removeSource` / `duplicateSource` / `moveSource` — all via `rebindSourcePhotos` | 5121 / 5317 / 5444 / 5481 |
| `applyLink()` — keeps the photo; `linkedTo.entryId` / `sourceId` (build 89) | 5634 |
| `showCopySourceDialog` / `pickCopySourceEntry` / `applyCopySource` — Copy Source per-card action (§5.5) | 5528 / 5562 / 5596 |
| `performSaveAndNew()` — canonical entry shape; replace-or-append BY ID (build 89) | 8351 |
| `formHasData()` — what counts as unsaved form data (photos alone count) | 8325 |
| `clearForm()` — new form session; sketch cleared before the autosave | 8427 |
| `isSavedToday` / `isSavedYesterday` / `setSavedFilter` / `setSavedSearch` / `matchesSavedSearch` — saved-panel filter + search predicates (§5.5) | 8250 – 8266 |
| `renderSavedPanel()` (saved list + filter bar + search + SAVED TWICE / exported-incomplete badges) | 8534 |
| `editSaved()` / `duplicateSaved()` / `executeDuplicate()` — session-bound (build 89) | 8930 / 9026 / 9063 |
| `runCombinedExport()` — ZIP export (PASS 2B builds `entries.json`; `manifest.json` + `FieldExport_…` filename near the end) | 9509 |
| Export helpers (build 89): `snapshotFormEntry` / `entryRecency` / `getSeqUsed` / `reservePhotoSeq` | 9462 / 9488 / 9492 / 9498 |
| `resolveExportPhoto()` — owned-keys-only, source-binding check, hash-verified reads, sha256 manifest records (inside `runCombinedExport`) | 9385 |
| Export gates inside `runCombinedExport`: missing bytes, hash mismatches, `unsafeRefs` acknowledgement, and the hard **duplicate gate** | 8989 – ~9060 |
| `saveBackup()` — JSON backup (v2 envelope) | 10212 |
| `handleBackupFile()` — Merge / Replace / Cancel (build 89; Replace keeps the device's newer copy of a unit saved twice — build 99) | 10278 |
| `normaliseEntry()` — backup import (spread-preserves identity fields; validates ids) | 10389 |
| `setAutosaveStatus()` / `autoSaveCurrent()` — autosave indicator + save (§5.5; the form waits while a kept draft's save is pending — build 100) | 10493 / 10674 |
| `saveAll()` — the list write (§6 "The list write"): emergency copy, compare-and-set store write, localStorage fallback; resolves true once durable | 11051 |
| `mergeStoredEntryList` (the list write's merge, build 95 — it replaced mergeUnreadEntryStore; firstCopyIsNewer went with build 91's merge) / `entryListStamp` / `repairPhotoRefs` | 11167 / 10849 / 11183 |
| `loadAll()` — merges every stored copy, resolves the unit in progress, saves once (§6 "The launch") | 11284 |
| `mergeEntryCopies` (every stored copy; deleted ids dropped) / `keepWipAsRecoveredEntry` (a unit in progress becomes a recovered draft) | 10907 / 11257 |
| `saveOrShare()` — unified file save helper (chunked native write, build 89) | 11802 |
| **Form sessions + in-flight photo writes (build 89):** `formSession` / `beginNewFormSession` / `startPhotoWrite` / `photoWritesBusy` / `refuseIfPhotoWritesBusy` | 1773 / 1774 / 1778 / 1783 / 1788 |
| `askChoice()` — promise-based multi-choice dialog (tests answer via `window.__askChoiceAuto`) / `escHtml` | 1841 / 1808 |
| `isValidEntryId` / `ENTRY_ID_PATTERN` — UUID or numeric pre-UUID owner ids | 1754 / 1752 |
| **IndexedDB layer (build 89):** `openPhotoDB` / `withPhotoDB` (reconnect + retry) / `idbTx` / `getAllPhotoKeysStrict` | 6573 / 6624 / 6637 / 6781 |
| **Photo key core (§6):** `PHOTO_KEY_RE` / `photoStoreKey` / `parsePhotoKey` / `photoKeyOwnedBy` / `slotTokenForSource` / `slotTokenFor` / `mintMiscSlotToken` | 6811 / 6812 / 6817 / 6821 / 6830 / 6844 / 6897 |
| Source-binding check + human confirmation: `isRecordedDup` / `sourcePhotoBindingProblem` / `confirmSourcePhoto` / `auditKeepSourcePhoto` | 6860 / 6866 / 6880 / 7796 |
| Reversible FS filename encoding (§6): `photoFsRelPath` / `photoKeyFromFsName` | 6923 / 6929 |
| **Durable photo storage (§6):** `fsWritePhoto` (atomic) / `cleanupFsTempFiles` / `storePhotoBytes` / `loadPhotoBytes` (hash-verified) | 6974 / 7025 / 7044 / 7072 |
| Hashing (§6): `sha256HexJS` / `sha256HexOfBytes` / `recordPhotoHash` (serialized) / `showPhotoHashWarning` | 7132 / 7166 / 7186 / 7221 |
| Presence sets: `fsPresentKeySet` (null on failure) / `presentPhotoKeySet` (`.incomplete`) / `migratePhotosToFS` | 7244 / 7268 / 7290 |
| **Migration + quarantine + repair (§6):** `PHOTO_KEY_MIGRATION_FLAG` / `migrationRev` / `runPhotoKeyMigration` / `showPhotoStoreReport` / `collectMigrationSourceKeys` / `exportQuarantineZip` | 7334 / 7344 / 7349 / 7482 / 7526 / 7551 |
| Re-attach (reviewed, missing-only): `thumbnailFromBytes` / `findReattachCandidates` / `applyReattach` / `reattachOrphanedPhotos` / `showReattachReview` | 7618 / 7645 / 7695 / 7718 / 7734 |
| `runPhotoAudit()` — incl. "photos on the wrong source" | 7800 |
| `renderCapture()` — resize / encode / thumbnail; refuses a blank canvas | 7898 |
| `handlePhoto()` — capture pipeline: session + source-object binding, id-owned key, saving → saved/failed, hash warning | 7931 |
| Integrity: `allReferencedPhotoKeys` / `runIntegrityCheck` / `updateIntegrityBadge` | 8072 / 8101 / 8133 |
| `handleMiscPhoto()` / `removeMiscPhoto()` (reference only, never bytes) | 8153 / 8224 |
| Reuse-a-Photo (§7): `collectTodaysPhotos` / `showReusePhotoPicker` / `reusePhotoInto` | 5955 / 5975 / 6011 |
| Local-day date helpers (§7, build 74): `localDateStr` / `exportDateFrom` | 9254 / 9262 |
| Reference-aware photo deletion — **the only path that removes bytes**: `deleteEntryPhotos` (never while another row or the form has the id) | 8726 |
| Delete guards (§5.5, build 77): `deleteSaved` / `updateBulkDeleteSummary` / `exportBeforeBulkDelete` | 8770 / 8856 / 8889 |
| `scanTextToField()` — camera + OCR helper | 11902 |
| `init()` — startup: `ensureDeviceId()`, `updateFacilityBadge()`, dropdowns, the photo startup chain | 2069 |
| `genUuid()` / `ensureDeviceId()` / `ensureSourceId()` — stable UUID + device id (§1b/1c) | 1907 / 1950 / 1969 |
| `getCollectorTag()` — `TAG-dev4` (build 89) | 1928 |
| `HOSPITALS` roster + `getHospitalCode()` / `setHospitalCode()` / `entryHospitalCode()` (§2) | 1983 / 1993 / 1996 / 2041 |
| `updateFacilityBadge()` — header facility chip | 910 |
| Settings modal (`showSettings` / `savePhotoSettings` — photo + facility) | ~700 |
| **Build 94:** `formHoldsEntry` (delete closes the form holding the unit) / `tabLockInit` · `pauseThisTab` · `takeOverThisTab` (one live tab) / `showWipReadBanner` / `quote` (CSV, line breaks) | 8509 / 2025 · 2045 · 2061 / 10428 / 10146 |
| `reconcileSourceMarks` — marks vs device count (Split, Quantity, Copy source, a link) / `escHtml` — every user value that goes into HTML | 6258 / 1808 |
| **Build 95 — tab claim:** `TAB_ID` / `claimThisTab` / `tabMayWrite` (every write) / `otherTabBusy` · `markTabBusy` (wait for the other tab's photo writes) / `tabLockInit` / `pauseThisTab` · `takeOverThisTab` | 2059 / 2068 / 2073 / 2086 · 2090 / 2097 / 2131 · 2136 |
| **Build 95 — entry list:** `writeEntryListMerged` (compare-and-set, `_entryStoreAt`) / `saveAll` / `writeEntrySnapshot` / `mergeStoredEntryList` | 10600 / 10630 / 10663 / 10701 |
| **Build 99:** `claimedMetadataTx` / `waitForOtherTabsPhotos` / `holdPhotoLock` / `eventTimeAfter` / `buildWipState` / `showSourceToast` / `restoresFromList` | 10541 / 2108 / 2136 / 10815 / 10621 / 4958 / 10791 |
| **Build 100:** `holdWipUntilSaved` / `releaseWipHold` / `formChangedSinceBoot` | 10667 / 10668 / 10652 |
| **Build 101 — SharePoint live backup** (module header "SHAREPOINT LIVE BACKUP") | 11764 |
| Backup state + records: `backupCfg` · `_backupSent` · `_backupDays` / `backupAvailable` / `loadBackupRecords` · `saveBackupRecords` | 11801 / 11816 / 11829 · 11840 |
| Backup transport (tests replace it): `backupTransport.api` · `.session` / `backupSend` (sends, checks the echo) | 11852 / 11905 |
| What goes where: `backupFolderOf` / `backupPhotoName` / `backupPhotoList` / `backupSlimUnit` / `backupIndexCsv` / `backupDayFiles` | 11919 / 11922 / 11929 / 11959 / 11969 / 11999 |
| The pass: `scheduleBackup` / `backupAttempt` (error classes) / `drainBackup` | 12034 / 12043 / 12064 |
| Export to SharePoint: `backupUploadBig` (upload session, QuickXorHash) / `sendExportToSharePoint` / the call in `runCombinedExport` (`opts.toSharePoint`) | 12140 / 12179 / ~10183 |
| Sign-in: `refreshBackupUser` (web) / `signInForBackup` · `finishBackupSignIn` (iPad, PKCE) / `signOutBackup` | 12202 / 12217 · 12231 / 12251 |
| Badge + Settings: `paintBackupBadge` / `openBackupSettings` · `paintBackupSettings` / `setBackupOn` / `testBackup` / `backupEverythingAgain` / `startBackup` / markup `#backupBadge` · `#backupSettings` · `#exportCloudBtn` | 12264 / 12281 · 12286 / 12308 / 12323 / 12348 / 12360 / 485 · 856 · 730 |
| `qxhCreate` — QuickXorHash, the same as `api/shared/qxh.js` | 12373 |
| **Build 97:** `wipSlotTx` (claim checked in the transaction) / `backfillMarksShape` / `markTabBusy` / `beatTabBusy` / `clearOwnTabBusy` / `showToast` | 10564 / 6234 / 2156 / 2170 / 2125 / 11728 |
| **Build 96 — deletes as events:** `resetTombstoneMemory` / `tombstoneEvents` / `getTombstones` / `getRestores` / `clearTombstones` / `absorbTombstoneMirror` | 10738 / 10766 / 10773 / 10779 / 10833 / 10765 |
| **Build 96 — launch + tabs:** `settleWipSlots` / `emptyWipSlot` / `pauseLegacyTabs` / `loadAll` | 10570 / 10582 / 2196 / 11284 |
| **Build 95 — unit in progress + warnings:** `WIP_SUPERSEDED_KEY` · `noteWipWritten` / `autoSaveCurrent` / `loadAll` (WIP section: `mayWrite`, `superseded`) / `showStickyBanner` / `paintBottomAlert` | 10370 · 10372 / 10378 / 10817 / 10566 / 10315 |
| **Build 95 — rows + marks:** `formHoldsEntry` (the edited ROW) / `closeFormIfRemoving` / `marksFit` · `marksShapeOf` · `fittingMarks` · `MARKS_CLEARED_NOTE` / `reconcileSourceMarks(i, quiet)` / `sourceMarksForExport` / `saveValveMarks` (records `marksFor`) | 8607 / 8617 / 6112 · 6118 · 6119 · 6122 / 6127 / 6140 / 6414 |
| **Build 95 — escape by default:** `RawHtml` · `raw` · `htmlValue` · `html` · `jsArg` | 1821 · 1822 · 1823 · 1829 · 1834 |

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
