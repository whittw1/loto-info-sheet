# Execution-based review kit (build 94, 2026-09-27; updated for builds 95 and 96)

Everything here RUNS the app instead of reading it — the method of the
2026-09-27 review (ARCHITECTURE.md §6 "Build 94"). Nothing is part of the
shipped bundle. Every script refuses real data: fresh headless-Chrome profiles,
throwaway Simulator builds and installs, and the harnesses' own guards (web:
localhost only and an empty store; in the app: the iOS Simulator only, on an
empty install).

The web runs need the app served at http://localhost:8741 (preview
`loto-testflight`). Google Chrome, Node 22+ (built-in WebSocket) and Python 3;
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
| A build 94 tab still open when a newer build reaches the web: it must pause, its saves must not reach the store, a later tab sees what the new tab saved (build 96). Scratch site on its own port with the production no-store headers and the real service worker; build 94 comes from git (`B94=<commit>` to override) | `node b94_compat.mjs` (`SITE_PORT` / `PORT` to move it) |

Oracles worth knowing: the harness compares every export with its OWN reading
of the contract (`ownMarks`, the sheet's columns), not the app's helpers, so a
bug in a helper can't hide on both sides. Build 95 changed the marks contract: more marks
than devices ship none, and neither do marks placed before a source became an
In/Out pair (`ref.marksFor`); the invariant `marks-order-unknown` flags any
path that leaves such marks stored. Fault mode also fails the entry-list write
itself (`writeEntryListMerged`, build 95's compare-and-set save — it no longer
goes through `saveMetadataMany`), so the localStorage fallback path stays
covered — and since build 96 its COMMIT fails too (the transaction is aborted
after every put was issued), which runs the save's retry. A simulated relaunch
forgets this session's memory of deletes / re-saves and the store stamp
(`resetTombstoneMemory()`), as a real one does: build 95's harness kept them, and
passed while a real relaunch brought a deleted unit back. In fault mode only a
**silent** loss is a violation — a loss that came with a warning is recorded as
info.
