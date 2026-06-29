"""Week-by-week upskilling roadmap generator.

Takes a target role, optional company, current experience (years), and a
list of skill gaps, and produces a structured roadmap that mirrors the
candidate "Learning Center" view in the app.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass, field
from typing import Iterable


ROLE_TRACKS: dict[str, list[str]] = {
    "data analyst": [
        "SQL fundamentals & window functions",
        "Statistics for analysts (hypothesis testing, distributions)",
        "Pandas + data cleaning patterns",
        "Tableau / Power BI dashboarding",
        "A/B testing & experimentation",
        "Storytelling with data — final capstone",
    ],
    "frontend engineer": [
        "Modern JS / TypeScript deep dive",
        "React rendering model & hooks",
        "State management patterns (TanStack Query, Zustand)",
        "Accessibility & semantic HTML",
        "Performance budgets and Core Web Vitals",
        "Capstone: ship a production-grade SPA",
    ],
    "ml engineer": [
        "Math refresh: linear algebra & probability",
        "Classical ML with scikit-learn",
        "Deep learning fundamentals (PyTorch)",
        "MLOps: tracking, registries, deployment",
        "LLM application patterns (RAG, evals)",
        "Capstone: deploy an inference service",
    ],
}

CERTIFICATIONS: dict[str, list[str]] = {
    "data analyst": ["Google Data Analytics", "Tableau Desktop Specialist"],
    "frontend engineer": ["Meta Front-End Developer", "JavaScript: The Hard Parts"],
    "ml engineer": ["AWS ML Specialty", "DeepLearning.AI MLOps"],
}


@dataclass
class WeekPlan:
    week: int
    focus: str
    deliverables: list[str] = field(default_factory=list)
    estimated_hours: int = 8


@dataclass
class Roadmap:
    role: str
    company: str | None
    experience_years: float
    weeks: list[WeekPlan]
    recommended_certifications: list[str]
    rationale: str


def _normalise_role(role: str) -> str:
    role = role.strip().lower()
    if "data" in role:
        return "data analyst"
    if "ml" in role or "machine" in role:
        return "ml engineer"
    return "frontend engineer"


def build_roadmap(role: str, experience_years: float, gaps: Iterable[str],
                  company: str | None = None) -> Roadmap:
    key = _normalise_role(role)
    track = ROLE_TRACKS[key]
    gap_list = [g.strip() for g in gaps if g.strip()]

    # Inject focused gap-closing weeks at the front of the plan.
    weeks: list[WeekPlan] = []
    for i, gap in enumerate(gap_list[:3], start=1):
        weeks.append(WeekPlan(
            week=i,
            focus=f"Close skill gap: {gap}",
            deliverables=[
                f"Build a small project demonstrating {gap}",
                f"Write a short reflection on how {gap} applies to the {role} role",
            ],
            estimated_hours=10,
        ))

    for offset, topic in enumerate(track, start=len(weeks) + 1):
        weeks.append(WeekPlan(
            week=offset,
            focus=topic,
            deliverables=[
                "Complete one structured course module",
                "Implement a hands-on exercise and push to GitHub",
            ],
            estimated_hours=8 if experience_years >= 3 else 10,
        ))

    rationale_bits = [
        f"Tailored for a candidate with ~{experience_years:.0f} years of experience targeting {role}.",
    ]
    if company:
        rationale_bits.append(f"Weighted toward signals {company} typically asks about in interviews.")
    if gap_list:
        rationale_bits.append(f"Front-loads gap closure for: {', '.join(gap_list[:3])}.")

    return Roadmap(
        role=role,
        company=company,
        experience_years=experience_years,
        weeks=weeks,
        recommended_certifications=CERTIFICATIONS[key],
        rationale=" ".join(rationale_bits),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a learning roadmap.")
    parser.add_argument("--role", required=True)
    parser.add_argument("--company", default=None)
    parser.add_argument("--experience", type=float, default=2.0)
    parser.add_argument("--gaps", nargs="*", default=[])
    args = parser.parse_args()

    plan = build_roadmap(args.role, args.experience, args.gaps, args.company)
    print(json.dumps({
        **asdict(plan),
        "weeks": [asdict(w) for w in plan.weeks],
    }, indent=2))


if __name__ == "__main__":
    main()
