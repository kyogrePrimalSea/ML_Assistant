"""T042: scaffold draft records for taxonomy pages that have none yet.

    .venv/bin/python tools/scaffold_record.py <page-id> [...]
    .venv/bin/python tools/scaffold_record.py --stage <stage-id>

Writes content/items/<stage>/<page>.yaml with every derivable field filled and the writer's
fields set to the literal `TODO` (the validator fails on any remaining TODO), plus a
git-ignored sidecar <page>.facts.md holding the compact facts a writer needs. It never
overwrites an existing record.
"""
import argparse
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
TODO = "TODO"
SKIP_SETTINGS = {"verbose", "n_jobs", "random_state", "copy", "warm_start"}
SKIP_PARAMS = SKIP_SETTINGS | {"self", "X", "y", "args", "kwargs", "x", "y_true", "y_pred", "y_score"}
HP_PAGES = {"max_depth": "max-depth", "n_estimators": "n-estimators", "learning_rate": "learning-rate",
            "early_stopping_rounds": "early-stopping"}
TASKS = ["regression", "classification"]
TRACK_ORDER = ["standard", "time-series"]

# Hero skeletons (spec section 4); every field is a TODO the writer fills.
HERO_FIELDS = {
    "transformer": ["dataset", "columns", "changed"], "resampler": ["dataset", "classes", "before", "after"],
    "selector": ["dataset", "columns", "kept"], "splitter": ["rows", "folds", "ordered"],
    "model": ["dataset", "shape"], "hyperparameter": ["dataset", "sweep"], "tuning": ["dims", "trials"],
    "metric": ["dataset", "highlight"], "diagnostic": ["dataset", "chart"], "output": ["dataset", "plot"],
    "composer": ["boxes"],
}

# Candidate "what comes out" names per archetype (spec 5.1 table), in reading order.
COMING = {
    "model": (["predict", "predict_proba", "decision_function", "predict_log_proba", "score"],
              ["feature_importances_", "coef_", "intercept_", "classes_", "best_iteration", "n_iter_",
               "n_features_in_", "feature_names_in_"]),
    "transformer": (["transform", "fit_transform", "inverse_transform", "get_feature_names_out", "set_output"],
                    ["feature_names_in_", "n_features_in_", "categories_", "statistics_", "mean_", "scale_"]),
    "resampler": (["fit_resample"], ["sample_indices_", "sampling_strategy_"]),
    "selector": (["get_support", "transform", "get_feature_names_out", "inverse_transform"],
                 ["scores_", "pvalues_", "ranking_", "support_", "n_features_", "explained_variance_ratio_",
                  "components_"]),
    "splitter": (["split", "get_n_splits"], []),
    "tuning": (["fit", "predict", "trials_dataframe", "optimize"],
               ["best_params_", "best_score_", "best_estimator_", "cv_results_", "best_params", "best_value",
                "best_trial"]),
    "metric": ([], []),
    "diagnostic": (["from_estimator", "from_predictions", "plot"],
                   ["values", "base_values", "data", "figure_", "ax_"]),
    "output": ([], []),
    "composer": (["fit", "predict", "transform", "get_feature_names_out"],
                 ["named_steps", "steps", "transformers_", "named_transformers_", "feature_names_in_"]),
}
CLASSIFICATION_ONLY = {"predict_proba", "decision_function", "predict_log_proba", "classes_"}


def load_yaml(p):
    return yaml.safe_load(Path(p).read_text(encoding="utf-8"))


def pins(root):
    out = {}
    for line in (root / "requirements.txt").read_text().splitlines():
        m = re.match(r"^([A-Za-z0-9_.-]+)==(\S+)", line.strip())
        if m:
            out[m.group(1).lower()] = m.group(2)
    return out


def taxonomy_pages(tax):
    """page id -> (stage id, family-or-group id, taxonomy page entry)."""
    out = {}

    def walk(node, stage):
        for p in node.get("pages", []):
            out[p["id"]] = (stage, node["id"], p)
        for ch in node.get("children", []):
            walk(ch, stage)

    for s in tax["stages"]:
        walk(s, s["id"])
    return out


def first_line(text, limit=100):
    text = " ".join((text or "").split("\n\n")[0].split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def clean_default(v):
    return "" if v is None else str(v)


def settings(extractions):
    """(tier1, tier2, tier3) names from the targets' parameters, longest descriptions first."""
    seen, rows = set(), []
    for ex in extractions:
        for p in ex.get("parameters") or []:
            n = p["name"]
            if n in seen or n in SKIP_PARAMS or n.startswith("*"):
                continue
            seen.add(n)
            rows.append((len(p.get("description") or ""), len(rows), n))
    ranked = [n for _, _, n in sorted(rows, key=lambda r: (-r[0], r[1]))]
    t1, rest = ranked[:4], ranked[4:]
    ref = lambda names: [{"name": n, "page": HP_PAGES.get(n)} for n in names]
    return ref(t1), ref(rest[:4]), ref(rest[4:10])


def coming_items(archetype, extractions, targets):
    methods_pref, attrs_pref = COMING.get(archetype, ([], []))
    methods = {m["name"] for ex in extractions for m in ex.get("methods") or []}
    attrs = {a["name"] for ex in extractions for a in ex.get("attributes") or []}
    items = []
    for n in methods_pref:
        if n in methods:
            items.append((n, "method"))
    for n in attrs_pref:
        if n in attrs:
            items.append((n, "attribute"))
    if archetype == "model" and not any(k == "attribute" for _, k in items):
        items += [(a["name"], "attribute") for ex in extractions[:1] for a in (ex.get("attributes") or [])[:2]]
    if not items:
        items = [(targets[0].split(".")[-1], "return")]
    out = []
    for n, kind in items[:8]:
        task = "classification" if n in CLASSIFICATION_ONLY else None
        out.append({"name": n, "kind": kind, "task": task, "shape": TODO, "note": TODO})
    return out


def build_record(pid, stage, family, tpage, entries, tax, extractions, versions):
    goals = {g["id"]: g for g in tax["goals"]}
    for_goals = [goals[g] for g in tpage["for"]]
    tracks = [t for t in TRACK_ORDER if t in {g["track"] for g in for_goals}]
    tasks = {g["task"] for g in for_goals}
    task_types = [] if len(tpage["for"]) == len(goals) else [t for t in TASKS if t in tasks]
    archetype = entries[0]["archetype"]
    libs = list(dict.fromkeys(e["library"] for e in entries))
    names = list(dict.fromkeys(e["name"] for e in entries))
    targets = [e["id"] for e in entries]
    urls = list(dict.fromkeys(e["doc_url"] for e in entries if e.get("doc_url")))
    t1, t2, t3 = settings(extractions)
    hero = {"kind": archetype, **{k: TODO for k in HERO_FIELDS.get(archetype, [])}}
    if archetype == "model":
        qf = {"data_size": TODO}
        intuition = {"idea": TODO, "analogy": TODO, "animation": "none", "good_at": [TODO], "bad_at": [TODO],
                     "vs_siblings": [], "read_more": [TODO]}
    else:
        qf = {"facts": [{"label": TODO, "value": TODO}]}
        intuition = {"text": TODO}
    code = []
    for lib in libs:
        target = next(e["id"] for e in entries if e["library"] == lib)
        code.append({"library": lib, "target": target, "why_this_library": TODO,
                     "snippet": f"# {lib} {versions[lib]}\n{TODO}\n"})
    return {
        "id": pid, "plain_name": tpage["shown_as"], "code_name": " / ".join(names), "aliases": [TODO],
        "stage": stage, "family": family, "tracks": tracks, "archetype": archetype,
        "question_tags": [TODO], "targets": targets, "pairs_with": [], "clashes": [],
        "source_urls": urls, "library_versions": {lib: versions[lib] for lib in libs}, "reviewed": False,
        "rules": {"task_types": task_types, "blocked_when": [TODO], "fits_on_data": TODO, "shape_effect": TODO},
        "slots": {
            "header": {},
            "solves": {"hero": hero, "line": TODO},
            "quick_facts": qf,
            "use_avoid": {"use_when": [TODO], "avoid_when": [TODO]},
            "prep": [TODO],
            "code": code,
            "what_comes_out": {"items": coming_items(archetype, extractions, targets), "next_step": TODO,
                               "visual": None},
            "catch_outs": [TODO],
            "key_settings": {"tier1": t1, "tier2": t2, "tier3": t3},
            "watch_it_work": {"none": True},
            "intuition": intuition,
            "next": [],
        },
    }


def facts_md(pid, tpage, entries, extractions):
    lines = [f"# Facts: {pid} ({tpage['shown_as']})", f"Taxonomy hint: {tpage.get('pick_when', '')}", ""]
    for e, ex in zip(entries, extractions):
        lines.append(f"## {e['id']} ({e['library']} {ex.get('library_version', '?') if ex else '?'})")
        if not ex:
            lines += ["No extraction record. Leave unknown facts empty.", ""]
            continue
        lines.append(f"Summary: {ex.get('summary', '')}")
        lines.append(f"Signature: {ex.get('signature', '')}")
        lines.append("Parameters (name | default | effective default | description):")
        for p in ex.get("parameters") or []:
            lines.append(f"- {p['name']} | {clean_default(p.get('default'))} | "
                         f"{clean_default(p.get('effective_default'))} | {first_line(p.get('description'))}")
        lines.append("Methods: " + "; ".join(f"{m['name']} ({first_line(m.get('summary'), 60)})"
                                             for m in ex.get("methods") or []))
        lines.append("Attributes: " + "; ".join(f"{a['name']} [{a.get('type_doc', '')}]"
                                                for a in ex.get("attributes") or []))
        rets = ex.get("returns") or []
        if rets:
            lines.append("Returns: " + "; ".join(f"{r['name']} [{r.get('type_doc', '')}]" for r in rets))
        lines.append(f"Doc: {e.get('doc_url', '')}")
        lines.append("")
    return "\n".join(lines)


def _str_repr(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|" if "\n" in data else None)


class Dumper(yaml.SafeDumper):
    pass


Dumper.add_representer(str, _str_repr)


def scaffold(pages, root=ROOT, stage=None):
    """Scaffold the given page ids (or every page of `stage` without a record). Returns written ids."""
    content = root / "content"
    tax = load_yaml(content / "taxonomy.yaml")
    tpages = taxonomy_pages(tax)
    inv = []
    for name in ("catalogue", "supporting"):
        p = content / "inventory" / f"{name}.yaml"
        if p.exists():
            inv += load_yaml(p)["items"]
    by_page = {}
    for e in inv:
        by_page.setdefault(e.get("page"), []).append(e)
    versions = pins(root)
    existing = {p.stem for p in (content / "items").glob("*/*.yaml")}
    if stage:
        pages = [pid for pid, (s, _, _) in tpages.items() if s == stage and pid not in existing]
    written = []
    for pid in pages:
        if pid not in tpages:
            raise SystemExit(f"{pid}: not a taxonomy page")
        if pid in existing:
            print(f"{pid}: record exists, skipped")
            continue
        if pid not in by_page:
            raise SystemExit(f"{pid}: no inventory entries (content-only page); write it by hand")
        s, family, tpage = tpages[pid]
        entries = by_page[pid]
        extractions = []
        for e in entries:
            p = content / "extraction" / e["library"] / f"{e['id']}.json"
            extractions.append(json.loads(p.read_text()) if p.exists() else None)
        rec = build_record(pid, s, family, tpage, entries, tax, [x for x in extractions if x],
                           {e["library"]: versions[e["library"].lower()] for e in entries})
        out = content / "items" / s
        out.mkdir(parents=True, exist_ok=True)
        (out / f"{pid}.yaml").write_text(
            yaml.dump(rec, Dumper=Dumper, sort_keys=False, default_flow_style=None, allow_unicode=True, width=100),
            encoding="utf-8")
        (out / f"{pid}.facts.md").write_text(facts_md(pid, tpage, entries, extractions), encoding="utf-8")
        written.append(pid)
    return written


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pages", nargs="*")
    ap.add_argument("--stage")
    args = ap.parse_args(argv)
    if not args.pages and not args.stage:
        ap.error("give page ids or --stage")
    written = scaffold(args.pages, stage=args.stage)
    print(f"scaffolded {len(written)}: {' '.join(written)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
