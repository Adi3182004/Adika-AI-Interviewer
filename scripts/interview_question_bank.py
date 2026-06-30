"""Role + company aware interview question bank.

This module powers the offline equivalent of the Adika AI adaptive
interview generator. Given a target role, company, and experience level,
it returns a structured list of questions covering technical depth,
system design, behavioural fit, and culture-add signals.

The data is intentionally hand-curated so unit tests stay deterministic
and so the CLI can be used to seed demo content without calling an LLM.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass, field
from typing import Iterable


@dataclass
class Question:
    id: str
    prompt: str
    category: str
    difficulty: str  # "easy" | "medium" | "hard"
    expected_signals: list[str] = field(default_factory=list)
    follow_ups: list[str] = field(default_factory=list)


ROLE_BANK: dict[str, list[Question]] = {
    "data analyst": [
        Question(
            id="da-001",
            prompt="Walk me through a recent dashboard you built. Who used it and what decision did it enable?",
            category="impact",
            difficulty="easy",
            expected_signals=["business framing", "stakeholder empathy"],
            follow_ups=["How did you measure adoption?", "What would you build differently today?"],
        ),
        Question(
            id="da-002",
            prompt="Given a table of orders(order_id, user_id, amount, created_at), write SQL to compute weekly retention cohorts.",
            category="sql",
            difficulty="medium",
            expected_signals=["window functions", "date truncation", "cohort framing"],
            follow_ups=["How would you express it with pandas?", "What's the cost of this query at 1B rows?"],
        ),
        Question(
            id="da-003",
            prompt="A KPI dropped 12% week-over-week. How do you investigate?",
            category="problem-solving",
            difficulty="medium",
            expected_signals=["segmentation", "instrumentation check", "external factors"],
            follow_ups=["What's your stopping criterion?", "How do you communicate the finding?"],
        ),
        Question(
            id="da-004",
            prompt="Design an A/B test for a checkout button colour change. What pitfalls do you anticipate?",
            category="experimentation",
            difficulty="hard",
            expected_signals=["power analysis", "novelty effect", "guardrail metrics"],
            follow_ups=["When would you call it early?", "How do you handle peeking?"],
        ),
        Question(
            id="da-005",
            prompt="Pick a metric you'd never optimise in isolation and explain why.",
            category="judgement",
            difficulty="hard",
            expected_signals=["second-order thinking", "Goodhart awareness"],
            follow_ups=["What counter-metric would you pair it with?"],
        ),
    ],
    "frontend engineer": [
        Question(
            id="fe-001",
            prompt="Explain the React rendering pipeline from a setState call to a paint.",
            category="frameworks",
            difficulty="medium",
            expected_signals=["reconciliation", "commit phase", "browser paint"],
            follow_ups=["Where does concurrent rendering change this?"],
        ),
        Question(
            id="fe-002",
            prompt="A page has a 4s LCP on slow 4G. Walk through your investigation.",
            category="performance",
            difficulty="hard",
            expected_signals=["network waterfall", "critical CSS", "image strategy"],
            follow_ups=["How would you ship a fix incrementally?"],
        ),
        Question(
            id="fe-003",
            prompt="Implement a debounce hook in TypeScript and discuss its trade-offs vs throttle.",
            category="coding",
            difficulty="medium",
            expected_signals=["closures", "cleanup", "API ergonomics"],
            follow_ups=["How would you test it?"],
        ),
        Question(
            id="fe-004",
            prompt="Audit a modal for accessibility. What are the top five things you check?",
            category="accessibility",
            difficulty="medium",
            expected_signals=["focus trap", "ARIA roles", "keyboard contract"],
            follow_ups=["How does this change for a mobile drawer?"],
        ),
        Question(
            id="fe-005",
            prompt="Describe a time you pushed back on a design that would have hurt usability.",
            category="behavioural",
            difficulty="easy",
            expected_signals=["user empathy", "diplomacy"],
            follow_ups=["What did you learn?"],
        ),
    ],
    "ml engineer": [
        Question(
            id="ml-001",
            prompt="Walk through deploying a model from notebook to production. What breaks first?",
            category="mlops",
            difficulty="medium",
            expected_signals=["packaging", "drift", "rollback"],
            follow_ups=["How do you monitor it?"],
        ),
        Question(
            id="ml-002",
            prompt="Compare RAG with fine-tuning for a domain-specific assistant.",
            category="llm",
            difficulty="hard",
            expected_signals=["latency", "freshness", "cost"],
            follow_ups=["When would you combine both?"],
        ),
        Question(
            id="ml-003",
            prompt="A classifier hits 99% accuracy but stakeholders are unhappy. What's likely going on?",
            category="evaluation",
            difficulty="medium",
            expected_signals=["class imbalance", "wrong metric", "label leakage"],
            follow_ups=["Pick a better metric."],
        ),
        Question(
            id="ml-004",
            prompt="Design a feature store for a recommendation system serving 5k QPS.",
            category="system-design",
            difficulty="hard",
            expected_signals=["online/offline parity", "freshness", "backfills"],
            follow_ups=["How would you handle PII?"],
        ),
        Question(
            id="ml-005",
            prompt="Tell me about a model you killed. Why?",
            category="behavioural",
            difficulty="easy",
            expected_signals=["pragmatism", "ROI thinking"],
            follow_ups=["What did the postmortem surface?"],
        ),
    ],
    "full-stack engineer": [
        Question(
            id="fs-001",
            prompt="Design an API for a multi-tenant SaaS dashboard. Walk through auth, RLS, and rate limits.",
            category="system-design",
            difficulty="hard",
            expected_signals=["tenant isolation", "auth model", "fairness"],
            follow_ups=["How do you migrate a noisy tenant off?"],
        ),
        Question(
            id="fs-002",
            prompt="A new endpoint is 5x slower in production than staging. Diagnose.",
            category="performance",
            difficulty="medium",
            expected_signals=["N+1 queries", "cold cache", "different data shape"],
            follow_ups=["What dashboards do you reach for first?"],
        ),
        Question(
            id="fs-003",
            prompt="When would you reach for an event-driven architecture vs simple HTTP RPC?",
            category="architecture",
            difficulty="medium",
            expected_signals=["coupling", "ordering", "observability cost"],
            follow_ups=["What does failure handling look like?"],
        ),
        Question(
            id="fs-004",
            prompt="Implement optimistic UI for a 'like' button that reconciles with the server.",
            category="coding",
            difficulty="medium",
            expected_signals=["state machine", "rollback", "race conditions"],
            follow_ups=["How would you test it?"],
        ),
        Question(
            id="fs-005",
            prompt="Tell me about a system you simplified. What did you remove and why?",
            category="behavioural",
            difficulty="easy",
            expected_signals=["taste", "cost awareness"],
            follow_ups=["What was the result?"],
        ),
    ],
}


COMPANY_FLAVOUR: dict[str, list[str]] = {
    "adobe": [
        "How would you instrument the Creative Cloud onboarding funnel?",
        "What metrics would you watch for a generative-AI feature inside Photoshop?",
    ],
    "stripe": [
        "Design a webhook delivery system that guarantees at-least-once delivery.",
        "Walk through detecting card-testing fraud in real time.",
    ],
    "google": [
        "Estimate the storage cost of YouTube thumbnails for one year.",
        "How would you redesign the Search results page for an LLM-first world?",
    ],
    "netflix": [
        "Design a personalised landing row that adapts to time of day.",
        "How would you evaluate the success of a new autoplay behaviour?",
    ],
    "uber": [
        "How would you detect a city-wide pricing anomaly in under five minutes?",
        "Design a rider safety alert pipeline.",
    ],
}


def _normalise(role: str) -> str:
    role = role.strip().lower()
    if "data" in role:
        return "data analyst"
    if "ml" in role or "machine" in role:
        return "ml engineer"
    if "frontend" in role or "front-end" in role or "ui" in role:
        return "frontend engineer"
    return "full-stack engineer"


def generate_interview(role: str, company: str | None, experience_years: float,
                       count: int = 10, seed: int | None = None) -> list[Question]:
    """Return a deterministic list of ``count`` questions tailored to the inputs."""
    rng = random.Random(seed if seed is not None else hash((role, company, count)))
    bank = list(ROLE_BANK[_normalise(role)])

    # Bias toward harder questions for senior candidates.
    if experience_years >= 6:
        bank.sort(key=lambda q: {"easy": 2, "medium": 1, "hard": 0}[q.difficulty])
    else:
        bank.sort(key=lambda q: {"easy": 0, "medium": 1, "hard": 2}[q.difficulty])

    flavour = COMPANY_FLAVOUR.get((company or "").lower(), [])
    flavour_qs = [
        Question(id=f"co-{i:03d}", prompt=p, category="company-specific",
                 difficulty="medium", expected_signals=["context awareness"])
        for i, p in enumerate(flavour, start=1)
    ]

    pool = bank + flavour_qs
    if count <= len(pool):
        chosen = pool[:count]
    else:
        # Pad by re-using high-signal behaviourals.
        chosen = pool + rng.sample(bank, count - len(pool))
    return chosen[:count]


def summarise_signals(questions: Iterable[Question]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for q in questions:
        for sig in q.expected_signals:
            counts[sig] = counts.get(sig, 0) + 1
    return dict(sorted(counts.items(), key=lambda kv: -kv[1]))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a tailored interview question set.")
    parser.add_argument("--role", required=True)
    parser.add_argument("--company", default=None)
    parser.add_argument("--experience", type=float, default=3.0)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--signals", action="store_true",
                        help="Print expected-signal frequency instead of the question list.")
    args = parser.parse_args()

    qs = generate_interview(args.role, args.company, args.experience, args.count, args.seed)
    if args.signals:
        print(json.dumps(summarise_signals(qs), indent=2))
        return
    print(json.dumps([asdict(q) for q in qs], indent=2))


if __name__ == "__main__":
    main()
