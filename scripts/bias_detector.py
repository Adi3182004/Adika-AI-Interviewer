"""Heuristic bias detector for job descriptions.

Flags wording that frequently shows up in research on biased job posts
(gendered language, exclusionary phrases, jargon that screens out
non-traditional candidates) and proposes neutral alternatives.

Intentionally conservative: this is a coaching aid, not a censor. Each
finding includes the trigger, why it's flagged, and a suggested rewrite.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass

MASCULINE_CODED = {
    "aggressive", "ambitious", "assertive", "competitive", "decisive",
    "dominant", "driven", "fearless", "ninja", "rockstar", "guru",
    "hacker", "warrior", "fierce", "outspoken",
}

FEMININE_CODED = {
    "supportive", "nurturing", "collaborative", "interpersonal",
    "empathetic", "kind", "sensitive", "loyal", "honest",
}

EXCLUSIONARY = {
    "digital native": "early career or self-taught technologist",
    "young and energetic": "high-energy",
    "recent graduate": "early-career engineer",
    "must be willing to work long hours": "willing to flex hours during launches",
    "culture fit": "culture add",
    "strong english": "professional written communication",
    "10x engineer": "high-impact engineer",
    "no degree required, but preferred": "no degree required",
    "salary negotiable": "transparent salary band: $X-$Y",
}

DEGREE_GATEKEEPING = re.compile(
    r"\b(BS|BA|MS|PhD|bachelor'?s|master'?s|doctorate)\b[^.]*?\b(required|must)\b",
    re.IGNORECASE,
)


@dataclass
class Finding:
    trigger: str
    category: str
    explanation: str
    suggestion: str


def scan(text: str) -> list[Finding]:
    findings: list[Finding] = []
    lower = text.lower()

    for word in MASCULINE_CODED:
        if re.search(rf"\b{re.escape(word)}\b", lower):
            findings.append(Finding(
                trigger=word,
                category="masculine-coded",
                explanation="Research shows this word can reduce applications from women.",
                suggestion="Use a behaviour-based phrase (e.g. 'drives results' instead of 'aggressive').",
            ))

    for word in FEMININE_CODED:
        if re.search(rf"\b{re.escape(word)}\b", lower):
            findings.append(Finding(
                trigger=word,
                category="feminine-coded",
                explanation="Heavy use of feminine-coded words can signal a soft-only role.",
                suggestion="Pair with outcome-oriented language (e.g. 'collaborative AND ships').",
            ))

    for phrase, rewrite in EXCLUSIONARY.items():
        if phrase in lower:
            findings.append(Finding(
                trigger=phrase,
                category="exclusionary",
                explanation=f"'{phrase}' tends to discourage qualified candidates.",
                suggestion=f"Try: '{rewrite}'.",
            ))

    if DEGREE_GATEKEEPING.search(text):
        findings.append(Finding(
            trigger="required-degree",
            category="degree-gatekeeping",
            explanation="A required degree filters out self-taught candidates with equivalent experience.",
            suggestion="Make the degree 'preferred' and list equivalent experience as a path.",
        ))

    return findings


def score(text: str) -> int:
    findings = scan(text)
    base = 100
    base -= 6 * len(findings)
    return max(0, min(100, base))


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan a job description for biased language.")
    parser.add_argument("path", help="Path to the job description text file.")
    args = parser.parse_args()

    from pathlib import Path
    text = Path(args.path).read_text(encoding="utf-8")
    findings = scan(text)
    print(json.dumps({
        "inclusion_score": score(text),
        "findings": [asdict(f) for f in findings],
    }, indent=2))


if __name__ == "__main__":
    main()
