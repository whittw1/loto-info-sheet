#!/usr/bin/env python3
"""
Acceptance (c): run the startup integrity-scan / quarantine classifier against
a copy of the production store.

The live stores sit on the field iPad (device 5b91cd82) and Whitt's phone
(caaaf4b8); this Mac holds their most complete copies — the all-dates
FieldExport bundles from 2026-08-05 (photo bytes + entries.json exactly as the
devices resolved them). This script applies the SAME classification the app's
runPhotoKeyMigration() performs on first launch of the fixed build:

  SUSPECT  — byte-identical photo claimed by more than one entry (corrupted
             association: it can be the right photo for at most one of them)
  MISSING  — entry references a photo that has no bytes
  CLEAN    — photo claimed by exactly one entry

Read-only: sources are opened, hashed, and reported. Nothing is modified.
(On-device orphans — stored bytes no entry references — are only visible on
the devices themselves; the in-app quarantine covers them on first launch.)
"""
import hashlib
import json
import os
import sys
from collections import defaultdict

DATASETS = {
    "iPad_5b91cd82": "/Users/whittw/Desktop/Claude Apps/loto-web/Batch _Export_MultipleVAMCs_080526",
    "phone_caaaf4b8": "/Users/whittw/Desktop/Claude Apps/LOTO Information Sheet App/photo-recovery/snapshots/Whittphone_AllVAMCs_080526",
}
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "production-scan")


def entry_claims(entry):
    """Yield (slot, relative photo path) for every photo the entry claims."""
    pf = entry.get("photoFiles") or {}
    for slot in ("main", "dataplate", "ee"):
        if pf.get(slot):
            yield slot, pf[slot]
    for i, src in enumerate(entry.get("sources") or []):
        if src.get("photoFile"):
            yield f"source-{i+1}", src["photoFile"]
    for i, m in enumerate(pf.get("misc") or []):
        if m:
            yield f"misc-{i+1}", m


def scan(name, root):
    with open(os.path.join(root, "entries.json")) as f:
        data = json.load(f)
    entries = data["entries"]

    file_hash = {}
    for base, _dirs, files in os.walk(os.path.join(root, "photos")):
        for fn in files:
            if fn.startswith("."):
                continue
            p = os.path.join(base, fn)
            rel = os.path.relpath(p, root)
            with open(p, "rb") as fh:
                file_hash[rel] = hashlib.sha256(fh.read()).hexdigest()

    hash_claims = defaultdict(list)   # sha256 -> [(entry, slot, rel)]
    missing = []
    total_claims = 0
    for e in entries:
        for slot, rel in entry_claims(e):
            total_claims += 1
            h = file_hash.get(rel)
            if h is None:
                missing.append({"entryId": e.get("id"), "name": e.get("equipName"),
                                "building": e.get("equipBuilding"), "room": e.get("equipRoom"),
                                "slot": slot, "file": rel})
                continue
            hash_claims[h].append((e, slot, rel))

    suspects = []
    clean_claims = 0
    for h, claims in hash_claims.items():
        ids = {c[0].get("id") for c in claims}
        if len(ids) > 1:
            suspects.append({
                "sha256": h,
                "claimants": [{
                    "entryId": c[0].get("id"), "name": c[0].get("equipName"),
                    "building": c[0].get("equipBuilding"), "room": c[0].get("equipRoom"),
                    "slot": c[1], "file": c[2],
                } for c in claims],
            })
        else:
            clean_claims += len(claims)

    suspect_slots = sum(len(s["claimants"]) for s in suspects)
    suspect_entries = len({c["entryId"] for s in suspects for c in s["claimants"]})
    report = {
        "dataset": name,
        "source": root,
        "exportedAt": data.get("exported"),
        "deviceId": data.get("deviceId"),
        "entries": len(entries),
        "photoFilesInBundle": len(file_hash),
        "distinctImages": len(set(file_hash.values())),
        "photoClaims": total_claims,
        "cleanClaims": clean_claims,
        "suspectGroups": len(suspects),
        "suspectSlots": suspect_slots,
        "suspectEntries": suspect_entries,
        "missingRefs": len(missing),
        "suspects": sorted(suspects, key=lambda s: -len(s["claimants"])),
        "missing": missing,
    }
    return report


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    combined = []
    for name, root in DATASETS.items():
        if not os.path.isdir(root):
            print(f"!! dataset not found: {root}", file=sys.stderr)
            continue
        r = scan(name, root)
        combined.append(r)
        out = os.path.join(OUT_DIR, f"quarantine_report_{name}.json")
        with open(out, "w") as f:
            json.dump(r, f, indent=1)
        print(f"[{name}] {r['entries']} entries | {r['photoClaims']} photo claims | "
              f"{r['cleanClaims']} clean | {r['suspectGroups']} SUSPECT groups covering "
              f"{r['suspectSlots']} slots on {r['suspectEntries']} entries | "
              f"{r['missingRefs']} missing refs -> {out}")

    # Human-readable summary of the worst clusters
    lines = ["PRODUCTION STORE SCAN — quarantine classifier (read-only)", ""]
    for r in combined:
        lines.append(f"== {r['dataset']} — exported {r['exportedAt']} ==")
        lines.append(f"   {r['entries']} entries, {r['photoClaims']} photo claims, "
                     f"{r['distinctImages']} distinct images / {r['photoFilesInBundle']} files")
        lines.append(f"   SUSPECT: {r['suspectGroups']} shared-image groups → {r['suspectSlots']} slots "
                     f"on {r['suspectEntries']} entries;  MISSING: {r['missingRefs']}")
        for s in r["suspects"][:15]:
            names = ", ".join(f"{c['name']} [{c['slot']}] ({c['building']} {c['room']})".strip()
                              for c in s["claimants"][:8])
            more = "" if len(s["claimants"]) <= 8 else f" …+{len(s['claimants'])-8} more"
            lines.append(f"     • {len(s['claimants'])} claims: {names}{more}")
        if len(r["suspects"]) > 15:
            lines.append(f"     … and {len(r['suspects']) - 15} more groups")
        lines.append("")
    summary = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "SCAN_SUMMARY.txt"), "w") as f:
        f.write(summary)
    print()
    print(summary)


if __name__ == "__main__":
    main()
