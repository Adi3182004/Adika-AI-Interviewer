"""Generate synthetic candidate fixtures for local Adika AI demos.

Produces deterministic JSON the recruiter demo pages can consume so a
fresh checkout has realistic pipeline data without hitting any external
service. Set ``--seed`` for reproducible output.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass, field
from typing import Iterable

FIRST_NAMES = [
    "Aditya", "Priya", "Rohan", "Ananya", "Vikram", "Meera", "Kabir",
    "Isha", "Arjun", "Sneha", "Nikhil", "Tanvi", "Rahul", "Divya",
    "Aarav", "Pooja", "Karthik", "Neha",
]
LAST_NAMES = [
    "Sharma", "Nair", "Patel", "Iyer", "Khan", "Mehta", "Reddy",
    "Gupta", "Singh", "Bose", "Joshi", "Rao", "Andhalkar", "Verma",
]
ROLES = [
    "Senior Full-Stack Engineer",
    "Data Analyst",
    "ML Engineer",
    "Product Designer",
    "DevOps Engineer",
]
COMPANIES = ["Adobe", "Google", "Stripe", "Atlassian", "Shopify"]
STAGES = ["sourced", "ai_screen", "interview", "offer"]
SKILLS_POOL = [
    "python", "typescript", "react", "node.js", "sql", "aws",
    "docker", "kubernetes", "pytorch", "tensorflow", "figma",
    "tableau", "graphql", "next.js", "fastapi",
]


@dataclass
class Candidate:
    id: str
    name: str
    email: str
    role: str
    stage: str
    match_score: int
    years_experience: int
    skills: list[str]
    location: str
    notes: str = ""
    behavioural: dict = field(default_factory=dict)


def _pick(rng: random.Random, items: list[str]) -> str:
    return items[rng.randrange(len(items))]


def generate(count: int, seed: int | None = None) -> list[Candidate]:
    rng = random.Random(seed)
    out: list[Candidate] = []
    for i in range(count):
        first = _pick(rng, FIRST_NAMES)
        last = _pick(rng, LAST_NAMES)
        name = f"{first} {last}"
        role = _pick(rng, ROLES)
        stage = _pick(rng, STAGES)
        skills = rng.sample(SKILLS_POOL, k=rng.randint(4, 7))
        candidate = Candidate(
            id=f"cand_{i:03d}",
            name=name,
            email=f"{first.lower()}.{last.lower()}@example.com",
            role=role,
            stage=stage,
            match_score=rng.randint(62, 96),
            years_experience=rng.randint(1, 12),
            skills=sorted(skills),
            location=_pick(rng, ["Bengaluru", "Mumbai", "Pune", "Hyderabad", "Remote"]),
            behavioural={
                "typing_wpm": rng.randint(45, 110),
                "paste_detected": rng.random() < 0.15,
                "ai_likelihood": round(rng.random() * 0.6, 2),
            },
        )
        out.append(candidate)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic candidate fixtures.")
    parser.add_argument("--count", type=int, default=16)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default="-", help="Output path or '-' for stdout.")
    args = parser.parse_args()

    candidates = [asdict(c) for c in generate(args.count, args.seed)]
    payload = json.dumps(candidates, indent=2)
    if args.out == "-":
        print(payload)
    else:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(payload)


if __name__ == "__main__":
    main()
