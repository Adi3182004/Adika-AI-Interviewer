# Adika AI — Python Utilities

Offline data-science and tooling scripts that support the Adika AI hiring
ecosystem. These are intentionally framework-free and runnable locally with
`python3 scripts/<name>.py`. They mirror the logic used by the web app so the
same scoring, parsing, and analytics can be reproduced from the command line.

## Contents

| Script | Purpose |
| --- | --- |
| `ats_score.py`              | Compute an ATS-style match score between a resume and a job description. |
| `resume_parser.py`          | Extract structured fields (skills, education, experience) from raw resume text. |
| `interview_analytics.py`    | Behavioural signals: typing speed, paste detection, AI-likelihood heuristic. |
| `interview_question_bank.py`| Role + company aware interview question generator. |
| `interview_report.py`       | Render Markdown / JSON reports from a recorded interview session. |
| `learning_roadmap.py`       | Build a week-by-week upskilling roadmap from a target role + current gaps. |
| `seed_candidates.py`        | Generate synthetic candidate fixtures for local demos. |
| `pipeline_metrics.py`       | Funnel / conversion / time-to-hire reporting from a CSV export. |
| `candidate_matcher.py`      | Explainable candidate ranking against an open requisition. |
| `skill_taxonomy.py`         | Skill similarity graph and BFS-based skill expansion. |
| `bias_detector.py`          | Heuristic bias / inclusion scan for job descriptions. |
| `email_templates.py`        | Tiny template engine for recruiter outreach cadences. |
| `offer_calculator.py`       | Compensation modelling with location and level multipliers. |
| `salary_benchmarks.py`      | Synthesised market-rate percentile lookups. |
| `diversity_metrics.py`      | Demographic funnel analysis from anonymised pipeline data. |
| `nlp_utils.py`              | Shared tokenisation / TF-IDF / cosine helpers used by the other scripts. |

## Requirements

Python 3.10+ standard library only. No external dependencies.

```bash
python3 scripts/ats_score.py --resume samples/resume.txt --job samples/job.txt
python3 -m unittest discover -s scripts/tests
```
