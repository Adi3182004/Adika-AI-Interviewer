"""Extract structured fields from a raw resume text blob.

The parser is deliberately rule-based so it stays deterministic and easy
to test. It returns a dictionary with the same shape used by the Adika AI
candidate profile so the result can be uploaded straight into the app.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Iterable

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}")
URL_RE = re.compile(r"https?://[^\s)]+", re.IGNORECASE)
YEARS_RE = re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)", re.IGNORECASE)

KNOWN_SKILLS = {
    # languages
    "python", "javascript", "typescript", "java", "kotlin", "swift", "go",
    "rust", "ruby", "php", "scala", "c", "c++", "c#", "sql",
    # web
    "react", "next.js", "vue", "svelte", "angular", "node.js", "express",
    "django", "flask", "fastapi", "rails", "spring", "graphql", "rest",
    # data / ml
    "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras",
    "spark", "hadoop", "airflow", "dbt", "snowflake", "bigquery", "redshift",
    # cloud / infra
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
    "ci/cd", "github actions", "jenkins",
    # design / product
    "figma", "sketch", "framer", "adobe xd", "tableau", "power bi",
}

SECTION_HEADINGS = {
    "experience": ("experience", "work history", "employment"),
    "education": ("education", "academic", "qualifications"),
    "skills": ("skills", "technical skills", "core competencies"),
    "projects": ("projects", "selected projects"),
    "summary": ("summary", "profile", "objective"),
}


@dataclass
class ParsedResume:
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    links: list[str] = field(default_factory=list)
    years_experience: int | None = None
    skills: list[str] = field(default_factory=list)
    sections: dict[str, str] = field(default_factory=dict)


def _guess_name(lines: list[str]) -> str | None:
    for line in lines[:6]:
        clean = line.strip()
        if not clean or "@" in clean or any(ch.isdigit() for ch in clean):
            continue
        words = clean.split()
        if 2 <= len(words) <= 4 and all(w[:1].isupper() for w in words if w):
            return clean
    return None


def _extract_sections(text: str) -> dict[str, str]:
    lines = text.splitlines()
    indexed: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        stripped = line.strip().lower().rstrip(":")
        for key, names in SECTION_HEADINGS.items():
            if stripped in names:
                indexed.append((i, key))
                break
    indexed.append((len(lines), "__end__"))
    sections: dict[str, str] = {}
    for (start, key), (end, _) in zip(indexed, indexed[1:]):
        body = "\n".join(lines[start + 1:end]).strip()
        if body:
            sections[key] = body
    return sections


def _extract_skills(text: str, section_skills: str | None) -> list[str]:
    haystack = (section_skills or text).lower()
    found: list[str] = []
    for skill in KNOWN_SKILLS:
        pattern = r"(?<![A-Za-z0-9+#])" + re.escape(skill) + r"(?![A-Za-z0-9+#])"
        if re.search(pattern, haystack):
            found.append(skill)
    return sorted(set(found))


def _years_of_experience(text: str) -> int | None:
    matches = [int(m.group(1)) for m in YEARS_RE.finditer(text)]
    return max(matches) if matches else None


def parse_resume(text: str) -> ParsedResume:
    lines = text.splitlines()
    sections = _extract_sections(text)
    return ParsedResume(
        name=_guess_name(lines),
        email=(EMAIL_RE.search(text) or [None])[0] if EMAIL_RE.search(text) else None,
        phone=(PHONE_RE.search(text).group(0).strip() if PHONE_RE.search(text) else None),
        links=sorted(set(URL_RE.findall(text))),
        years_experience=_years_of_experience(text),
        skills=_extract_skills(text, sections.get("skills")),
        sections=sections,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a resume text file.")
    parser.add_argument("path", help="Path to a plain-text resume.")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    result = parse_resume(Path(args.path).read_text(encoding="utf-8"))
    payload = asdict(result)
    print(json.dumps(payload, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
