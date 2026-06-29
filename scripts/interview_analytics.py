"""Behavioural signal extraction for AI-Interviewer transcripts.

Given a list of keystroke events per question, compute:

    * average typing speed (wpm)
    * burstiness (stdev of inter-keystroke intervals)
    * paste-detected flag (large insertions in a single tick)
    * estimated AI-likelihood score (0-1)

These signals back the recruiter-side "behavioural signals" panel and are
intentionally calculated without external dependencies.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


@dataclass
class QuestionSignals:
    question_index: int
    wpm: float
    burstiness: float
    paste_detected: bool
    ai_likelihood: float
    answered_in_seconds: float


def _wpm(chars: int, seconds: float) -> float:
    if seconds <= 0:
        return 0.0
    words = chars / 5
    return round(words / (seconds / 60), 1)


def _burstiness(intervals: list[float]) -> float:
    if len(intervals) < 2:
        return 0.0
    mean = statistics.fmean(intervals)
    if mean == 0:
        return 0.0
    sd = statistics.pstdev(intervals)
    return round(sd / mean, 3)


def _paste_detected(events: Iterable[dict]) -> bool:
    for e in events:
        if e.get("type") == "paste":
            return True
        # Large character delta in <50ms is treated as a paste
        if e.get("delta_chars", 0) >= 40 and e.get("delta_ms", 1000) < 50:
            return True
    return False


def _ai_likelihood(wpm: float, burstiness: float, paste: bool, length: int) -> float:
    # Humans usually have higher burstiness and lower sustained WPM.
    score = 0.0
    if paste:
        score += 0.5
    if wpm > 95:
        score += 0.25
    if burstiness < 0.35 and length > 400:
        score += 0.2
    if wpm > 70 and burstiness < 0.5 and length > 250:
        score += 0.1
    return round(min(1.0, score), 2)


def analyse_question(events: list[dict], question_index: int) -> QuestionSignals:
    if not events:
        return QuestionSignals(question_index, 0, 0, False, 0, 0)
    timestamps = [e.get("t", 0) for e in events]
    intervals = [b - a for a, b in zip(timestamps, timestamps[1:]) if b >= a]
    total_seconds = max(timestamps[-1] - timestamps[0], 1) / 1000
    chars = sum(e.get("delta_chars", 1) for e in events)
    wpm = _wpm(chars, total_seconds)
    bursty = _burstiness(intervals)
    paste = _paste_detected(events)
    return QuestionSignals(
        question_index=question_index,
        wpm=wpm,
        burstiness=bursty,
        paste_detected=paste,
        ai_likelihood=_ai_likelihood(wpm, bursty, paste, chars),
        answered_in_seconds=round(total_seconds, 1),
    )


def analyse_session(payload: dict) -> dict:
    questions = payload.get("questions", [])
    signals = [analyse_question(q.get("events", []), i) for i, q in enumerate(questions)]
    avg_ai = round(statistics.fmean([s.ai_likelihood for s in signals]) if signals else 0, 2)
    return {
        "candidate": payload.get("candidate"),
        "role": payload.get("role"),
        "company": payload.get("company"),
        "avg_ai_likelihood": avg_ai,
        "questions": [asdict(s) for s in signals],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Score an interview transcript.")
    parser.add_argument("path", help="JSON file with {candidate, role, questions:[{events:[...]}]}")
    args = parser.parse_args()

    payload = json.loads(Path(args.path).read_text(encoding="utf-8"))
    result = analyse_session(payload)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
