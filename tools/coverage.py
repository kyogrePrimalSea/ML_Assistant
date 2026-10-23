#!/usr/bin/env python3
"""E01 coverage report: inventory vs extraction records vs verification entries.

Prints per library and overall: inventory count, extraction count, verification
status counts, overrides count, items with warnings. Also checks that each
record's library_version matches requirements.txt and that overrides_applied
files exist. Exits non-zero if any inventory item lacks an extraction record or
a verification entry (or a record has the wrong pinned version).
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
INV = ROOT / "content" / "inventory"
EXT = ROOT / "content" / "extraction"


def pins():
    out = {}
    for line in (ROOT / "requirements.txt").read_text().splitlines():
        m = re.match(r"^([A-Za-z0-9_.-]+)==(\S+)", line.strip())
        if m:
            out[m.group(1).lower()] = m.group(2)
    return out


def main() -> int:
    inv = []
    for name in ("catalogue.yaml", "supporting.yaml"):
        inv += yaml.safe_load((INV / name).read_text())["items"]
    pinned = pins()
    records = {}
    for p in EXT.glob("*/*.json"):
        if p.parent.name == "verification":
            continue
        r = json.loads(p.read_text())
        records[r["id"]] = r
    ver = {}
    for p in (EXT / "verification").glob("*.json"):
        for e in json.loads(p.read_text()):
            ver[e["id"]] = e

    problems = []
    ids = [i["id"] for i in inv]
    for d in {x for x in ids if ids.count(x) > 1}:
        problems.append(f"duplicate inventory id {d}")
    rows = defaultdict(lambda: Counter())
    for it in inv:
        lib = it["library"]
        c = rows[lib]
        c["inventory"] += 1
        r = records.get(it["id"])
        v = ver.get(it["id"])
        if r is None:
            problems.append(f"no extraction record: {it['id']}")
        else:
            c["extraction"] += 1
            if r["warnings"]:
                c["warnings"] += 1
            if r["overrides_applied"]:
                c["overrides"] += 1
            want = pinned.get(lib.lower())
            if r["library_version"] != want:
                problems.append(f"version {r['library_version']} != pinned {want}: {it['id']}")
        if v is None:
            problems.append(f"no verification entry: {it['id']}")
        else:
            c["v:" + v["status"]] += 1
    ov_files = len(list((EXT / "overrides").glob("*.yaml")))
    statuses = sorted({k for c in rows.values() for k in c if k.startswith("v:")})
    head = ["library", "inventory", "extraction"] + [s[2:] for s in statuses] + ["overrides", "warnings"]
    print("\t".join(head))
    tot = Counter()
    for lib in sorted(rows):
        c = rows[lib]
        tot.update(c)
        print("\t".join([lib] + [str(c[k]) for k in ["inventory", "extraction"] + statuses + ["overrides", "warnings"]]))
    print("\t".join(["TOTAL"] + [str(tot[k]) for k in ["inventory", "extraction"] + statuses + ["overrides", "warnings"]]))
    print(f"override files: {ov_files}")
    stray = set(records) - set(ids)
    for s in sorted(stray):
        problems.append(f"extraction record without inventory item: {s}")
    for s in sorted(set(ver) - set(ids)):
        problems.append(f"verification entry without inventory item: {s}")
    for p in problems:
        print("PROBLEM:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
