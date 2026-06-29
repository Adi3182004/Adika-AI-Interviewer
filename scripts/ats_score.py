"""ATS-style resume <-> job description scoring.

Mirrors the heuristic used by the Adika AI candidate Resume Center so the
same numeric score can be reproduced offline. The algorithm blends three
signals:

    1. Keyword overlap between resume tokens and job-description tokens.
    2. Coverage of "must-have" skill phrases.
    3. Penalties for missing section markers (experience, education, skills).

The output is a 0-100 integer plus a structured breakdown that downstream
tooling (CLI, notebooks, the web app) can render however it likes.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

STOPWORDS = {
    "the", "and", "for", "with", "from", "this", "that", "into", "your",
    "have", "will", "you", "are", "our", "not", "but", "any", "all",
    "can", "use", "using", "able", "should", "must", "their", "they",
    "a", "an", "of", "to", "in", "on", "at", "as", "is", "be", "or",
    "by", "we", "it", "its", "if", "so", "do", "does", "did", "has", "had",
}

SECTION_MARKERS = ("experience", "education", "skills", "projects", "summary")

MUST_HAVE_HINTS = ("must have", "required", "requirements", "you have")


@dataclass
class AtsBreakdown:
    score: int
    keyword_overlap: float
    must_have_coverage: float
    section_completeness: float
    missing_keywords: list[str]
    matched_keywords: list[str]


def _tokenise(text: str) -> list[str]:
    return [
        t for t in re.findall(r"[a-zA-Z][a-zA-Z+.#-]{1,}", text.lower())
        if t not in STOPWORDS and len(t) > 2
    ]


def _keyword_overlap(resume_tokens: Iterable[str], job_tokens: Iterable[str]) -> tuple[float, list[str], list[str]]:
    job_counts = Counter(job_tokens)
    resume_set = set(resume_tokens)
    if not job_counts:
        return 0.0, [], []
    matched = [w for w in job_counts if w in resume_set]
    missing = [w for w, _ in job_counts.most_common(40) if w not in resume_set]
    coverage = sum(job_counts[w] for w in matched) / sum(job_counts.values())
    return coverage, matched[:25], missing[:25]


def _must_have_coverage(resume_text: str, job_text: str) -> float:
    lines = [ln.strip() for ln in job_text.splitlines() if ln.strip()]
    must_lines: list[str] = []
    capture = False
    for line in lines:
        lower = line.lower()
        if any(h in lower for h in MUST_HAVE_HINTS):
            capture = True
            continue
        if capture and (line.startswith("-") or line.startswith("*") or re.match(r"^\d+\.", line)):
            must_lines.append(line.lstrip("-*0123456789. ").strip())
        elif capture and not line:
            capture = False
    if not must_lines:
        return 1.0
    resume_lower = resume_text.lower()
    hits = sum(1 for ml in must_lines if any(tok in resume_lower for tok in _tokenise(ml)[:3]))
    return hits / len(must_lines)


def _section_completeness(resume_text: str) -> float:
    lower = resume_text.lower()
    present = sum(1 for marker in SECTION_MARKERS if marker in lower)
    return present / len(SECTION_MARKERS)


def score_resume(resume_text: str, job_text: str) -> AtsBreakdown:
    resume_tokens = _tokenise(resume_text)
    job_tokens = _tokenise(job_text)
    overlap, matched, missing = _keyword_overlap(resume_tokens, job_tokens)
    must = _must_have_coverage(resume_text, job_text)
    sections = _section_completeness(resume_text)
    score = round(100 * (0.55 * overlap + 0.3 * must + 0.15 * sections))
    return AtsBreakdown(
        score=max(0, min(100, score)),
        keyword_overlap=round(overlap, 3),
        must_have_coverage=round(must, 3),
        section_completeness=round(sections, 3),
        missing_keywords=missing,
        matched_keywords=matched,
    )


def _load(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute an ATS-style match score.")
    parser.add_argument("--resume", required=True, help="Path to the resume text file.")
    parser.add_argument("--job", required=True, help="Path to the job description text file.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    result = score_resume(_load(args.resume), _load(args.job))
    if args.json:
        print(json.dumps(asdict(result), indent=2))
        return

    print(f"ATS score: {result.score}/100")
    print(f"  keyword overlap     : {result.keyword_overlap:.0%}")
    print(f"  must-have coverage  : {result.must_have_coverage:.0%}")
    print(f"  section completeness: {result.section_completeness:.0%}")
    if result.missing_keywords:
        print("\nTop missing keywords:")
        for kw in result.missing_keywords[:10]:
            print(f"  - {kw}")


if __name__ == "__main__":
    main()
