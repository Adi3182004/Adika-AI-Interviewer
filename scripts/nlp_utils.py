"""Small NLP helpers used across the offline scripts.

Pure standard-library implementations of the few text-processing
primitives the other scripts need: tokenisation, stop-word filtering,
sentence splitting, TF-IDF, and cosine similarity. Kept here so the
heavier scripts (ats_score, resume_parser, ...) can stay focused.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Iterable

STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "if", "while", "with",
    "of", "to", "in", "on", "at", "by", "for", "from", "as", "is", "are",
    "be", "been", "being", "was", "were", "this", "that", "these", "those",
    "it", "its", "we", "our", "you", "your", "they", "their", "i", "me",
    "my", "do", "does", "did", "have", "has", "had", "will", "would",
    "should", "could", "may", "might", "must", "can", "not", "no",
})

WORD_RE = re.compile(r"[A-Za-z][A-Za-z+.#/-]{1,}")
SENT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def tokenize(text: str, *, drop_stopwords: bool = True) -> list[str]:
    tokens = [t.lower() for t in WORD_RE.findall(text)]
    if drop_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 2]
    return tokens


def sentences(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    return [s.strip() for s in SENT_RE.split(text) if s.strip()]


def term_frequency(tokens: Iterable[str]) -> dict[str, float]:
    counts = Counter(tokens)
    total = sum(counts.values()) or 1
    return {t: c / total for t, c in counts.items()}


def inverse_document_frequency(documents: list[list[str]]) -> dict[str, float]:
    n_docs = len(documents) or 1
    df: Counter[str] = Counter()
    for doc in documents:
        df.update(set(doc))
    return {t: math.log((n_docs + 1) / (c + 1)) + 1 for t, c in df.items()}


def tfidf(documents: list[list[str]]) -> list[dict[str, float]]:
    idf = inverse_document_frequency(documents)
    out: list[dict[str, float]] = []
    for doc in documents:
        tf = term_frequency(doc)
        out.append({t: tf_value * idf.get(t, 0.0) for t, tf_value in tf.items()})
    return out


def cosine_similarity(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    dot = sum(a[t] * b[t] for t in common)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def summarise(text: str, max_sentences: int = 3) -> list[str]:
    """Extractive summary: rank sentences by token-frequency density."""
    sents = sentences(text)
    if len(sents) <= max_sentences:
        return sents
    freq = Counter(tokenize(text))
    scored = sorted(
        ((sum(freq[t] for t in tokenize(s)) / max(1, len(tokenize(s))), i, s)
         for i, s in enumerate(sents)),
        reverse=True,
    )
    top = sorted(scored[:max_sentences], key=lambda t: t[1])
    return [s for _, _, s in top]
