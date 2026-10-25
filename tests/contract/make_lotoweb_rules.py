#!/usr/bin/env python3
"""The field app's contract with loto-web, written by loto-web's own functions.

The field app decides on the iPad what loto-web will decide in the office:
which row is a drive, a DC bus or a drive's feeder, whether a feeder names a
drive, what each unit's Device ID is, which transformer role a Location says,
and whether a drive's feeder is identified. Both sides implement those rules,
in JS and in Python, and they drifted apart in every build 122 review. This
script asks loto-web's live code for its answer on each case below and writes
them to lotoweb-rules.json; the app's suite (T290) asserts the app agrees.

Run it whenever loto-web's rules change, then the suite:
    LOTO_WEB=../loto-web python3 tests/contract/make_lotoweb_rules.py
(LOTO_WEB defaults to the loto-web folder beside this repo's folder.)
It only reads loto-web; it writes nothing there.
"""
import json
import os
import sys
from types import SimpleNamespace as NS

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
LOTO_WEB = os.path.abspath(os.environ.get("LOTO_WEB") or os.path.join(os.path.dirname(REPO), "loto-web"))
sys.path.insert(0, LOTO_WEB)

from app.services.procedure_generator import ProcedureGenerator as PG  # noqa: E402
from app.services import drive_isolation as di  # noqa: E402
from app.services import transformer_survey as ts  # noqa: E402
from app.services.unit_ids import unit_ids  # noqa: E402
from app.services import label_wait as lw  # noqa: E402
from app.services import drain_location as dl  # noqa: E402


def row(es="Electrical 480V", dev="Breaker", did="", qty=1, loc=""):
    return {"energySource": es, "deviceType": dev, "deviceId": did, "quantity": qty, "location": loc}


def sd(r):
    """A row as loto-web's generator sees it."""
    return NS(source=r["energySource"], device=r["deviceType"], device_id=r["deviceId"], location=r["location"])


FEEDER_ROWS = [
    row(loc="Feeder: MCC-2A bkr 14 (VFD-1)"),
    row(loc="feeder MCC-2A"),
    row(loc="  Feeder: MCC-2A bkr 14"),
    row(loc="Feeders panel"),
    row(loc="MCC-2A bkr 14 (VFD-1)"),
    row(dev="Feeder Breaker", loc="MCC-2A bkr 15 (VFD-2)"),
    row(loc="Upstream MCC-2A bkr 15 (VFD-2)"),
    row(dev="Disconnect", loc="upstream disconnect at roof"),
    row(dev="Switch", loc="Upstream switch"),
    row(loc="Panel LP-2 bkr 14 (feeder to AHU-3)"),
    row(dev="VFD", loc="Feeder end of AHU-3"),
    row(dev="VFD Bypass", loc="Feeder side"),
    row(es="Stored Electrical Energy", dev="Capacitor", loc="Feeder side of the VFD-1 DC bus"),
    row(es="Stored Electrical Energy", dev="Capacitor", loc="Feeder side cap bank"),
    row(es="Natural Gas", dev="Ball Valve", loc="Feeder line valve"),
    row(dev="Breaker", loc="Secondary Main: MDP-2 bkr 1"),
]

DRIVE_DEVICES = ["VFD", "vfd", "VFD Bypass", "VFD/Bypass", "Variable Frequency Drive", "Drive", "Breaker",
                 "Disconnect", "Soft Starter", ""]

DC_BUS_ROWS = [
    row(es="Stored Electrical Energy", dev="Capacitor", loc="VFD DC Bus"),
    row(es="Stored Electrical Energy", dev="Capacitor", loc="At Capacitor Bank"),
    row(es="Stored Electrical Energy", dev="Capacitor", loc="Inverter DC Bus"),
    row(es="Capacitor", dev="Capacitor", loc="variable frequency drive bus"),
    row(es="Electrical 480V", dev="Breaker", loc="VFD DC Bus"),
]

NAMES_TAG = [
    ("VFD-1", "Feeder: MCC-2A bkr 14 (VFD-1)"),
    ("vfd-1", "Feeder: MCC-2A bkr 14 (VFD-1)"),
    ("VFD-1", "Feeder: MCC-2A bkr 14 (VFD-10)"),
    ("VFD-1", "Feeder: MCC-2A bkr 14 (VFD-1, VFD-2)"),
    ("VFD-2", "Feeder: MCC-2A bkr 14 (VFD-1, VFD-2)"),
    ("26", "Feeder: MCC-2A bkr 26 (VFD-1)"),
    ("VFD-1", "Feeder: MCC-2A (VFD-1) bkr 14"),
    ("VFD-1", "Feeder: MCC-2A bkr 14 VFD-1"),
    ("VFD-1", "Feeder: MCC-2A (north) bkr 14 (VFD-1)"),
    ("VFD-1 A supply", "Feeder: MCC-2A bkr 16 (VFD-1 A supply)"),
    ("A", "Feeder: MCC-2A bkr 16 (VFD-1 A supply)"),
    ("", "Feeder: MCC-2A bkr 14 (VFD-1)"),
]

UNIT_IDS = [("VFD-1", 1), ("VFD-1", 2), ("VFD-1;", 2), ("VFD-1; ", 2), ("; VFD-2", 2), ("VFD-1; VFD-2", 2),
            ("VFD-1; VFD-2", 3), ("", 2), ("1, 3, 5", 1), ("VFD-1;A", 1)]

ROLES = ["Secondary Main: MDP-2 bkr 1", "secondary main : MDP-2", "Secondary Main MDP-2", "Alternate Source (UPS output): UPS-1",
         "Alternate Source (ups output): UPS-1", "Alternate Source (ATS) ATS-1", "Alternate Source (PV or battery): PV-1",
         "MDP-1 bkr 12", "Feeder: MCC-2A bkr 14 (VFD-1)"]

# The label discharge wait (build 121): which rows take it (label_wait.asked,
# the app's sourceTakesLabelWait on a unit type that asks), and columns 18 / 19
# as the app writes them (its stored entries -> its cell text -> loto-web's parse).
LABEL_ASKED = [("Electrical 480V", "VFD", False), ("Electrical 480V", "vfd", False), ("Electrical 480V", "VFD Bypass", False),
               ("Electrical 480V", "Breaker", False), ("Stored Electrical Energy", "Capacitor", False),
               ("Stored Electrical Energy", "", False), ("Electrical 480V", "VFD", True), ("Battery 24V DC", "VFD", False),
               ("Kinetic", "VFD", False)]
WAIT_CELLS = [  # (app's stored labelWait, quantity, the text the app writes)
    ([{"minutes": 20}, {"noLabel": True}], 2, "20; No label"),
    ([{"minutes": 15}], 1, "15"),
    ([None, {"minutes": 10}], 2, "; 10"),
    ([{"noLabel": True}], 1, "No label"),
    ([{"minutes": 1}], 1, "1"),
    ([{"minutes": 240}], 1, "240"),
    ([], 2, ""),
]
VOLT_CELLS = [  # (app's stored dcBusV, quantity, the text the app writes)
    ([680, None], 2, "680"), ([None, 650], 2, "; 650"), ([12], 1, "12"), ([1500], 1, "1500"), ([280, 550], 2, "280; 550"), ([], 1, ""),
]

# Tier 1 (drive_isolation.feeders_cover_drives, loto-web's xhigh review 2026-10-24):
# feeder Locations and one tag per drive unit ('' untagged).
COVER = [
    (["Feeder: MCC bkr 3 (VFD-1)", "Feeder: MCC bkr 4 (VFD-2)"], ["VFD-1", "VFD-2"]),
    (["Feeder: MCC bkr 3 (VFD-1, VFD-2)"], ["VFD-1", "VFD-2"]),
    (["Feeder: MCC bkr 3"], ["VFD-1", "VFD-2"]),
    (["Feeder: MCC bkr 3"], ["", ""]),
    (["Feeder: MCC bkr 3", "Feeder: MCC bkr 4"], ["", ""]),
    (["Feeder: MCC bkr 3 (VFD-1)"], ["VFD-1", "VFD-1"]),
    (["Feeder: MCC bkr 3 (VFD-1)", "Feeder: MCC bkr 4 (VFD-1)"], ["VFD-1", "VFD-1"]),
    (["Feeder: MCC bkr 3 (VFD-1)"], ["VFD-1", ""]),
    (["Feeder: MCC bkr 3 (VFD-1)"], ["vfd-1"]),
    ([], ["VFD-1"]),
    (["Feeder: MCC bkr 3"], []),
]
# drain_location.medium_kind: which energy sources the release question asks on.
MEDIA = ["Fuel Oil In", "Fuel Oil Out", "Diesel Fuel", "FO Supply", "Chemical In", "Chem feed", "Geothermal Water In",
         "Natural Gas", "Propane", "LP Gas", "Vacuum Air In", "Vacuum Air Out", "Vacuum Exhaust", "Vacuum Discharge",
         "Vacuum Air In/Out", "Refrigerant", "HHW In", "Compressed Air In", "Electrical 480V", "",
         # loto-web's is_vacuum_exhaust (2026-10-25): an exhaust word anywhere, never "In/Out"
         "Vacuum Air Outlet", "Vacuum Outlet", "Vacuum Pump Exhaust", "Exhaust - Vacuum", "vacuum air out",
         "Medical Vacuum Discharge Line", "Vacuum In / Out", "Vacuum Air Outdoor Unit", "Vacuum Air Inlet"]

UNITS = {
    "two tagged drives, one feeder each": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-2"),
                                           row(loc="Feeder: MCC-2A bkr 14 (VFD-1)"), row(loc="Feeder: MCC-2A bkr 15 (VFD-2)")],
    "one feeder for two drives": [row(dev="VFD", did="VFD-1; VFD-2", qty=2), row(loc="Feeder: MCC-2A bkr 14 (VFD-1, VFD-2)")],
    "a tag typed differently, no other feeder": [row(dev="VFD", did="VFD1"), row(loc="Feeder: MCC-2A bkr 14 (VFD-1)")],
    "a tag typed differently beside a named one": [row(dev="VFD", did="VFD-9"), row(loc="Feeder: MCC-1 bkr 1 (VFD-9)"),
                                                   row(dev="VFD", did="VFD1"), row(loc="Feeder: MCC-2A bkr 14 (VFD-1)")],
    "an upstream breaker row": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-2"),
                                row(loc="Feeder: MCC-2A bkr 14 (VFD-1)"), row(loc="Upstream MCC-2A bkr 15 (VFD-2)")],
    "a Feeder Breaker device": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-2"),
                                row(loc="Feeder: MCC-2A bkr 14 (VFD-1)"), row(dev="Feeder Breaker", loc="MCC-2A bkr 15 (VFD-2)")],
    "a custom drive device": [row(dev="VFD Bypass", did="VFD-3"), row(loc="Feeder: MCC-4 bkr 2 (VFD-3)")],
    "a custom drive device, no feeder": [row(dev="VFD Bypass", did="VFD-3")],
    "a drive Located Feeder end": [row(dev="VFD", did="VFD-3", loc="Feeder end of AHU-3"), row(loc="Feeder: MCC-4 bkr 2 (VFD-3)")],
    "a half-recorded Qty-2 row": [row(dev="VFD", did="VFD-9"), row(loc="Feeder: MCC-1 bkr 1 (VFD-9)"),
                                  row(dev="VFD", did="VFD-1;", qty=2), row(loc="Feeder: MCC-2A bkr 14 (VFD-1)")],
    "one tag on a Qty-2 row": [row(dev="VFD", did="VFD-1", qty=2), row(loc="Feeder: MCC-2A bkr 14 (VFD-1)")],
    "untagged drives, one feeder each": [row(dev="VFD", qty=2), row(loc="Feeder: MCC-2A bkr 14 (VFD-1)"),
                                         row(loc="Feeder: MCC-2A bkr 15 (VFD-2)")],
    "an untagged drive beside a named feeder": [row(dev="VFD", did="VFD-1"), row(loc="Feeder: MCC-2A bkr 14 (VFD-1)"),
                                                row(dev="VFD"), row(loc="Feeder: MCC-2A bkr 15 (VFD-5)")],
    "a feeder naming a tag in its middle parentheses": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-2"),
                                                        row(loc="Feeder: MCC-2A (VFD-1) bkr 14"), row(loc="Feeder: MCC-2A bkr 15 (VFD-2)")],
    "no feeder at all": [row(dev="VFD", did="VFD-1")],
    "one unnamed feeder for two drives": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-2"), row(loc="Feeder: MCC bkr 3")],
    "two unnamed feeders for two drives": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-2"),
                                           row(loc="Feeder: MCC bkr 3"), row(loc="Feeder: MCC bkr 4")],
    "one untagged Qty-2 row, one unnamed feeder": [row(dev="VFD", qty=2), row(loc="Feeder: MCC bkr 3")],
    "one untagged Qty-2 row, two unnamed feeders": [row(dev="VFD", qty=2), row(loc="Feeder: MCC bkr 3"), row(loc="Feeder: MCC bkr 4")],
    "duplicate tags, one named feeder": [row(dev="VFD", did="VFD-1"), row(dev="VFD", did="VFD-1"), row(loc="Feeder: MCC bkr 3 (VFD-1)")],
}


def unit_answers(rows):
    """For each drive unit, whether loto-web identifies its feeder, as its
    generator does (_drive_feeder_ids_for): feeders_for, then a feeder naming no
    drive kept only when the unit is Tier 1 (feeders_cover_drives)."""
    sds = [sd(r) for r in rows]
    feeders = [("E-%d" % (i + 1), r["location"]) for i, (r, s) in enumerate(zip(rows, sds)) if PG._is_drive_feeder(s)]
    unit_tags = []
    for r, s in zip(rows, sds):
        if PG._is_vfd_device(s):
            unit_tags += [t or "" for t in unit_ids(r["deviceId"], r["quantity"])]
    tier1 = di.feeders_cover_drives([loc for _fid, loc in feeders], unit_tags)
    out = []
    for i, (r, s) in enumerate(zip(rows, sds)):
        if not PG._is_vfd_device(s):
            continue
        for k, t in enumerate(unit_ids(r["deviceId"], r["quantity"])):
            ids = di.feeders_for(t or "", feeders, unit_tags)
            if ids and not any(di.names_tag(t or "", loc) for _fid, loc in feeders) and not tier1:
                ids = []
            out.append({"row": i, "unit": k, "tag": t or "", "identified": bool(ids)})
    return out


def main():
    data = {
        "_about": "Written by tests/contract/make_lotoweb_rules.py from loto-web's own functions; asserted by the app's T290.",
        "lotoWeb": LOTO_WEB,
        "feeder": [dict(r, isFeeder=bool(PG._is_drive_feeder(sd(r)))) for r in FEEDER_ROWS],
        "drive": [{"deviceType": d, "isDrive": bool(PG._is_vfd_device(NS(device=d)))} for d in DRIVE_DEVICES],
        "dcBus": [dict(r, isDcBus=bool(PG._is_vfd_dc_bus(sd(r)))) for r in DC_BUS_ROWS],
        "namesTag": [{"tag": t, "location": l, "names": bool(di.names_tag(t, l))} for t, l in NAMES_TAG],
        "unitIds": [{"deviceId": d, "quantity": q, "units": [u or "" for u in unit_ids(d, q)]} for d, q in UNIT_IDS],
        "role": [{"location": l, "role": ts.role_of_location(l)[0] or "", "kind": ts.role_of_location(l)[1] or ""} for l in ROLES],
        "units": [{"name": n, "rows": rows, "drives": unit_answers(rows)} for n, rows in UNITS.items()],
        "cover": [{"feeders": f, "driveTags": t, "covers": bool(di.feeders_cover_drives(f, t))} for f, t in COVER],
        "mediumKind": [{"energySource": e, "kind": dl.medium_kind(e) or ""} for e in MEDIA],
        "labelAsked": [{"energySource": e, "deviceType": d, "linked": k, "asked": bool(lw.asked(e, d, k))} for e, d, k in LABEL_ASKED],
        "waitCells": [{"labelWait": a, "quantity": q, "text": t, "parsed": lw.parse_wait_cell(t, q)} for a, q, t in WAIT_CELLS],
        "voltCells": [{"dcBusV": a, "quantity": q, "text": t, "parsed": lw.parse_volts_cell(t, q)} for a, q, t in VOLT_CELLS],
    }
    out = os.path.join(HERE, "lotoweb-rules.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("wrote", out, "-", sum(len(v) for k, v in data.items() if isinstance(v, list)), "cases")


if __name__ == "__main__":
    main()
