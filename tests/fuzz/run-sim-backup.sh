#!/bin/bash
# =============================================================================
# SharePoint live backup, end to end INSIDE the iOS app on a Simulator (build
# 101): the app's own native HTTP (CapacitorHttp) talking to the REAL api/
# functions, served by the local stand-in (backup_e2e_server.mjs — only
# Microsoft's sign-in, Graph and SharePoint are faked).
#
#   tests/fuzz/run-sim-backup.sh
#
# Same safety as run-sim-suite.sh: a throwaway copy of ios/ (its Info.plist
# alone may load http://localhost — the stand-in), a fresh install on the
# dedicated "LOTO Test iPad", and a harness that refuses anything but an empty
# Simulator install. The real project bundle is never touched.
# Exit code 0 = every check passed.
# =============================================================================
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
BID=com.hgsengineering.lotofieldcollector
SIMNAME="${SIMNAME:-LOTO Test iPad}"
SITE="${SITE_PORT:-8790}"
WORK="${WORK:-$(mktemp -d "${TMPDIR:-/tmp}/loto-simbackup.XXXXXX")}"
echo "work dir: $WORK"

node "$REPO/tests/fuzz/backup_e2e_server.mjs" "$SITE" > "$WORK/server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -s "http://localhost:$SITE/__store" >/dev/null && break; sleep 0.25; done

( cd "$REPO" && npm run sync >/dev/null )
rsync -a --delete --exclude xcuserdata --exclude build --exclude DerivedData "$REPO/ios/" "$WORK/ios/"
ln -sfn "$REPO/node_modules" "$WORK/node_modules"
PUB="$WORK/ios/App/App/public"
mkdir -p "$PUB/tests"
cp "$REPO/tests/sim-backup-harness.js" "$PUB/tests/"
python3 - "$PUB/index.html" "$WORK/ios/App/App/Info.plist" <<'EOF'
import sys, plistlib
p = sys.argv[1]; s = open(p).read()
assert s.count('</body>') == 1
open(p, 'w').write(s.replace('</body>', '<script src="tests/sim-backup-harness.js"></script>\n</body>'))
with open(sys.argv[2], 'rb') as f: pl = plistlib.load(f)
pl['NSAppTransportSecurity'] = {'NSAllowsLocalNetworking': True}      # the throwaway copy only: the stand-in is http://localhost
with open(sys.argv[2], 'wb') as f: plistlib.dump(pl, f)
EOF
if grep -q "sim-backup-harness" "$REPO/ios/App/App/public/index.html"; then echo "ABORT: harness found in the REAL project bundle"; exit 2; fi
if grep -q "NSAllowsLocalNetworking" "$REPO/ios/App/App/Info.plist"; then echo "ABORT: the REAL Info.plist allows local loads"; exit 2; fi

UDID=$(xcrun simctl list devices -j | python3 -c "
import json, sys
for rt, devs in json.load(sys.stdin)['devices'].items():
    for d in devs:
        if d['name'] == sys.argv[1] and d.get('isAvailable', True): print(d['udid']); sys.exit()
" "$SIMNAME")
[ -n "$UDID" ] || { echo "no simulator named $SIMNAME — run tests/run-sim-suite.sh once to create it"; exit 1; }
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
echo "simulator: $SIMNAME ($UDID)"

if ! xcodebuild -project "$WORK/ios/App/App.xcodeproj" -scheme App -configuration Debug \
     -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$WORK/dd" \
     CODE_SIGNING_ALLOWED=NO build > "$WORK/build.log" 2>&1; then
  tail -40 "$WORK/build.log"; echo "BUILD FAILED"; exit 1
fi
APP="$WORK/dd/Build/Products/Debug-iphonesimulator/App.app"
echo "built: $(grep -o 'v7.0 &middot; b[0-9]*' "$APP/public/index.html" | sed 's/&middot;/·/')"

xcrun simctl terminate "$UDID" "$BID" 2>/dev/null || true
xcrun simctl uninstall "$UDID" "$BID" 2>/dev/null || true
xcrun simctl install "$UDID" "$APP"
DATA=$(xcrun simctl get_app_container "$UDID" "$BID" data)
mkdir -p "$DATA/Documents"
curl -s "http://localhost:$SITE/__mint-pass?device=SIM-e2e" | python3 -c "
import json, sys
p = json.load(sys.stdin)
print(json.dumps({'host': 'http://localhost:$SITE', 'pass': p['pass'], 'user': p['user'], 'expires': p['expires']}))" > "$DATA/Documents/RUN_BACKUP_E2E"
xcrun simctl launch "$UDID" "$BID" >/dev/null
echo "backup check running in the app…"

R="$DATA/Documents/loto_backup_e2e.json"
for _ in $(seq 1 120); do [ -f "$R" ] && break; sleep 2; done
[ -f "$R" ] || { echo "NO RESULTS after 4 min"; exit 1; }
cp "$R" "$WORK/results.json"
curl -s "http://localhost:$SITE/__store" > "$WORK/store.json"
python3 - "$WORK/results.json" "$WORK/store.json" <<'EOF'
import json, sys
r = json.load(open(sys.argv[1])); st = json.load(open(sys.argv[2]))
fails = []
def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)
if 'error' in r: check(False, 'harness: ' + r['error'])
steps = {s['what']: s['value'] for s in r.get('steps', [])}
check(steps.get('native') is True and steps.get('CapacitorHttp') is True, 'running natively, with CapacitorHttp')
check(steps.get('Browser plugin') is True and steps.get('App plugin') is True, 'the sign-in plugins (Browser, App) are in the build')
g = steps.get('GET /api/upload') or {}
check(g.get('status') == 200 and g.get('via') == 'device', 'the API answers the device pass over native HTTP: ' + json.dumps(g))
u = r.get('unit') or {}
folder = 'LOTO Backups/Atlanta/' + str(u.get('day'))
ph = st.get(folder + '/photos/' + str(u.get('name')))
check(bool(ph) and ph['sha256'] == u.get('sha'), 'the photo is in SharePoint byte-identical to the capture: ' + folder + '/photos/' + str(u.get('name')))
check((folder + '/units_' + str(u.get('tag')) + '.json') in st and (folder + '/photos_' + str(u.get('tag')) + '.csv') in st, 'the day\'s unit file and photo index are there')
p = steps.get('pass') or {}
check(not p.get('error') and 'backed up' in str(p.get('badge')), 'the pass finished clean: ' + json.dumps(p))
b = steps.get('big upload') or {}
big = st.get(folder + '/export/sim-big.bin')
check(b.get('ok') and b.get('hashChecked') and bool(big) and big['size'] == b.get('size') and big['quickXorHash'] == b.get('quickXorHash'),
      '12 MB in 5 MiB pieces over native HTTP, hash matched: ' + json.dumps(b))
print('all checks passed' if not fails else str(len(fails)) + ' check(s) failed')
sys.exit(1 if fails else 0)
EOF
