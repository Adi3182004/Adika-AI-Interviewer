"""Funnel / conversion / time-to-hire reporting from a CSV export.

Reads an ``applications.csv`` shaped like:

    id,stage,created_at,updated_at,job_id

and prints a recruiter-friendly summary plus an optional JSON dump.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import fmean

STAGES = ["new", "screen", "interview", "offer", "hired", "rejected"]


def _parse_dt(raw: str) -> datetime:
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def summarise(rows: list[dict]) -> dict:
    funnel = Counter(r["stage"] for r in rows)
    per_job: dict[str, Counter] = defaultdict(Counter)
    for r in rows:
        per_job[r["job_id"]][r["stage"]] += 1

    hired_rows = [r for r in rows if r["stage"] == "hired"]
    ttl = [
        (_parse_dt(r["updated_at"]) - _parse_dt(r["created_at"])).total_seconds() / 86400
        for r in hired_rows
    ]
    time_to_hire = round(fmean(ttl), 1) if ttl else None

    return {
        "total_applications": len(rows),
        "funnel": {s: funnel.get(s, 0) for s in STAGES},
        "hire_conversion_pct": round(100 * len(hired_rows) / len(rows), 1) if rows else 0,
        "time_to_hire_days": time_to_hire,
        "per_job": {
            job: {s: counter.get(s, 0) for s in STAGES}
            for job, counter in per_job.items()
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarise a pipeline CSV export.")
    parser.add_argument("csv", help="Path to applications.csv")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    with Path(args.csv).open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    result = summarise(rows)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    print(f"Total applications: {result['total_applications']}")
    print(f"Hire conversion   : {result['hire_conversion_pct']}%")
    if result["time_to_hire_days"] is not None:
        print(f"Time to hire (avg): {result['time_to_hire_days']} days")
    print("\nFunnel:")
    for stage, count in result["funnel"].items():
        print(f"  {stage:<10} {count}")


if __name__ == "__main__":
    main()
