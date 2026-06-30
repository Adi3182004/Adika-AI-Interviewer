"""Diversity & inclusion metrics from anonymised pipeline data.

Given a CSV of applicants tagged with self-reported demographic categories
and the stage they reached, compute funnel pass-through rates per group
and surface where the largest drop-offs happen. The categories are
deliberately generic so the same script works for any axis the customer
chooses to track (gender, ethnicity, veteran status, neuro-diversity, ...).
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from statistics import fmean

STAGES = ["applied", "screened", "interviewed", "offered", "hired"]


def _by_group(rows: list[dict]) -> dict[str, dict[str, int]]:
    table: dict[str, dict[str, int]] = defaultdict(lambda: {s: 0 for s in STAGES})
    for r in rows:
        group = r["group"] or "unspecified"
        for stage in STAGES:
            if r.get(stage, "0") in ("1", "true", "True"):
                table[group][stage] += 1
    return table


def _conversion(stage_counts: dict[str, int]) -> dict[str, float]:
    out: dict[str, float] = {}
    for prev, curr in zip(STAGES, STAGES[1:]):
        prev_n = stage_counts[prev]
        out[f"{prev}->{curr}"] = round(stage_counts[curr] / prev_n, 3) if prev_n else 0.0
    return out


def report(rows: list[dict]) -> dict:
    table = _by_group(rows)
    per_group: dict[str, dict] = {}
    for group, counts in table.items():
        per_group[group] = {
            "counts": counts,
            "conversion": _conversion(counts),
        }

    # Disparity index: ratio of each group's offer rate vs the population mean.
    pop_offer = fmean(
        (g["counts"]["offered"] / g["counts"]["applied"]) if g["counts"]["applied"] else 0
        for g in per_group.values()
    ) or 1e-9
    for group, g in per_group.items():
        applied = g["counts"]["applied"]
        rate = (g["counts"]["offered"] / applied) if applied else 0
        g["offer_rate_index"] = round(rate / pop_offer, 3)

    return {"per_group": per_group, "population_offer_rate": round(pop_offer, 3)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Diversity metrics from pipeline CSV.")
    parser.add_argument("csv", help="CSV with columns: group, applied, screened, interviewed, offered, hired")
    args = parser.parse_args()

    with Path(args.csv).open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    print(json.dumps(report(rows), indent=2))


if __name__ == "__main__":
    main()
