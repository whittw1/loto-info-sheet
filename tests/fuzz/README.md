# Execution-based review kit (build 94, 2026-09-27; updated for builds 95–101)

Everything here RUNS the app instead of reading it — the method of the
2026-09-27 review (ARCHITECTURE.md §6 "Build 94"). Nothing is part of the
shipped bundle. Every script refuses real data: fresh headless-Chrome profiles,
throwaway Simulator builds and installs, and the harnesses' own guards (web:
localhost only and an empty store; in the app: the iOS Simulator only, on an
empty install).

The web runs need the app served at http://localhost:8741 (preview
`loto-testflight`) — or another checkout's server named in `APP_BASE`
(e.g. `APP_BASE=http://localhost:8742` for a worktree; build 102). Google Chrome, Node 22+ (built-in WebSocket) and Python 3;
no npm packages.

| What | How |
|---|---|
| Regression suite (tests/photo-regression.js), headless | `node run_suite.mjs` · `NATIVE_MOCK=1 node run_suite.mjs` · `ONLY=t100,t101 VERBOSE=1 node run_suite.mjs` |
| Random stateful fuzzer with data-safety oracles (`../fuzz-harness.js`) | `node fuzz_driver.mjs <workers> <firstSeed> <seedsPerWorker> <steps> <faultRate> <out.json> [http://127.0.0.1:8748]` |
| Replay seeds with full traces | `SEEDS=1014,7153 KEEP=1 node fuzz_driver.mjs 2 0 0 40 0 replay.json` |
| Collector export → loto-web's real importer (differential) | `python3 fuzz_receiver.py <zipdir>` while fuzzing with the upload URL, then `python3 fuzz_diff.py <zipdir>` (loto-web checkout: `$LOTO_WEB`, else a sibling of this repo) |
| The fuzzer inside the iOS app (WKWebView + native files) | `OPTS='{"seeds":[1,2,3],"steps":40}' WORK=$(mktemp -d) ./run-sim-fuzz.sh` |
| Upgrade chain b88 → b90 → working tree on a Simulator (installed over each other, data kept) | `./upgrade/run-upg.sh` |
| Directed repros | `node directed.mjs scenarios/common.js scenarios/<name>.js` |
| Offline PWA export (server killed after the service worker precached) | `node offline_test.mjs` |
| Two tabs saving at once (web): the tab opened last holds the claim, the other writes nothing; "Use this tab instead" hands over; a tab opened while another writes photos waits (build 95) | `node twotabs.mjs` |
| Header width on phones | `node layout_hdr.mjs [outDir]` |
| The fuzzer with the SharePoint live backup on (build 101): a stand-in SharePoint that, while faults are on, refuses, drops, wrongly confirms or stores without answering; units moved to earlier days and facilities changed so day folders empty out | `BACKUP=1 node fuzz_driver.mjs …` · in the app: `OPTS='{"seeds":[1,2],"steps":40,"backup":true}' ./run-sim-fuzz.sh` |
| The backup end to end, web: the real client in headless Chrome against the REAL `api/` functions (`backup_e2e_server.mjs` on port 8790 fakes only Microsoft's sign-in, Graph and SharePoint) | `node backup_e2e.mjs` |
| The backup end to end inside the iOS app: CapacitorHttp, the device pass, a photo byte-identical in the stand-in, 12 MB in 5 MiB pieces, and the whole sign-in — the Browser sheet, the `lotocollector://` link back through iOS (`simctl openurl`), code + verifier → pass (throwaway build; its Info.plist alone may load `http://localhost`) | `./run-sim-backup.sh` (`SITE_PORT` to move the stand-in) |
| The backup's functions, Graph faked (QuickXorHash against the libqxh vectors, paths, the pass, PKCE) | `node ../api/api.test.js` |
| A build 94 tab still open when a newer build reaches the web: it must pause, its saves must not reach the store, a later tab sees what the new tab saved (build 96); an untouched new tab shows the old tab's final form, and a build 94 tab opened AFTER the new one pauses on the answer to its hello (build 99). Scratch site on its own port with the production no-store headers and the real service worker; build 94 comes from git (`B94=<commit>` to override) | `node b94_compat.mjs` (`SITE_PORT` / `PORT` to move it) |

Oracles worth knowing: the harness compares every export with its OWN reading
of the contract (`ownMarks`, the sheet's columns), not the app's helpers, so a
bug in a helper can't hide on both sides. Build 95 changed the marks contract: more marks
than devices ship none, and neither do marks placed before a source became an
In/Out pair (`ref.marksFor`); the invariant `marks-order-unknown` flags any
path that leaves such marks stored. Fault mode also fails the entry-list write
itself (`writeEntryListMerged`, build 95's compare-and-set save — it no longer
goes through `saveMetadataMany`), so the localStorage fallback path stays
covered — and since build 96 its COMMIT fails too (the transaction is aborted
after every put was issued), which runs the save's retry. Since build 97 the
unit-in-progress writes go through `wipSlotTx` — since build 99 through
`claimedMetadataTx`, which the photo-hash index uses too (the tab claim checked
inside the transaction) — and fault mode fails that as well; the invariant
`marks-shape-unknown` flags a marked photo that doesn't record the shape its
marks were placed for (`ref.marksFor`). Since build 99 one relaunch in five
(when the unit in progress lives in the main slot) finishes AFTER the 20 s
timeout, with a new unit typed while its reads are pending: the form in use
must stay (`late-launch-replaced-form`) and the stored unit must come back as a
recovered draft or stay in a slot (`late-launch-lost-unit`). A simulated relaunch
forgets this session's memory of deletes / re-saves and the store stamp
(`resetTombstoneMemory()`), as a real one does: build 95's harness kept them, and
passed while a real relaunch brought a deleted unit back. In fault mode only a
**silent** loss is a violation — a loss that came with a warning is recorded as
info. Only a STORAGE warning counts (build 99: any warning did, so "Enter
equipment name first" or "Valve marks cleared" turned a silent loss into
info); those warnings go into the trace. A unit or form that changed across a relaunch is reported field by field,
from the first differing character (build 99: the whole before/after ran past
the 700-character detail and cut the difference off).

Backup mode (build 101, `BACKUP=1` / `"backup":true`): after each sequence and
after its relaunch, with faults off, one clean pass must leave SharePoint holding
every stored photo the list or the form refers to, byte for byte, in the folder it
belongs in now (`backup-missing-photo`, `backup-photo-differs` — the detail names
where the stand-in has it instead), each facility/day unit file listing exactly
that day's saved units (`backup-missing-unit-file`, `backup-unit-file-mismatch`),
no file of a day that emptied still listing units (`backup-stale-unit-file`), the
unit in progress in its own file in today's folder (`backup-form-missing`), and every day file
exactly what the device would write now (`backup-day-file-missing` /
`-stale` — compared with the index's byte-order mark kept). At EVERY step the
device's records may claim only what the stand-in stored (`backup-record-untrue`:
each confirmed photo at its recorded folder with those bytes, each confirmed day
file a version stored there). Each worker's line says how much was compared
(`backup compared {photos, unitFiles, emptied, inProgress}`) — a run that compares
nothing proves nothing. Eight bugs planted in the client were each caught (a
missed rewrite of an emptied day only at 30 % faults — the suite's T170 / T173
cover it directly). Backup mode adds two actions: `yesterday` (a saved unit moves
to the day before — day folders that empty out) and `refacility` (the facility
on screen changes, blank included). While the computer running the fuzzer is
offline the backup check is skipped with an info line — the app rightly holds
everything back, and a Wi-Fi drop once looked like a backup bug. The export
oracle's rule for the unit open for edit is the app's: it goes out in place of
its saved copy when that copy passes the filters — a unit from another day stays
out of this day's export (multi-day data showed the old rule was wrong). And
the relaunch oracle's "form worth keeping" is the app's `wipHasContent`: a name
that is only the equipment type (filled in from the type) is not a unit.

The driver runs each seed on its own (build 99): a page that crashes or hangs
is reported as `worker-crash` for that seed and the next seed gets a fresh
browser — one lost page used to hang the driver and lose every worker's
results. The output file is rewritten as each worker finishes, and each
worker's line shows the page's peak JS heap.
