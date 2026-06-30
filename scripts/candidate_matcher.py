"""Candidate <-> job matching with explainable scoring.

Mirrors the logic the recruiter "Talent Intelligence" view uses to rank
candidates against an open requisition. Returns a per-candidate score
breakdown so reviewers can see *why* somebody ranks where they do.
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable


@dataclass
class Job:
    title: str
    must_have_skills: list[str]
    nice_to_have_skills: list[str]
    min_years: float
    seniority: str  # "junior" | "mid" | "senior" | "staff"
    location_modes: list[str] = field(default_factory=lambda: ["remote", "onsite", "hybrid"])
    timezone_overlap_hours: int = 4


@dataclass
class Candidate:
    name: str
    skills: list[str]
    years: float
    seniority: str
    location_mode: str
    timezone_offset: int  # hours from job's reference TZ
    languages: list[str] = field(default_factory=list)


@dataclass
class MatchBreakdown:
    candidate: str
    score: int
    must_have_coverage: float
    nice_to_have_coverage: float
    seniority_alignment: float
    location_compatibility: float
    timezone_compatibility: float
    notes: list[str] = field(default_factory=list)


SENIORITY_RANK = {"junior": 1, "mid": 2, "senior": 3, "staff": 4, "principal": 5}


def _coverage(needed: Iterable[str], have: Iterable[str]) -> float:
    needed_set = {s.lower() for s in needed}
    have_set = {s.lower() for s in have}
    if not needed_set:
        return 1.0
    return len(needed_set & have_set) / len(needed_set)


def score_candidate(job: Job, candidate: Candidate) -> MatchBreakdown:
    must = _coverage(job.must_have_skills, candidate.skills)
    nice = _coverage(job.nice_to_have_skills, candidate.skills)

    job_rank = SENIORITY_RANK.get(job.seniority, 2)
    cand_rank = SENIORITY_RANK.get(candidate.seniority, 2)
    seniority = max(0.0, 1.0 - 0.25 * abs(job_rank - cand_rank))
    if candidate.years < job.min_years:
        seniority *= 0.7

    location = 1.0 if candidate.location_mode in job.location_modes else 0.4
    tz = max(0.0, 1.0 - max(0, abs(candidate.timezone_offset) - job.timezone_overlap_hours) / 8)

    score = round(100 * (0.45 * must + 0.2 * nice + 0.2 * seniority + 0.1 * location + 0.05 * tz))

    notes: list[str] = []
    if must == 1.0:
        notes.append("Covers every must-have skill.")
    elif must < 0.5:
        notes.append("Missing more than half of the must-have skills.")
    if candidate.years > job.min_years + 4:
        notes.append("Overqualified on tenure — risk of disengagement.")
    if tz < 0.5:
        notes.append(f"Timezone offset of {candidate.timezone_offset}h limits overlap.")

    return MatchBreakdown(
        candidate=candidate.name,
        score=max(0, min(100, score)),
        must_have_coverage=round(must, 3),
        nice_to_have_coverage=round(nice, 3),
        seniority_alignment=round(seniority, 3),
        location_compatibility=round(location, 3),
        timezone_compatibility=round(tz, 3),
        notes=notes,
    )


def rank_candidates(job: Job, candidates: Iterable[Candidate]) -> list[MatchBreakdown]:
    return sorted((score_candidate(job, c) for c in candidates), key=lambda b: -b.score)


def _load_job(path: str) -> Job:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return Job(**raw)


def _load_candidates(path: str) -> list[Candidate]:
    with Path(path).open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    return [
        Candidate(
            name=r["name"],
            skills=[s.strip() for s in r["skills"].split("|") if s.strip()],
            years=float(r["years"]),
            seniority=r["seniority"],
            location_mode=r["location_mode"],
            timezone_offset=int(r["timezone_offset"]),
            languages=[s.strip() for s in r.get("languages", "").split("|") if s.strip()],
        )
        for r in rows
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Rank candidates against a job.")
    parser.add_argument("--job", required=True, help="JSON file describing the job.")
    parser.add_argument("--candidates", required=True, help="CSV of candidates.")
    parser.add_argument("--top", type=int, default=10)
    args = parser.parse_args()

    ranked = rank_candidates(_load_job(args.job), _load_candidates(args.candidates))
    print(json.dumps([asdict(r) for r in ranked[: args.top]], indent=2))


if __name__ == "__main__":
    main()
