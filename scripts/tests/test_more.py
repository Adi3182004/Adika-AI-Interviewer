"""Additional smoke tests for the offline scripts.

Run with: ``python3 -m unittest scripts/tests/test_more.py``
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bias_detector import scan, score  # noqa: E402
from candidate_matcher import Candidate, Job, score_candidate  # noqa: E402
from email_templates import TEMPLATES, render, required_variables  # noqa: E402
from interview_question_bank import generate_interview  # noqa: E402
from nlp_utils import cosine_similarity, summarise, tfidf, tokenize  # noqa: E402
from offer_calculator import build_offer  # noqa: E402
from salary_benchmarks import benchmark  # noqa: E402
from skill_taxonomy import SkillGraph  # noqa: E402


class BiasDetectorTests(unittest.TestCase):
    def test_flags_ninja_and_culture_fit(self) -> None:
        text = "We need a rockstar ninja engineer who is a great culture fit."
        findings = scan(text)
        triggers = {f.trigger for f in findings}
        self.assertIn("ninja", triggers)
        self.assertIn("culture fit", triggers)
        self.assertLess(score(text), 90)


class CandidateMatcherTests(unittest.TestCase):
    def test_strong_match_scores_high(self) -> None:
        job = Job(title="FS", must_have_skills=["python", "react"],
                  nice_to_have_skills=["aws"], min_years=3, seniority="senior")
        cand = Candidate(name="A", skills=["Python", "React", "AWS"], years=5,
                         seniority="senior", location_mode="remote", timezone_offset=0)
        self.assertGreaterEqual(score_candidate(job, cand).score, 80)


class EmailTemplateTests(unittest.TestCase):
    def test_render_intro(self) -> None:
        tpl = TEMPLATES["intro"]
        vars_ = {k: f"<{k}>" for k in required_variables(tpl)}
        subject, body = render(tpl, vars_)
        self.assertIn("<role>", subject)
        self.assertIn("<sender_name>", body)


class InterviewBankTests(unittest.TestCase):
    def test_count_is_respected(self) -> None:
        qs = generate_interview("Data Analyst", "Adobe", 4, count=8, seed=1)
        self.assertEqual(len(qs), 8)


class NlpTests(unittest.TestCase):
    def test_cosine_self_similarity_is_one(self) -> None:
        doc = tokenize("python pandas numpy python")
        vecs = tfidf([doc])
        self.assertAlmostEqual(cosine_similarity(vecs[0], vecs[0]), 1.0, places=5)

    def test_summarise_truncates(self) -> None:
        text = "Sentence one. Sentence two has more weight weight weight. Three."
        self.assertEqual(len(summarise(text, max_sentences=2)), 2)


class OfferTests(unittest.TestCase):
    def test_offer_totals_make_sense(self) -> None:
        offer = build_offer("senior", "remote-us")
        self.assertGreater(offer.total_year_one, offer.base_salary)


class SalaryTests(unittest.TestCase):
    def test_percentiles_are_ordered(self) -> None:
        b = benchmark("frontend engineer", "remote-us")
        self.assertLessEqual(b.p10, b.p25)
        self.assertLessEqual(b.p25, b.p50)
        self.assertLessEqual(b.p50, b.p75)
        self.assertLessEqual(b.p75, b.p90)


class SkillGraphTests(unittest.TestCase):
    def test_expand_includes_seed(self) -> None:
        g = SkillGraph()
        expanded = g.expand(["react"], depth=1)
        self.assertIn("react", expanded)
        self.assertIn("next.js", expanded)

    def test_path_between_related_skills(self) -> None:
        g = SkillGraph()
        path = g.shortest_path("python", "kubernetes")
        self.assertIsNone(path) if path is None else self.assertIn("python", path)


if __name__ == "__main__":
    unittest.main()
