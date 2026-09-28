#!/bin/bash
# Upgrade chain b88 -> b90 -> (working tree) inside the real iOS app on a dedicated
# Simulator ("LOTO Upgrade iPad"): each build is INSTALLED OVER the previous
# one (the data container survives, exactly like a TestFlight update).
# Throwaway copies only — the project's ios/App/App/public is never touched.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-$(mktemp -d "${TMPDIR:-/tmp}/loto-upg.XXXXXX")}"; mkdir -p "$WORK"; echo "work dir: $WORK"
BID=com.hgsengineering.lotofieldcollector
SIMNAME="LOTO Upgrade iPad"

UDID=$(xcrun simctl list devices -j | python3 -c "
import json, sys
for rt, devs in json.load(sys.stdin)['devices'].items():
    for d in devs:
        if d['name'] == sys.argv[1] and d.get('isAvailable', True): print(d['udid']); sys.exit()" "$SIMNAME")
if [ -z "$UDID" ]; then
  UDID=$(xcrun simctl create "$SIMNAME" com.apple.CoreSimulator.SimDeviceType.iPad-Pro-11-inch-M4-8GB com.apple.CoreSimulator.SimRuntime.iOS-26-5)
  echo "created $SIMNAME $UDID"
fi
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null

# 1. One native build (current project), harness injected into a throwaway copy.
if [ ! -d "$WORK/dd/Build/Products/Debug-iphonesimulator/App.app" ]; then
  ( cd "$REPO" && npm run sync >/dev/null )
  rsync -a --delete --exclude xcuserdata --exclude build --exclude DerivedData "$REPO/ios/" "$WORK/ios/"
  ln -sfn "$REPO/node_modules" "$WORK/node_modules"
  xcodebuild -project "$WORK/ios/App/App.xcodeproj" -scheme App -configuration Debug -destination "platform=iOS Simulator,id=$UDID" \
    -derivedDataPath "$WORK/dd" CODE_SIGNING_ALLOWED=NO build > "$WORK/build.log" 2>&1 || { tail -30 "$WORK/build.log"; echo BUILD FAILED; exit 1; }
fi
BASE="$WORK/dd/Build/Products/Debug-iphonesimulator/App.app"

# 2. Per build: the same native app with THAT build's web files + the harness.
make_app() {   # $1 = git rev, $2 = out dir
  rm -rf "$2"; cp -R "$BASE" "$2"
  for f in index.html FingerLakes_Information_Sheet.html sw.js; do
    if [ "$1" = WORKTREE ]; then cp "$REPO/$f" "$2/public/$f"      # the build under test (uncommitted is fine)
    else ( cd "$REPO" && git show "$1:$f" ) > "$2/public/$f" 2>/dev/null || true; fi
  done
  mkdir -p "$2/public/tests"; cp "$HERE/upg-harness.js" "$2/public/tests/"
  python3 - "$2/public/index.html" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read(); assert s.count('</body>') == 1
open(p, 'w').write(s.replace('</body>', '<script src="tests/upg-harness.js"></script>\n</body>'))
PY
  grep -o 'v7.0 &middot; b[0-9]*' "$2/public/index.html" | head -1
}
if grep -q "upg-harness" "$REPO/ios/App/App/public/index.html"; then echo "ABORT: harness in the REAL bundle"; exit 2; fi

run_phase() {  # $1 = rev, $2 = phase, $3 = fresh(1/0)
  local APPDIR="$WORK/app_$2.app"
  echo "== $2 on $(make_app "$1" "$APPDIR")"
  xcrun simctl terminate "$UDID" "$BID" 2>/dev/null || true
  [ "$3" = 1 ] && xcrun simctl uninstall "$UDID" "$BID" 2>/dev/null || true
  xcrun simctl install "$UDID" "$APPDIR"
  local DATA; DATA=$(xcrun simctl get_app_container "$UDID" "$BID" data); mkdir -p "$DATA/Documents"
  rm -f "$DATA/Documents/upg_$2.json"
  [ -f "$WORK/upg_gen.json" ] && [ "$2" != gen ] && cp "$WORK/upg_gen.json" "$DATA/Documents/" || true
  [ -f "$WORK/upg_work.json" ] && [ "$2" = verify ] && cp "$WORK/upg_work.json" "$DATA/Documents/" || true
  printf '{"phase":"%s"}' "$2" > "$DATA/Documents/RUN_UPG"
  xcrun simctl launch "$UDID" "$BID" >/dev/null
  for _ in $(seq 1 240); do [ -f "$DATA/Documents/upg_$2.json" ] && break; sleep 2; done
  [ -f "$DATA/Documents/upg_$2.json" ] || { echo "NO RESULT for $2"; exit 1; }
  sleep 1; cp "$DATA/Documents/upg_$2.json" "$WORK/"
  xcrun simctl io "$UDID" screenshot "$WORK/screen_$2.png" >/dev/null 2>&1 || true
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('  ', 'ERROR ' + d['error'][:600] if 'error' in d else 'ok, build ' + str(d.get('build')))" "$WORK/upg_$2.json"
}
rm -f "$WORK"/upg_*.json
run_phase 39ffc44 gen 1      # build 88
run_phase 2ad0593 work 0     # build 90 (what the iPad runs today)
run_phase WORKTREE verify 0  # the build under test
