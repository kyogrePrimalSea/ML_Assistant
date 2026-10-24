"""T011: derive relationships (spec 5.3) from content records.

Usage: derive_relationships.py [--content DIR]
Writes <content>/derived/relationships.json: [{source, target, type, via}].
Symmetric types (alternative_to, pairs_with) are emitted once, source < target.
Placement comes from content/taxonomy.yaml: "alternative to" means the same family (or group with pages).
"""
import argparse
import json
import sys
from pathlib import Path

import yaml

try:
    from tools.taxonomy import load_taxonomy, page_placement
except ImportError:  # run as `python tools/derive_relationships.py`
    from taxonomy import load_taxonomy, page_placement

ROOT = Path(__file__).resolve().parent.parent


def derive(content):
    content = Path(content)
    recs = [yaml.safe_load(p.read_text()) for p in sorted((content / "items").glob("**/*.yaml"))]
    # page -> (stage, family or group id), from the taxonomy: the single source of placement
    place = {pid: (stage, fam) for pid, (stage, fam, _) in page_placement(load_taxonomy(content / "taxonomy.yaml")).items()}

    out = set()
    kinds = {"required": "needs", "recommended": "recommended", "not_needed": "clashes"}
    for r in recs:
        src = r["id"]
        for p in r["slots"]["prep"]:
            typ = kinds[p["status"]]
            st = p["step"]
            if "page" in st:
                out.add((src, st["page"], typ, "prep"))
            else:
                for pid, pl in place.items():
                    if pl[1] == st["family"] and pid != src:
                        out.add((src, pid, typ, f"prep:{st['family']}"))
        for c in r["clashes"]:
            out.add((src, c, "clashes", "clashes"))
        for t in r["pairs_with"]:
            a, b = sorted((src, t))
            out.add((a, b, "pairs_with", "pairs_with"))
    by_place = {}
    for pid, pl in place.items():
        by_place.setdefault(pl, []).append(pid)
    for (_, fam), pids in by_place.items():
        pids = sorted(pids)
        for i, a in enumerate(pids):
            for b in pids[i + 1:]:
                out.add((a, b, "alternative_to", fam))
    return [{"source": s, "target": t, "type": ty, "via": v} for s, t, ty, v in sorted(out)]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--content", default=str(ROOT / "content"))
    args = ap.parse_args(argv)
    rels = derive(args.content)
    dest = Path(args.content) / "derived"
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "relationships.json").write_text(json.dumps(rels, indent=2) + "\n")
    print(f"wrote {len(rels)} relationships to {dest / 'relationships.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
