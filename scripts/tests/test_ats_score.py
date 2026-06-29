"""Smoke tests for the ATS scorer.

Run with: ``python3 -m unittest scripts/tests/test_ats_score.py``
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ats_score import score_resume  # noqa: E402
from resume_parser import parse_resume  # noqa: E402
from learning_roadmap import build_roadmap  # noqa: E402


RESUME = """
Aditya Andhalkar
aditya@example.com  |  +91 98765 43210

Summary
Full-stack engineer with 5 years experience building React and Python services.

Skills
Python, TypeScript, React, FastAPI, AWS, Docker, PostgreSQL

Experience
Senior Engineer — built a real-time analytics pipeline on AWS.

Education
B.Tech, Computer Science
"""

JOB = """
Senior Full-Stack Engineer

Requirements:
- 4+ years building production React applications
- Strong Python (FastAPI or Django)
- AWS or GCP

Nice to have:
- Docker, Kubernetes
"""


class AtsScoreTests(unittest.TestCase):
    def test_match_is_strong(self) -> None:
        result = score_resume(RESUME, JOB)
        self.assertGreaterEqual(result.score, 55)
        self.assertIn("python", [m.lower() for m in result.matched_keywords])

    def test_missing_keywords_are_reported(self) -> None:
        thin_resume = "Aditya — frontend dev with React only."
        result = score_resume(thin_resume, JOB)
        self.assertLess(result.score, 60)
        self.assertTrue(any("python" in kw for kw in result.missing_keywords))


class ResumeParserTests(unittest.TestCase):
    def test_extracts_email_and_skills(self) -> None:
        parsed = parse_resume(RESUME)
        self.assertEqual(parsed.email, "aditya@example.com")
        self.assertIn("python", parsed.skills)
        self.assertIn("react", parsed.skills)
        self.assertEqual(parsed.years_experience, 5)


class RoadmapTests(unittest.TestCase):
    def test_roadmap_includes_gap_weeks(self) -> None:
        plan = build_roadmap("Data Analyst", 2.0, ["SQL window functions"])
        self.assertTrue(plan.weeks[0].focus.startswith("Close skill gap"))
        self.assertGreater(len(plan.recommended_certifications), 0)


if __name__ == "__main__":
    unittest.main()
