"""Skill taxonomy and similarity graph.

A lightweight graph of related skills used by the recruiter side to expand
search queries and by the candidate side to suggest adjacent skills worth
learning. Pure-Python and dependency-free so it runs anywhere.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict, deque
from dataclasses import dataclass


# Edges encode "knowing A is meaningfully helpful when learning B" and are
# weighted 0..1 by how strongly the two skills cluster together in the
# real-world hiring data we observed.
RAW_EDGES: list[tuple[str, str, float]] = [
    ("python", "pandas", 0.9),
    ("python", "numpy", 0.85),
    ("python", "fastapi", 0.7),
    ("python", "django", 0.7),
    ("python", "flask", 0.7),
    ("pandas", "numpy", 0.95),
    ("pandas", "matplotlib", 0.7),
    ("numpy", "scikit-learn", 0.8),
    ("scikit-learn", "pytorch", 0.55),
    ("scikit-learn", "tensorflow", 0.55),
    ("pytorch", "tensorflow", 0.6),
    ("pytorch", "cuda", 0.5),
    ("typescript", "javascript", 0.98),
    ("javascript", "react", 0.9),
    ("react", "next.js", 0.85),
    ("react", "redux", 0.6),
    ("react", "tanstack-query", 0.75),
    ("react", "zustand", 0.55),
    ("html", "css", 0.95),
    ("css", "tailwind", 0.8),
    ("css", "sass", 0.5),
    ("docker", "kubernetes", 0.85),
    ("docker", "ci/cd", 0.7),
    ("kubernetes", "helm", 0.7),
    ("aws", "terraform", 0.6),
    ("aws", "gcp", 0.5),
    ("aws", "azure", 0.4),
    ("sql", "postgresql", 0.9),
    ("sql", "snowflake", 0.7),
    ("sql", "bigquery", 0.7),
    ("airflow", "dbt", 0.75),
    ("spark", "scala", 0.6),
    ("kafka", "spark", 0.55),
    ("graphql", "apollo", 0.8),
    ("figma", "sketch", 0.7),
    ("figma", "framer", 0.55),
    ("tableau", "power-bi", 0.7),
    ("rest", "graphql", 0.4),
    ("react", "react-native", 0.7),
    ("swift", "kotlin", 0.4),
    ("rust", "go", 0.4),
    ("rust", "c++", 0.55),
]




class SkillGraph:
    def __init__(self, edges: list[tuple[str, str, float]] | None = None) -> None:
        self._adj: dict[str, dict[str, float]] = defaultdict(dict)
        for a, b, w in edges or RAW_EDGES:
            self._adj[a][b] = max(self._adj[a].get(b, 0), w)
            self._adj[b][a] = max(self._adj[b].get(a, 0), w)

    @property
    def skills(self) -> list[str]:
        return sorted(self._adj.keys())

    def neighbours(self, skill: str, min_weight: float = 0.0) -> list[tuple[str, float]]:
        return sorted(
            ((s, w) for s, w in self._adj.get(skill.lower(), {}).items() if w >= min_weight),
            key=lambda kv: -kv[1],
        )

    def expand(self, skills: list[str], depth: int = 1) -> dict[str, float]:
        """Return {skill: confidence} expanded from the seed set."""
        scores: dict[str, float] = {s.lower(): 1.0 for s in skills}
        frontier: deque[tuple[str, int, float]] = deque(
            (s.lower(), 0, 1.0) for s in skills
        )
        while frontier:
            node, d, conf = frontier.popleft()
            if d >= depth:
                continue
            for n, w in self._adj.get(node, {}).items():
                new_conf = conf * w
                if new_conf > scores.get(n, 0):
                    scores[n] = new_conf
                    frontier.append((n, d + 1, new_conf))
        return dict(sorted(scores.items(), key=lambda kv: -kv[1]))

    def shortest_path(self, source: str, target: str) -> list[str] | None:
        source, target = source.lower(), target.lower()
        if source == target:
            return [source]
        seen = {source}
        prev: dict[str, str] = {}
        queue: deque[str] = deque([source])
        while queue:
            node = queue.popleft()
            for n in self._adj.get(node, {}):
                if n in seen:
                    continue
                seen.add(n)
                prev[n] = node
                if n == target:
                    path = [n]
                    while path[-1] != source:
                        path.append(prev[path[-1]])
                    return list(reversed(path))
                queue.append(n)
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect the skill graph.")
    parser.add_argument("--neighbours", help="Comma-separated skills to expand.")
    parser.add_argument("--depth", type=int, default=1)
    parser.add_argument("--path", nargs=2, metavar=("FROM", "TO"))
    args = parser.parse_args()

    graph = SkillGraph()
    if args.path:
        print(json.dumps({"path": graph.shortest_path(*args.path)}, indent=2))
        return
    if args.neighbours:
        seeds = [s.strip() for s in args.neighbours.split(",") if s.strip()]
        print(json.dumps(graph.expand(seeds, depth=args.depth), indent=2))
        return
    print(json.dumps(graph.skills, indent=2))


if __name__ == "__main__":
    main()
