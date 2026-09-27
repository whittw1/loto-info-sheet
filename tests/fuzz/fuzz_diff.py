#!/usr/bin/env python3
"""Differential check (review method 3): collector export → loto-web import.

For every export ZIP the fuzzer produced: build a throwaway loto-web
inventory from the ZIP's own entries.json (one Equipment row per unit, dated
by its savedAt), import the ZIP's Information Sheet(s) with loto-web's REAL
_parse_info_sheet, and compare every imported source with entries.json —
energy source, device, device ID, quantity, location, photo, detail,
verification, Normally Closed, valve marks. Then import the same sheets a
second time: a re-import of unchanged data must change nothing.

Read-only for loto-web's code; its database is a temp dir.
"""
import glob
import json
import os
import re
import sys
import tempfile
import zipfile
from collections import Counter, defaultdict
from datetime import datetime

# loto-web checkout: $LOTO_WEB, else a sibling of this repo
LW = os.environ.get('LOTO_WEB') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'loto-web'))
sys.path.insert(0, LW)
os.environ['LOTO_DATA_DIR'] = tempfile.mkdtemp(prefix='fuzzdiff_')
os.environ.setdefault('AUTH_ENABLED', 'false')
os.chdir(LW)
import logging  # noqa: E402
logging.disable(logging.WARNING)
from app import config  # noqa: E402
config.SHAREPOINT_ENABLED = False
from app.database import SessionLocal, init_db  # noqa: E402
init_db()
from app.models import Equipment, EnergySource, Hospital  # noqa: E402
from app.routers import import_data as imp  # noqa: E402
from app.services.infosheet_parser import _norm_name  # noqa: E402

ZDIR = sys.argv[1]
issues = defaultdict(list)          # kind -> examples
counts = Counter()


def local_date(iso):
    try:
        return datetime.fromisoformat(iso.replace('Z', '+00:00')).astimezone().date()
    except Exception:
        return None


def norm(v):
    return (v or '').strip() if isinstance(v, str) else ('' if v is None else str(v))


def snap(db, eq_ids):
    out = {}
    for s in db.query(EnergySource).filter(EnergySource.equipment_id.in_(eq_ids)).order_by(EnergySource.equipment_id, EnergySource.sort_order):
        out.setdefault(s.equipment_id, []).append((s.source_type, s.device, s.device_id, s.device_qty, s.location, s.photo_ref,
                                                   s.photo_detail, s.verification, bool(s.normally_closed), json.dumps(s.photo_marks)))
    return out


def main():
    zips = sorted(glob.glob(os.path.join(ZDIR, '*.zip')))
    db = SessionLocal()
    for zi, zp in enumerate(zips):
        z = zipfile.ZipFile(zp)
        ej = json.loads(z.read('entries.json'))
        sheets = sorted(n for n in z.namelist() if re.match(r'info_sheets/Information_Sheet_.*\.xlsx$', n))
        h = Hospital(key=f'Fz{zi}', hospital_name=f'Fuzz {zi}', system_name='T')
        db.add(h); db.commit()
        emap, by_id = {}, {}
        m0 = re.search(r'(\d{6})', os.path.basename(sheets[0])) if sheets else None
        sheet_day = datetime.strptime(m0.group(1), '%m%d%y').date() if m0 else None
        for e in ej['entries']:
            if not e.get('savedAt'):
                e['_day'] = sheet_day          # the unsaved open form: the office dates it by the sheet
        for i, e in enumerate(ej['entries']):
            eq = Equipment(loto_id=f'FZ{zi}-LOTO-{i:03d}', name=norm(e.get('equipName')) or f'(unnamed {i})',
                           equipment_type=e.get('equipType') or None, building=e.get('equipBuilding') or '',
                           room=e.get('equipRoom') or '', hospital_id=h.id, assessment_date=e.get('_day') or local_date(e.get('savedAt') or ''))
            db.add(eq); db.commit()
            emap[eq.loto_id] = eq
            by_id[str(e['id'])] = (e, eq)
        warns_all = []
        for sp in sheets:
            m = re.search(r'(\d{6})', os.path.basename(sp))
            sd = datetime.strptime(m.group(1), '%m%d%y').date() if m else None
            try:
                _, _, warns = imp._parse_info_sheet(db, z.read(sp), emap, sd)
            except Exception as ex:
                issues['import-exception'].append(f'{os.path.basename(zp)} {sp}: {type(ex).__name__}: {ex}')
                continue
            db.commit(); warns_all += warns
        # units the importer cannot tell apart by design: same name AND building AND room (and date)
        key = lambda e: (_norm_name(e.get('equipName') or ''), norm(e.get('equipBuilding')).lower(), norm(e.get('equipRoom')).lower(), e.get('_day') or local_date(e.get('savedAt') or ''))
        dup_keys = {k for k, n in Counter(key(e) for e in ej['entries']).items() if n > 1}
        for e, eq in by_id.values():
            counts['units'] += 1
            if key(e) in dup_keys:
                counts['ambiguous-by-design'] += 1
                continue
            got = db.query(EnergySource).filter_by(equipment_id=eq.id).order_by(EnergySource.sort_order).all()
            exp = (e.get('sources') or [])[:10]
            tag = f'{os.path.basename(zp)} "{e.get("equipName")}"'
            if len(got) != len(exp):
                others = [x for x in by_id.values() if x[1].id != eq.id and db.query(EnergySource).filter_by(equipment_id=x[1].id).count() > len(x[0].get('sources') or [])]
                issues['source-count'].append(f'{tag}: imported {len(got)} vs exported {len(exp)}' + (f' (another unit got extra: {others[0][0].get("equipName")!r})' if others else ''))
                continue
            for i, (s, g) in enumerate(zip(exp, got)):
                counts['sources'] += 1
                want = {
                    'source_type': norm(s.get('energySource')) or 'Unknown',
                    'device': norm(s.get('deviceType')),
                    'device_id': norm(s.get('deviceId')),
                    'qty': int(s.get('quantity') or 1),
                    'location': norm(s.get('location')),
                    'photo_ref': os.path.basename(s.get('photoFile') or ''),
                    'verification': norm(s.get('verification')),
                    'nc': s.get('valveState') == 'normally_closed',
                    'marks': [(round(m['x'], 3), round(m['y'], 3)) for m in (s.get('photoMarks') or [])],
                    'detail': norm(s.get('detail')),
                }
                have = {
                    'source_type': norm(g.source_type), 'device': norm(g.device), 'device_id': norm(g.device_id),
                    'qty': g.device_qty or 1, 'location': norm(g.location), 'photo_ref': norm(g.photo_ref),
                    'verification': norm(g.verification), 'nc': bool(g.normally_closed),
                    'marks': [(round(m['x'], 3), round(m['y'], 3)) for m in (g.photo_marks or [])],
                    'detail': norm(g.photo_detail),
                }
                for f in want:
                    if want[f] != have[f]:
                        issues[f'field:{f}'].append(f'{tag} src {i + 1}: exported {want[f]!r} → imported {have[f]!r}')
        # idempotence: re-import the same sheets
        before = snap(db, [eq.id for _, eq in by_id.values()])
        rewarns = []
        for sp in sheets:
            m = re.search(r'(\d{6})', os.path.basename(sp))
            sd = datetime.strptime(m.group(1), '%m%d%y').date() if m else None
            try:
                _, _, w = imp._parse_info_sheet(db, z.read(sp), emap, sd)
                db.commit(); rewarns += w
            except Exception as ex:
                issues['reimport-exception'].append(f'{os.path.basename(zp)}: {ex}')
        after = snap(db, [eq.id for _, eq in by_id.values()])
        if before != after:
            issues['reimport-changed-data'].append(os.path.basename(zp))
        for w in rewarns:
            if 'matches no source' in w or 'no Energy Source' in w:
                issues['reimport-warning'].append(f'{os.path.basename(zp)}: {w}')
        dup_names = {k[0] for k in dup_keys}
        for w in warns_all:
            counts['import-warnings'] += 1
            m = re.search(r"no match for '(.*?)' / ", w)
            if m and _norm_name(m.group(1)) in dup_names:
                counts['warning-ambiguous-by-design'] += 1
                continue
            issues['import-warning-unexplained'].append(f'{os.path.basename(zp)}: {w}')
    print(json.dumps({'zips': len(zips), 'counts': counts,
                      'issues': {k: {'n': len(v), 'examples': v[:6]} for k, v in issues.items()}}, indent=1, default=str))


if __name__ == '__main__':
    main()
