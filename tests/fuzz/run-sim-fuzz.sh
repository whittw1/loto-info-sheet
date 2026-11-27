#!/bin/bash
# The fuzz harness INSIDE the real iOS app on the "LOTO Test iPad" Simulator.
# Throwaway copy of ios/ (never the project's own bundle); fresh install.
#   OPTS='{"seeds":[1,2],"steps":40}' WORK=<dir> run-sim-fuzz.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
BID=com.hgsengineering.lotofieldcollector
WORK="${WORK:?}"
( cd "$REPO" && npm run sync >/dev/null )
rsync -a --delete --exclude xcuserdata --exclude build --exclude DerivedData "$REPO/ios/" "$WORK/ios/"
ln -sfn "$(cd "$REPO/node_modules" && pwd -P)" "$WORK/node_modules"   # the real folder: SwiftPM loses its way through a link to a link (a worktree)
PUB="$WORK/ios/App/App/public"; mkdir -p "$PUB/tests"
cp "$REPO/tests/fuzz-harness.js" "$REPO/tests/sim-fuzz-harness.js" "$PUB/tests/"
python3 - "$PUB/index.html" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read(); assert s.count('</body>') == 1
open(p, 'w').write(s.replace('</body>', '<script src="tests/fuzz-harness.js"></script>\n<script src="tests/sim-fuzz-harness.js"></script>\n</body>'))
PY
if grep -q "sim-fuzz-harness" "$REPO/ios/App/App/public/index.html"; then echo "ABORT: harness in the REAL bundle"; exit 2; fi
UDID=$(xcrun simctl list devices -j | python3 -c "
import json, sys
for rt, devs in json.load(sys.stdin)['devices'].items():
    for d in devs:
        if d['name'] == 'LOTO Test iPad' and d.get('isAvailable', True): print(d['udid']); sys.exit()")
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
xcodebuild -project "$WORK/ios/App/App.xcodeproj" -scheme App -configuration Debug -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath "$WORK/dd" CODE_SIGNING_ALLOWED=NO build > "$WORK/build.log" 2>&1 || { tail -30 "$WORK/build.log"; echo BUILD FAILED; exit 1; }
APP="$WORK/dd/Build/Products/Debug-iphonesimulator/App.app"
xcrun simctl terminate "$UDID" "$BID" 2>/dev/null || true
xcrun simctl uninstall "$UDID" "$BID" 2>/dev/null || true
xcrun simctl install "$UDID" "$APP"
DATA=$(xcrun simctl get_app_container "$UDID" "$BID" data); mkdir -p "$DATA/Documents"
T="${OPTS:-}"; [ -n "$T" ] || T='{}'
python3 -c 'import json,sys; json.loads(sys.argv[1])' "$T" || { echo "OPTS is not valid JSON"; exit 2; }
printf '%s' "$T" > "$DATA/Documents/RUN_FUZZ"
xcrun simctl launch "$UDID" "$BID" >/dev/null
echo "fuzz running in the app ($UDID)…"
R="$DATA/Documents/loto_fuzz_results.json"
for _ in $(seq 1 720); do [ -f "$R" ] && break; sleep 5; done
[ -f "$R" ] || { echo "NO RESULTS after 60 min"; exit 1; }
cp "$R" "$WORK/fuzz_results.json"
python3 - "$R" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
if 'error' in d: print('ERROR', d['error'][:500]); sys.exit(1)
print('iOS Simulator fuzz:', d['actions'], 'actions,', d['secs'], 's,', len(d['violations']), 'violation kinds')
for v in d['violations']: print(' -', v['inv'], '×', v.get('count', 1), '::', v['detail'][:200])
PY
