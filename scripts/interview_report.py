"""Build a printable interview report from a session log.

Reads a JSON file of the shape::

    {
      "candidate": {"name": "...", "role": "...", "company": "..."},
      "questions": [
        {"prompt": "...", "answer": "...", "elapsed_seconds": 95, "pasted": false}
      ]
    }

and renders a Markdown report plus a per-question signal summary. The
output mirrors what the recruiter "Interview Replays" tab shows so the
two surfaces stay aligned.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from interview_analytics import behavioural_signals  # type: ignore[import-not-found]


@dataclass
class QuestionReport:
    index: int
    prompt: str
    answer_preview: str
    elapsed_seconds: int
    typing_wpm: float
    likely_ai: bool
    paste_detected: bool


def _preview(text: str, length: int = 240) -> str:
    text = text.strip().replace("\n", " ")
    return text if len(text) <= length else text[: length - 1] + "…"


def build_question_reports(questions: Iterable[dict]) -> list[QuestionReport]:
    out: list[QuestionReport] = []
    for i, q in enumerate(questions, start=1):
        sig = behavioural_signals(
            q.get("answer", ""),
            elapsed_seconds=int(q.get("elapsed_seconds", 0)),
            paste_count=int(q.get("paste_count", 0)),
        )
        out.append(QuestionReport(
            index=i,
            prompt=q.get("prompt", ""),
            answer_preview=_preview(q.get("answer", "")),
            elapsed_seconds=int(q.get("elapsed_seconds", 0)),
            typing_wpm=sig.typing_wpm,
            likely_ai=sig.likely_ai,
            paste_detected=sig.paste_detected,
        ))
    return out


def render_markdown(session: dict) -> str:
    cand = session.get("candidate", {})
    reports = build_question_reports(session.get("questions", []))
    lines = [
        f"# Interview report — {cand.get('name', 'Candidate')}",
        "",
        f"- **Role:** {cand.get('role', '—')}",
        f"- **Company:** {cand.get('company', '—')}",
        f"- **Questions:** {len(reports)}",
        "",
        "## Per-question signals",
        "",
        "| # | Elapsed (s) | WPM | AI-likely | Pasted |",
        "|---|------------:|----:|:---------:|:------:|",
    ]
    for r in reports:
        lines.append(
            f"| {r.index} | {r.elapsed_seconds} | {r.typing_wpm:.0f} | "
            f"{'yes' if r.likely_ai else 'no'} | {'yes' if r.paste_detected else 'no'} |"
        )
    lines.append("")
    lines.append("## Answers")
    for r in reports:
        lines += [
            "",
            f"### Q{r.index}. {r.prompt}",
            "",
            "> " + r.answer_preview,
        ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render an interview session report.")
    parser.add_argument("session", help="Path to session JSON.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    session = json.loads(Path(args.session).read_text(encoding="utf-8"))
    if args.json:
        print(json.dumps(
            {"questions": [qr.__dict__ for qr in build_question_reports(session.get("questions", []))]},
            indent=2,
        ))
        return
    print(render_markdown(session))


if __name__ == "__main__":
    main()
