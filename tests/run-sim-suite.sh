#!/bin/bash
# =============================================================================
# Run tests/photo-regression.js INSIDE the real iOS app on an iOS SIMULATOR —
# real WKWebView, real Capacitor Filesystem plugin (the store the iPad uses).
#
#   tests/run-sim-suite.sh                 # full suite (incl. 500-entry scale test)
#   SUITE_OPTS='{"skipScale":true}' tests/run-sim-suite.sh
#
# Safety:
#  • Never touches the project's ios/App/App/public (what Xcode ARCHIVES): the
#    harness is added to a throwaway copy of ios/ in a temp dir, built there.
#  • Simulator only — simctl cannot address a physical device, and the suite
#    itself refuses unless its container path is under CoreSimulator.
#  • The app is UNINSTALLED and reinstalled first: the suite runs on an empty
#    install (it refuses otherwise). Uses a dedicated simulator ("LOTO Test
#    iPad"), created on first use — never a simulator holding anything else.
# Exit code 0 = every test passed.
# =============================================================================
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BID=com.hgsengineering.lotofieldcollector
SIMNAME="${SIMNAME:-LOTO Test iPad}"
WORK="${WORK:-$(mktemp -d "${TMPDIR:-/tmp}/loto-simtest.XXXXXX")}"
echo "work dir: $WORK"

# 1. The web bundle Xcode would archive (same as `npm run sync`).
( cd "$REPO" && npm run sync >/dev/null )

# 2. Throwaway copy of the iOS project, with the suite + harness in its bundle.
rsync -a --delete --exclude xcuserdata --exclude build --exclude DerivedData "$REPO/ios/" "$WORK/ios/"
ln -sfn "$REPO/node_modules" "$WORK/node_modules"      # CapApp-SPM resolves ../../../node_modules
PUB="$WORK/ios/App/App/public"
mkdir -p "$PUB/tests"
cp "$REPO/tests/photo-regression.js" "$REPO/tests/sim-harness.js" "$PUB/tests/"
python3 - "$PUB/index.html" <<'EOF'
import sys
p = sys.argv[1]; s = open(p).read()
assert s.count('</body>') == 1
open(p, 'w').write(s.replace('</body>', '<script src="tests/photo-regression.js"></script>\n<script src="tests/sim-harness.js"></script>\n</body>'))
EOF
if grep -q "sim-harness" "$REPO/ios/App/App/public/index.html"; then echo "ABORT: harness found in the REAL project bundle"; exit 2; fi

# 3. The dedicated test simulator (created on first use: newest iOS runtime, an iPad).
UDID=$(xcrun simctl list devices -j | python3 -c "
import json, sys
name = sys.argv[1]
for rt, devs in json.load(sys.stdin)['devices'].items():
    for d in devs:
        if d['name'] == name and d.get('isAvailable', True): print(d['udid']); sys.exit()
" "$SIMNAME")
if [ -z "$UDID" ]; then
  read -r RUNTIME DEVTYPE < <(xcrun simctl list -j | python3 -c "
import json, sys
j = json.load(sys.stdin)
rts = [r for r in j['runtimes'] if r.get('isAvailable') and r['identifier'].startswith('com.apple.CoreSimulator.SimRuntime.iOS')]
rt = sorted(rts, key=lambda r: [int(x) for x in r['version'].split('.')])[-1]
ipads = [d for d in rt.get('supportedDeviceTypes', []) if 'iPad' in d['name']]
print(rt['identifier'], (ipads[0] if ipads else rt['supportedDeviceTypes'][0])['identifier'])
")
  UDID=$(xcrun simctl create "$SIMNAME" "$DEVTYPE" "$RUNTIME")
  echo "created simulator $SIMNAME ($UDID)"
fi
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
echo "simulator: $SIMNAME ($UDID)"

# 4. Build the copy.
if ! xcodebuild -project "$WORK/ios/App/App.xcodeproj" -scheme App -configuration Debug \
     -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$WORK/dd" \
     CODE_SIGNING_ALLOWED=NO build > "$WORK/build.log" 2>&1; then
  tail -40 "$WORK/build.log"; echo "BUILD FAILED"; exit 1
fi
APP="$WORK/dd/Build/Products/Debug-iphonesimulator/App.app"
echo "built: $(grep -o 'v7.0 &middot; b[0-9]*' "$APP/public/index.html" | sed 's/&middot;/·/')"

# 5. Fresh install, trigger, launch.
xcrun simctl terminate "$UDID" "$BID" 2>/dev/null || true
xcrun simctl uninstall "$UDID" "$BID" 2>/dev/null || true
xcrun simctl install "$UDID" "$APP"
DATA=$(xcrun simctl get_app_container "$UDID" "$BID" data)
mkdir -p "$DATA/Documents"
OPTS="${SUITE_OPTS:-}"; [ -n "$OPTS" ] || OPTS='{}'
printf '%s' "$OPTS" > "$DATA/Documents/RUN_PHOTO_SUITE"
xcrun simctl launch "$UDID" "$BID" >/dev/null
echo "suite running in the app…"

# 6. Wait for the results file, then report.
R="$DATA/Documents/loto_test_results.json"
for _ in $(seq 1 180); do [ -f "$R" ] && break; sleep 5; done
[ -f "$R" ] || { echo "NO RESULTS after 15 min"; exit 1; }
cp "$R" "$WORK/results.json"
python3 - "$R" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
if 'error' in d:
    print('SUITE ERROR:', d['error']); sys.exit(1)
print('%s: %d pass / %d fail in %ss' % (d.get('mode'), d['pass'], d['fail'], d.get('secs')))
for r in d['results']:
    if not r['pass']: print('FAIL', r['name'], '::', r['detail'])
sys.exit(1 if d['fail'] else 0)
EOF
